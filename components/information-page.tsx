import Link from "next/link";
import { PublicShell } from "./shells";
import { Icon } from "./ui/icon";
import { privacySections, PrivacyHighlights, PrivacySectionDetail } from './privacy-content';
import { paymentInformationSections, PaymentOverview, PaymentSectionDetail } from './payment-information-content';
import { supportEmail } from '@/lib/support';
export type InformationKind = "terms" | "privacy" | "payment-information" | "support";

// Live policy pages (15 Nov 2026): the preview-era "Draft for product review" notice and draft
// statements were removed after a visitor reported them. The text describes the live service.
// Founder decisions: operator named "TalkingStage"; no refunds except payment errors.
const updated = '15 November 2026';
const content: Record<InformationKind, { title: string; introduction: string; sections: [string, string][] }> = {
  terms: { title: "A clear understanding.", introduction: "TalkingStage is an entertainment service with fictional AI characters for adults aged 18 and over. By creating an account or using TalkingStage, you agree to these terms.", sections: [] },
  privacy: { title: "Your conversations. Your choices.", introduction: "What we collect, why, who helps us run the service, and how you stay in control of your information.", sections: [] },
  "payment-information": { title: "Clear prices. No surprises.", introduction: "How coins and optional gifts work, who receives your money, how payments are confirmed and when refunds apply.", sections: [] },
  support: { title: "Help should be easy to find.", introduction: `Email ${supportEmail} for help with your account, chats, coins or payments.`, sections: [] },
};
const termsSections: [string, string][] = [
  ['Who can use TalkingStage', 'You must be 18 or older to use TalkingStage. You confirm this when you sign up, and we may close accounts that appear to belong to someone younger. One account per person; keep your password private and tell us if you think someone else has used your account.'],
  ['Fictional AI characters', 'Every character is fictional and their replies, photos and personalities are created with AI. They are not real people, do not receive money and cannot meet you. AI replies can be inaccurate or unexpected, so don’t rely on them for advice. Conversations stay non-explicit.'],
  ['Likes, matches and starting a chat', 'You can like characters in Discover. Each character decides whether to like you back, and you see who did in Likes. A character who doesn’t like you back is not announced. You can start a conversation with a character who liked you back.'],
  ['Coins', 'Everyone gets 10 free coins. Starting a conversation uses 1 coin; carrying on a conversation, reopening it, or chatting with a character you already talked to is free. You can buy more coins at ₦50 each, at least 10 at a time. Coins have no cash value, can’t be transferred or exchanged for money, and are removed if your account is deleted.'],
  ['Gifts and payments', 'Gifts are optional and never change how a character treats you. All payments are received by TalkingStage through Bachs. Coins and gifts are not refundable once added or received, except when a payment error occurred, such as being charged without receiving coins or being charged twice. Read Payment information for the details.'],
  ['Acceptable use', 'Don’t use TalkingStage to harass anyone, share illegal content, try to get characters to produce sexual or harmful content, share other people’s personal information, or interfere with the service, for example by automating it or probing its security. Use Report on any message, photo or character that concerns you.'],
  ['Memory and your choices', 'Characters may remember short facts you share so conversations feel continuous. You can review, turn off and delete saved memories at any time. Read Privacy for how your information is handled.'],
  ['Suspension and deleting your account', 'We may limit or close an account that breaks these terms or puts others at risk. You can delete your account at any time in Settings › Account; it can be restored for 30 days, then it is erased.'],
  ['Changes and contact', `TalkingStage may change features, prices or these terms. If a change matters, we will update this page and, where appropriate, tell you in the app. Questions: ${supportEmail}.`],
];
export function InformationPage({ kind }: { kind: InformationKind }) {
  const page = content[kind];
  const labels: Record<InformationKind, string> = { terms: 'Terms of service', privacy: 'Privacy & your data', 'payment-information': 'Payment information', support: 'Help & support' };
  const sections: [string, string][] = kind === 'terms' ? termsSections : kind === 'privacy' ? privacySections : kind === 'payment-information' ? paymentInformationSections : page.sections;
  return <PublicShell actions={<div className="row"><Link href="/sign-in" className="button button--quiet">Sign in</Link><Link href="/onboarding/age" className="button button--primary information-entry">Get started </Link></div>} footer={<div className="information-footer"><p className="caption muted">TalkingStage · Fictional AI personalities · Adults 18+</p><nav className="row supporting" aria-label="Information pages">{(Object.keys(labels) as InformationKind[]).map(key => <Link key={key} href={`/${key}`} aria-current={key === kind ? 'page' : undefined}>{key === 'privacy' ? 'Privacy' : key === 'terms' ? 'Terms' : key === 'support' ? 'Support' : 'Payments'}</Link>)}</nav></div>}>
    <article className={`policy-page${kind === 'privacy' ? ' policy-page--privacy' : kind === 'payment-information' ? ' policy-page--payments' : ''}`}>
      <Link href="/" className="policy-back"><Icon name="arrow" />Back to home</Link>
      <header className="policy-hero"><p className="policy-eyebrow">TalkingStage · {kind === 'support' ? 'Here to help' : 'Clear information'}</p><h1>{labels[kind]}</h1><p className="policy-tagline">{page.title}</p><p className="policy-introduction">{page.introduction}</p><div className="policy-meta"><span>Last updated {updated}</span><span>For adults 18+</span></div></header>
      {kind === 'privacy' ? <PrivacyHighlights /> : kind === 'payment-information' ? <PaymentOverview /> : <div className="policy-overview"><Icon name={kind === 'support' ? 'message' : 'shield'} /><div><h2>{kind === 'terms' ? 'The essentials, before you begin' : 'Know where you stand'}</h2><p>{kind === 'terms' ? 'Adults 18+. Fictional AI characters. Non-explicit conversations. Coins start chats; gifts are optional. You control your memories and your account.' : page.introduction}</p></div></div>}
      <div className="policy-layout"><aside className="policy-sidebar"><nav aria-label="On this page"><p>On this page</p><ol>{sections.map(([heading], index) => <li key={heading}><a href={`#${kind}-section-${index + 1}`}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{heading}</a></li>)}</ol></nav><div className="policy-help"><h3>Need a little guidance?</h3><p>Explore the information that matters to you.</p><Link href={kind === 'support' ? '/payment-information' : '/support'}>{kind === 'support' ? 'Payment information' : 'Visit Support'} </Link></div></aside>
        <div className="policy-content">{sections.map(([heading, body], index) => <section id={`${kind}-section-${index + 1}`} key={heading} aria-labelledby={`${kind}-heading-${index + 1}`} tabIndex={-1}><p className="policy-section-number">{String(index + 1).padStart(2, '0')}</p><h2 id={`${kind}-heading-${index + 1}`}>{heading}</h2><p>{body}</p>{kind === 'privacy' && <PrivacySectionDetail index={index} />}{kind === 'payment-information' && <PaymentSectionDetail index={index} />}{kind === 'terms' && heading === 'Memory and your choices' && <Link href="/privacy">Read Privacy </Link>}{kind === 'terms' && heading === 'Gifts and payments' && <Link href="/payment-information">Read Payment information </Link>}</section>)}<div className="policy-related"><h2>Keep exploring</h2><nav aria-label="Related information">{(Object.keys(labels) as InformationKind[]).filter(key => key !== kind).map(key => <Link key={key} href={`/${key}`}>{labels[key]} </Link>)}</nav></div></div>
      </div>
    </article>
  </PublicShell>;
}
