import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { units } from '../scripts/build.mjs';

export function validateUnit3(text) {
  assert.doesNotMatch(text, /[^\x00-\x7f]/, 'ASCII note text');
  const lines = text.replace(/\n$/, '').split('\n');
  assert.equal(lines.length, 48, '48 nonempty lines');
  assert.equal(lines.filter(line => line === 'o Overview').length, 2);
  lines.forEach((line, index) => {
    assert.ok(line.length <= 65, `line ${index + 1}: ${line.length} characters`);
    assert.equal(line, line.trim(), `line ${index + 1}: no edge whitespace`);
    assert.match(line, /^(o |-> )\S.*$/, `line ${index + 1}: prefix and content`);
  });
  [0, 24].forEach(offset => {
    const page = lines.slice(offset, offset + 24);
    assert.equal(page.length, 24);
    assert.equal(page[0], 'o Overview');
    const first = page.findIndex((line, index) => index > 0 && line.startsWith('o '));
    assert.ok(first > 1);
    const headers = page.slice(first).filter(line => line.startsWith('o ')).map(line => line.slice(2));
    assert.equal(new Set(headers).size, headers.length, 'distinct major headers');
    assert.deepEqual(page.slice(1, first).map(line => {
      assert.ok(line.startsWith('-> '));
      return line.slice(3);
    }), headers, 'exact ordered navigation overview');
    page.forEach((line, index) => {
      if (index > 0 && line.startsWith('o ')) assert.ok(page[index + 1]?.startsWith('-> '), 'support under every header');
    });
  });
  return lines;
}

const topics = [
  ['3.1-empires-expand', 'Empires Expand'],
  ['3.2-administration', 'Empires: Administration'],
  ['3.3-belief-systems', 'Empires: Belief Systems'],
  ['3.4-comparison', 'Comparison in Land-Based Empires'],
];
assert.deepEqual(units[2].topics, topics, 'all four exact Unit 3 topic titles');
for (const folder of ['', 'Colored/']) {
  assert.deepEqual(readdirSync(new URL(`../notes/unit-3/${folder}`, import.meta.url)).filter(file => file.endsWith('.txt')).sort(), topics.map(([file]) => `${file}.txt`), 'exactly four topic sources, no obsolete review');
}
const sheets = topics.map(([file]) => readFileSync(new URL(`../notes/unit-3/${file}.txt`, import.meta.url), 'utf8'));
const validated = sheets.map(validateUnit3);
assert.equal(validated.length, 4, 'four independent sheets');
assert.equal(validated.flat().length, 192, '192 logical note lines');
assert.equal(validated.flatMap(lines => [lines.slice(0, 24), lines.slice(24)]).length, 8, 'eight 24-line pages');
const text = sheets[0];
assert.throws(() => validateUnit3(text.replace('o Gunpowder and expansion', 'o Overview')));
assert.throws(() => validateUnit3(text.replace('-> Gunpowder and expansion', '-> Wrong title')));
assert.throws(() => validateUnit3(text.replace('Cannons', 'Cannons\u2019')), /ASCII/);
assert.throws(() => validateUnit3(text + '\n'), /48 nonempty lines/);
assert.throws(() => validateUnit3(text.replace('-> Gunpowder and expansion', `-> ${'x'.repeat(63)}`)), /characters/);
console.log('PASS: four Unit 3 topics, eight pages, 192 ASCII note lines; each sheet has 48 lines, two 24-line pages, max 65 characters, exact prefixes, whitespace, ordered overviews, and distinct supported headers.');
