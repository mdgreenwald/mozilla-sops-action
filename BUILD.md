# Publishing `mozilla-sops-action`

## 1. Build and verify locally

```bash
npm ci
npm test
npm run build      # produces lib/index.js (committed)
npm run format-check
```

`lib/index.js` is the file GitHub Actions executes at runtime, so it **must** be committed.

## 2. Update the changelog

Add a new entry to `CHANGELOG.md` describing what changed.

## 3. Commit, tag, and push

This action uses **immutable tags only**: each release gets its own `vX.Y.Z` tag and no floating `vX` tag is ever moved. Consumers pin to a full semver tag (or a commit SHA).

```bash
git add lib/index.js CHANGELOG.md <other changes>
git commit -m "Release v<x.y.z>"
git push origin main

git tag v<x.y.z>
git push origin v<x.y.z>
```

The `release.yml` workflow runs on the tag push and creates the GitHub release automatically (`gh release create --generate-notes`).

## 4. Check for stale dependencies

```bash
npm outdated
```

Open Dependabot will handle most upgrades on a weekly cadence.
