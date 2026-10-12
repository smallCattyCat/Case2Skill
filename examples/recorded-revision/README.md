# A recorded case-to-skill revision

This directory is a privacy-filtered projection of actual model runs on an independently written local simulation. It is intended for inspection and offline replay.

`before/` and `after/` are the original candidate bundles. `source-case/` and `revision-source/` retain the exact sources referenced by those bundles. `recording.json` contains a selected earlier application, eight parent/child task records and a summary of the native body-loading check.

The revision changes one procedure step after an unnecessary query against a service documented as unavailable. Both versions behaved appropriately in all four subsequent development tasks. No performance advantage is claimed.

Full prompt envelopes, personal paths, thread IDs and authentication metadata were excluded. Source hashes identify the private original records, but do not independently authenticate them. `npm run demo` checks source/bundle consistency and replays the saved actions; it does not call a model or repeat the original inference.

The candidates are historical examples, not globally valid operational recipes. In particular, the later lookup-retention example demonstrates why a replay key's expiry should not automatically prevent historical lookup.
