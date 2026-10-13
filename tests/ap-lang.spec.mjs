import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadLangNotes, palette, root } from '../scripts/build.mjs';

for (const width of [375, 1280]) {
  test(`AP Lang navigation and four ordered 24-line pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/ap-world.html');
    const historyTokens = await page.evaluate(tokens => Object.fromEntries(tokens.map(token => [token, getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim()])), Object.keys(palette));
    const historyPencil = await page.locator('.note').first().evaluate(note => ({ color: getComputedStyle(note).color, weight: getComputedStyle(note).fontWeight }));
    await page.getByRole('link', { name: 'AP Lang Notes', exact: true }).click();
    await expect(page).toHaveURL(/\/ap-lang.html$/);
    await expect(page.locator('link')).toHaveCount(1);
    await expect(page.locator('link')).toHaveAttribute('rel', 'stylesheet');
    await expect(page.locator('link')).toHaveAttribute('href', 'styles/site.css');
    await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('AP Lang Notes');
    await expect(page.getByRole('heading', { name: 'AP Lang Unit 1: Rhetorical Analysis', exact: true, level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('AP Lang Unit 1: Rhetorical Analysis');
    const notes = loadLangNotes();
    await expect(page.locator('.note')).toHaveCount(96);
    expect(await page.locator('.note').allTextContents()).toEqual(notes.sections.flatMap(section => section.lines));
    await expect(page.locator('article')).toHaveCount(4);
    for (const index of [0, 1, 2, 3]) {
      await expect(page.locator('article').nth(index).locator('.note')).toHaveCount(24);
      expect(await page.locator('article').nth(index).locator('.note').allTextContents()).toEqual(notes.sections.flatMap(section => section.lines).slice(index * 24, (index + 1) * 24));
    }
    expect(historyTokens).toEqual(palette);
    expect(await page.evaluate(tokens => Object.fromEntries(tokens.map(token => [token, getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim()])), Object.keys(palette))).toEqual(historyTokens);
    await expect(page.locator('.topic-title')).toBeVisible();
    await expect(page.locator('.topic-title')).toHaveText('AP Lang Unit 1: Rhetorical Analysis');
    await expect(page.locator('.topic-title')).toHaveCSS('color', 'rgb(89, 184, 231)');
    const colors = Object.fromEntries(Object.entries(palette).map(([token, hex]) => [token, `rgb(${hex.slice(1).match(/../g).map(value => parseInt(value, 16)).join(', ')})`]));
    expect(historyPencil.color).toBe(colors.pen);
    expect(await page.locator('.note').evaluateAll(notes => notes.map(note => ({ color: getComputedStyle(note).color, weight: getComputedStyle(note).fontWeight })))).toEqual(Array(96).fill(historyPencil));
    const coloredLines = notes.colored.replace(/\n$/, '').split('\n');
    const expectedRuns = coloredLines.map(line => [...line.matchAll(/\(([a-z]+)\)([^()]*)/g)].filter(match => match[1] !== 'pen').map(match => ({ text: match[2], className: `ink ${match[1]}`, color: colors[match[1]], weight: historyPencil.weight })));
    expect(await page.locator('.note').evaluateAll(notes => notes.map(note => [...note.children].map(span => ({ text: span.textContent, className: span.className, color: getComputedStyle(span).color, weight: getComputedStyle(span).fontWeight }))))).toEqual(expectedRuns);
    await expect(page.locator('[class*="lang-"], .section-heading')).toHaveCount(0);
    expect(await page.locator('.note').evaluateAll(notes => notes.filter(note => note.textContent.startsWith('-> ')).every(note => [...note.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').slice(3).trim().length > 0))).toBe(true);
    expect(await page.locator('.note').evaluateAll(notes => notes.some(note => note.textContent.startsWith('-> ') && note.querySelector('.ink') !== null))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => document.documentElement.dir = 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(await page.locator('.note').allTextContents()).toEqual(notes.sections.flatMap(section => section.lines));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'AP World History Notes', exact: true }).click();
    await expect(page).toHaveURL(/\/ap-world.html$/);
    await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('AP World History Notes');
    await expect(page.locator('article')).toHaveCount(28);
  });
}

test('subject navigation works with Tab and Enter in both directions', async ({ page }) => {
  await page.goto('/ap-world.html');
  await page.getByRole('link', { name: 'Home', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'AP Lang Notes', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/ap-lang.html$/);
  await page.getByRole('link', { name: 'AP Lang Notes', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'AP World History Notes', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/ap-world.html$/);
  await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('AP World History Notes');
  await page.getByRole('link', { name: 'AP World History Notes', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: 'AP Lang Notes', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/ap-lang.html$/);
  await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('AP Lang Notes');
  await page.getByRole('link', { name: 'AP Lang Notes', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/index.html$/);
  await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('Home');
  await expect(page.locator('.note')).toHaveCount(0);
});

test('both AP Lang downloads work with Tab and Enter in LTR and RTL', async ({ page }) => {
  await page.goto('/ap-lang.html');
  const notes = loadLangNotes();
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate(direction => document.documentElement.dir = direction, direction);
    const original = page.getByRole('link', { name: 'Download AP Lang original', exact: true });
    const colored = page.getByRole('link', { name: 'Download AP Lang colored', exact: true });
    await original.focus();
    await page.keyboard.press('Tab');
    await expect(colored).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(original).toBeFocused();
    for (const [index, link] of [original, colored].entries()) {
      await link.focus();
      const download = page.waitForEvent('download');
      await page.keyboard.press('Enter');
      const file = await download;
      expect(await file.failure()).toBeNull();
      expect(file.suggestedFilename()).toBe(index ? 'ap-lang-colored.txt' : 'ap-lang.txt');
      expect(readFileSync(await file.path())).toEqual(Buffer.from(index ? notes.colored : notes.source));
    }
  }
});

test('AP Lang exposes four 24-line pages offline without JavaScript and downloads exact notes', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const url of ['http://127.0.0.1:4173/ap-lang.html', pathToFileURL(resolve(root, 'ap-lang.html')).href]) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'AP Lang Unit 1: Rhetorical Analysis', exact: true, level: 1 })).toBeVisible();
    await expect(page.locator('.note')).toHaveCount(96);
    const notes = loadLangNotes();
    await expect(page.locator('article')).toHaveCount(4);
    for (const index of [0, 1, 2, 3]) {
      await expect(page.locator('article').nth(index).locator('.note')).toHaveCount(24);
      expect(await page.locator('article').nth(index).locator('.note').allTextContents()).toEqual(notes.sections.flatMap(section => section.lines).slice(index * 24, (index + 1) * 24));
    }
    expect(await page.locator('.note').allTextContents()).toEqual(notes.sections.flatMap(section => section.lines));
    await expect(page.locator('a[download]')).toHaveCount(2);
    await expect(page.locator('a[href^="notes/"]')).toHaveCount(2);
    for (const [index, version] of ['original', 'colored'].entries()) {
      const bytes = Buffer.from(index ? notes.colored : notes.source);
      const link = page.getByRole('link', { name: `Download AP Lang ${version}`, exact: true });
      await expect(link).toHaveAttribute('download', index ? 'ap-lang-colored.txt' : 'ap-lang.txt');
      expect(Buffer.from((await link.getAttribute('href')).split(',')[1], 'base64')).toEqual(bytes);
      const download = page.waitForEvent('download');
      await link.click();
      const file = await download;
      expect(await file.failure()).toBeNull();
      expect(file.suggestedFilename()).toBe(index ? 'ap-lang-colored.txt' : 'ap-lang.txt');
      expect(readFileSync(await file.path())).toEqual(bytes);
      const source = page.getByRole('link', { name: `Open ${version} file`, exact: true });
      const href = index ? 'notes/Colored/ap-lang.txt' : 'notes/ap-lang.txt';
      await expect(source).toHaveAttribute('href', href);
      const target = new URL(href, url);
      if (target.protocol === 'file:') expect(readFileSync(target)).toEqual(bytes);
      if (target.protocol !== 'file:') {
        const response = await context.request.get(target.href);
        expect(response.ok()).toBe(true);
        expect(await response.body()).toEqual(bytes);
      }
    }
    await page.getByRole('link', { name: 'AP World History Notes', exact: true }).click();
    await expect(page).toHaveURL(/\/ap-world.html$/);
    await expect(page.locator('.note')).toHaveCount(672);
  }
  await context.close();
});

test('AP Lang permits only approved-palette contrast exceptions and prints four physical PDF pages with 24 World History rows each', async ({ page }) => {
  await page.goto('/ap-world.html');
  await page.emulateMedia({ media: 'print' });
  const historyPrint = await page.locator('.note').first().evaluate(note => {
    const style = getComputedStyle(note);
    return { rowHeight: getComputedStyle(note.closest('.line')).height, fontSize: style.fontSize, lineHeight: style.lineHeight, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom };
  });
  expect(parseFloat(historyPrint.rowHeight)).toBeCloseTo(8.8 * 96 / 25.4, 1);
  expect(historyPrint.fontSize).toBe('12px');
  expect(parseFloat(historyPrint.lineHeight)).toBeCloseTo(3.8 * 96 / 25.4, 1);
  expect(parseFloat(historyPrint.paddingTop)).toBeCloseTo(0.6 * 96 / 25.4, 1);
  expect(parseFloat(historyPrint.paddingBottom)).toBeCloseTo(0.6 * 96 / 25.4, 1);
  await page.emulateMedia({ media: 'screen' });
  await page.goto('/ap-lang.html');
  const results = await new AxeBuilder({ page }).analyze();
  // Keep contrast scanning enabled and confine its exception to shared ink/title presentation.
  expect(results.violations.map(item => item.id)).toEqual(['color-contrast']);
  for (const node of results.violations[0].nodes) {
    for (const selector of node.target) {
      expect(await page.locator(selector).evaluate(element => element.matches('.ink, .topic-title, .page-title'))).toBe(true);
    }
  }
  // Match A4's printable width with the renderer's 12mm page margins.
  await page.setViewportSize({ width: Math.floor((210 - 24) * 96 / 25.4), height: 1123 });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('article')).toHaveCount(4);
  for (const article of await page.locator('article').all()) await expect(article.locator('.line')).toHaveCount(24);
  expect(await page.locator('.note').evaluateAll(notes => notes.map(note => {
    const style = getComputedStyle(note);
    return { rowHeight: getComputedStyle(note.closest('.line')).height, fontSize: style.fontSize, lineHeight: style.lineHeight, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom };
  }))).toEqual(Array(96).fill(historyPrint));
  await expect(page.locator('header')).toBeHidden();
  await expect(page.locator('.wrap')).toHaveCSS('padding-inline-start', '0px');
  await expect(page.locator('.wrap')).toHaveCSS('padding-inline-end', '0px');
  await expect(page.locator('.page-title').first()).toBeVisible();
  expect(await page.locator('.page-title').evaluateAll(titles => titles.every(title => getComputedStyle(title).color === 'rgb(89, 184, 231)'))).toBe(true);
  expect(await page.locator('.note').evaluateAll(notes => notes.filter(note => note.getBoundingClientRect().height > note.closest('.line').getBoundingClientRect().height + 1).map(note => note.textContent)), 'printed notes fit their line heights within 1px').toEqual([]);
  expect(await page.locator('.line').evaluateAll(lines => lines.filter(line => line.getBoundingClientRect().bottom > line.closest('.sheet').getBoundingClientRect().bottom + 1).map(line => line.textContent)), 'printed lines stay within their sheet bottoms within 1px').toEqual([]);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(4);
});
