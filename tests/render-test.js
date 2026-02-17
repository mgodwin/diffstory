#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TESTS_DIR = __dirname;

// ── Fixture-specific assertions ──────────────────────────────────────────────

const FIXTURE_ASSERTIONS = {
  'minimal-expert': async (page, assert) => {
    // 1 narrative tab (Overview + 1 narrative = 2 tabs total)
    await assert('1 narrative tab', async () => {
      const tabs = await page.locator('.tab').all();
      if (tabs.length !== 2) throw new Error(`Expected 2 tabs, got ${tabs.length}`);
    });

    await assert('audience label says expert', async () => {
      const label = page.locator('.tab-bar-brand-audience');
      const text = await label.textContent();
      if (!text.toLowerCase().includes('expert')) throw new Error(`Audience label text: "${text}"`);
    });

    await assert('3 info sections (risks + narrative TOC + approach)', async () => {
      const count = await page.locator('.info-section').count();
      if (count !== 3) throw new Error(`Expected 3 info sections, got ${count}`);
    });

    await assert('empty coverage section says no tests', async () => {
      const section = await page.locator('.coverage-section').count();
      if (section < 1) throw new Error('No coverage section');
      const text = await page.locator('.coverage-section').textContent();
      if (!text.includes('No tests')) throw new Error(`Expected "No tests" message, got "${text}"`);
    });

    // Click narrative tab
    await assert('narrative tab renders 1 step and 1 hunk', async () => {
      await page.locator('.tab', { hasText: 'Clamp utility' }).click();
      await page.waitForSelector('.step-item');
      const steps = await page.locator('.step-item').count();
      const hunks = await page.locator('.hunk').count();
      if (steps !== 1) throw new Error(`Expected 1 step, got ${steps}`);
      if (hunks !== 1) throw new Error(`Expected 1 hunk, got ${hunks}`);
    });

    await assert('edge_case annotation visible', async () => {
      const ann = page.locator('.annotation.edge_case');
      const count = await ann.count();
      if (count < 1) throw new Error('No edge_case annotation found');
    });
  },

  'full-newcomer': async (page, assert) => {
    // 2 narrative tabs
    await assert('2 narrative tabs', async () => {
      const tabs = await page.locator('.tab').all();
      // Overview + 2 narratives = 3
      if (tabs.length !== 3) throw new Error(`Expected 3 tabs, got ${tabs.length}`);
    });

    await assert('audience label says newcomer', async () => {
      const label = page.locator('.tab-bar-brand-audience');
      const text = await label.textContent();
      if (!text.toLowerCase().includes('newcomer')) throw new Error(`Audience label text: "${text}"`);
    });

    await assert('high criticality badge inside risks section', async () => {
      const badge = page.locator('.info-section .badge.high');
      const count = await badge.count();
      if (count < 1) throw new Error('No .badge.high inside info-section');
    });

    await assert('4 info sections on overview (narrative TOC, glossary, risks, approach)', async () => {
      const count = await page.locator('.info-section').count();
      if (count !== 4) throw new Error(`Expected 4 info sections, got ${count}`);
    });

    await assert('approach section with Approach Critique header', async () => {
      const section = page.locator('.approach-section');
      const count = await section.count();
      if (count < 1) throw new Error('No .approach-section found');
      const header = await section.locator('.info-section-header').textContent();
      if (!header.includes('Approach Critique')) throw new Error(`Expected "Approach Critique" header, got "${header}"`);
    });

    await assert('perspective cards rendered in approach section', async () => {
      const count = await page.locator('.perspective-card').count();
      if (count < 1) throw new Error('No .perspective-card found');
    });

    await assert('perspective severity labels present', async () => {
      const high = await page.locator('.perspective-severity.high').count();
      if (high < 1) throw new Error('Expected at least one high-severity perspective');
    });

    await assert('criticality explanation paragraph present', async () => {
      const explanation = page.locator('.criticality-explanation');
      const count = await explanation.count();
      if (count < 1) throw new Error('No .criticality-explanation found');
    });

    await assert('side effects section with 3 items', async () => {
      const section = await page.locator('.side-effects-section').count();
      if (section < 1) throw new Error('No side-effects-section');
      const items = await page.locator('.side-effect-item').count();
      if (items !== 3) throw new Error(`Expected 3 side effect items, got ${items}`);
    });

    await assert('narrative TOC with 2 items', async () => {
      const count = await page.locator('.narrative-toc-item').count();
      if (count !== 2) throw new Error(`Expected 2 narrative TOC items, got ${count}`);
    });

    await assert('coverage section with 3 items', async () => {
      const section = await page.locator('.coverage-section').count();
      if (section < 1) throw new Error('No coverage section');
      const items = await page.locator('.coverage-item').count();
      if (items !== 3) throw new Error(`Expected 3 coverage items, got ${items}`);
    });

    await assert('4 glossary items', async () => {
      const count = await page.locator('.glossary-item').count();
      if (count !== 4) throw new Error(`Expected 4 glossary items, got ${count}`);
    });

    await assert('narrative bigPicture present', async () => {
      await page.locator('.tab', { hasText: 'Auth controller' }).click();
      await page.waitForSelector('.narrative-layout', { timeout: 10000 });
      const count = await page.locator('.info-section').count();
      if (count < 1) throw new Error('No narrative bigPicture info-section found');
      const text = await page.locator('.info-section .info-section-header').first().textContent();
      if (!text.includes('Big Picture')) throw new Error(`Expected "The Big Picture" header, got "${text}"`);
    });

    await assert('file context icon present', async () => {
      // Click first narrative tab to see hunks with fileContext
      await page.locator('.tab', { hasText: 'Auth controller' }).click();
      await page.waitForSelector('.hunk');
      const count = await page.locator('.file-context-icon').count();
      if (count < 1) throw new Error('No file-context-icon found');
    });

    await assert('multiple annotation types in narrative', async () => {
      const types = ['risk', 'provocation', 'alternative', 'question', 'edge_case'];
      const found = [];
      for (const t of types) {
        const count = await page.locator(`.annotation.${t}`).count();
        if (count > 0) found.push(t);
      }
      if (found.length < 3) throw new Error(`Only found annotation types: ${found.join(', ')}`);
    });
  },

  'multi-narrative': async (page, assert) => {
    // 3 narrative tabs
    await assert('3 narrative tabs', async () => {
      const tabs = await page.locator('.tab').all();
      // Overview + 3 narratives = 4
      if (tabs.length !== 4) throw new Error(`Expected 4 tabs, got ${tabs.length}`);
    });

    await assert('medium criticality badge inside risks section', async () => {
      const badge = page.locator('.info-section .badge.medium');
      const count = await badge.count();
      if (count < 1) throw new Error('No .badge.medium inside info-section');
    });

    // Click each narrative tab, verify step counts
    const expectedSteps = [2, 2, 3];
    const narrativeTabs = await page.locator('.tab').all();
    // Tabs: Overview, narrative-0, narrative-1, narrative-2
    for (let i = 0; i < 3; i++) {
      const tabIndex = i + 1; // skip Overview
      await assert(`narrative ${i + 1} has ${expectedSteps[i]} steps`, async () => {
        await narrativeTabs[tabIndex].click();
        // Wait for the narrative layout to render (async due to shiki)
        await page.waitForSelector('.narrative-layout', { timeout: 10000 });
        // Wait for step items to stabilize (the async renderNarrative may still be updating)
        await page.waitForFunction(
          (expected) => document.querySelectorAll('.step-item').length === expected,
          expectedSteps[i],
          { timeout: 5000 }
        );
        const count = await page.locator('.step-item').count();
        if (count !== expectedSteps[i]) {
          throw new Error(`Expected ${expectedSteps[i]} steps, got ${count}`);
        }
      });
    }

    await assert('multiple annotation types visible', async () => {
      // Should already be on last narrative tab
      const types = ['risk', 'provocation', 'alternative', 'question', 'edge_case'];
      const found = [];
      for (const t of types) {
        const count = await page.locator(`.annotation.${t}`).count();
        if (count > 0) found.push(t);
      }
      if (found.length < 2) throw new Error(`Only found annotation types: ${found.join(', ')}`);
    });

    // Navigate back to overview to check perspective cards
    await assert('perspective cards rendered on overview', async () => {
      await page.locator('.tab', { hasText: 'Overview' }).click();
      await page.waitForSelector('.overview-title', { timeout: 10000 });
      const count = await page.locator('.perspective-card').count();
      if (count < 1) throw new Error('No .perspective-card found');
    });

  },
};

