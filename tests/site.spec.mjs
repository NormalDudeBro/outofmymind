import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    if (route.request().resourceType() === 'image') return route.abort();
    return route.continue();
  });
});

test('direct fragments, navigation, and browser history stay in sync', async ({ page }) => {
  await page.goto('/#plot');
  await expect(page.locator('#plot')).toBeVisible();
  await expect(page.locator('#home')).toBeHidden();
  await expect(page.locator('#main-nav [data-page="plot"]')).toHaveAttribute('aria-current', 'page');

  await page.locator('#main-nav [data-page="context"]').click();
  await expect(page).toHaveURL(/#context$/);
  await expect(page.locator('#context')).toBeVisible();
  await expect(page.locator('#context h2')).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/#plot$/);
  await expect(page.locator('#plot')).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/#context$/);
  await expect(page.locator('#context')).toBeVisible();
});

test('citations survive initialization and return to the exact source', async ({ page }) => {
  await page.goto('/#pov');
  await expect(page.locator('.cite-ref')).toHaveCount(14);

  await page.locator('#ref-3-2').click();
  await expect(page).toHaveURL(/#cite-3$/);
  await expect(page.locator('#cite-3')).toBeVisible();

  await page.locator('#cite-3 .cite-badge').click();
  await expect(page).toHaveURL(/#ref-3-2$/);
  await expect(page.locator('#pov')).toBeVisible();
  await expect(page.locator('#ref-3-2')).toBeFocused();
});

test('character content is visible at common desktop and mobile sizes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#characters');
  await expect(page.locator('#characters > .content-card')).toBeVisible();
  await expect(page.locator('#characters > .content-card')).toHaveCSS('opacity', '1');

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('#characters > .content-card')).toBeVisible();
  await expect(page.locator('#characters > .content-card')).toHaveCSS('opacity', '1');
});

test('preferences are consistent and storage failures do not block content', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('reduceMotion', 'true'));
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/reduce-motion/);
  await expect(page.locator('#reduceMotionToggle')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#reduceMotionToggle').click();
  await expect(page.locator('body')).not.toHaveClass(/reduce-motion/);
  await expect(page.locator('#reduceMotionToggle')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('reduceMotion'))).toBe('false');
});

test('unavailable storage fails open', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); };
  });
  await page.goto('/');
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('.loader')).toHaveCount(0);
});

test('no-JavaScript mode exposes the complete document', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route('**/*', route => {
    if (route.request().resourceType() === 'image') return route.abort();
    return route.continue();
  });
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#characters')).toBeVisible();
  await expect(page.locator('.loader')).toHaveCount(0);
  await context.close();
});

test('mobile navigation does not overlap the home content', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const layout = await page.evaluate(() => {
    const nav = document.querySelector('nav').getBoundingClientRect();
    const hero = document.querySelector('.hero').getBoundingClientRect();
    return { navBottom: nav.bottom, heroTop: hero.top };
  });
  expect(layout.navBottom).toBeLessThanOrEqual(layout.heroTop);
});

test('the initial page does not request hidden-section images', async ({ page }) => {
  const imageRequests = [];
  page.on('request', request => {
    if (request.resourceType() === 'image') imageRequests.push(request.url());
  });
  await page.goto('/');
  await page.waitForTimeout(500);
  expect(imageRequests).toEqual([]);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundImage)).not.toBe('none');
});

test('default and high-contrast modes have no automatically detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  const defaultResults = await new AxeBuilder({ page }).analyze();
  expect(defaultResults.violations).toEqual([]);

  await page.locator('#contrastToggle').click();
  const highContrastResults = await new AxeBuilder({ page }).analyze();
  expect(highContrastResults.violations).toEqual([]);
});
