# Contributing

Thanks for considering a contribution.

## Development setup

```bash
npm ci
npm test
npm run build       # rebuild lib/index.js
npm run format
```

## Pull requests

- Open issues before large changes so the design can be discussed.
- Run `npm test` and `npm run format-check` before pushing.
- Rebuild `lib/index.js` (`npm run build`) and commit it — the bundle is what GitHub Actions executes.
- The Husky pre-commit hook runs `npm test` and `prettier --check` automatically; do not bypass it.

## Reporting bugs

Use [GitHub Issues](https://github.com/mdgreenwald/mozilla-sops-action/issues). Include the SOPS version you requested, the runner OS, and the action logs (with secrets redacted).
