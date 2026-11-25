#!/usr/bin/env node
/*
 * fix_fr_stock_phrase_20261125.js — 清 2 处法语静态库存宣称（"maintenus en stock"）
 * 口径对齐站内既有合规译法：改为「列入目录 / 属常规供货 programme」，不写库存、不写数量。
 * 精确字节串替换，保 BOM/CRLF；默认 --dry。
 */
const fs = require('fs');
const path = require('path');
const A = process.argv.slice(2);
const REPO = (() => { const i = A.indexOf('--repo'); return i >= 0 ? A[i + 1] : "C:/Users/admin/WorkBuddy/2026-10-09-14-49-32/site/repo"; })();
const MODE = A.includes('--apply') ? 'apply' : 'dry';
const BAK = path.join(REPO, '_verify_tmp', 'fr_stock_backup_20261125');
const RULES = [
  ['pages/fr/blog/display-backlight-not-working-diagnosis.html',
   'les mod\u00e8les standard sont maintenus en stock, donc une unit\u00e9 de comparaison identique peut \u00eatre organis\u00e9e',
   'les mod\u00e8les standard figurent \u00e0 notre catalogue, donc une unit\u00e9 de comparaison identique peut \u00eatre organis\u00e9e'],
  ['pages/fr/blog/nec-lcd-replacement-guide.html',
   'mod\u00e8les et pi\u00e8ces standard restent maintenus en stock, les sujets de certification et de prix \u00e9tant trait\u00e9s au cas par cas',
   'mod\u00e8les et pi\u00e8ces standard font partie de notre programme, les sujets de certification et de prix \u00e9tant trait\u00e9s au cas par cas']
];
const fail = m => { console.log('[ABORT] ' + m); process.exit(2); };
let n = 0;
for (const [rel, oldS, newS] of RULES) {
  const f = path.join(REPO, rel);
  if (!fs.existsSync(f)) fail('缺文件 ' + rel);
  const b = fs.readFileSync(f);
  const h = b.toString('utf8');
  const hits = h.split(oldS).length - 1;
  console.log('  ' + rel + '  命中=' + hits + '  新串长度差=' + (newS.length - oldS.length));
  if (hits !== 1) fail('命中数应为 1，实际 ' + hits + '：' + rel);
  const out = h.replace(oldS, newS);
  if (out.includes('en stock')) fail('替换后仍残留 en stock：' + rel);
  if (!out.includes(newS)) fail('新串未写入：' + rel);
  if (out.length !== h.length + (newS.length - oldS.length)) fail('字节差不符：' + rel);
  if (MODE === 'apply') {
    fs.mkdirSync(BAK, { recursive: true });
    fs.writeFileSync(path.join(BAK, path.basename(rel)), b);
    fs.writeFileSync(f, out, 'utf8');
    console.log('    [WROTE] ' + rel + '  备份 _verify_tmp/fr_stock_backup_20261125/');
  }
  n++;
}
console.log((MODE === 'dry' ? '[DRY_RUN_OK] 计划修 ' : '[APPLIED] 已修 ') + n + ' 处');
