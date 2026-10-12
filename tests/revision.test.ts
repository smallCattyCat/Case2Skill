import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { compileCandidate, inspectBundle, mechanicalLesson } from '../src/bundle.ts';
import { generateSourceCase } from '../src/case.ts';
import { inspectApplication, prepareRevision, validateRevision, lessonDiff } from '../src/revision.ts';
import { act, createTask, evaluate, finishAction, lookupAction } from '../src/tasks.ts';
import { taskPrompt } from '../src/pipeline.ts';
import { jsonWrite, sha256, textWrite } from '../src/util.ts';
import { validateSkillMarkdown } from '../src/skill-format.ts';

// Constructed protocol fixtures. None of these test records are presented as real model evidence.
function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'case2skill-revision-test-'));
  const source = path.join(root, 'source'), parent = path.join(root, 'parent'), app = path.join(root, 'application');
  const pack = generateSourceCase(source); compileCandidate(mechanicalLesson(pack), pack, parent, 'codex_generated');
  const skill = inspectBundle(parent).skill, task = createTask('uncertain-no-contract');
  for (const [i, action] of [lookupAction('original-op'), finishAction(null)].entries()) {
    const dir = path.join(app, 'turn-' + (i + 1)); const prompt = taskPrompt(task, skill);
    textWrite(path.join(dir, 'prompt.txt'), prompt); jsonWrite(path.join(dir, 'response.json'), action);
    jsonWrite(path.join(dir, 'receipt.json'), { status: 'completed', prompt_sha256: sha256(prompt), native_tool_events: 0, model_call_attempts: 1, evidence_class: 'constructed_unit_test_not_model' });
    act(task, action);
  }
  jsonWrite(path.join(app, 'report.json'), { runner: 'codex_exec_structured_json', execution_status: 'completed', task_id: task.id, skill_sha256: sha256(skill), observations: task.observations, score: evaluate(task), evidence_class: 'constructed_unit_test_not_model' });
  return { root, source, parent, app, skill };
}
test('frontmatter rejects the R0 indentation defect', () => {
  assert.throws(() => validateSkillMarkdown('---\nname: valid-skill\n description: invalid indent\n---\nBody'), /unindented/);
});
test('frontmatter rejects duplicate fields and accepts quoted descriptions', () => {
  assert.throws(() => validateSkillMarkdown('---\nname: a\nname: b\ndescription: good\n---\nBody'), /exactly once/);
  assert.equal(validateSkillMarkdown('---\nname: good-skill\ndescription: "Read: only"\n---\nBody').name, 'good-skill');
});
test('application feedback replays actual saved public action sequence', () => {
  const f = fixture(); try { const a = inspectApplication(f.app, f.skill); assert.equal(a.redundantUnavailableLookups, 1); assert.equal(a.score.task_outcome, 'pending'); } finally { rmSync(f.root, { recursive: true }); }
});
test('a different skill cannot take credit for a saved application', () => {
  const f = fixture(); try { assert.throws(() => inspectApplication(f.app, f.skill + '\nchanged'), /exact parent/); } finally { rmSync(f.root, { recursive: true }); }
});
test('modified model response is rejected rather than laundered as feedback', () => {
  const f = fixture(); try { writeFileSync(path.join(f.app, 'turn-1/response.json'), JSON.stringify(finishAction(null))); assert.throws(() => inspectApplication(f.app, f.skill), /differs from model/); } finally { rmSync(f.root, { recursive: true }); }
});
test('modified prompt is rejected by its recorded hash', () => {
  const f = fixture(); try { writeFileSync(path.join(f.app, 'turn-1/prompt.txt'), 'changed'); assert.throws(() => inspectApplication(f.app, f.skill), /receipt mismatch/); } finally { rmSync(f.root, { recursive: true }); }
});
test('feedback source excludes scorer, scores and hidden service state', () => {
  const f = fixture(); try {
    const r = prepareRevision(f.source, f.parent, f.app, path.join(f.root, 'revision'));
    const text = r.pack.sources.map(s => s.text).join('\n');
    for (const forbidden of ['expectedFinalCount', 'behavior_pass', 'report_count', 'controller-state']) assert(!text.includes(forbidden));
    assert.equal(r.pack.sources.length, 6); assert.equal(r.parent.manifest.content_hash, inspectBundle(f.parent).manifest.content_hash);
    const child = structuredClone(r.parent.lesson); child.steps[0] = { text: 'Check the current documented availability before using lookup.', basis: 'inferred', evidence: [{ file: 'feedback-contract.md', start_line: 1, end_line: 10 }] };
    const validated = validateRevision(child, r.parent.lesson, r.pack);
    assert.deepEqual(lessonDiff(r.parent.lesson, validated).map(c => c.field), ['steps']);
    const b = compileCandidate(validated, r.pack, path.join(f.root, 'child'), 'codex_generated');
    assert.notEqual(b.manifest.content_hash, r.parent.manifest.content_hash); assert.equal(b.manifest.transfer_validation, 'not_run');
    assert.throws(() => validateRevision(r.parent.lesson, r.parent.lesson, r.pack), /no change/);
    assert.throws(() => validateRevision({ ...validated, name: 'renamed' }, r.parent.lesson, r.pack), /parent skill name/);
  } finally { rmSync(f.root, { recursive: true }); }
});
test('feedback refuses tampered recorded service observations', () => {
  const f = fixture(); try {
    const file = path.join(f.app, 'report.json'); const r = JSON.parse(readFileSync(file, 'utf8')); r.observations[0].response.status = 'completed'; writeFileSync(file, JSON.stringify(r));
    assert.throws(() => inspectApplication(f.app, f.skill), /deterministic replay/);
  } finally { rmSync(f.root, { recursive: true }); }
});
