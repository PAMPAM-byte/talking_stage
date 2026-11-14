import Link from 'next/link';
import { currentAccount } from '@/lib/backend/server';
import { COIN_PRICE_MINOR, LIKE_REVIEW_MINUTES, coinsLabel } from '@/lib/coins';
import { ConnectedBuyCoins } from './connected-buy-coins';
import { formatNaira } from '@/lib/format';
import { Coin, CoinBalance } from './coin';
import { MarkLikesSeen, StartWithCoinButton } from './connected-likes-controls';
import { EmptyState, Notice } from './ui/primitives';

// Likes and coins (14 Nov 2026), live accounts. The database only returns likes back whose
// time has come; refusals never leave it.
type Match = { characterId: string; name: string; age: number; clue: string; likedBackAt: string; seen: boolean; conversationId: string | null };
type Overview = { enabled: boolean; coins?: number; newCount?: number; matches?: Match[]; liked?: string[] };

const ago = (at: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(at));
};

async function loadOverview() {
  const account = await currentAccount(); if (!account) return null;
  const result = await account.client.rpc('likes_overview');
  return { account, overview: result.error ? null : result.data as Overview };
}

const notOpen = <EmptyState icon="heart" title="Likes aren’t open yet" action={<Link href="/discover" className="button button--primary">Go to Discover</Link>}>You can keep meeting characters from Discover for now.</EmptyState>;

export async function ConnectedLikes() {
  const data = await loadOverview(); if (!data) return null;
  const { account, overview } = data;
  if (!overview) return <Notice title="Likes unavailable" tone="warning">Reload to try again.</Notice>;
  if (!overview.enabled) return notOpen;
  const matches = overview.matches ?? []; const coins = overview.coins ?? 0; const waiting = (overview.liked ?? []).length;
  const assets = matches.length ? (await account.client.from('character_assets').select('id,character_id,slot,alt_text').in('character_id', matches.map(m => m.characterId)).eq('slot', 'portrait')).data ?? [] : [];
  return <div className="likes-page stack">
    <header className="likes-head">
      <div className="likes-head__row"><h1 className="display page-title">Likes</h1><CoinBalance coins={coins} /></div>
      <p className="muted">Characters go through their likes every {LIKE_REVIEW_MINUTES} minutes. Anyone who likes you back appears here.</p>
    </header>
    {coins < 1 && matches.some(m => !m.conversationId) && <Notice tone="warning" title="You’re out of coins">Buy coins to start a new conversation. Chats you’ve already started stay open. <Link href="/coins">Buy coins</Link></Notice>}
    {matches.length ? <section className="stack" aria-labelledby="matches-title">
      <h2 id="matches-title" className="likes-section-title">Liked you back <span className="likes-count">{matches.length}</span></h2>
      <ul className="likes-grid">{matches.map(m => { const photo = assets.find(a => a.character_id === m.characterId); return <li key={m.characterId} className="match-card">
        <Link href={`/characters/${m.characterId}`} className="match-card__photo" aria-label={`View ${m.name}’s profile`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo ? <img src={`/api/cast-assets/${photo.id}?w=640`} srcSet={[320, 640].map(w => `/api/cast-assets/${photo.id}?w=${w} ${w}w`).join(', ')} sizes="(min-width:600px) 260px, 50vw" alt={photo.alt_text} className="connected-cast-photo match-card__img" /> : <span className="photo-paused">Photos are paused</span>}
          {!m.seen && <span className="match-card__new">New</span>}
          <span className="match-card__identity"><strong>{m.name}<span>, {m.age}</span></strong><span className="match-card__when">Liked you back {ago(m.likedBackAt)}</span></span>
        </Link>
        <p className="match-card__clue">&ldquo;{m.clue}&rdquo;</p>
        {m.conversationId ? <Link href={`/messages/${encodeURIComponent(m.conversationId)}`} className="button button--secondary match-card__action">Open chat</Link>
          : coins < 1 ? <Link href={`/coins?for=${encodeURIComponent(m.characterId)}`} className="button button--secondary match-card__action">Buy coins to start</Link>
          : <StartWithCoinButton id={m.characterId} name={m.name} />}
      </li>; })}</ul>
      <MarkLikesSeen count={overview.newCount ?? 0} />
    </section> : <EmptyState icon="heart" title={waiting ? 'No one has liked you back yet' : 'No likes yet'} action={<Link href="/discover" className="button button--primary">{waiting ? 'Keep discovering' : 'Go to Discover'}</Link>}>
      {waiting ? `Your likes are with the characters. They check every ${LIKE_REVIEW_MINUTES} minutes, so look back soon.` : 'Like characters in Discover. When one likes you back, you can start a conversation.'}
    </EmptyState>}
    <aside className="coin-rules" aria-label="How coins work"><Coin size={28} /><p>Starting a conversation uses <b>1 coin</b>. Carrying on a chat is free. <Link href="/coins">Buy coins</Link></p></aside>
  </div>;
}

/** Buy coins (14 Nov 2026): real purchases through Bachs once payments are configured. */
export async function ConnectedCoins({ forId, purchaseId }: { forId?: string; purchaseId?: string }) {
  const data = await loadOverview(); if (!data) return null;
  const { account, overview } = data;
  if (!overview) return <Notice title="Coins unavailable" tone="warning">Reload to try again.</Notice>;
  if (!overview.enabled) return notOpen;
  const shop = (await account.client.rpc('coin_shop')).data as { open: boolean; recipient: string | null; environment: string; maxCoins: number; balance: number } | null;
  const uuid = /^[a-f0-9-]{36}$/i;
  const forName = forId && uuid.test(forId) ? (await account.client.from('characters').select('name').eq('id', forId).maybeSingle()).data?.name as string | undefined : undefined;
  if (purchaseId && uuid.test(purchaseId)) return <ConnectedBuyCoins balance={shop?.balance ?? overview.coins ?? 0} maxCoins={1000} recipient="" sandbox={false} forName={forName} purchaseId={purchaseId} />;
  if (!shop?.open || !shop.recipient || shop.maxCoins < 10) return <div className="coins-page stack">
    <Link href="/likes" className="profile-back">← Back to Likes</Link>
    <header className="coins-head"><h1 className="display page-title">Buy coins</h1>
      <p className="coins-head__balance"><Coin size={22} />You have <b>{coinsLabel(overview.coins ?? 0)}</b></p></header>
    <Notice title="Buying coins is paused">Coins cost {formatNaira(COIN_PRICE_MINOR)} each, at least 10 at a time. Try again a little later; chats you’ve already started stay open and free.</Notice>
  </div>;
  return <ConnectedBuyCoins balance={shop.balance} maxCoins={shop.maxCoins} recipient={shop.recipient} sandbox={shop.environment === 'sandbox'} forName={forName} />;
}
