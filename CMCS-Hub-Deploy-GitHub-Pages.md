# CMCS-Hub：部署到 GitHub Pages（GitHub Actions 方式）

> 本文是当前有效的部署流程。旧文档 `docs/archive/CMCS-Hub-Deploy-GitHub-10Jun2026.md` 已废弃，仅供历史参考。
>
> Current deployment path: **push to `main` → GitHub Actions builds Hugo → official Pages artifact → GitHub Pages.**

站点地址：<https://cmcshub-heartinsti.github.io/>
仓库：`cmcshub-heartinsti/cmcshub-heartinsti.github.io`（用户站点，必须与账号同名）

---

## 1. 机制

```
git push origin main
  → .github/workflows/deploy-pages.yml
      job build : checkout → hugo 0.162.1 extended → hugo --gc --minify --cleanDestinationDir
                  → configure-pages → upload-pages-artifact（打包 CMCS-Hub/public/ 为 artifact）
      job deploy: deploy-pages（OIDC）→ Pages CDN
  → https://cmcshub-heartinsti.github.io/
```

要点：

- `CMCS-Hub/public/` **不进入 git**，只在 runner 上生成；仓库里没有 `gh-pages` 分支。
- 不需要任何 secret：`permissions` 里的 `pages: write` + `id-token: write` 由 Actions 自动注入 token。
- 公开仓库的 Actions 分钟数不计费；单次运行约 30–90 秒。
- Pages 走 Fastly CDN，HTML 边缘缓存约 10 分钟；刚发布后看不到改动属正常。

---

## 2. 首次配置（只需做一次）

### 2.1 建仓库

`https://github.com/new`：

| 字段 | 值 |
|---|---|
| Repository name | `cmcshub-heartinsti.github.io` |
| Visibility | Public |
| README / .gitignore / license | 都不勾 |

仓库名必须与账号名逐字一致，否则站点会落到子路径，站内硬编码的 `/news/` 等链接会 404。

### 2.2 配置推送凭据

SSH（推荐）：

```bash
ssh-keygen -t ed25519 -C "cmcshub2026@163.com"
cat ~/.ssh/id_ed25519.pub        # 贴到 https://github.com/settings/keys
ssh -T git@github.com            # 期望：Hi cmcshub-heartinsti! You've successfully authenticated
```

HTTPS + PAT：`https://github.com/settings/tokens` 建 classic token，勾 `repo` + `workflow`；
`git config --global credential.helper store`，首次 push 时把 token 当密码输入。
**token 不要写进仓库、脚本或文档。**

### 2.3 打开 Pages

`Settings → Pages → Build and deployment → Source = GitHub Actions`。

必须先做这一步，否则 deploy job 报：
`Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions...`

---

## 3. 本机首次推送

```bash
cd cmcs-hub-package          # 仓库根
bash scripts/00-get-hugo.sh  # 本地构建用（hugo-bin/ 已被 .gitignore 排除）
git status --short | head    # 确认没有 hugo-bin/、CMCS-Hub/public/、releases/
git push -u origin main
```

首次提交已完成（分支 `main`），remote 已设为
`git@github.com:cmcshub-heartinsti/cmcshub-heartinsti.github.io.git`。
若改用 HTTPS，则：

```bash
git remote set-url origin https://github.com/cmcshub-heartinsti/cmcshub-heartinsti.github.io.git
```

---

## 4. 首次部署验收

Actions → `Deploy CMCS-Hub to GitHub Pages` → 最新 run，预期：

| 步骤 | 预期 |
|---|---|
| Show baseURL in use | `1:baseURL = "https://cmcshub-heartinsti.github.io/"` |
| Set up Hugo | `hugo v0.162.1 ... +extended` |
| Build site | `Pages │ 15`（14 个页面 + 404），无 WARN/ERROR |
| Fail if output is empty | `pages: 9`、`size: ...` |
| Deploy to GitHub Pages | 输出 `page_url`，环境 `github-pages` 出现线上链接 |

线上检查：

```bash
BASE=https://cmcshub-heartinsti.github.io
for p in "" news/ research/ publications/ data/ data-request/ robots.txt sitemap.xml; do
  curl -s -o /dev/null -w "%{http_code}  /$p\n" "$BASE/$p"
done
curl -s "$BASE/" | grep -o '/css/style\.min\.[a-f0-9]*\.css'        # 有输出＝样式走对域名
curl -s "$BASE/publications/" | grep -c 'href="https://doi.org/'    # 期望 5
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/does-not-exist/"    # 404，body 是自定义 404
```

---

## 5. 日常发布

```bash
# 新闻
bash scripts/08-new-news.sh
# 论文：编辑 CMCS-Hub/data/publications.yaml
git add -A && git commit -m "Add news: <标题>" && git push
```

- 手动手动触发：Actions → 该 workflow → `Run workflow`。
- 回滚内容：`git revert <bad-commit> && git push`；只想恢复上一版站点，在 Actions 里对上一次成功的 run 点 **Re-run all jobs**。
- 下线：Settings → Pages → Source 改 `None`。

---

## 6. 故障排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 裸文本 / CSS 404 / sitemap 旧域名 | baseURL 与域名不一致 | 改 `CMCS-Hub/config.toml` 第 1 行后重跑 |
| 全站 404 | 仓库名不是 `cmcshub-heartinsti.github.io` | 按 2.1 重建仓库 |
| 全站 404（名字正确） | Pages 未启用 / 从未成功部署 | Settings → Pages → Source 选 GitHub Actions 后 `Run workflow` |
| `Build site` 失败 | 模板/内容语法错误 | 本地跑同样命令：`cd CMCS-Hub && ../hugo-bin/0.162.1/hugo --gc --minify --cleanDestinationDir` |
| `Set up Hugo` 失败 | Hugo releases 被限流 | 把该 step 换成 `run: curl -fsSL https://github.com/gohugoio/hugo/releases/download/v0.162.1/hugo_extended_0.162.1_linux-amd64.tar.gz \| tar xz -C /usr/local/bin hugo` |
| deploy 报 `Get Pages site failed` | 2.3 未做 | 设 Source=GitHub Actions |
| deploy 报 404 / 页面空白 | artifact 里没有 `index.html` | 看 build 的 `Fail if output is empty` 是否失败 |
| push 403 | PAT 缺 `workflow` / 公钥未加 | 重建 token 或 `ssh -T` 验证 |
| 部署后 1–2 分钟仍 404 | CDN/DNS 未生效 | 等 5–10 分钟 |

---

## 7. 常见问题

- 为什么不直接把 `public/` 推到 `gh-pages` 分支？会把构建产物写进 git 历史，
  每次发布都要提交几十个文件，回滚和 diff 都变差；Actions 产物方式无此问题。
- 为什么 `hugo-bin/` 不入库？Hugo extended 二进制 96 MB，GitHub 对 >100 MB 文件直接拒绝，
  >50 MB 会警告；CI 自带 Hugo，本地用 `scripts/00-get-hugo.sh` 下载。
- 临时公网演示（离线环境/评审演示）仍可用 `bash scripts/06-start-public.sh`：
  走 Cloudflare 快速隧道，URL 每次变化、受 429/1015 限流，**不是**正式入口。
