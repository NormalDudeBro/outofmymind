import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const subjects = [
  { path: 'index.html', label: 'Home', heading: 'A collection for curious minds.' },
  { path: 'ap-lang.html', label: 'AP Lang Notes', heading: 'AP Lang Unit 1: Rhetorical Analysis' },
  { path: 'ap-world.html', label: 'AP World History Notes', heading: 'AP World History Notes' },
  { path: 'algebra-2.html', label: 'Algebra 2 Notes', heading: 'Algebra 2 Unit 1B: Relations and Functions' },
  { path: 'out-of-my-mind.html', label: 'Out Of My Mind Analysis', heading: 'Out of My Mind' },
  { path: 'of-mice-and-men.html', label: 'Of Mice And Men Analysis', heading: 'Of Mice and Men' }
];

for (const width of [375, 1280]) {
  test(`Home collection, actual destination clicks and browser history at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const response = await page.goto('/');
    expect(response.ok()).toBe(true);
    await expect(page).toHaveTitle('Joltlined | Notes & Literary Analysis');
    await expect(page.locator('main')).toHaveAttribute('id', 'collection');
    await expect(page.locator('main h1')).toHaveText(subjects[0].heading);
    await expect(page.locator('.subjects a')).toHaveText(subjects.map(subject => subject.label));
    await expect(page.locator('.subjects [aria-current="page"]')).toHaveText('Home');
    for (const subject of subjects.slice(1)) {
      const link = page.locator(`main a[href="${subject.path}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toBeVisible();
      await expect(link).toHaveAccessibleName(/\S/);
    }
    for (const subject of subjects.slice(1)) {
      await page.locator(`main a[href="${subject.path}"]`).click();
      expect(new URL(page.url()).pathname).toBe(`/${subject.path}`);
      await expect(page.getByRole('heading', { name: subject.heading, level: 1, exact: true })).toBeVisible();
      await expect(page.locator('.subjects [aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('.subjects [aria-current="page"]')).toHaveText(subject.label);
      await page.locator('.subjects').getByRole('link', { name: 'Home', exact: true }).click();
      await expect(page).toHaveURL(/\/index\.html$/);
      await expect(page.locator('main h1')).toHaveText(subjects[0].heading);
      await page.goBack();
      expect(new URL(page.url()).pathname).toBe(`/${subject.path}`);
      await expect(page.getByRole('heading', { name: subject.heading, level: 1, exact: true })).toBeVisible();
      await page.goBack();
      await expect(page.locator('main h1')).toHaveText(subjects[0].heading);
      await page.goForward();
      await expect(page.getByRole('heading', { name: subject.heading, level: 1, exact: true })).toBeVisible();
      await page.goForward();
      await expect(page.locator('main h1')).toHaveText(subjects[0].heading);
    }
    await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(1);
    await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute('href', 'styles/site.css');
    expect(await page.locator('link[rel="stylesheet"]').evaluate(element => element.sheet !== null)).toBe(true);
  });

  test(`Home keyboard entry, focus and LTR/RTL layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
    await expect(page.locator('.skip')).toBeVisible();
    await expect(page.locator('.skip')).toHaveAttribute('href', '#collection');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#collection$/);
    await expect(page.locator('main')).toBeFocused();
    for (const direction of ['ltr', 'rtl']) {
      await page.evaluate(direction => document.documentElement.dir = direction, direction);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const subject of subjects.slice(1)) {
        await expect(page.locator(`main a[href="${subject.path}"]`)).toBeVisible();
      }
      await page.locator('.subjects').getByRole('link', { name: 'Home', exact: true }).focus();
      for (const subject of subjects.slice(1)) {
        await page.keyboard.press('Tab');
        const link = page.locator('.subjects').getByRole('link', { name: subject.label, exact: true });
        await expect(link).toBeFocused();
        await expect(link).toBeVisible();
        expect(await link.evaluate(element => {
          const style = getComputedStyle(element);
          return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
        })).toBe(true);
      }
    }
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: subjects.at(-1).heading, level: 1, exact: true })).toBeVisible();
    await page.locator('.subjects').getByRole('link', { name: 'Home', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('main h1')).toHaveText(subjects[0].heading);
  });

  test(`Home has no axe exceptions or broken/remote assets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const errors = [];
    const failures = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => failures.push(request.url()));
    page.on('request', request => requests.push(request.url()));
    await page.goto('/');
    for (const image of await page.locator('img').all()) {
      await expect(image).toBeVisible();
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
      const url = await image.evaluate(element => element.currentSrc);
      expect(new URL(url).origin).toBe('http://127.0.0.1:4173');
      const response = await page.request.get(url);
      expect(response.ok()).toBe(true);
      if (/\.jpe?g$/i.test(new URL(url).pathname)) {
        expect(response.headers()['content-type']).toMatch(/^image\/jpeg/);
        expect([...(await response.body()).subarray(0, 3)]).toEqual([255, 216, 255]);
      }
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
    expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
  });
}

