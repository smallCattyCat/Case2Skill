import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertCaseSnapshot, generateSourceCase } from '../src/case.ts';
import { compileCandidate, mechanicalLesson } from '../src/bundle.ts';
import { callCodex, validateCodexOptions } from '../src/codex.ts';
import { act, createTask, evaluate, finishAction, fixedPolicy, submitAction } from '../src/tasks.ts';
import { relativeName } from '../src/util.ts';
import { inspectRecording, replay } from '../src/replay.ts';
import { initCase } from '../src/init.ts';
import { extractionPrompt } from '../src/pipeline.ts';
import { makeLookupCase } from '../scripts/make-lookup-case.ts';

function scratch(t: { after: (fn: () => void) => void }) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'case2skill-release-'));
  t.after(() => rmSync(dir, { recursive: true, force: true })); return dir;
}
test('portable names reject device names, trailing dots and illegal path characters', () => {
  for (const p of ['CON.md', 'a/prn', 'a/nul.txt', 'LPT1', 'foo.', 'bar ', 'x?y.md', 'a\n.md']) assert.throws(() => relativeName(p));
  assert.equal(relativeName('references/evidence.md'), 'references/evidence.md');
});
test('compilation rejects a changed in-memory source snapshot', t => {
  const dir = scratch(t), pack = generateSourceCase(path.join(dir, 'case')), lesson = mechanicalLesson(pack);
  pack.sources[0].lines[0] = 'silently changed';
  assert.throws(() => assertCaseSnapshot(pack), /snapshot changed/);
  assert.throws(() => compileCandidate(lesson, pack, path.join(dir, 'candidate'), 'handwritten_test_fixture'), /snapshot changed/);
  assert.equal(existsSync(path.join(dir, 'candidate')), false);
});
test('extraction prompt uses the exact supplied frozen pack', t => {
  const dir = scratch(t), pack = generateSourceCase(path.join(dir, 'case'));
  writeFileSync(path.join(dir, 'case', 'case.md'), 'unrelated newer source');
  const prompt = extractionPrompt(pack); assert(prompt.includes(pack.sourceDigest)); assert(!prompt.includes('unrelated newer source'));
});
test('invalid live options fail before output creation', async t => {
  const dir = path.join(scratch(t), 'never-created');
  await assert.rejects(callCodex('none', {}, dir, { timeoutMs: Number.NaN }), /timeout/);
  assert.equal(existsSync(dir), false);
  for (const timeout of [0, 999, 300001, Infinity]) assert.throws(() => validateCodexOptions({ timeoutMs: timeout }));
  assert.throws(() => validateCodexOptions({ model: 'bad model' }));
});
test('report recovery cannot claim an unrelated operation with the same payload', () => {
  const task = createTask('retry-not-created'); const response = act(task, submitAction('different-operation', task.view.payload));
  act(task, finishAction(response.response.reportId as string));
  assert.equal(evaluate(task).unsupported_success_claim, true);
});
test('expired replay protection does not disable available historical lookup', () => {
  const task = createTask('lookup-after-expiry'); fixedPolicy(task, 'correct');
  assert.deepEqual(task.observations.map(o => o.action.action), ['lookup', 'finish']);
  assert.equal(evaluate(task).task_success, true); assert.equal(evaluate(task).extra_reports, 0);
});
test('second example is generated from actual virtual-time service execution', t => {
  const pack = makeLookupCase(path.join(scratch(t), 'case'));
  const events = pack.sources.find(s => s.path === 'receipt-store-events.jsonl')!.lines.map(l => JSON.parse(l));
  assert.equal(events.filter(e => e.kind === 'report_created').length, 1);
  assert(events.find(e => e.kind === 'lookup').at > 40);
});
test('recorded revision replays eight real saved action sequences without a model', t => {
  const record = inspectRecording(); assert.equal(record.rows.length, 8);
  assert.equal(record.highlight.score.unavailable_lookup_attempts, 1);
  assert(record.rows.every(r => r.score.behavior_pass));
  const out = path.join(scratch(t), 'replay'); const result = replay(out);
  assert.equal(result.model_calls_this_run, 0); assert.equal(result.performance_gain_claimed, false);
  const html = readFileSync(path.join(out, 'index.html'), 'utf8');
  assert(!/<script[^>]+src=/u.test(html)); assert(html.includes('Recorded run'));
});
test('case init creates editable content but never invents a runtime log', t => {
  const out = path.join(scratch(t), 'new-case'); initCase(out);
  const manifest = JSON.parse(readFileSync(path.join(out, 'case.json'), 'utf8'));
  assert(manifest.files.every((f: { kind: string }) => f.kind !== 'runtime_log'));
  assert.throws(() => initCase(out), /already exists/);
});
test('CLI help aliases do not require a model account', () => {
  for (const flag of ['-h', '--help']) {
    const result = spawnSync(process.execPath, ['src/cli.ts', flag], { encoding: 'utf8' });
    assert.equal(result.status, 0); assert.match(result.stdout, /refine CASE/);
  }
});
test('irrelevant CLI flags cannot silently do something else', () => {
  const result = spawnSync(process.execPath, ['src/cli.ts', 'inspect', 'nowhere', '--model', 'some-model'], { encoding: 'utf8' });
  assert.equal(result.status, 1); assert.match(result.stderr, /not used by inspect/);
});
