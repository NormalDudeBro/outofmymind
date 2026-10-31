import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

const text = readFileSync(new URL('../notes/unit-3/3-review.txt', import.meta.url), 'utf8');
validateUnit3(text);
assert.throws(() => validateUnit3(text.replace('o Imperial expansion', 'o Overview')));
assert.throws(() => validateUnit3(text.replace('-> Imperial expansion', '-> Wrong title')));
assert.throws(() => validateUnit3(text.replace('Gunpowder', 'Gunpowder\u2019s')), /ASCII/);
assert.throws(() => validateUnit3(text + '\n'), /48 nonempty lines/);
assert.throws(() => validateUnit3(text.replace('-> Imperial expansion', `-> ${'x'.repeat(63)}`)), /characters/);
console.log('PASS: Unit 3 ASCII text, 48 lines, two 24-line pages, max 65 characters, exact prefixes, whitespace, ordered overviews, distinct supported headers.');
