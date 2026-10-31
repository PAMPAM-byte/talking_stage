import { expect, test } from '@playwright/test';
// Support publishes a real contact address (support@talkingstage.buzz, 31 Oct).
test('support page and home footer show the support email', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/support');
  const action = page.getByRole('link', { name: 'Email support' });
  await expect(action).toHaveAttribute('href', 'mailto:support@talkingstage.buzz');
  await action.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local-services/support-contact-390.png' });
  await expect(page.getByText('still being selected')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'support@talkingstage.buzz' })).toHaveAttribute('href', 'mailto:support@talkingstage.buzz');
});
