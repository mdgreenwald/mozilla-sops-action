# Changelog

## v2.1.0

### Added

- New optional `token` input. When set, the `latest`-version lookup against the GitHub API sends `Authorization: Bearer <token>`, raising the rate limit from 60/hr (unauthenticated, per source IP) to 1000/hr. Typically `${{ secrets.GITHUB_TOKEN }}`. ([#244](https://github.com/mdgreenwald/mozilla-sops-action/pull/244))

### Security

- Forced `js-yaml` to `^4.2.0` via `npm overrides` to fix a quadratic-complexity DoS in merge-key (`<<`) handling ([GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) / CVE-2026-53550). `js-yaml@3.x` was present only as a dev-only transitive dependency (via `ts-jest` → `@jest/transform` → `babel-plugin-istanbul` → `@istanbuljs/load-nyc-config`); the production bundle was never affected. ([#243](https://github.com/mdgreenwald/mozilla-sops-action/pull/243))

### Internal

- Bumped the `stableSopsVersion` offline fallback to `v3.13.1`.

## v2.0.1

CI/tooling hardening release. No changes to `action.yml` or runtime behavior.

### Internal

- `package.json` now declares `engines`/`devEngines` pinning Node to `^24.0.0`, matching the `node24` action runtime.
- `unit-tests`, `integration-tests`, and `prettify-code` workflows now pin Node via `actions/setup-node@v6` with `node-version-file: package.json`, instead of relying on the runner's preinstalled Node.
- `unit-tests` and `prettify-code` workflows switched to `npm ci` (from `npm install` / ad-hoc `npx`) for reproducible, lockfile-driven installs; `prettify-code` now runs `npm run format-check`.
- `actions/checkout` bumped to `v6.0.3`; `github/codeql-action` bumped to `v4`.
- Release workflow now extracts release notes from `CHANGELOG.md` instead of auto-generating them from commits.
- Dependency bumps: `@types/node` to `^25.9.3`, `@vercel/ncc` to `^0.44.0`, `prettier` to `^3.8.4`, `ts-jest` to `^29.4.11`, and transitive `undici` to `6.27.0`.

## v2.0.0

Complete rewrite on top of [`Azure/setup-helm@v5.0.0`](https://github.com/Azure/setup-helm).

### Breaking changes

- Action runtime upgraded from `node20` to `node24`. Self-hosted runners must support Node 24.
- The bundled output moved from `dist/index.js` to `lib/index.js` and is now an **ESM** bundle (ncc emits ESM because `package.json` declares `"type": "module"`). Consumers pinning to a tag are unaffected; consumers pinning to a branch or SHA inside `dist/` must repin.
- Releases are now published as immutable tags only (`v2.0.0`, `v2.0.1`, …). The previous floating `v1` tag is **not** carried forward. Pin to a full semver tag or a commit SHA.

### Added

- Native arm64 binaries for all three OSes (Linux, macOS, Windows).
- New optional `downloadBaseURL` input for mirroring or air-gapped use.
- `latest` resolution now uses the GitHub releases API (no `semver` walk over all releases).
- `ts-jest` unit tests covering URL generation, latest-version resolution, and the cache/download flow.

### Removed

- `Dockerfile` (build runs locally via `npm ci && npm run build` — `ncc` produces the single-file bundle).
- `tslint.json` (TSLint is deprecated; Prettier handles formatting).
- Dependencies on `@octokit/action`, `@actions/exec`, `@actions/io`, `semver`, and `gts`.

### Internal

- TypeScript bumped to `^6.0.3` with `module/moduleResolution: NodeNext`, `target: es2022`, and explicit `types: ["node", "jest"]`.
- `@actions/core` bumped to `^3.0.1` and `@actions/tool-cache` to `^4.0.0` (both are ESM-only at these majors).
- Source files use the `node:` prefix for built-ins and `.js` extensions on relative imports (NodeNext requirement).
- Tests rewritten for ESM: `jest` is imported from `@jest/globals`; module mocking uses `jest.unstable_mockModule` with dynamic `await import()` (ESM bindings are immutable, so `jest.spyOn` against an imported module is not viable).
- Jest config renamed to `jest.config.cjs`; test script runs with `node --experimental-vm-modules` to enable ts-jest's ESM preset.
- Adds Prettier, Husky pre-commit hooks, Dependabot grouping for npm and GitHub Actions.
- Adds dedicated `unit-tests` and `integration-tests` workflows.
- CodeQL workflow refreshed to current GitHub action versions.
