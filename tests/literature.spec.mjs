import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analysisPages, handouts, pamphletFields, qualities, spine } from './literature.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const offline = target => pathToFileURL(resolve(root, target)).href;

for (const analysisPage of analysisPages) {
  test(`${analysisPage} deep links, section navigation and pamphlet map work at 375px and 1280px`, async ({ page }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(`/${analysisPage}`);
      await expect(page.locator('#main-nav a')).toHaveCount(spine.length);
      expect(await page.locator('#main-nav a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(spine.map(id => `#${id}`));

      // Every section is reachable by its fragment, alone on screen, with a heading.
      for (const id of spine) {
        await page.goto(`/${analysisPage}#${id}`);
        await expect(page.locator(`#${id}`)).toBeVisible();
        await expect(page.locator('.page:visible')).toHaveCount(1);
        await expect(page.locator(`#${id} h2`).first()).toBeVisible();
        await expect(page.locator(`#${id} h2`).first()).not.toBeEmpty();
      }

      // Clicking through the navigation keeps the fragment, the section and the current link in sync.
      for (const id of spine) {
        await page.locator(`#main-nav a[href="#${id}"]`).click();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        await expect(page.locator(`#${id}`)).toBeVisible();
        await expect(page.locator('#main-nav [aria-current="location"]')).toHaveAttribute('href', `#${id}`);
      }
      await expect(page.locator('#main-nav a')).toHaveCount(spine.length);

      // The Home map sends every pamphlet field to the section that answers it.
      for (const { field, section, label } of pamphletFields) {
        await page.locator('#main-nav a[href="#home"]').click();
        expect(await page.locator('#home').innerText(), `${field} is named on Home`).toMatch(label);
        if (section === 'home') continue;
        const link = page.locator(`#home a[href="#${section}"]`).first();
        await expect(link, `${field} links to #${section}`).toBeVisible();
        await link.click();
        await expect(page).toHaveURL(new RegExp(`#${section}$`));
        await expect(page.locator(`#${section}`)).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });

test(`${analysisPage} renders vocabulary, theme, questions and the handout citations`, async ({ page }) => {
    const failures = [];
    const requests = [];
    page.on('requestfailed', request => failures.push(request.url()));
    page.on('request', request => requests.push(request.url()));
    await page.goto(`/${analysisPage}`);

    await page.locator('#main-nav a[href="#vocab"]').click();
    await expect(page.locator('#vocab')).toBeVisible();
    expect(await page.locator('#vocab').locator('dt, li, tr').count(), 'vocabulary entries').toBeGreaterThanOrEqual(6);
    expect(await page.locator('#vocab').innerText(), 'vocabulary gives definitions').toMatch(/definition/i);

    await page.locator('#main-nav a[href="#theme"]').click();
    await expect(page.locator('#theme')).toBeVisible();
    expect(await page.locator('#theme').locator('li').count(), 'Big Idea entries').toBeGreaterThanOrEqual(3);
    expect(await page.locator('#theme').innerText(), 'Big Ideas and a finished theme statement').toMatch(/big idea/i);
    expect(await page.locator('#theme').innerText(), 'Big Ideas and a finished theme statement').toMatch(/theme statement/i);

    await page.locator('#main-nav a[href="#questions"]').click();
    await expect(page.locator('#questions')).toBeVisible();
      expect(await page.locator('#questions').locator('h3, li').count(), 'discussion questions').toBeGreaterThanOrEqual(4);
      const prompts = (await page.locator('#questions h3, #questions li').allInnerTexts()).map(prompt => prompt.trim());
    expect(prompts.filter(prompt => prompt.endsWith('?')).length, 'prompts are asked as questions').toBeGreaterThanOrEqual(4);

    // Every supplied handout is cited by its exact filename, not by paraphrase.
    await page.locator('#main-nav a[href="#citations"]').click();
    const cited = await page.locator('#citations').innerText();
    for (const handout of handouts) expect(cited, `${analysisPage} cites ${handout}`).toContain(handout);

    // A handout entry is reachable from an in-text citation and returns to where it was read.
    const reference = await page.evaluate(handouts => {
      const entries = new Map([...document.querySelectorAll('.citation')].map(entry => [entry.id, entry.textContent]));
      const link = [...document.querySelectorAll('.cite-ref')].find(candidate => {
        const text = entries.get(candidate.getAttribute('href').slice(1));
        return text && handouts.some(handout => text.includes(handout));
      });
      return link ? { id: link.id, href: link.getAttribute('href'), section: link.closest('.page').id } : null;
    }, handouts);
    expect(reference, `${analysisPage} links an in-text citation to a handout`).not.toBeNull();
    await page.locator(`#main-nav a[href="#${reference.section}"]`).click();
    await page.locator(`#${reference.id}`).click();
    await expect(page).toHaveURL(new RegExp(`${reference.href}$`));
    await expect(page.locator(reference.href)).toBeVisible();
    await page.locator(`${reference.href} .cite-badge`).click();
    await expect(page).toHaveURL(new RegExp(`#${reference.id}$`));

    expect(failures).toEqual([]);
    expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
  });

  test(`${analysisPage} gives each character four qualities and an evidenced key scene`, async ({ page }) => {
    await page.goto(`/${analysisPage}#characters`);
    const entries = page.locator('#characters .character-full');
    expect(await entries.count(), 'character entries').toBeGreaterThanOrEqual(4);
    for (const entry of await entries.all()) {
      await expect(entry.locator('h3').first()).not.toBeEmpty();
      const labels = await entry.locator('h4').allInnerTexts();
      for (const quality of qualities) {
        expect(labels.some(label => new RegExp(`\\b${quality}\\b`, 'i').test(label)), `${await entry.locator('h3').first().innerText()}: ${quality} quality`).toBe(true);
      }
      const scene = entry.locator('.key-scene');
      await expect(scene, 'a specific key-scene description and locator').toBeVisible();
      expect(await scene.innerText()).toMatch(/key scene/i);
      expect(await scene.innerText()).toMatch(/\b(?:chapter|scene|search|locator|p\.)\b/i);
    }
  });

  test(`${analysisPage} preserves reading controls and prints every section`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/${analysisPage}#characters`);
    for (const [name, className] of [
      ['Toggle high contrast mode', 'high-contrast'],
      ['Toggle readable font', 'dyslexia-friendly'],
      ['Toggle reduced motion', 'reduce-motion']
    ]) {
      const button = page.getByRole('button', { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('body')).toHaveClass(new RegExp(className));
    }
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('body')).toHaveCSS('font-family', 'Arial, sans-serif');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.page:visible')).toHaveCount(spine.length);
    await expect(page.locator('#main-nav')).toBeHidden();
  });
}

test('both analysis pages stay complete and navigable with JavaScript disabled', async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const analysisPage of analysisPages) {
    for (const url of [`http://127.0.0.1:4173/${analysisPage}`, offline(analysisPage)]) {
      await page.goto(url);
      await expect(page.locator('.page')).toHaveCount(spine.length);
      expect(await page.locator('#main-nav a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(spine.map(id => `#${id}`));
      for (const id of spine) {
        // The enhancement script hides nothing here, so every section reads in one document.
        const section = page.locator(`#${id}`);
        await expect(section, `${url} ${id}`).toBeVisible();
        await expect(section.locator('h2').first()).toBeVisible();
        expect((await section.innerText()).split(/\s+/).filter(Boolean).length, `${url} ${id} content`).toBeGreaterThanOrEqual(40);
        await page.locator(`#main-nav a[href="#${id}"]`).click();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        await expect(page.locator(`#${id}`)).toBeVisible();
      }
      const cited = await page.locator('#citations').innerText();
      for (const handout of handouts) expect(cited, `${url} cites ${handout}`).toContain(handout);
    }
  }
  await context.close();
});

test('both complete literary companions have no automated accessibility violations', async ({ page }) => {
  for (const analysisPage of analysisPages) {
    await page.goto(`http://127.0.0.1:4173/${analysisPage}`);
    // Reveal the complete document while leaving JavaScript available to the axe scanner.
    await page.locator('html').evaluate(element => element.classList.remove('js'));
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, analysisPage).toEqual([]);
  }
});
