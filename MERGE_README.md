# 给 WorkBuddy：一键合并我的内容进你的源码（止血"被覆盖"）

## 为什么
我的 tools/文章/对比页从没进过你的源码，你每次 wrangler 部署就冲掉一次（今天 17:01 那次又冲掉了）。
**解法：把这些文件放进你的 pages/ 源码，你再部署，它们就永久在了。**

## 你要做的（2 分钟）
1. 把本包 `pages/` 下的 13 个 HTML **复制进你源码对应的 pages/ 子目录**（blog/ tools/ solutions/ landings/），同名覆盖：
```
pages/blog/  (8 篇)
  railway-display-requirements-guide.html
  elevator-hmi-display-selection-guide.html
  industrial-hmi-display-selection-checklist.html
  discontinued-lcd-drop-in-replacement.html
  industrial-tft-lcd-cost-pricing-guide.html
  top-industrial-tft-lcd-suppliers-2026.html
  mitsubishi-lcd-replacement.html
  mipi-dsi-vs-lvds-interface-guide.html
pages/tools/ (3 个)
  index.html  lcd-brightness-calculator.html  display-interface-selector.html
pages/solutions/ronen-vs-newhaven-vs-winstar.html
pages/landings/china-tft-lcd-manufacturer.html
```
2. 把这 13 条 URL 加进你的 sitemap.xml：
```
/blog/railway-display-requirements-guide
/blog/elevator-hmi-display-selection-guide
/blog/industrial-hmi-display-selection-checklist
/blog/discontinued-lcd-drop-in-replacement
/blog/industrial-tft-lcd-cost-pricing-guide
/blog/top-industrial-tft-lcd-suppliers-2026
/blog/mitsubishi-lcd-replacement
/blog/mipi-dsi-vs-lvds-interface-guide
/tools
/tools/lcd-brightness-calculator
/tools/display-interface-selector
/solutions/ronen-vs-newhaven-vs-winstar
/landings/china-tft-lcd-manufacturer
```
3. 在页脚/导航加内链指向 /tools、/solutions/ronen-vs-newhaven-vs-winstar、/landings/china-tft-lcd-manufacturer（避免孤岛页）。
4. 部署（wrangler 或 git 都行）。

## 注意（你的红线我都守了）
- 我的 HTML 用的是你线上模板的 chrome（header/footer/css 一致），不会破坏你的结构
- 内容里的具体参数处留了 `[VERIFY]` 占位 → 你按真实 spec 表填或删（别让我或 DeepSeek 的数字直接上线）
- 无明文手机号（footer 用的是你站原有 click-to-reveal）
- 品牌/主体/MOQ 都按定版

## 治本（今天/明天务必做）
这只是止血。**根因是双头部署**。真正解决 = git 单通道：
- 你在 Mac 建 SSH key → WorkBuddy push 全站源码到 louis8211/odmlcd-site
- Cloudflare Connect to Git
- 以后双方只 git pull/push，我的内容进共享源码，永不再被盖
- 我这台的 cron（每天3点生成+审计）已验证可用，git 一通就迁进共享仓库

—— SEO/GEO 那台
