# CMCS-Hub: Operations Guide

**Version**: June 10, 2026 (updated November 2026: GitHub Pages deployment)

---

## 0. Publishing (GitHub Pages)

The production site is published by GitHub Actions to
**<https://cmcshub-heartinsti.github.io/>**; `baseURL` in `CMCS-Hub/config.toml` must match it.

```bash
git add -A && git commit -m "Update content" && git push   # 30–90 s later the site is rebuilt and deployed
```

Full procedure, first-time setup and troubleshooting: `CMCS-Hub-Deploy-GitHub-Pages.md`.
`CMCS-Hub/public/` and `hugo-bin/` are git-ignored — never commit them.
The Cloudflare tunnel described in section 4 is a **temporary demo channel**, not the public entry point.

---

## 1. Website Structure

CMCS-Hub is a static research group website built with **Hugo** (R + blogdown). The website has 5 modules.

### 1.1 Navigation

| # | Module | URL | Content |
|---|--------|-----|---------|
| 1 | **Home** | `/` | Hero banner + 2 research area cards + latest news preview |
| 2 | **News/Events** | `/news/` | Chronological listing of lab news and events |
| 3 | **Research** | `/research/` | CVD Risk Factors + CMCS-xOmics Project |
| 4 | **Publications** | `/publications/` | Papers with DOI, PubMed, GitHub, Data Request badges |
| 5 | **Data** | `/data/` | Data Request Form card + Contact Information card |

### 1.2 Source File Layout

```
cmcs-hub-package/
├── CMCS-Hub/                                  # Hugo project root
│   ├── config.toml                            # Site configuration
│   ├── content/                               # Page content (Markdown)
│   │   ├── _index.md                          # Homepage
│   │   ├── news/                              # News listing + posts
│   │   ├── research/_index.md                 # Research overview
│   │   ├── publications/_index.md             # Publications page
│   │   ├── data/_index.md                     # Data Request + Contact
│   │   └── data-request/_index.md             # Standalone Data Request page
│   ├── data/publications.yaml                 # Publications database
│   └── themes/cmcs-hub/                       # Custom Hugo theme
│       ├── layouts/                           # HTML templates
│       └── static/                            # CSS, JS, static assets
├── hugo-bin/0.162.1/hugo                              # Hugo v0.162.1 binary (92MB)
├── scripts/                                   # Operational scripts (see below)
├── environment.yml                            # Conda environment specification
└── releases/                                  # Offline deployment packages
```

### 1.3 Operational Scripts

| Script | Purpose |
|--------|---------|
| `00-get-hugo.sh` | Download the pinned Hugo 0.162.1 extended binary into `hugo-bin/` (git-ignored) |
| `01-setup.sh` | Online conda environment installation |
| `01-setup-offline.sh` | Offline conda environment installation |
| `02-serve.sh` | Development server with hot-reload (requires conda) |
| `03-build.sh` | Production build via R + blogdown (requires conda) |
| `04-serve-static.sh` | Serve the built static site (Python, zero deps) |
| `05-pack-offline.sh` | Create offline migration tarball |
| `06-start-public.sh` | Build + serve + expose via Cloudflare Tunnel |
| `07-deploy.sh` | Build + test + optionally restart production services |
| `08-new-news.sh` | Scaffold a new news/events post from a template |

### 1.4 Key Configuration

`CMCS-Hub/config.toml`:

```toml
baseURL = "https://cmcshub-heartinsti.github.io/"  # Set to your deployment URL
title = "CMCS-Hub"                                # Site title
requestEmail = "cmcshub2026@163.com"              # Data Request form recipient
```

### 1.5 Content vs. Theme Files

| File | Purpose | Edit Frequency |
|------|---------|----------------|
| `content/_index.md` | Homepage hero text | Rarely |
| `content/news/*.md` | News/Events posts | Often |
| `content/research/_index.md` | Research page content | Occasionally |
| `content/data/_index.md` | Contact information | Rarely |
| `data/publications.yaml` | Publications database | Often |
| `themes/cmcs-hub/layouts/partials/research-grid.html` | Homepage research cards | Rarely |
| `themes/cmcs-hub/static/css/style.css` | Theme styling | Rarely |

---

## 2. Conda Environment Offline Deployment

The `cmcs-hub` conda environment bundles R 4.5.3, blogdown 1.23, Hugo v0.162.1, and all dependencies for offline migration to another Linux x86_64 machine.

