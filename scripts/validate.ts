import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { digest, jsonWrite, newRun, sha256, textWrite } from '../src/util.ts';
import { sourceFingerprint } from '../src/provenance.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fingerprint(): Record<string, string> { return sourceFingerprint().files; }
const out = newRun(path.join(root, 'runs'), 'validation'); const before = fingerprint();
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/*.test.ts'], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
textWrite(path.join(out, 'tests.tap'), result.stdout || ''); textWrite(path.join(out, 'stderr.txt'), result.stderr || '');
const types = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
textWrite(path.join(out, 'typecheck.txt'), (types.stdout || '') + (types.stderr || ''));
const count = (name: string) => { const m = (result.stdout || '').match(new RegExp('^# ' + name + ' (\\d+)\\s*$', 'm')); return m ? Number(m[1]) : null; };
const after = fingerprint(), unchanged = digest(before) === digest(after);
const report = { schema_version: 'case2skill.validation.v0', generated_at: new Date().toISOString(), node_version: process.version, platform: process.platform,
  command: 'node --test --test-reporter=tap tests/*.test.ts', exit_code: result.status, error: result.error?.message || null,
  tests: count('tests'), passed: count('pass'), failed: count('fail'), skipped: count('skipped'), cancelled: count('cancelled'), source_unchanged_during_validation: unchanged,
  source_digest: digest(before), source_files: before, static_typecheck: types.status === 0 ? 'passed' : 'failed_or_unavailable', typecheck_exit_code: types.status, cross_platform_live_adapter: 'not_run',
  status: result.status === 0 && types.status === 0 && (count('tests') || 0) > 0 && count('fail') === 0 && count('cancelled') === 0 && unchanged ? 'passed' : 'failed_or_unproven' };
jsonWrite(path.join(out, 'validation.json'), report);
console.log(JSON.stringify({ out, ...report }, null, 2)); if (report.status !== 'passed') process.exitCode = 1;
