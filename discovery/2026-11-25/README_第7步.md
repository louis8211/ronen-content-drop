# 第 7 步 · 爬虫发现强化（2026-11-25 21:50–22:0x，QwenWork）

边界遵守情况：本轮只做了 a) 的对外推送（IndexNow，属搜索引擎公开接口）；b/c/d 的**站点文件一律未部署、未改主仓库**，成品放本目录 + bridge 仓库，等 WorkBuddy 上线。未改产品参数、未写价格数字、未写电话明文。

## a) IndexNow 全站批量推送 —— 已完成，全 200

| 项 | 实测 |
|---|---|
| 来源 | 主仓库 `pages/sitemap.xml`（部署后版本） |
| 去重后 URL | **11,105 条**（仅取 `https://odmlcd.com/` 前缀，全部唯一） |
| 批次 | **12 批**，每批 ≤1,000（前 11 批 ×1000 + 末批 105） |
| 端点 | `api.indexnow.org/indexnow`、`www.bing.com/indexnow` |
| 结果 | **24 个 POST 全部 HTTP 200**（无 429/5xx，无需重试；重试逻辑内置但未被触发） |
| key | `9551725edf3ffbbd4d8a06946abfcb4f`（首页 meta 声明，`keyLocation` 线上 200） |
| 明细 | `_indexnow_full_report.json`（本机 workspace）、脚本 `indexnow_full.js` |

覆盖率说明：11,105 条即 sitemap 全量，已**包含**新增 16 篇 fr/blog、9 个栏目页、197 产品页 + 197 份 PDF、5,155 落地页等全部在册 URL；不需要再单独推热门 200 条（那是子集）。

## b) robots.txt 检查 —— 无缺失，不需要补丁

磁盘上存在的可提交清单文件共 4 个，线上 `robots.txt` **4 条 `Sitemap:` 全部声明到位**：

```
Sitemap: https://odmlcd.com/sitemap.xml                  200  9,617,327 B
Sitemap: https://odmlcd.com/image-sitemap.xml            200  50,770 B
Sitemap: https://odmlcd.com/feed.xml                     200  10,846 B   (Atom, 20 条)
Sitemap: https://odmlcd.com/sitemap-landings-index.xml   200  974 B
```

顺带核对：`User-agent: * / Allow: /`、`Disallow: /assets/video/`、AI 爬虫（GPTBot/ClaudeBot/PerplexityBot 等）显式放行、`IndexNow: <key>` 行在位；`/.well-known/security.txt` = 200（根路径 `/security.txt` 仍 404，属正确行为，未误建）。
**结论：无补丁。** 只有当你决定上线 c) 的两个新 feed 时，才需要追加 2 行（见下）。

## c) RSS 生成 —— 两份成品已生成并自检，未上线

| 文件 | 条数 | 覆盖 | 日期区间 | 自检 |
|---|---:|---|---|---|
| `feed-en.xml` | 50 | 英文合格文章池 201 篇取最新 50 | 2026-10-24 ~ 2026-11-18 | `<item>` 50/50 配平、裸 `&` 0、死链 0、货币+数字组合 0、邮箱 0 |
| `feed-fr.xml` | 50 | 法语文章池 113 篇取最新 50 | 2026-01-09 ~ 2026-11-07 | 同上（描述里出现的 "prix" 是站内既有市场述评用词，非报价） |

字段来源全部是文章自身元数据（`<title>` 去品牌后缀、`meta description`、`dateModified` 优先、`articleSection`），**没有任何生成/估算文本**；缺元数据的文章被跳过（en 207→201 合格、fr 115→113 合格），不产出空条目。

上线方式（交 WorkBuddy，二选一）：
1. 把 `feed-en.xml` / `feed-fr.xml` 放进 `pages/` 根，`robots.txt` 追加两行 `Sitemap: https://odmlcd.com/feed-en.xml`、`.../feed-fr.xml`，并在两个栏目页 `<head>` 里加 `<link rel="alternate" type="application/rss+xml" title="…" href="…">`（这一步属页面改动，受 12-02/12-05 冻结，可留到解冻批）。
2. 若不想加文件，可把现有 `feed.xml`（Atom，仅 20 条英文）直接扩到 50 条并按语言拆分——用同一脚本 `make_rss_feeds.js` 改输出名即可。

