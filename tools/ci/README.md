# Website CI (staged, waiting for the owner)

`site-tests.yml` is the GitHub Actions workflow for this repo: on every push and pull request it runs the site tests that need no
browser and no local services (`node tools/ci-tests.mjs`). No secrets, nothing built or deployed.

It lives here, not in `.github/workflows/`, because the GitHub login used on this Mac cannot add workflow files (GitHub refuses a
push that adds one unless the token has the `workflow` scope). To switch it on, once:

```
gh auth refresh -h github.com -s workflow        # the owner approves the extra scope in the browser
mkdir -p .github/workflows && git mv tools/ci/site-tests.yml .github/workflows/site-tests.yml
git commit -m "CI: site tests workflow" && git push
```

Then GitHub > dvolcore/futures-friends > Settings > Branches: require the check `site tests` on `main` (platform repo docs/ops/CI.md).
Locally the same run is `node tools/ci-tests.mjs` (`--list` shows which files run).
