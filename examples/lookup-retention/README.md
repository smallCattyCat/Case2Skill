# A project-specific boundary: lookup outlives replay protection

The receipt-store fixture retains accepted reports after its retry-deduplication cache expires. The case demonstrates why a skill should distinguish those two lifetimes rather than turning a replay deadline into a general ban on lookup.

`source/` contains the earlier case plus a versioned contract extension and actual simulator events. `base/` is the separately generated original source. No real service or private project data is used.

Generate a new candidate from the updated evidence:

```sh
node src/cli.ts refine examples/lookup-retention/source examples/recorded-revision/before --out work/retention-refinement --model-data-approved
node src/cli.ts try work/retention-refinement/candidate lookup-after-expiry --out work/retention-task --model-data-approved
```

The source events can be regenerated without a model:

```sh
node scripts/make-lookup-case.ts work/regenerated-lookup-case
```

`candidate/` and `task-record.json` are a selected saved model-generated example and its local task smoke check, when included in the release. They are not independent held-out evaluation or a comparison against another model. Review the instructions before using them beyond this fixture.
