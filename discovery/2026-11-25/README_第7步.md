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

**所以凡有 captcha / 邮件验证 / 人工审核的一律跳过自动提交**，没有任何一家提供免登录 API。需要你自己动手的清单（按性价比排，注册邮箱与公开展示邮箱一律 `sales@odmlcd.com`（2026-11-25 更正，不用个人邮箱注册目录账号）；电话只填平台后台字段，公开可见处不出现明文）：

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

### d-2) 注册入口自动化可行性实测（2026-11-25 22:0x，本机 curl + 浏览器 UA + 跟随跳转）

| 平台 | 注册入口最终 URL | HTTP | 字节 | 判定 |
|---|---|---:|---:|---|
| Europages | /business/signup | 202 | 0 | Cloudflare 挑战未过，表单未返回 |
| wlw | /en/register | 202 | 0 | 同上 |
| ThomasNet | /thomas-auth/signup | 403 | 773 | 挑战页，页面含 captcha 字样 |
| Kompass | /en/#/add-company | 403 | 771 | 挑战页，含 captcha 字样 |
| Manta | /cbid.add | 403 | 5,658 | 挑战页，含 captcha 字样 |
| DirectIndustry | /register-manufacturer.html | 403 | 5,698 | 挑战页 |
| IndustryStock | /en/company/register | 403 | 5,658 | 挑战页 |
| Brownbook | /add-business/ | 403 | 5,628 | 挑战页 |
| Hotfrog | /businesses/add | 404 | 33,256 | 原路径已失效，需站内导航进入 |
| Global Sources | supplier.globalsources.com | 200 | 942 | 纯 JS 外壳，字段前端渲染 |

**结论（不粉饰）**：10 个入口在本机 **0 个能拿到可提交的 HTML 表单**——不是被 Cloudflare 挑战（403/202），就是 JS 单页外壳，或路径已变。所以「把注册替你做完」这件事我用 HTTP 做不到，和「有验证码就跳过」是同一类拦路。我能替你做完的部分已经做完：字段、NAP、三版描述、类目、素材清单、提交后动作，全部配成复制即粘的执行包（见 `bridge_outreach_2026-11-25/04_目录注册执行包_2026-11-25.md`）。

### d-3) 收信链路实测（决定验证码由谁取）

- `odmlcd.com` 的 MX = **mx1.yunyou.top / mx2.yunyou.top**（第三方企业邮，不是 Google、也不是 Cloudflare Email Routing），NS 在 Cloudflare。
- Cloudflare Email Routing 的三个接口（settings / rules / destination_addresses）用现有 token 返回 **code 10000 Authentication error**（该 token 只授权到 DNS 记录），所以**我查不到也读不到该域名的邮件路由**。
- 钉钉邮箱通道未连接：`dws mail +list` 返回「DingTalk authorization is incomplete or has expired」。
- 因此 `sales@odmlcd.com` 的验证码由你在 Yunyou 网页邮箱查看后贴回给我；我不会去碰你的邮箱密码或凭据。你贴回后我立刻做完该平台剩余字段与终稿；最后的「提交」点击仍需你在浏览器完成（表单被 bot 保护）。

### d-4) 邮箱口径更正（主子 2026-11-25 指令）

**目录/收录入口的注册邮箱与公开展示邮箱一律 `sales@odmlcd.com`**，不使用个人邮箱注册任何目录账号。本目录及 `bridge_outreach_2026-11-25/01_B2B目录12家_照做清单.md` 已按此统一。

### d-5) 账号与密码存放（落实「不进 git」）

- **不放 `trends/`**：该目录被 git 跟踪，写进去就会随下次提交进仓库并推到 GitHub。
- 实际位置：`C:\Users\admin\.odmlcd_secrets\directories_accounts_2026-11-25.md`（仓库外，且随 E 盘备份另存一份）。
- 每家只记：平台 / 用户名 / 注册邮箱 `sales@odmlcd.com` / 密码保管位置（建议系统凭据管理器或你的密码库，文件里只放索引不放明文密码）/ 两步验证方式 / 提交日期 / 目录页 URL / 该页链接是否 nofollow / 审核状态。
- 若你坚持放在 `trends/`，需要先给 `.gitignore` 增加一行忽略（这属于仓库文件改动，等你明示我再动）。

### 补充（2026-11-25 22:2x）

- **验证码清单当前 0 条**：还没有任何一家真正提交注册，所以没有验证码在路上；提交动作发生后才会有。我这侧 10 个入口实测全被 bot 保护挡住（403×6 / 202×2 / 404×1 / JS 外壳×1）。
- **Made-in-China 已有账号**：从待注册改为账号内补档案 + 上 10–20 款产品 + 开询盘提醒。这条渠道产出的是平台询盘，不是外链，优先级高于其余 11 家目录。
- **图片不用新拍**：实测站内有 10 张工厂实拍（线上全部 200）+ 1,342 张型号规格参考图 + 197 份 PDF，目录图片位足够。早期台账「只有 19 张真实产品图」的口径已过期，以本次实测为准。
- ⚠️ 需你确认一项合规：`pages/assets/customer-logos/` 有 **36 个客户标识**（含 Hitachi / Honeywell / LG / Schneider / Siemens 等）。目录与对外材料用不用它们，取决于是否都有授权；只要有一个拿不出依据，我建议整批从对外材料撤下——这与「不编造客户名」是同一红线，也与页面红口一致。
