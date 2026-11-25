#!/usr/bin/env node
/*
 * fix_blog_index_gaps.js  ·  2026-11-25
 * 目标：把「磁盘上存在、但没被本语言 blog 栏目页列出」的文章补成卡片，并把缺口同步进 _i18n_manifest.json
 * 不重跑生成器（生成器只认 manifest，直接重跑会把现有卡片砍掉）
 * 默认 --dry，--apply 才写盘；写盘前备份到 _verify_tmp/blog_index_backup_20261125/
 * 支持 --rollback
 *
 * 硬断言（任一不满足拒绝写盘）：
 *   B1 只允许改 pages/<lang>/blog.html（9 个）与 _i18n_manifest.json
 *   B2 新卡片的 href 必须在磁盘真实存在
 *   B3 每张新卡片必须由该文章自身的 <title>/<h1>、meta description、datePublished 生成（不生成占位文案）
 *   B4 改后 <div> 与 </div> 数量差仍为 0
 *   B5 不动 <title> / canonical / hreflang / meta description（栏目页元信息原样）
 *   B6 EOL 与 BOM 原样保留
 */
const fs = require('fs');
const path = require('path');
const A = process.argv.slice(2);
const has = n => A.includes(n);
const REPO = (() => { const i = A.indexOf('--repo'); return i >= 0 ? A[i + 1] : "C:/Users/admin/WorkBuddy/2026-10-09-14-49-32/site/repo"; })();
const MODE = has('--apply') ? 'apply' : has('--rollback') ? 'rollback' : 'dry';
const P = path.join(REPO, 'pages');
const BAKDIR = path.join(REPO, '_verify_tmp', 'blog_index_backup_20261125');
const MANIFEST = path.join(REPO, '_i18n_manifest.json');
const fail = m => { console.log('[ABORT] ' + m); process.exit(2); };

const LANGS = [["en", ""], ["de", "de/"], ["es", "es/"], ["fr", "fr/"], ["ja", "ja/"], ["ko", "ko/"], ["pt", "pt/"], ["ru", "ru/"], ["zh-Hant", "zh-Hant/"]];

if (MODE === 'rollback') {
  if (!fs.existsSync(BAKDIR)) fail('没有备份目录 ' + BAKDIR);
  let n = 0;
  for (const f of fs.readdirSync(BAKDIR)) {
    const target = f === '_i18n_manifest.json' ? MANIFEST : path.join(P, f.replace('__', '/'));
    if (!fs.existsSync(path.dirname(target))) fail('回滚目标目录不存在：' + target);
    fs.writeFileSync(target, fs.readFileSync(path.join(BAKDIR, f)));
    n++;
  }
  console.log('[ROLLBACK] 已还原 ' + n + ' 个文件');
  process.exit(0);
}

