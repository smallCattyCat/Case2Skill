#!/usr/bin/env node
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compileCandidate, exportCandidate, inspectBundle } from './bundle.ts';
import { generateSourceCase, loadCase } from './case.ts';
import { callCodex, codexDoctor, validateCodexOptions } from './codex.ts';
import { runDemo } from './demo.ts';
import { compare, learn, ordinarySkill, verifyTask } from './pipeline.ts';
import { lessonDiff, prepareRevision, revise, reverify } from './revision.ts';
import { refine } from './refine.ts';
import { initCase } from './init.ts';
import { replay } from './replay.ts';
import { nativeCheck } from './native.ts';
import { newRun, readJSON } from './util.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function argsParse(argv: string[]) {
  const flags: Record<string, string | boolean> = {}, positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { positional.push(argv[i]); continue; }
    const name = argv[i].slice(2);
    if (!['out', 'model', 'timeout-ms', 'model-data-approved', 'candidate'].includes(name)) throw new Error('Unknown option --' + name);
    if (name in flags) throw new Error('Duplicate option --' + name);
    if (['model-data-approved', 'candidate'].includes(name)) flags[name] = true;
    else { if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for --' + name); flags[name] = argv[++i]; }
  }
  return { positional, flags };
}
export async function main(argv = process.argv.slice(2)): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) argv = ['help'];
  if (argv.length === 1 && ['--version', '-v'].includes(argv[0])) argv = ['version'];
  const { positional, flags } = argsParse(argv); const command = positional.shift() || 'help';
  const live = ['learn', 'ordinary', 'verify', 'revise', 'reverify', 'refine', 'try', 'native-check'];
  const allowed: Record<string, string[]> = { help: [], version: [], doctor: [], init: ['out'], case: ['out'], demo: ['out'], replay: ['out'], controls: ['out'], inspect: [], diff: [], export: ['candidate', 'out'], compile: ['out'], feedback: ['out'], probe: ['out', 'model', 'timeout-ms'] };
  for (const name of live) allowed[name] = ['out', 'model', 'timeout-ms', 'model-data-approved'];
  if (!(command in allowed)) throw new Error('Unknown command: ' + command);
  for (const flag of Object.keys(flags)) if (!allowed[command].includes(flag)) throw new Error('Option --' + flag + ' is not used by ' + command);
  const options = { model: typeof flags.model === 'string' ? flags.model : process.env.CASE2SKILL_MODEL, timeoutMs: flags['timeout-ms'] ? Number(flags['timeout-ms']) : 120000,
    onProgress: (message: string) => process.stderr.write('[case2skill] ' + message + '\n') };
  if (live.includes(command) || command === 'probe') validateCodexOptions(options);
  const output = () => typeof flags.out === 'string' ? path.resolve(flags.out) : newRun(path.join(ROOT, 'runs'), command);
  const need = (count: number) => { if (positional.length !== count) throw new Error(command + ' requires ' + count + ' positional arguments'); };
  if (live.includes(command) && flags['model-data-approved'] !== true) throw new Error('This command sends the explicitly selected case/task data through your existing Codex authentication. Review it and add --model-data-approved.');
  if (command === 'help') {
    console.log(`Case2Skill — evidence-linked agent skills (local prototype, v0.1.0)

  demo / replay [--out DIR]        Replay a real recorded revision; no model calls
  controls [--out DIR]            Execute simulator policy controls; no model calls
  init --out NEW_DIR              Create a template for your own solved case
  case --out NEW_DIR              Generate the simulated source case
  doctor                         CLI availability, not authentication
  probe [--model MODEL]           Harmless readiness request
  learn CASE                     Extract a source-linked candidate
  ordinary CASE                  Generate a normal Skill baseline
  compile CASE LESSON             Package supplied JSON, not model learning
  inspect BUNDLE                 Recheck candidate hashes
  diff BEFORE AFTER              Inspect structural changes between bundles
  refine CASE PARENT              Refine any skill from updated source evidence
  try BUNDLE TASK_ID              Run one built-in simulator task with a model
  verify BUNDLE ORDINARY_SKILL    Nine development task episodes
  feedback CASE PARENT APP_DIR    Inspect a recorded redundant-lookup episode
  revise CASE PARENT APP_DIR      Generate a new candidate from that feedback
  reverify PARENT CHILD           Eight old/new development task episodes
  native-check BUNDLE             Native repo-skill loading probe and one task
  export BUNDLE --candidate       Export for review; not global installation

Output: --out NEW_DIR. Live data commands require --model-data-approved.
Live options: --model MODEL --timeout-ms N. Runs and old candidates are preserved.
learn/compile/refine support your own text cases; task evaluation is report-simulator only.
The feedback/revise rule covers unavailable lookup; use refine for other evidence.
Runtime has no external dependencies. npm ci enables npm run typecheck/validate.`); return;
  }
  if (command === 'version') { need(0); console.log(JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version); return; }
  if (command === 'init') { need(0); if (typeof flags.out !== 'string') throw new Error('init requires --out NEW_DIR'); console.log(JSON.stringify(initCase(path.resolve(flags.out)), null, 2)); return; }
  if (command === 'diff') { need(2); const before = inspectBundle(path.resolve(positional[0])), after = inspectBundle(path.resolve(positional[1])); console.log(JSON.stringify({ parent_hash: before.manifest.content_hash, child_hash: after.manifest.content_hash, changes: lessonDiff(before.lesson, after.lesson) }, null, 2)); return; }
  if (command === 'refine') { need(2); const out = output(); const result = await refine(path.resolve(positional[0]), path.resolve(positional[1]), out, options); console.log(JSON.stringify({ out, candidate: result.child.directory, parent_hash: result.record.parent_content_hash, child_hash: result.record.child_content_hash, changed_fields: result.record.changes.map(c => c.field) }, null, 2)); return; }
  if (command === 'try') { need(2); const bundle = inspectBundle(path.resolve(positional[0])), out = output(); const r = await verifyTask(positional[1], bundle.skill, out, options); console.log(JSON.stringify({ out, execution_status: r.execution_status, score: r.score }, null, 2)); if (r.execution_status !== 'completed' || !r.score.behavior_pass) process.exitCode = 2; return; }
  if (command === 'native-check') { need(1); const out = output(); const r = await nativeCheck(path.resolve(positional[0]), out, options); console.log(JSON.stringify({ out, loading: r.loading.status, score: r.task?.score || null }, null, 2)); if (r.loading.status !== 'body_loading_confirmed' || r.task?.execution_status !== 'completed') process.exitCode = 2; return; }
  if (command === 'feedback') { need(3); const out = output(); const result = prepareRevision(...positional.map(p => path.resolve(p)) as [string, string, string], out); console.log(JSON.stringify({ out, source_digest: result.pack.sourceDigest, redundant_lookups: result.application.redundantUnavailableLookups }, null, 2)); return; }
  if (command === 'revise') { need(3); const out = output(); const result = await revise(...positional.map(p => path.resolve(p)) as [string, string, string], out, options); console.log(JSON.stringify({ out, candidate: result.child.directory, parent_hash: result.record.parent_content_hash, child_hash: result.record.child_content_hash, changed_fields: result.record.changes.map(c => c.field) }, null, 2)); return; }
  if (command === 'reverify') { need(2); const out = output(); const report = await reverify(path.resolve(positional[0]), path.resolve(positional[1]), out, options); console.log(JSON.stringify({ out, status: report.status, rows: report.rows.map(r => ({ arm: r.arm, score: r.score })) }, null, 2)); if (report.status !== 'completed') process.exitCode = 2; return; }
  if (command === 'doctor') { need(0); console.log(JSON.stringify(codexDoctor(), null, 2)); return; }
  if (command === 'probe') {
    need(0); const out = output(); const result = await callCodex('Return {"ready":true}. Do not use any tools. No other task.', { type: 'object', additionalProperties: false, properties: { ready: { type: 'boolean' } }, required: ['ready'] }, path.join(out, 'probe'), options); console.log(JSON.stringify({ out, value: result.value, receipt: result.receipt }, null, 2)); return;
  }
  if (command === 'demo' || command === 'replay') { need(0); const out = output(); const r = replay(out); console.log(JSON.stringify({ out, page: r.page, mode: r.mode, model_calls: 0, recorded_task_episodes: r.recorded_task_episodes, consistency: r.consistency }, null, 2)); return; }
  if (command === 'controls') { need(0); const out = output(); const report = runDemo(out); console.log(JSON.stringify({ out, report: path.join(out, 'report.html'), evidence_class: report.evidence_class, model_calls: 0, policies: report.policies }, null, 2)); return; }
  if (command === 'case') { need(0); if (typeof flags.out !== 'string') throw new Error('case requires --out NEW_DIR'); console.log(JSON.stringify(generateSourceCase(path.resolve(flags.out)), (k, v) => ['text', 'lines'].includes(k) ? undefined : v, 2)); return; }
  if (command === 'inspect') { need(1); console.log(JSON.stringify(inspectBundle(path.resolve(positional[0])).manifest, null, 2)); return; }
  if (command === 'export') { need(1); if (!flags.candidate || typeof flags.out !== 'string') throw new Error('R0 export requires --candidate --out NEW_DIR; owner acceptance is not automated'); console.log(JSON.stringify(exportCandidate(path.resolve(positional[0]), path.resolve(flags.out)), null, 2)); return; }
  if (command === 'compile') { need(2); if (typeof flags.out !== 'string') throw new Error('compile requires --out NEW_DIR'); const result = compileCandidate(readJSON(path.resolve(positional[1])), loadCase(path.resolve(positional[0])), path.resolve(flags.out), 'user_supplied_candidate'); console.log(JSON.stringify({ out: result.directory, manifest: result.manifest }, null, 2)); return; }
  if (command === 'learn') { need(1); const out = output(); const result = await learn(path.resolve(positional[0]), out, options); console.log(JSON.stringify({ out, candidate: result.directory, manifest: result.manifest }, null, 2)); return; }
  if (command === 'ordinary') { need(1); const out = output(); const result = await ordinarySkill(path.resolve(positional[0]), out, options); console.log(JSON.stringify({ out, ordinary_skill: path.join(out, 'ordinary-SKILL.md'), sha256: result.sha256 }, null, 2)); return; }
  if (command === 'verify') { need(2); const out = output(); const report = await compare(path.resolve(positional[0]), path.resolve(positional[1]), out, options); console.log(JSON.stringify({ out, status: report.status, rows: report.rows.map(r => ({ arm: r.arm, execution_status: r.execution_status, score: r.score })) }, null, 2)); if (report.status !== 'completed') process.exitCode = 2; return; }
  throw new Error('Unknown command: ' + command);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('Case2Skill: ' + error.message); process.exitCode = 1; });
}
