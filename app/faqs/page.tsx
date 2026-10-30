import Link from 'next/link';
import { PublicShell } from '@/components/shells';
import { Icon } from '@/components/ui/icon';

export const metadata = { title: 'Frequently asked questions', description: 'Answers about TalkingStage’s fictional AI personalities, adult access, discovery, conversations, memory, and voluntary payments.' };
const topics = [
  { id: 'getting-started', title: 'Getting started', description: 'The experience and your first introduction.', questions: [
    ['What is TalkingStage?', 'TalkingStage is an AI dating experience for adults, with operator-created fictional personalities and non-explicit text conversations. Character names, stories, settings, and AI-generated photos are fictional.'],
    ['Am I chatting with real people?', 'You are chatting with fictional AI characters. TalkingStage does not match you with real people or arrange real-world dates.'],
    ['Who can use TalkingStage?', 'The experience is for adults aged 18 and older. Complete the adult-access and account steps before entering Discover or starting a conversation.'],
    ['How do I get started?', 'Confirm adult eligibility, create your account, and choose your preferred name, personalities, and conversation language. You can choose English or English with Pidgin.'],
  ], link: '/how-it-works', action: 'Read the getting-started guide' },
  { id: 'discovery-chat', title: 'Discovery & conversations', description: 'From a conversation clue to your next hello.', questions: [
    ['How does Discover work?', 'Discover shows one fictional character at a time. Swipe left or use Pass to keep exploring. Swipe right or use Meet to open a conversation. Filters and Undo help you browse.'],
    ['What happens when I tap Meet?', 'Meet starts or resumes the conversation with that character directly. Opening a profile is a separate choice when you want more information.'],
    ['Do I need a mutual match?', 'There is no mutual human matching step. These are fictional AI characters, and Meet takes you into your conversation.'],
    ['Can I return to an existing conversation?', 'Return through Messages to continue an existing thread. You can also use conversation controls to archive, reset, or delete it.'],
  ], link: '/personalities', action: 'Explore the personalities' },
  { id: 'privacy-controls', title: 'Privacy & your controls', description: 'Understand memories, boundaries, and reporting.', questions: [
    ['Can I choose what a character remembers?', 'Review saved memories in Settings, turn memory off for a character, or delete saved facts. Conversation history and saved memories are separate.'],
    ['Does deleting a conversation clear its memories?', 'Memories are kept by default when resetting or deleting a conversation. Use the explicit option to clear that character’s memories, or review them separately in Settings.'],
    ['What if a message or photo concerns me?', 'Use Report on the message, photo, or character profile. The launch experience is non-explicit. Local preview reports demonstrate the flow and do not reach a real moderation team.'],
    ['Where can I read about data and deletion?', 'Privacy explains the existing controls, local preview storage, and unresolved policy details. Delete your account in Settings: it is paused for 30 days, so you can sign in and restore it, then erased. Final live retention periods and privacy contact procedures still require review.'],
  ], link: '/privacy', action: 'Read Privacy' },
  { id: 'payments-help', title: 'Payments & help', description: 'Optional support, payment status, and guidance.', questions: [
    ['Are payments required?', 'Any supported payment is voluntary support for TalkingStage’s operator. You can decline, ignore, or disable monetary requests. A payment does not buy an item or guarantee a romantic response.'],
    ['Who receives a payment?', 'TalkingStage’s operator receives it. The character is fictional and has no bank account. Final merchant and checkout details must be supplied before public launch.'],
    ['Does returning from checkout confirm a payment?', 'Only a verified payment result confirms success. A checkout redirect or screenshot alone is not confirmation. Local preview payment outcomes are simulated and no money moves.'],
    ['How can I get help with my account?', 'Support links to account recovery and other existing controls. A verified production support channel, response expectations, and escalation guidance are still pending. The Support page does not submit a support request.'],
  ], link: '/payment-information', action: 'Read Payment Information' },
];
export default function FAQs() {
  return <PublicShell actions={<Link className="button button--quiet" href="/sign-in">Sign in</Link>} footer={<div className="information-footer"><p className="caption muted">TalkingStage · Fictional AI personalities · Adults 18+</p><nav className="row" aria-label="Information pages"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/payment-information">Payments</Link><Link href="/support">Support</Link></nav></div>}>
    <div className="faq-page"><header className="policy-hero"><p className="policy-eyebrow">A little clarity, before your first hello</p><h1>Frequently asked questions</h1><p className="policy-tagline">Good questions. Clear answers.</p><p className="policy-introduction">Get to know the experience, understand your choices, and find the guidance you need. Choose a topic to start.</p></header>
      <nav className="faq-topic-nav" aria-label="FAQ topics">{topics.map(topic => <a key={topic.id} href={`#${topic.id}`}>{topic.title}</a>)}</nav>
      <div className="faq-document">{topics.map(topic => <section id={topic.id} key={topic.id} className="faq-topic" tabIndex={-1} aria-labelledby={`${topic.id}-title`}><div className="faq-topic-heading"><h2 id={`${topic.id}-title`}>{topic.title}</h2><p>{topic.description}</p><Link href={topic.link}>{topic.action} </Link></div><div className="tsl-faqList">{topic.questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>)}</div>
      <section className="faq-help" aria-labelledby="faq-help-title"><Icon name="message" /><div><p className="policy-eyebrow">Looking for more guidance?</p><h2 id="faq-help-title">Find your next step.</h2><p>Explore practical help for account access, conversations, payments, and reporting. Current guidance and support availability are explained on Support.</p><Link className="button button--primary" href="/support">Explore Support </Link></div></section><p className="faq-scope">Product guidance includes provisional launch policies and labelled local preview behavior. Final operator, privacy, payment, and support details remain under review.</p>
    </div>
  </PublicShell>;
}
