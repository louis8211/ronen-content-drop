#!/usr/bin/env node
/*
 * fix_hreflang_reciprocity.js · 2026-11-25
 * 输入：_check_hreflang.py 的 WRONG 行（"WRONG <file> missing-hreflang-<lang>"）
 * 动作：在该页 head 内最后一条 rel=alternate hreflang 之后补一行缺失互链
 * 约束：目标语言页必须在磁盘真实存在；只补 link，不动 title/canonical/正文；默认 --dry
 */
const fs = require('fs');
const path = require('path');
const A = process.argv.slice(2);
const REPO = (() => { const i = A.indexOf('--repo'); return i >= 0 ? A[i + 1] : "C:/Users/admin/WorkBuddy/2026-10-09-14-49-32/site/repo"; })();
const REPORT = (() => { const i = A.indexOf('--report'); return i >= 0 ? A[i + 1] : "C:/Users/admin/.qwenworkcn/workspace/mujf84xstzquapar/_hreflang_full.txt"; })();
const MODE = A.includes('--apply') ? 'apply' : A.includes('--rollback') ? 'rollback' : 'dry';
const BAK = path.join(REPO, '_verify_tmp', 'hreflang_recip_backup_20261125');
const LANGDIR = { en: "", de: "de/", es: "es/", fr: "fr/", ja: "ja/", ko: "ko/", pt: "pt/", ru: "ru/", "zh-Hant": "zh-Hant/" };
const fail = m => { console.log('[ABORT] ' + m); process.exit(2); };

if (MODE === 'rollback') {
  if (!fs.existsSync(BAK)) fail('无备份目录');
  let n = 0;
  for (const f of fs.readdirSync(BAK)) {
    const t = path.join(REPO, 'pages', f.replace(/__/, '/').replace(/___/g, '/'));
    if (!fs.existsSync(path.dirname(t))) fail('回滚目标目录不存在 ' + t);
    fs.writeFileSync(t, fs.readFileSync(path.join(BAK, f))); n++;
  }
  console.log('[ROLLBACK] 还原 ' + n + ' 个文件'); process.exit(0);
}

const txt = fs.readFileSync(REPORT, 'utf8');
const errs = [...txt.matchAll(/WRONG\s+(\S+\.html)\s+missing-hreflang-([A-Za-z-]+)/g)].map(m => ({ file: m[1].replace(/^pages\//, ''), lang: m[2] }));
if (!errs.length) { console.log('[IDEMPOTENT] 报告里没有 WRONG 行'); process.exit(0); }
console.log('待修 WRONG = ' + errs.length + ' 处');

const jobs = [];
for (const e of errs) {
  const fp = path.join(REPO, 'pages', e.file);
  if (!fs.existsSync(fp)) fail('文件不存在 ' + e.file);
  const h = fs.readFileSync(fp, 'utf8');
  if (new RegExp('hreflang="' + e.lang + '"').test(h)) { console.log('  已存在，跳过 ' + e.file); continue; }
  // 目标 URL：本页 slug 换到缺失语言目录
  const rel = e.file.replace(/\\/g, '/');
  const m = rel.match(/^(?:(de|es|fr|ja|ko|pt|ru|zh-Hant)\/)?(blog|landings|products|solutions|tools)\/(.+)\.html$/);
  if (!m) fail('无法解析页面路径 ' + rel);
  const kind = m[2], slug = m[3];
  let targetFile, targetUrl;
  if (kind === 'blog') { targetFile = path.join(REPO, 'pages', LANGDIR[e.lang], 'blog', slug + '.html'); targetUrl = 'https://odmlcd.com/' + (LANGDIR[e.lang] || '') + 'blog/' + slug; }
  else { targetFile = path.join(REPO, 'pages', LANGDIR[e.lang], kind, slug + '.html'); targetUrl = 'https://odmlcd.com/' + (LANGDIR[e.lang] || '') + kind + '/' + slug; }
  if (!fs.existsSync(targetFile) && e.lang !== 'en') fail('目标页不存在，拒绝补幽灵互链：' + targetUrl);
  const links = [...h.matchAll(/<link[^>]+rel="alternate"[^>]*hreflang="[^"]+"[^>]*>/g)];
  if (!links.length) fail('页面没有任何 hreflang 组：' + rel);
  const last = links[links.length - 1];
  const indent = (h.slice(Math.max(0, last.index - 200), last.index).match(/[\n]( *)[^\n]*$/) || [, '  '])[1];
  const line = '\n' + indent + '<link rel="alternate" hreflang="' + e.lang + '" href="' + targetUrl + '">';
  jobs.push({ fp, rel, h, insertAt: last.index + last[0].length, line, e });
}
let tot = 0;
for (const j of jobs) { console.log('  +' + j.e.lang + ' → ' + j.rel + '\n      ' + j.line.trim()); tot++; }
console.log('计划补 ' + tot + ' 行 / 影响文件 ' + new Set(jobs.map(j => j.rel)).size + ' 个');
if (!tot) { console.log('[IDEMPOTENT] 无需改动'); process.exit(0); }
if (MODE === 'dry') { console.log('[DRY_RUN_OK] 未写盘。落地：node fix_hreflang_reciprocity.js --apply'); process.exit(0); }

fs.mkdirSync(BAK, { recursive: true });
const byFile = {};
for (const j of jobs) (byFile[j.fp] = byFile[j.fp] || []).push(j);
for (const fp of Object.keys(byFile)) {
  let h = fs.readFileSync(fp, 'utf8');
  const orig = h;
  const list = byFile[fp].sort((a, b) => b.insertAt - a.insertAt);
  for (const j of list) h = h.slice(0, j.insertAt) + j.line + h.slice(j.insertAt);
  for (const j of list) {
    if (!h.includes('hreflang="' + j.e.lang + '"')) fail('插入未生效 ' + fp + ' 缺 ' + j.e.lang);
  }
  const expectDelta = list.reduce((s, j) => s + j.line.length, 0);
  if (h.length - orig.length !== expectDelta) fail('字节差不符 ' + fp + ' 实际' + (h.length - orig.length) + ' 期望' + expectDelta);
  if ((h.match(/<title>/g) || []).length !== (orig.match(/<title>/g) || []).length) fail('title 数量变化 ' + fp);
  if ((h.match(/rel="canonical"/g) || []).length !== (orig.match(/rel="canonical"/g) || []).length) fail('canonical 数量变化 ' + fp);
  const name = path.relative(path.join(REPO, 'pages'), fp).replace(/[\\/]/g, '__');
  fs.writeFileSync(path.join(BAK, name), orig, 'utf8');
  fs.writeFileSync(fp, h, 'utf8');
  console.log('  [WROTE] ' + path.relative(REPO, fp) + '  +' + list.length + ' 行  备份 ' + name);
}
console.log('[APPLIED] 完成，复跑 python _check_hreflang.py 验证 wrong=0');