### 2.1 Environment Specification (`environment.yml`)

```yaml
name: cmcs-hub
channels:
  - conda-forge
  - defaults
dependencies:
  - r-base=4.5.3
  - r-blogdown=1.23
  - r-bookdown
  - r-htmltools
  - r-httpuv
  - r-jsonlite
  - r-knitr
  - r-later
  - r-rmarkdown
  - r-servr
  - r-xfun
  - r-yaml
  - r-readr
  - r-dplyr
```

All R packages sourced from conda-forge for deterministic dependency resolution.

### 2.2 Verified Package Versions

```
r-base        4.5.3       r-jsonlite    2.0.0
r-blogdown    1.23        r-knitr       1.51
r-bookdown    0.46        r-later       1.4.8
r-dplyr       1.2.1       r-readr       2.2.0
r-htmltools   0.5.9       r-rmarkdown   2.31
r-httpuv      1.6.17      r-servr       0.32
r-xfun        0.57        r-yaml        2.3.12
Hugo          v0.162.1 extended (92MB ELF binary, Linux x86_64)
```

### 2.3 Online Setup

```bash
cd /path/to/cmcs-hub-package

# Create the environment from specification
conda env create -f environment.yml

# Activate and verify
conda activate cmcs-hub
R -e 'packageVersion("blogdown")'   # 1.23
./hugo-bin/0.162.1/hugo version              # v0.162.1
```

### 2.4 Create Offline Package

```bash
cd /path/to/cmcs-hub-package

# Run the packaging script (installs conda-pack if needed)
bash scripts/05-pack-offline.sh
```

Output: `releases/cmcs-hub-offline-v108.tar.gz` (~497 MB)

**Package contents:**
- `cmcs-hub-env.tar.gz` — packed conda environment (R + all packages)
- `CMCS-Hub/` — complete website source code
- `hugo-bin/0.162.1/hugo` — Hugo v0.162.1 binary
- `scripts/` — all 8 operational scripts
- `environment.yml` — environment specification

### 2.5 Offline Installation (Target Machine)

**Prerequisites:** Linux x86_64, conda/miniconda installed, Python 3.

```bash
# Step 1: Extract the archive
cd /tmp
tar -xzf cmcs-hub-offline-v108.tar.gz
cd cmcs-hub-package

# Step 2: Install the conda environment
mkdir -p $(conda info --base)/envs/cmcs-hub
tar -xzf cmcs-hub-env.tar.gz -C $(conda info --base)/envs/cmcs-hub
source $(conda info --base)/envs/cmcs-hub/bin/activate
conda-unpack

# Step 3: Verify
conda activate cmcs-hub
R -e 'cat("blogdown:", as.character(packageVersion("blogdown")), "\n")'
./hugo-bin/0.162.1/hugo version
```

### 2.6 First Build on Target Machine

```bash
cd /path/to/cmcs-hub-package

# Option A: Hugo directly (no R needed)
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir

# Option B: Via R + blogdown
source $(conda info --base)/etc/profile.d/conda.sh
conda activate cmcs-hub
cd CMCS-Hub
R -e 'options(blogdown.hugo.dir = "../hugo-bin"); blogdown::build_site(build_rmd = FALSE)'
```

### 2.7 Verification Checklist

```
[ ] conda activate cmcs-hub
[ ] R --version                                    → R 4.5.3
[ ] R -e 'packageVersion("blogdown")'             → 1.23
[ ] ./hugo-bin/0.162.1/hugo version                        → v0.162.1
[ ] ./hugo-bin/0.162.1/hugo --source CMCS-Hub              → 0 errors
[ ] find CMCS-Hub/public -name "index.html"        → 7+ pages
```

### 2.8 Limitations

| Constraint | Detail |
|------------|--------|
| OS | Linux x86_64 only (conda-pack) |
| conda | Target must have conda/miniconda |
| Size | ~497 MB compressed |
| Cross-OS | Use `environment.yml` method (re-resolves on target OS) |

---

## 3. Daily Website Updates

### 3.1 Adding a News/Events Post

**Method A: Use the scaffolding script (recommended)**

```bash
cd /path/to/cmcs-hub-package

# News post (defaults to today's date)
bash scripts/08-new-news.sh "Your News Title"

# Event post with specific date
bash scripts/08-new-news.sh "Upcoming Conference" 2026-07-15 event
```

