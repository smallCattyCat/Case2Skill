import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describeContract, ReportService } from './report-service.ts';
import { boundedText, digest, exactKeys, insideFile, jsonWrite, object, relativeName, sha256, textWrite } from './util.ts';

export type Source = { path: string; kind: 'narrative' | 'contract' | 'runtime_log'; text: string; sha256: string; lines: string[] };
export type CasePack = { id: string; sources: Source[]; sourceDigest: string };
/** Check the actual in-memory snapshot before compiling references against it. */
export function assertCaseSnapshot(pack: CasePack): void {
  for (const source of pack.sources) {
    const lines = source.text.replace(/\r\n/g, '\n').split('\n'); if (lines.at(-1) === '') lines.pop();
    if (sha256(source.text) !== source.sha256 || digest(lines) !== digest(source.lines)) throw new Error('Case snapshot changed after loading');
  }
  if (pack.sourceDigest !== digest({ id: pack.id, files: pack.sources.map(s => ({ path: s.path, kind: s.kind, sha256: s.sha256 })) })) throw new Error('Case snapshot digest mismatch');
}
export function loadCase(directory: string): CasePack {
  const manifestPath = insideFile(directory, 'case.json');
  if (statSync(manifestPath).size > 16384) throw new Error('Case manifest too large');
  const raw = object(JSON.parse(readFileSync(manifestPath, 'utf8')), 'case');
  exactKeys(raw, ['schema_version', 'case_id', 'files'], 'case');
  if (raw.schema_version !== 'case2skill.case.v0') throw new Error('Unsupported case version');
  const id = boundedText(raw.case_id, 'case_id', 100);
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(id)) throw new Error('Invalid case ID');
  if (!Array.isArray(raw.files) || !raw.files.length || raw.files.length > 8) throw new Error('Expected 1..8 source files');
  const names = new Set<string>(); let total = 0;
  const sources = raw.files.map((entry): Source => {
    const e = object(entry, 'source'); exactKeys(e, ['path', 'kind'], 'source');
    const name = relativeName(boundedText(e.path, 'path', 160));
    if (!/\.(md|txt|jsonl)$/u.test(name) || name.split('/').some(p => p.startsWith('.')) || names.has(name)) throw new Error('Unsupported or duplicate source path');
    names.add(name);
    if (!['narrative', 'contract', 'runtime_log'].includes(e.kind as string)) throw new Error('Unknown source kind');
    const file = insideFile(directory, name), size = statSync(file).size;
    total += size;
    if (size > 65536 || total > 196608 || !statSync(file).isFile()) throw new Error('Source size limit exceeded');
    const bytes = readFileSync(file), text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{24,}|\bBearer\s+[A-Za-z0-9._~-]{20,}/u.test(text)) throw new Error('Potential credential in source; redact before model use');
    const lines = text.replace(/\r\n/g, '\n').split('\n'); if (lines.at(-1) === '') lines.pop();
    return { path: name, kind: e.kind as Source['kind'], text, sha256: sha256(bytes), lines };
  });
  return { id, sources, sourceDigest: digest({ id, files: sources.map(s => ({ path: s.path, kind: s.kind, sha256: s.sha256 })) }) };
}

/** Creates source evidence by running two reset fixtures, never by inventing events. */
export function generateSourceCase(directory: string): CasePack {
  if (existsSync(directory)) throw new Error('Source destination already exists');
  mkdirSync(directory, { recursive: true });
  const contract = { idempotency: true, retentionTicks: 40, lookup: 'available' as const };
  const payload = { title: 'Deployment summary', period: '2026-W40' };
  const failed = new ReportService(contract, 'timeout_after_commit');
  const firstBad = failed.submit('case-original', payload);
  const secondBad = failed.submit('case-retry-new-key', payload);
  const recovered = new ReportService(contract, 'timeout_after_commit');
  const firstGood = recovered.submit('case-original', payload);
  const lookup = recovered.lookup('case-original');
  const replay = recovered.submit('case-original', payload);
  const events = [
    ...failed.inspect().events.map(e => ({ run: 'attempt-a', ...e })),
    ...recovered.inspect().events.map(e => ({ run: 'attempt-b', ...e }))
  ];
  textWrite(path.join(directory, 'events.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n');
  textWrite(path.join(directory, 'service-contract.md'), describeContract(contract));
  textWrite(path.join(directory, 'case.md'), [
    '# Case: client timeout while generating a deployment report',
    'Evidence class: self-authored local simulation, not a production incident.',
    'Two separate reset fixtures start with the same user request: generate one deployment summary.',
    `Attempt A: the client received ${firstBad.status} for operation case-original, then retried under case-retry-new-key. The second response was ${secondBad.status}. Actual reports after these calls: ${failed.inspect().reports.length}.`,
    `Attempt B: the original client response was ${firstGood.status}. The client queried case-original, receiving ${lookup.status} with report ${lookup.reportId}. A later same-identifier replay returned ${replay.reportId}. Actual reports: ${recovered.inspect().reports.length}.`,
    'events.jsonl contains actual fixture events. Its at field is virtual time, not wall-clock latency.',
    'The service contract is included. This record does not establish behavior for other service versions or after the retention period.'
  ].join('\n') + '\n');
  jsonWrite(path.join(directory, 'case.json'), { schema_version: 'case2skill.case.v0', case_id: 'report-timeout-001', files: [
    { path: 'case.md', kind: 'narrative' }, { path: 'service-contract.md', kind: 'contract' }, { path: 'events.jsonl', kind: 'runtime_log' }
  ] });
  return loadCase(directory);
}

export function modelSource(pack: CasePack): string {
  return JSON.stringify({ case_id: pack.id, source_digest: pack.sourceDigest, sources: pack.sources.map(s => ({ path: s.path, kind: s.kind, sha256: s.sha256, numbered_lines: s.lines.map((text, i) => ({ line: i + 1, text })) })) });
}
