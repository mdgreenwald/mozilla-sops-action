# Publishing the mozilla-sops-action

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

```bash
git add
git commit
git push
```