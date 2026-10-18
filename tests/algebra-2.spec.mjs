import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadAlgebraNotes, palette, renderLine, root, spans } from '../scripts/build.mjs';

const title = 'Algebra 2 Unit 1B: Relations and Functions';
const files = ['1.5-linear', '1.6.1-piecewise', '1.6.2-step', '1.6.3-absolute-value', '1.7.1-parents', '1.7.2-translations', '1.7.3-dilations', '1.7.3-combined'];
const labels = ['1.5', '1.6.1', '1.6.2', '1.6.3', '1.7.1', '1.7.2', '1.7.3', '1.7.3'];
const lines = text => text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');

test('Algebra sources and all 464 HTML renderings use the shared marker renderer', () => {
  const notes = loadAlgebraNotes();
  expect(notes.map(note => note.file)).toEqual(files);
  expect(notes.map(note => note.label)).toEqual(labels);
  expect(notes[0].title).toBe('Graphing Linear Functions and Inequalities');
  const html = readFileSync(resolve(root, 'algebra-2.html'), 'utf8');
  expect([...html.matchAll(/<span class="note">([\s\S]*?)<\/span><\/div>/g)].map(match => match[1])).toEqual(notes.flatMap(note => lines(note.colored).map(renderLine)));
  expect(html.match(/<link\b[^>]*>/gi) ?? []).toEqual(['<link rel="stylesheet" href="styles/site.css">']);
  expect(html).not.toMatch(/<(script|iframe|img|object|embed)\b|\son\w+\s*=|@import|url\s*\(/i);
  for (const note of notes) {
    expect(note.title.trim()).not.toBe('');
    expect(Buffer.from(note.source)).toEqual(readFileSync(resolve(root, 'notes/algebra-2', `${note.file}.txt`)));
    expect(Buffer.from(note.colored)).toEqual(readFileSync(resolve(root, 'notes/algebra-2/Colored', `${note.file}.txt`)));
    expect(lines(note.source)).toHaveLength(58);
    expect(lines(note.colored)).toHaveLength(58);
    expect(note.sections).toHaveLength(6);
    expect(note.sections.map(section => section.lines.length)).toEqual([10, 10, 9, 10, 10, 9]);
    expect(note.sections.flatMap(section => section.lines)).toEqual(lines(note.source));
    expect(note.colored.replace(/\((g|li|pu|br|y|r|db|p|lb|hp|pen)\)/g, '')).toBe(note.source);
    for (const [index, line] of lines(note.colored).entries()) {
      const parts = spans(line);
      expect(line).toMatch(/^\(pen\)(o |-> )/);
      expect(parts.map(part => part.text).join('')).toBe(lines(note.source)[index]);
      expect(new Set(parts.filter(part => part.color !== 'pen').map(part => part.color)).size).toBeLessThanOrEqual(2);
      for (const [n, part] of parts.entries()) {
        expect(Object.hasOwn(palette, part.color)).toBe(true);
        if (part.color === 'pen') continue;
        // Formulas, parentheses, inequality signs and other punctuation stay pencil.
        expect(part.text).toMatch(/^[A-Za-z](?:[A-Za-z ]*[A-Za-z])?$/);
        expect(parts[n + 1]?.color).toBe('pen');
      }
      if (lines(note.source)[index].startsWith('-> ')) {
        expect(parts.filter(part => part.color === 'pen').map(part => part.text).join('').slice(3).trim().length).toBeGreaterThan(0);
      }
    }
    expect(lines(note.colored).some(line => line.startsWith('(pen)-> ') && spans(line).some(part => part.color !== 'pen'))).toBe(true);
  }
});

for (const width of [375, 1280]) {
  test(`Algebra ordered 29-line pages, shared palette and native contents at ${width}px in LTR/RTL`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const presentations = [];
    for (const url of ['/ap-world.html', '/ap-lang.html', '/algebra-2.html']) {
      await page.goto(url);
      presentations.push(await page.evaluate(tokens => {
        const rules = sheet => [...sheet.cssRules].flatMap(rule => {
          if (rule.cssRules) return rules(rule);
          if (!rule.selectorText || !/(?:\.ink|\.note\b|\.topic-title|\.page-title)/.test(rule.selectorText)) return [];
          return ['color', 'font-weight'].flatMap(property => rule.style.getPropertyValue(property) ? [[rule.selectorText, property, rule.style.getPropertyValue(property)]] : []);
        });
        return {
          stylesheets: [...document.styleSheets].map(sheet => sheet.href ? new URL(sheet.href).pathname : null),
          tokens: Object.fromEntries(tokens.map(token => [token, getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim()])),
          rules: [...document.styleSheets].flatMap(rules),
          pencil: { color: getComputedStyle(document.querySelector('.note')).color, weight: getComputedStyle(document.querySelector('.note')).fontWeight }
        };
      }, Object.keys(palette)));
    }
    expect(presentations[0].tokens).toEqual(palette);
    expect(presentations[0].stylesheets.filter(href => href !== null)).toEqual(['/styles/site.css']);
    expect(presentations[0].pencil.weight).toBe('400');
    expect(presentations[1]).toEqual(presentations[0]);
    expect(presentations[2]).toEqual(presentations[0]);
    if (width === 1280) await expect(page.locator('.note').first()).toHaveCSS('font-size', '14px');
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
    await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('Algebra 2 Notes');
    expect(await page.locator('.subjects a').allTextContents()).toEqual(['Home', 'AP Lang Notes', 'AP World History Notes', 'Algebra 2 Notes', 'Out Of My Mind Analysis', 'Of Mice And Men Analysis']);
    expect(await page.locator('.subjects a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(['index.html', 'ap-lang.html', 'ap-world.html', 'algebra-2.html', 'out-of-my-mind.html', 'of-mice-and-men.html']);
    const notes = loadAlgebraNotes();
    await expect(page.locator('section.topic')).toHaveCount(8);
    await expect(page.locator('article')).toHaveCount(16);
    await expect(page.locator('.note')).toHaveCount(464);
    expect(await page.locator('.note').allTextContents()).toEqual(notes.flatMap(note => lines(note.source)));
    expect(await page.locator('.contents a').allTextContents()).toEqual(notes.map(note => `${note.label} ${note.title}`));
    expect(await page.locator('.contents a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(files.map(file => `#topic-${file.replaceAll('.', '-')}`));
    expect(await page.locator('.note').evaluateAll(elements => elements.map(element => ({ color: getComputedStyle(element).color, weight: getComputedStyle(element).fontWeight })))).toEqual(Array(464).fill(presentations[0].pencil));
    const colors = Object.fromEntries(Object.entries(palette).map(([token, hex]) => [token, `rgb(${hex.slice(1).match(/../g).map(value => parseInt(value, 16)).join(', ')})`]));
    expect(await page.locator('.ink').evaluateAll(elements => elements.map(element => ({ text: element.textContent, className: element.className, color: getComputedStyle(element).color, weight: getComputedStyle(element).fontWeight })))).toEqual(notes.flatMap(note => lines(note.colored).flatMap(line => spans(line).filter(part => part.color !== 'pen').map(part => ({ text: part.text, className: `ink ${part.color}`, color: colors[part.color], weight: presentations[0].pencil.weight })))));
    for (const [index, note] of notes.entries()) {
      const group = page.locator('section.topic').nth(index);
      await expect(group).toHaveAttribute('id', `topic-${note.file.replaceAll('.', '-')}`);
      await expect(group.locator('article')).toHaveCount(2);
      await expect(group.locator('.line')).toHaveCount(58);
      await expect(group.locator('.note')).toHaveCount(58);
      expect(await group.locator('.note').allTextContents()).toEqual(lines(note.source));
      await expect(group.locator('.topic-title')).toHaveText(`${note.label} ${note.title}`);
      await expect(group.locator('.topic-title')).toBeVisible();
      await expect(group.locator('.topic-title')).toHaveCSS('color', colors.lb);
      await expect(group.locator('.page-title')).toHaveText(Array(2).fill(`${note.label} ${note.title}`));
      for (const part of [0, 1]) {
        const article = group.locator('article').nth(part);
        await expect(article.locator('.line')).toHaveCount(29);
        await expect(article.locator('.note')).toHaveCount(29);
        expect(await article.locator('.note').allTextContents()).toEqual(lines(note.source).slice(part * 29, part * 29 + 29));
        await expect(article.locator('.caption')).toHaveText(`Page ${part + 1} · Lines ${part * 29 + 1}–${part * 29 + 29}`);
        expect(await article.locator('.number').allTextContents()).toEqual(Array.from({ length: 29 }, (_, index) => String(part * 29 + index + 1)));
      }
    }
    for (const direction of ['ltr', 'rtl']) {
      await page.evaluate(direction => document.documentElement.dir = direction, direction);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('html')).toHaveAttribute('dir', direction);
      expect(await page.locator('.note').allTextContents()).toEqual(notes.flatMap(note => lines(note.source)));
      for (const [index, note] of notes.entries()) {
        const id = `topic-${note.file.replaceAll('.', '-')}`;
        await page.locator('.contents a').nth(index).click();
        expect(new URL(page.url()).hash).toBe(`#${id}`);
        await expect(page.locator(`[id="${id}"] .topic-title`)).toBeInViewport();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('World, Algebra and Analysis follow AP Lang in keyboard order in LTR/RTL', async ({ page }) => {
  for (const direction of ['ltr', 'rtl']) {
    await page.goto('/ap-lang.html');
    await page.evaluate(direction => document.documentElement.dir = direction, direction);
    await page.getByRole('link', { name: 'AP Lang Notes', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'AP World History Notes', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Algebra 2 Notes', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/algebra-2.html$/);
    await page.evaluate(direction => document.documentElement.dir = direction, direction);
    await page.getByRole('link', { name: 'Algebra 2 Notes', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Out Of My Mind Analysis', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/out-of-my-mind.html$/);
    await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('Out Of My Mind Analysis');
    await page.evaluate(direction => document.documentElement.dir = direction, direction);
    await page.getByRole('link', { name: 'Out Of My Mind Analysis', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('link', { name: 'Algebra 2 Notes', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/algebra-2.html$/);
    await page.evaluate(direction => document.documentElement.dir = direction, direction);
    await page.getByRole('link', { name: 'Algebra 2 Notes', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('link', { name: 'AP World History Notes', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('link', { name: 'AP Lang Notes', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/ap-lang.html$/);
  }
});

test('all Algebra embedded downloads and relative HTTP files contain exact source bytes', async ({ page, request }) => {
  await page.goto('/algebra-2.html');
  await expect(page.locator('a[download]')).toHaveCount(16);
  await expect(page.locator('a[href^="notes/"]')).toHaveCount(16);
  for (const [index, note] of loadAlgebraNotes().entries()) {
    const group = page.locator('section.topic').nth(index);
    for (const version of ['original', 'colored']) {
      const colored = version === 'colored';
      const bytes = Buffer.from(colored ? note.colored : note.source);
      const link = group.getByRole('link', { name: `Download ${note.label} ${version}`, exact: true });
      await expect(link).toHaveAttribute('download', `${note.file}${colored ? '-colored' : ''}.txt`);
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^data:text\/plain;charset=utf-8;base64,[A-Za-z0-9+/]+=*$/);
      expect(Buffer.from(href.split(',')[1], 'base64')).toEqual(bytes);
      const source = group.getByRole('link', { name: `Open ${version} file`, exact: true });
      const relative = `notes/algebra-2/${colored ? 'Colored/' : ''}${note.file}.txt`;
      await expect(source).toHaveAttribute('href', relative);
      expect(readFileSync(resolve(root, relative))).toEqual(bytes);
      const response = await request.get(relative);
      expect(response.ok()).toBe(true);
      expect(await response.body()).toEqual(bytes);
    }
  }
});

test('offline file with JavaScript disabled exposes sixteen 29-line Algebra pages and real downloads', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const url = pathToFileURL(resolve(root, 'algebra-2.html')).href;
  await page.goto(url);
  await expect(page.locator('link')).toHaveCount(1);
  await expect(page.locator('link')).toHaveAttribute('rel', 'stylesheet');
  await expect(page.locator('link')).toHaveAttribute('href', 'styles/site.css');
  expect(readFileSync(new URL('styles/site.css', url)).length).toBeGreaterThan(0);
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(246, 243, 235)');
  await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
  const notes = loadAlgebraNotes();
  await expect(page.locator('article')).toHaveCount(16);
  await expect(page.locator('.note')).toHaveCount(464);
  expect(await page.locator('.note').allTextContents()).toEqual(notes.flatMap(note => lines(note.source)));
  for (const href of await page.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href')).filter(href => !href.startsWith('#') && !href.startsWith('data:')))) {
    expect(readFileSync(new URL(href, url)).length, `offline relative target ${href} exists and is nonempty`).toBeGreaterThan(0);
  }
  for (const [index, article] of (await page.locator('article').all()).entries()) {
    await expect(article).toBeVisible();
    await expect(article.locator('.note')).toHaveCount(29);
    expect(await article.locator('.note').allTextContents()).toEqual(lines(notes[Math.floor(index / 2)].source).slice((index % 2) * 29, (index % 2) * 29 + 29));
    await expect(article.locator('.caption')).toHaveText(`Page ${(index % 2) + 1} · Lines ${(index % 2) * 29 + 1}–${(index % 2) * 29 + 29}`);
  }
  for (const [index, note] of notes.entries()) {
    const group = page.locator('section.topic').nth(index);
    for (const version of ['original', 'colored']) {
      const link = group.getByRole('link', { name: `Open ${version} file`, exact: true });
      expect(readFileSync(new URL(await link.getAttribute('href'), url))).toEqual(Buffer.from(version === 'colored' ? note.colored : note.source));
    }
  }
  // Exercise both download variants without Chromium's bulk-download throttling.
  for (const [index, version] of [[0, 'original'], [7, 'colored']]) {
    const note = notes[index];
    const download = page.waitForEvent('download');
    await page.locator('section.topic').nth(index).getByRole('link', { name: `Download ${note.label} ${version}`, exact: true }).click();
    const file = await download;
    expect(await file.failure()).toBeNull();
    expect(file.suggestedFilename()).toBe(`${note.file}${version === 'colored' ? '-colored' : ''}.txt`);
    expect(readFileSync(await file.path())).toEqual(Buffer.from(version === 'colored' ? note.colored : note.source));
  }
  await page.locator('.contents a').last().click();
  expect(new URL(page.url()).hash).toBe('#topic-1-7-3-combined');
  await context.close();
});

test('Algebra accessibility permits only existing ink/title contrast exceptions', async ({ page }) => {
  await page.goto('/algebra-2.html');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map(violation => violation.id)).toEqual(['color-contrast']);
  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      for (const selector of node.target) {
        expect(await page.locator(selector).evaluate(element => element.matches('.ink, .topic-title, .page-title'))).toBe(true);
      }
    }
  }
});

test('Algebra prints sixteen physical A4 pages with visible titles and 29 lines each', async ({ page }) => {
  await page.setViewportSize({ width: Math.floor((210 - 24) * 96 / 25.4), height: 1123 });
  await page.emulateMedia({ media: 'print' });
  await page.goto('/ap-world.html');
  const world = await page.locator('.note').first().evaluate(note => ({ fontSize: getComputedStyle(note).fontSize, lineHeight: getComputedStyle(note).lineHeight, rowHeight: note.closest('.line').getBoundingClientRect().height }));
  expect(world.rowHeight).toBeCloseTo(8.8 * 96 / 25.4, 1);
  await page.goto('/algebra-2.html');
  await expect(page.locator('header')).toBeHidden();
  await expect(page.locator('.wrap')).toHaveCSS('padding-inline-start', '0px');
  await expect(page.locator('.wrap')).toHaveCSS('padding-inline-end', '0px');
  await expect(page.locator('article')).toHaveCount(16);
  await expect(page.locator('.page-title')).toHaveCount(16);
  const rows = await page.locator('.note').evaluateAll(notes => notes.map(note => ({ fontSize: getComputedStyle(note).fontSize, lineHeight: getComputedStyle(note).lineHeight, rowHeight: note.closest('.line').getBoundingClientRect().height })));
  // Algebra keeps World History note typography; only the row height may compress to seat 29 lines on A4.
  expect(rows.map(row => ({ fontSize: row.fontSize, lineHeight: row.lineHeight }))).toEqual(Array(464).fill({ fontSize: world.fontSize, lineHeight: world.lineHeight }));
  expect(new Set(rows.map(row => row.rowHeight)).size).toBe(1);
  expect(rows[0].rowHeight).toBeLessThan(world.rowHeight);
  for (const article of await page.locator('article').all()) {
    await expect(article.locator('.page-title')).toBeVisible();
    await expect(article.locator('.page-title')).toHaveCSS('color', 'rgb(89, 184, 231)');
    await expect(article.locator('.line')).toHaveCount(29);
    await expect(article.locator('.note')).toHaveCount(29);
  }
  expect(await page.locator('.note').evaluateAll(notes => notes.filter(note => note.getBoundingClientRect().height > note.closest('.line').getBoundingClientRect().height + 1).map(note => note.textContent)), 'printed notes fit line heights within 1px').toEqual([]);
  expect(await page.locator('.line').evaluateAll(lines => lines.filter(line => line.getBoundingClientRect().bottom > line.closest('.sheet').getBoundingClientRect().bottom + 1).map(line => line.textContent)), 'printed lines stay inside sheets within 1px').toEqual([]);
  expect(await page.locator('article').evaluateAll(articles => articles.filter(article => article.getBoundingClientRect().height > (297 - 24) * 96 / 25.4 + 1).map(article => article.textContent)), 'each 29-line article fits the printable A4 height').toEqual([]);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(16);
});
