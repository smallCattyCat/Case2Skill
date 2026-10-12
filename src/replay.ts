import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectBundle } from './bundle.ts';
import { loadCase } from './case.ts';
import { validateReferences } from './lesson.ts';
import { lessonDiff } from './revision.ts';
import { act, createTask, evaluate } from './tasks.ts';
import type { Observation } from './tasks.ts';
import { digest, insideFile, jsonWrite, object, readTextBounded, sha256, textWrite } from './util.ts';

export const RECORDING_ROOT = fileURLToPath(new URL('../examples/recorded-revision/', import.meta.url));
export type ReplayRow = { arm: string; task_id: string; observations: Observation[]; score: ReturnType<typeof evaluate>; model_calls: number };

/** Re-execute the recorded actions, not the model. This validates consistency, not authenticity. */
export function inspectRecording(directory = RECORDING_ROOT) {
  const raw = object(JSON.parse(readTextBounded(insideFile(directory, 'recording.json'))), 'recording');
  if (raw.schema_version !== 'case2skill.public-recording.v1' || raw.evidence_class !== 'selected_projection_of_saved_model_runs' || !Array.isArray(raw.rows) || raw.rows.length !== 8) throw new Error('Unsupported public recording');
  const before = inspectBundle(path.join(directory, 'before')), after = inspectBundle(path.join(directory, 'after'));
  if (raw.parent_content_hash !== before.manifest.content_hash || raw.child_content_hash !== after.manifest.content_hash) throw new Error('Recording candidate hash mismatch');
  for (const [bundle, subdir] of [[before, 'source-case'], [after, 'revision-source']] as const) {
    const source = loadCase(path.join(directory, subdir));
    if (source.sourceDigest !== bundle.manifest.source_digest) throw new Error('Recording source changed');
    validateReferences(bundle.lesson, source);
  }
  const check = (value: unknown, highlight = false): ReplayRow => {
    const r = object(value, 'recorded row');
    if (typeof r.task_id !== 'string' || !Array.isArray(r.observations) || r.observations.length > 6 || !r.observations.length || !['parent', 'revised', ...(highlight ? ['case2skill'] : [])].includes(r.arm as string)) throw new Error('Invalid recorded episode');
    const skill = r.arm === 'revised' ? after.skill : before.skill;
    if (r.skill_sha256 !== sha256(skill) || r.execution_status !== 'completed') throw new Error('Recording skill mismatch');
    const task = createTask(r.task_id);
    for (const entry of r.observations) {
      const o = object(entry, 'observation'); const replayed = act(task, o.action);
      if (digest(replayed) !== digest(o)) throw new Error('Recorded service observation differs from replay');
    }
    const score = evaluate(task), saved = object(r.score, 'score');
    for (const k of ['task_outcome', 'behavior_pass', 'extra_reports', 'action_count', 'unsupported_success_claim'] as const) if (saved[k] !== score[k]) throw new Error('Recorded score differs from replay');
    if (!Number.isSafeInteger(r.model_calls) || (r.model_calls as number) < 1 || (r.model_calls as number) > 6) throw new Error('Invalid recorded model call count');
    return { arm: r.arm as string, task_id: r.task_id, observations: task.observations, score, model_calls: r.model_calls as number };
  };
  const rows = raw.rows.map(r => check(r));
  const keys = rows.map(r => r.arm + '/' + r.task_id);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate recorded episode');
  return { before, after, highlight: check(raw.highlight, true), rows, changes: lessonDiff(before.lesson, after.lesson),
    metadata: { requested_model: raw.requested_model, effective_model: raw.effective_model, recorded_date: raw.recorded_date, reasoning_effort: raw.reasoning_effort, source_hashes: raw.source_hashes },
    recording_sha256: sha256(readTextBounded(insideFile(directory, 'recording.json'))), consistency: 'bundles_sources_and_recorded_actions_rechecked', model_calls_this_replay: 0 };
}

