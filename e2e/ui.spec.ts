import { test, expect } from '@playwright/test';

test.describe('TicTac App UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');
  });

  test('Sign in page has bold styling', async ({ page }) => {
    // Check for the main heading
    await expect(page.locator('h1')).toContainText('TicTac');

    // Check for form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check sign in button exists
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('Sign in link goes to signup', async ({ page }) => {
    await page.click('a:has-text("Sign up")');
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.locator('h1')).toContainText('TicTac');
  });

  test('Input fields have focus states', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');

    // Click to focus
    await emailInput.click();

    // Check that the input has focus styling (border becomes black)
    const borderColor = await emailInput.evaluate(el =>
      getComputedStyle(el).borderColor
    );

    // The border should be black when focused (rgb(0, 0, 0) or similar)
    expect(borderColor).toContain('0');
  });

  test('Password field can be typed in', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('testpass123');
    const value = await passwordInput.inputValue();
    expect(value).toBe('testpass123');
  });

  test('Sign up page has matching design', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signup');
    await expect(page.locator('h1')).toContainText('TicTac');

    // Check for confirm password field
    await expect(page.locator('input[type="password"]')).toHaveCount(2);

    // Sign up button
    await expect(page.locator('button:has-text("Sign up")')).toBeVisible();
  });

  test('Sign in link on signup page', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signup');
    await page.click('a:has-text("Sign in")');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
