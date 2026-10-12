import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportService } from '../src/report-service.ts';
const contract = { idempotency: true, retentionTicks: 8, lookup: 'available' as const };
const payload = { title: 'Example', period: '2026-W40' };

test('lost response can hide a committed report', () => {
  const s = new ReportService(contract, 'timeout_after_commit'); assert.equal(s.submit('a', payload).status, 'timeout'); assert.equal(s.inspect().reports.length, 1); assert.equal(s.lookup('a').reportId, 'report-001');
});
test('same key and payload replay creates no extra report', () => {
  const s = new ReportService(contract, 'timeout_after_commit'); s.submit('a', payload); assert.equal(s.submit('a', payload).reportId, 'report-001'); assert.equal(s.inspect().reports.length, 1);
});
test('new keys do not deduplicate equal payloads', () => {
  const s = new ReportService(contract); s.submit('a', payload); s.submit('b', payload); assert.equal(s.inspect().reports.length, 2);
});
test('same key with changed payload inside retention conflicts', () => {
  const s = new ReportService(contract); s.submit('a', payload); assert.equal(s.submit('a', { ...payload, title: 'Changed' }).status, 'conflict'); assert.equal(s.inspect().reports.length, 1);
});
test('an expired key no longer prevents creation, including exact boundary', () => {
  const s = new ReportService(contract); s.submit('a', payload); s.advance(7); s.submit('a', payload); assert.equal(s.inspect().reports.length, 2);
});
test('unsupported idempotency does not become safe by reusing a key', () => {
  const s = new ReportService({ ...contract, idempotency: false }); s.submit('a', payload); s.submit('a', payload); assert.equal(s.inspect().reports.length, 2); assert.equal(s.lookup('a').status, 'indeterminate');
});
test('before-commit timeout is recoverable with retained contract', () => {
  const s = new ReportService(contract, 'timeout_before_commit'); s.submit('a', payload); assert.equal(s.lookup('a').status, 'not_found'); assert.equal(s.submit('a', payload).status, 'completed'); assert.equal(s.inspect().reports.length, 1);
});
test('unavailable lookup does not expose whether a report exists', () => {
  const s = new ReportService({ ...contract, lookup: 'unavailable' }); assert.equal(s.lookup('a').status, 'indeterminate'); s.submit('a', payload); assert.equal(s.lookup('a').status, 'indeterminate');
});
test('malformed payload and identifiers cannot mutate state', () => {
  const s = new ReportService(contract); assert.throws(() => s.submit('../secret', payload)); assert.throws(() => s.submit('a', { ...payload, execute: 'something' })); assert.equal(s.inspect().reports.length, 0);
});
test('snapshots cannot mutate authoritative fixture state', () => {
  const s = new ReportService(contract); s.submit('a', payload); s.inspect().reports[0].payload.title = 'Tampered'; assert.equal(s.inspect().reports[0].payload.title, 'Example');
});
