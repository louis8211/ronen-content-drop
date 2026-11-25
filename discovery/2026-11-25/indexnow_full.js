const fs = require('fs');
const cp = require('child_process');
const REPO = "C:/Users/admin/WorkBuddy/2026-10-09-14-49-32/site/repo";
const KEY = '9551725edf3ffbbd4d8a06946abfcb4f';
const xml = fs.readFileSync(REPO + '/pages/sitemap.xml', 'utf8');
const locs = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim()))].filter(u => /^https:\/\/odmlcd\.com\//.test(u));
const SIZE = 1000;
const batches = [];
for (let i = 0; i < locs.length; i += SIZE) batches.push(locs.slice(i, i + SIZE));
console.log('URL 总数=' + locs.length + ' 批次数=' + batches.length + '（每批 ≤' + SIZE + '）');
const EP = [['api.indexnow.org', 'https://api.indexnow.org/indexnow'], ['www.bing.com', 'https://www.bing.com/indexnow']];
const results = {};
for (const [name, ep] of EP) results[name] = [];
const UA = 'Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36';
batches.forEach((b, i) => {
  const f = 'C:/Users/admin/.qwenworkcn/workspace/mujf84xstzquapar/_in_batch_' + i + '.json';
  fs.writeFileSync(f, JSON.stringify({ host: 'odmlcd.com', key: KEY, keyLocation: 'https://odmlcd.com/' + KEY + '.txt', urlList: b }), 'utf8');
});
for (const [name, ep] of EP) {
  for (let i = 0; i < batches.length; i++) {
    let code = '';
    for (let t = 0; t < 2; t++) {
      try {
        code = cp.execSync('curl -s -o NUL -m 120 -X POST -H "Content-Type: application/json; charset=utf-8" -A "' + UA + '" -w "%{http_code}" --data @C:/Users/admin/.qwenworkcn/workspace/mujf84xstzquapar/_in_batch_' + i + '.json ' + ep, { encoding: 'utf8', shell: 'cmd.exe' }).trim();
      } catch (e) { code = 'ERR'; }
      if (code === '200' || code === '202') break;
      // 429/5xx 退避一次
      cp.execSync('ping -n 6 127.0.0.1 > NUL', { shell: 'cmd.exe' });
    }
    results[name].push(code);
    console.log('  ' + name + ' 批次 ' + (i + 1) + '/' + batches.length + ' (' + batches[i].length + ' 条) -> ' + code);
  }
}
const summary = {};
for (const k in results) summary[k] = results[k].reduce((m, c) => (m[c] = (m[c] || 0) + 1, m), {});
console.log('=== 汇总 ===');
for (const k in summary) console.log('  ' + k + ': ' + JSON.stringify(summary[k]));
fs.writeFileSync('C:/Users/admin/.qwenworkcn/workspace/mujf84xstzquapar/_indexnow_full_report.json', JSON.stringify({ urls: locs.length, batches: batches.length, results }, null, 1), 'utf8');
