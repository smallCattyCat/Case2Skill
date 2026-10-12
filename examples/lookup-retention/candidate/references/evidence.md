# Evidence ledger

These excerpts locate evidence; they do not certify that each inference is justified.

Source case: report-timeout-001
Source digest: 5e8058ba8907ef5989865be4aca7773ab1cc6c74ea5890f3058b5bfe85952c16

## Statement 1 (documented)

The caller must supply and preserve an operation identifier that the service accepts for submit and lookup.

Source: service-contract.md:2-2; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Payload: title and period. submit(operation_id, payload); lookup(operation_id).

Source: service-contract.md:9-9; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.

## Statement 2 (documented)

The service must provide lookup by operation identifier for the workflow to recover an accepted report without another write.

Source: service-contract.md:8-8; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.

Source: receipt-store-v2.md:3-4; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    Replay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.
    An expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.

## Statement 3 (documented)

A protected replay must occur strictly before this fixture’s 40-tick expiry and must retain the original identifier and identical payload.

Source: service-contract.md:3-5; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Idempotency supported: true. Retention: 40 virtual ticks from the accepted creation.
    Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.
    When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.

## Statement 4 (documented)

The caller must distinguish replay-cache retention from historical-record retention because this fixture permits lookup after replay protection expires.

Source: receipt-store-v2.md:2-4; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    The replay cache and accepted-report index have different lifetimes in this local fixture.
    Replay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.
    An expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.

## Statement 5 (documented)

Do not generalize this procedure to other service versions or assume that their replay and lookup records have the same lifetimes.

Source: case.md:7-7; file SHA-256 a3b5d9f379b54e552325fc7222d0a6e01c0e16323905e345863d3988118ca248

    The service contract is included. This record does not establish behavior for other service versions or after the retention period.

Source: receipt-store-v2.md:2-3; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    The replay cache and accepted-report index have different lifetimes in this local fixture.
    Replay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.

## Statement 6 (observed)

Do not automatically submit under a new operation identifier after an ambiguous timeout when the user intended one report; that action created a second report in Attempt A.

Source: case.md:3-4; file SHA-256 a3b5d9f379b54e552325fc7222d0a6e01c0e16323905e345863d3988118ca248

    Two separate reset fixtures start with the same user request: generate one deployment summary.
    Attempt A: the client received timeout for operation case-original, then retried under case-retry-new-key. The second response was completed. Actual reports after these calls: 2.

