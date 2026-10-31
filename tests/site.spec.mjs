import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadNotes, palette, root } from '../scripts/build.mjs';

test('native unit navigation, fragments, history and keyboard', async ({ page }) => {
  await page.goto('/ap-world.html');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#notes$/);
  await page.locator('nav a[href="#unit-1"]').click();
  await expect(page).toHaveURL(/#unit-1$/);
  await page.locator('nav a[href="#unit-2"]').click();
  await expect(page).toHaveURL(/#unit-2$/);
  await page.locator('nav a[href="#unit-3"]').click();
  await expect(page).toHaveURL(/#unit-3$/);
  await page.goBack();
  await expect(page).toHaveURL(/#unit-2$/);
  await page.goBack();
  await expect(page).toHaveURL(/#unit-1$/);
  await page.goForward();
  await expect(page).toHaveURL(/#unit-2$/);
  await page.goForward();
  await expect(page).toHaveURL(/#unit-3$/);
  await page.reload();
  await expect(page.locator('#unit-3')).toBeVisible();
  await expect(page.locator('.topic')).toHaveCount(18);
  for (const [index, topic] of loadNotes()[2].topics.entries()) {
    await page.locator(`.contents a[href="#topic-${topic.file.replaceAll('.', '-')}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#topic-${topic.file.replaceAll('.', '-')}$`));
    const section = page.locator(`#topic-${topic.file.replaceAll('.', '-')}`);
    await expect(section.locator('.topic-title')).toHaveText(`3.${index + 1} ${topic.title}`);
    await expect(section.locator('.note')).toHaveText(topic.original.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n'));
    await expect(section.locator('.pages article')).toHaveCount(2);
    await expect(section.locator('.pages article .note')).toHaveCount(48);
    for (const [pageIndex, article] of (await section.locator('article').all()).entries()) {
      await expect(article.locator('.note')).toHaveText(topic.original.trimEnd().split('\n').slice(pageIndex * 24, (pageIndex + 1) * 24));
    }
  }
});

for (const width of [375, 1280]) {
  test(`complete ordered notes, palette, downloads, no overflow at ${width}px`, async ({ page, request }) => {
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/ap-world.html');
    await expect(page.locator('article')).toHaveCount(36);
    await expect(page.locator('.note')).toHaveCount(864);
    expect(requests).toEqual(['http://127.0.0.1:4173/ap-world.html', 'http://127.0.0.1:4173/styles/site.css']);
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
        expect(await link.getAttribute('download')).toBe(`${topic.file}${n && index >= 14 ? '-colored' : ''}.txt`);
        expect(Buffer.from((await link.getAttribute('href')).split(',')[1], 'base64').toString('utf8')).toBe(n ? topic.colored : topic.original);
      }
      for (const [n, link] of (await group.locator('.downloads a[href^="notes/"]').all()).entries()) {
        await expect(link).toHaveText(n ? 'Open colored file' : 'Open original file');
        const href = await link.getAttribute('href');
        expect(href).toBe(`notes/unit-${index < 7 ? 1 : index < 14 ? 2 : 3}/${n ? 'Colored/' : ''}${topic.file}.txt`);
        const response = await request.get(href);
        expect(response.ok()).toBe(true);
        expect(await response.body()).toEqual(Buffer.from(n ? topic.colored : topic.original));
      }
    }
    if (process.env.PREVIEW_PATH) {
      await page.goto(pathToFileURL(resolve(process.env.PREVIEW_PATH)).href);
      await expect(page.locator('article')).toHaveCount(36);
      expect(await page.locator('.note').allTextContents()).toEqual(topics.flatMap(topic => topic.original.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
}

for (const width of [375, 1280]) {
  test(`all six pages share Home academic chrome at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const presentations = [];
    for (const path of ['index.html', 'ap-lang.html', 'ap-world.html', 'algebra-2.html', 'out-of-my-mind.html', 'of-mice-and-men.html']) {
      await page.goto(`/${path}`);
      await expect(page.locator('link')).toHaveCount(1);
      await expect(page.locator('link')).toHaveAttribute('rel', 'stylesheet');
      await expect(page.locator('link')).toHaveAttribute('href', 'styles/site.css');
      await expect(page.locator('.masthead .wordmark')).toHaveText('Joltlined');
      await expect(page.locator('.masthead-note')).toHaveText('Notes & literary analysis');
      expect(await page.locator('.subjects a').allTextContents()).toEqual(['Home', 'AP Lang Notes', 'AP World History Notes', 'Algebra 2 Notes', 'Out Of My Mind Analysis', 'Of Mice And Men Analysis']);
      expect(await page.locator('.subjects a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(['index.html', 'ap-lang.html', 'ap-world.html', 'algebra-2.html', 'out-of-my-mind.html', 'of-mice-and-men.html']);
      presentations.push(await page.evaluate(() => {
        const style = selector => {
          const value = getComputedStyle(document.querySelector(selector));
          return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor', 'paddingInlineStart', 'paddingInlineEnd', 'maxWidth'].map(property => [property, value[property]]));
        };
        return Object.fromEntries(['html', 'body', '.masthead', '.wordmark', '.masthead-note', '.subjects', '.subjects a:not([aria-current])', '.subjects [aria-current="page"]', '.wrap'].map(selector => [selector, style(selector)]));
      }));
      await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(246, 243, 235)');
      await expect(page.locator('html')).toHaveCSS('color', 'rgb(33, 55, 73)');
      await expect(page.locator('html')).toHaveCSS('font-family', 'Georgia, "Times New Roman", serif');
      await expect(page.locator('html')).toHaveCSS('font-weight', '400');
      await expect(page.locator('body')).toHaveCSS('font-weight', '400');
      await expect(page.locator('.wrap')).toHaveCSS('max-width', '1200px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    for (const presentation of presentations.slice(1)) expect(presentation).toEqual(presentations[0]);
  });
}

test('no JavaScript over HTTP and file:// exposes everything and local downloads', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const url of ['http://127.0.0.1:4173/ap-world.html', pathToFileURL(resolve(root, 'ap-world.html')).href, ...(process.env.PREVIEW_PATH ? [pathToFileURL(resolve(process.env.PREVIEW_PATH)).href] : [])]) {
    await page.goto(url);
    await expect(page.locator('.topic')).toHaveCount(18);
    await expect(page.locator('article')).toHaveCount(36);
    for (const topic of loadNotes()[2].topics) await expect(page.locator(`#topic-${topic.file.replaceAll('.', '-')} .pages article`)).toHaveCount(2);
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
        expect(href).toBe(`notes/unit-${index < 7 ? 1 : index < 14 ? 2 : 3}/${n ? 'Colored/' : ''}${topic.file}.txt`);
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
          expect(result.suggestedFilename()).toBe(`${topic.file}${n && index >= 14 ? '-colored' : ''}.txt`);
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
  await page.goto('/ap-world.html');
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

test('print produces exactly 36 physical A4 pages', async ({ page }) => {
  await page.setViewportSize({ width: Math.floor((210 - 24) * 96 / 25.4), height: 1123 });
  for (const url of ['/ap-world.html', ...(process.env.PREVIEW_PATH ? [pathToFileURL(resolve(process.env.PREVIEW_PATH)).href] : [])]) {
    await page.goto(url);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('header')).toBeHidden();
    await expect(page.locator('.wrap')).toHaveCSS('padding-inline-start', '0px');
    await expect(page.locator('.wrap')).toHaveCSS('padding-inline-end', '0px');
    await expect(page.locator('.page-title').first()).toBeVisible();
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(36);
    const unit3 = page.locator('#unit-3');
    await expect(unit3.locator('.topic')).toHaveCount(4);
    await expect(unit3.locator('article')).toHaveCount(8);
    await expect(unit3.locator('.note')).toHaveCount(192);
    for (const article of await unit3.locator('article').all()) {
      await expect(article.locator('.note')).toHaveCount(24);
      expect(await article.evaluate(article => {
        const sheet = article.querySelector('.sheet');
        const sheetBottom = sheet.getBoundingClientRect().bottom;
        return [...article.querySelectorAll('.line')].every(line => {
          const note = line.querySelector('.note');
          const lineRect = line.getBoundingClientRect();
          return note.getBoundingClientRect().height <= lineRect.height + 1 && note.getBoundingClientRect().bottom <= lineRect.bottom + 1 && lineRect.bottom <= sheetBottom + 1;
        });
      })).toBe(true);
    }
    await page.locator('#unit-1, #unit-2').evaluateAll(units => units.forEach(unit => unit.remove()));
    const unitPDF = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect((unitPDF.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(8);
    for (const index of [0, 1, 2, 3]) {
      const topicPDF = await page.pdf({ preferCSSPageSize: true, pageRanges: `${index * 2 + 1}-${index * 2 + 2}` });
      expect((topicPDF.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(2);
    }
  }
});
