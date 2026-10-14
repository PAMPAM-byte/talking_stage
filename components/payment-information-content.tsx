import Link from 'next/link';
import { Icon } from './ui/icon';

export const paymentInformationSections: [string, string][] = [
  ['Who receives your payment', 'A voluntary payment supports TalkingStage’s operator and is associated with a fictional character. The character is not a real person, has no bank account, and does not receive the money. The final merchant identity and checkout details must be disclosed before public launch.'],
  ['Your choice, every time', 'You can decline, ignore, or disable monetary requests. A payment does not buy an item, guarantee a romantic response, or change a character’s boundaries. The launch experience remains non-explicit. No recurring payment or saved-card charging is assumed by this draft.'],
  ['Reviewing an amount and checkout', 'The planned payment flow lets you review an explicit amount in Nigerian naira (NGN), the operator recipient, and the fictional character association before continuing to checkout. The payment gateway and amount limits still require final selection. No real payment can be made in the local frontend preview.'],
  ['Understanding payment status', 'Only a verified gateway result confirms a successful payment. A checkout redirect or payment screenshot alone is not confirmation. Pending, unsuccessful, and cancelled outcomes should remain distinguishable from success. The local preview demonstrates simulated outcomes without moving money.'],
  ['Payment history and records', 'Payment records are separate from conversation history. Resetting or deleting a conversation does not remove payment history. Production payment-record retention, necessary transaction exceptions, and backup expiry still require policy review. Read Privacy for the current product information.'],
  ['Refunds, disputes, and questions', 'The refund and dispute process, support contact, and response expectations still require completion. This draft does not promise a refund, define a refund deadline, or supply an unverified contact. Visit Support for current guidance and retain the relevant payment reference when seeking help with a payment.'],
  ['Availability and final payment policies', 'Payment availability depends on the final service configuration. The gateway, minimum and maximum amounts, request cooldowns, merchant details, refund/dispute process, and payment-record retention policy remain pending. This page is draft product information and does not activate checkout or establish a final payment policy.'],
];

export function PaymentOverview() {
  return <div className="payment-overview" aria-label="Payment essentials">
    <div className="payment-recipient"><span className="payment-overview-icon"><Icon name="shield" /></span><p className="payment-kicker">Know who you support</p><h2>The operator receives it.<br /><em>The choice is yours.</em></h2><p>Characters are fictional. Every supported payment is voluntary support for TalkingStage’s operator.</p></div>
    <dl className="payment-facts"><div><dt>Recipient</dt><dd>TalkingStage’s operator</dd></div><div><dt>Currency</dt><dd>Nigerian naira · NGN</dd></div><div><dt>Your control</dt><dd>Decline, ignore, or turn requests off</dd></div><div><dt>Local preview</dt><dd>Simulated payments only</dd></div></dl>
  </div>;
}

export function PaymentSectionDetail({ index }: { index: number }) {
  if (index === 1) return <Link className="payment-section-link" href="/settings/requests">Manage monetary requests </Link>;
  if (index === 2) return <div className="payment-flow"><p className="payment-flow-label">The planned checkout journey</p><ol><li><span>01</span><div><strong>Review the details</strong><p>Check the amount, NGN currency, and operator recipient.</p></div></li><li><span>02</span><div><strong>Choose to continue</strong><p>Proceed to checkout only after your confirmation.</p></div></li><li><span>03</span><div><strong>Check the result</strong><p>Wait for a verified result before treating the payment as complete.</p></div></li></ol></div>;
  if (index === 3) return <div className="payment-status-note"><Icon name="info" /><p><strong>A return to the app is not confirmation.</strong>Check the recorded status. Pending, cancelled, or unsuccessful payments should never appear as confirmed support.</p></div>;
  if (index === 4) return <div className="payment-links"><Link href="/settings/payments">Review payment history </Link><Link href="/privacy">Read Privacy </Link></div>;
  if (index === 5) return <Link className="payment-section-link" href="/support">Visit Support </Link>;
  return null;
}
