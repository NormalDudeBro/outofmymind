import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const palette = { g: '#168438', li: '#79c900', pu: '#883ac2', br: '#92552f', y: '#ebc600', r: '#df3034', db: '#173f88', p: '#ed8eb4', lb: '#59b8e7', hp: '#ec228c', pen: '#62615e' };
export const units = [
  { name: 'The Global Tapestry', topics: [
    ['1.1-east-asia', 'Developments in East Asia'],
    ['1.2-dar-al-islam', 'Developments in Dar al-Islam'],
    ['1.3-south-southeast-asia', 'Developments in South and Southeast Asia'],
    ['1.4-americas', 'State Building in the Americas'],
    ['1.5-africa', 'State Building in Africa'],
    ['1.6-europe', 'Developments in Europe'],
    ['1.7-comparison', 'Comparison in the Period from c. 1200 to c. 1450'],
  ] },
  { name: 'Networks of Exchange', topics: [
    ['2.1-silk-roads', 'The Silk Roads'],
    ['2.2-mongol-empire', 'The Mongol Empire and the Making of the Modern World'],
    ['2.3-indian-ocean', 'Exchange in the Indian Ocean'],
    ['2.4-trans-saharan-trade', 'Trans-Saharan Trade Routes'],
    ['2.5-cultural-consequences', 'Cultural Consequences of Connectivity'],
    ['2.6-environmental-consequences', 'Environmental Consequences of Connectivity'],
    ['2.7-comparison', 'Comparison in Networks of Exchange'],
  ] },
];
const marker = /\((g|li|pu|br|y|r|db|p|lb|hp|pen)\)/g;
const normalize = text => text.replace(/\r\n/g, '\n');
const lines = text => normalize(text).replace(/\n$/, '').split('\n');
export const escapeHTML = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function spans(line) {
  const matches = [...line.matchAll(marker)];
  return matches.map((match, index) => ({ color: match[1], text: line.slice(match.index + match[0].length, matches[index + 1]?.index ?? line.length) }));
}

export function validateSheet(original, colored, name) {
  const check = (condition, message) => assert.ok(condition, `${name}: ${message}`);
  check(normalize(colored).replace(marker, '') === normalize(original), 'exact stripped equality');
  const source = lines(original);
  const marked = lines(colored);
  check(source.length === 48 && marked.length === 48, '48 lines / two 24-line pages');
  const renderings = new Map();
  marked.forEach((line, index) => {
    const text = source[index];
    check(text.length <= 65 && /^(o |-> )\S/.test(text) && !/\s$/.test(text), `line ${index + 1}: prefix, whitespace and max 65 characters`);
    check(line.startsWith('(pen)') && !/\([a-z]+\)/i.test(text), `line ${index + 1}: valid markers and initial pencil`);
    const parts = spans(line);
    const colors = parts.flatMap(part => Array(part.text.length).fill(part.color));
    const highlights = new Set(parts.filter(part => part.color !== 'pen').map(part => part.color));
    check(highlights.size <= 2, `line ${index + 1}: at most two highlight colors`);
    parts.forEach((part, n) => {
      if (part.color === 'pen') return;
      check(/^[A-Za-z](?:[A-Za-z ]*[A-Za-z])?$/.test(part.text), `line ${index + 1}: neutral punctuation / colored words only`);
      check(parts[n + 1]?.color === 'pen', `line ${index + 1}: immediate pencil reset`);
    });
    const prefix = text.startsWith('o ') ? 2 : 3;
    check(colors.slice(0, prefix).every(color => color === 'pen'), `line ${index + 1}: neutral prefix`);
    if (text === 'o Overview') check(highlights.size === 0, 'Overview stays pencil');
    const title = text.slice(prefix);
    const isTitle = source.some(item => item === `o ${title}` && item !== 'o Overview');
    if (!isTitle) return;
    check(highlights.size === 1 && !highlights.has('lb'), `${title}: one reserved non-LB title color`);
    const color = [...highlights][0];
    check([...title].every((char, n) => /[A-Za-z]/.test(char) ? colors[n + prefix] === color : char === ' ' || colors[n + prefix] === 'pen'), `${title}: full uniform title`);
    const rendering = colors.slice(prefix).join(',');
    check(!renderings.has(title) || renderings.get(title) === rendering, `${title}: matching Overview/header colors`);
    renderings.set(title, rendering);
  });
  [0, 24].forEach(offset => {
    const page = source.slice(offset, offset + 24);
    check(page[0] === 'o Overview', 'each page begins with o Overview');
    const first = page.findIndex((line, index) => index > 0 && line.startsWith('o '));
    const headers = page.filter((line, index) => index > 0 && line.startsWith('o ')).map(line => line.slice(2));
    check(first > 1 && headers.length >= 2 && headers.length <= 5, 'page has 2-5 headers');
    check(JSON.stringify(page.slice(1, first).map(line => line.slice(3))) === JSON.stringify(headers), 'exact ordered same-page Overview listings');
    page.forEach((line, index) => {
      if (index && line.startsWith('o ')) check(page[index + 1]?.startsWith('-> '), 'header has supporting content');
    });
  });
  return marked;
}

