import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlgebraNotes, palette, renderLine, renderSite, root } from '../scripts/build.mjs';

// The loader validates marker grammar, neutral math/punctuation, and title inks.
const algebra = loadAlgebraNotes();
const files = ['1.5-linear', '1.6.1-piecewise', '1.6.2-step', '1.6.3-absolute-value', '1.7.1-parents', '1.7.2-translations', '1.7.3-dilations', '1.7.3-combined'];
assert.deepEqual(algebra.map(lesson => lesson.file), files, 'eight lessons in packet order');
const html = readFileSync(resolve(root, 'algebra-2.html'), 'utf8');
assert.equal(html, renderSite([], undefined, algebra), 'Algebra HTML exactly matches reproducible build');
assert.match(html, /<title>Algebra 2 Unit 1B: Relations and Functions<\/title>/);
assert.match(html, /<h1>Algebra 2 Unit 1B: Relations and Functions<\/h1>/);
assert.equal((html.match(/class="note"/g) ?? []).length, 384);
const articles = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)];
assert.equal(articles.length, 16, 'two articles per lesson');
articles.forEach(article => assert.equal((article[1].match(/class="note"/g) ?? []).length, 24));

algebra.forEach(lesson => {
  assert.equal(typeof lesson.title, 'string');
  assert.ok(lesson.title.length > 0);
  assert.equal(typeof lesson.label, 'string');
  assert.ok(lesson.label.length > 0);
  assert.deepEqual(Buffer.from(lesson.source), readFileSync(resolve(root, 'notes/algebra-2', `${lesson.file}.txt`)), 'exact original source bytes');
  assert.deepEqual(Buffer.from(lesson.colored), readFileSync(resolve(root, 'notes/algebra-2/Colored', `${lesson.file}.txt`)), 'exact colored source bytes');
  assert.doesNotMatch(lesson.source, /[^\x00-\x7f]|\r/, 'original ASCII and LF only');
  assert.doesNotMatch(lesson.colored, /[^\x00-\x7f]|\r/, 'colored ASCII and LF only');
  assert.equal(lesson.colored.replace(/\((g|li|pu|br|y|r|db|p|lb|hp|pen)\)/g, ''), lesson.source, 'exact stripped equality including final newline');
  const lines = lesson.source.replace(/\n$/, '').split('\n');
  assert.equal(lines.length, 48);
  assert.equal(lesson.colored.replace(/\n$/, '').split('\n').length, 48);
  lines.forEach(line => assert.ok(line.length <= 65 && /^(o |-> )\S/.test(line) && line.trim() === line, 'prefix, trimmed text, max 65 characters'));
  assert.equal(lesson.sections.length, 6);
  lesson.sections.forEach(section => {
    assert.equal(section.lines.length, 8);
    assert.match(section.lines[0], /^o /);
    section.lines.slice(1).forEach(line => assert.match(line, /^-> /));
    assert.ok(Object.hasOwn(palette, section.color) && !['pen', 'lb'].includes(section.color), 'shared non-LB title ink');
  });
  assert.deepEqual(lesson.sections.flatMap(section => section.lines), lines, 'six sections preserve source order');
});
assert.deepEqual([...html.matchAll(/<span class="note">([\s\S]*?)<\/span><\/div>/g)].map(match => match[1]), algebra.flatMap(lesson => lesson.colored.replace(/\n$/, '').split('\n').map(renderLine)), 'all 384 notes use shared renderLine in source order');
Object.entries(palette).forEach(([token, hex]) => {
  assert.ok(html.includes(`--${token}: ${hex};`), 'shared palette declaration');
  assert.ok(html.includes(`.ink.${token} { color: var(--${token}); }`), 'shared ink rule');
});
assert.doesNotMatch(html, /\.algebra\s+\.(?:ink|note|topic-title|page-title)\s*\{[^}]*\b(?:color|font-weight)\s*:/, 'no Algebra color or bold overrides');
assert.doesNotMatch(html, /<(script|link|iframe|img|object|embed)\b|\son\w+\s*=|@import|url\s*\(/i, 'offline-ready, no executable or remote resources');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'unique IDs');
[...html.matchAll(/href="#([^"]+)"/g)].forEach(match => assert.ok(ids.includes(match[1]), `fragment ${match[1]}`));
for (const page of ['index.html', 'ap-lang.html', 'algebra-2.html']) {
  const pageHTML = readFileSync(resolve(root, page), 'utf8');
  const navigation = pageHTML.match(/<nav class="subjects"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(navigation, 'subject navigation exists');
  assert.deepEqual([...navigation.matchAll(/href="([^"]+)"/g)].map(match => match[1]), ['index.html', 'ap-lang.html', 'algebra-2.html']);
  assert.match(navigation, /href="algebra-2.html"[^>]*>Algebra 2 notes<\/a>/);
  assert.deepEqual([...navigation.matchAll(/href="([^"]+)" aria-current="page"/g)].map(match => match[1]), [page], 'only current subject is active');
}
const downloads = [...html.matchAll(/href="data:text\/plain;charset=utf-8;base64,([A-Za-z0-9+/]+=*)" download="([^"]+)"/g)];
const sources = [...html.matchAll(/href="(notes\/[^\"]+)"/g)].map(match => match[1]);
assert.equal(downloads.length, 16);
assert.equal(sources.length, 16);
algebra.forEach((lesson, index) => {
  [lesson.source, lesson.colored].forEach((text, kind) => {
    const offset = index * 2 + kind;
    assert.equal(downloads[offset][2], `${lesson.file}${kind ? '-colored' : ''}.txt`);
    assert.deepEqual(Buffer.from(downloads[offset][1], 'base64'), Buffer.from(text), 'embedded download preserves source bytes');
    assert.equal(sources[offset], `notes/algebra-2/${kind ? 'Colored/' : ''}${lesson.file}.txt`);
    assert.deepEqual(readFileSync(resolve(root, sources[offset])), Buffer.from(text), 'relative source preserves download bytes');
  });
});

// Check selected published calculations, not a second implementation of the models.
const piecewise = algebra[1].source;
const costs = [...piecewise.matchAll(/C\((\d+)\) = (\d+)\((\d+)\) = (\d+) dollars/g)];
assert.deepEqual(costs.map(match => Number(match[1])), [11, 25], 'both corrected jersey examples are present');
assert.deepEqual(costs.map(match => Number(match[4])), [825, 1625]);
costs.forEach(match => {
  assert.equal(Number(match[1]), Number(match[3]), 'quantity is unchanged in substitution');
  const tier = [...piecewise.matchAll(/C\(n\) = (\d+)n for (\d+) <= n <= (\d+)/g)].find(tier => Number(match[1]) >= Number(tier[2]) && Number(match[1]) <= Number(tier[3]));
  assert.ok(tier, 'worked quantity belongs to a published tier');
  assert.equal(Number(match[2]), Number(tier[1]), 'worked rate agrees with its tier');
  assert.equal(Number(match[4]), Number(match[2]) * Number(match[3]), 'all-units total is rate times quantity');
});
const floors = [...algebra[2].source.matchAll(/floor\((-?\d+(?:\.\d+)?)\) = (-?\d+)/g)];
assert.ok(floors.some(match => Number(match[1]) === -6.35), 'negative floor example is present');
assert.ok(floors.some(match => Number(match[1]) === -0.2), 'floor versus truncation example is present');
floors.forEach(match => assert.equal(Number(match[2]), Math.floor(Number(match[1])), 'published numeric floor calculation'));
const dilation = algebra[6].source;
const coefficient = dilation.match(/b = (-?\d+(?:\.\d+)?)/);
const mapping = dilation.match(/\((2),(4)\) becomes \((-?\d+(?:\.\d+)?),(4)\)/);
assert.ok(coefficient && mapping, 'horizontal dilation worked coefficient and point are present');
assert.equal(Number(mapping[3]), Number(mapping[1]) / Number(coefficient[1]), 'horizontal mapping divides input by b');
assert.equal(Number(mapping[4]), Number(mapping[2]), 'horizontal-only dilation preserves output');
console.log('PASS: Algebra 2, eight lessons with 48 source lines each, 16 pages with 24 notes each, six eight-line sections per lesson, 384 ASCII notes, max 65 characters, exact sources and stripped equality, shared renderLine/palette, subject navigation, 16 exact downloads and relative paths, reproducible HTML, selected cost/floor/dilation calculations.');
