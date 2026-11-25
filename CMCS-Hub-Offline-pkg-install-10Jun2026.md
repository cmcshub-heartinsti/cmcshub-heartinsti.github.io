# CMCS-Hub: Offline Package Installation Guide

**Package**: `CMCS-Hub-Offline-pkg-10Jun2026.tar.gz` (497 MB)
**Date**: June 10, 2026

---

## Overview

This offline package contains a fully self-contained CMCS-Hub website environment that can be deployed on any Linux x86_64 machine with conda installed. No internet access is required after the package is transferred.

### Package Contents

```
CMCS-Hub-Offline-pkg-10Jun2026.tar.gz
├── cmcs-hub-env.tar.gz       # Packed conda environment (R 4.5.3 + blogdown 1.23)
├── CMCS-Hub/                  # Complete website source code
│   ├── config.toml            # Site configuration
│   ├── content/               # All page content
│   ├── data/                  # Publications database
│   ├── themes/cmcs-hub/       # Custom Hugo theme
│   └── R/                     # R helper scripts
├── hugo-bin/                  # Hugo v0.162.1 binary (versioned: 0.162.1/hugo)
├── scripts/                   # 9 operational scripts
│   ├── 01-setup.sh            # Online environment setup
│   ├── 01-setup-offline.sh    # Offline environment setup
│   ├── 02-serve.sh            # Development server (hot-reload)
│   ├── 03-build.sh            # Production build (R + blogdown)
│   ├── 04-serve-static.sh     # Serve built static site
│   ├── 05-pack-offline.sh     # Create offline package
│   ├── 06-start-public.sh     # Start Cloudflare Tunnel deployment
│   ├── 07-deploy.sh           # Build + test + restart production
│   └── 08-new-news.sh         # Scaffold new news/events post
└── environment.yml            # Conda environment specification
```

---

## Step 1: Transfer the Package

Transfer `CMCS-Hub-Offline-pkg-10Jun2026.tar.gz` to the target Linux x86_64 machine:

```bash
# Via SCP
scp CMCS-Hub-Offline-pkg-10Jun2026.tar.gz user@target-machine:/tmp/

# Or via USB drive, network share, rsync, etc.
```

---

## Step 2: Extract

```bash
cd /tmp
tar -xzf CMCS-Hub-Offline-pkg-10Jun2026.tar.gz
cd cmcs-hub-package
```

Expected: A directory structure matching the "Package Contents" table above.

---

## Step 3: Install the Conda Environment

```bash
# Create the target environment directory
mkdir -p $(conda info --base)/envs/cmcs-hub

# Extract the packed environment
tar -xzf cmcs-hub-env.tar.gz -C $(conda info --base)/envs/cmcs-hub

# Activate and unpack
source $(conda info --base)/envs/cmcs-hub/bin/activate
conda-unpack

# Register the environment
conda activate cmcs-hub
```

---

## Step 4: Verify the Installation

Run the verification checklist:

```bash
# Activate the environment
conda activate cmcs-hub

# Check R
R --version                                    # Should show R 4.5.3

# Check blogdown
R -e 'packageVersion("blogdown")'             # Should return 1.23

# Check Hugo
./hugo-bin/0.162.1/hugo version               # Should show Hugo v0.162.1

# Build the website
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir
# Expected: 14 pages, 0 errors, 0 warnings

# Verify built pages
find CMCS-Hub/public -name "index.html"        # Should show 7+ HTML files
```

---

## Step 5: Serve the Website

### Option A: Quick Preview (Python — Auto Port Resolution)

```bash
# Find an available port and serve
PORT=8080
python3 -c "import socket; s=socket.socket(); s.bind(('0.0.0.0',8080)); s.close()" 2>/dev/null || {
    echo "Port 8080 in use, trying 8081..."
    PORT=8081
}
python3 -m http.server $PORT --directory CMCS-Hub/public --bind 0.0.0.0 &
echo "Site available at: http://localhost:$PORT"
```

Or use the built-in script for automatic port resolution:

```bash
bash scripts/04-serve-static.sh
```

### Option B: Temporary Public Deployment via Cloudflare Tunnel

Deploy CMCS-Hub to a public URL using the bundled `hugo-bin/cloudflared-linux-amd64`. Cloudflared prints the URL directly — no log parsing, no intermediate files.

```bash
cd /tmp/cmcs-hub-package

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

# 3. Start tunnel — cloudflared prints the URL box directly
echo ""
echo "Starting Cloudflare Tunnel..."
echo ""

./hugo-bin/cloudflared-linux-amd64 tunnel --url http://localhost:$PORT --protocol http2 --no-autoupdate

# Press Ctrl+C to stop both the tunnel and the server
kill $SERVER_PID 2>/dev/null
```

**Using the convenience script (same commands, one invocation):**

```bash
bash scripts/06-start-public.sh
# Builds → serves → tunnels → displays URL → writes CMCS-Hub-Internet-Accessible-Website.txt
```

### Option C: Development Server (R + Hot-Reload)

```bash
conda activate cmcs-hub
bash scripts/02-serve.sh
# Open: http://localhost:4321
```

### Option D: Production (System Service)

```bash
sudo tee /etc/systemd/system/cmcs-hub.service << 'EOF'
[Unit]
Description=CMCS-Hub Static Site Server
After=network.target
[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/tmp/cmcs-hub-package
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

---

## Step 6: Daily Operations

### Add a News/Events Post

```bash
cd /tmp/cmcs-hub-package
bash scripts/08-new-news.sh "Title of Your News Post"

# Edit the created file to add content
# Then rebuild:
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir

# If using the systemd service, restart:
sudo systemctl restart cmcs-hub
```

### Add a Publication

```bash
vim CMCS-Hub/data/publications.yaml  # Append a new entry
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir
sudo systemctl restart cmcs-hub
```

### Update Research Content

```bash
vim CMCS-Hub/content/research/_index.md
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir
sudo systemctl restart cmcs-hub
```

---

## Verification Checklist

After completing all steps, verify the following:

```
[ ] Package extracted to /tmp/cmcs-hub-package
[ ] conda activate cmcs-hub works
[ ] R 4.5.3 + blogdown 1.23 confirmed
[ ] Hugo v0.162.1 confirmed
[ ] Site builds: 14 pages, 0 errors
[ ] All 5 modules accessible: Home / News / Research / Publications / Data
[ ] Navigation links work
[ ] Publications show 5 papers with badges
[ ] Data Request form loads with email pre-filled
```

---

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `conda-unpack: command not found` | conda-pack not installed | `conda install -c conda-forge conda-pack` |
| `conda activate cmcs-hub` fails | Environment path wrong | Check `$(conda info --base)/envs/cmcs-hub` exists |
| Hugo build fails | Content files corrupt | Check `CMCS-Hub/content/` files are intact |
| `Permission denied` on systemctl | Not running as root | Use `sudo` for systemctl commands |
| Port 8080 already in use | Another process on that port | Use different port: `python3 -m http.server 9000 ...` |

---

*Document generated: June 10, 2026*