Source: events.jsonl:1-5; file SHA-256 231b615b13a5ca188b756d1daf89681a2d74af41d8e10aad8fb3e87a6cbd5a35

    {"run":"attempt-a","seq":1,"at":1,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":1}}
    {"run":"attempt-a","seq":3,"at":1,"kind":"response_lost","details":{"operationId":"case-original"}}
    {"run":"attempt-a","seq":4,"at":2,"kind":"submit_received","details":{"operationId":"case-retry-new-key","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":5,"at":2,"kind":"report_created","details":{"id":"report-002","operationId":"case-retry-new-key","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":2}}

## Statement 7 (documented)

Do not treat expiry of replay protection as expiry of historical lookup in the receipt-store-v2 fixture.

Source: receipt-store-v2.md:3-4; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    Replay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.
    An expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.

## Statement 8 (documented)

Do not represent a submission at or after replay expiry as deduplicated; an expired key does not prevent creation of another report.

Source: service-contract.md:4-6; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.
    When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.
    An unsupported or expired key does not prevent a repeated submission from creating another report.

## Statement 9 (documented)

The evidence does not define how long accepted-report records remain queryable after replay protection expires.

Source: receipt-store-v2.md:2-4; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    The replay cache and accepted-report index have different lifetimes in this local fixture.
    Replay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.
    An expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.

## Statement 10 (inferred)

A not_found or indeterminate lookup does not establish whether creation occurred across possible implementations; this contract explicitly states only that indeterminate confirms neither outcome.

Source: service-contract.md:8-10; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.
    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.
    Report IDs returned by completed responses identify actual created reports. An indeterminate response does not confirm creation or noncreation.

## Statement 11 (documented)

The evidence does not establish a safe replay procedure once protection has expired; another submission may create a report.

Source: service-contract.md:4-6; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.
    When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.
    An unsupported or expired key does not prevent a repeated submission from creating another report.

Source: receipt-store-v2.md:4-4; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    An expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.

## Statement 12 (documented)

Virtual ticks do not establish production latency, retry intervals, or wall-clock retention thresholds.

Source: case.md:6-6; file SHA-256 a3b5d9f379b54e552325fc7222d0a6e01c0e16323905e345863d3988118ca248

    events.jsonl contains actual fixture events. Its at field is virtual time, not wall-clock latency.

Source: service-contract.md:1-1; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    # Report service contract (local fixture, virtual time)

## Statement 13 (documented)

The cases are synthetic local software evidence, not production incidents.

Source: case.md:2-2; file SHA-256 a3b5d9f379b54e552325fc7222d0a6e01c0e16323905e345863d3988118ca248

    Evidence class: self-authored local simulation, not a production incident.

Source: receipt-store-v2.md:7-7; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    This is independently written synthetic software evidence, not a production incident or a model trial.

## Statement 14 (inferred)

Before submission, assign and persist one operation identifier for the user’s single intended report, together with the exact payload. The caller must encode intent in the identifier because identical payloads can represent separate requested reports.

Source: service-contract.md:2-2; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Payload: title and period. submit(operation_id, payload); lookup(operation_id).

Source: service-contract.md:9-9; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.

## Statement 15 (documented)

Submit the payload with that identifier. If the response times out, classify the result as ambiguous and preserve the original identifier; a timeout does not disclose whether the server accepted the request.

Source: service-contract.md:7-7; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    A client timeout alone does not disclose whether the server accepted the request.

## Statement 16 (documented)

Use lookup with the original identifier before considering another write, including after replay protection has expired when historical lookup remains available. In receipt-store-v2, lookup after a 50-tick wait recovered the existing report without resubmission.

Source: receipt-store-v2.md:3-6; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    Replay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.
    An expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.
    In this execution, a client lost its submit response, waited 50 ticks, and recovered the existing report by lookup without submitting again.
    Result: completed, report identifier: report-001, actual report count: 1.

Source: receipt-store-events.jsonl:1-5; file SHA-256 c4ae2cdb209c68631aa3bd2b42d48ab89b2ccd57ddc06398ad5825f3aa65f828

    {"seq":1,"at":1,"kind":"submit_received","details":{"operationId":"receipt-store-v2","payload":{"title":"Release compatibility summary","period":"v2"}}}
    {"seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"receipt-store-v2","payload":{"title":"Release compatibility summary","period":"v2"},"createdAt":1}}
    {"seq":3,"at":1,"kind":"response_lost","details":{"operationId":"receipt-store-v2"}}
    {"seq":4,"at":51,"kind":"virtual_clock_advanced","details":{"ticks":50}}
    {"seq":5,"at":52,"kind":"lookup","details":{"operationId":"receipt-store-v2"}}

## Statement 17 (documented)

If lookup returns completed, accept its report identifier as the created result and stop creation retries; completed report identifiers identify actual created reports under this contract.

Source: service-contract.md:8-10; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.
    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.
    Report IDs returned by completed responses identify actual created reports. An indeterminate response does not confirm creation or noncreation.

## Statement 18 (documented)

Replay only while the contract still guarantees protection, using the original operation identifier and identical payload. A changed payload conflicts, and replay protection applies strictly before—not at or after—the expiry tick.

Source: service-contract.md:3-5; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Idempotency supported: true. Retention: 40 virtual ticks from the accepted creation.
    Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.
    When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.

## Statement 19 (observed)

When both lookup and replay results are available, verify that they identify the same report. In Attempt B, lookup recovered report-001 and the same-identifier replay returned report-001 without another report_created event.

Source: case.md:5-5; file SHA-256 a3b5d9f379b54e552325fc7222d0a6e01c0e16323905e345863d3988118ca248

    Attempt B: the original client response was timeout. The client queried case-original, receiving completed with report report-001. A later same-identifier replay returned report-001. Actual reports: 1.

Source: events.jsonl:6-11; file SHA-256 231b615b13a5ca188b756d1daf89681a2d74af41d8e10aad8fb3e87a6cbd5a35

    {"run":"attempt-b","seq":1,"at":1,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-b","seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":1}}
    {"run":"attempt-b","seq":3,"at":1,"kind":"response_lost","details":{"operationId":"case-original"}}
    {"run":"attempt-b","seq":4,"at":2,"kind":"lookup","details":{"operationId":"case-original"}}
    {"run":"attempt-b","seq":5,"at":3,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-b","seq":6,"at":3,"kind":"idempotent_replay","details":{"operationId":"case-original","reportId":"report-001"}}

## Statement 20 (documented)

If lookup returns indeterminate, retain the ambiguous state and make a service-specific recovery decision; do not claim creation or noncreation from that response.

Source: service-contract.md:8-10; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.
    The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.
    Report IDs returned by completed responses identify actual created reports. An indeterminate response does not confirm creation or noncreation.

## Statement 21 (inferred)

If replay protection has expired, continue any available historical lookup but do not assume a further submission will be deduplicated. If lookup does not resolve the outcome, record the unresolved original operation and require an explicit decision between possible duplication and possible omission before another write.

Source: service-contract.md:6-7; file SHA-256 d45c8efad2e94115a3d7eeb09d88737bebcf57c58391ba253818b192a26eba78

    An unsupported or expired key does not prevent a repeated submission from creating another report.
    A client timeout alone does not disclose whether the server accepted the request.

Source: receipt-store-v2.md:3-4; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    Replay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.
    An expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.

## Statement 22 (observed)

Validate the final outcome using completed report identifiers and actual creation records rather than submit attempts alone. Attempt A recorded two report_created events after a new-key retry; Attempt B recorded one creation followed by same-key replay; receipt-store-v2 reported one actual report after post-expiry lookup without resubmission.

Source: events.jsonl:1-11; file SHA-256 231b615b13a5ca188b756d1daf89681a2d74af41d8e10aad8fb3e87a6cbd5a35

    {"run":"attempt-a","seq":1,"at":1,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":1}}
    {"run":"attempt-a","seq":3,"at":1,"kind":"response_lost","details":{"operationId":"case-original"}}
    {"run":"attempt-a","seq":4,"at":2,"kind":"submit_received","details":{"operationId":"case-retry-new-key","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-a","seq":5,"at":2,"kind":"report_created","details":{"id":"report-002","operationId":"case-retry-new-key","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":2}}
    {"run":"attempt-b","seq":1,"at":1,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-b","seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"},"createdAt":1}}
    {"run":"attempt-b","seq":3,"at":1,"kind":"response_lost","details":{"operationId":"case-original"}}
    {"run":"attempt-b","seq":4,"at":2,"kind":"lookup","details":{"operationId":"case-original"}}
    {"run":"attempt-b","seq":5,"at":3,"kind":"submit_received","details":{"operationId":"case-original","payload":{"title":"Deployment summary","period":"2026-W40"}}}
    {"run":"attempt-b","seq":6,"at":3,"kind":"idempotent_replay","details":{"operationId":"case-original","reportId":"report-001"}}

Source: receipt-store-v2.md:5-6; file SHA-256 b1703e2b37c8186d7072cb0cc56273a708bdb0b2467dd795c6a3ddd73f68f2be

    In this execution, a client lost its submit response, waited 50 ticks, and recovered the existing report by lookup without submitting again.
    Result: completed, report identifier: report-001, actual report count: 1.

Source: receipt-store-events.jsonl:1-5; file SHA-256 c4ae2cdb209c68631aa3bd2b42d48ab89b2ccd57ddc06398ad5825f3aa65f828

    {"seq":1,"at":1,"kind":"submit_received","details":{"operationId":"receipt-store-v2","payload":{"title":"Release compatibility summary","period":"v2"}}}
    {"seq":2,"at":1,"kind":"report_created","details":{"id":"report-001","operationId":"receipt-store-v2","payload":{"title":"Release compatibility summary","period":"v2"},"createdAt":1}}
    {"seq":3,"at":1,"kind":"response_lost","details":{"operationId":"receipt-store-v2"}}
    {"seq":4,"at":51,"kind":"virtual_clock_advanced","details":{"ticks":50}}
    {"seq":5,"at":52,"kind":"lookup","details":{"operationId":"receipt-store-v2"}}
