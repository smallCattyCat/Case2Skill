import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { codexArguments, modelEnvironment } from '../src/codex.ts';
import { taskPrompt, validateWithOneRepair } from '../src/pipeline.ts';
import { createTask } from '../src/tasks.ts';

test('model invocation uses read-only execution and disables shell, apps, hooks, and memory', () => {
  const a = codexArguments('schema.json', 'result.json', 'example-model'); assert(a.includes('--ignore-user-config')); assert.equal(a[a.indexOf('--sandbox') + 1], 'read-only');
  for (const setting of ['features.shell_tool=false', 'features.unified_exec=false', 'features.apps=false', 'features.hooks=false', 'memories.use_memories=false', 'project_doc_max_bytes=0']) assert(a.includes(setting));
  assert(!a.includes('--dangerously-bypass-approvals-and-sandbox')); assert(!a.includes('--ignore-rules'));
});
test('model action prompt excludes private state, task labels, and evaluator', () => {
  const t = createTask('recover-committed'); const p = taskPrompt(t, null);
  for (const key of ['expectedFinalCount', 'initialCount', 'report_created', 'timeout_after_commit', 'recover-committed', 'behavior_pass']) assert(!p.includes(key), key);
});
test('CLI live extraction refuses without explicit selected-data approval', () => {
  const r = spawnSync(process.execPath, ['src/cli.ts', 'learn', 'nowhere'], { encoding: 'utf8' }); assert.equal(r.status, 1); assert.match(r.stderr, /model-data-approved/);
});
test('CLI rejects unknown options instead of silently ignoring them', () => {
  const r = spawnSync(process.execPath, ['src/cli.ts', 'demo', '--full-access'], { encoding: 'utf8' }); assert.equal(r.status, 1); assert.match(r.stderr, /Unknown option/);
});
test('CLI help is available without Codex or package installation', () => {
  const r = spawnSync(process.execPath, ['src/cli.ts', 'help'], { encoding: 'utf8' }); assert.equal(r.status, 0); assert.match(r.stdout, /local prototype/);
});

test('unrelated cloud and project secrets are not inherited by model client', () => {
  const env = modelEnvironment({ PATH: '/bin', HOME: '/user', COMPANY_DATABASE_PASSWORD: 'test-only-value', AWS_SECRET_ACCESS_KEY: 'test-only-value' });
  assert.equal(env.PATH, '/bin'); assert.equal(env.HOME, '/user'); assert.equal(env.COMPANY_DATABASE_PASSWORD, undefined); assert.equal(env.AWS_SECRET_ACCESS_KEY, undefined);
});

test('local validation permits only one recorded repair', async () => {
  const rejected: number[] = []; let calls = 0;
  const value = await validateWithOneRepair(async () => ++calls, raw => { if (raw === 1) throw new Error('format'); return raw; }, attempt => rejected.push(attempt));
  assert.equal(value, 2); assert.equal(calls, 2); assert.deepEqual(rejected, [0]);
});
test('repeated invalid candidates stop after two attempts', async () => {
  let calls = 0; await assert.rejects(validateWithOneRepair(async () => ++calls, () => { throw new Error('bad references'); }, () => {}), /one repair/); assert.equal(calls, 2);
});
test('provider failure is not automatically retried as a content error', async () => {
  let calls = 0; await assert.rejects(validateWithOneRepair(async () => { calls++; throw new Error('provider unavailable'); }, x => x, () => {}), /provider unavailable/); assert.equal(calls, 1);
});
