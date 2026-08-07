import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) {
  throw new Error(`Duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`);
}

const idSet = new Set(ids);
const fragments = [...html.matchAll(/\shref="#([^"]+)"/g)].map(match => match[1]);
const missingFragments = fragments.filter(fragment => !idSet.has(fragment));
if (missingFragments.length) {
  throw new Error(`Missing fragment targets: ${[...new Set(missingFragments)].join(', ')}`);
}

const images = [...html.matchAll(/<img\s+([^>]+)>/g)];
for (const [, attributes] of images) {
  const source = attributes.match(/(?:^|\s)src="([^"]+)"/)?.[1];
  if (!source || !existsSync(resolve(root, source))) {
    throw new Error(`Missing local image: ${source || '(no src)'}`);
  }
  if (!/\sloading="lazy"/.test(attributes) || !/\sdecoding="async"/.test(attributes)) {
    throw new Error(`Image must be lazy and async decoded: ${source}`);
  }
}

console.log(`Validated ${ids.length} unique IDs, ${fragments.length} fragments, and ${images.length} local image references.`);
