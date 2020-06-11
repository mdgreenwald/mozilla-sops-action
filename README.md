## Setup Sops ##
GitHub Action for installing Sops

#### Re-purposed from [Azure/setup-sops](https://github.com/Azure/setup-sops) ####

Install a specific version of sops binary on the runner.
Acceptable values are latest or any semantic version string like v2.16.7 Use this action in workflow to define which version of sops will be used.

- uses: mdgreenwald/setup-sops@v1
  with:
    version: '<version>' # default is latest stable
  id: install
The cached sops binary path is prepended to the PATH environment variable as well as stored in the sops-path output variable. Refer to the action metadata file for details about all the inputs https://github.com/mdgreenwald/mozilla-sops-action/blob/master/action.yml
