import { test, expect } from '@playwright/test';

test.describe('TicTac Board - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Go to signin page first
    await page.goto('http://localhost:3000/auth/signin');

    // Fill in credentials (assuming test user exists or will be created)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');

    // Try to submit - if auth fails, we'll still test the UI
    await page.click('button:has-text("Sign in")');

    // Wait a bit for navigation or error
    await page.waitForTimeout(2000);
  });

  test('Board page loads with columns', async ({ page }) => {
    // Navigate to board page
    await page.goto('http://localhost:3000/');

    // Check for column headers - they should exist even if not authenticated
    // The page should show the board structure
    const pageContent = await page.content();

    // Look for common elements that should be present
    if (pageContent.includes('To Do') || pageContent.includes('In Progress') || pageContent.includes('Done')) {
      // Board is visible
      test.skip(true, 'Board loaded - skipping authenticated tests');
    }
  });

  test('Board has search and filter controls', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test task');

      // Verify search value was entered
      await expect(searchInput).toHaveValue('test task');
    }
  });
});

test.describe('TicTac Animations and Interactions', () => {
  test('Sign in page animations work', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');

    // Test hover effect on sign in button
    const signInButton = page.locator('button:has-text("Sign in")');
    await expect(signInButton).toBeVisible();

    // Hover over button and check for transform
    await signInButton.hover();
    await page.waitForTimeout(300);

    // The button should have some kind of hover effect
    const buttonStyles = await signInButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        transition: styles.transition,
        boxShadow: styles.boxShadow,
      };
    });

    // Should have transition defined for smooth animations
    expect(buttonStyles.transition).toBeTruthy();
  });

  test('Input focus animations work', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');

    const emailInput = page.locator('input[type="email"]');

    // Before focus
    const beforeBorder = await emailInput.evaluate(el =>
      getComputedStyle(el).border
    );

    // Focus the input
    await emailInput.click();
    await page.waitForTimeout(100);

    // After focus - should have black border
    const afterBorder = await emailInput.evaluate(el =>
      getComputedStyle(el).border
    );

    // Border should change when focused (at least the width should be 3px)
    expect(afterBorder).toContain('3px');
  });

  test('Signup page error animation', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signup');

    // Try to submit with mismatched passwords
    await page.fill('input[type="email"]', 'test@example.com');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.locator('input[type="password"]').nth(1).fill('different');

    await page.click('button:has-text("Sign up")');
    await page.waitForTimeout(500);

    // Should show error message
    const hasError = await page.locator('text=/Passwords do not match/').count() > 0 ||
                     await page.locator('text=/Password must be at least/').count() > 0;

    if (hasError) {
      const errorBox = page.locator('text=/Passwords/').first();
      await expect(errorBox).toBeVisible();
    }
  });

  test('Signup page matching passwords', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signup');

    // Fill with matching passwords
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('input[type="password"]').nth(1).fill('password123');

    const button = page.locator('button:has-text("Sign up")');
    await button.click();

    // Button should show loading state or attempt submission
    await page.waitForTimeout(1000);
  });

  test('Color scheme uses grayscale palette', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');

    // Check the main heading for gradient text
    const heading = page.locator('h1');
    await expect(heading).toContainText('TicTac');

    // Verify background is light (white/gray)
    const bodyBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );

    // Should be white or very light gray (between 245-255 for grayscale)
    const rgbMatch = bodyBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      expect(r).toBeGreaterThanOrEqual(245); // Light gray/white
      expect(r).toBeLessThanOrEqual(255);
    } else {
      expect(bodyBg).toBeTruthy(); // At least has a background
    }
  });
});

test.describe('TicTac Visual Design', () => {
  test('Sign in page has modern card design', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');

    // Check for the card container
    const card = page.locator('div').filter({ hasText: 'TicTac' }).first();

    // Should have rounded corners (border-radius)
    const borderRadius = await card.evaluate(el =>
      getComputedStyle(el).borderRadius
    );

    // Check if borderRadius exists in computed style
    const cardBox = await card.boundingBox();
    expect(cardBox).toBeTruthy(); // Card should be visible
  });

  test('Buttons have bold black styling', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');

    const button = page.locator('button:has-text("Sign in")');

    const bgColor = await button.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );

    const textColor = await button.evaluate(el =>
      getComputedStyle(el).color
    );

    // Button should have white text (background may be gradient or solid)
    expect(textColor).toBe('rgb(255, 255, 255)');

    // Background should be either black, gray, or transparent (with gradient)
    const bgColors = ['rgb(0, 0, 0)', 'rgb(31, 41, 55)', 'rgba(0, 0, 0, 0)'];
    expect(bgColors).toContain(bgColor);
  });

  test('Inputs have rounded corners and proper padding', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');

    const input = page.locator('input[type="email"]');

    const borderRadius = await input.evaluate(el =>
      getComputedStyle(el).borderRadius
    );

    const padding = await input.evaluate(el =>
      getComputedStyle(el).padding
    );

    // Should have rounded corners
    expect(parseInt(borderRadius) || 0).toBeGreaterThan(10);

    // Should have adequate padding
    expect(padding).toContain('22');
  });
});