// ── Common assertions ────────────────────────────────────────────────────────

async function commonAssertions(page, assert) {
  await assert('version attribute on <html>', async () => {
    const version = await page.getAttribute('html', 'data-diffstory-version');
    if (version !== '1.0.0') throw new Error(`Expected "1.0.0", got "${version}"`);
  });

  await assert('tab bar has Overview tab', async () => {
    const overview = page.locator('.tab', { hasText: 'Overview' });
    const count = await overview.count();
    if (count < 1) throw new Error('No Overview tab');
  });

  await assert('tab bar brand element present', async () => {
    const brand = page.locator('.tab-bar-brand');
    const count = await brand.count();
    if (count < 1) throw new Error('No .tab-bar-brand found');
  });

  await assert('.overview-title has text', async () => {
    const title = page.locator('.overview-title');
    const text = await title.textContent();
    if (!text || text.trim().length === 0) throw new Error('Overview title is empty');
  });

}

// ── Test runner ──────────────────────────────────────────────────────────────

async function runFixture(browser, name, htmlPath) {
  const consoleErrors = [];
  let passed = 0;
  let failed = 0;
  const failures = [];

  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console errors (ignore warnings — shiki CDN may warn on file:// URLs)
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore network errors from shiki CDN (expected on file:// URLs)
      if (text.includes('esm.sh') || text.includes('shiki') || text.includes('Failed to load')) return;
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  // Load the page
  const url = `file://${htmlPath}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for initial render (overview tab)
  await page.waitForSelector('.overview-title', { timeout: 10000 });

  // Assert helper
  const assert = async (label, fn) => {
    try {
      await fn();
      passed++;
      process.stdout.write(`    \x1b[32m✓\x1b[0m ${label}\n`);
    } catch (err) {
      failed++;
      failures.push({ label, error: err.message });
      process.stdout.write(`    \x1b[31m✗\x1b[0m ${label} — ${err.message}\n`);
    }
  };

  // Run common assertions
  await commonAssertions(page, assert);

  // Run fixture-specific assertions
  const fixtureTest = FIXTURE_ASSERTIONS[name];
  if (fixtureTest) {
    await fixtureTest(page, assert);
  }

  // Check for console errors
  await assert('no JS console errors', async () => {
    if (consoleErrors.length > 0) {
      throw new Error(`${consoleErrors.length} error(s):\n      ${consoleErrors.join('\n      ')}`);
    }
  });

  await context.close();

  return { passed, failed, failures };
}

async function main() {
  // Parse args: fixture names (optional)
  const args = process.argv.slice(2);
  let fixtureNames = args.filter(a => !a.startsWith('-'));

  // Default to all built HTML files
  if (fixtureNames.length === 0) {
    const files = fs.readdirSync(TESTS_DIR).filter(f => f.endsWith('.html'));
    fixtureNames = files.map(f => path.basename(f, '.html'));
  }

  if (fixtureNames.length === 0) {
    console.error('No fixture HTML files found. Run build-test.sh first.');
    process.exit(1);
  }

  // Verify all HTML files exist
  for (const name of fixtureNames) {
    const htmlPath = path.join(TESTS_DIR, `${name}.html`);
    if (!fs.existsSync(htmlPath)) {
      console.error(`Missing: ${htmlPath} — run build-test.sh first`);
      process.exit(1);
    }
  }

  console.log(`\nRender tests: ${fixtureNames.length} fixture(s)\n`);

  const browser = await chromium.launch({ headless: true });
  let totalPassed = 0;
  let totalFailed = 0;

  for (const name of fixtureNames) {
    const htmlPath = path.join(TESTS_DIR, `${name}.html`);
    console.log(`  ${name}`);

    const result = await runFixture(browser, name, htmlPath);
    totalPassed += result.passed;
    totalFailed += result.failed;
    console.log('');
  }

  await browser.close();

  // Summary
  console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
