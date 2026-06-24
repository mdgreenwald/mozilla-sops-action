# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GitHub Action that installs the [`getsops/sops`](https://github.com/getsops/sops) binary on a runner and adds it to `PATH`. The action is published as a Node-based action (`runs.using: node24` in `action.yml`); the runtime entry point is `lib/index.js`, an `ncc`-produced single-file **ESM** bundle of `src/index.ts`.

The codebase was rewritten on top of [`Azure/setup-helm@5.0.0`](https://github.com/Azure/setup-helm). A local reference copy lives under `tmp/setup-helm-5.0.0/` (gitignored). When changing behavior, consult that tree first — most patterns (PATH injection, `toolCache.find`/`downloadTool`, `core.startGroup`, latest-version fallback) come from there. Note that upstream is CJS-based; this repo has migrated to ESM (`@actions/core@3` and `@actions/tool-cache@4` are ESM-only).

## Commands

```bash
npm ci                  # clean install (use this, not `npm install`, for reproducible builds)
npm test                # jest — all unit tests in src/*.test.ts
npm test -- -t 'name'   # run a single test by name pattern
npm run build           # ncc bundle src/index.ts -> lib/index.js (MUST be re-run after any src/ change)
npm run format          # prettier --write .
npm run format-check    # prettier --check .   (also enforced by pre-commit hook)
```

Local workflow smoke test (Linux only — `act` can't exercise macOS/Windows runners):

```bash
GH_TOKEN=$(gh auth token) mise exec -- act pull_request \
  -W .github/workflows/integration-tests.yml \
  --matrix os:ubuntu-latest \
  -P ubuntu-latest=catthehacker/ubuntu:act-latest \
  --secret GITHUB_TOKEN="$GH_TOKEN"
```

Note: the `gh api …/releases/latest` step in the integration workflow will fail under `act` because the `catthehacker` image lacks the `gh` CLI; this is an `act` limitation, not an action bug.

## Architecture

Three files do the real work:

- **`src/run.ts`** — all action logic. Reads `version` and `downloadBaseURL` inputs, resolves `latest` via `https://api.github.com/repos/getsops/sops/releases/latest`, downloads the platform-specific asset, caches it with `toolCache.cacheFile`, and injects it into `PATH`.
- **`src/index.ts`** — three-line wrapper that calls `run().catch(core.setFailed)`.
- **`lib/index.js`** — the ncc bundle. This file is **committed** because GitHub Actions executes it directly at runtime. Any change to `src/` requires a rebuild and a fresh commit of `lib/index.js` in the same PR.

### SOPS asset naming (non-obvious)

The `getSopsDownloadURL` function builds URLs against three different filename patterns:

- Linux: `sops-<version>.linux.<amd64|arm64>`
- macOS: `sops-<version>.darwin.<amd64|arm64>`
- Windows: `sops-<version>.<amd64|arm64>.exe` (note: **no** `windows` segment — the `.exe` extension carries that signal)

If you regenerate the URL builder from scratch, verify against the live asset list at <https://github.com/getsops/sops/releases/latest> first.

### Download flow vs. upstream setup-helm

SOPS ships raw binaries; Helm ships archives. The flow therefore diverges from `setup-helm`:

- **No** `extractTar` / `extractZip` step.
- **No** `walkSync` / `findSops` directory walk.
- `toolCache.cacheFile(downloadPath, 'sops' + ext, 'sops', version)` stores the binary under a deterministic filename, so the cached path is `path.join(cachedDir, 'sops' + ext)`.

Don't reintroduce extraction logic without first confirming SOPS has changed its release format.

### Release policy

This action publishes **immutable tags only**: `v2.0.0`, `v2.0.1`, … No floating `v2` tag is ever moved. The `release.yml` workflow triggers on `v[0-9]+.[0-9]+.[0-9]+` tag pushes and uses `gh release create --verify-tag` to enforce this. The README documents SHA pinning as the recommended consumption pattern.

See `RELEASE.md` for the full step-by-step release process (version bump, build, CHANGELOG, commit-signing caveat, tag, verify).

## Module system

The whole project is ESM. Concrete consequences:

- `package.json` has `"type": "module"`, which makes every `.js` file ESM. Jest config therefore lives at `jest.config.cjs` (CJS, because jest itself is CJS-friendly).
- Relative imports in `src/` use `.js` extensions, even when the source is `.ts` (NodeNext module resolution requirement: `import {run} from './run.js'`).
- Node built-ins use the `node:` prefix (`import * as fs from 'node:fs'`).
- Tests use `jest.unstable_mockModule` + dynamic `await import()` — not `jest.spyOn` against module objects. ESM bindings are immutable, so `spyOn` against an imported module fails with "Cannot redefine property". See `src/run.test.ts` for the pattern.
- `jest` is no longer a global under ESM; it's imported from `@jest/globals`.
- The test script uses `node --experimental-vm-modules` — still required as of Jest 30 and Node 24.
- ncc auto-emits an ESM bundle when `package.json` declares `"type": "module"`. It also writes a tiny `lib/package.json` to make that explicit.

## Things that bite

- **`tmp/` exclusions**: `tsconfig.json`, `jest.config.cjs`, `.prettierignore`, and `.gitignore` all exclude `tmp/`. If you add a new tool that walks the repo, exclude `tmp/` or `ncc` / `jest` / `prettier` will pick up the reference copy and fail or duplicate work.
- **`lib/index.js` drift**: a PR that edits `src/` but doesn't rebuild `lib/index.js` looks fine in CI but produces a no-op at runtime. The husky pre-commit hook runs tests + format-check but does **not** verify the bundle is up to date. Always run `npm run build` before committing src changes.
- **`node24` runtime**: `action.yml` targets `node24`. Older self-hosted runners may not have it. Don't downgrade without a strong reason.
- **`stableSopsVersion`** in `src/run.ts` is the offline fallback when the GitHub API is unreachable. Bump it when cutting a release if a substantially newer SOPS version is current.
- **Reverting to CJS**: don't pin `@actions/core` to 2.x or `@actions/tool-cache` to 3.x without also removing `"type": "module"`, reverting the tsconfig to `module: commonjs`, and adapting the tests back. Those are entangled.
