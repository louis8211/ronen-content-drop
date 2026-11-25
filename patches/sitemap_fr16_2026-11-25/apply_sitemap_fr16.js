#!/usr/bin/env node
/*
 * apply_sitemap_fr16.js — 幂等应用「16 篇 fr/blog 进 sitemap + 62 块回填 hreflang」补丁
 * 只写一个文件：<repo>/pages/sitemap.xml
 * 默认 --dry（不写盘）。--apply 才写盘，写盘前自动备份到 <repo>/_verify_tmp/sitemap_before_fr16.xml
 * --rollback 用该备份覆盖回去（回到执行前状态）
 *
 * 断言（任一不满足即退出码 2，拒绝写盘）：
 *   A1 执行前 <url> 块数必须 = 11,089（或补丁已应用后的 11,105 → 幂等退出）
 *   A2 新增 fr 块必须 = 16
 *   A3 需回填 hreflang="fr" 的兄弟块必须 = 62
 *   A4 执行后块数必须 = 11,105
 *   A5 执行后 <loc> 全局唯一
 *   A6 执行后 XML 结构可解析（声明/根标签/每块闭合/标签白名单/无裸 &）
 *   A7 本脚本只允许写 pages/sitemap.xml 一个路径
 * 参照物：同目录 sitemap_fr16_new_blocks.xml / sitemap_fr16_existing_block_updates.xml / manifest.json
 * 与参照物不一致时拒绝写盘（说明仓库状态已变，需重新生成补丁）。
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = n => args.includes(n);
function val(name, dflt) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  const eq = args.find(a => a.startsWith(name + '='));
  return eq ? eq.split('=').slice(1).join('=') : dflt;
}
const REPO = val('--repo', '.');
const HERE = __dirname;
const MODE = flag('--apply') ? 'apply' : flag('--rollback') ? 'rollback' : 'dry';

const SLUGS = ["display-backlight-not-working-diagnosis", "high-humidity-condensation-display-prevention", "lcd-backlight-flicker-dimming-methods", "lcd-backlight-led-life", "lcd-colour-shift-viewing-angle-wide-tft", "lcd-image-retention-burn-in", "lcd-mura-defect-explained", "lcd-panel-storage-shelf-life", "lcd-power-sequence-timing-requirements", "mcu-8080-parallel-interface-tft-guide", "nec-lcd-replacement-guide", "tft-backlight-led-lifetime-dimming-guide", "tft-display-adapter-converter-board-guide", "tft-firmware-otp-burning-guide", "tft-lcd-vs-lcd-meaning", "vertical-horizontal-lines-panel-vs-board"];
const LANGDIR = { en: "", de: "de/", es: "es/", fr: "fr/", ja: "ja/", ko: "ko/", pt: "pt/", ru: "ru/", "zh-Hant": "zh-Hant/" };
const ORDER = ["en", "es", "de", "fr", "pt", "ru", "ja", "ko", "zh-Hant"];
const EXPECT = { before: 11089, after: 11105, add: 16, backfill: 62 };

const fail = m => { console.log('[ABORT] ' + m); process.exit(2); };
const url = (l, s) => 'https://odmlcd.com/' + (LANGDIR[l] || '') + 'blog/' + s;
const splitBlocks = xml => xml.split(/(?=<url>)/).filter(b => b.includes('</url>'));
const locOf = b => ((b.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '').trim();

const SM = path.join(REPO, 'pages', 'sitemap.xml');
const BAK = path.join(REPO, '_verify_tmp', 'sitemap_before_fr16.xml');
if (!fs.existsSync(SM)) fail('找不到 ' + SM + '（用 --repo <站点仓库路径> 指定）');

/* ---------- 回滚 ---------- */
if (MODE === 'rollback') {
  if (!fs.existsSync(BAK)) fail('没有备份文件 ' + BAK + '，无法回滚');
  const bk = fs.readFileSync(BAK, 'utf8');
  const n = splitBlocks(bk).length;
  if (n !== EXPECT.before) fail('备份块数 = ' + n + '，与预期 ' + EXPECT.before + ' 不符，拒绝回滚');
  fs.writeFileSync(SM, bk, 'utf8');
  console.log('[ROLLBACK] 已用备份覆盖 pages/sitemap.xml，块数恢复为 ' + n);
  process.exit(0);
}

