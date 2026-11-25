#!/usr/bin/env node
/*
 * fix_fr_deadlinks_20261125.js — 修 3 处硬 404（今天新增的 fr 文章内的 related 卡片链接）
 * 只改 href 目标，不动锚文本、标题、canonical、schema。默认 --dry，--apply 写盘，自动备份。
 */
const fs = require('fs');
const path = require('path');
const A = process.argv.slice(2);
const REPO = (() => { const i = A.indexOf('--repo'); return i >= 0 ? A[i + 1] : "C:/Users/admin/WorkBuddy/2026-10-09-14-49-32/site/repo"; })();
const MODE = A.includes('--apply') ? 'apply' : 'dry';
const BAK = path.join(REPO, '_verify_tmp', 'fr_deadlink_backup_20261125');
const fix = (p, from, to) => ({ p, from, to });

const MAP = [
  fix('pages/fr/blog/tft-display-adapter-converter-board-guide.html', 'href="/landings/display-adapter-board"', 'href="/fr/solutions/display-adapter-board"'),
  fix('pages/fr/blog/tft-firmware-otp-burning-guide.html', 'href="/landings/custom-displays"', 'href="/fr/custom-displays"'),
  fix('pages/fr/blog/tft-lcd-vs-lcd-meaning.html', 'href="/landings/lcd-module-comparison"', 'href="/fr/landings/industrial-lcd-module-comparison"')
];

let touched = 0, miss = 0;
const jobs = [];
for (const m of MAP) {
  const f = path.join(REPO, m.p);
  if (!fs.existsSync(f)) { console.log('  ! 文件不存在 ' + m.p); miss++; continue; }
  const h = fs.readFileSync(f, 'utf8');
  const n = h.split(m.from).length - 1;
  if (n !== 1) { console.log('  ! 命中数=' + n + '（预期 1）' + m.p); miss++; continue; }
  const targetFile = path.join(REPO, 'pages', m.to.replace('href="', '/').replace('"', '').slice(1) + '.html');
  if (!fs.existsSync(targetFile)) { console.log('  ! 新目标在磁盘不存在：' + m.to); miss++; continue; }
  jobs.push({ f, h, m, n, bytes: h.length });
  console.log('  ' + (MODE === 'dry' ? '将替换' : '已替换') + ' 1 处  ' + m.p + '\n       ' + m.from + '\n    -> ' + m.to + '   （目标文件存在 ✓）');
}
if (miss) { console.log('[ABORT] 有 ' + miss + ' 项异常，未写盘'); process.exit(2); }
console.log('可修复 ' + jobs.length + ' 处 / 需改文件 ' + jobs.length + ' 个');
if (MODE === 'dry') { console.log('[DRY_RUN_OK] 落地：node fix_fr_deadlinks_20261125.js --apply'); process.exit(0); }

fs.mkdirSync(BAK, { recursive: true });
for (const j of jobs) {
  const name = path.relative(path.join(REPO, 'pages'), j.f).replace(/[\\/]/g, '__');
  fs.writeFileSync(path.join(BAK, name), j.h, 'utf8');
  const out = j.h.replace(j.m.from, j.m.to);
  if (out.length !== j.h.length + (j.m.to.length - j.m.from.length)) { console.log('[ABORT] 字节差不符，未写盘 ' + j.f); process.exit(2); }
  if ((out.match(/<title>/g) || []).length !== 1) { console.log('[ABORT] title 异常 ' + j.f); process.exit(2); }
  fs.writeFileSync(j.f, out, 'utf8');
  touched++;
  console.log('  [WROTE] ' + path.relative(REPO, j.f) + '  备份 _verify_tmp/fr_deadlink_backup_20261125/' + name);
}
console.log('[APPLIED] 共写盘 ' + touched + ' 个文件');
