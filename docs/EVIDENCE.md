# Evidence and evaluation scope

## What the bundled recording supports

The example was produced on 2026-10-12 using the local report simulator and Codex CLI 0.144.1 on Windows. Requests specified `gpt-5.6-sol` with low reasoning effort. The JSON receipts did not independently report the resolved effective model, so no alias-resolution claim is made.

The original skill performed one unnecessary lookup in a task whose supplied interface said lookup was unavailable. One model call revised its third procedure step. A new content hash and source references recorded that change.

Four development tasks were then run with each version. Both versions made appropriate decisions in 4/4 tasks, completed 3 reports and left 1 genuinely unresolved task pending. Each version used 8 model calls and 4 service calls. The original version did not repeat the unnecessary lookup in that recheck. This does **not** establish a causal or general performance improvement.

An explicit native project-skill check separately read back nonmetadata body text without putting it in the user prompt, then completed another local task. This supports explicit loading under that tested configuration, not arbitrary native-tool execution, other hosts or implicit discovery.

The preceding three-arm development comparison also found appropriate behavior for no-history, normal-skill and Case2Skill conditions on all three tasks. Do not promote the selected revision story as evidence of superiority over those baselines.

## Public projection

`examples/recorded-revision/recording.json` includes the selected action sequences, outcomes and source hashes. Full prompt envelopes, local paths, account metadata and thread identifiers were excluded. Parent/child skills and the synthetic source files remain unchanged. The replay command checks bundle/source consistency, reruns the recorded actions, and compares the resulting outcomes.

It does not regenerate the model outputs or authenticate the maintainer's private receipts. The source hashes identify original records but are not a substitute for public signatures or independent replication. The offline HTML page is a replay, never a live model demo.

## New boundary example

`examples/lookup-retention` adds independently authored receipt-store rules and actual deterministic logs. In that fixture, replay-cache expiry and historical-report lookup have different lifetimes. It is a developer example, not a discovered new distributed-systems principle.

A candidate can be refined from those files using the same public command as a user's own updated case. Its saved task check is a development smoke test, not an unseen benchmark or a superiority comparison. See that example's README and JSON record for the exact run.

## Reproduce

```sh
npm test
npm run demo
npm run controls
npm ci --ignore-scripts
npm run validate
```

Live runs require an existing model account and explicit selected-data approval. Preserve failures and compare arms using the same model, tools, current task information and budget. Independent acceptance tasks should be frozen separately; the seven scenarios in this repository are visible development material.

## Interface references

- [Agent Skills format](https://agentskills.io/specification)
- [Codex non-interactive execution](https://developers.openai.com/codex/noninteractive/)
- [Codex skills](https://developers.openai.com/codex/skills/)
- [GitHub Node.js workflow](https://github.com/actions/setup-node)

These document external interfaces, not Case2Skill performance. The installed CLI help and actual local execution were also checked during development.
