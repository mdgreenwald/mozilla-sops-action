# Changelog

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
