"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { COIN_PACKS, COIN_PRICE_MINOR, MIN_COIN_PURCHASE, coinPriceMinor, coinsLabel } from '@/lib/coins';
import { formatNaira } from '@/lib/format';
import { buyCoinsAction, checkCoinPurchaseAction } from '@/lib/backend/coin-actions';
import { Coin } from './coin';
import { Button, Notice } from './ui/primitives';

// Buy coins, live (14 Nov 2026): ₦50 a coin, at least 10, paid at Bachs, confirmed on return.
type Props = { balance: number; maxCoins: number; recipient: string; sandbox: boolean; forName?: string; purchaseId?: string };

export function ConnectedBuyCoins({ balance, maxCoins, recipient, sandbox, forName, purchaseId }: Props) {
  const id = useId(); const router = useRouter();
  const [pack, setPack] = useState<number | 'other'>(20); const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [operation, setOperation] = useState<string | null>(null);
  const count = pack === 'other' ? Number(other.replace(/,/g, '')) : pack;
  const valid = Number.isInteger(count) && count >= MIN_COIN_PURCHASE && count <= maxCoins;
  const fieldError = pack === 'other' && other !== '' && !valid ? (Number.isInteger(count) && count > maxCoins ? `You can buy up to ${maxCoins} coins at a time.` : `Buy at least ${MIN_COIN_PURCHASE} coins, in whole numbers.`) : '';
  const back = { href: '/likes', label: forName ? `Back to ${forName}` : 'Back to Likes' };

  if (purchaseId) return <PurchaseResult id={purchaseId} back={back} />;

  async function pay() {
    if (!valid) { setError(pack === 'other' && other === '' ? 'Enter how many coins you want.' : fieldError || 'Choose how many coins you want.'); return; }
    setBusy(true); setError('');
    // One attempt id per amount: retrying after a lost response reuses the same checkout.
    const attempt = operation ?? crypto.randomUUID(); setOperation(attempt);
    const result = await buyCoinsAction(count, attempt);
    if (result.checkout) { window.location.assign(result.checkout); return; }
    setBusy(false);
    if (result.id && !result.error) { router.push(`/coins?purchase=${result.id}`); return; }
    setError(result.error ?? 'Checkout could not open. Try again.');
  }

  return <div className="coins-page stack">
    <Link href={back.href} className="profile-back">← {back.label}</Link>
    <header className="coins-head"><h1 className="display page-title">Buy coins</h1>
      <p className="coins-head__balance"><Coin size={22} />You have <b>{coinsLabel(balance)}</b></p></header>
    <p className="muted coins-intro">A coin starts a conversation with a character who liked you back{forName ? `, like ${forName}` : ''}. Carrying on a chat is free.</p>
    <fieldset className="coin-packs"><legend className="sr-only">How many coins</legend>
      {COIN_PACKS.filter(n => n <= maxCoins).map(n => <label key={n} className={`coin-pack${pack === n ? ' is-selected' : ''}`}>
        <input type="radio" name={`${id}-pack`} checked={pack === n} onChange={() => { setPack(n); setError(''); setOperation(null); }} />
        <span className="coin-pack__count"><Coin size={18} />{n}</span><span className="coin-pack__price">{formatNaira(coinPriceMinor(n))}</span>
      </label>)}
      <label className={`coin-pack coin-pack--other${pack === 'other' ? ' is-selected' : ''}`}>
        <input type="radio" name={`${id}-pack`} checked={pack === 'other'} onChange={() => { setPack('other'); setOperation(null); }} />
        <span className="coin-pack__count">Another amount</span>
      </label>
    </fieldset>
    {pack === 'other' && <label className="field coin-other">How many coins
      <input className="field__control" inputMode="numeric" autoFocus value={other} onChange={e => { setOther(e.target.value.replace(/[^\d,]/g, '')); setError(''); setOperation(null); }} placeholder={`${MIN_COIN_PURCHASE} or more`} aria-invalid={!!fieldError || undefined} aria-describedby={`${id}-other`} />
      <span id={`${id}-other`} className={`caption ${fieldError ? 'field__error' : 'muted'}`} aria-live="polite">{fieldError || `Between ${MIN_COIN_PURCHASE} and ${maxCoins} coins.`}</span></label>}
    <dl className="coins-summary">
      <div><dt>Coins</dt><dd>{valid ? count : '–'}</dd></div>
      <div><dt>Price</dt><dd>{formatNaira(COIN_PRICE_MINOR)} each</dd></div>
      <div><dt>Received by</dt><dd>{recipient}</dd></div>
    </dl>
    {error && <Notice live tone="danger" title="Checkout didn’t open">{error}</Notice>}
    <Button className="coins-pay" loading={busy} onClick={pay}>{valid ? `Pay ${formatNaira(coinPriceMinor(count))}` : 'Pay'}</Button>
    <p className="caption muted">You’ll pay securely at Bachs, then come straight back here. Coins are added once the payment is confirmed. Gifts in chat are separate and still optional.</p>
    {sandbox && <p className="caption muted">Test mode: no real money is taken.</p>}
  </div>;
}

function PurchaseResult({ id, back }: { id: string; back: { href: string; label: string } }) {
  const [state, setState] = useState<{ status?: string; coins?: number; balance?: number; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  async function check() { setChecking(true); setState(await checkCoinPurchaseAction(id)); setChecking(false); }
  useEffect(() => { let live = true; checkCoinPurchaseAction(id).then(result => { if (live) setState(result); }); return () => { live = false; }; }, [id]);
  if (!state) return <div className="coins-page stack"><p className="coins-confirming" role="status"><span className="spinner" aria-hidden="true" />Confirming your payment with Bachs…</p></div>;
  if (state.status === 'paid') return <div className="coins-page stack"><div className="coins-done" role="status">
    <span className="coins-done__stack" aria-hidden="true"><Coin size={56} /><Coin size={56} /><Coin size={56} /></span>
    <h1 className="display page-title">{coinsLabel(state.coins ?? 0)} added</h1>
    <p className="muted">You now have {coinsLabel(state.balance ?? 0)}.</p>
    <Link href={back.href} className="button button--primary">{back.label}</Link></div></div>;
  const pending = state.status === 'pending' || state.status === 'awaiting_checkout';
  return <div className="coins-page stack">
    <h1 className="display page-title">{state.error ? 'Payment not confirmed yet' : pending ? 'Payment pending' : state.status === 'review' ? 'Payment needs review' : 'Payment not completed'}</h1>
    <Notice live tone={state.error || pending || state.status === 'review' ? 'warning' : 'danger'} title={state.error ? 'Couldn’t check just now' : pending ? 'Waiting for Bachs to confirm' : state.status === 'review' ? 'We’re checking this payment' : 'No coins were added'}>
      {state.error ?? (pending ? 'Your coins are added as soon as Bachs confirms the payment. You can check again now.' : state.status === 'review' ? 'Something about this payment needs a manual check. Contact support if you were charged.' : 'The payment didn’t go through, so you weren’t charged for coins.')}
    </Notice>
    <div className="row">
      {(pending || state.error) && <Button variant="secondary" loading={checking} onClick={check}>Check again</Button>}
      <Link href="/coins" className="button button--primary">{pending || state.error ? 'Buy coins' : 'Try again'}</Link>
      <Link href={back.href} className="button button--quiet">{back.label}</Link>
    </div>
  </div>;
}
