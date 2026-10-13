import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { escapeHTML, loadLangNotes, loadNotes, palette, renderLine, renderSite, root, validateSheet } from '../scripts/build.mjs';

const data = loadNotes();
const html = readFileSync(resolve(root, 'ap-world.html'), 'utf8');
assert.equal(html, renderSite(data), 'checked-in HTML exactly matches reproducible build');
assert.equal(data.flatMap(unit => unit.topics).length, 14);
assert.equal((html.match(/<article /g) ?? []).length, 28);
assert.equal((html.match(/class="note"/g) ?? []).length, 672);
assert.equal(readFileSync(resolve(root, 'CNAME'), 'utf8').trim(), 'www.joltlined.com');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'unique IDs');
const links = [...html.matchAll(/\shref="([^"]+)"/g)].map(match => match[1]);
links.forEach(link => {
  if (['index.html', 'ap-lang.html', 'ap-world.html', 'algebra-2.html', 'out-of-my-mind.html'].includes(link)) return assert.ok(existsSync(resolve(root, link)));
  if (link.startsWith('#')) return assert.ok(ids.includes(link.slice(1)), `fragment ${link}`);
  if (link.startsWith('notes/')) return assert.match(link, /^notes\/unit-[12]\/(Colored\/)?[12]\.[1-7]-[a-z-]+\.txt$/);
  assert.match(link, /^data:text\/plain;charset=utf-8;base64,[A-Za-z0-9+/]+=*$/);
});
const downloads = links.filter(link => link.startsWith('data:'));
const files = links.filter(link => link.startsWith('notes/'));
assert.equal(downloads.length, 28);
assert.equal(files.length, 28);
data.flatMap((unit, index) => unit.topics.flatMap(topic => ['', 'Colored'].map(folder => {
  return { href: `notes/unit-${index + 1}/${folder ? `${folder}/` : ''}${topic.file}.txt`, bytes: Buffer.from(folder ? topic.colored : topic.original) };
}))).forEach((file, index) => {
  assert.equal(files[index], file.href, 'actual relative anchor target');
  assert.ok(existsSync(resolve(root, files[index])), `file ${files[index]}`);
  assert.deepEqual(readFileSync(resolve(root, files[index])), file.bytes);
  assert.deepEqual(Buffer.from(downloads[index].split(',')[1], 'base64'), file.bytes);
});
assert.doesNotMatch(html, /<(script|link|iframe|img|object|embed)\b|\son\w+\s*=|@import|url\s*\(/i, 'no executable or remote resources');
assert.deepEqual(palette, { g: '#168438', li: '#79c900', pu: '#883ac2', br: '#92552f', y: '#ebc600', r: '#df3034', db: '#173f88', p: '#ed8eb4', lb: '#59b8e7', hp: '#ec228c', pen: '#62615e' });
Object.entries(palette).forEach(([token, hex]) => assert.ok(html.includes(`--${token}: ${hex};`)));
assert.equal(escapeHTML('<script>"&\'</script>'), '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
assert.equal(renderLine('(pen)<script>alert("&")</script>'), '&lt;script&gt;alert(&quot;&amp;&quot;)&lt;/script&gt;');
const first = data[0].topics[0];
assert.throws(() => validateSheet(first.original, first.colored.replace('(pen)', '(oops)'), 'bad'), /equality|markers/);
assert.throws(() => validateSheet(first.original + '\n', first.colored, 'bad'), /equality/);
assert.throws(() => validateSheet(first.original, first.colored.replace(/\((g|li|p|hp|r|pu)\)/, '(lb)'), 'bad'), /title|matching/);
console.log('PASS: 14 topics, 28 pages, 48 lines/topic, 24 lines/page, max 65 characters, stripped equality, marker/punctuation/reset rules, max two colors, full uniform titles, Overview equality, safe HTML, 28 embedded downloads, 28 relative file anchors with exact bytes, fragments, exact reproducibility, CNAME.');
const lang = loadLangNotes();
const langHTML = readFileSync(resolve(root, 'ap-lang.html'), 'utf8');
assert.equal(langHTML, renderSite([], lang), 'AP Lang reproducible build');
assert.deepEqual(Buffer.from(lang.source), readFileSync(resolve(root, 'notes/ap-lang.txt')), 'exact source bytes');
assert.deepEqual(Buffer.from(lang.colored), readFileSync(resolve(root, 'notes/Colored/ap-lang.txt')), 'exact colored bytes');
assert.doesNotMatch(lang.source, /[^\x00-\x7f]|\r/, 'AP Lang ASCII and LF only');
assert.doesNotMatch(lang.colored, /[^\x00-\x7f]|\r/, 'AP Lang colored ASCII and LF only');
const langLines = lang.source.replace(/\n$/, '').split('\n');
const langColoredLines = lang.colored.replace(/\n$/, '').split('\n');
assert.equal(langLines.length, 96);
assert.equal(langColoredLines.length, 96);
assert.equal(lang.colored.replace(/\(([a-z]+)\)/g, ''), lang.source, 'exact stripped equality including final newline');
langLines.forEach((line, index) => {
  assert.ok(line.length <= 65 && /^(o |-> )\S/.test(line) && line.trim() === line, 'AP Lang prefixes, trimmed lines, max 65 characters');
  assert.doesNotMatch(line, /\([a-z]+\)/i, 'no markers in plain source');
  const colored = langColoredLines[index];
  assert.ok(colored.startsWith('(pen)'), 'each line starts in pencil');
  const markers = [...colored.matchAll(/\(([a-z]+)\)/g)];
  const parts = markers.map((match, n) => ({ color: match[1], text: colored.slice(match.index + match[0].length, markers[n + 1]?.index ?? colored.length) }));
  assert.ok(new Set(parts.filter(part => part.color !== 'pen').map(part => part.color)).size <= 2, 'at most two non-pencil colors per line');
  parts.forEach((part, n) => {
    assert.ok(Object.hasOwn(palette, part.color), 'only shared palette tokens');
    if (part.color === 'pen') return;
    assert.match(part.text, /^[A-Za-z](?:[A-Za-z ]*[A-Za-z])?$/, 'colored runs contain words only, no punctuation');
    assert.equal(parts[n + 1]?.color, 'pen', 'immediate pencil reset');
  });
  assert.ok(parts[0].text.startsWith(line.startsWith('o ') ? 'o ' : '-> '), 'neutral pencil prefix');
  if (line.startsWith('-> ')) {
    assert.ok(parts.filter(part => part.color === 'pen').map(part => part.text).join('').slice(3).trim().length > 0, 'supporting body retains pencil text, not full-line coloring');
  }
});
assert.ok(langColoredLines.some(line => line.startsWith('(pen)-> ') && /\((?!pen\))[a-z]+\)/.test(line)), 'supporting notes include keyword highlights');
assert.equal(lang.sections.length, 12);
lang.sections.forEach((section, index) => {
  assert.equal(section.lines.length, 8, 'eight lines per AP Lang section');
  assert.ok(Object.hasOwn(palette, section.color) && section.color !== 'pen', 'section color is a highlight palette token');
  assert.match(section.lines[0], /^o /, 'neutral section heading prefix, no color names');
  section.lines.slice(1).forEach(line => assert.match(line, /^-> /));
  const heading = langColoredLines[index * 8];
  const runs = [...heading.matchAll(/\(([a-z]+)\)/g)];
  const colors = runs.flatMap((run, n) => Array(heading.slice(run.index + run[0].length, runs[n + 1]?.index ?? heading.length).length).fill(run[1]));
  [...section.lines[0]].forEach((char, n) => {
    if (n < 2 || /[^A-Za-z ]/.test(char)) return assert.equal(colors[n], 'pen', 'title prefix and punctuation stay pencil');
    if (/[A-Za-z]/.test(char)) assert.equal(colors[n], section.color, 'uniform title letters use section token');
  });
});
assert.deepEqual(lang.sections.flatMap(section => section.lines), langLines, 'exact source order');
assert.equal((langHTML.match(/class="note"/g) ?? []).length, 96);
assert.deepEqual([...langHTML.matchAll(/<span class="note">([\s\S]*?)<\/span><\/div>/g)].map(match => match[1]), langColoredLines.map(renderLine), 'all 96 note innerHTML renderings exactly match shared renderLine');
Object.entries(palette).forEach(([token, hex]) => {
  assert.ok(langHTML.includes(`--${token}: ${hex};`), 'AP Lang shares World History palette variables');
  const rule = `.ink.${token} { color: var(--${token}); }`;
  assert.ok(html.includes(rule) && langHTML.includes(rule), 'shared ink token rules');
});
assert.doesNotMatch(langHTML, /\.lang-[a-z]+|class="[^"]*\blang-[a-z]+|section-heading|\.lang\s+\.(?:ink|note|topic-title|page-title)\s*\{[^}]*\b(?:color|font-weight)\s*:/, 'no legacy coloring or bold section overrides');
assert.match(langHTML, /class="topic-title"[^>]*>AP Lang Unit 1: Rhetorical Analysis<\//, 'visible topic title');
const langArticles = [...langHTML.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)];
assert.equal(langArticles.length, 4);
langArticles.forEach((article, index) => {
  assert.equal((article[1].match(/class="note"/g) ?? []).length, 24, '24 notes per article');
  assert.deepEqual([...article[1].matchAll(/<span class="note">([\s\S]*?)<\/span><\/div>/g)].map(match => match[1]), langColoredLines.slice(index * 24, (index + 1) * 24).map(renderLine), 'ordered 24-line page slices');
});
assert.match(langHTML, /<title>AP Lang Unit 1: Rhetorical Analysis<\/title>/);
assert.match(langHTML, /<h1>AP Lang Unit 1: Rhetorical Analysis<\/h1>/);
const langDownloads = [...langHTML.matchAll(/href="data:text\/plain;charset=utf-8;base64,([A-Za-z0-9+/]+=*)" download="([^"]+)"/g)];
assert.equal(langDownloads.length, 2);
for (const [index, file] of ['ap-lang.txt', 'ap-lang-colored.txt'].entries()) {
  assert.equal(langDownloads[index][2], file);
  assert.deepEqual(Buffer.from(langDownloads[index][1], 'base64'), Buffer.from(index ? lang.colored : lang.source), 'exact download bytes');
  assert.match(langHTML, new RegExp(`>Download AP Lang ${index ? 'colored' : 'original'}<`));
}
assert.deepEqual([...langHTML.matchAll(/href="(notes\/[^"]+)"/g)].map(match => match[1]), ['notes/ap-lang.txt', 'notes/Colored/ap-lang.txt'], 'both relative source links');
assert.match(langHTML, /href="ap-lang.html" aria-current="page"/);
assert.doesNotMatch(langHTML, /<(script|link|iframe|img|object|embed)\b|\son\w+\s*=|@import|url\s*\(/i);
console.log('PASS: AP Lang Unit 1, 12 eight-line sections, 96 ASCII lines, four 24-line pages, max 65 characters, shared palette and renderLine, pencil defaults and keyword highlights, marker/punctuation/reset rules, exact stripped equality, two exact downloads and relative sources, reproducible and offline-ready.');
