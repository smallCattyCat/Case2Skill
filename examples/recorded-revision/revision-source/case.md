# Case: client timeout while generating a deployment report
Evidence class: self-authored local simulation, not a production incident.
Two separate reset fixtures start with the same user request: generate one deployment summary.
Attempt A: the client received timeout for operation case-original, then retried under case-retry-new-key. The second response was completed. Actual reports after these calls: 2.
Attempt B: the original client response was timeout. The client queried case-original, receiving completed with report report-001. A later same-identifier replay returned report-001. Actual reports: 1.
events.jsonl contains actual fixture events. Its at field is virtual time, not wall-clock latency.
The service contract is included. This record does not establish behavior for other service versions or after the retention period.
