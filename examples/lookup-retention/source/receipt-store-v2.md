# Receipt-store extension, version 2
The replay cache and accepted-report index have different lifetimes in this local fixture.
Replay protection ends after 40 virtual ticks. Accepted report records remain queryable by operation identifier after that expiry.
An expired replay key is not a reason to skip an available historical lookup. It is a reason not to assume another write is deduplicated.
In this execution, a client lost its submit response, waited 50 ticks, and recovered the existing report by lookup without submitting again.
Result: completed, report identifier: report-001, actual report count: 1.
This is independently written synthetic software evidence, not a production incident or a model trial.
