import { expect, test, type Page } from '@playwright/test';
// The logo sits in the sidebar's top corner on wide screens and in the header on phones; either way it goes home (founder request, 30 Oct).
async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
}
for (const width of [390, 1440]) test(`one visible logo links to the landing page at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await signIn(page);
  const logo = page.getByRole('link', { name: 'TalkingStage home' }).locator('visible=true');
  await expect(logo).toHaveCount(1);
  if (width >= 900) {
    const box = await logo.boundingBox();
    expect(box!.x).toBeLessThan(220);
    expect(box!.y).toBeLessThan(100);
  }
  await page.screenshot({ path: `.local-services/sidebar-logo-${width}.png` });
  await logo.click();
  await expect(page).toHaveURL(/\/$/);
});
