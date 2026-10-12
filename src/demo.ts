import path from 'node:path';
import { generateSourceCase } from './case.ts';
import { compileCandidate, exportCandidate, mechanicalLesson } from './bundle.ts';
import { createTask, evaluate, fixedPolicy, TASK_IDS } from './tasks.ts';
import { digest, jsonWrite, textWrite } from './util.ts';

export function runDemo(out: string) {
  const source = generateSourceCase(path.join(out, 'source-case'));
  const policies = ['correct', 'always-retry', 'always-wait', 'payload-dedup'] as const;
  // Preserve the historical six-task control panel; the new boundary case has its own test.
  const controlIds = TASK_IDS.filter(id => id !== 'lookup-after-expiry');
  const rows: Array<ReturnType<typeof evaluate> & { policy: typeof policies[number] }> = [];
  for (const id of controlIds) for (const policy of policies) {
    const task = createTask(id); fixedPolicy(task, policy);
    const row = { policy, ...evaluate(task) }; rows.push(row);
    jsonWrite(path.join(out, 'controls', id + '--' + policy + '.json'), { evidence_class: 'fixed_policy_control_not_llm', ...row, observations: task.observations, service: task.service.inspect() });
  }
  const compiled = compileCandidate(mechanicalLesson(source), source, path.join(out, 'mechanical-candidate'), 'handwritten_test_fixture');
  exportCandidate(path.join(out, 'mechanical-candidate'), path.join(out, 'mechanical-export'));
  const report = { schema_version: 'case2skill.controls.v0', evidence_class: 'actual_local_simulator_runs_fixed_policies', model_calls: 0,
    source_digest: source.sourceDigest, candidate_hash: compiled.manifest.content_hash,
    policies: Object.fromEntries(policies.map(p => [p, { behavior_pass: rows.filter(r => r.policy === p && r.behavior_pass).length, tasks: controlIds.length }])), rows };
  jsonWrite(path.join(out, 'controls.json'), report);
  const md = ['# Case2Skill R0: executed control report', '', 'These are actual local simulator executions by fixed policies, NOT model trials. The correct control has privileged scenario knowledge and exists only to validate the evaluator.', '',
    '| Policy | Behavior checks passed | Report tasks completed | Extra reports |', '|---|---:|---:|---:|', ...policies.map(p => `| ${p} | ${rows.filter(r => r.policy === p && r.behavior_pass).length}/6 | ${rows.filter(r => r.policy === p && r.task_success).length}/6 | ${rows.filter(r => r.policy === p).reduce((n, r) => n + r.extra_reports, 0)} |`), '',
    'A safe pending response is not a completed report. The handwritten mechanical candidate demonstrates packaging only. No model-learning or model-performance claim is made.', '', 'All 24 per-task traces are in controls/. Source evidence is in source-case/.', ''];
  textWrite(path.join(out, 'report.md'), md.join('\n'));
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const html = '<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Case2Skill R0 · 执行结果</title><style>body{font:17px/1.7 system-ui,sans-serif;max-width:1080px;margin:44px auto;padding:0 24px;color:#202630}h1{font-size:38px;line-height:1.2}aside{padding:18px;border:1px solid #b8c0cc;border-radius:8px}table{border-collapse:collapse;width:100%;margin:24px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #d5dae0}th{background:#edf0f4}small{color:#556070}.pass{font-weight:650}pre{white-space:pre-wrap}</style><h1>Case2Skill R0</h1><p>从解决经历到可检查技能：第一轮本地运行</p><aside><strong>固定策略验证 · 不是大模型对照</strong><br>这里展示真实执行的本地模拟器记录。模型调用为 0；示范候选由程序测试夹具提供，未假装由模型学习产生。</aside><h2>四种策略，六种任务</h2><table><thead><tr><th>策略</th><th>行为检查</th><th>报告完成</th><th>多余报告</th></tr></thead><tbody>' + policies.map(p => '<tr><td>' + escape(p) + '</td><td>' + rows.filter(r => r.policy === p && r.behavior_pass).length + '/6</td><td>' + rows.filter(r => r.policy === p && r.task_success).length + '/6</td><td>' + rows.filter(r => r.policy === p).reduce((n, r) => n + r.extra_reports, 0) + '</td></tr>').join('') + '</tbody></table><p>正确控制策略使用场景真值来检验评价器，不是可宣传的 Agent 成绩。恰当等待与实际完成分开记录。</p><h2>逐项结果</h2><table><thead><tr><th>情境</th><th>策略</th><th>结果</th><th>行为</th></tr></thead><tbody>' + rows.map(r => '<tr><td>' + escape(r.task_id) + '</td><td>' + escape(r.policy) + '</td><td>' + r.task_outcome + '</td><td>' + r.transfer_behavior + '</td></tr>').join('') + '</tbody></table><p><a href="report.md">文字报告</a> · <a href="controls.json">结构化报告</a> · <a href="source-case/case.md">源案例</a></p><small>独立源码；未连接课堂、企业、设备或公共发布接口。控制报告指纹 ' + digest(report) + '</small></html>';
  textWrite(path.join(out, 'report.html'), html); return report;
}
