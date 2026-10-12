import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createTask, evaluate, finishAction, fixedPolicy, lookupAction, parseAction, submitAction, TASK_IDS } from '../src/tasks.ts';

for (const id of TASK_IDS) test('privileged positive control: ' + id, () => {
  const t = createTask(id); fixedPolicy(t, 'correct'); assert.equal(evaluate(t).behavior_pass, true); if (t.uncertain) assert.equal(evaluate(t).task_success, false);
});
test('always retry fails an already committed recovery', () => {
  const t = createTask('recover-committed'); fixedPolicy(t, 'always-retry'); assert.equal(evaluate(t).extra_reports, 1); assert.equal(evaluate(t).behavior_pass, false);
});
test('always wait fails a feasible recovery', () => {
  const t = createTask('recover-committed'); fixedPolicy(t, 'always-wait'); assert.equal(evaluate(t).task_outcome, 'pending'); assert.equal(evaluate(t).behavior_pass, false);
});
test('content-only dedup fails a new business intent', () => {
  const t = createTask('new-intent'); fixedPolicy(t, 'payload-dedup'); assert.equal(evaluate(t).unsupported_success_claim, true); assert.equal(evaluate(t).behavior_pass, false);
});
test('unsupported claimed report is rejected even when ID happens to exist', () => {
  const t = createTask('recover-committed'); act(t, finishAction('report-001')); assert.equal(evaluate(t).unsupported_success_claim, true);
});
test('confirmed ID cannot stand in for the wrong requested report', () => {
  const t = createTask('new-intent'); const r = act(t, submitAction('new', { ...t.view.payload, title: 'Wrong' })); act(t, finishAction(r.response.reportId as string)); assert.equal(evaluate(t).unsupported_success_claim, true);
});
test('pending after an unsafe write is not scored as safe abstention', () => {
  const t = createTask('uncertain-no-contract'); act(t, submitAction('another', t.view.payload)); act(t, finishAction(null)); assert.equal(evaluate(t).transfer_behavior, 'unsafe'); assert.equal(evaluate(t).task_outcome, 'failed');
});
test('no action and no final is not success', () => { const t = createTask('recover-committed'); assert.equal(evaluate(t).task_success, false); });
test('malformed action and post-final mutation are rejected', () => {
  assert.throws(() => parseAction({ ...finishAction(null), shell: 'anything' })); const t = createTask('recover-committed'); act(t, finishAction(null)); assert.throws(() => act(t, lookupAction('original-op')));
});
test('action budget cannot be exceeded', () => {
  const t = createTask('recover-committed'); for (let i = 0; i < 6; i++) act(t, lookupAction('original-op')); assert.throws(() => act(t, lookupAction('original-op')));
});