test('Home and all five destinations work over HTTP and file:// without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const url of [
    'http://127.0.0.1:4173/',
    pathToFileURL(resolve(root, 'index.html')).href,
    ...(process.env.PREVIEW_PATH ? [pathToFileURL(resolve(dirname(resolve(process.env.PREVIEW_PATH)), 'index.html')).href] : [])
  ]) {
    await page.goto(url);
    await expect(page.locator('main h1')).toHaveText(subjects[0].heading);
    for (const subject of subjects.slice(1)) {
      await page.locator(`main a[href="${subject.path}"]`).click();
      expect(decodeURIComponent(new URL(page.url()).pathname).endsWith(`/${subject.path}`)).toBe(true);
      await expect(page.getByRole('heading', { name: subject.heading, level: 1, exact: true })).toBeVisible();
      await page.locator('.subjects').getByRole('link', { name: 'Home', exact: true }).click();
      await expect(page.locator('main h1')).toHaveText(subjects[0].heading);
    }
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
    }
  }
  await context.close();
});

test('restored analysis retains historical sections, citation return navigation and accessibility controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.locator('main a[href="out-of-my-mind.html"]').click();
  await expect(page.getByRole('heading', { name: 'Out of My Mind', level: 1, exact: true })).toBeVisible();
  for (const [id, heading] of [
    ['author', 'Author Information'], ['context', 'Contextual Information'], ['characters', 'Characters'],
    ['setting', 'Setting'], ['tone', 'Tone'], ['pov', 'Point of View'], ['plot', 'Plot'], ['citations', 'Works Cited']
  ]) {
    await page.locator(`#main-nav a[href="#${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.getByRole('heading', { name: heading, level: 2, exact: true })).toBeVisible();
    // Match the heading text whether or not CSS adds a decorative prefix.
    if (id === 'characters') await expect(page.locator('#characters').getByRole('heading', { name: /\bMelody Brooks$/, level: 3 })).toBeVisible();
    if (id === 'plot') await expect(page.locator('#plot').getByRole('heading', { name: /\bResolution$/, level: 3 })).toBeVisible();
  }
  await page.locator('#main-nav a[href="#pov"]').click();
  await page.locator('#ref-3-2').click();
  await expect(page).toHaveURL(/#cite-3$/);
  await expect(page.locator('#cite-3')).toBeVisible();
  await page.locator('#cite-3 .cite-badge').click();
  await expect(page).toHaveURL(/#ref-3-2$/);
  await expect(page.getByRole('heading', { name: 'Point of View', level: 2, exact: true })).toBeVisible();
  for (const [name, className] of [
    ['Toggle high contrast mode', 'high-contrast'], ['Toggle readable font', 'dyslexia-friendly'], ['Toggle reduced motion', 'reduce-motion']
  ]) {
    const button = page.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('body')).toHaveClass(new RegExp(`\\b${className}\\b`));
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  }
});
