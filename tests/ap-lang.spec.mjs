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
    await expect(page.getByRole('heading', { name: 'AP Lang notes', exact: true })).toBeVisible();
    const notes = loadLangNotes();
    expect(await page.locator('.note').allTextContents()).toEqual(notes.sections.flatMap(section => section.lines));
    await expect(page.locator('article')).toHaveCount(4);
    for (const color of ['blue', 'purple', 'green', 'red', 'black', 'orange', 'teal']) {
      await expect(page.locator(`.lang-${color}`).first()).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => document.documentElement.dir = 'rtl');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'AP World History notes', exact: true }).click();
    await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('AP World History notes');
    await expect(page.locator('article')).toHaveCount(28);
  });
}

test('AP Lang works offline without JavaScript and downloads exact notes', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const url of ['http://127.0.0.1:4173/ap-lang.html', pathToFileURL(resolve(root, 'ap-lang.html')).href]) {
    await page.goto(url);
    await expect(page.locator('.note')).toHaveCount(120);
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download AP Lang notes', exact: true }).click();
    const file = await download;
    expect(await file.failure()).toBeNull();
    expect(readFileSync(await file.path(), 'utf8')).toBe(loadLangNotes().source);
    await page.getByRole('link', { name: 'AP World History notes', exact: true }).click();
    await expect(page.locator('.note')).toHaveCount(672);
  }
  await context.close();
});

test('AP Lang has accessible colors and prints four sheets', async ({ page }) => {
  await page.goto('/ap-lang.html');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('header')).toBeHidden();
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(4);
});
