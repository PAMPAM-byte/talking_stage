import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.skip(process.env.TALKINGSTAGE_DEV_LOGIN_TEST !== '1', 'Uses the dedicated development-login configuration.');

test('stalled automatic sign-in reveals recovery and the manual form', async ({ page }) => {
  await page.clock.install();
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  let posts = 0;
  await page.route('**/sign-in*', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    posts++;
    await blocked;
    await route.abort('failed');
  });
  await page.goto('/sign-in');
  await expect(page.getByRole('status')).toHaveText('Signing you in…');
  await expect.poll(() => posts).toBe(1);
  await page.clock.fastForward(26000);
  await expect(page.locator('.notice [role="alert"]')).toContainText('taking too long');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try test sign-in again' })).toBeEnabled();
  release();
  await expect(page.locator('.notice [role="alert"]')).toContainText('taking too long');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('switching accounts stays responsive while automatic sign-in is pending', async ({ page }) => {
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/sign-in*', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    await blocked;
    await route.abort('failed');
  });
  await page.goto('/sign-in');
  await expect(page.getByRole('status')).toHaveText('Signing you in…');
  await page.getByRole('link', { name: 'Use another account' }).click();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with test account' })).toBeEnabled();
  release();
  await expect(page).toHaveURL(/manual=1/);
  await expect(page.getByRole('status')).not.toHaveText('Signing you in…');
  await expect(page.locator('.notice [role="alert"]')).toHaveCount(0);
});
test('automatic test login keeps credentials server-side and honours explicit sign-out', async ({ page, context }) => {
  const credentials = JSON.parse(readFileSync('.local-services/hosted-cast/test-account.json', 'utf8')) as { password: string };
  let loginPosts = 0;
  let browserSentCredential = false;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/sign-in') {
      loginPosts++;
      browserSentCredential ||= (request.postData() ?? '').includes(credentials.password);
    }
  });
  const manual = await page.goto('/sign-in?manual=1');
  expect((await manual!.text()).includes(credentials.password)).toBe(false);
  await expect(page.getByRole('button', { name: 'Sign in with test account' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  expect(loginPosts).toBe(0);
  // Next integrates the native history API: this changes the query without
  // remounting the form, the case the old mount-only guard missed.
  let releaseLogin!: () => void;
  const loginReady = new Promise<void>(resolve => { releaseLogin = resolve; });
  await page.route('**/sign-in', async route => {
    if (route.request().method() === 'POST') await loginReady;
    await route.continue();
  });
  await page.evaluate(() => window.history.pushState(null, '', '/sign-in'));
  await expect(page.getByRole('status')).toHaveText('Signing you in…');
  await expect(page.getByLabel('Email address')).toHaveCount(0);
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
  releaseLogin();
  await page.waitForURL('**/discover', { timeout: 90000 });
  expect(loginPosts).toBe(1);
  expect(browserSentCredential).toBe(false);
  const auth = (await context.cookies()).filter(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name));
  expect(auth.length > 0).toBe(true);
  expect(auth.every(cookie => cookie.httpOnly && cookie.sameSite === 'Lax')).toBe(true);
  await page.reload();
  await expect(page).toHaveURL(/\/discover$/);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?manual=1$/);
  await expect(page.getByRole('button', { name: 'Sign in with test account' })).toBeVisible();
  expect(loginPosts).toBe(1);
  // A fresh visit also signs in automatically, without a button or form entry.
  await page.goto('/sign-in');
  await page.waitForURL('**/discover', { timeout: 90000 });
  expect(loginPosts).toBe(2);
  expect(browserSentCredential).toBe(false);
});
