import { existsSync } from 'node:fs';
import path from 'node:path';
import { jsonWrite, textWrite } from './util.ts';

export function initCase(out: string) {
  if (existsSync(out)) throw new Error('Case destination already exists');
  jsonWrite(path.join(out, 'case.json'), { schema_version: 'case2skill.case.v0', case_id: 'my-solved-case', files: [
    { path: 'case.md', kind: 'narrative' }, { path: 'contract.md', kind: 'contract' }
  ] });
  textWrite(path.join(out, 'case.md'), '# My solved case\n\nReplace this template with a real problem you have permission to share with your model.\n\n## Goal and context\nDescribe the task, versions and constraints.\n\n## What happened\nRecord the failed attempt, the correction and the observed result. Do not invent logs.\n\n## What remains unknown\nExplain what the case did not establish.\n');
  textWrite(path.join(out, 'contract.md'), '# Relevant contract\n\nReplace this with the applicable project rules or interface documentation. Cite its version.\n\nTo include execution evidence, add a .jsonl file and declare it as runtime_log in case.json.\n');
  return { directory: out, status: 'template_requires_user_content', model_calls: 0 };
}
