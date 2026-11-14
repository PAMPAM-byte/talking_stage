import { expect, type Page } from '@playwright/test';

/** Likes and coins (14 Nov 2026): chats start only after a character likes you back. For tests
 * that need a chat, mark the profile's character as having liked the preview account back, then
 * start (or resume) the conversation from the profile. Call on /characters/[id]. */
export async function startPreviewChat(page: Page) {
  // Wait for the profile's action to render before choosing a path.
  await page.getByRole('button', { name: /^(Resume conversation|Start conversation|Like )/ }).or(page.getByText(/^You liked /)).first().waitFor();
  const resume = page.getByRole('button', { name: 'Resume conversation' });
  if (await resume.count()) { await resume.click(); return; }
  const id = new URL(page.url()).pathname.split('/').pop()!;
  await page.evaluate(characterId => {
    const key = 'talkingstage:likes-coins:v1:mock-account';
    const state = JSON.parse(sessionStorage.getItem(key) ?? 'null') ?? { version: 1, coins: 10, ledger: [], likes: {}, firstMatchGiven: true };
    const now = Date.now();
    state.likes[characterId] = { likedAt: now - 3_600_000, reviewAt: now - 1_800_000, outcome: 'match', reviewedAt: now - 1_800_000, seen: true };
    state.coins = Math.max(state.coins, 1);
    sessionStorage.setItem(key, JSON.stringify(state));
  }, id);
  await page.reload();
  const start = page.getByRole('button', { name: /^Start conversation/ });
  await expect(start).toBeVisible();
  await start.click();
}
