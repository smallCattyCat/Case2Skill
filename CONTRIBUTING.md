# Contributing

Small, reproducible cases are the most useful contributions. Show a solved problem, the evidence supporting the lesson, and a situation where that lesson should change or should not be reused.

## Local checks

Use Node.js 24.13 or newer:

```sh
npm ci --ignore-scripts
npm run validate
npm run release:check
npm run demo
```

Unit tests and the offline demo require no model account. `validate` runs tests plus strict TypeScript checking. Live model trials are opt-in and never run in pull-request CI.

## What to include in a pull request

Explain the user-visible change and add a focused regression test. Keep source snapshots, old candidates and failed runs intact during development. Do not add production service access, generated-code execution, telemetry or automatic skill installation as incidental changes.

Example cases must be independently authored or explicitly redistributable. Mark synthetic service logs, handwritten tests and saved model actions separately. Do not submit private conversations, copyrighted documents without permission, credentials or student records. Model-generated labels are not independent reference answers.

For evaluation changes, keep tools and task information equal between arms. Report pending tasks separately from completed tasks. A passing schema check or a changed decision is not a performance improvement. Real model output varies; a fair baseline is more useful than a selected failure.

## Useful first contributions

Improve a source-file loader test, add an independently checkable example, document a platform-specific setup issue, or review how a candidate's references support its instructions. For a new execution adapter, first discuss its boundaries and add tests that make unexpected native tool use observable.

Contributions are offered under the repository's MIT license. Be respectful, focus criticism on the work, and do not publish another person's private information.