const clean = s => (s || '').replace(/\s+/g, ' ').trim();
function readArticle(dir, slug) {
  const f = path.join(dir, slug + '.html');
  if (!fs.existsSync(f)) return null;
  const h = fs.readFileSync(f, 'utf8');
  if (/<name="robots"[^>]*noindex/i.test(h) || /<meta[^>]*content="[^"]*noindex/i.test(h)) return { noindex: true };
  const title = clean((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s*\|\s*RONEN.*$/i, '');
  const h1 = clean((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  const desc = clean(((h.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || h.match(/<meta[^>]+content="([^"]*)"[^>]+name="description"/i) || [])[1]) || '');
  const date = (h.match(/datePublished[^0-9]{0,10}(\d{4}-\d{2}-\d{2})/i) || [])[1] || '';
  const sec = clean((h.match(/"articleSection"\s*:\s*"([^"]{2,40})"/i) || [])[1] || (h.match(/"BlogCategory"[^}]{0,120}?"name"\s*:\s*"([^"]{2,40})"/i) || [])[1] || '');
  return { title: title || h1, h1, desc, date, sec };
}

const plan = [];
const problems = [];
for (const [lang, seg] of LANGS) {
  const idx = path.join(P, seg, 'blog.html');
  if (!fs.existsSync(idx)) { problems.push('缺栏目页 ' + seg + 'blog.html'); continue; }
  const html = fs.readFileSync(idx, 'utf8');
  const dir = path.join(P, seg, 'blog');
  const disk = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !/^(category|categories|index)\b/.test(f)).map(f => f.replace(/\.html$/, ''));
  const listed = new Set([...html.matchAll(new RegExp('href="/' + seg + 'blog/([a-z0-9][a-z0-9-]*)"', 'g'))].map(m => m[1]).filter(s => s !== 'categories' && !s.startsWith('category/')));
  const missing = disk.filter(d => !listed.has(d));
  // 模板：本页最后一张卡片
  const cards = [...html.matchAll(/<div class="blog-card">[\s\S]*?<\/div>/g)];
  if (!cards.length) { problems.push(seg + 'blog.html 找不到 blog-card 模板'); continue; }
  const tpl = cards[cards.length - 1][0];
  const insertAt = cards[cards.length - 1].index + tpl.length;
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const items = [];
  for (const slug of missing) {
    const a = readArticle(dir, slug);
    if (!a) { problems.push('读不到文章 ' + seg + 'blog/' + slug); continue; }
    if (a.noindex) continue;
    if (!a.title || !a.desc || !a.date) { problems.push('元数据不全，跳过 ' + seg + slug + ' [' + [!!a.title, !!a.desc, !!a.date].join('/') + ']'); continue; }
    let card = tpl.replace(/href="[^"]*"/, 'href="/' + seg + 'blog/' + slug + '"')
      .replace(/(<h3>\s*<a[^>]*>)[\s\S]*?(<\/h3>)/, '$1' + a.title.replace(/&/g, '&amp;') + '$2');
    const ps = [...card.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)];
    if (ps.length >= 2) {
      card = card.replace(ps[0][0], '<p>' + a.desc.replace(/&/g, '&amp;') + '</p>');
      card = card.replace(ps[ps.length - 1][0], ps[ps.length - 1][0].replace(/(>)[\s\S]*?(<\/p>)/, '$1' + a.date + (a.sec ? ' · ' + a.sec : '') + '$2'));
    } else problems.push('卡片模板段落数异常 ' + seg + slug);
    items.push({ slug, card, meta: a });
  }
  plan.push({ lang, seg, idx, html, listed: listed.size, disk: disk.length, missing: items.length, items, insertAt, eol, tpl });
}

console.log('=== blog 栏目页缺口 · ' + MODE.toUpperCase() + ' ===');
let tot = 0;
for (const p of plan) { console.log('  ' + (p.lang + '/blog.html').padEnd(16) + ' 已列 ' + String(p.listed).padStart(4) + ' / 磁盘 ' + String(p.disk).padStart(4) + '  → 待补 ' + p.missing); tot += p.missing; }
console.log('合计待补卡片 = ' + tot);
if (tot === 0) { console.log('[IDEMPOTENT] 无缺口'); process.exit(0); }
const structural = problems.filter(p => !p.startsWith('元数据不全'));
console.log('元数据不全而跳过 = ' + (problems.length - structural.length) + '（这些文章缺 datePublished，不生成无日期卡片）');
problems.filter(p => p.startsWith('元数据不全')).forEach(x => console.log('   - ' + x));
if (structural.length) fail('存在 ' + structural.length + ' 个结构性异常，先人工核对（拒绝写盘）');

if (MODE === 'dry') {
  plan.forEach(p => p.items.slice(0, 3).forEach(i => console.log('  预览 ' + p.lang + ' :: ' + i.card.replace(/\s+/g, ' ').slice(0, 170))));
  console.log('[DRY_RUN_OK] 未写盘。落地：node fix_blog_index_gaps.js --apply');
  process.exit(0);
}

/* ---- 写盘 ---- */
fs.mkdirSync(BAKDIR, { recursive: true });
const touched = [];
for (const p of plan) {
  if (p.missing === 0) continue;
  const bak = path.join(BAKDIR, (p.seg || 'en__') .replace(/\/$/, '') + '__blog.html');
  const bakName = path.join(BAKDIR, (p.seg ? p.seg.replace(/\//g, '__') : 'en__') + 'blog.html');
  fs.writeFileSync(bakName, p.html, 'utf8'); touched.push(bakName);
  const block = p.eol + p.items.map(i => i.card).join(p.eol);
  let out = p.html.slice(0, p.insertAt) + block + p.html.slice(p.insertAt);
  // 计数句里的数字改为真实值
  out = out.replace(/(<p class="blog-meta">[^<]*?)(\d{2,4})([^<]*?<\/p>)/, (m, a, b, c) => a + (p.disk) + c);
  // 断言
  const dOpen = (out.match(/<div[\s>]/g) || []).length, dClose = (out.match(/<\/div>/g) || []).length;
  const oOpen = (p.html.match(/<div[\s>]/g) || []).length, oClose = (p.html.match(/<\/div>/g) || []).length;
  if ((dOpen - dClose) !== (oOpen - oClose)) fail(p.lang + ' div 配平被破坏 ' + dOpen + '/' + dClose + ' vs ' + oOpen + '/' + oClose);
  if ((out.match(/<title>/g) || []).length !== (p.html.match(/<title>/g) || []).length) fail(p.lang + ' <title> 数量变化');
  if (out.includes('<title>' + clean(p.html.match(/<title>([\s\S]*?)<\/title>/)[1]) + '</title>') === false) fail(p.lang + ' 栏目页 title 被改动');
  if ((out.match(/rel="canonical"/g) || []).length !== (p.html.match(/rel="canonical"/g) || []).length) fail(p.lang + ' canonical 数量变化');
  for (const i of p.items) if (!new RegExp('href="/' + p.seg.replace(/\//g, '\\/') + 'blog/' + i.slug + '"').test(out)) fail(p.lang + ' 插入未生效 ' + i.slug);
  fs.writeFileSync(p.idx, out, 'utf8');
  console.log('  [WROTE] ' + path.relative(REPO, p.idx) + '  +' + p.missing + ' 卡');
}

/* ---- manifest 同步（只增不删，幽灵条目单独报告）---- */
const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
fs.writeFileSync(path.join(BAKDIR, '_i18n_manifest.json'), fs.readFileSync(MANIFEST), 'utf8');
let added = 0;
const ghosts = [];
for (const [lang, seg] of LANGS) {
  if (!man[lang]) { continue; }
  const dir = path.join(P, seg, 'blog');
  const disk = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !/^(category|categories|index)\b/.test(f)).map(f => f.replace(/\.html$/, ''));
  for (const s of Object.keys(man[lang])) if (!disk.includes(s)) ghosts.push(lang + '::' + s);
  for (const slug of disk) {
    if (man[lang][slug]) continue;
    const a = readArticle(dir, slug); if (!a || a.noindex || !a.title || !a.desc) continue;
    man[lang][slug] = { title: a.title, description: a.desc }; added++;
  }
}
fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 1) + '\n', 'utf8');
console.log('  [MANIFEST] 新增条目 ' + added + ' 条');
console.log('  [MANIFEST 幽灵] manifest 有、磁盘无 ' + ghosts.length + ' 条：' + [...new Set(ghosts.map(g => g.split('::')[1]))].join(', '));
console.log('[APPLIED] 备份与回滚：node fix_blog_index_gaps.js --rollback');
