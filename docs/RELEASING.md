# Preparing a source release

This repository is a source-only release. No package publication, model run or Git push is automated.

```sh
npm ci --ignore-scripts
npm run validate
npm run release:check
npm run demo
npm run release:stage -- --out releases/case2skill-0.1.0
```

The staging command uses an explicit allowlist, checks file types and relative paths, scans for likely credentials and personal absolute paths, validates local Markdown links and writes `RELEASE-MANIFEST.json`. It rejects existing destinations. This is a bounded check, not a comprehensive security audit.

Open the staged directory and verify that `README.md`, `LICENSE`, `package.json`, `src/`, `tests/`, `examples/` and `.github/` are at its root. Do not upload the development workspace, `runs/`, `exports/`, or an earlier private handoff archive. Include hidden `.github`, `.gitignore`, `.gitattributes`, `.editorconfig` and `.node-version` files.

## Before announcing

Create the GitHub repository from the staged contents. The recommended repository name is `case2skill`. A suitable description is:

> Turn solved cases into source-linked agent skills. Replay, inspect and improve them.

Suggested topics: `agent-skills`, `codex`, `typescript`, `llm`, `developer-tools`, `reproducibility`.

Keep the included MIT license, enable private vulnerability reporting, and let the first CI run finish before displaying a passing build badge. The workflow contains Windows, Linux and macOS jobs; writing a matrix is not evidence that all hosted jobs have already passed. Native live-adapter results should remain scoped to the environments actually tested.

Use the real offline page or the README screenshot for the announcement. Describe recorded playback as playback. The supported value proposition is an inspectable skill/revision workflow, not a proven universal increase in model performance. Additional examples and platform reports are useful first requests for contributions.

After updating source or public examples, run the checks and create a fresh staging directory. Preserve the old development records separately. `private: true` intentionally prevents npm publication; publishing the source on GitHub does not require changing it.
