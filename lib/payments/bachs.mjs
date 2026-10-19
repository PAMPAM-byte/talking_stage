import { createHmac, timingSafeEqual } from 'node:crypto';

export class PaymentError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function bachsSettings(env = process.env) {
  if (env.TALKINGSTAGE_PAYMENTS_ENABLED !== 'true') return null;
  const environment = env.BACHS_ENVIRONMENT;
  if (!['sandbox', 'production'].includes(environment)) return null;
  const key = env.BACHS_API_KEY?.trim();
  if (!key || (environment === 'sandbox' ? !key.startsWith('sk_sandbox_') : !key.startsWith('sk_live_'))) return null;
  if (!/^acct_[A-Za-z0-9]+$/.test(env.BACHS_ORGANIZATION_ID ?? '') || !env.BACHS_WEBHOOK_SECRET?.trim()) return null;
  return { environment, key, organizationId: env.BACHS_ORGANIZATION_ID, webhookSecret: env.BACHS_WEBHOOK_SECRET.trim(),
    baseURL: environment === 'sandbox' ? 'https://sandbox-api.bachs.io' : 'https://api.bachs.io' };
}
export function minorToDecimal(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new PaymentError('invalid_amount');
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}
export function decimalToMinor(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) throw new PaymentError('invalid_amount');
  const [whole, fraction = ''] = value.split('.');
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new PaymentError('invalid_amount');
  return Number(result);
}
export function checkoutURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && ['checkout.bachs.io', 'sandbox-checkout.bachs.io'].includes(url.hostname) && !url.username && !url.password && !url.port) return url.href;
  } catch { /* No arbitrary redirects. */ }
  throw new PaymentError('invalid_checkout');
}
async function boundedJSON(response) {
  if (!response.ok || !response.body) throw new PaymentError('gateway_unavailable');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 262144) throw new PaymentError('invalid_gateway_response');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}
