---
name: recover-idempotent-submit-after-timeout
description: "Recover from an ambiguous report-submission timeout without duplicating the intended report. This candidate applies to the local fixture’s caller-supplied operation identifiers, historical lookup, and time-limited replay protection; it does not establish behavior for unrelated services or versions."
---

# recover-idempotent-submit-after-timeout

Determine whether a timed-out report creation succeeded, recover its report identifier when possible, and avoid converting one intended report into duplicate reports.

> Candidate extracted from a case. References are inspectable; semantic correctness and transfer are not implied by formatting checks.

## When to use

- The caller must supply and preserve an operation identifier that the service accepts for submit and lookup.
- The service must provide lookup by operation identifier for the workflow to recover an accepted report without another write.
- A protected replay must occur strictly before this fixture’s 40-tick expiry and must retain the original identifier and identical payload.
- The caller must distinguish replay-cache retention from historical-record retention because this fixture permits lookup after replay protection expires.

## When not to apply directly

- Do not generalize this procedure to other service versions or assume that their replay and lookup records have the same lifetimes.
- Do not automatically submit under a new operation identifier after an ambiguous timeout when the user intended one report; that action created a second report in Attempt A.
- Do not treat expiry of replay protection as expiry of historical lookup in the receipt-store-v2 fixture.
- Do not represent a submission at or after replay expiry as deduplicated; an expired key does not prevent creation of another report.

## Resolve these uncertainties

- The evidence does not define how long accepted-report records remain queryable after replay protection expires.
- A not_found or indeterminate lookup does not establish whether creation occurred across possible implementations; this contract explicitly states only that indeterminate confirms neither outcome. [inference — review]
- The evidence does not establish a safe replay procedure once protection has expired; another submission may create a report.
- Virtual ticks do not establish production latency, retry intervals, or wall-clock retention thresholds.
- The cases are synthetic local software evidence, not production incidents.

## Procedure

1. Before submission, assign and persist one operation identifier for the user’s single intended report, together with the exact payload. The caller must encode intent in the identifier because identical payloads can represent separate requested reports. [inference — review]
2. Submit the payload with that identifier. If the response times out, classify the result as ambiguous and preserve the original identifier; a timeout does not disclose whether the server accepted the request.
3. Use lookup with the original identifier before considering another write, including after replay protection has expired when historical lookup remains available. In receipt-store-v2, lookup after a 50-tick wait recovered the existing report without resubmission.
4. If lookup returns completed, accept its report identifier as the created result and stop creation retries; completed report identifiers identify actual created reports under this contract.
5. Replay only while the contract still guarantees protection, using the original operation identifier and identical payload. A changed payload conflicts, and replay protection applies strictly before—not at or after—the expiry tick.
6. When both lookup and replay results are available, verify that they identify the same report. In Attempt B, lookup recovered report-001 and the same-identifier replay returned report-001 without another report_created event.
7. If lookup returns indeterminate, retain the ambiguous state and make a service-specific recovery decision; do not claim creation or noncreation from that response.
8. If replay protection has expired, continue any available historical lookup but do not assume a further submission will be deduplicated. If lookup does not resolve the outcome, record the unresolved original operation and require an explicit decision between possible duplication and possible omission before another write. [inference — review]
9. Validate the final outcome using completed report identifiers and actual creation records rather than submit attempts alone. Attempt A recorded two report_created events after a new-key retry; Attempt B recorded one creation followed by same-key replay; receipt-store-v2 reported one actual report after post-expiry lookup without resubmission.

## Evidence

See references/evidence.md for exact source ranges and evidence classifications.
