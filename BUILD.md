# Publishing the mozilla-sops-action

Consider `npm outdated` to check for newer dependencies.

## Build the Container

```bash
cd $HOME/mozilla-sops-action
```

```bash
docker build -t mozilla-sops-action:build .
```

## Run the Built Container

```bash
docker run -it --rm \
--volume $HOME/mozilla-sops-action:/usr/src/app \
mozilla-sops-action:build \
/bin/sh
```
## Create artifacts

```bash
npm install
```

```bash
npm run publish
```

## Publish the changes

Add and commit changes.
Push to remote.
Merge PR with changes into Master.

```
git tag v99
git push --tags
```

Create release on Release page.