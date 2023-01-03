![build-test](https://github.com/mdgreenwald/mozilla-sops-action/workflows/build-test/badge.svg)

## Setup Sops ##
GitHub Action for installing [Mozilla/Sops](https://github.com/mozilla/sops)

#### Repurposed from [Azure/setup-helm](https://github.com/Azure/setup-helm) ####

Install a specific version of sops binary on the runner.
Acceptable values are latest or any semantic version string like v3.7.3 Use this action in workflow to define which version of sops will be used.

```yaml
- name: Sops Binary Installer
  uses: mdgreenwald/mozilla-sops-action@v1.4.1
  with:
    version: '<version>' # default is latest stable
  id: install
```

The cached sops binary path is prepended to the PATH environment variable as well as stored in the sops-path output variable. Refer to the action metadata file for details about all the inputs [here](https://github.com/mdgreenwald/mozilla-sops-action/blob/master/action.yml).
