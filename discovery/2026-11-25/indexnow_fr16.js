const fs = require('fs');
const cp = require('child_process');
const KEY = '9551725edf3ffbbd4d8a06946abfcb4f';
const REPO = "C:/Users/admin/WorkBuddy/2026-10-09-14-49-32/site/repo";
const SLUGS = ["display-backlight-not-working-diagnosis", "high-humidity-condensation-display-prevention", "lcd-backlight-flicker-dimming-methods", "lcd-backlight-led-life", "lcd-colour-shift-viewing-angle-wide-tft", "lcd-image-retention-burn-in", "lcd-mura-defect-explained", "lcd-panel-storage-shelf-life", "lcd-power-sequence-timing-requirements", "mcu-8080-parallel-interface-tft-guide", "nec-lcd-replacement-guide", "tft-backlight-led-lifetime-dimming-guide", "tft-display-adapter-converter-board-guide", "tft-firmware-otp-burning-guide", "tft-lcd-vs-lcd-meaning", "vertical-horizontal-lines-panel-vs-board"];
const fr = SLUGS.map(s => 'https://odmlcd.com/fr/blog/' + s);
const pt = ["lcd-image-retention-burn-in", "vertical-horizontal-lines-panel-vs-board", "mcu-8080-parallel-interface-tft-guide", "tft-backlight-led-lifetime-dimming-guide"].map(s => 'https://odmlcd.com/pt/blog/' + s);
const idx = ['', 'de/', 'es/', 'fr/', 'ja/', 'ko/', 'pt/', 'ru/', 'zh-Hant/'].map(l => 'https://odmlcd.com/' + l + 'blog');
const urls = [...new Set([...fr, ...pt, ...idx])];
const UA = 'Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36';
function curl(args) { return cp.execSync('curl ' + args.map(a => '"' + a.replace(/"/g, '\\"') + '"').join(' '), { encoding: 'utf8', shell: 'cmd.exe' }); }
console.log('待推 URL = ' + urls.length + '（fr 16 + pt 4 + 栏目页 9）');
for (let i = 0; i < 4; i++) {
  const u = urls[i];
  const code = curl(['-s', '-o', 'NUL', '-m', '40', '-A', UA, '-w', '%{http_code}', 'https://api.indexnow.org/indexnow?url=' + encodeURIComponent(u) + '&key=' + KEY]);
  console.log('  试探 GET ' + u.replace('https://odmlcd.com', '') + ' -> ' + code);
}
const bodyFile = 'C:/Users/admin/.qwenworkcn/workspace/mujf84xstzquapar/_indexnow_body.json';
fs.writeFileSync(bodyFile, JSON.stringify({ host: 'odmlcd.com', key: KEY, keyLocation: 'https://odmlcd.com/' + KEY + '.txt', urlList: urls }, null, 1), 'utf8');
const post = curl(['-s', '-o', 'C:/Users/admin/.qwenworkcn/workspace/mujf84xstzquapar/_indexnow_resp.txt', '-m', '90', '-X', 'POST', '-H', 'Content-Type: application/json; charset=utf-8', '-A', UA, '-w', 'api.indexnow.org=%{http_code}', '--data', '@' + bodyFile, 'https://api.indexnow.org/indexnow']);
console.log('  POST api.indexnow.org -> ' + post.trim());
console.log('  响应体: ' + fs.readFileSync('C:/Users/admin/.qwenworkcn/workspace/mujf84xstzquapar/_indexnow_resp.txt', 'utf8').slice(0, 200));
for (const [name, ep] of [['bing', 'https://www.bing.com/indexnow'], ['seznam', 'https://search.seznam.cz/indexnow'], ['yandex', 'https://yandex.com/indexnow']]) {
  const r = curl(['-s', '-o', 'NUL', '-m', '60', '-X', 'POST', '-H', 'Content-Type: application/json; charset=utf-8', '-A', UA, '-w', '%{http_code}', '--data', '@' + bodyFile, ep]);
  console.log('  POST ' + name + ' -> ' + r.trim());
}
