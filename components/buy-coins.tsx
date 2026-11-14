"use client";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useId, useState } from 'react';
import { COIN_PACKS, COIN_PRICE_MINOR, MAX_COIN_PURCHASE, MIN_COIN_PURCHASE, coinPriceMinor, coinsLabel, validCoinCount } from '@/lib/coins';
import { formatNaira } from '@/lib/format';
import { characters } from '@/lib/mock/discovery';
import { buyCoinsPreview } from '@/lib/mock/likes';
import { Coin, usePreviewLikes } from './coins';
import { UserBoundary } from './user-boundary';
import { Button, Notice } from './ui/primitives';

export function BuyCoins() { return <UserBoundary active="Likes"><BuyCoinsContent /></UserBoundary>; }

function BuyCoinsContent() {
  const state = usePreviewLikes(); const params = useSearchParams(); const id = useId();
  const forCharacter = characters.find(c => c.id === params.get('for'));
  const [pack, setPack] = useState<number | 'other'>(20); const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [added, setAdded] = useState(0);
  const count = pack === 'other' ? Number(other.replace(/,/g, '')) : pack;
  const valid = validCoinCount(count);
  const fieldError = pack === 'other' && other !== '' && !valid ? (Number.isInteger(count) && count > MAX_COIN_PURCHASE ? `You can buy up to ${MAX_COIN_PURCHASE} coins at a time.` : `Buy at least ${MIN_COIN_PURCHASE} coins, in whole numbers.`) : '';

  async function pay() {
    if (!valid) { setError(pack === 'other' && other === '' ? 'Enter how many coins you want.' : fieldError || 'Choose how many coins you want.'); return; }
    setBusy(true); setError('');
    const result = await buyCoinsPreview(count);
    setBusy(false);
    if (result.error) setError(result.error); else setAdded(count);
  }

  const back = forCharacter ? { href: '/likes', label: `Back to ${forCharacter.name}` } : { href: '/likes', label: 'Back to Likes' };
  if (added) return <div className="coins-page stack">
    <div className="coins-done" role="status"><span className="coins-done__stack" aria-hidden="true"><Coin size={56} /><Coin size={56} /><Coin size={56} /></span>
      <h1 className="display page-title">{coinsLabel(added)} added</h1>
      <p className="muted">You now have {coinsLabel(state.coins)}.{forCharacter ? ` Start your conversation with ${forCharacter.name} from Likes.` : ''}</p>
      <Link href={back.href} className="button button--primary">{back.label}</Link>
      <p className="caption muted">Preview: no money was taken.</p></div>
  </div>;

  return <div className="coins-page stack">
    <Link href={back.href} className="profile-back">← {back.label}</Link>
    <header className="coins-head"><h1 className="display page-title">Buy coins</h1>
      <p className="coins-head__balance"><Coin size={22} />You have <b>{coinsLabel(state.coins)}</b></p></header>
    <p className="muted coins-intro">A coin starts a conversation with a character who liked you back{forCharacter ? `, like ${forCharacter.name}` : ''}. Carrying on a chat is free.</p>
    <fieldset className="coin-packs"><legend className="sr-only">How many coins</legend>
      {COIN_PACKS.map(n => <label key={n} className={`coin-pack${pack === n ? ' is-selected' : ''}`}>
        <input type="radio" name={`${id}-pack`} checked={pack === n} onChange={() => { setPack(n); setError(''); }} />
        <span className="coin-pack__count"><Coin size={18} />{n}</span><span className="coin-pack__price">{formatNaira(coinPriceMinor(n))}</span>
      </label>)}
      <label className={`coin-pack coin-pack--other${pack === 'other' ? ' is-selected' : ''}`}>
        <input type="radio" name={`${id}-pack`} checked={pack === 'other'} onChange={() => setPack('other')} />
        <span className="coin-pack__count">Another amount</span>
      </label>
    </fieldset>
    {pack === 'other' && <label className="field coin-other">How many coins
      <input className="field__control" inputMode="numeric" autoFocus value={other} onChange={e => { setOther(e.target.value.replace(/[^\d,]/g, '')); setError(''); }} placeholder={`${MIN_COIN_PURCHASE} or more`} aria-invalid={!!fieldError || undefined} aria-describedby={`${id}-other`} />
      <span id={`${id}-other`} className={`caption ${fieldError ? 'field__error' : 'muted'}`} aria-live="polite">{fieldError || `Between ${MIN_COIN_PURCHASE} and ${MAX_COIN_PURCHASE} coins.`}</span></label>}
    <dl className="coins-summary">
      <div><dt>Coins</dt><dd>{valid ? count : '–'}</dd></div>
      <div><dt>Price</dt><dd>{formatNaira(COIN_PRICE_MINOR)} each</dd></div>
      <div><dt>Received by</dt><dd>TalkingStage’s operator</dd></div>
    </dl>
    {error && <Notice live tone="danger" title="Choose how many coins">{error}</Notice>}
    <Button className="coins-pay" loading={busy} onClick={pay}>{valid ? `Pay ${formatNaira(coinPriceMinor(count))}` : 'Pay'}</Button>
    <p className="caption muted">Payment happens securely at Bachs, then you come straight back here. Coins are added once the payment is confirmed. Gifts in chat are separate and still optional.</p>
    <p className="caption muted">Preview: no money is taken.</p>
  </div>;
}
