# CLI reference

Run commands from the repository root with Node.js 24.13+. `node src/cli.ts --help` and `--version` work without Codex or installed dependencies.

## Offline commands

| Command | Inputs | Output |
|---|---|---|
| `demo` / `replay` | Bundled public recording | HTML and JSON with locally rechecked actions; zero model calls |
| `controls` | Six historical simulator scenarios | Fresh fixed-policy traces, not model evidence |
| `init --out DIR` | New destination | Editable case template, no invented execution log |
| `case --out DIR` | New destination | A source case produced by actually executing the local simulator |
| `compile CASE LESSON --out DIR` | Case pack and supplied lesson JSON | Candidate bundle, labelled user-supplied |
| `inspect BUNDLE` | Bundle directory | Checked file and source fingerprints |
| `diff BEFORE AFTER` | Two bundle directories | Structured changes |
| `export BUNDLE --candidate --out DIR` | Bundle and new destination | Review-only export; no installation |
| `feedback CASE PARENT APP_DIR` | Original case, parent bundle, complete saved application | Replay-checked feedback for the unavailable-lookup rule |
| `doctor` | Installed CLI | Capability check, not authentication or a model call |

All output-producing commands preserve existing files. Use a new `--out` directory to run again. Otherwise outputs normally go to a new `runs/` directory. `init`, `case`, `compile` and `export` require explicit destinations.

## Live commands

These require `--model-data-approved` and a compatible, authenticated Codex CLI:

```sh
node src/cli.ts learn CASE --out work/learn --model-data-approved
node src/cli.ts ordinary CASE --out work/ordinary --model-data-approved
node src/cli.ts refine UPDATED_CASE PARENT_BUNDLE --out work/refined --model-data-approved
node src/cli.ts verify BUNDLE ORDINARY_SKILL_FILE --out work/comparison --model-data-approved
node src/cli.ts try BUNDLE lookup-after-expiry --out work/task --model-data-approved
node src/cli.ts revise CASE PARENT_BUNDLE APP_DIR --out work/revision --model-data-approved
node src/cli.ts reverify PARENT_BUNDLE CHILD_BUNDLE --out work/recheck --model-data-approved
node src/cli.ts native-check BUNDLE --out work/native --model-data-approved
```

`probe` makes one harmless readiness request without case data. It does consume model usage, unlike `doctor`.

Optional live flags: `--model MODEL_ID`, `--timeout-ms N` (1000–300000, default 120000). `CASE2SKILL_MODEL` is a model-ID fallback. `CASE2SKILL_CODEX` can point to an existing absolute native executable or Codex Node entry, not a `.cmd`/`.bat` wrapper. Live progress goes to stderr; results are JSON on stdout. The adapter uses `low` reasoning effort in this initial version.

`learn`, `ordinary`, `refine` and `revise` allow at most one recorded repair for a local output-format/reference error. Authentication and provider failures are not automatically retried. Raw failed runs stay in the private run directory.

## Case-pack format

```json
{
  "schema_version": "case2skill.case.v0",
  "case_id": "my-solved-case",
  "files": [
    { "path": "case.md", "kind": "narrative" },
    { "path": "contract.md", "kind": "contract" },
    { "path": "events.jsonl", "kind": "runtime_log" }
  ]
}
```

Only declare files that actually exist. A case can have 1–8 UTF-8 `.md`, `.txt` or `.jsonl` files, at most 64 KiB per file and 192 KiB in total. Paths must stay inside the selected directory. Hidden files, duplicate entries, traversal and nonportable device paths are rejected.

Each condition/step in `lesson.json` contains `text`, `basis`, and `evidence` ranges with `file`, `start_line`, `end_line`. See the bundled lesson files for a complete valid JSON example. The compiler accepts empty condition arrays, but requires at least one procedure step.

For `refine`, retain the original case ID. Include the earlier files referenced by unchanged notes and add the new evidence. This is explicit evidence-led revision, not an automatically validated diagnosis of an arbitrary external incident.

## Built-in task IDs

`recover-committed`, `new-intent`, `uncertain-no-contract`, `retry-not-created`, `expired-key`, `missing-identifier`, `lookup-after-expiry`.

`verify` compares no history, a normal skill from the complete case, and Case2Skill on three development scenarios. `reverify` compares an identified parent and child on four scenarios. `try` runs one scenario. These commands are not generic evaluators for arbitrary projects.

Exit code 0 means the command finished, 1 means an input/infrastructure error, and 2 marks an unsuccessful single-task check or an incomplete evaluation. For multi-arm reports, read each row's behavior and task outcome: completing an experiment does not mean every agent action passed.

## Troubleshooting

**No Codex installed:** demo, replay, compile, inspect, export and tests still work. Install a compatible Codex CLI separately for live commands.

**Unsupported model:** omit the model flag to use the CLI default or select an account-supported ID. A display name is not necessarily an API/CLI identifier.

**Global config cannot be parsed:** this adapter uses the installed CLI's `--ignore-user-config`; it does not repair or overwrite the user's config. `doctor` checks whether the needed flags are available.

**Skill format rejected:** Case2Skill deliberately emits a narrow YAML subset: unindented `name` and single-line `description`, each once. JSON quoting supports descriptions with special characters. This is not a universal Agent Skills validator.
