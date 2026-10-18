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
assert.equal((html.match(/class="note"/g) ?? []).length, 464);
const articles = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)];
assert.equal(articles.length, 16, 'two articles per lesson');
articles.forEach(article => assert.equal((article[1].match(/class="note"/g) ?? []).length, 29));
assert.deepEqual([...html.matchAll(/<p class="caption">([^<]*)<\/p>/g)].map(match => match[1]), Array(8).fill(['Page 1 · Lines 1–29', 'Page 2 · Lines 30–58']).flat(), 'every lesson prints captions for lines 1-29 and 30-58');
assert.deepEqual([...html.matchAll(/<span class="number" aria-hidden="true">(\d+)<\/span>/g)].map(match => Number(match[1])), Array(8).fill(Array.from({ length: 58 }, (_, index) => index + 1)).flat(), 'printed line numbers run 1-58 in order within every lesson');
assert.match(html, /Module 1B · Relations and Functions · 8 lessons · 16 pages · 29 lines per page/, 'intro metadata advertises the 29-line Algebra page contract');
const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
assert.match(description, /29-line|twenty-nine-line/, 'description advertises 29-line Algebra pages');
assert.doesNotMatch(description, /24-line/, 'description no longer advertises 24-line Algebra pages');
assert.match(readFileSync(resolve(root, 'ap-lang.html'), 'utf8'), /4 pages · 24 lines per page/, 'AP Lang keeps its own 24-line page contract');

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
  assert.equal(lines.length, 58);
  assert.equal(lesson.colored.replace(/\n$/, '').split('\n').length, 58);
  lines.forEach(line => assert.ok(line.length <= 65 && /^(o |-> )\S/.test(line) && line.trim() === line, 'prefix, trimmed text, max 65 characters'));
  assert.equal(lesson.sections.length, 6);
  lesson.sections.forEach((section, index) => {
    assert.equal(section.lines.length, [10, 10, 9, 10, 10, 9][index]);
    assert.match(section.lines[0], /^o /);
    section.lines.slice(1).forEach(line => assert.match(line, /^-> /));
    assert.ok(Object.hasOwn(palette, section.color) && !['pen', 'lb'].includes(section.color), 'shared non-LB title ink');
  });
  assert.deepEqual(lesson.sections.flatMap(section => section.lines), lines, 'six sections preserve source order');
});
assert.deepEqual([...html.matchAll(/<span class="note">([\s\S]*?)<\/span><\/div>/g)].map(match => match[1]), algebra.flatMap(lesson => lesson.colored.replace(/\n$/, '').split('\n').map(renderLine)), 'all 464 notes use shared renderLine in source order');
Object.entries(palette).forEach(([token, hex]) => {
  assert.ok(html.includes(`--${token}: ${hex};`), 'shared palette declaration');
  assert.ok(html.includes(`.ink.${token} { color: var(--${token}); }`), 'shared ink rule');
});
assert.doesNotMatch(html, /\.algebra\s+\.(?:ink|note|topic-title|page-title)\s*\{[^}]*\b(?:color|font-weight)\s*:/, 'no Algebra color or bold overrides');
assert.deepEqual(html.match(/<link\b[^>]*>/gi) ?? [], ['<link rel="stylesheet" href="styles/site.css">'], 'exactly one local stylesheet link');
assert.doesNotMatch(html, /<(script|iframe|img|object|embed)\b|\son\w+\s*=|@import|url\s*\(/i, 'offline-ready, no executable or remote resources');
assert.doesNotMatch(readFileSync(resolve(root, 'styles/site.css'), 'utf8'), /@import|url\s*\(/i, 'shared stylesheet has no remote or additional resources');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'unique IDs');
[...html.matchAll(/href="#([^"]+)"/g)].forEach(match => assert.ok(ids.includes(match[1]), `fragment ${match[1]}`));
const pages = ['index.html', 'ap-lang.html', 'ap-world.html', 'algebra-2.html', 'out-of-my-mind.html', 'of-mice-and-men.html'];
for (const page of pages) {
  const pageHTML = readFileSync(resolve(root, page), 'utf8');
  assert.deepEqual(pageHTML.match(/<link\b[^>]*>/gi) ?? [], ['<link rel="stylesheet" href="styles/site.css">'], `${page}: exactly one shared local stylesheet`);
  const navigation = pageHTML.match(/<nav\b[^>]*\bclass="[^"]*\bsubjects\b[^"]*"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(navigation, 'subject navigation exists');
  const anchors = [...navigation.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(anchors.map(match => match[1].match(/\bhref="([^"]+)"/)?.[1]), pages, 'all six navigation targets in DOM order');
  assert.deepEqual(anchors.map(match => match[2].trim()), ['Home', 'AP Lang Notes', 'AP World History Notes', 'Algebra 2 Notes', 'Out Of My Mind Analysis', 'Of Mice And Men Analysis'], 'exact capitalized navigation labels');
  assert.deepEqual(anchors.filter(match => /\baria-current="page"/.test(match[1])).map(match => match[1].match(/\bhref="([^"]+)"/)?.[1]), [page], 'only current page is active');
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
const coefficient = dilation.match(/g\(x\) = \(-2\.5\*x\)\^2 uses f\(x\) = x\^2, b = (-?\d+(?:\.\d+)?)/);
const mapping = dilation.match(/\((2),(4)\) becomes \((-?\d+(?:\.\d+)?),(4)\)/);
assert.ok(coefficient && mapping, 'horizontal dilation worked coefficient and point are present');
assert.equal(Number(mapping[3]), Number(mapping[1]) / Number(coefficient[1]), 'horizontal mapping divides input by b');
assert.equal(Number(mapping[4]), Number(mapping[2]), 'horizontal-only dilation preserves output');
console.log('PASS: Algebra 2, eight lessons with 58 source lines each, 16 pages with 29 notes each, six sections per lesson with lengths 10/10/9/10/10/9, 464 ASCII notes numbered 1-58, captions for lines 1-29 and 30-58 with matching 29-line metadata, max 65 characters, exact sources and stripped equality, shared renderLine/palette, subject navigation, AP Lang 24-line contract preserved, 16 exact downloads and relative paths, reproducible HTML, selected cost/floor/dilation calculations.');
