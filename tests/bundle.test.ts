import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateSourceCase, loadCase } from '../src/case.ts';
import { compileCandidate, exportCandidate, inspectBundle, mechanicalLesson } from '../src/bundle.ts';
import { parseLesson, validateReferences } from '../src/lesson.ts';
import { canonical, digest, relativeName } from '../src/util.ts';

function setup(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'case2skill-test-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const pack = generateSourceCase(path.join(root, 'case')); return { root, pack, lesson: mechanicalLesson(pack) };
}
test('generated source has real duplicated and recovered event sequences', t => {
  const { pack } = setup(t); const logs = pack.sources.find(s => s.kind === 'runtime_log')!.lines.map(l => JSON.parse(l));
  assert.equal(logs.filter(e => e.run === 'attempt-a' && e.kind === 'report_created').length, 2); assert.equal(logs.filter(e => e.run === 'attempt-b' && e.kind === 'report_created').length, 1);
});
test('source generation and digest are deterministic', t => {
  const { root, pack } = setup(t); assert.equal(generateSourceCase(path.join(root, 'again')).sourceDigest, pack.sourceDigest);
});
test('candidate compiles, validates, and exports without claiming model learning', t => {
  const { root, pack, lesson } = setup(t); compileCandidate(lesson, pack, path.join(root, 'bundle'), 'handwritten_test_fixture'); const found = inspectBundle(path.join(root, 'bundle')); assert.equal(found.manifest.origin, 'handwritten_test_fixture');
  const result = exportCandidate(path.join(root, 'bundle'), path.join(root, 'export')); assert.equal(result.status, 'candidate_exported_not_installed'); assert.equal(inspectBundle(path.join(root, 'export')).manifest.content_hash, found.manifest.content_hash);
});
test('empty unknown/exclusion arrays are allowed instead of inventing conditions', t => { const { lesson } = setup(t); assert.equal(parseLesson(lesson).conditions.unknowns.length, 0); });
test('nonexistent evidence and inverted line ranges are rejected', t => {
  const { lesson, pack } = setup(t); lesson.steps[0].evidence[0].end_line = 9999; assert.throws(() => validateReferences(lesson, pack)); lesson.steps[0].evidence[0].end_line = 1; assert.throws(() => parseLesson(lesson));
});
test('observed evidence cannot be backed only by narrative or contract', t => { const { lesson, pack } = setup(t); lesson.steps[0].basis = 'observed'; assert.throws(() => validateReferences(lesson, pack)); });
test('a documented limitation may cite the explicit narrative, not only API contracts', t => { const { lesson, pack } = setup(t); lesson.steps[0].evidence = [{ file: 'case.md', start_line: 6, end_line: 7 }]; assert.doesNotThrow(() => validateReferences(lesson, pack)); });
test('raw runtime log alone is not a documented textual statement', t => { const { lesson, pack } = setup(t); lesson.steps[0].evidence = [{ file: 'events.jsonl', start_line: 1, end_line: 2 }]; assert.throws(() => validateReferences(lesson, pack)); });
test('a model cannot grant itself verified or approved status', t => { const { lesson } = setup(t); assert.throws(() => parseLesson({ ...lesson, status: 'verified' })); assert.throws(() => parseLesson({ ...lesson, approved: true })); });
test('candidate edit invalidates prior bundle hashes', t => {
  const { root, pack, lesson } = setup(t); const out = path.join(root, 'bundle'); compileCandidate(lesson, pack, out, 'handwritten_test_fixture'); writeFileSync(path.join(out, 'SKILL.md'), 'changed'); assert.throws(() => inspectBundle(out), /changed/);
});
test('existing outputs are not overwritten', t => {
  const { root, pack, lesson } = setup(t); const out = path.join(root, 'bundle'); compileCandidate(lesson, pack, out, 'handwritten_test_fixture'); assert.throws(() => compileCandidate(lesson, pack, out, 'handwritten_test_fixture')); assert.throws(() => exportCandidate(out, out));
});
test('canonical hash does not depend on object property order', () => { assert.equal(canonical({ b: 1, a: 2 }), canonical({ a: 2, b: 1 })); assert.equal(digest({ b: 1, a: 2 }), digest({ a: 2, b: 1 })); });
test('relative path traversal and Windows drive paths are rejected', () => { for (const p of ['../secret', '/absolute', 'C:secret', 'a\\b', 'a/../b', '.env/../a']) assert.throws(() => relativeName(p)); });
test('source manifest cannot read undeclared file types or duplicates', t => {
  const { root } = setup(t), manifest = path.join(root, 'case', 'case.json'); const raw = JSON.parse(readFileSync(manifest, 'utf8')); raw.files.push(raw.files[0]); writeFileSync(manifest, JSON.stringify(raw)); assert.throws(() => loadCase(path.join(root, 'case')), /duplicate/);
});
test('source credential marker fails before it can be sent to model', t => {
  const { root } = setup(t); writeFileSync(path.join(root, 'case', 'case.md'), '-----BEGIN PRIVATE KEY-----'); assert.throws(() => loadCase(path.join(root, 'case')), /credential/);
});
