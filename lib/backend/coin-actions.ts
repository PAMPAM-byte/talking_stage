"use server";
import { currentAccount } from './server';
import { trustedBackendClient } from './trusted-client';
import { reconcileCoinPurchase, startCoinPurchase, type CoinPurchase } from './coin-service';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** Starts (or safely retries) a purchase and returns the Bachs checkout to open. */
export async function buyCoinsAction(coins: number, operation: string): Promise<{ id?: string; checkout?: string | null; error?: string }> {
  try {
    const account = await currentAccount({ failOnUnavailable: true });
    if (!account?.profile.onboarding_complete || !account.profile.adult_declared_at) return { error: 'Sign in with an eligible account.' };
    if (!Number.isInteger(coins) || coins < 10 || coins > 1000 || !uuid.test(operation)) return { error: 'Choose between 10 and 1,000 coins.' };
    return await startCoinPurchase(account.user.id, coins, operation);
  } catch (error) {
    return { error: error instanceof Error && /coins|attempt|available/.test(error.message) ? error.message : 'Checkout could not be confirmed. Retry this same attempt; you won’t be charged twice.' };
  }
}

/** On return from checkout: confirm with Bachs, then report the result and new balance. */
export async function checkCoinPurchaseAction(id: string): Promise<{ status?: string; coins?: number; balance?: number; error?: string }> {
  try {
    if (!uuid.test(id)) return { error: 'Purchase unavailable.' };
    const account = await currentAccount({ failOnUnavailable: true });
    if (!account?.profile.onboarding_complete || !account.profile.adult_declared_at) return { error: 'Sign in with an eligible account.' };
    const owned = await trustedBackendClient().rpc('coin_purchase_by_id', { p_purchase: id, p_actor: account.user.id });
    if (owned.error || !owned.data) return { error: 'Purchase unavailable.' };
    const purchase = owned.data as CoinPurchase;
    if (purchase.gateway_checkout_id && !['paid', 'refunded'].includes(purchase.status)) await reconcileCoinPurchase(purchase);
    const mine = await account.client.rpc('my_coin_purchase', { p_purchase: id });
    if (mine.error || !mine.data) return { error: 'Purchase unavailable.' };
    return { status: mine.data.status, coins: mine.data.coins, balance: mine.data.balance };
  } catch { return { error: 'We couldn’t confirm the payment just now. Your coins are added as soon as Bachs confirms it.' }; }
}
