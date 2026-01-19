import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('sign up page displays clean theme', async ({ page }) => {
    await page.goto('/auth/signup');

    // Check clean styling
    await expect(page.locator('h1')).toContainText('TicTac');
    await expect(page.getByText('Create your account')).toBeVisible();

    // Check form elements exist
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('•••••••••')).toHaveCount(2); // password and confirm
  });

  test('sign in page displays clean theme', async ({ page }) => {
    await page.goto('/auth/signin');

    await expect(page.locator('h1')).toContainText('TicTac');
    await expect(page.getByText('Sign in to manage your tasks')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  });

  test('password mismatch shows inline error on signup', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input#password', 'password123');
    await page.fill('input#confirmPassword', 'different');

    await page.click('button[type="submit"]');

    // Should show inline error, no toast
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('short password shows inline error on signup', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input#password', 'short');
    await page.fill('input#confirmPassword', 'short');

    await page.click('button[type="submit"]');

    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('navigation between signup and signin', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.click('a[href="/auth/signin"]');
    await expect(page).toHaveURL(/.*signin/);
    await expect(page.getByText('Don\'t have an account?')).toBeVisible();

    await page.click('a[href="/auth/signup"]');
    await expect(page).toHaveURL(/.*signup/);
  });
});

test.describe('Board - Inline Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in first - assuming a test user exists
    await page.goto('/auth/signin');

    // Fill credentials (adjust if test setup differs)
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password123');

    // Try to sign in - if user doesn't exist, we'll handle it
    await page.click('button[type="submit"]');

    // Wait a bit for navigation
    await page.waitForTimeout(1000);

    // If still on signin page, create the user first
    if (page.url().includes('/signin')) {
      await page.goto('/auth/signup');
      await page.fill('input[type="email"]', 'test@test.com');
      await page.fill('input#password', 'password123');
      await page.fill('input#confirmPassword', 'password123');
      await page.click('button[type="submit"]');

      await page.waitForURL(/.*signin/, { timeout: 5000 });
      await page.goto('/auth/signin');
      await page.fill('input[type="email"]', 'test@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
    }

    // Wait for board to load
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('board displays with clean theme', async ({ page }) => {
    // Check for clean theme elements
    await expect(page.getByText('TicTac')).toBeVisible();
    await expect(page.getByText('To Do')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
  });

  test('inline task creation works', async ({ page }) => {
    // Click "+ New task" in To Do column
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    // Fill in task details inline
    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await expect(titleInput).toBeFocused();
    await titleInput.fill('Test Task Created via Playwright');

    const descInput = todoColumn.locator('input[placeholder*="description"]');
    await descInput.fill('This is a test description');

    // Click Add button
    await todoColumn.getByText('Add').click();

    // Task should appear in column
    await expect(todoColumn.getByText('Test Task Created via Playwright')).toBeVisible();
  });

  test('inline task creation with Enter key', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Quick Task');

    // Press Enter to submit
    await titleInput.press('Enter');

    await expect(todoColumn.getByText('Quick Task')).toBeVisible();
  });

  test('inline task creation cancels with Escape', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    const initialTaskCount = await todoColumn.locator('text=Test Task').count();

    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Cancelled Task');

    // Press Escape to cancel
    await titleInput.press('Escape');

    // Should return to showing "+ New task" button
    await expect(todoColumn.getByText('+ New task')).toBeVisible();

    // Task count should not have increased
    const finalTaskCount = await todoColumn.locator('text=Test Task').count();
    expect(finalTaskCount).toBe(initialTaskCount);
  });

  test('inline task creation requires title', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    // Don't fill title, try to click Add
    const addButton = todoColumn.getByText('Add');
    await expect(addButton).toBeDisabled();

    // After typing, button should be enabled
    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Now has title');
    await expect(addButton).toBeEnabled();
  });

  test('task card click opens inline edit', async ({ page }) => {
    // First create a task
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Editable Task');
    await todoColumn.getByText('Add').click();

    // Click on the task card to edit
    await todoColumn.getByText('Editable Task').click();

    // Should see inline edit mode
    await expect(todoColumn.locator('input[type="text"]').first()).toBeVisible();
    await expect(todoColumn.getByText('Save')).toBeVisible();
    await expect(todoColumn.getByText('Cancel')).toBeVisible();
  });

  test('inline edit with Enter saves', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Original Title');
    await todoColumn.getByText('Add').click();

    // Click to edit
    await todoColumn.getByText('Original Title').click();

    // Edit title and press Enter
    const editInput = todoColumn.locator('input[type="text"]').first();
    await editInput.clear();
    await editInput.fill('Updated Title');
    await editInput.press('Enter');

    // Should show updated title
    await expect(todoColumn.getByText('Updated Title')).toBeVisible();
    await expect(todoColumn.getByText('Original Title')).not.toBeVisible();
  });

  test('inline edit with Escape cancels', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Keep This Title');
    await todoColumn.getByText('Add').click();

    // Click to edit
    await todoColumn.getByText('Keep This Title').click();

    // Edit title but press Escape
    const editInput = todoColumn.locator('input[type="text"]').first();
    await editInput.clear();
    await editInput.fill('Discarded Change');
    await editInput.press('Escape');

    // Should keep original title
    await expect(todoColumn.getByText('Keep This Title')).toBeVisible();
    await expect(todoColumn.getByText('Discarded Change')).not.toBeVisible();
  });

  test('inline edit requires title to save', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Task With Title');
    await todoColumn.getByText('Add').click();

    // Click to edit
    await todoColumn.getByText('Task With Title').click();

    // Clear title
    const editInput = todoColumn.locator('input[type="text"]').first();
    await editInput.clear();

    // Save button should be disabled
    const saveButton = todoColumn.getByText('Save');
    await expect(saveButton).toBeDisabled();
  });

  test('search filters tasks', async ({ page }) => {
    // Create two distinct tasks
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');

    await todoColumn.getByText('+ New task').click();
    await todoColumn.locator('input[placeholder="Task title"]').fill('Apple Task');
    await todoColumn.getByText('Add').click();

    await todoColumn.getByText('+ New task').click();
    await todoColumn.locator('input[placeholder="Task title"]').fill('Banana Task');
    await todoColumn.getByText('Add').click();

    // Both should be visible
    await expect(todoColumn.getByText('Apple Task')).toBeVisible();
    await expect(todoColumn.getByText('Banana Task')).toBeVisible();

    // Search for Apple
    await page.fill('input[placeholder="Search..."]', 'Apple');

    // Only Apple should be visible
    await expect(todoColumn.getByText('Apple Task')).toBeVisible();
    await expect(todoColumn.getByText('Banana Task')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder="Search..."]', '');

    // Both visible again
    await expect(todoColumn.getByText('Apple Task')).toBeVisible();
    await expect(todoColumn.getByText('Banana Task')).toBeVisible();
  });

  test('task deletion flow', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('To Be Deleted');
    await todoColumn.getByText('Add').click();

    // Click to edit
    await todoColumn.getByText('To Be Deleted').click();

    // Click Delete
    await todoColumn.getByText('Delete').click();

    // Should show confirmation
    await expect(todoColumn.getByText('Delete this task?')).toBeVisible();
    await expect(todoColumn.getByText('Delete').nth(1)).toBeVisible(); // Confirm button

    // Confirm deletion
    await todoColumn.getByText('Delete').nth(1).click();

    // Task should be gone
    await expect(todoColumn.getByText('To Be Deleted')).not.toBeVisible();
  });

  test('task deletion can be cancelled', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Keep This Task');
    await todoColumn.getByText('Add').click();

    // Click to edit
    await todoColumn.getByText('Keep This Task').click();

    // Click Delete
    await todoColumn.getByText('Delete').click();

    // Cancel instead of confirm
    await todoColumn.getByText('Cancel').click();

    // Should exit delete confirmation but stay in edit mode
    await expect(todoColumn.getByText('Delete this task?')).not.toBeVisible();

    // Click cancel again to exit edit mode
    await todoColumn.getByText('Cancel').click();

    // Task should still exist
    await expect(todoColumn.getByText('Keep This Task')).toBeVisible();
  });

  test('drag and drop between columns', async ({ page }) => {
    // Create task in To Do
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();
    await todoColumn.locator('input[placeholder="Task title"]').fill('Drag Me');
    await todoColumn.getByText('Add').click();

    // Get initial positions
    const task = todoColumn.getByText('Drag Me').locator('..');
    const inProgressColumn = page.locator('text=In Progress').locator('..').locator('..');

    // Drag task to In Progress
    await task.dragTo(inProgressColumn);

    // Task should now be in In Progress
    await expect(inProgressColumn.getByText('Drag Me')).toBeVisible();
    await expect(todoColumn.getByText('Drag Me')).not.toBeVisible();
  });

  test('status change in edit mode', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Change My Status');
    await todoColumn.getByText('Add').click();

    // Click to edit
    await todoColumn.getByText('Change My Status').click();

    // Click "In Progress" status button
    await todoColumn.getByText('In Progress').click();

    // Save
    await todoColumn.getByText('Save').click();

    // Task should now be in In Progress column
    const inProgressColumn = page.locator('text=In Progress').locator('..').locator('..');
    await expect(inProgressColumn.getByText('Change My Status')).toBeVisible();
    await expect(todoColumn.getByText('Change My Status')).not.toBeVisible();
  });

  test('sign out works', async ({ page }) => {
    await page.getByText('Sign out').click();

    await expect(page).toHaveURL(/.*signin/);
  });

  test('no toast messages appear', async ({ page }) => {
    // Check that no toast containers exist in the DOM
    const toastContainer = page.locator('[data-sonner-toast], .toast, .Toaster, [role="status"]');
    await expect(toastContainer).not.toBeAttached();

    // Try to create a task
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();
    await todoColumn.locator('input[placeholder="Task title"]').fill('No Toast Test');
    await todoColumn.getByText('Add').click();

    // Still no toasts
    await expect(toastContainer).not.toBeAttached();
  });
});

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('empty state shows create button', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await expect(todoColumn.getByText('+ New task')).toBeVisible();
  });

  test('multiple inline edits do not conflict', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');

    // Create multiple tasks
    for (let i = 1; i <= 3; i++) {
      await todoColumn.getByText('+ New task').click();
      await todoColumn.locator('input[placeholder="Task title"]').fill(`Task ${i}`);
      await todoColumn.getByText('Add').click();
    }

    // Edit first task
    await todoColumn.getByText('Task 1').click();
    await todoColumn.locator('input[type="text"]').first().fill('Updated Task 1');

    // Cancel and verify others are intact
    await todoColumn.getByText('Cancel').click();
    await expect(todoColumn.getByText('Task 2')).toBeVisible();
    await expect(todoColumn.getByText('Task 3')).toBeVisible();
  });

  test('long text handles gracefully in inline edit', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    const longTitle = 'This is a very long task title that should still display correctly in the UI without breaking the layout';
    await titleInput.fill(longTitle);
    await todoColumn.getByText('Add').click();

    // Should be visible
    await expect(todoColumn.getByText(longTitle)).toBeVisible();
  });

  test('special characters in task title', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');
    await todoColumn.getByText('+ New task').click();

    const titleInput = todoColumn.locator('input[placeholder="Task title"]');
    await titleInput.fill('Task with <special> & "chars"');
    await todoColumn.getByText('Add').click();

    await expect(todoColumn.getByText('Task with <special> & "chars"')).toBeVisible();
  });

  test('rapid task creation', async ({ page }) => {
    const todoColumn = page.locator('text=To Do').locator('..').locator('..');

    for (let i = 1; i <= 5; i++) {
      await todoColumn.getByText('+ New task').click();
      const titleInput = todoColumn.locator('input[placeholder="Task title"]');
      await titleInput.fill(`Rapid Task ${i}`);
      await titleInput.press('Enter');
      await page.waitForTimeout(100);
    }

    // All 5 tasks should exist
    await expect(todoColumn.getByText('Rapid Task 5')).toBeVisible();
  });
});
