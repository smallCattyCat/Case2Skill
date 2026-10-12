import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { auditPublicFiles, collectPublicFiles, scanPublicText, stageRelease, PROJECT_ROOT } from '../scripts/release.ts';

test('public source passes release checks and excludes private working directories', () => {
  const audit = auditPublicFiles(); assert.deepEqual(audit.errors, []); assert.equal(audit.status, 'passed');
  for (const file of audit.files) assert(!/^(?:runs|artifacts|exports|releases|node_modules)\//u.test(file), file);
});
test('release scanner detects likely credentials and personal path values', () => {
  assert(scanPublicText('sk-' + 'a'.repeat(30)).includes('credential-like value'));
  const personal = ['C:', 'Users', 'example-person', 'secret.txt'].join('\\');
  assert(scanPublicText(personal).includes('personal absolute path'));
  assert.deepEqual(scanPublicText('No credentials here. Use CASE2SKILL_MODEL to select a model.'), []);
});
test('staged release is complete, self-contained and never overwrites an existing directory', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'case2skill-package-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const dest = path.join(root, 'clean'); const result = stageRelease(dest);
  assert.equal(result.status, 'source_staged_not_published'); assert.equal(existsSync(path.join(dest, '.git')), false);
  assert.equal(auditPublicFiles(dest).status, 'passed');
  const manifest = JSON.parse(readFileSync(path.join(dest, 'RELEASE-MANIFEST.json'), 'utf8'));
  assert.equal(manifest.content_digest, auditPublicFiles().content_digest);
  assert.throws(() => stageRelease(dest), /already exists/);
});
test('source staging does not silently include an undeclared document', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'case2skill-whitelist-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const dest = path.join(root, 'copy'); stageRelease(dest);
  writeFileSync(path.join(dest, 'private-note.md'), 'Excluded local content');
  assert(!collectPublicFiles(dest).includes('private-note.md'));
});
