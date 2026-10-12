# Evidence ledger

These excerpts locate evidence; they do not certify that each inference is justified.

Source case: report-timeout-001
Source digest: c9f57bfced17ca9663f9eb421f33e283ca014966622a5521109f41d6c15d30c2

## Statement 1 (documented)

The operation must use a caller-supplied identifier that can be preserved after a timeout and reused for lookup or replay.

Source: service-contract.md:2-2; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Payload: title and period. submit(operation_id, payload); lookup(operation_id).

Source: service-contract.md:9-9; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.

## Statement 2 (documented)

The service must explicitly support idempotency for the relevant operation and retain the identifier long enough for recovery.

Source: service-contract.md:3-5; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Idempotency supported: true. Retention: 40 virtual ticks from the accepted creation.
    Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.
    When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.

## Statement 3 (documented)

A retry intended to represent the same logical operation must retain both the original operation identifier and the identical payload; changing the payload produces a conflict under this contract.

Source: service-contract.md:5-5; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.

## Statement 4 (documented)

Lookup must be available if the workflow relies on checking the original operation before replaying it.

Source: service-contract.md:8-8; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.

## Statement 5 (documented)

Do not treat this procedure as established for other service versions or for retries made after the idempotency retention period.

Source: case.md:7-7; file SHA-256 a3b5d9f379b54e552325fc7222d0a6e01c0e16323905e345863d3988118ca248

    The service contract is included. This record does not establish behavior for other service versions or after the retention period.

## Statement 6 (observed)

Do not use a fresh operation identifier as an automatic response to an ambiguous timeout when the user intended only one report; in the observed fixture, that behavior created a second report.

