import { expect, test, type Page } from '@playwright/test';
import { characterStyles } from '../lib/character-styles';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
}

test('style labels use the city only for Lagos and Abuja residents', () => {
  expect(characterStyles(['playful', 'big girl'], 'Lagos, Lagos, Nigeria')).toEqual(['Lagos big girl']);
  expect(characterStyles(['big girl'], 'Abuja, FCT, Nigeria')).toEqual(['Abuja big girl']);
  expect(characterStyles(['baddie', 'witty'], 'Atlanta, Georgia, United States')).toEqual(['Baddie']);
  expect(characterStyles(['big boy', 'Sugar daddy personality'], 'Cape Town, Western Cape, South Africa')).toEqual(['Sugar daddy', 'Big boy']);
  expect(characterStyles(['big boy', 'playboy'], 'Aba, Abia, Nigeria')).toEqual(['Playboy', 'Big boy']);
  expect(characterStyles(['warm', 'romantic'], 'Lagos, Lagos, Nigeria')).toEqual([]);
});

for (const width of [320, 1440]) {
  test(`profile shows the character style at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    await page.goto('/characters/char-amara');
    const style = page.locator('.profile-style');
    await expect(style).toHaveText(['Lagos big girl']);
    await expect(page.getByText('Lagos big girl. Brand strategist by day')).toBeVisible();
    const box = (await style.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`amara-${width}.png`) });

    await page.goto('/characters/char-chief-chukwudi');
    await expect(page.locator('.profile-style')).toHaveText(['Playboy', 'Big boy']);
  });
}
