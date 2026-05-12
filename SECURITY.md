# Security

## Reporting a vulnerability

Please **do not** report security vulnerabilities through public GitHub issues.

Instead, open a [private security advisory](https://github.com/mdgreenwald/mozilla-sops-action/security/advisories/new) on this repository. Include enough detail to reproduce the issue:

- Affected version (tag or commit SHA)
- Step-by-step reproduction
- Impact assessment and any proof-of-concept

You should expect an acknowledgement within a few days.

## Scope

This repository ships the GitHub Action that downloads and caches the [`getsops/sops`](https://github.com/getsops/sops) binary. Vulnerabilities in `sops` itself should be reported upstream at <https://github.com/getsops/sops/security>.
