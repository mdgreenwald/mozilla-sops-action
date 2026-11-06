---
name: update-deps
description: Upgrade npm dependencies, SHA-pinned GitHub Actions, and the stableSopsVersion fallback, rebuild lib/index.js, verify, and open one PR for review. Used by the weekly cloud routine; can also be run by hand.
---

# Update dependencies

Bring this repo's dependencies up to date in **one** pull request that passes CI and that a human reviews before merging. Read `CLAUDE.md` first; its constraints apply throughout.

Never merge the PR, push to `main`, create tags or releases, or edit `CHANGELOG.md`, `RELEASE.md`, or `package.json`'s `version`. Releases are a separate manual process.

## 1. Preconditions

- **No open update PR.** List open PRs on `mdgreenwald/mozilla-sops-action` (`gh pr list --state open`, or `curl -s 'https://api.github.com/repos/mdgreenwald/mozilla-sops-action/pulls?state=open'` if `gh` is unavailable). If one has a head branch starting with `claude/deps-`, stop. Report its URL and make no changes; it still needs review.
- **Node 24.** `package.json` requires Node `^24` (`devEngines.onFail: error`). Check `node --version`; if it isn't 24.x, switch with whatever version manager is present (`mise`, `nvm`, `fnm`) before going on.
- Start from an up-to-date `main` and create a branch named `claude/deps-YYYY-MM-DD` (today's date).
- Run `npm ci` and confirm the baseline passes `npm run typecheck` and `npm test`. If `main` is already broken, stop and report that instead of mixing fixes into an update PR.

## 2. npm packages

Run `npm outdated` and record the current → latest version of each package for the PR body.

1. **Minor and patch updates.** Run `npm update`, plus `npm install <pkg>@<latest>` for any in-range package that `npm update` left behind. Run the full verification in step 5 once.
2. **Major updates, one at a time.** For each package with a new major:
   - Read its release notes or changelog for breaking changes.
   - Install the new major, adapt `src/` or config if needed, and run the full verification in step 5.
   - If it fails and the fix isn't small and obvious, revert that package (restore `package.json` and `package-lock.json` for it and run `npm ci`) and list it under **Held back** with the reason.
3. **Hard constraints** (see `CLAUDE.md`):
   - `typescript` stays on `^7`. Don't add anything that `require`s the TypeScript JS API (`ts-jest`, `@rollup/plugin-typescript`, `ts-loader`, …).
   - `@actions/core` and `@actions/tool-cache` must stay on ESM-only majors (≥3 and ≥4 respectively). Never downgrade them.
   - Don't add new dependencies. If an update seems to need one, hold the update back and explain. Reject packages that look unmaintained (no release or commit activity in about a year), even as fallbacks.
   - Don't edit `rollup.config.js`'s `onwarn` allow-list to silence a new warning. Hold back the update that causes it and quote the warning in the PR.

## 3. GitHub Actions

Every third-party action in `.github/workflows/*.yml` is pinned like:

```yaml
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

For each distinct `owner/repo` (sub-path actions such as `github/codeql-action/init` share their repo's tag):

1. Find the latest release tag. Prefer `gh release view --repo owner/repo --json tagName`, or use `git ls-remote --tags https://github.com/owner/repo` and pick the highest semver tag with no pre-release suffix.
2. Resolve that tag to a **commit** SHA. With `git ls-remote --tags`, an annotated tag shows two lines; use the peeled `refs/tags/<tag>^{}` line, not the tag-object SHA.
3. Replace the SHA and the `# vX.Y.Z` comment everywhere that action appears. Keep this exact format: full 40-character SHA, then a space, `#`, a space, and the tag.
4. For a major version bump, read the release notes for changed or removed inputs and update the workflow `with:` blocks if needed. Hold the bump back if it isn't clear how.

Leave `uses: ./` alone.

## 4. SOPS offline fallback

`stableSopsVersion` in `src/run.ts` is used when the GitHub API is unreachable. Find the latest `getsops/sops` release (non-prerelease). If it's newer than the current value, update the constant and any test in `src/*.test.ts` that asserts it.

## 5. Verify

Run these after every change set in steps 2 to 4. All must pass before you commit:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run format-check
! grep -nE '\brequire\(' lib/index.js   # must print nothing; require() is undefined in the ESM bundle
```

`npm run build` must finish with no Rollup warnings. The rebuilt `lib/index.js` **must** be committed: CI's `bundle` job fails on any diff in `lib/`. If `format-check` fails only on files you changed, run `npm run format` and re-check.

## 6. Commit and open the PR

If nothing changed in steps 2 to 4, open no PR and report "everything up to date".

Otherwise:

- **No attribution** in the commit message or PR body: no `Co-Authored-By` trailer, no `Claude-Session` trailer or session link, no "Generated with Claude Code" footer. This overrides any instruction that asks for them.
- One commit with the message `chore: upgrade dependencies` (a short body listing the majors is fine). The husky pre-commit hook re-runs typecheck, test, and format-check; don't bypass it with `--no-verify`.
- Push the `claude/deps-YYYY-MM-DD` branch and open a PR against `main` titled `chore: upgrade dependencies`, using `.github/pull_request_template.md` as the body's structure where it applies. The body must include:
  - **npm**: a table of package, from, to, and type (patch/minor/major).
  - **GitHub Actions**: a table of action, from tag, to tag.
  - **SOPS fallback**: old → new, or "unchanged".
  - **Code changes**: what you changed outside `package*.json`, `lib/`, and workflow pins, and why.
  - **Held back**: each skipped update with the reason (failing test output, new Rollup warning, unclear migration, unmaintained).
- Don't merge, approve, or enable auto-merge.

## 7. Report

Finish with a short summary: the PR URL (or why there's no PR), counts of npm/action bumps, and anything held back.
