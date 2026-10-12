---
name: recover-idempotent-submit-after-timeout
description: "Recover from an ambiguous submit timeout without accidentally duplicating a created resource. This candidate lesson applies to a service that accepts caller-supplied operation identifiers, provides lookup, and promises retained idempotent replay for the same identifier and identical payload. The case is a local virtual-time simulation, so the procedure should be adapted only after checking the target service’s actual contract and retention rules."
---

# recover-idempotent-submit-after-timeout

Determine whether a timed-out creation request succeeded, recover its result when possible, and avoid turning one intended operation into duplicate reports.

> Candidate extracted from a case. References are inspectable; semantic correctness and transfer are not implied by formatting checks.

## When to use

- The operation must use a caller-supplied identifier that can be preserved after a timeout and reused for lookup or replay.
- The service must explicitly support idempotency for the relevant operation and retain the identifier long enough for recovery.
- A retry intended to represent the same logical operation must retain both the original operation identifier and the identical payload; changing the payload produces a conflict under this contract.
- Lookup must be available if the workflow relies on checking the original operation before replaying it.

## When not to apply directly

- Do not treat this procedure as established for other service versions or for retries made after the idempotency retention period.
- Do not use a fresh operation identifier as an automatic response to an ambiguous timeout when the user intended only one report; in the observed fixture, that behavior created a second report.

## Resolve these uncertainties

- The case does not establish what a caller should do after lookup returns not_found or indeterminate; those states do not, by themselves, prove whether creation occurred in every possible service implementation. [inference — review]
- The case does not establish recovery behavior at or beyond expiry, where replay protection no longer applies and another submission may create a new report.
- The event timestamps are virtual ticks and cannot be used to infer real network latency, retry delays, or production timing thresholds.

## Procedure

1. Before submitting, generate and persist one operation identifier for the user’s single intended creation. Store it together with the exact request payload so both remain available if the response is lost. The identifier represents caller intent; payload equality alone is insufficient because identical payloads may legitimately describe separate requested reports. [inference — review]
2. Submit the payload with that operation identifier. If the client receives a timeout, classify the outcome as ambiguous rather than failed: a timeout alone does not reveal whether the server accepted the request. Do not immediately allocate a new identifier, because the original request may already have created the resource.
3. While the original identifier remains within the documented retention window, query lookup using that identifier. If lookup returns completed, accept the returned report identifier as the created result and stop retrying the creation. Completed report identifiers correspond to actual created reports under this fixture’s contract.
4. If recovery requires replay and the contract still guarantees protection, resubmit using the original operation identifier and the byte-for-byte or semantically contract-identical payload. Never silently modify the payload: this fixture specifies that an identical payload returns the same report while a changed payload returns conflict.
5. Verify the replay result against the recovered report identifier when both are available. In the successful fixture, lookup of case-original returned completed with report-001, and the later same-identifier submission produced an idempotent replay of report-001 rather than creating another report.
6. If lookup is unavailable or returns indeterminate, preserve the ambiguity and escalate to a service-specific recovery decision instead of claiming success or noncreation. An indeterminate response confirms neither outcome, so any replay decision must account for the remaining retention time and the cost of duplication. [inference — review]
7. If the key is expired or idempotency is unsupported, do not describe another submission as safely idempotent. The contract permits such a submission to create another report. Require an explicit business decision about whether possible duplication is preferable to possible omission, and record the unresolved original operation. [inference — review]
8. Validate the outcome using actual creation records or completed report identifiers, not merely client attempts. The comparison fixture demonstrates the operational test: retrying with a new key produced two report_created events, whereas lookup followed by same-key replay retained one created report.

## Evidence

See references/evidence.md for exact source ranges and evidence classifications.
