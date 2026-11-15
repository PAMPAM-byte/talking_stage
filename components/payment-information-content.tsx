import Link from 'next/link';
import { Icon } from './ui/icon';
import { supportEmail } from '@/lib/support';

// Live payment information (15 Nov 2026). Founder decisions: coins are ₦50 each, at least 10;
// coins and gifts are not refundable except for payment errors; the operator is "TalkingStage".
export const paymentInformationSections: [string, string][] = [
  ['Two ways to pay', 'There are two kinds of payment on TalkingStage. Coins let you start conversations: everyone gets 10 free coins, and starting a conversation with a character who liked you back uses 1 coin. Gifts are optional support you can send from inside a chat. Carrying on a conversation is always free.'],
  ['Buying coins', 'Coins cost ₦50 each, and you buy at least 10 at a time (₦500), up to 1,000 in one purchase. Coins have no cash value, can’t be transferred or swapped for money, and don’t expire while your account is open. Coins you’ve already used stay used, even if you later delete that conversation.'],
  ['Gifts are optional', 'As a chat grows, a character may playfully ask for a small gift now and then: first after about 20 replies, then less often. Saying no never changes how they talk to you. You can decline, ignore or turn requests off in Settings. A gift doesn’t buy anything, guarantee a romantic response or change a character’s boundaries, and conversations stay non-explicit.'],
  ['Who receives your money', 'Characters are fictional AI and receive nothing. All payments are received by TalkingStage through Bachs, our payment provider. The registered recipient is shown on the payment screen before you pay. Payments are in Nigerian naira (NGN), and there are no subscriptions or saved-card charges.'],
  ['How a payment is confirmed', 'You pay on Bachs’ secure checkout, then come straight back to TalkingStage, which checks the result with Bachs. Coins are added, or a gift is marked received, only once Bachs confirms the payment. A checkout page or screenshot on its own is not confirmation. If a payment fails or is cancelled, nothing is added and you are not charged.'],
  ['Refunds', `Coins and gifts are not refundable once they have been added or received. If something went wrong, for example you were charged but received no coins, you were charged twice, or a payment error occurred, email ${supportEmail} with the payment reference and we will put it right. If a payment is refunded through Bachs, the coins it added are removed from your balance.`],
  ['Payment records', 'Payment records are kept separately from your chats. Deleting a conversation or your account does not remove the record of a payment, which is kept without your name, email or chats for accounting and to resolve disputes. Card and bank details are handled by Bachs and never seen by TalkingStage.'],
];

export function PaymentOverview() {
  return <div className="payment-overview" aria-label="Payment essentials">
    <div className="payment-recipient"><span className="payment-overview-icon"><Icon name="shield" /></span><p className="payment-kicker">Know what you pay for</p><h2>Coins start chats.<br /><em>Gifts are optional.</em></h2><p>Characters are fictional AI. Payments are received by TalkingStage through Bachs.</p></div>
    <dl className="payment-facts"><div><dt>Coins</dt><dd>₦50 each · at least 10 · 10 free to start</dd></div><div><dt>Currency</dt><dd>Nigerian naira · NGN</dd></div><div><dt>Paid through</dt><dd>Bachs secure checkout</dd></div><div><dt>Refunds</dt><dd>Only for payment errors</dd></div></dl>
  </div>;
}

export function PaymentSectionDetail({ index }: { index: number }) {
  if (index === 1) return <Link className="payment-section-link" href="/coins">Buy coins </Link>;
  if (index === 2) return <Link className="payment-section-link" href="/settings/requests">Manage gift requests </Link>;
  if (index === 4) return <div className="payment-flow"><p className="payment-flow-label">How paying works</p><ol><li><span>01</span><div><strong>Choose</strong><p>Pick a coin amount, or a gift amount in a chat.</p></div></li><li><span>02</span><div><strong>Pay at Bachs</strong><p>Check the amount and recipient, then pay securely.</p></div></li><li><span>03</span><div><strong>Confirmed</strong><p>Back on TalkingStage, the result is checked with Bachs.</p></div></li></ol></div>;
  if (index === 5) return <a className="payment-section-link" href={`mailto:${supportEmail}`}>Email {supportEmail} </a>;
  if (index === 6) return <div className="payment-links"><Link href="/settings/payments">Review gift payments </Link><Link href="/privacy">Read Privacy </Link></div>;
  return null;
}