export async function bachsRequest(settings, path, { method = 'GET', body, idempotencyKey, fetcher = fetch, signal } = {}) {
  try {
    const timeout = AbortSignal.timeout(20000);
    return await boundedJSON(await fetcher(`${settings.baseURL}/v1/${path}`, {
      method, redirect: 'error', cache: 'no-store', signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { Authorization: `Bearer ${settings.key}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }));
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    // Never expose provider responses, keys or customer details.
    throw new PaymentError('gateway_unavailable');
  }
}
export async function createCheckout(settings, intent, returnOrigin, transport = {}) {
  const returnURL = new URL(`/payments/${intent.id}`, returnOrigin);
  if (returnURL.protocol !== 'https:' || !returnURL.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(returnURL.hostname)) throw new PaymentError('public_return_url_required');
  const account=await bachsRequest(settings,'accounts/me',transport);
  if(account.id!==settings.organizationId||account.is_active!==true)throw new PaymentError('merchant_mismatch');
  const result = await bachsRequest(settings, 'checkout-sessions', { ...transport, method: 'POST', idempotencyKey: `gift-${intent.id}`, body: {
    pricing: { currency: 'NGN', amount: minorToDecimal(Number(intent.amount_minor)) }, billing_currency: 'NGN',
    reference: intent.reference, metadata: { talkingstage_intent: intent.id },
    success_url: returnURL.href, cancel_url: returnURL.href, expires_in_minutes: 60,
    // Guest checkout avoids sending chat/account details to the gateway.
    customer_creation: 'if_required',
  } });
  if (typeof result.checkout_id !== 'string' || !/^chk_[A-Za-z0-9]+$/.test(result.checkout_id) || result.reference !== intent.reference || !Number.isFinite(Date.parse(result.expires_at))) throw new PaymentError('invalid_gateway_response');
  return { checkoutId: result.checkout_id, checkoutUrl: checkoutURL(result.checkout_url), expiresAt: result.expires_at };
}
export function verifyBachsEvent(rawBody, headers, settings, now = Date.now()) {
  if (!settings || Buffer.byteLength(rawBody) > 262144) throw new PaymentError('invalid_webhook');
  const v2 = headers.get('x-bachs-signature-v2');
  let timestamp; let signatures;
  if (v2 !== null) {
    const fields = v2.split(',').map(part => part.trim().split('='));
    const timestamps = fields.filter(([name]) => name === 't');
    if (timestamps.length !== 1 || fields.some(parts => parts.length !== 2 || !['t', 'v1'].includes(parts[0]))) throw new PaymentError('invalid_webhook');
    timestamp = timestamps[0][1]; signatures = fields.filter(([name]) => name === 'v1').map(([, value]) => value);
  } else {
    timestamp = headers.get('x-bachs-timestamp'); signatures = [headers.get('x-bachs-signature')];
  }
  if (!/^\d{10,11}$/.test(timestamp ?? '') || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new PaymentError('invalid_webhook');
  const expected = createHmac('sha256', settings.webhookSecret).update(`${timestamp}.`).update(rawBody).digest();
  if (!signatures.some(value => typeof value === 'string' && /^[a-fA-F0-9]{64}$/.test(value) && timingSafeEqual(expected, Buffer.from(value, 'hex')))) throw new PaymentError('invalid_webhook');
  let event;
  try { event = JSON.parse(Buffer.from(rawBody).toString('utf8')); } catch { throw new PaymentError('invalid_webhook'); }
  if (!event || typeof event.id !== 'string' || event.id.length > 160 || typeof event.type !== 'string' || event.type.length > 100 || !event.data || typeof event.data !== 'object' || event.organization_id !== settings.organizationId) throw new PaymentError('invalid_webhook');
  return event;
}
// Read the current resource, never infer ledger state from an event name or redirect.
export async function verifyCheckout(settings, intent, transport = {}) {
  if (!/^chk_[A-Za-z0-9]+$/.test(intent.gateway_checkout_id ?? '')) throw new PaymentError('unbound_checkout');
  const checkout = await bachsRequest(settings, `checkout-sessions/${intent.gateway_checkout_id}`, transport);
  if (checkout.checkout_id !== intent.gateway_checkout_id || checkout.reference !== intent.reference || checkout.currency !== 'NGN' || decimalToMinor(checkout.amount) !== Number(intent.amount_minor)) throw new PaymentError('payment_mismatch');
  let status = checkout.status === 'expired' ? 'expired' : checkout.status === 'cancelled' ? 'cancelled' : 'pending';
  let paymentId = null; let verifiedAt = checkout.updated_at;
  if (checkout.charge?.payment_id) {
    paymentId = checkout.charge.payment_id;
    if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new PaymentError('payment_mismatch');
    const payment = await bachsRequest(settings, `payments/${paymentId}`, transport);
    if (payment.payment_id !== paymentId || payment.checkout_id !== intent.gateway_checkout_id || payment.reference !== intent.reference || payment.currency !== 'NGN' || decimalToMinor(payment.amount) !== Number(intent.amount_minor)) throw new PaymentError('payment_mismatch');
    verifiedAt = payment.updated_at;
    if (payment.status === 'succeeded' && decimalToMinor(payment.amount_paid ?? '') === Number(intent.amount_minor) && decimalToMinor(payment.amount_remaining ?? '') === 0) status = 'paid';
    else if (['refunded', 'auto_refunded'].includes(payment.status)) status = 'refunded';
    else if (['failed', 'expired', 'cancelled'].includes(payment.status)) status = payment.status;
    else if (['underpaid', 'overpaid', 'partially_refunded', 'accepted'].includes(payment.status)) status = 'review';
  }
  if (!Number.isFinite(Date.parse(verifiedAt))) throw new PaymentError('invalid_gateway_response');
  return { status, paymentId, verifiedAt, checkoutId: intent.gateway_checkout_id };
}
