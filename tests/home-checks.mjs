import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHome } from '../scripts/home.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'ap-lang.html', 'ap-world.html', 'algebra-2.html', 'out-of-my-mind.html'];
const labels = ['Home', 'AP Lang Notes', 'AP World History Notes', 'Algebra 2 Notes', 'Out Of My Mind Analysis'];
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.equal(home, renderHome(), 'Home exactly matches renderHome()');
assert.match(home, /<title>Joltlined \| Notes &amp; Literary Analysis<\/title>/);
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
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page}: unique IDs`);
  const nav = [...html.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)].find(match => /\bclass="[^"]*\bsubjects\b/.test(match[1]))?.[2];
  assert.ok(nav, `${page}: shared subject navigation`);
  const links = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(links.map(match => match[1].match(/\bhref="([^"]+)"/)?.[1]), pages, `${page}: five relative navigation paths`);
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
    const target = path ? resolve(root, decodeURIComponent(path)) : resolve(root, page);
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

console.log('PASS: reproducible Home, four collection destinations, five-page relative navigation/current state, unique IDs, valid fragments, local assets, no Home JavaScript or remote fonts.');
