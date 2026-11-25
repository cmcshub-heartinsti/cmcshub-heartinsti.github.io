> **已废弃**：部署流程见 `CMCS-Hub-Deploy-GitHub-Pages.md`（2026-11）。
> 本文保留作历史参考；其中 Strategy A 的手推 `public/` 做法、以及"仓库名 cmcs-hub + baseURL 根路径"的写法均已被取代。

# CMCS-Hub: Deploy to GitHub Pages

**Version**: June 10, 2026

---

## Overview

This guide provides detailed step-by-step instructions for deploying the CMCS-Hub website to GitHub Pages.

| Strategy | Setup | Update | Best For |
|----------|-------|--------|----------|
| **A: Manual push** | 5 min, 5 steps | `hugo` → `git push` | Quick, no automation needed |
| **B: GitHub Actions (CI/CD)** | 10 min, 6 steps | `git push` only | Team collaboration, auto-deploy |

---

## Strategy A: Manual Push — Detailed Steps

Strategy A deploys a pre-built `public/` directory directly to GitHub Pages. Every time you edit content, you run `hugo` locally and push the output.

### Prerequisites Checklist

- [ ] A GitHub account (create at https://github.com/join if needed)
- [ ] Git installed: `git --version` (install from https://git-scm.com if not found)
- [ ] CMCS-Hub source code with Hugo binary: `hugo-bin/hugo` exists and runs

---

### A.1 Create the GitHub Repository

**1.** Open your browser and go to https://github.com/new

**2.** Fill in the form:

| Field | Value | Note |
|-------|-------|------|
| Owner | Your GitHub username | e.g., `cmcs-hub` |
| Repository name | `<your-username>.github.io` | **Must** match your username exactly. Example: if username is `cmcs-hub`, use `cmcs-hub.github.io` |
| Description | `CMCS-Hub website` | Optional |
| Visibility | **Public** | Private repos require GitHub Pro for Pages |

**3.** Leave all checkboxes **unchecked**:
- ❌ "Add a README file"
- ❌ "Add .gitignore"
- ❌ "Choose a license"

**4.** Click the green **"Create repository"** button.

After creation, you will see a page titled *"Quick setup — if you've done this kind of thing before"* with a URL like:
```
https://github.com/YOUR_USERNAME/cmcs-hub.github.io.git
```
**Copy this URL** — you will need it in Step A.3.

---

### A.2 Build the Static Site

Open a terminal and navigate to the CMCS-Hub project:

```bash
cd /path/to/cmcs-hub-package/CMCS-Hub
```

1. **Verify Hugo is available:**

   ```bash
   ../hugo-bin/hugo version
   ```
   Expected output:
   ```
   hugo v0.162.1-... linux/amd64 ...
   ```

2. **Ensure `config.toml` has the correct `baseURL`:**

   ```bash
   grep baseURL config.toml
   ```
   Should show:
   ```toml
   baseURL = "https://YOUR_USERNAME.github.io/"
   ```
   If the URL is wrong, edit `config.toml` and fix it now before building.

3. **Build the site:**

   ```bash
   ../hugo-bin/hugo --cleanDestinationDir
   ```
   Expected output:
   ```
   Start building sites …
   ...
                     │ EN
   ──────────────────┼────
    Pages            │ 14
    Paginator pages  │  0
   ...
   Total in ~1000 ms
   ```

4. **Verify the built output:**

   ```bash
   ls public/
   ```
   You should see:
   ```
   css  datasets  index.html  index.xml  js  news  publications  research
   contact  data-request  sitemap.xml
   ```

**Important**: If the `public/` directory is missing or empty, Hugo encountered an error. Run `../hugo-bin/hugo` without `--cleanDestinationDir` to see full error messages.

---

### A.3 Deploy `public/` to GitHub

Now you will push the contents of `public/` to the GitHub repository created in Step A.1.

**1. Enter the `public/` directory:**

```bash
cd public
```

**2. Initialize a new Git repository inside `public/`:**

```bash
git init
```
Expected output:
```
Initialized empty Git repository in .../public/.git/
```

**3. Create and switch to the `main` branch:**

```bash
git checkout -b main
```
Expected output:
```
Switched to a new branch 'main'
```

**4. Configure your Git identity** (only needed once on a new machine):

```bash
git config user.name "Your Name"
git config user.email "your-email@example.com"
```

**5. Stage and commit all files:**

```bash
git add -A

# Verify what will be committed:
git status

# Commit:
git commit -m "Deploy CMCS-Hub"
```
Expected output:
```
[main (root-commit) abc1234] Deploy CMCS-Hub
 45 files changed, 1234 insertions(+)
 ...
```

**6. Link to the GitHub repository — use the URL you copied in Step A.1:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/cmcs-hub.github.io.git
```

Verify the remote was added:
```bash
git remote -v
```
Expected output:
```
origin  https://github.com/YOUR_USERNAME/cmcs-hub.github.io.git (fetch)
origin  https://github.com/YOUR_USERNAME/cmcs-hub.github.io.git (push)
```

**7. Push to GitHub:**

```bash
git push -f origin main
```

You will be prompted for your GitHub username and password/token. Use a **Personal Access Token** (not your password):
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select the `repo` scope
4. Copy the token and paste it as your password

Expected output:
```
Enumerating objects: 45, done.
...
To https://github.com/YOUR_USERNAME/cmcs-hub.github.io.git
 * [new branch]      main -> main
```

**8. Go back to the project root:**

```bash
cd ../..
```

---

### A.4 Enable GitHub Pages

1. Open your browser and go to:
   ```
   https://github.com/YOUR_USERNAME/cmcs-hub.github.io/settings/pages
   ```

2. Under **"Build and deployment"**:

   | Setting | Value |
   |---------|-------|
   | **Source** | Deploy from a branch |
   | **Branch** | `main` |
   | **Folder** | `/ (root)` |

3. Click **Save**.

4. Wait 1–2 minutes. GitHub will show a blue progress bar:
   > "Your GitHub Pages site is currently being built from the `main` branch."

5. Refresh the page. When deployment is complete, you will see a green banner:
   > "Your site is live at `https://YOUR_USERNAME.github.io`"

---

### A.5 Verify the Deployed Site

Run the following checks from your terminal:

```bash
# Check the homepage (should return HTTP 200 or 301)
curl -s -o /dev/null -w "Homepage: %{http_code}\n" https://YOUR_USERNAME.github.io/

# Check each module page
curl -s -o /dev/null -w "News: %{http_code}\n" https://YOUR_USERNAME.github.io/news/
curl -s -o /dev/null -w "Research: %{http_code}\n" https://YOUR_USERNAME.github.io/research/
curl -s -o /dev/null -w "Publications: %{http_code}\n" https://YOUR_USERNAME.github.io/publications/
curl -s -o /dev/null -w "Contact: %{http_code}\n" https://YOUR_USERNAME.github.io/contact/
```

Expected: all return `200`.

Also open the site in a browser and manually check:
- [ ] Navigation bar has 5 links, all working
- [ ] Homepage shows hero banner, 2 research cards, news preview
- [ ] `/news/` shows the CMCS-Intro post with correct date
- [ ] `/research/` shows 2 sections × 3 subsections
- [ ] `/publications/` shows 5 papers with DOI/PubMed/Request badges
- [ ] `/contact/` shows Visitor Map card + Contact Info card
- [ ] Mobile layout works (resize browser or check on phone)

---

### A.6 Ongoing Updates (Manual)

Each time you add news, update publications, or edit research content:

```bash
cd /path/to/cmcs-hub-package/CMCS-Hub

#   Example: add a news post
vim content/news/2026-07-15-conference-talk.md

#   Example: add a publication
vim data/publications.yaml

#   Step 1: Rebuild
../hugo-bin/hugo --cleanDestinationDir

#   Step 2: Preview locally (optional)
python3 -m http.server 8080 --directory public --bind 0.0.0.0
#   Then open http://localhost:8080 in browser

#   Step 3: Deploy
cd public
git add -A
git commit -m "Update: $(date +%F)"
git push
cd ../..
```

---

## Strategy B: GitHub Actions CI/CD — Detailed Steps

Strategy B pushes the entire source code to GitHub, and a GitHub Actions workflow automatically builds and deploys the site on every push. You never need to run `hugo` locally to deploy.

### Prerequisites Checklist

- [ ] GitHub account
- [ ] Git installed locally
- [ ] CMCS-Hub source code with Hugo binary
- [ ] Repository created on GitHub (any name, e.g., `cmcs-hub`)

---

### B.1 Create the GitHub Repository

1. Go to https://github.com/new

2. Fill in the form:

| Field | Value |
|-------|-------|
| Owner | Your GitHub username |
| Repository name | `cmcs-hub` (any name works) |
| Description | `CMCS-Hub source code` |
| Visibility | **Public** |

3. Leave all checkboxes **unchecked**:
   - ❌ "Add a README file"
   - ❌ "Add .gitignore"
   - ❌ "Choose a license"

4. Click **"Create repository"**.

5. **Copy the repository URL:**
   ```
   https://github.com/YOUR_USERNAME/cmcs-hub.git
   ```

---

### B.2 Prepare the Source for Git

Navigate to the project root:

```bash
cd /path/to/cmcs-hub-package
```

**1. Ensure `config.toml` has the correct `baseURL`:**

```bash
grep baseURL CMCS-Hub/config.toml
```
Should show:
```toml
baseURL = "https://YOUR_USERNAME.github.io/"
```

**2. Create a `.gitignore` file** to exclude built output and large archives:

```bash
cat > .gitignore << 'EOF'
# Build output
CMCS-Hub/public/

# Conda pack artifacts
cmcs-hub-env.tar.gz
cmcs-hub-offline-*.tar.gz

# Offline packages
releases/

# Hugo lock file
CMCS-Hub/.hugo_build.lock
CMCS-Hub/resources/

# R
.Rproj.user/
.Rhistory
.RData
EOF
```

**3. Initialize Git:**

```bash
git init
git checkout -b main
```

**4. Configure Git identity** (only once per machine):

```bash
git config user.name "Your Name"
git config user.email "your-email@example.com"
```

**5. Stage all files and verify what will be committed:**

```bash
git add -A
git status
```

Review the list — it should include `CMCS-Hub/`, `scripts/`, `hugo-bin/`, `environment.yml`, `CMCS-Hub-*.md`, `cmcs-hub-v108Jun2026.md`, `.gitignore`.

It should **NOT** include `CMCS-Hub/public/`, `releases/`, `cmcs-hub-env.tar.gz`.

**6. Commit:**

```bash
git commit -m "Initial CMCS-Hub source"
```

**7. Link to GitHub and push:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/cmcs-hub.git
git push -u origin main
```

You will be prompted for credentials. Use a Personal Access Token as password:
1. Go to https://github.com/settings/tokens
2. Generate a token with `repo` and `workflow` scopes
3. Paste it when prompted

---

### B.3 Create the GitHub Actions Workflow

This workflow tells GitHub: "every time someone pushes to `main`, build the Hugo site and deploy it to Pages."

**1. Create the workflows directory:**

```bash
mkdir -p .github/workflows
```

**2. Create the workflow file:**

```bash
cat > .github/workflows/deploy.yml << 'YAML'
name: Deploy CMCS-Hub to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: '0.162.1'
          extended: true

      - name: Build site with Hugo
        run: |
          cd CMCS-Hub
          hugo --minify --cleanDestinationDir

      - name: Setup GitHub Pages
        uses: actions/configure-pages@v4

      - name: Upload built site
        uses: actions/upload-pages-artifact@v3
        with:
          path: './CMCS-Hub/public'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
YAML
```

**What each step does:**

| Step | Action | Purpose |
|------|--------|---------|
| `Checkout source` | `actions/checkout@v4` | Clones your repository into the runner |
| `Setup Hugo` | `peaceiris/actions-hugo@v3` | Downloads Hugo v0.162.1 (same version as local) |
| `Build site` | `hugo --minify` | Builds the site inside `CMCS-Hub/public/` |
| `Setup Pages` | `actions/configure-pages@v4` | Configures the Pages deployment environment |
| `Upload artifact` | `actions/upload-pages-artifact@v3` | Saves `public/` as a deployable artifact |
| `Deploy` | `actions/deploy-pages@v4` | Publishes the artifact to GitHub Pages |

**3. Commit and push the workflow:**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deploy workflow"
git push
```

---

### B.4 Enable GitHub Pages with Actions

1. Go to your repository settings:
   ```
   https://github.com/YOUR_USERNAME/cmcs-hub/settings/pages
   ```

2. Under **"Build and deployment"**:

   | Setting | Value |
   |---------|-------|
   | **Source** | GitHub Actions |

3. Click **Save**.

---

### B.5 Monitor the First Deployment

After pushing the workflow file, GitHub automatically triggers the first build.

1. Go to the **Actions** tab:
   ```
   https://github.com/YOUR_USERNAME/cmcs-hub/actions
   ```

2. Click on the running workflow named **"Deploy CMCS-Hub to GitHub Pages"** (or "Add GitHub Actions deploy workflow").

3. Watch the build log in real time:
   - **Checkout source** → Green checkmark
   - **Setup Hugo** → Green checkmark
   - **Build site with Hugo** → Green checkmark (should show 14 pages)
   - **Setup GitHub Pages** → Green checkmark
   - **Upload built site** → Green checkmark
   - **Deploy to GitHub Pages** → Green checkmark

4. When the workflow completes, go to the deployment URL shown in the summary, typically:
   ```
   https://YOUR_USERNAME.github.io/cmcs-hub/
   ```

---

### B.6 Verify the Deployed Site

Same checks as Strategy A Step 5.

```bash
curl -s -o /dev/null -w "Homepage: %{http_code}\n" https://YOUR_USERNAME.github.io/
curl -s -o /dev/null -w "News: %{http_code}\n" https://YOUR_USERNAME.github.io/news/
curl -s -o /dev/null -w "Research: %{http_code}\n" https://YOUR_USERNAME.github.io/research/
curl -s -o /dev/null -w "Publications: %{http_code}\n" https://YOUR_USERNAME.github.io/publications/
curl -s -o /dev/null -w "Contact: %{http_code}\n" https://YOUR_USERNAME.github.io/contact/
```

All should return `200`.

---

### B.7 Ongoing Updates (CI/CD)

With Strategy B, every edit and push triggers an automatic redeploy:

```bash
cd /path/to/cmcs-hub-package

# Edit content
vim CMCS-Hub/content/news/2026-07-15.md
vim CMCS-Hub/data/publications.yaml

# Commit and push — done. GitHub Actions builds and deploys automatically.
git add -A
git commit -m "Add news post: Conference Talk"
git push
```

After pushing:
1. Go to the **Actions** tab to watch the build
2. Wait ~30–60 seconds for the green checkmark
3. Refresh your site to see the update

The URL shown in the Actions deploy step is always the live deployment URL.

---

## Post-Deployment Configuration

### Custom Domain

To use your own domain (e.g., `cmcs-hub.example.com`) instead of `YOUR_USERNAME.github.io`:

1. Update `CMCS-Hub/config.toml`:

   ```toml
   baseURL = "https://cmcs-hub.example.com/"
   ```

2. Add a CNAME file:

   ```bash
   cd CMCS-Hub/static
   echo "cmcs-hub.example.com" > CNAME
   ```

3. Configure DNS at your domain registrar:

   | Type | Name | Value |
   |------|------|-------|
   | CNAME | `cmcs-hub` | `YOUR_USERNAME.github.io` |

4. In GitHub Pages settings → **Custom domain**, enter `cmcs-hub.example.com` and save.

5. Rebuild and redeploy.

### ClustrMaps Visitor Map

1. Go to https://clustrmaps.com/signup
2. Sign up with the deployed URL (e.g., `https://cmcs-hub.github.io`)
3. Copy your ClustrMaps ID from the dashboard
4. Update `CMCS-Hub/config.toml`:

   ```toml
   clustrmapsId = "your-clustrmaps-id-here"
   ```

5. Rebuild and redeploy. The contact page will now show a live visitor globe.

### Data Request Form Email

1. Update `CMCS-Hub/config.toml`:

   ```toml
   requestEmail = "your-real-email@hospital.edu.cn"
   ```

2. If using a form backend (optional, not required):

   ```toml
   dataFormEndpoint = "https://formspree.io/f/your-form-id"
   ```

3. Rebuild and redeploy.

### HTTPS Enforcement

GitHub Pages automatically provides HTTPS. In **Settings → Pages**, ensure **"Enforce HTTPS"** is checked.

---

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `404` on all pages | `baseURL` mismatch or repo name wrong | Verify `config.toml` baseURL matches `https://USERNAME.github.io` |
| `404` on a specific page | File missing or path wrong | Check `hugo` build output for warnings; verify the content `.md` exists |
| CSS not loading (`style.min.css` 404) | `baseURL` mismatch | Update `baseURL` in `config.toml` to match your GitHub Pages URL exactly |
| "There isn't a GitHub Pages site here" | Pages not enabled | Go to repo Settings → Pages → select branch `main` → Save |
| Actions workflow failed | Hugo build error | Check Actions tab → click the failed run → read the build log |
| `git push` rejected (Strategy A) | Branch protection or permission | Use `git push -f origin main` for first push; check token has `repo` scope |
| `git push` asks for password | Using HTTPS, not SSH | Use a Personal Access Token as password, not your GitHub password |
| Build shows 0 pages | Content files missing or malformed | Run `hugo` locally without `--cleanDestinationDir` to see errors |
| Sitemap has wrong URLs | `baseURL` not updated before build | Update `baseURL`, run `hugo --cleanDestinationDir`, redeploy |
| Site works locally but not on GitHub | `baseURL` mismatch | Locally it defaults to `localhost`; on Pages it must match the actual domain |

---

## Quick Reference

```bash
# === Strategy A ===

# Build
cd cmcs-hub-package/CMCS-Hub && ../hugo-bin/hugo --cleanDestinationDir

# Preview locally
cd public && python3 -m http.server 8080 --bind 0.0.0.0

# Deploy
cd public && git add -A && git commit -m "Deploy $(date +%F)" && git push
cd ../..


# === Strategy B ===

# Edit content, then:
cd cmcs-hub-package
git add -A && git commit -m "Update $(date +%F)" && git push
# Wait 30s, then check https://YOUR_USERNAME.github.io/
```

---

*Document generated: June 10, 2026*