const escape = (value: unknown) => String(value).replace(/[&<>"']/gu, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function replayHtml(record: ReturnType<typeof inspectRecording>): string {
  const tasks = [...new Set(record.rows.map(r => r.task_id))];
  const cards = tasks.map((id, i) => {
    const group = record.rows.filter(r => r.task_id === id);
    return `<section class="episode" id="episode-${i}" ${i ? 'hidden' : ''}><h3>${escape(id)}</h3>${group.map(r => `<div class="trace"><strong>${r.arm === 'parent' ? 'Original skill' : 'Revised skill'}</strong><span>${r.observations.map(o => escape(o.action.action)).join(' → ')}</span><small>${escape(r.score.task_outcome)} · ${r.score.extra_reports} extra reports</small></div>`).join('')}</section>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Case2Skill — a skill with a history</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f3ef;color:#18252a;font:16px/1.65 system-ui,-apple-system,sans-serif}main{max-width:1120px;padding:44px 30px 72px;margin:auto}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #c8d0cc;padding-bottom:18px}.brand{font-size:21px;font-weight:750;letter-spacing:-.6px}.badge{font-size:12px;letter-spacing:1px;text-transform:uppercase;border:1px solid #98aaa2;border-radius:30px;padding:6px 12px}.hero{padding:48px 0 22px}h1{font-size:58px;line-height:1.06;letter-spacing:-2px;margin:0 0 24px;max-width:820px}h1 em{font-style:normal;color:#29644f}.lead{font-size:21px;max-width:760px;color:#53615e}.path{display:flex;gap:10px;flex-wrap:wrap;margin:28px 0}.path span{padding:9px 16px;background:#e2ebe5;border-radius:6px}.path b{align-self:center}.split{display:grid;grid-template-columns:1fr 1fr;gap:20px}.panel{background:#fff;border:1px solid #d6dcd8;border-radius:12px;padding:25px}.panel h2{margin:0 0 15px;font-size:22px}.label{font-size:12px;letter-spacing:1px;color:#68756e;text-transform:uppercase}.quote{font-size:17px;margin:12px 0}.before{border-top:4px solid #b49d85}.after{border-top:4px solid #39755c}.callout{background:#182f29;color:#fff;border-radius:12px;padding:24px 28px;margin:24px 0}.callout p{margin:5px 0}.muted{color:#586961}h2{font-size:28px;line-height:1.25}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}button{font:inherit;background:#fff;border:1px solid #abbdb2;border-radius:6px;padding:8px 12px;cursor:pointer}button[aria-selected="true"]{background:#29644f;color:white}.trace{display:grid;grid-template-columns:140px 1fr 200px;gap:16px;padding:14px 0;border-top:1px solid #dde4de}.trace small{text-align:right}.episode h3{margin-top:0}details{margin:24px 0;border-top:1px solid #ced7d0;padding-top:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.65 ui-monospace,monospace;background:#f2f5f2;padding:18px;border-radius:8px}footer{border-top:1px solid #c8d0cc;margin-top:42px;padding-top:20px;font-size:13px;color:#596760}a{color:#29644f}code{font-size:.9em}button:focus-visible,a:focus-visible{outline:3px solid #bf863c;outline-offset:3px}@media(max-width:700px){main{padding:22px 18px}h1{font-size:40px;letter-spacing:-1px}.split{grid-template-columns:1fr}.trace{grid-template-columns:1fr;gap:4px}.trace small{text-align:left}.hero{padding-top:32px}}
</style></head><body><main><header><div class="brand">Case2Skill</div><div class="badge">Recorded run · offline replay</div></header><div class="hero"><h1>Don't just save a skill.<br><em>Keep how it learned.</em></h1><p class="lead">Turn a solved case into a source-linked skill. Use it in a new task, inspect what happened, and review the next version.</p><div class="path"><span>Case</span><b>→</b><span>Skill</span><b>→</b><span>Application</span><b>→</b><span>Revision</span><b>→</b><span>Recheck</span></div></div>
<div class="split"><article class="panel before"><span class="label">Observed application</span><h2>A step that needed a condition</h2><p>The current service said lookup was unavailable. The original skill still prompted one lookup before leaving the request unresolved.</p><pre>${record.highlight.observations.map(o => escape(o.action.action + ': ' + o.response.status)).join('\n')}</pre><p class="muted">An unnecessary interaction, not a duplicate report or a failed safety decision.</p></article><article class="panel after"><span class="label">Model-generated revision</span><h2>Check the current contract first</h2><p class="quote">${escape(record.after.lesson.steps[2].text)}</p><p class="muted">Only step 3 changed in this recorded revision. Its evidence and previous version remain inspectable.</p></article></div>
<div class="callout"><p><strong>What the recheck found</strong></p><p>Both versions behaved appropriately in all four development tasks. No general performance gain is claimed; the traceable revision workflow is what this example demonstrates.</p></div>
<h2>Inspect the actual action sequences</h2><p class="muted">These are saved model actions replayed against the same local simulator. No model request runs in this page or replay command.</p><div class="tabs" role="tablist" aria-label="Recorded task">${tasks.map((id, i) => `<button role="tab" id="tab-${i}" aria-controls="episode-${i}" aria-selected="${!i}" data-index="${i}">${i + 1}. ${escape(id.replaceAll('-', ' '))}</button>`).join('')}</div><div class="panel">${cards}</div>
<details><summary>View original and revised skill text</summary><h3>Original</h3><pre>${escape(record.before.skill)}</pre><h3>Revised</h3><pre>${escape(record.after.skill)}</pre></details><details><summary>Evidence and scope</summary><p>The bundled sources are self-authored simulations. The public recording is a selected projection of saved model runs; personal paths, full prompt envelopes and session identifiers were removed. File hashes check consistency, not third-party authenticity.</p><pre>${escape(JSON.stringify(record.metadata, null, 2))}</pre><p>All candidates still require human review before installation. Local task results do not establish general agent improvement.</p></details><footer><strong>Try your own case:</strong> <code>node src/cli.ts init --out work/my-case</code><br>Start with README.md. This page is self-contained, makes no network requests, and includes no analytics.</footer></main><script>
const tabs=[...document.querySelectorAll('[role=tab]')];function select(i){tabs.forEach((b,j)=>{b.setAttribute('aria-selected',String(j===i));document.getElementById('episode-'+j).hidden=j!==i;});}tabs.forEach((b,i)=>{b.addEventListener('click',()=>select(i));b.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();let j=(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(j);tabs[j].focus();}});});
</script></body></html>`;
}

export function replay(out: string, directory = RECORDING_ROOT) {
  const record = inspectRecording(directory);
  const report = { mode: 'recorded_model_replay', model_calls_this_run: 0, recorded_task_episodes: record.rows.length, consistency: record.consistency,
    recording_sha256: record.recording_sha256, parent_hash: record.before.manifest.content_hash, child_hash: record.after.manifest.content_hash,
    rows: record.rows, changed_fields: record.changes.map(c => c.field), performance_gain_claimed: false };
  jsonWrite(path.join(out, 'report.json'), report); textWrite(path.join(out, 'index.html'), replayHtml(record));
  return { ...report, page: path.join(out, 'index.html') };
}
