# Case2Skill contributor instructions

Use Node.js 24.13+ native TypeScript execution and node:test. Runtime dependencies stay at zero. Run npm test and, after npm ci --ignore-scripts, npm run validate and npm run release:check.

Scope changes to this repository. Do not import private case data, edit global model configuration, install global skills, deploy services or publish repositories without a separate explicit request. All built-in service operations are in-memory simulations with explicit virtual time.

Keep fixed-policy controls, handwritten test fixtures, recorded playback, real model generation and real model evaluation separately labelled. Runtime logs must come from actual execution. A pending task is not a completed report; a valid reference or hash is not semantic proof.

Do not pass the scorer, hidden service state or expected answers to a model. The execution adapter uses a narrow allowlisted observation transcript and does not execute generated shell or scripts. Comparison arms receive identical tools and current task information. Explicit native skill loading and prompt-text injection are separate checks.

Candidates require user review before installation. Preserve old candidates and development records; substantive revisions have new hashes and no inherited validation. Public examples must be self-authored or redistributable and contain no personal paths, credentials or private conversations. Use scripts/release.ts for source-only staging; never upload a development run directory.

Keep documentation consistent with the tested interfaces and supported scope. Report checks actually run and distinguish local validation from pending hosted CI or untested platforms.
