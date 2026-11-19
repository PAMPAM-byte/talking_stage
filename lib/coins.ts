// Likes and coins (founder request, 14 November 2026). Founder-approved pricing and rules:
// everyone starts with 10 coins; starting a conversation with a character who liked you back
// uses 1 coin; carrying on a chat is free (the daily reply limit still applies); coins cost
// ₦50 each, at least 10 at a time. Characters answer a like straight away (19 November 2026,
// replacing the half-hourly answer); one who doesn't like someone back is never announced. Gifts stay alongside coins.
export const STARTING_COINS = 10;
export const COIN_PRICE_MINOR = 5000; // ₦50 in kobo
export const MIN_COIN_PURCHASE = 10;
export const MAX_COIN_PURCHASE = 1000;
export const COIN_PACKS = [10, 20, 50, 100] as const;
/** After a character doesn't like someone back, they can like that character again after this. */
export const RELIKE_AFTER_DAYS = 7;

export const coinsLabel = (n: number) => `${new Intl.NumberFormat('en-NG').format(n)} ${n === 1 ? 'coin' : 'coins'}`;
export const coinPriceMinor = (coins: number) => coins * COIN_PRICE_MINOR;
export function validCoinCount(value: number) { return Number.isInteger(value) && value >= MIN_COIN_PURCHASE && value <= MAX_COIN_PURCHASE; }

