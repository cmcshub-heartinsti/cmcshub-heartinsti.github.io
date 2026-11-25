# CMCS-Hub

Static website for the **China Multi-Provincial Cohort Study (CMCS)** — cohort overview,
news, research lines, publications and data-access requests.

Live site: <https://cmcshub-heartinsti.github.io/>

## Layout

```
CMCS-Hub/                     Hugo site (source of truth)
  config.toml                 baseURL, menus, Formspree/request settings
  content/                    pages: home, news, research, publications, data, data-request
  data/publications.yaml      publication list (edit this to add a paper)
  themes/cmcs-hub/            layouts, CSS and JS
  static/                     extra files copied verbatim (robots.txt)
scripts/                      00 fetch Hugo, 01 setup, 02/03/04 local build & preview, 05 pack, 06 public tunnel, 07 deploy, 08 new post
docs/archive/                 superseded documents (historical only)
hugo-bin/                     local Hugo binary — NOT tracked (run scripts/00-get-hugo.sh)
releases/                     offline packages — NOT tracked
```

## Local build

```bash
bash scripts/00-get-hugo.sh          # fetch Hugo 0.162.1 extended (skipped if present)
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir
bash scripts/04-serve-static.sh      # preview CMCS-Hub/public/ on a local port
```

`scripts/01-setup.sh` … `03-build.sh` additionally require conda + R (blogdown) and are only
needed for the offline-package workflow; plain edits only need `hugo`.

## Publishing

Push to `main` — GitHub Actions builds the site and deploys it to GitHub Pages
(`.github/workflows/deploy-pages.yml`). Never commit `CMCS-Hub/public/` or `hugo-bin/`.
See [CMCS-Hub-Deploy-GitHub-Pages.md](CMCS-Hub-Deploy-GitHub-Pages.md).

## Docs

| File | Purpose |
|---|---|
| `CMCS-Hub-Deploy-GitHub-Pages.md` | Deployment to GitHub Pages (current) |
| `CMCS-Hub-OperationGuide-10Jun2026.md` | Day-to-day operation (serving, building, packing) |
| `CMCS-Hub-Offline-pkg-install-10Jun2026.md` | Offline package installation |
| `CMCS-Hub-Research-06Jun2026.md` | Research content notes |
| `docs/archive/` | Superseded documents |

## Credentials

Contact addresses are in `CMCS-Hub-Email.txt` at the project root. It is not part of this
repository and must never be committed.