Source: events.jsonl:1-5; file SHA-256 231b615b13a5ca188b756d1daf89681a2d74af41d8e10aad8fb3e87a6cbd5a35

    {"run":"attempt-a","seq":1,"at":1,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":1}}
    {"run":"attempt-a","seq":3,"at":1,"kind":"response_lost","details":{"operationId":"case-original"}}
    {"run":"attempt-a","seq":4,"at":2,"kind":"submit_received","details":{"operationId":"case-retry-new-key","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":5,"at":2,"kind":"report_created","details":{"id":"report-002","operationId":"case-retry-new-key","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":2}}

## Statement 7 (inferred)

The case does not establish what a caller should do after lookup returns not_found or indeterminate; those states do not, by themselves, prove whether creation occurred in every possible service implementation.

Source: service-contract.md:7-10; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    A client timeout alone does not disclose whether the server accepted the request.
    Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.
    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.
    Report IDs returned by completed responses identify actual created reports. An indeterminate response does not confirm creation or noncreation.

## Statement 8 (documented)

The case does not establish recovery behavior at or beyond expiry, where replay protection no longer applies and another submission may create a new report.

Source: service-contract.md:4-6; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.
    When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.
    An unsupported or expired key does not prevent a repeated submission from creating another report.

## Statement 9 (documented)

The event timestamps are virtual ticks and cannot be used to infer real network latency, retry delays, or production timing thresholds.

Source: case.md:6-6; file SHA-256 a3b5d9f379b54e552325fc7222d0a6e01c0e16323905e345863d3988118ca248

    events.jsonl contains actual fixture events. Its at field is virtual time, not wall-clock latency.

## Statement 10 (inferred)

Before submitting, generate and persist one operation identifier for the user’s single intended creation. Store it together with the exact request payload so both remain available if the response is lost. The identifier represents caller intent; payload equality alone is insufficient because identical payloads may legitimately describe separate requested reports.

Source: service-contract.md:2-2; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Payload: title and period. submit(operation_id, payload); lookup(operation_id).

Source: service-contract.md:9-9; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.

## Statement 11 (documented)

Submit the payload with that operation identifier. If the client receives a timeout, classify the outcome as ambiguous rather than failed: a timeout alone does not reveal whether the server accepted the request. Do not immediately allocate a new identifier, because the original request may already have created the resource.

Source: service-contract.md:7-7; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    A client timeout alone does not disclose whether the server accepted the request.

Source: events.jsonl:1-3; file SHA-256 231b615b13a5ca188b756d1daf89681a2d74af41d8e10aad8fb3e87a6cbd5a35

    {"run":"attempt-a","seq":1,"at":1,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":1}}
    {"run":"attempt-a","seq":3,"at":1,"kind":"response_lost","details":{"operationId":"case-original"}}

## Statement 12 (documented)

While the original identifier remains within the documented retention window, query lookup using that identifier. If lookup returns completed, accept the returned report identifier as the created result and stop retrying the creation. Completed report identifiers correspond to actual created reports under this fixture’s contract.

Source: service-contract.md:3-4; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Idempotency supported: true. Retention: 40 virtual ticks from the accepted creation.
    Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.

Source: service-contract.md:8-10; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.
    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.
    Report IDs returned by completed responses identify actual created reports. An indeterminate response does not confirm creation or noncreation.

## Statement 13 (documented)

If recovery requires replay and the contract still guarantees protection, resubmit using the original operation identifier and the byte-for-byte or semantically contract-identical payload. Never silently modify the payload: this fixture specifies that an identical payload returns the same report while a changed payload returns conflict.

Source: service-contract.md:4-5; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.
    When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.

## Statement 14 (observed)

Verify the replay result against the recovered report identifier when both are available. In the successful fixture, lookup of case-original returned completed with report-001, and the later same-identifier submission produced an idempotent replay of report-001 rather than creating another report.

Source: case.md:5-5; file SHA-256 a3b5d9f379b54e552325fc7222d0a6e01c0e16323905e345863d3988118ca248

    Attempt B: the original client response was timeout. The client queried case-original, receiving completed with report report-001. A later same-identifier replay returned report-001. Actual reports: 1.

Source: events.jsonl:9-11; file SHA-256 231b615b13a5ca188b756d1daf89681a2d74af41d8e10aad8fb3e87a6cbd5a35

    {"run":"attempt-b","seq":4,"at":2,"kind":"lookup","details":{"operationId":"case-original"}}
    {"run":"attempt-b","seq":5,"at":3,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-b","seq":6,"at":3,"kind":"idempotent_replay","details":{"operationId":"case-original","reportId":"report-001"}}

## Statement 15 (inferred)

If lookup is unavailable or returns indeterminate, preserve the ambiguity and escalate to a service-specific recovery decision instead of claiming success or noncreation. An indeterminate response confirms neither outcome, so any replay decision must account for the remaining retention time and the cost of duplication.

Source: service-contract.md:8-10; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.
    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.
    Report IDs returned by completed responses identify actual created reports. An indeterminate response does not confirm creation or noncreation.

## Statement 16 (inferred)

If the key is expired or idempotency is unsupported, do not describe another submission as safely idempotent. The contract permits such a submission to create another report. Require an explicit business decision about whether possible duplication is preferable to possible omission, and record the unresolved original operation.

Source: service-contract.md:6-7; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    An unsupported or expired key does not prevent a repeated submission from creating another report.
    A client timeout alone does not disclose whether the server accepted the request.

## Statement 17 (observed)

Validate the outcome using actual creation records or completed report identifiers, not merely client attempts. The comparison fixture demonstrates the operational test: retrying with a new key produced two report_created events, whereas lookup followed by same-key replay retained one created report.

Source: events.jsonl:1-5; file SHA-256 231b615b13a5ca188b756d1daf89681a2d74af41d8e10aad8fb3e87a6cbd5a35

    {"run":"attempt-a","seq":1,"at":1,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":1}}
    {"run":"attempt-a","seq":3,"at":1,"kind":"response_lost","details":{"operationId":"case-original"}}
    {"run":"attempt-a","seq":4,"at":2,"kind":"submit_received","details":{"operationId":"case-retry-new-key","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":5,"at":2,"kind":"report_created","details":{"id":"report-002","operationId":"case-retry-new-key","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":2}}

Source: events.jsonl:6-11; file SHA-256 231b615b13a5ca188b756d1daf89681a2d74af41d8e10aad8fb3e87a6cbd5a35

    {"run":"attempt-b","seq":1,"at":1,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-b","seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":1}}
    {"run":"attempt-b","seq":3,"at":1,"kind":"response_lost","details":{"operationId":"case-original"}}
    {"run":"attempt-b","seq":4,"at":2,"kind":"lookup","details":{"operationId":"case-original"}}
    {"run":"attempt-b","seq":5,"at":3,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-b","seq":6,"at":3,"kind":"idempotent_replay","details":{"operationId":"case-original","reportId":"report-001"}}
