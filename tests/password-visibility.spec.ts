import { expect, test } from '@playwright/test';

for (const width of [320, 1440]) {
  test(`both new password fields can be revealed independently at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/recover/complete');
    const fields = page.locator('input[autocomplete="new-password"]');
    const toggles = page.locator('.auth-password-toggle');
    await expect(fields).toHaveCount(2);
    await expect(toggles).toHaveCount(2);
    await fields.first().fill('SamplePassword123!');
    await fields.last().fill('SamplePassword123?');

    await toggles.last().click();
    await expect(fields.last()).toHaveAttribute('type', 'text');
    await expect(fields.last()).toHaveValue('SamplePassword123?');
    await expect(toggles.last()).toHaveAccessibleName('Hide password');
    await expect(fields.first()).toHaveAttribute('type', 'password');

    await toggles.last().click();
    await expect(fields.last()).toHaveAttribute('type', 'password');

    for (const index of [0, 1]) {
      const field = (await fields.nth(index).boundingBox())!;
      const toggle = (await toggles.nth(index).boundingBox())!;
      expect(toggle.width).toBeGreaterThanOrEqual(44);
      expect(toggle.x + toggle.width).toBeLessThanOrEqual(field.x + field.width);
      expect(toggle.y).toBeGreaterThanOrEqual(field.y);
      expect(toggle.y + toggle.height).toBeLessThanOrEqual(field.y + field.height);
    }
    await page.screenshot({ path: test.info().outputPath(`recover-complete-${width}.png`) });
  });
}
