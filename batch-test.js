#!/usr/bin/env node
/**
 * Batch test script for TA Search.
 * Reads search terms from a file, performs searches, and takes screenshots.
 *
 * Usage: node batch-test.js <terms-file>
 * Example: node batch-test.js terms.txt
 *
 * Requires: npm install playwright
 * First run: npx playwright install chromium
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = 'screenshots';

async function main() {
    const termsFile = process.argv[2];

    if (!termsFile) {
        console.error('Usage: node batch-test.js <terms-file>');
        console.error('Example: node batch-test.js terms.txt');
        process.exit(1);
    }

    // Read search terms from file
    if (!fs.existsSync(termsFile)) {
        console.error(`File not found: ${termsFile}`);
        process.exit(1);
    }

    const terms = fs.readFileSync(termsFile, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (terms.length === 0) {
        console.error('No search terms found in file');
        process.exit(1);
    }

    console.log(`Found ${terms.length} search terms\n`);

    // Create screenshots directory
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR);
    }

    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });

    try {
        // Navigate to app
        await page.goto(APP_URL);
        await page.waitForLoadState('domcontentloaded');

        for (let i = 0; i < terms.length; i++) {
            const term = terms[i];
            console.log(`[${i + 1}/${terms.length}] Searching: "${term}"`);

            try {
                await performSearch(page, term);
            } catch (err) {
                console.error(`  Error: ${err.message}`);
            }
        }

    } finally {
        await browser.close();
    }

    console.log(`\nDone! Screenshots saved to ${SCREENSHOT_DIR}/`);
}

async function performSearch(page, term) {
    // Clear previous search
    const searchInput = page.locator('#search-term');
    await searchInput.fill('');

    // Enter search term
    await searchInput.fill(term);

    // Click search button
    await page.click('#search-btn');

    // Wait for results or error to appear
    await page.waitForFunction(() => {
        const results = document.querySelectorAll('#results .result-card');
        const error = document.querySelector('#error.visible');
        const progress = document.getElementById('progress');
        const isLoading = progress.classList.contains('visible');
        // Done when: has results/error AND not loading
        return (results.length > 0 || error) && !isLoading;
    }, { timeout: 60000 });

    // Check for error
    const errorVisible = await page.locator('#error.visible').isVisible();
    if (errorVisible) {
        const errorText = await page.locator('#error-text').textContent();
        console.log(`  No results or error: ${errorText.substring(0, 50)}...`);
    }

    // Wait for images to load
    await waitForImagesToLoad(page);

    // Small delay for visual stability
    await page.waitForTimeout(500);

    // Take screenshot
    const filename = sanitizeFilename(term) + '.png';
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`  Saved: ${filename}`);
}

async function waitForImagesToLoad(page) {
    // Wait for all images in results to load
    await page.evaluate(async () => {
        const images = document.querySelectorAll('#results img');
        if (images.length === 0) return;

        const promises = Array.from(images).map(img => {
            if (img.complete && img.naturalHeight > 0) {
                return Promise.resolve();
            }
            return new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
                // Timeout fallback
                setTimeout(resolve, 10000);
            });
        });

        await Promise.all(promises);
    });
}

function sanitizeFilename(term) {
    return term
        .toLowerCase()
        .replace(/\*/g, '-star')
        .replace(/~/g, '-tilde')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
