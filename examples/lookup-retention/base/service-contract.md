# Report service contract (local fixture, virtual time)
Payload: title and period. submit(operation_id, payload); lookup(operation_id).
Idempotency supported: true. Retention: 40 virtual ticks from the accepted creation.
Each public submit/lookup advances one tick. Replay is protected strictly before the expiry tick, not at or after it.
When supported and still retained, the same identifier and identical payload return the same report; a changed payload returns conflict.
An unsupported or expired key does not prevent a repeated submission from creating another report.
A client timeout alone does not disclose whether the server accepted the request.
Lookup: available. Available lookup returns completed, not_found, or indeterminate. Unavailable lookup returns indeterminate.
The service does not know business intent. Identical payloads can be two separately requested reports. The caller supplies operation identifiers.
Report IDs returned by completed responses identify actual created reports. An indeterminate response does not confirm creation or noncreation.
