# fr/blog 16 篇 sitemap 补丁（给 WorkBuddy，2026-11-25）

生成时间：2026-11-25 19:58（对岸只读实测，**未改动 odmlcd-site 任何文件**）
作用对象：`pages/sitemap.xml`
基线 HEAD：`daf30a5`（2026-11-25 15:22，已同步 GitHub）

## 一、实测数字（全部来自磁盘与 git，不是估算）

| 项 | 实测值 |
|---|---:|
| 磁盘 HTML（`pages/**`，排除 `_verify_tmp`） | 11,063 |
| `pages/sitemap.xml` `<url>` 块 | 11,089 |
| 线上 `https://odmlcd.com/sitemap.xml` | 11,085 |
| 本地独有（已提交未部署） | 4 条，全是 `pt/blog/*` |
| `pages/fr/blog/*.html` 磁盘文件 | 115 |
| sitemap 里的 `fr/blog/` 块 | 99 |
| **本次缺口** | **16 篇** |
| 16 篇的家族块总数（含各语版本） | 66（fr 16 + 兄弟 50） |
| 已在 sitemap 且需回填 `hreflang="fr"` 的兄弟块 | **62** |
| 已自带 `hreflang="fr"` 的块 | 4（那 4 个未部署的 pt 块） |
| 其它语言版本本身不在 sitemap 的 | 0 |
| 缺 en 互链的块 | 0 |
| 幽灵 hreflang（声明磁盘不存在的版本） | **4 处**（见第五节） |
| 打补丁后 sitemap 块数 | **11,105** |
| 16 篇的 lastmod（取自 git 提交日） | 全部 2026-11-25 |

16 个 slug（括号为磁盘实际存在的语言版本）：

```
display-backlight-not-working-diagnosis            [en,fr,zh-Hant]
high-humidity-condensation-display-prevention      [en,fr,zh-Hant]
lcd-backlight-flicker-dimming-methods              [en,fr,zh-Hant]
lcd-backlight-led-life                             [en,de,fr,ru,ja,ko,zh-Hant]
lcd-colour-shift-viewing-angle-wide-tft            [en,fr,zh-Hant]
lcd-image-retention-burn-in                        [en,de,fr,pt,ru,ja,ko,zh-Hant]
lcd-mura-defect-explained                          [en,fr,zh-Hant]
lcd-panel-storage-shelf-life                       [en,de,fr,zh-Hant]
lcd-power-sequence-timing-requirements             [en,fr,zh-Hant]
mcu-8080-parallel-interface-tft-guide              [en,de,fr,pt,ru,ja,ko,zh-Hant]
nec-lcd-replacement-guide                          [en,fr,zh-Hant]
tft-backlight-led-lifetime-dimming-guide           [en,de,fr,pt,ru,ja,ko,zh-Hant]
tft-display-adapter-converter-board-guide          [en,de,fr,ru,ja,ko,zh-Hant]
tft-firmware-otp-burning-guide                     [en,de,fr,ru,ja,ko,zh-Hant]
tft-lcd-vs-lcd-meaning                             [en,es,de,fr]
vertical-horizontal-lines-panel-vs-board           [en,de,fr,pt,ru,ja,ko,zh-Hant]
```

每篇 16 个块内已按磁盘真实存在的版本写 `xhtml:link`（含 `x-default` → en），未声明任何磁盘不存在的语种。

## 二、文件清单

| 文件 | 用途 |
|---|---|
| `apply_sitemap_fr16.js` | 幂等打补丁脚本，默认 `--dry`，`--apply` 才写盘；写盘前自动备份 |
| `sitemap_fr16_new_blocks.xml` | 16 个新 `<url>` 块（可直接对照/手工粘贴） |
| `sitemap_fr16_existing_block_updates.xml` | 62 个兄弟块的改前/改后对照（REPLACE 用） |
| `manifest.json` | 上面所有数字的机器可读版 |

## 三、怎么执行（一条命令 + 三道校验）

```bash
# 1) 干跑（不写盘）：应输出 待新增 16 / 待回填 62 / 结果 DRY_RUN_OK
node apply_sitemap_fr16.js --repo "<site/repo 路径>" --dry

# 2) 写盘：会先备份到 _verify_tmp/sitemap_before_fr16.xml
node apply_sitemap_fr16.js --repo "<site/repo 路径>" --apply

# 3) 校验（写盘后必查，脚本已内置前两项）
python _check_hreflang.py        # wrong 必须仍是 0
python _preflight.py             # 12/12
```

