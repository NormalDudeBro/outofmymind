import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadLangNotes, root } from '../scripts/build.mjs';

for (const width of [375, 1280]) {
  test(`AP Lang navigation and complete colored notes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    await page.getByRole('link', { name: 'AP Lang notes', exact: true }).click();
    await expect(page).toHaveURL(/\/ap-lang.html$/);
    await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('AP Lang notes');
    await expect(page.getByRole('heading', { name: 'AP Lang Unit 1: Rhetorical Analysis', exact: true, level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('AP Lang Unit 1: Rhetorical Analysis');
    const notes = loadLangNotes();
    await expect(page.locator('.note')).toHaveCount(96);
    expect(await page.locator('.note').allTextContents()).toEqual(notes.sections.flatMap(section => section.lines));
    await expect(page.locator('article')).toHaveCount(2);
    for (const index of [0, 1]) {
      await expect(page.locator('article').nth(index).locator('.note')).toHaveCount(48);
      expect(await page.locator('article').nth(index).locator('.note').allTextContents()).toEqual(notes.sections.slice(index * 6, index * 6 + 6).flatMap(section => section.lines));
    }
    const colors = { blue: 'rgb(23, 63, 136)', purple: 'rgb(120, 48, 170)', green: 'rgb(18, 108, 46)', red: 'rgb(189, 32, 37)', black: 'rgb(37, 37, 37)', orange: 'rgb(163, 68, 0)', teal: 'rgb(8, 105, 105)' };
    expect(await page.locator('.note > span').evaluateAll(spans => spans.map(span => ({ text: span.textContent, className: span.className, color: getComputedStyle(span).color })))).toEqual(notes.sections.flatMap(section => section.lines.map((text, index) => ({ text, className: `lang-${section.color}${index === 0 ? ' section-heading' : ''}`, color: colors[section.color] }))));
    await expect(page.locator('.note > .section-heading')).toHaveCount(12);
    expect(await page.locator('.note > .section-heading').evaluateAll(spans => spans.every(span => Number(getComputedStyle(span).fontWeight) >= 700))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => document.documentElement.dir = 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(await page.locator('.note').allTextContents()).toEqual(notes.sections.flatMap(section => section.lines));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'AP World History notes', exact: true }).click();
    await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('AP World History notes');
    await expect(page.locator('article')).toHaveCount(28);
  });
}

test('subject navigation works with Tab and Enter in both directions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'AP World History notes', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'AP Lang notes', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/ap-lang.html$/);
  await page.getByRole('link', { name: 'AP Lang notes', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: 'AP World History notes', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/index.html$/);
  await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('AP World History notes');
});

test('AP Lang works offline without JavaScript and downloads exact notes', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const url of ['http://127.0.0.1:4173/ap-lang.html', pathToFileURL(resolve(root, 'ap-lang.html')).href]) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'AP Lang Unit 1: Rhetorical Analysis', exact: true, level: 1 })).toBeVisible();
    await expect(page.locator('.note')).toHaveCount(96);
    await expect(page.locator('article')).toHaveCount(2);
    for (const index of [0, 1]) await expect(page.locator('article').nth(index).locator('.note')).toHaveCount(48);
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download AP Lang notes', exact: true }).click();
    const file = await download;
    expect(await file.failure()).toBeNull();
    expect(file.suggestedFilename()).toBe('ap-lang.txt');
    expect(readFileSync(await file.path())).toEqual(Buffer.from(loadLangNotes().source));
    await page.getByRole('link', { name: 'AP World History notes', exact: true }).click();
    await expect(page.locator('.note')).toHaveCount(672);
  }
  await context.close();
});

test('AP Lang has accessible colors and prints two physical PDF pages', async ({ page }) => {
  await page.goto('/ap-lang.html');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  // Match A4's printable width with the renderer's 12mm page margins.
  await page.setViewportSize({ width: Math.floor((210 - 24) * 96 / 25.4), height: 1123 });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('header')).toBeHidden();
  expect(await page.locator('.note').evaluateAll(notes => notes.filter(note => note.getBoundingClientRect().height > note.closest('.line').getBoundingClientRect().height + 1).map(note => note.textContent)), 'printed notes fit their line heights within 1px').toEqual([]);
  expect(await page.locator('.line').evaluateAll(lines => lines.filter(line => line.getBoundingClientRect().bottom > line.closest('.sheet').getBoundingClientRect().bottom + 1).map(line => line.textContent)), 'printed lines stay within their sheet bottoms within 1px').toEqual([]);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(2);
});
