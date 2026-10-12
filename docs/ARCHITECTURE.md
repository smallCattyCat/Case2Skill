# Architecture

The model proposes instructions and actions. Small deterministic modules retain their evidence and execute only the built-in simulated interface.

## Data flow

```text
declared source files
    -> immutable in-memory CasePack
    -> Codex structured output
    -> lesson + source-range checks
    -> candidate bundle + content hash
    -> controlled task run or explicit new evidence
    -> new candidate + parent/child diff
```

`case.ts` loads allowlisted text files and fingerprints their bytes. `lesson.ts` handles structured notes and skill rendering. `bundle.ts` verifies candidates and exports them without granting approval. `pipeline.ts` handles generation and equal-tool development comparisons. `refine.ts` accepts explicitly selected updated evidence for general local cases. `revision.ts` supports one replay-checked simulator feedback rule.

`report-service.ts` is an in-memory, resettable service with explicit virtual time. `tasks.ts` keeps controller truth outside model prompts and checks actual reports and observations. It separates safe unresolved tasks from completed reports. `replay.ts` re-executes saved actions from public records without contacting a model.

`codex.ts` uses literal argv and stdin, bounded output and runtime, read-only mode and disabled native model tools. The native-loading path copies only the chosen candidate into an isolated project skill directory and selects it by name. Its body-readback test is evidence of explicit loading, not an internal loader trace or implicit discovery benchmark.

## Three different assurances

1. A file/range/hash check establishes internal consistency.
2. Semantic review determines whether the evidence supports an instruction.
3. Task execution evaluates behavior in a stated environment.

None automatically implies the next. Rehashing locally edited files is not third-party authentication. A candidate remains a candidate even after successful development tests until the user reviews it.

## Release boundary

`scripts/release.ts` stages only an explicit set of source, tests, public examples and documentation. Local runs, raw prompts, exports, configuration and development history do not enter that directory. CI never calls a model or publishes packages.

The first release is source-only. `private: true` in package.json prevents accidental npm publication; it does not restrict use of the source under the MIT license. There are no runtime package dependencies.