刷新节奏：脚本是幂等的静态生成，**没有自动定时**。要常态更新，建议挂在 WorkBuddy 的发版流程里（每次发新文章后跑一次 `node make_rss_feeds.js`，再把两个 xml 随批部署），否则 feed 会停在这次快照。

## d) 免登录开放目录自动提交 —— 实测结论：不存在可自动化的入口

| 平台 | 提交入口探测（本机 curl，浏览器 UA，跟随跳转） | 判定 |
|---|---|---|
| Brownbook | `/add/` → **403** | 反爬拦截，需浏览器人工 |
| Cylex (UK) | `/add.html` → **403** | 同上 |
| Hotfrog | `/add` → **404** | 入口路径已变，需站内导航 |
| Manta | `/cbid.add` → **403** | 需登录 |
| Europages | `/business/signup` → **202** | 可达，但注册需邮箱验证 + 人机验证 |
| IndustryStock | `/en/register` → **403** | 需浏览器 |
| wlw | `/en/register` → **202** | 可达，需邮箱/电话验证 |
| ThomasNet | `/supplierregistration.html` → **404** | 路径已变，需站内导航 |

**所以凡有 captcha / 邮件验证 / 人工审核的一律跳过自动提交**，没有任何一家提供免登录 API。需要你自己动手的清单（按性价比排，账号注册邮箱统一用 `charliel@agent.qq.com`，而**公开展示字段一律填 `sales@odmlcd.com`**；电话只填平台后台字段，公开可见处不出现明文）：

| 顺序 | 平台 | 你要做的动作 | 需要点的验证 |
|---:|---|---|---|
| 1 | Europages | 注册 → 填 NAP → 提交公司资料 | 邮箱验证链接（1 次） |
| 2 | wlw | 注册 → 类目 + 产品目录 | 邮箱 + 电话/短信验证 |
| 3 | ThomasNet | 从首页 `Get Listed` 进供应商注册 | 邮箱验证 + 可能人工审核 |
| 4 | Made-in-China | 免费供应商注册 | 营业执照上传 + 邮箱验证 |
| 5 | Global Sources | Sell on Global Sources | 执照 + 审核 |
| 6 | Kompass / DirectIndustry | Claim profile / 参展商登记 | 邮箱验证；DirectIndustry 需上传产品 PDF（可用站内 197 份规格书） |
| 7 | LinkedIn 公司页 | 补 About/Website/Specialties | 已建好，只需补内容 |
| 8 | Hotfrog / Brownbook / Cylex / Manta / IndustryStock | 短版资料批量填 | 多为邮箱验证，单次 10–15 分钟 |

逐家要填的字段、NAP 六值、描述三版、预计耗时都在 `../bridge_outreach_2026-11-25/01_B2B目录12家_照做清单.md`。

## e) 其它已确认在位的发现通道（无需改动）

- `llms.txt` 200（70,587 B）、`llms-full.txt` 200（105,772 B）—— 按既有判断这类文件不是排名杠杆，仅作实体说明，保持现状
- AI 爬虫未被 Cloudflare 拦截（此前实测 GPTBot/ClaudeBot/PerplexityBot 可取全文）
- 197 份规格书 PDF 已在 sitemap 且线上 200，旧 `/datasheets/*.pdf` 的 301 已生效（不带破缓存参数也返回新目标）
- IndexNow key 与首页 meta 声明一致，`robots.txt` 亦声明

## 待你或 WorkBuddy 决定

1. 两个 RSS 文件是否上线（上线需 robots 追加 2 行；栏目页 `<link rel=alternate>` 可等解冻批）。
2. Bing Webmaster 的 sitemap 重提仍需你登录手动做一次（本机 API 404）。
3. 目录注册按上表推进，12 家一次做完约 4–5 小时，可分两天。
