import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { escapeHTML, loadNotes, palette, renderLine, renderSite, root, validateSheet } from '../scripts/build.mjs';

const data = loadNotes();
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.equal(html, renderSite(data), 'checked-in HTML exactly matches reproducible build');
assert.equal(data.flatMap(unit => unit.topics).length, 14);
assert.equal((html.match(/<article /g) ?? []).length, 28);
assert.equal((html.match(/class="note"/g) ?? []).length, 672);
assert.equal(readFileSync(resolve(root, 'CNAME'), 'utf8').trim(), 'www.joltlined.com');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'unique IDs');
const links = [...html.matchAll(/\shref="([^"]+)"/g)].map(match => match[1]);
links.forEach(link => {
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
