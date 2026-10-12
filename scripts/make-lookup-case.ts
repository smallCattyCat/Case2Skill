import { existsSync } from 'node:fs';
import path from 'node:path';
import { generateSourceCase, loadCase } from '../src/case.ts';
import { ReportService } from '../src/report-service.ts';
import { jsonWrite, textWrite } from '../src/util.ts';

export function makeLookupCase(out: string) {
  if (existsSync(out)) throw new Error('Example directory already exists');
  const base = generateSourceCase(path.join(out, 'base'));
  const source = path.join(out, 'source');
  for (const s of base.sources) textWrite(path.join(source, s.path), s.text);
  const contract = { idempotency: true, retentionTicks: 40, lookup: 'available' as const };
  const service = new ReportService(contract, 'timeout_after_commit');
  const payload = { title: 'Release compatibility summary', period: 'v2' };
  service.submit('receipt-store-v2', payload); service.advance(50);
  const reply = service.lookup('receipt-store-v2');
  textWrite(path.join(source, 'receipt-store-v2.md'), '# Receipt-store extension, version 2\nThe replay cache and accepted-report index have different lifetimes in this local fixture.\nReplay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.\nAn expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.\nIn this execution, a client lost its submit response, waited 50 ticks, and recovered the existing report by lookup without submitting again.\nResult: ' + reply.status + ', report identifier: ' + reply.reportId + ', actual report count: ' + service.inspect().reports.length + '.\nThis is independently written synthetic software evidence, not a production incident or a model trial.\n');
  textWrite(path.join(source, 'receipt-store-events.jsonl'), service.inspect().events.map(e => JSON.stringify(e)).join('\n') + '\n');
  jsonWrite(path.join(source, 'case.json'), { schema_version: 'case2skill.case.v0', case_id: base.id, files: [...base.sources.map(s => ({ path: s.path, kind: s.kind })), { path: 'receipt-store-v2.md', kind: 'contract' }, { path: 'receipt-store-events.jsonl', kind: 'runtime_log' }] });
  return loadCase(source);
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/make-lookup-case.ts')) {
  const out = process.argv[2]; if (!out) throw new Error('Usage: node scripts/make-lookup-case.ts NEW_DIRECTORY');
  console.log(JSON.stringify({ source_digest: makeLookupCase(path.resolve(out)).sourceDigest }, null, 2));
}
