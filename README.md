# HelloTools

一个讲究实用的开源工具导航站：把 HelloGitHub 历年推荐的项目筛一遍，去掉书籍、清单和教程，
只留能装的软件与能 import 的开发库，标上实时星数、许可证和维护状态。

线上地址：<https://hellotools.distinctive.fun>

## 这个库的构成

- **3412 个条目**，两类：`tool`（能安装或自建的软件，2511 个）与 `library`（被 import 的代码，901 个）。
- **13 个分类**：开发工具、人工智能、影音图像、网络、隐私与自托管、数据、效率、桌面与系统、
  运维部署、Web 应用、硬件与固件、有趣无用、开发库。每个项目只进一类。
- **维护状态由数据算出来**，不手填：活跃 / 繁忙 / 缓更 / 停更 / 已归档。

## 数据管道

```
HelloGitHub 月刊 (127 期)
   │  scripts/crawl-hellogithub.mjs      抓每期的 __NEXT_DATA__ → work/volumes/
   ▼
work/volumes/v*.json
   │  scripts/collect.mjs               平铺、只留 tool/library，附上人工分类
   ▼
work/items.json ──┬─ data/labels.json       每个项目的 kind（人工标注，已提交）
                  └─ data/category-map.json 每个 tool 的分类（人工标注，已提交）
   │  scripts/enrich-github.mjs         逐个仓库调 GitHub API（缓存 12h）
   ▼
work/tools.json
   │  scripts/build-data.mjs            合并 data/editorial.json 与 data/state.json
   ▼
data/tools.json + data/meta.json        ← 站点唯一的数据源
```

所有中间产物都在 `work/`（已 gitignore），`data/` 下的标注文件是人工资产，
重新跑流水线不会覆盖它们。

### 命令

```bash
npm install
npm run data        # 全量重跑：抓月刊 → 平铺 → 校验分类 → 抓 GitHub → 合并
npm run dev         # 本地开发 http://localhost:4321
npm run build       # 产出 dist/
npm run check       # astro check
```

`npm run data` 需要 GitHub token：`GH_TOKEN`、`GITHUB_TOKEN`，或者本机已登录的 `gh auth token`。
未认证的 API 限额 60 次/小时，跑不完 3400 个仓库。

### 人工标注在哪

| 文件 | 内容 | 谁来改 |
| --- | --- | --- |
| `data/labels.json` | 每个仓库的 kind：tool / library / resource / model / other | 分类脚本产出后提交 |
| `data/category-map.json` | 每个 tool 的 13 类归属 | 同上 |
| `data/editorial.json` | 精选标记、手写一句话简介与编辑手记、`drop: true` 下架 | 手写 |
| `data/state.json` | `verified`：作者亲自试过能用的项目 | 手写 |

`data/editorial.json` 的键是 GitHub 的 `owner/repo`，字段可只写一部分：

```json
{
  "junegunn/fzf": {
    "featured": true,
    "tagline": "命令行的模糊查找器。",
    "note": "接到 shell 之后处理分支和历史命令快得多。"
  }
}
```

## 部署

静态站点，构建产物 `dist/` 由 GitHub Actions 推到 Cloudflare Pages
（`.github/workflows/deploy.yml`，需要 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` 两个 secret）。

`.github/workflows/data.yml` 每天 03:17 UTC 重跑数据管道，有变化才提交，
提交会触发一次重新部署。

## 边界

- 不收录书籍、教程、awesome 清单和模型权重（它们在 `data/labels.json` 里被标为 resource / model）。
- 不做「推荐位竞价」，站内唯一的赞助位在列表底部，且标注「赞助」。
- 数据是快照式抓取，分类是人工判断，遇到放错的欢迎提 issue。
