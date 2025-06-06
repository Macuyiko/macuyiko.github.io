#!/bin/bash
set -e

echo "REPO: $GITHUB_REPOSITORY"
echo "ACTOR: $GITHUB_ACTOR"

remote_repo="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
remote_branch=${GH_PAGES_BRANCH:=gh-pages}

echo 'Installing UV…'
wget -qO- https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env

echo 'Initializing UV environment…'
uv sync

echo 'Building site…'
uv run pelican ${PELICAN_CONTENT_FOLDER:=content} -o output -s ${PELICAN_CONFIG_FILE:=pelicanconf.py}

echo 'Publishing to GitHub Pages…'
pushd output
  git init
  git remote add deploy "$remote_repo"
  git checkout "$remote_branch" || git checkout --orphan "$remote_branch"
  git config user.name "${GITHUB_ACTOR}"
  git config user.email "${GITHUB_ACTOR}@users.noreply.github.com"

  # CNAME if requested
  if [[ -n "$GH_PAGES_CNAME" && "$GH_PAGES_CNAME" != "none" ]]; then
    echo "CNAME: $GH_PAGES_CNAME"
    echo "$GH_PAGES_CNAME" > CNAME
  fi

  git add .
  git commit -m "[ci skip] Deploy on $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  git push deploy "$remote_branch" --force
popd

echo 'Done!'