脚本内置断言（任一不满足就拒绝写盘）：块数必须 `11,089 → 11,105`；`<loc>` 全局唯一；XML 可解析；fr 块 16 个；回填块 62 个；只允许 `sitemap.xml` 一个文件被改动。
回滚：把 `_verify_tmp/sitemap_before_fr16.xml` 覆盖回去即可，**不涉及任何页面文件、不涉及数据库、不涉及外部服务**。

## 四、闸门与批次安排（按 `_seo_change_guard.py` 实际阈值）

闸门实测口径（读脚本得到，不是我推测）：`FREEZE_DAYS=14`、`MAX_BATCH_FILES=20`、`MAX_DAILY_DEPLOYS=3`、`MAX_SITE_RATIO=0.05`（单批上限取 `min(20, 全站 5%) = 20` 页）、检出 `<title>`/`<meta name=description>` 变更即 BLOCK、**日批次按当天的 commit 数计**。

当前状态：今天 25 个 commit（昨天 23 个）→ 今天跑闸门是 BLOCK，**今晚不能动**。

建议排期：

1. **11-26 第 1 批（占 1 个 commit + 1 次部署）**：只改 `pages/sitemap.xml`（+ 第五节那 4 行幽灵一起清）。
   - 改动 HTML 文件数 = **0** → 不触发 20 页上限
   - 无 title/description 变更 → 不触发铁律 34
   - 不涉及 14 天冻结（sitemap 里的 URL 不算被改的页面）
2. **同批部署后立即 IndexNow**：16 条 fr + 4 条 pt（共 20 条），先单 URL 试探再正式推；key 用页面 meta 里那把 `9551725edf3ffbbd4d8a06946abfcb4f`（站内那个多 key 文件的问题属部署项，D3 已把 `pages/` 里那个删了，线上要等部署）。
3. **11-27 之后**：观察这批 fr 页在 Bing 的首次曝光（对照 12-01 那次 40 页的判定口径）。
4. **12-09 之后**：9 个语种的 `blog.html` 栏目页补列（约 129 篇新文章没被自己的栏目页列出）。这批**受 `FREEZE_DAYS` 限制**——9 个 `blog.html` 的 git 末次改动全是今天 00:07–00:18，必须等 14 天；且属"生成器层修死"，要同步改索引生成器，不能逐页手补。

## 五、顺手要清的一处硬伤（同批、同文件）

这 4 个块声明了磁盘不存在的 `es` 版本（违反铁律 9「绝无幽灵 alternate」，会让整组 hreflang 被判无效）：

```
https://odmlcd.com/pt/blog/lcd-image-retention-burn-in
https://odmlcd.com/pt/blog/mcu-8080-parallel-interface-tft-guide
https://odmlcd.com/pt/blog/tft-backlight-led-lifetime-dimming-guide
https://odmlcd.com/pt/blog/vertical-horizontal-lines-panel-vs-board
```

`pages/es/blog/` 下这 4 个文件确实不存在，删掉这 4 行 `<xhtml:link ... hreflang="es" .../>` 即可。

## 六、`/landings` 与 `/zh-Hant/landings`：判定结论是**不补**

我原本把它们算进"缺口"，核对后撤回，理由（实测）：

1. **它们已经在被提交**：`pages/sitemap-landings-index.xml` 里就有这两条（lastmod 2026-11-16），而 `robots.txt` 第 51 行起一共声明了 4 个 sitemap，含这个文件。所以只是不在主 sitemap，**不是没提交**，补进主 sitemap 属重复声明。
2. **页面性质是目录页**：`/landings` 108KB、含 **1,132 条**指向 landings 子页的链接、只有 4 个 h2/h3、**没有任何 JSON-LD**、标题是「Industrial LCD Landing Pages Directory」——没有买家会搜这个词。
3. **与 11-25 D2 的口径一致**：同一天刚把 132 个 `/blog/category/` 聚合页从 sitemap 摘掉（理由：聚合页无独立搜索价值）。目录页若反向加进去，口径自相矛盾。

需要更强发现性的话，正确做法不是加目录页，而是把 1,133 个 landings 拆成独立子 sitemap 由 `sitemap-landings-index.xml` 索引（现在那个文件只有 2 条）。这属结构调整，等你拍板，我不动。

## 七、我这边的边界

本补丁只落在工作区与 bridge 仓库，**没有改动 odmlcd-site 的 pages/、sitemap.xml、任何页面文件；没有 git push；没有部署；没有对外发信**。你 `git pull` 后自己决定何时应用与部署。
