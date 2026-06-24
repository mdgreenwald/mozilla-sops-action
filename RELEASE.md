# Releasing `mozilla-sops-action`

This runs maybe once a quarter, which is long enough to forget the details.
Follow these steps in order.

## Prerequisites

- **Node 24 locally.** `package.json` declares `engines`/`devEngines` pinned to
  `^24.0.0` with `onFail: "error"`, so `npm ci`/`npm install` hard-fail on
  anything else. `mise.toml` pins Node to 24 for this repo — if your shell's
  ambient Node is older (check `node --version`), prefix every command below
  with `mise exec --`, e.g. `mise exec -- npm ci`.
- `gh` CLI authenticated (`gh auth status`).

## 1. Decide the version

Semver. If `action.yml` and `src/` are unchanged (pure CI/tooling/dependency
work), it's a patch release.

## 2. Build and verify locally

```bash
npm ci
npm test
npm run build         # regenerates lib/index.js — run this even if src/ didn't
                       # change; a bumped @vercel/ncc or other devDependency can
                       # still alter the bundle output
npm run format-check
```

## 3. Bump the version

- `package.json` — `"version"` field
- `package-lock.json` — run `npm install --package-lock-only` to sync it
  without touching `node_modules`
- `README.md` — the two `@vX.Y.Z` references (the usage example near the top,
  and the SHA-pin comment under "Pinning for security")

## 4. Update CHANGELOG.md

Add a `## vX.Y.Z` section above the previous entry, describing what changed.

**This is not optional.** `release.yml` extracts the exact `## vX.Y.Z` section
via `awk` and hard-fails the release if it finds nothing — write the entry
before tagging, not after.

## 5. Commit via a PR — don't push straight to `main`

A direct `git commit` + `git push origin main` produces an **unsigned /
"Unverified"** commit unless this machine has commit signing configured
(`commit.gpgsign true` + `user.signingkey`, with the public key registered on
GitHub under Settings → SSH and GPG keys → **Signing Keys**, a separate list
from auth keys). Check first:

```bash
git config --get commit.gpgsign
git config --get user.signingkey
```

If both are empty (as of this writing, they are), use a PR instead — every
other "Verified" commit in this repo's history got that way because GitHub
itself signs commits it creates server-side during a merge (committer shows
as `web-flow`), not because of anything local.

```bash
git checkout -b chore/release-vX.Y.Z
git add package.json package-lock.json README.md CHANGELOG.md lib/index.js
git commit -m "Release vX.Y.Z"
git push -u origin chore/release-vX.Y.Z
gh pr create --base main --title "Release vX.Y.Z" --body "Release prep for vX.Y.Z."
gh pr checks <PR#> --watch     # wait for the required status checks
gh pr merge <PR#> --squash --delete-branch
```

(If commit signing ever does get set up on this machine, committing and
pushing straight to `main` is fine too — skip the PR.)

## 6. Tag and push

```bash
git checkout main && git pull origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

This triggers `release.yml`, which verifies `lib/index.js` exists, extracts
the matching `CHANGELOG.md` section, and runs `gh release create --verify-tag`.

## 7. Verify

```bash
gh release view vX.Y.Z
gh api repos/mdgreenwald/mozilla-sops-action/commits/vX.Y.Z --jq '.commit.verification'
```

Confirm `verified: true`.

## 8. Check for stale dependencies

```bash
npm outdated
```

Dependabot handles most upgrades weekly; this is just a manual spot-check.

## If you tag the wrong commit

Tags are meant to be immutable once published — don't make a habit of this.
But if you catch a mistake within minutes (nobody's pulled it, the release
notes are wrong, the commit is unsigned, etc.), undo cleanly with:

```bash
gh release delete vX.Y.Z --cleanup-tag --yes   # deletes the GitHub release
                                                # and the remote tag together
git tag -d vX.Y.Z                              # if a local tag still exists
```

Then fix the underlying issue and redo step 6. Never force-push `main` to
remove a bad commit — branch protection here has `allow_force_pushes: false`,
and it'll just get rejected. Add a new commit on top instead.