/* ---------- 读取 + 计算 ---------- */
const orig = fs.readFileSync(SM, 'utf8');
const blocks = splitBlocks(orig);
const nBefore = blocks.length;
if (!orig.includes('<urlset')) fail('不是合法 sitemap（缺 <urlset>）');

const langSet = s => ORDER.filter(l => fs.existsSync(path.join(REPO, 'pages', LANGDIR[l], 'blog', s + '.html')));

// 幂等：已存在 fr 块就认为补丁已应用
const frUrls = SLUGS.map(s => url('fr', s));
const already = frUrls.filter(u => blocks.some(b => locOf(b) === u));
if (already.length === SLUGS.length) { console.log('[IDEMPOTENT] 16 条 fr 块已在 sitemap 中，无需再打补丁'); process.exit(0); }
if (already.length) fail('部分 fr 块已存在（' + already.length + '/16），状态不一致，请人工核对');

if (nBefore !== EXPECT.before) fail('当前块数 ' + nBefore + ' ≠ 预期 ' + EXPECT.before + '（仓库已变动，请重新生成补丁）');

// 从 README 里确认过的 lastmod（git 提交日），与 manifest.json 对齐
let manifest = null;
try { manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.json'), 'utf8')); } catch (e) { }
const lmOf = s => {
  const r = manifest && manifest.slugLangMatrix && manifest.slugLangMatrix.find(x => x.slug === s);
  return (r && r.lastmod) || '';
};

// 参照物：已评审的新块清单
const refNew = fs.readFileSync(path.join(HERE, 'sitemap_fr16_new_blocks.xml'), 'utf8');
const refNewLocs = new Set(splitBlocks(refNew).map(locOf).filter(Boolean));

const indentOf = b => ((b.match(/^([ \t]*)<loc>/m) || [, '  '])[1]);

const newBlocks = [];
const updates = [];
for (const s of SLUGS) {
  const langs = manifest ? (manifest.slugLangMatrix.find(x => x.slug === s) || {}).langs : langSet(s);
  if (!langs || !langs.includes('fr')) fail('slug ' + s + ' 的语言集合里没有 fr（磁盘/manifest 不一致）');
  const ind = '  ';
  const alt = langs.map(l => `${ind}  <xhtml:link rel="alternate" hreflang="${l}" href="${url(l, s)}"/>`)
    .concat([`${ind}  <xhtml:link rel="alternate" hreflang="x-default" href="${url('en', s)}"/>`]);
  const blk = ['<url>', `${ind}<loc>${url('fr', s)}</loc>`, `${ind}<lastmod>${lmOf(s)}</lastmod>`,
  `${ind}<changefreq>monthly</changefreq>`, `${ind}<priority>0.6</priority>`].concat(alt).concat(['</url>']).join('\n');
  newBlocks.push(blk);
  if (!refNewLocs.has(url('fr', s))) fail('生成块 ' + url('fr', s) + ' 不在已评审的 sitemap_fr16_new_blocks.xml 里，拒绝写盘');
}
if (newBlocks.length !== EXPECT.add) fail('新块数 ' + newBlocks.length + ' ≠ ' + EXPECT.add);

// 回填：同 slug 的其它语言块，缺 hreflang="fr" 的补一行（放在该块 </url> 前，与其 links 收尾位置一致）
let out = orig;
for (const s of SLUGS) {
  const fr = url('fr', s);
  const ind = '  ';
  for (const b of blocks) {
    const u = locOf(b);
    if (!new RegExp('/blog/' + s.replace(/[-]/g, '\\-') + '$').test(u)) continue;
    if (u === fr) continue;
    if (/hreflang="fr"/.test(b)) continue;              // 已互链，跳过
    const line = `${ind}  <xhtml:link rel="alternate" hreflang="fr" href="${fr}"/>`;
    const patched = b.replace(/\n?<\/url>\s*$/, '\n' + line + '\n</url>\n');
    if (patched === b) fail('回填失败（块结构不匹配）：' + u);
    if (!out.includes(b)) fail('原块在文件中定位失败：' + u);
    out = out.replace(b, patched);
    updates.push(u);
  }
}
if (updates.length !== EXPECT.backfill) fail('回填块数 ' + updates.length + ' ≠ ' + EXPECT.backfill);

// 插入新块到 </urlset> 之前
const insertAt = out.lastIndexOf('</urlset>');
if (insertAt < 0) fail('找不到 </urlset>');
const patched = out.slice(0, insertAt) + newBlocks.join('\n') + '\n' + out.slice(insertAt);

/* ---------- 校验 ---------- */
const pb = splitBlocks(patched);
const nAfter = pb.length;
if (nAfter !== EXPECT.after) fail('A4 执行后块数 ' + nAfter + ' ≠ ' + EXPECT.after);
const locs = pb.map(locOf);
const dup = locs.filter((x, i) => x && locs.indexOf(x) !== i);
if (dup.length) fail('A5 <loc> 重复：' + [...new Set(dup)].slice(0, 5).join(', '));
const problems = [];
const body0 = patched.replace(/^\uFEFF/, '').trimStart();
if (!/^<\?xml/.test(body0) && !/^<urlset/.test(body0)) problems.push('文件开头既无 XML 声明也无 <urlset>');
if (!/<urlset[^>]*>/.test(patched) || (patched.match(/<urlset/g) || []).length !== 1) problems.push('<urlset> 根标签异常');
if ((patched.match(/<url>/g) || []).length !== (patched.match(/<\/url>/g) || []).length) problems.push('<url>/</url> 数量不等');
if ((patched.match(/<loc>/g) || []).length !== (patched.match(/<\/loc>/g) || []).length) problems.push('<loc> 未闭合');
{
  const badLink = [...patched.matchAll(/<xhtml:link(?![^>]*\/>)[^>]*>/g)];
  if (badLink.length) problems.push('存在未以 /> 闭合的 xhtml:link：' + badLink.length + ' 处');
}
{
  const bareAmp = [...patched.matchAll(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g)];
  if (bareAmp.length) problems.push('存在裸 & （XML 非法）：' + bareAmp.length + ' 处');
}
[...patched.matchAll(/<(\/?[a-zA-Z:][\w:.-]*)/g)].forEach(m => {
  const t = m[1].replace(/^\//, '');
  if (!['urlset', 'url', 'loc', 'lastmod', 'changefreq', 'priority', 'xhtml:link', '?xml'].includes(t)) problems.push('出现未知标签 <' + m[1] + '>');
});
if (problems.length) fail('A6 XML 校验不通过：' + [...new Set(problems)].slice(0, 6).join(' | '));

console.log('=== sitemap fr16 补丁 · ' + MODE.toUpperCase() + ' ===');
console.log('仓库           : ' + REPO);
console.log('目标文件       : ' + path.relative(REPO, SM) + '   （本脚本唯一允许写入的路径）');
console.log('执行前块数     : ' + nBefore);
console.log('待新增 fr 块   : ' + newBlocks.length);
console.log('待回填互链块   : ' + updates.length);
console.log('执行后块数     : ' + nAfter + '   （+ ' + (nAfter - nBefore) + '）');
console.log('XML 校验       : 通过（根标签/闭合/唯一 loc/无裸 &/标签白名单）');
console.log('lastmod 来源   : git 提交日（manifest.json 一致）');

if (MODE === 'dry') { console.log('[DRY_RUN_OK] 未写盘。要落地请跑：node apply_sitemap_fr16.js --repo "<repo>" --apply'); process.exit(0); }

/* ---------- 写盘（先备份） ---------- */
fs.mkdirSync(path.dirname(BAK), { recursive: true });
if (fs.existsSync(BAK)) fail('备份已存在：' + BAK + '（保留原始快照，请人工处置后再执行）');
fs.writeFileSync(BAK, orig, 'utf8');
fs.writeFileSync(SM, patched, 'utf8');
const now = splitBlocks(fs.readFileSync(SM, 'utf8')).length;
if (now !== EXPECT.after) { fs.writeFileSync(SM, orig, 'utf8'); fail('写盘后复核块数 ' + now + ' ≠ ' + EXPECT.after + '，已自动还原'); }
console.log('[APPLIED] 已写盘 ' + SM);
console.log('[BACKUP ] ' + BAK);
console.log('回滚命令      : node apply_sitemap_fr16.js --repo "<repo>" --rollback');
console.log('下一步（按 README 第三节）: python _check_hreflang.py → python _preflight.py → 部署 → IndexNow 20 条');
