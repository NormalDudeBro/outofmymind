import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadNotes, palette, root } from '../scripts/build.mjs';

test('native unit navigation, fragments, history and keyboard', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#notes$/);
  await page.locator('nav a[href="#unit-1"]').click();
  await expect(page).toHaveURL(/#unit-1$/);
  await page.locator('nav a[href="#unit-2"]').click();
  await expect(page).toHaveURL(/#unit-2$/);
  await page.goBack();
  await expect(page).toHaveURL(/#unit-1$/);
  await page.goForward();
  await expect(page).toHaveURL(/#unit-2$/);
  await page.reload();
  await expect(page.locator('#unit-2')).toBeVisible();
  await expect(page.locator('.topic')).toHaveCount(14);
});

for (const width of [375, 1280]) {
  test(`complete ordered notes, palette, downloads, no overflow at ${width}px`, async ({ page, request }) => {
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    await expect(page.locator('article')).toHaveCount(28);
    await expect(page.locator('.note')).toHaveCount(672);
    expect(requests).toEqual(['http://127.0.0.1:4173/']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('.topic-title').first()).toHaveCSS('color', 'rgb(89, 184, 231)');
    for (const [token, hex] of Object.entries(palette)) {
      expect(await page.evaluate(token => getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim(), token)).toBe(hex);
    }
    const topics = loadNotes().flatMap(unit => unit.topics);
    for (const [index, topic] of topics.entries()) {
      const group = page.locator('.topic').nth(index);
      await expect(group).toBeVisible();
      expect(await group.locator('.note').allTextContents()).toEqual(topic.original.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n'));
      await expect(group.locator('.downloads a[download]')).toHaveCount(2);
      await expect(group.locator('.downloads a[href^="notes/"]')).toHaveCount(2);
      for (const [n, link] of (await group.locator('.downloads a[download]').all()).entries()) {
        expect(await link.getAttribute('download')).toBe(`${topic.file}.txt`);
        expect(Buffer.from((await link.getAttribute('href')).split(',')[1], 'base64').toString('utf8')).toBe(n ? topic.colored : topic.original);
      }
      for (const [n, link] of (await group.locator('.downloads a[href^="notes/"]').all()).entries()) {
        await expect(link).toHaveText(n ? 'Open colored file' : 'Open original file');
        const href = await link.getAttribute('href');
        expect(href).toBe(`notes/unit-${index < 7 ? 1 : 2}/${n ? 'Colored/' : ''}${topic.file}.txt`);
        const response = await request.get(href);
        expect(response.ok()).toBe(true);
        expect(await response.body()).toEqual(Buffer.from(n ? topic.colored : topic.original));
      }
    }
    if (process.env.PREVIEW_PATH) {
      await page.goto(pathToFileURL(resolve(process.env.PREVIEW_PATH)).href);
      await expect(page.locator('article')).toHaveCount(28);
      expect(await page.locator('.note').allTextContents()).toEqual(topics.flatMap(topic => topic.original.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
}

test('no JavaScript over HTTP and file:// exposes everything and local downloads', async ({ browser }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const url of ['http://127.0.0.1:4173/', pathToFileURL(resolve(root, 'index.html')).href, ...(process.env.PREVIEW_PATH ? [pathToFileURL(resolve(process.env.PREVIEW_PATH)).href] : [])]) {
    await page.goto(url);
    await expect(page.locator('.topic')).toHaveCount(14);
    await expect(page.locator('article')).toHaveCount(28);
    for (const article of await page.locator('article').all()) {
      await expect(article).toBeVisible();
      await expect(article.locator('.note')).toHaveCount(24);
    }
    await page.locator('nav a[href="#unit-2"]').click();
    await expect(page).toHaveURL(/#unit-2$/);
    for (const [index, topic] of loadNotes().flatMap(unit => unit.topics).entries()) {
      const group = page.locator('.topic').nth(index);
      await expect(group.locator('.downloads a[href^="notes/"]')).toHaveCount(2);
      for (const [n, link] of (await group.locator('.downloads a[href^="notes/"]').all()).entries()) {
        await expect(link).toHaveText(n ? 'Open colored file' : 'Open original file');
        const href = await link.getAttribute('href');
        expect(href).toBe(`notes/unit-${index < 7 ? 1 : 2}/${n ? 'Colored/' : ''}${topic.file}.txt`);
        const target = new URL(href, url);
        if (target.protocol === 'file:') {
          expect(readFileSync(target)).toEqual(Buffer.from(n ? topic.colored : topic.original));
        } else {
          const response = await context.request.get(target.href);
          expect(response.ok()).toBe(true);
          expect(await response.body()).toEqual(Buffer.from(n ? topic.colored : topic.original));
        }
      }
      await expect(group.locator('.downloads a[download]')).toHaveCount(2);
      for (const [n, link] of (await group.locator('.downloads a[download]').all()).entries()) {
        await test.step(`${url}: ${topic.file} ${n ? 'colored' : 'original'}`, async () => {
          const download = page.waitForEvent('download', { timeout: 5_000 });
          await link.click();
          const result = await download;
          expect(await result.failure()).toBeNull();
          expect(result.suggestedFilename()).toBe(`${topic.file}.txt`);
          expect(readFileSync(await result.path(), 'utf8')).toBe(n ? topic.colored : topic.original);
          // Chromium blocks more than ten downloads per second per frame.
          await page.waitForTimeout(250);
        });
      }
    }
  }
  await context.close();
});

test('accessibility: only the documented approved-palette contrast exception', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  // Do not disable contrast scanning: assert exactly this known limitation and
  // restrict every affected element to the approved colored note presentation.
  expect(results.violations.map(item => item.id)).toEqual(['color-contrast']);
  for (const node of results.violations[0].nodes) {
    for (const selector of node.target) {
      expect(await page.locator(selector).evaluate(element => element.matches('.ink, .topic-title, .page-title'))).toBe(true);
    }
  }
});

test('print produces exactly 28 physical A4 pages', async ({ page }) => {
  for (const url of ['/', ...(process.env.PREVIEW_PATH ? [pathToFileURL(resolve(process.env.PREVIEW_PATH)).href] : [])]) {
    await page.goto(url);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('header')).toBeHidden();
    await expect(page.locator('.page-title').first()).toBeVisible();
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(28);
  }
});
