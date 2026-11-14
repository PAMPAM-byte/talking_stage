// Likes and coins (founder request, 14 November 2026). Founder-approved pricing and rules:
// everyone starts with 10 coins; starting a conversation with a character who liked you back
// uses 1 coin; carrying on a chat is free (the daily reply limit still applies); coins cost
// ₦50 each, at least 10 at a time. Characters go through their likes every 30 minutes and a
// character who doesn't like someone back is never announced. Gifts stay alongside coins.
export const STARTING_COINS = 10;
export const COIN_PRICE_MINOR = 5000; // ₦50 in kobo
export const MIN_COIN_PURCHASE = 10;
export const MAX_COIN_PURCHASE = 1000;
export const COIN_PACKS = [10, 20, 50, 100] as const;
export const LIKE_REVIEW_MINUTES = 30;
/** A like waits at least this long, so an answer never looks instant. */
export const LIKE_MIN_WAIT_MINUTES = 20;
/** After a character doesn't like someone back, they can like that character again after this. */
export const RELIKE_AFTER_DAYS = 7;

export const coinsLabel = (n: number) => `${new Intl.NumberFormat('en-NG').format(n)} ${n === 1 ? 'coin' : 'coins'}`;
export const coinPriceMinor = (coins: number) => coins * COIN_PRICE_MINOR;
export function validCoinCount(value: number) { return Number.isInteger(value) && value >= MIN_COIN_PURCHASE && value <= MAX_COIN_PURCHASE; }

/** The first review run (on the hour or half hour) at least the minimum wait after a like. */
export function nextReviewAt(likedAt: number) {
  const step = LIKE_REVIEW_MINUTES * 60_000;
  return Math.ceil((likedAt + LIKE_MIN_WAIT_MINUTES * 60_000) / step) * step;
}
