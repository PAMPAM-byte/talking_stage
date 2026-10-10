import { test, expect } from '@playwright/test';

test('liveness is minimal and failed sign-in preserves recovery controls', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(health.headers()['cache-control']).toBe('no-store');
  expect(await health.json()).toEqual({ status: 'ok' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sign-in');
  const email = page.getByRole('textbox', { name: 'Email address', exact: true });
  await email.fill('monitoring-not-an-account@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Incorrect-test-password!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('We couldn’t sign you in. Check your email and password, or reset your password.', { exact: true })).toBeVisible();
  await expect(email).toHaveValue('monitoring-not-an-account@example.test');
  await expect(page.getByRole('link', { name: 'Forgot your password?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
});