export function loadNotes(paths = units.map((_, index) => resolve(root, 'notes', `unit-${index + 1}`))) {
  return units.map((unit, index) => ({ ...unit, topics: unit.topics.map(([file, title]) => {
    const original = readFileSync(resolve(paths[index], `${file}.txt`), 'utf8');
    const colored = readFileSync(resolve(paths[index], 'Colored', `${file}.txt`), 'utf8');
    return { file, title, original, colored, lines: validateSheet(original, colored, file) };
  }) }));
}

export function renderLine(line) {
  return spans(line).map(part => part.color === 'pen' ? escapeHTML(part.text) : `<span class="ink ${part.color}">${escapeHTML(part.text)}</span>`).join('');
}

export function renderSite(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="AP World History Units 1 and 2: fourteen topics, twenty-eight printable note pages, and original and colored text downloads.">
  <title>AP World History Notes</title>
  <style>
    :root { color-scheme: light; ${Object.entries(palette).map(([token, hex]) => `--${token}: ${hex};`).join(' ')} font-family: Georgia, "Times New Roman", serif; color: #393833; background: #eeede9; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px clamp(12px, 3vw, 48px) 40px; }
    header, main, footer { max-width: 1500px; margin: auto; }
    header { margin-bottom: 26px; }
    h1 { margin: 0 0 14px; font-size: 26px; font-weight: normal; }
    a { color: #173f88; text-underline-offset: 3px; }
    a:focus-visible { outline: 2px solid #173f88; outline-offset: 4px; }
    .skip { position: absolute; top: 0; left: 12px; transform: translateY(-120%); background: #fffefb; padding: 8px; }
    .skip:focus { transform: none; }
    nav { display: flex; flex-wrap: wrap; gap: 12px 24px; margin: 18px 0; }
    .contents { columns: 2; padding-left: 24px; font-size: 14px; line-height: 1.8; }
    .contents li { break-inside: avoid; }
    .legend { display: flex; flex-wrap: wrap; gap: 7px 15px; font: 12px/1.5 system-ui, sans-serif; }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .swatch { width: 9px; height: 9px; border-radius: 50%; }
    .unit-title { font-size: 24px; font-weight: normal; border-top: 1px solid #dcd9d1; padding-top: 22px; }
    .topic { margin-bottom: 28px; scroll-margin-top: 12px; }
    .pages { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 22px; align-items: start; }
    article { min-width: 0; }
    .topic-title, .page-title { color: var(--lb); font-size: 22px; line-height: 1.25; font-weight: normal; margin: 0 0 7px; }
    .page-title { display: none; }
    .caption, .downloads { margin: 0 0 12px; font: 11px/1.5 system-ui, sans-serif; color: #62615e; }
    .sheet { background: #fffefb; border: 1px solid #dcd9d1; padding: 18px 18px 18px 14px; box-shadow: 0 2px 5px #00000008; }
    .line { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; min-height: 37px; }
    .number { padding-top: 7px; color: #62615e; font: 9px/1.5 system-ui, sans-serif; text-align: right; user-select: none; }
    .note { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--pen); border-bottom: 1px solid #efede7; padding: 5px 0; font-size: 14px; line-height: 26px; }
    ${Object.keys(palette).map(token => `.ink.${token} { color: var(--${token}); } .swatch.${token} { background: var(--${token}); }`).join('\n    ')}
    @media (max-width: 960px) { .pages { grid-template-columns: minmax(0, 1fr); } }
    @media (max-width: 480px) {
      body { padding: 18px 10px 28px; } .contents { columns: 1; }
      .sheet { padding: 12px 10px 12px 5px; }
      .line { grid-template-columns: 17px minmax(0, 1fr); gap: 6px; }
      .note { font-size: 13px; line-height: 23px; }
      .topic-title { font-size: 21px; }
    }
    @page { size: A4 portrait; margin: 12mm; }
    @media print {
      body { padding: 0; background: white; }
      header, footer, .skip, .unit-title, .topic-title, .downloads { display: none; }
      main, .pages { display: block; }
      .topic { margin: 0; }
      article { break-after: page; break-inside: avoid; }
      .unit:last-child .topic:last-child article:last-child { break-after: auto; }
      .page-title { display: block; font-size: 20px; }
      .caption { margin-bottom: 3mm; }
      .sheet { box-shadow: none; padding: 4mm; }
      .line { grid-template-columns: 22px minmax(0, 1fr); gap: 8px; height: 8.8mm; min-height: 0; }
      .number { padding-top: 0.6mm; }
      .note { font-size: 12px; line-height: 3.8mm; padding: 0.6mm 0; }
      * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <a class="skip" href="#notes">Skip to notes</a>
  <header>
    <h1>AP World History Notes</h1>
    <p>Units 1 &amp; 2 · c. 1200–1450 · 14 topics · 28 note pages</p>
    <nav aria-label="Units"><a href="#unit-1">Unit 1: The Global Tapestry</a><a href="#unit-2">Unit 2: Networks of Exchange</a></nav>
    <ol class="contents">${data.flatMap(unit => unit.topics.map(topic => `<li><a href="#topic-${escapeHTML(topic.file.replaceAll('.', '-'))}">${escapeHTML(topic.file.slice(0, 3))} ${escapeHTML(topic.title)}</a></li>`)).join('')}</ol>
    <div class="legend" role="group" aria-label="Token color legend">${Object.keys(palette).map(token => `<span><i class="swatch ${token}" aria-hidden="true"></i>${token} ${({ g: 'green', li: 'lime', pu: 'purple', br: 'brown', y: 'yellow', r: 'red', db: 'dark blue', p: 'pink', lb: 'light blue', hp: 'hot pink', pen: 'pencil' })[token]}</span>`).join('')}</div>
    <p>All notes are visible below. Use your browser’s Print command for one sheet per page. Colored text downloads contain the original color markers.</p>
  </header>
  <main id="notes">${data.map((unit, index) => `
    <section class="unit" id="unit-${index + 1}" aria-labelledby="unit-${index + 1}-title">
      <h2 class="unit-title" id="unit-${index + 1}-title">Unit ${index + 1}: ${escapeHTML(unit.name)}</h2>
      ${unit.topics.map(topic => `<section class="topic" id="topic-${escapeHTML(topic.file.replaceAll('.', '-'))}" aria-labelledby="topic-${escapeHTML(topic.file.replaceAll('.', '-'))}-title">
        <h3 class="topic-title" id="topic-${escapeHTML(topic.file.replaceAll('.', '-'))}-title">${escapeHTML(topic.file.slice(0, 3))} ${escapeHTML(topic.title)}</h3>
        <p class="downloads"><a href="data:text/plain;charset=utf-8;base64,${Buffer.from(topic.original).toString('base64')}" download="${escapeHTML(topic.file)}.txt">Download ${escapeHTML(topic.file.slice(0, 3))} original</a> · <a href="data:text/plain;charset=utf-8;base64,${Buffer.from(topic.colored).toString('base64')}" download="${escapeHTML(topic.file)}.txt">Download ${escapeHTML(topic.file.slice(0, 3))} colored</a> · <a href="notes/unit-${index + 1}/${escapeHTML(topic.file)}.txt">Open original file</a> · <a href="notes/unit-${index + 1}/Colored/${escapeHTML(topic.file)}.txt">Open colored file</a></p>
        <div class="pages">${[0, 1].map(page => `<article aria-label="${escapeHTML(topic.file.slice(0, 3))} page ${page + 1}">
          <h4 class="page-title">${escapeHTML(topic.file.slice(0, 3))} ${escapeHTML(topic.title)}</h4>
          <p class="caption">Page ${page + 1} · Lines ${page * 24 + 1}–${page * 24 + 24}</p>
          <div class="sheet">${topic.lines.slice(page * 24, page * 24 + 24).map((line, n) => `<div class="line"><span class="number" aria-hidden="true">${page * 24 + n + 1}</span><span class="note">${renderLine(line)}</span></div>`).join('\n')}</div>
        </article>`).join('')}</div>
      </section>`).join('\n')}
    </section>`).join('\n')}
  </main>
  <footer><p>The approved pastel ink palette is preserved. Some ink colors do not meet WCAG text contrast requirements; original pencil-only text files are available for every topic.</p><a href="#notes">Back to notes</a></footer>
</body>
</html>
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { unit1: { type: 'string' }, unit2: { type: 'string' }, preview: { type: 'string' } } });
  const paths = units.map((_, index) => resolve(values[`unit${index + 1}`] ?? resolve(root, 'notes', `unit-${index + 1}`)));
  // Validate every source before importing anything or replacing the current site.
  const data = loadNotes(paths);
  const html = renderSite(data);
  const destinations = [resolve(root, 'index.html'), ...(values.preview ? [resolve(values.preview)] : [])];
  destinations.forEach(destination => {
    const target = dirname(destination);
    mkdirSync(target, { recursive: true });
    data.forEach((unit, index) => unit.topics.forEach(topic => {
      ['', 'Colored'].forEach(folder => {
        const source = resolve(paths[index], folder, `${topic.file}.txt`);
        const output = resolve(target, 'notes', `unit-${index + 1}`, folder, `${topic.file}.txt`);
        if (source === output) return;
        mkdirSync(dirname(output), { recursive: true });
        copyFileSync(source, output);
      });
    }));
    writeFileSync(destination, html);
    console.log(`Built ${destination}: 14 topics, 28 pages, 672 note lines; native downloads embedded and text files copied alongside.`);
  });
}
