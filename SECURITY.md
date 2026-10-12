# Security policy

## Supported scope

0.1.x is an early local developer tool. It loads only explicitly selected case files, checks paths and bounded file sizes, and compiles text-only candidate skills. The built-in evaluator executes an allowlist of in-memory simulator actions; it does not execute generated shell commands, connect to production systems, or install global skills.

Live commands send selected case/task text through the installed Codex CLI after `--model-data-approved`. Offline demo, replay, compile and unit tests do not call a model. There is no telemetry in Case2Skill. Codex itself uses its existing authentication and may perform model-service requests and CLI-internal operations under its own terms.

## Important boundaries

Treat all cases and generated skills as untrusted text. Review instructions and evidence before installing them into another agent. Disabling model-native tools in the adapter is not a general-purpose sandbox for arbitrary repositories. Keep unrelated secrets out of the working environment. Credential-pattern checks are a limited first barrier, not comprehensive data-loss prevention.

`runs/`, `work/`, `exports/`, local model configuration and raw prompt envelopes must not be committed. Use the allowlisted release staging command rather than archiving a development workspace. Hashes and deterministic replay detect inconsistencies; they do not authenticate a third party who controls all the files.

## Reporting a vulnerability

Use this repository's **Security → Advisories → Report a vulnerability** when private reporting is enabled. Do not post credentials, private logs or exploit details in a public issue. If that channel is unavailable, open a minimal issue requesting a private contact route without including sensitive details.

Maintainers should enable private vulnerability reporting before the first public announcement. No response-time or audit certification is claimed.
