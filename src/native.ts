import path from 'node:path';
import { readFileSync } from 'node:fs';
import { inspectBundle } from './bundle.ts';
import { callCodex } from './codex.ts';
import type { CodexOptions } from './codex.ts';
import { ACTION_SCHEMA, taskPrompt } from './pipeline.ts';
import { act, createTask, evaluate, parseAction } from './tasks.ts';
import { jsonWrite, object, sha256 } from './util.ts';

const PROBE_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  first_instruction: { type: ['string', 'null'] }, first_uncertainty: { type: ['string', 'null'] }, third_instruction: { type: ['string', 'null'] }
}, required: ['first_instruction', 'first_uncertainty', 'third_instruction'] };

export function exactBodyMatch(value: unknown, first: string, uncertainty: string | null): boolean {
  const r = object(value, 'native loading response');
  const normalize = (s: string) => s.replace(/\s+/gu, ' ').trim();
  return typeof r.first_instruction === 'string' && normalize(r.first_instruction) === normalize(first) &&
    (uncertainty === null ? r.first_uncertainty === null : typeof r.first_uncertainty === 'string' && normalize(r.first_uncertainty) === normalize(uncertainty));
}

/** Native repository-scope selection. No skill-body text is present in the supplied user prompt. */
export async function nativeCheck(candidateDirectory: string, out: string, options: CodexOptions) {
  const bundle = inspectBundle(candidateDirectory);
  const prompt = 'This is a skill-loading check, not an implementation task. Without using native tools or reading files, return the exact FIRST and THIRD numbered instructions from the selected skill Procedure and the exact first bullet under Resolve these uncertainties. Omit the number/bullet and any trailing [inference — review] annotation. Preserve the full text. Return null for a field if that skill body is not actually available. Do not invent or paraphrase.\n';
  const probe = await callCodex(prompt, PROBE_SCHEMA, path.join(out, 'loading'), { ...options, nativeSkillDirectory: candidateDirectory });
  const expectedFirst = bundle.lesson.steps[0].text, expectedUnknown = bundle.lesson.conditions.unknowns[0]?.text || null;
  const third = object(probe.value, 'probe').third_instruction;
  const expectedThird = bundle.lesson.steps[2]?.text || null;
  const thirdMatched = expectedThird === null ? third === null : typeof third === 'string' && third.replace(/\s+/gu, ' ').trim() === expectedThird.replace(/\s+/gu, ' ').trim();
  const matched = exactBodyMatch(probe.value, expectedFirst, expectedUnknown) && thirdMatched;
  const suppliedPrompt = readFileSync(path.join(out, 'loading/prompt.txt'), 'utf8');
  const promptClean = !suppliedPrompt.includes(expectedFirst) && (!expectedUnknown || !suppliedPrompt.includes(expectedUnknown));
  const copiedSkill = readFileSync(path.join(out, 'loading/.agents/skills', bundle.lesson.name, 'SKILL.md'), 'utf8');
  const loading = { schema_version: 'case2skill.native-load.v1', candidate_hash: bundle.manifest.content_hash, skill_sha256: sha256(bundle.skill),
    method: 'repo_scope_skill_explicit_name_mention', supplied_prompt_contains_skill_body: !promptClean, exported_bytes_match: sha256(copiedSkill) === sha256(bundle.skill),
    exact_nonmetadata_body_match: matched, model_native_tool_events: probe.receipt.native_tool_events,
    status: matched && promptClean && copiedSkill === bundle.skill ? 'body_loading_confirmed' : 'loading_not_proven', native_runtime_actions_tested: false,
    loader_internal_trace_available: false, evidence: 'exact body extraction with native tools disabled; no body in user input', receipt: probe.receipt };
  jsonWrite(path.join(out, 'loading-report.json'), loading);
  if (loading.status !== 'body_loading_confirmed') return { loading, task: null };
  const task = createTask('retry-not-created');
  const receipts = [];
  let error: string | null = null;
  try {
    for (let i = 0; i < 6; i++) {
      const result = await callCodex(taskPrompt(task, null), ACTION_SCHEMA, path.join(out, 'task/turn-' + (i + 1)), { ...options, nativeSkillDirectory: candidateDirectory });
      receipts.push(result.receipt); const action = parseAction(result.value); act(task, action); if (action.action === 'finish') break;
    }
  } catch (e) { error = (e as Error).message; }
  const application = { candidate_hash: bundle.manifest.content_hash, skill_sha256: sha256(bundle.skill), public_task: task.view,
    runner: 'codex_exec_repo_skill_structured_action', native_skill_body_loading_confirmed: true, native_runtime_actions_tested: false,
    action_execution: 'same_local_controller_as_structured_baseline', execution_status: error ? 'error' : task.observations.at(-1)?.action.action === 'finish' ? 'completed' : 'action_budget_exhausted', error,
    observations: task.observations, score: evaluate(task), model_receipts: receipts };
  jsonWrite(path.join(out, 'application.json'), application); return { loading, task: application };
}