This creates `CMCS-Hub/content/news/YYYY-MM-DD-slug.md` with the front matter pre-filled. The file contents:

```markdown
---
title: "Your News Title"
date: 2026-07-15
author: "CMCS-Hub Team"
tags: ["news"]
---

```

**After creating the file**, edit it to add content (Markdown), then rebuild:

```bash
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir
```

The post auto-appears on the news listing (newest-first) and homepage preview.

### 3.2 Adding a Publication

Edit `CMCS-Hub/data/publications.yaml` — append a new entry:

```yaml
- title: "Paper Title"
  authors: "Author A, Author B, Author C"
  journal: "Journal Name"
  year: 2026
  doi_url: "https://doi.org/10.xxxx/xxxx"
  pubmed_url: "https://pubmed.ncbi.nlm.nih.gov/XXXXXXXX/"
  github_url: ""
  request_form: true
```

| Field | Required | Badge Shown |
|-------|----------|-------------|
| `title` | Yes | — |
| `authors` | Yes | — |
| `journal` | Yes | — |
| `year` | Yes | — (used for grouping) |
| `doi_url` | No | DOI (blue) |
| `pubmed_url` | No | PubMed (teal) |
| `github_url` | No | GitHub (dark) |
| `request_form` | No | Data Request (purple) if `true` |

Empty `""` hides the badge. Publications are auto-grouped by year.

### 3.3 Editing Research Content

- **Research page text**: Edit `CMCS-Hub/content/research/_index.md` (standard Markdown)
- **Homepage research cards**: Edit `CMCS-Hub/themes/cmcs-hub/layouts/partials/research-grid.html`
- **Homepage hero text**: Edit `CMCS-Hub/content/_index.md` (front matter `hero_title` + body)

### 3.4 Editing Contact Information

Edit `CMCS-Hub/content/data/_index.md` to update the address and email displayed in the Contact Information card.

### 3.5 Rebuild After Any Edit

```bash
cd /path/to/cmcs-hub-package

# Build
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir

# Preview locally (auto-detects available port)
python3 -m http.server 8080 --directory CMCS-Hub/public --bind 0.0.0.0
# Open: http://localhost:8080

# If port 8080 is in use, use another port:
python3 -m http.server 9000 --directory CMCS-Hub/public --bind 0.0.0.0
```

---

## 4. Local Deployment with Cloudflare Tunnel (temporary / offline demo)

> **Not the public entry point.** The public site is served by GitHub Pages (section 0).
> Use the tunnel only for an on-site demo or an offline machine: the quick-tunnel URL
> changes on every start and Cloudflare rate-limits it (HTTP 429 / error 1015).

Cloudflare Tunnel provides free HTTPS access to a locally hosted CMCS-Hub site. No router configuration, public IP, or port forwarding needed.

### 4.1 Architecture

```
Internet User → Cloudflare Edge → cloudflared-linux-amd64 tunnel → Your Server :8080
                              (outbound only)                     (CMCS-Hub)
```

### 4.2 Cloudflare Tunnel Binary (Pre-Bundled)

The Cloudflare Tunnel binary is included in the offline package at `hugo-bin/cloudflared-linux-amd64` (v2026.6.0, 38MB). No download or installation required.

To install it system-wide (optional, for persistent tunnel commands):

```bash
sudo cp hugo-bin/cloudflared-linux-amd64 /usr/local/bin/
/usr/local/bin/cloudflared-linux-amd64 --version
```

### 4.3 Quick Tunnel (No Domain — 30 Seconds)

Cloudflared prints the public URL directly. No log parsing needed — just run the tunnel in the foreground.

```bash
cd /path/to/cmcs-hub-package

# 1. Build the site
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir

# 2. Find an available port and start the server
PORT=8080
while ! python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1',$PORT)); s.close()" 2>/dev/null; do
    echo "Port $PORT in use, trying $((PORT + 1))..."
    PORT=$((PORT + 1))
done
python3 -m http.server $PORT --directory CMCS-Hub/public --bind 127.0.0.1 &
SERVER_PID=$!
sleep 2
echo "Server running on port $PORT (PID: $SERVER_PID)"

# 3. Start tunnel — cloudflared prints the URL box directly to the terminal
echo ""
echo "Starting Cloudflare Tunnel..."
echo ""

./hugo-bin/cloudflared-linux-amd64 tunnel --url http://localhost:$PORT --protocol http2 --no-autoupdate

# Press Ctrl+C to stop both the tunnel and the server
kill $SERVER_PID 2>/dev/null
```

