import 'server-only';
import { trustedBackendClient } from './trusted-client';
import { bachsSettings, createCheckout, verifyCheckout, checkoutURL } from '@/lib/payments/bachs.mjs';
import { emitGiftFailure } from '@/lib/monitoring/events.mjs';

// Buying coins through Bachs (14 Nov 2026): same checkout and verification as gifts, own ledger.
export type CoinPurchase = {
  id: string; user_id: string; coins: number; amount_minor: number; currency: string; reference: string; recipient_disclosure: string;
  status: string; needs_review: boolean; created_at: string; verified_at: string | null; expires_at: string | null;
  gateway_environment: string; gateway_organization_id: string; gateway_checkout_id: string | null; checkout_url: string | null;
};

export async function startCoinPurchase(actor: string, coins: number, operation: string) {
  const settings = bachsSettings(); if (!settings) { emitGiftFailure('configuration', {}); throw new Error('Buying coins isn’t available right now.'); }
  const client = trustedBackendClient();
  const reserved = await client.rpc('reserve_coin_purchase', { p_actor: actor, p_coins: coins, p_operation: operation, p_environment: settings.environment, p_organization: settings.organizationId });
  if (reserved.error) throw new Error(/invalid_amount/.test(reserved.error.message) ? 'Choose between 10 and 1,000 coins.' : /conflict/.test(reserved.error.message) ? 'This attempt has different details. Reload before trying again.' : /rate_limited/.test(reserved.error.message) ? 'Too many attempts. Wait a minute and try again.' : 'Buying coins isn’t available right now.');
  let purchase = reserved.data as CoinPurchase;
  if (!purchase.gateway_checkout_id) {
    // A lost response retries the same purchase and Bachs idempotency key.
    const checkout = await createCheckout(settings, purchase, process.env.TALKINGSTAGE_SITE_URL, { allowLocalSandboxReturn: process.env.NODE_ENV === 'development' }, { kind: 'coins' })
      .catch(error => { emitGiftFailure('checkout', error); throw error; });
    const bound = await client.rpc('bind_coin_checkout', { p_purchase: purchase.id, p_checkout: checkout.checkoutId, p_url: checkout.checkoutUrl, p_expires: checkout.expiresAt });
    if (bound.error) throw new Error('Checkout could not be confirmed. Retry this same attempt.');
    purchase = { ...purchase, gateway_checkout_id: checkout.checkoutId, checkout_url: checkout.checkoutUrl, expires_at: checkout.expiresAt };
  }
  return { id: purchase.id, checkout: safeCoinCheckout(purchase) };
}

export async function reconcileCoinPurchase(purchase: CoinPurchase, event?: { id: string; type: string }) {
  const settings = bachsSettings();
  if (!settings || purchase.gateway_environment !== settings.environment || purchase.gateway_organization_id !== settings.organizationId) throw new Error('Payment verification unavailable.');
  const verified = await verifyCheckout(settings, purchase).catch(error => { emitGiftFailure('verify', error); throw error; });
  if (event?.type.startsWith('dispute.')) verified.status = 'review';
  const result = await trustedBackendClient().rpc('apply_coin_verification', { p_purchase: purchase.id, p_checkout: verified.checkoutId, p_payment: verified.paymentId, p_state: verified.status, p_verified_at: verified.verifiedAt, p_event: event?.id ?? null, p_event_type: event?.type ?? 'reconciliation' });
  if (result.error) { emitGiftFailure('verify', { code: 'ledger_failed', reason: result.error.message }); throw new Error('Payment verification unavailable.'); }
  return result.data as string;
}

export function safeCoinCheckout(purchase: CoinPurchase) {
  try { if (!purchase.expires_at || Date.parse(purchase.expires_at) <= Date.now()) return null; return purchase.checkout_url ? checkoutURL(purchase.checkout_url) : null; } catch { return null; }
}
