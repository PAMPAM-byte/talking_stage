import Link from 'next/link';
import { coinsLabel } from '@/lib/coins';

/** The TalkingStage coin: brand red, stamped with the brand's opening quote mark. A coin opens a conversation. */
export function Coin({ size = 20 }: { size?: number }) {
  return <svg className="coin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" className="coin__rim" /><circle cx="12" cy="12" r="8.4" className="coin__face" />
    <text x="12" y="19.2" textAnchor="middle" className="coin__mark">“</text>
  </svg>;
}

export function CoinBalance({ coins, href = '/coins' }: { coins: number; href?: string }) {
  return <Link href={href} className={`coin-balance${coins < 1 ? ' is-empty' : ''}`} aria-label={`${coinsLabel(coins)}. Buy coins`}>
    <Coin /><span className="coin-balance__count">{coins}</span><span className="coin-balance__word">{coins === 1 ? 'coin' : 'coins'}</span><span className="coin-balance__add" aria-hidden="true">+</span>
  </Link>;
}