Cloudflared output shows the public URL in a box:

```
+------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:           |
|  https://xxx-xxx-xxx.trycloudflare.com                     |
+------------------------------------------------------------+
```

Share this URL for public access. `Ctrl+C` stops everything.

### 4.4 Persistent Tunnel with Custom Domain

**Step 1: Authenticate**
```bash
./hugo-bin/cloudflared-linux-amd64 tunnel login
```
A browser opens — select your domain and authorize. (Headless: run on a machine with a browser, copy `~/.cloudflared/cert.pem` to the server.)

**Step 2: Create tunnel**
```bash
./hugo-bin/cloudflared-linux-amd64 tunnel create cmcs-hub
# Note the UUID from the output (e.g., 7a1b2c3d-...)
```

**Step 3: Configure** (`~/.cloudflared/config.yml`)
```yaml
tunnel: cmcs-hub
credentials-file: /home/USER/.cloudflared/<UUID>.json
ingress:
  - hostname: cmcs-hub.example.com
    service: http://localhost:8080
  - service: http_status:404
```

Replace `USER`, `<UUID>`, and `cmcs-hub.example.com` with your values.

**Step 4: DNS + Service**
```bash
./hugo-bin/cloudflared-linux-amd64 tunnel route dns cmcs-hub cmcs-hub.example.com
sudo ./hugo-bin/cloudflared-linux-amd64 --config ~/.cloudflared/config.yml service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### 4.6 Hugo Server as System Service

```bash
sudo tee /etc/systemd/system/cmcs-hub.service << 'EOF'
[Unit]
Description=CMCS-Hub Static Site Server
After=network.target
[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/cmcs-hub-package
ExecStartPre=/bin/sh -c 'PORT=8080; python3 -c "import socket; s=socket.socket(); s.bind((\"127.0.0.1\",PORT)); s.close()" 2>/dev/null || PORT=8081; echo "PORT=$PORT" > /tmp/cmcs-hub-port; exec /usr/bin/python3 -m http.server $PORT --directory CMCS-Hub/public --bind 127.0.0.1'
ExecStart=/usr/bin/python3 -m http.server 8080 --directory CMCS-Hub/public --bind 127.0.0.1
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cmcs-hub
sudo systemctl start cmcs-hub
```

Both services auto-start on boot: `cmcs-hub.service` serves the site, `cloudflared.service` tunnels it to the public internet.

#### 4.7 Redeploy After Content Updates

```bash
cd /path/to/cmcs-hub-package

# 1. Rebuild
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir

# 2. Restart the server (tunnel reconnects automatically)
sudo systemctl restart cmcs-hub

# 3. Verify
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://cmcs-hub.example.com/
```

#### 4.8 Commands Quick Reference

| Action | Command |
|--------|---------|
| Build site | `./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir` |
| Preview locally | `bash scripts/04-serve-static.sh` (auto port resolution) |
| Quick public tunnel | `bash scripts/06-start-public.sh` |
| Deploy to production | `sudo systemctl restart cmcs-hub` |
| View tunnel logs | `sudo journalctl -u cloudflared -f` |
| View server logs | `sudo journalctl -u cmcs-hub -f` |
| Public URL info | `cat CMCS-Hub-Internet-Accessible-Website.txt` |
| Fix stale tunnel error | `rm -rf ~/.cloudflared/` (clears cached credentials) |

### 4.9 Troubleshooting: "Unauthorized: Tunnel not found"

This error occurs when cloudflared picks up stale credentials from a previous named tunnel session.

**Symptom:**
```
ERR Connection terminated error="Unauthorized: Tunnel not found"
ERR Register tunnel error from server side error="Unauthorized: Tunnel not found"
```

**Fix:**
```bash
# Delete stale credentials
rm -rf ~/.cloudflared/

# Re-run the quick tunnel (now creates a fresh session)
bash scripts/06-start-public.sh
```

**Prevention:** The `06-start-public.sh` script automatically runs `rm -rf ~/.cloudflared/` before starting the tunnel, and uses `--no-autoupdate` to prevent cloudflared from reading cached configuration files. A fresh quick tunnel is created each time.

---

*Document updated: June 10, 2026*
