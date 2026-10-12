import { boundedText, canonical, exactKeys, object } from './util.ts';

export type Payload = { title: string; period: string };
export type Contract = { idempotency: boolean; retentionTicks: number; lookup: 'available' | 'unavailable' };
export type Report = { id: string; operationId: string; payload: Payload; createdAt: number };
export type Event = { seq: number; at: number; kind: string; details: Record<string, unknown> };
export type Reply = { status: string; reportId?: string; reason?: string };
export type Fault = 'none' | 'timeout_after_commit' | 'timeout_before_commit';

export function parsePayload(raw: unknown): Payload {
  const p = object(raw, 'payload'); exactKeys(p, ['title', 'period'], 'payload');
  return { title: boundedText(p.title, 'title', 160), period: boundedText(p.period, 'period', 80) };
}
function validId(value: unknown): string {
  const id = boundedText(value, 'operationId', 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(id)) throw new Error('Invalid operationId');
  return id;
}

/** Deterministic local fixture. Not a network service and not a production API. */
export class ReportService {
  #contract: Contract;
  #clock = 0;
  #reports: Report[] = [];
  #events: Event[] = [];
  #keys = new Map<string, { reportId: string; payload: string; expires: number }>();
  #fault: Fault;
  constructor(contract: Contract, fault: Fault = 'none') {
    if (!Number.isSafeInteger(contract.retentionTicks) || contract.retentionTicks < 1) throw new Error('Invalid retention');
    if (typeof contract.idempotency !== 'boolean' || !['available', 'unavailable'].includes(contract.lookup)) throw new Error('Invalid contract');
    this.#contract = structuredClone(contract); this.#fault = fault;
  }
  #emit(kind: string, details: Record<string, unknown>): void {
    this.#events.push({ seq: this.#events.length + 1, at: this.#clock, kind, details: structuredClone(details) });
  }
  submit(operationId: string, rawPayload: unknown): Reply {
    const id = validId(operationId), payload = parsePayload(rawPayload); this.#clock++;
    this.#emit('submit_received', { operationId: id, payload });
    const old = this.#keys.get(id);
    if (this.#contract.idempotency && old && this.#clock < old.expires) {
      if (old.payload !== canonical(payload)) {
        this.#emit('payload_conflict', { operationId: id });
        return { status: 'conflict', reason: 'Same operation identifier with changed payload inside retention window' };
      }
      this.#emit('idempotent_replay', { operationId: id, reportId: old.reportId });
      return { status: 'completed', reportId: old.reportId };
    }
    const fault = this.#fault; this.#fault = 'none';
    if (fault === 'timeout_before_commit') {
      this.#emit('timeout_before_commit', { operationId: id }); return { status: 'timeout' };
    }
    const report: Report = { id: 'report-' + String(this.#reports.length + 1).padStart(3, '0'), operationId: id, payload, createdAt: this.#clock };
    this.#reports.push(report);
    if (this.#contract.idempotency) this.#keys.set(id, { reportId: report.id, payload: canonical(payload), expires: this.#clock + this.#contract.retentionTicks });
    this.#emit('report_created', { ...report });
    if (fault === 'timeout_after_commit') {
      this.#emit('response_lost', { operationId: id }); return { status: 'timeout' };
    }
    return { status: 'completed', reportId: report.id };
  }
  lookup(operationId: string): Reply {
    const id = validId(operationId); this.#clock++; this.#emit('lookup', { operationId: id });
    if (this.#contract.lookup === 'unavailable') return { status: 'indeterminate', reason: 'Lookup currently unavailable; execution cannot be inferred' };
    const reports = this.#reports.filter(r => r.operationId === id);
    if (reports.length > 1) return { status: 'indeterminate', reason: 'Identifier maps to more than one report' };
    if (reports.length === 1) return { status: 'completed', reportId: reports[0].id };
    return { status: 'not_found', reason: 'No committed report is visible under this identifier' };
  }
  advance(ticks: number): void {
    if (!Number.isSafeInteger(ticks) || ticks < 0) throw new Error('Invalid clock advance');
    this.#clock += ticks; this.#emit('virtual_clock_advanced', { ticks });
  }
  inspect(): { clock: number; contract: Contract; reports: Report[]; events: Event[] } {
    return structuredClone({ clock: this.#clock, contract: this.#contract, reports: this.#reports, events: this.#events });
  }
}

export function describeContract(c: Contract): string {
  return [
    '# Report service contract (local fixture, virtual time)',
    'Payload: title and period. submit(operation_id, payload); lookup(operation_id).',
    `Idempotency supported: ${c.idempotency}. Retention: ${c.retentionTicks} virtual ticks from the accepted creation.`,
    'Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.',
    'When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.',
    'An unsupported or expired key does not prevent a repeated submission from creating another report.',
    'A client timeout alone does not disclose whether the server accepted the request.',
    `Lookup: ${c.lookup}. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.`,
    'The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.',
    'Report IDs returned by completed responses identify actual created reports. An indeterminate response does not confirm creation or noncreation.'
  ].join('\n') + '\n';
}
