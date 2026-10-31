import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHome } from '../scripts/home.mjs';
import { analysisPages, entryCount, handouts, interpretationCaveat, locatorCaveat, pamphletFields, plotStages, qualities, scriptedPages, sections, spine, text } from './literature.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'ap-lang.html', 'ap-world.html', 'algebra-2.html', 'out-of-my-mind.html', 'of-mice-and-men.html'];
const labels = ['Home', 'AP Lang Notes', 'AP World History Notes', 'Algebra 2 Notes', 'Out Of My Mind Analysis', 'Of Mice And Men Analysis'];
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
const stylesheet = readFileSync(resolve(root, 'styles/site.css'), 'utf8');
assert.doesNotMatch(stylesheet, /@import|url\(\s*['"]?(?:[a-z][a-z\d+.-]*:|\/)/i, 'shared styles need no remote resources');
for (const [name, color] of Object.entries({ paper: '#f6f3eb', ink: '#213749', muted: '#586467', rule: '#d5cfc2', accent: '#83523b' })) {
  assert.match(stylesheet, new RegExp(`--${name}\\s*:\\s*${color}\\b`, 'i'), `shared ${name} color`);
}
assert.equal(home, renderHome(), 'Home exactly matches renderHome()');
assert.match(home, /<title>Joltlined \| Notes &amp; Literary Analysis<\/title>/);
assert.match(home, /<meta name="description" content="[^"]*Algebra 2: Functions and Linear Systems[^"]*">/, 'Home description names the expanded Algebra 2 collection');
assert.match(home, /MODULES 1B &amp; 2A &middot; 13 LESSONS &middot; 26 PAGES/, 'Home advertises the 13-lesson, 26-page Algebra collection');
assert.match(home, /UNITS 1&ndash;3 &middot; 15 REVIEW ENTRIES &middot; 30 PAGES/, 'Home advertises the Unit 3 review and 30-page World collection');
assert.match(home, /<main\b[^>]*\bid="collection"/);
const main = home.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
assert.ok(main, 'Home has a main landmark');
assert.match(main, /<h1\b[^>]*>A collection for curious minds\.<\/h1>/);
assert.doesNotMatch(home, /<(?:script|iframe|object|embed)\b|\son\w+\s*=|javascript\s*:|@import/i, 'Home needs no executable content');
assert.ok([...home.matchAll(/<a\b[^>]*>/g)].some(match => /\bclass="[^"]*\bskip\b/.test(match[0]) && /\bhref="#collection"/.test(match[0])), 'Home skip link targets collection');
const mainLinks = [...main.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)].map(match => match[1]);
assert.deepEqual(mainLinks.filter(href => pages.slice(1).includes(href)).sort(), pages.slice(1).sort(), 'one main link to each destination');

for (const page of pages) {
  const html = readFileSync(resolve(root, page), 'utf8');
  const styles = [...html.matchAll(/<link\b[^>]*>/gi)].filter(match => /\brel="stylesheet"/i.test(match[0]));
  assert.equal(styles.length, 1, `${page}: exactly one shared stylesheet`);
  assert.match(styles[0][0], /\bhref="styles\/site\.css"/, `${page}: exact shared stylesheet path`);
  for (const block of html.matchAll(/:root\s*\{([^}]+)\}/g)) {
    assert.doesNotMatch(block[1], /--(?:paper|ink|muted|rule|accent)\s*:/, `${page}: base palette belongs only to shared styles`);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page}: unique IDs`);
  const nav = [...html.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)].find(match => /\bclass="[^"]*\bsubjects\b/.test(match[1]))?.[2];
  assert.ok(nav, `${page}: shared subject navigation`);
  const links = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(links.map(match => match[1].match(/\bhref="([^"]+)"/)?.[1]), pages, `${page}: six relative navigation paths`);
  assert.deepEqual(links.map(match => match[2].replace(/<[^>]*>/g, '').trim()), labels, `${page}: accessible navigation labels`);
  assert.deepEqual(links.filter(match => /\baria-current="page"/.test(match[1])).map(match => match[1].match(/\bhref="([^"]+)"/)?.[1]), [page], `${page}: only own page is current`);

  for (const match of html.matchAll(/\bhref="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|data:)/i.test(href)) {
      assert.notEqual(page, 'index.html', 'Home links are local');
      continue;
    }
    assert.doesNotMatch(href, /^(?:[a-z][a-z\d+.-]*:|\/)/i, `${page}: relative local link`);
    const [path, fragment] = href.split('#');
    const target = path ? resolve(root, decodeURIComponent(path).replace(/\/$/, '/index.html')) : resolve(root, page);
    assert.ok(target.startsWith(`${root}${sep}`), `${page}: link stays inside export`);
    assert.ok(statSync(target).isFile(), `${page}: ${href} exists`);
    if (fragment) {
      const targetIds = path ? [...readFileSync(target, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(item => item[1]) : ids;
      assert.ok(targetIds.includes(decodeURIComponent(fragment)), `${page}: ${href} fragment exists`);
    }
  }

  const resources = [
    ...[...html.matchAll(/\b(?:src|poster)="([^"]+)"/g)].map(match => match[1]),
    ...[...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)].map(match => match[1]),
    ...[...html.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi)].map(match => match[1])
  ];
  assert.doesNotMatch(html, /@import/i, `${page}: no remote font imports`);
  for (const resource of resources) {
    if (page === 'out-of-my-mind.html' && /^data:image\/[a-z\d.+-]+[;,]/i.test(resource)) continue;
    assert.doesNotMatch(resource, /^(?:[a-z][a-z\d+.-]*:|\/)/i, `${page}: resource is local`);
    const target = resolve(root, decodeURIComponent(resource.split(/[?#]/)[0]));
    assert.ok(target.startsWith(`${root}${sep}`), `${page}: resource stays inside export`);
    assert.ok(statSync(target).isFile(), `${page}: ${resource} exists`);
  }
}

console.log('PASS: reproducible Home, five collection destinations, six-page shared stylesheet and relative navigation/current state, unique IDs, valid fragments, local assets, no Home JavaScript or remote fonts.');

// The two literary companions share one twelve-section spine built from the Active Reading
// Pamphlet resource: the same ordered sections, a Home map of every pamphlet field, and an
// explicit citation of all seven handout PDFs. These check that contract, not the prose.
for (const page of analysisPages) {
  const html = readFileSync(resolve(root, page), 'utf8');
  const byId = Object.fromEntries(sections(html).map(entry => [entry.id, entry]));
  assert.deepEqual(Object.keys(byId), spine, `${page}: twelve-section spine in document order`);
  assert.deepEqual(
    [...html.matchAll(/<nav\b[^>]*\bid="main-nav"[^>]*>([\s\S]*?)<\/nav>/g)]
      .flatMap(match => [...match[1].matchAll(/<a\b[^>]*\bhref="#([^"]+)"/g)].map(link => link[1])),
    spine,
    `${page}: section navigation follows the same spine`
  );
  assert.deepEqual(scriptedPages(html), spine, `${page}: progressive enhancement can activate every section`);
  for (const [id, entry] of Object.entries(byId)) {
    assert.match(entry.html, /<h2\b/, `${page}: ${id} has a section heading`);
    assert.ok(text(entry.html).split(/\s+/).length >= 40, `${page}: ${id} carries substantive content`);
  }

  // Handout pagination is distinct from novel locators; readers supply their own edition's pages.
  for (const handout of handouts) assert.ok(text(html).includes(handout), `${page}: cites ${handout}`);
  assert.ok(handouts.some(handout => text(byId.citations.html).includes(handout)), `${page}: Works Cited names the handout files`);
  for (const id of ['characters', 'plot', 'vocab', 'tone']) {
    assert.match(text(byId[id].html), /\blocator\b|\bCh\.\s*\d|\bsearch:/i, `${page}: ${id} gives novel evidence locators`);
  }

  // Every pamphlet field is named on Home and linked to the section that answers it.
  for (const { field, section, label } of pamphletFields) {
    assert.match(text(byId.home.html), label, `${page}: Home map names the ${field} field`);
    if (section === 'home') continue;
    assert.ok(byId.home.html.includes(`href="#${section}"`), `${page}: Home map links ${field} to #${section}`);
  }

  // Each guide section carries the field content the handout asks a student to record.
  assert.ok(entryCount(byId.vocab.html) >= 6, `${page}: vocabulary entries`);
  assert.match(text(byId.vocab.html), /definition/i, `${page}: vocabulary gives definitions`);
  assert.ok(entryCount(byId.theme.html) >= 3, `${page}: theme section lists its Big Ideas`);
  assert.match(text(byId.theme.html), /big idea/i, `${page}: theme section covers Big Ideas`);
  assert.match(text(byId.theme.html), /theme statement/i, `${page}: theme section states the theme`);
  assert.ok(entryCount(byId.questions.html) >= 4, `${page}: discussion questions`);
  assert.ok((text(byId.questions.html).match(/\?/g) ?? []).length >= 4, `${page}: questions are asked as questions`);
  for (const stage of plotStages) assert.match(text(byId.plot.html), new RegExp(stage, 'i'), `${page}: plot covers ${stage}`);
  for (const quality of qualities) assert.match(text(byId.characters.html), new RegExp(quality, 'i'), `${page}: characters cover the ${quality} quality`);
  assert.ok((byId.characters.html.match(/<h3\b/gi) ?? []).length >= 4, `${page}: at least four character entries`);
  assert.match(text(byId.tone.html), /attitude/i, `${page}: tone separates attitude from mood`);
  assert.match(text(byId.tone.html), /mood/i, `${page}: tone separates attitude from mood`);

  // Locators and suggested answers each carry the caveat that makes them usable.
  assert.ok(locatorCaveat.some(pattern => pattern.test(`${text(byId.home.html)} ${text(byId.citations.html)}`)), `${page}: says which printing its page numbers come from`);
  assert.ok(interpretationCaveat.some(pattern => pattern.test([byId.home, byId.theme, byId.questions].map(entry => text(entry.html)).join(' '))), `${page}: marks its answers as suggestions, not the reader's own`);
}
console.log('PASS: both analysis pages share the twelve-section spine in navigation, document order and the enhancement script, every pamphlet field is mapped from Home to its section, all seven handout PDFs are cited by filename, vocabulary/theme/questions/plot/characters/tone carry the field content, evidence locators and interpretation caveats are present.');
