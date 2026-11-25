const fs = require('fs');
const path = require('path');
const REPO = "C:/Users/admin/WorkBuddy/2026-10-09-14-49-32/site/repo";
const OUT = "C:/Users/admin/.qwenworkcn/workspace/mujf84xstzquapar/bridge_discovery_2026-11-25";
fs.mkdirSync(OUT, { recursive: true });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rfc822 = d => d.toUTCString().replace('GMT', 'GMT');
const CFG = {
  en: { dir: 'blog', seg: '', name: 'feed-en.xml', lang: 'en-us', title: 'RONEN DISPLAY — Industrial TFT LCD Engineering Notes', desc: 'Selection, interface, reliability and supply notes for industrial TFT LCD modules from RONEN DISPLAY (factory-direct manufacturer with our own production base).' },
  fr: { dir: 'blog', seg: 'fr/', name: 'feed-fr.xml', lang: 'fr-fr', title: 'RONEN DISPLAY — Notes d’ingénierie TFT LCD industrielles', desc: 'Sélection, interfaces, fiabilité et approvisionnement des modules TFT LCD industriels RONEN DISPLAY (fabricant en usine propre).' }
};
const report = [];
for (const key of Object.keys(CFG)) {
  const c = CFG[key];
  const dir = path.join(REPO, 'pages', c.seg, c.dir);
  const items = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.html') || /^(category|categories|index)/.test(f)) continue;
    const h = fs.readFileSync(path.join(dir, f), 'utf8');
    if (/<name="robots"[^>]*noindex/i.test(h)) continue;
    const slug = f.replace(/\.html$/, '');
    let title = (h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
    title = title.replace(/\s*\|\s*RONEN.*$/i, '').replace(/\s+/g, ' ').trim();
    if (!title) title = (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || slug;
    title = title.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    let desc = ((h.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || h.match(/<meta[^>]+content="([^"]*)"[^>]+name="description"/i) || [])[1]) || '';
    desc = desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const dm = (h.match(/dateModified[^0-9]{0,10}(\d{4}-\d{2}-\d{2})/i) || [])[1];
    const dp = (h.match(/datePublished[^0-9]{0,10}(\d{4}-\d{2}-\d{2})/i) || [])[1];
    const dateStr = dm || dp;
    if (!title || !desc || !dateStr) continue;      // 缺元数据的不进 feed，避免空条目
    const cat = (h.match(/"articleSection"\s*:\s*"([^"]{2,40})"/i) || [])[1] || (h.match(/<link rel="alternate" type="application\/rdf\+xml"[\s\S]{0,200}/) ? '' : '') || 'Guide';
    const d = new Date(dateStr + 'T09:00:00+08:00');
    items.push({ title, desc, date: d, dateStr, cat, link: 'https://odmlcd.com/' + c.seg + 'blog/' + slug, slug });
  }
  items.sort((a, b) => b.date - a.date);
  const top = items.slice(0, 50);
  const now = rfc822(new Date());
  const site = 'https://odmlcd.com/' + c.seg + 'blog/';
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n';
  xml += '  <title>' + esc(c.title) + '</title>\n';
  xml += '  <link>' + site + '</link>\n';
  xml += '  <description>' + esc(c.desc) + '</description>\n';
  xml += '  <language>' + c.lang + '</language>\n';
  xml += '  <docs>https://www.rssboard.org/rss-specification</docs>\n';
  xml += '  <generator>RONEN DISPLAY static feed builder (2026-11-25)</generator>\n';
  xml += '  <lastBuildDate>' + now + '</lastBuildDate>\n';
  xml += '  <ttl>1440</ttl>\n';
  xml += '  <atom:link href="https://odmlcd.com/' + c.name + '" rel="self" type="application/rss+xml"/>\n';
  for (const it of top) {
    xml += '  <item>\n';
    xml += '    <title>' + esc(it.title) + '</title>\n';
    xml += '    <link>' + it.link + '</link>\n';
    xml += '    <guid isPermaLink="true">' + it.link + '</guid>\n';
    xml += '    <pubDate>' + rfc822(it.date) + '</pubDate>\n';
    xml += '    <category><![CDATA[' + it.cat + ']]></category>\n';
    xml += '    <description>' + esc(it.desc) + '</description>\n';
    xml += '  </item>\n';
  }
  xml += '</channel>\n</rss>\n';
  const f = path.join(OUT, c.name);
  fs.writeFileSync(f, xml, 'utf8');
  const badLinks = top.filter(i => !fs.existsSync(path.join(REPO, 'pages', c.seg, 'blog', i.slug + '.html')));
  const priceHits = (xml.match(/(USD|\$|€|\bprice\b|prix)/gi) || []).length;
  const phoneHits = (xml.match(/(\+86|13537779300|wa\.me|whatsapp)/gi) || []).length;
  report.push({ lang: key, file: c.name, eligible: items.length, written: top.length, oldest: top[top.length - 1] && top[top.length - 1].dateStr, newest: top[0] && top[0].dateStr, bytes: fs.statSync(f).size, badLinks: badLinks.length, priceHits, phoneHits });
  console.log(key + ': 合格文章 ' + items.length + ' → 写入 ' + top.length + ' 条，日期区间 ' + (top[top.length - 1] || {}).dateStr + ' ~ ' + (top[0] || {}).dateStr + '，' + fs.statSync(f).size + ' 字节，死链 ' + badLinks.length + '，价格词 ' + priceHits + '，电话/WhatsApp 词 ' + phoneHits);
}
fs.writeFileSync(path.join(OUT, 'feed_report.json'), JSON.stringify(report, null, 1), 'utf8');
