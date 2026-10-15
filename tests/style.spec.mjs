import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'ap-lang.html', 'ap-world.html', 'algebra-2.html', 'out-of-my-mind.html', 'of-mice-and-men.html'];
const sectionsPerPage = { 'out-of-my-mind.html': 12, 'of-mice-and-men.html': 12 };

// Compare the shared shell, not the intentionally different content headings or note inks.
async function shell(page) {
  return page.evaluate(() => {
    const styles = (element, properties) => {
      const computed = getComputedStyle(element);
      return Object.fromEntries(properties.map(property => [property, computed.getPropertyValue(property).trim()]));
    };
    const geometry = element => {
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 100) / 100);
    };
    const links = [...document.querySelectorAll('.subjects a')];
    const current = document.querySelector('.subjects [aria-current="page"]');
    const linkProperties = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color', 'text-decoration-line', 'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end', 'border-radius'];
    const currentStyle = styles(current, linkProperties);
    // Remove current-state weight only while measuring, so its different position cannot shift wrapping.
    current.removeAttribute('aria-current');
    const result = {
      palette: styles(document.documentElement, ['--paper', '--ink', '--muted', '--rule', '--accent', 'background-color', 'color']),
      body: styles(document.body, ['font-family', 'color']),
      paper: getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.documentElement).backgroundColor : getComputedStyle(document.body).backgroundColor,
      wrap: styles(document.querySelector('.wrap'), ['max-width', 'padding-inline-start', 'padding-inline-end']),
      masthead: styles(document.querySelector('.masthead'), ['padding-block-start', 'padding-block-end', 'border-block-end-width', 'border-block-end-style', 'border-block-end-color']),
      brand: styles(document.querySelector('.wordmark'), ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color']),
      note: styles(document.querySelector('.masthead-note'), ['font-family', 'font-size', 'color']),
      nav: styles(document.querySelector('.subjects'), ['display', 'flex-wrap', 'row-gap', 'column-gap', 'padding-block-start', 'padding-block-end', 'border-block-end-width', 'border-block-end-color']),
      normal: links.map(link => styles(link, linkProperties)),
      current: currentStyle,
      geometry: [document.querySelector('.masthead'), document.querySelector('.subjects'), ...links].map(geometry)
    };
    current.setAttribute('aria-current', 'page');
    return result;
  });
}

for (const width of [375, 1280]) {
  test(`all six pages share Home's academic shell at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const failures = [];
    const requests = [];
    page.on('requestfailed', request => failures.push(request.url()));
    page.on('request', request => requests.push(request.url()));
    await page.goto('/');
    const home = await shell(page);
    expect(home.palette).toMatchObject({ '--paper': '#f6f3eb', '--ink': '#213749', '--muted': '#586467', '--rule': '#d5cfc2', '--accent': '#83523b' });
    expect(home.paper).toBe('rgb(246, 243, 235)');
    expect(home.body.color).toBe('rgb(33, 55, 73)');
    expect(home.body['font-family']).toMatch(/^Georgia\b/);
    expect(home.wrap['max-width']).toBe('1200px');
    expect(home.brand['font-size']).toBe('30px');
    expect(home.current).toMatchObject({ 'font-size': '12px', 'font-weight': '600', color: 'rgb(131, 82, 59)', 'background-color': 'rgba(0, 0, 0, 0)', 'text-decoration-line': 'underline' });
    for (const normal of home.normal) {
      expect(normal).toMatchObject({ 'font-size': '12px', 'font-weight': '400', color: 'rgb(33, 55, 73)', 'background-color': 'rgba(0, 0, 0, 0)', 'text-decoration-line': 'none' });
      expect(normal['font-family']).toMatch(/system-ui/);
    }
    for (const path of pages) {
      const cssResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/styles/site.css');
      await page.goto(`/${path}`);
      const response = await cssResponse;
      expect(response.ok(), `${path}: stylesheet response`).toBe(true);
      expect(response.headers()['content-type']).toMatch(/^text\/css\b/);
      expect(await response.text()).toBe(readFileSync(resolve(root, 'styles/site.css'), 'utf8'));
      await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(1);
      await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute('href', 'styles/site.css');
      await expect(page.locator('.masthead .wordmark')).toHaveText('Joltlined');
      await expect(page.locator('.masthead .masthead-note')).toHaveText('Notes & literary analysis');
      expect(await shell(page), `${path}: same computed shell as Home`).toEqual(home);
      for (const direction of ['ltr', 'rtl']) {
        await page.evaluate(direction => document.documentElement.dir = direction, direction);
        if (sectionsPerPage[path]) {
          const sections = await page.locator('#main-nav a').evaluateAll(links => links.map(link => link.getAttribute('href')));
          expect(sections).toHaveLength(sectionsPerPage[path]);
          for (const href of sections) {
            await page.locator(`#main-nav a[href="${href}"]`).click();
            await expect(page.locator(`.page${href}`)).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} ${href} ${direction}: no overflow`).toBe(true);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} ${direction}: no overflow`).toBe(true);
      }
    }
    expect(failures).toEqual([]);
    expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
  });
}

test('shared stylesheet loads from local files, including exported previews', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const failures = [];
  page.on('requestfailed', request => failures.push(request.url()));
  for (const directory of [root, ...(process.env.PREVIEW_PATH ? [dirname(resolve(process.env.PREVIEW_PATH))] : [])]) {
    expect(readFileSync(resolve(directory, 'styles/site.css'), 'utf8')).toBe(readFileSync(resolve(root, 'styles/site.css'), 'utf8'));
    for (const path of pages) {
      await page.goto(pathToFileURL(resolve(directory, path)).href);
      await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(1);
      await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute('href', 'styles/site.css');
      expect(await page.locator('link[rel="stylesheet"]').evaluate(element => element.sheet !== null), `${path}: offline stylesheet loaded`).toBe(true);
      await expect(page.locator('body')).toHaveCSS('font-family', /Georgia/);
    }
  }
  expect(failures).toEqual([]);
  await context.close();
});
