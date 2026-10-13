import Link from 'next/link';
import { Brand } from '@/components/shells';
import { Icon } from '@/components/ui/icon';
import { LandingPhoto } from '@/components/landing-photo';
import { LandingMotion } from '@/components/landing-motion';
import cast from '@/lib/mock/public-cast.json';
import { usesSupabase } from '@/lib/backend/config';
import styles from '@/components/landing-styles';

export const metadata = {
  title: { absolute: 'TalkingStage — A little banter. A little chemistry.' },
  description: 'Meet fictional adult AI personalities with Nigerian flavour. Discover your kind of banter, start a conversation, and take it at your own pace.',
};
const introductions = ['char-amara', 'char-idris', 'char-zuri', 'char-kunle'].map(id => cast.find(character => character.id === id)!);
const steps = [
  { title: 'Make a little space for you.', text: 'Create your account, confirm you’re 18 or older, and choose the personalities and conversation language you prefer.', icon: 'people' as const },
  { title: 'Find your kind of personality.', text: 'Discover one character at a time. Read what makes them tick, pass, or tap Meet when someone catches your curiosity.', icon: 'discover' as const },
  { title: 'Say hello. See where it goes.', text: 'Meet takes you straight into your conversation. Start with an introduction, enjoy the banter, and return when you feel like it.', icon: 'message' as const },
];
const questions = [
  { question: 'Am I talking to real people?', answer: 'You’re talking to fictional adult AI characters. Their names, biographies, locations, and AI-generated photos are part of their fictional identities. TalkingStage does not match you with real people or arrange real-world dates.' },
  { question: 'Who is TalkingStage for?', answer: 'TalkingStage is for adults aged 18 and older who want to explore a fictional AI dating experience. You must complete the adult-access and account steps before entering discovery or chat.' },
  { question: 'What happens when I tap Meet?', answer: 'Meet opens your conversation with that character. If you’ve spoken before, you return to the existing conversation. You can also open their profile separately to learn more before you begin.' },
  { question: 'Can I choose what a character remembers?', answer: 'You can manage memory for each character in Settings, turn it off, and delete saved facts. Resetting or deleting a conversation has separate options for clearing its saved memories.' },
  { question: 'Do I have to send money?', answer: 'No. Any supported payment is voluntary and goes to TalkingStage’s operator, not a real person represented by a character. You can turn monetary requests off in Settings. See Payment information for details and availability.' },
  { question: 'What kind of conversations are allowed?', answer: 'The launch experience is non-explicit. You can report a character, message, or photo, and use conversation controls to archive, reset, or delete a thread. Visit Support if you need help.' },
];
function EntryLink({ children = 'Get started', light = false }: { children?: React.ReactNode; light?: boolean }) {
  return <Link href="/onboarding/age" className={`${styles.cta} ${light ? styles.ctaLight : ''}`}>{children}<Icon name="arrow" /></Link>;
}

export default function Home() {
  return <div className={styles.site}>
    <LandingMotion />
    <header className={`${styles.container} ${styles.header}`}>
      <Brand />
      <nav className={styles.desktopNav} aria-label="About TalkingStage"><Link href="/how-it-works">How it works</Link><Link href="/personalities">The personalities</Link><a href="#your-control">Your experience</a><Link href="/faqs">FAQs</Link></nav>
      <div className={styles.headerActions}><Link href="/sign-in" className={styles.signIn}>Sign in</Link><Link href="/onboarding/age" className={styles.headerCta}>Get started <Icon name="arrow" /></Link></div>
    </header>
    <main id="main-content">
      <section className={`${styles.container} ${styles.hero}`} aria-labelledby="landing-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span aria-hidden="true" className={styles.tinyHeart}>♥</span> AI dating. Nigerian personality.</p>
          <h1 id="landing-title">A little banter.<br />A little <em>chemistry.</em></h1>
          <p className={styles.lead}>Some conversations just have a certain something. Meet fictional AI personalities with their own stories, their own style, and a little spark.</p>
          <div className={styles.heroActions}><EntryLink>Find your conversation</EntryLink><a href="#how-it-works" className={styles.textLink}>See how it works <Icon name="arrow" /></a></div>
          <p className={styles.heroNote}>For adults 18+ <span aria-hidden="true">·</span> Fictional characters. Real curiosity.</p>
        </div>
        <div className={styles.heroVisual} aria-label="Meet two of our fictional AI personalities">
          <figure className={`${styles.heroPortrait} ${styles.portraitOne}`}><LandingPhoto src="/images/characters/char-zuri-gallery-v2.webp" alt="Zuri, a fictional adult AI character, enjoying coconut water at the beach." name="Zuri" sizes="(min-width: 700px) 254px, (min-width: 468px) 194px, calc((100vw - 80px) / 2)" eager /><figcaption><span>Zuri, 29</span><small>Bold. Witty. A little unexpected.</small></figcaption></figure>
          <figure className={`${styles.heroPortrait} ${styles.portraitTwo}`}><LandingPhoto src="/images/characters/char-kunle-portrait.webp" alt="Kunle, a fictional adult AI character, wearing glasses and a navy shirt." name="Kunle" sizes="(min-width: 700px) 254px, (min-width: 468px) 194px, calc((100vw - 80px) / 2)" eager /><figcaption><span>Kunle, 35</span><small>Grounded, with a curious side.</small></figcaption></figure>
          <div className={styles.sparkSeal} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 21S2 15 2 8.5a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3C22 15 12 21 12 21Z" /></svg></div>
          <div className={styles.heroClue}><span className={styles.quoteMark} aria-hidden="true">“</span><div><p>A good outfit gets attention.<br />What keeps yours?</p><span>Zuri’s conversation clue</span></div></div>
          <p className={styles.photoDisclosure}>Fictional adult characters · AI-generated photography</p>
        </div>
      </section>
      <div className={`${styles.container} ${styles.assurances}`} aria-label="About this experience"><span><Icon name="people" />Fictional AI personalities</span><span><Icon name="message" />Private conversations</span><span><Icon name="shield" />Your pace. Your choices.</span></div>

      <section id="how-it-works" className={`${styles.container} ${styles.section}`} aria-labelledby="how-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>Your first hello</p><h2 id="how-title">Good chemistry starts<br />with a little <em>curiosity.</em></h2><p>From “who’s that?” to “tell me more.”<br />Here’s how your talking stage begins.</p></div>
        <ol className={styles.steps}>{steps.map((step, index) => <li key={step.title}><div className={styles.stepTop}><span className={styles.stepNumber}>0{index + 1}</span><Icon name={step.icon} /></div><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
        <Link href="/how-it-works" className={`${styles.textLink} how-full-guide`}>Read the full guide <Icon name="arrow" /></Link>
      </section>

      <section id="personalities" className={styles.blushSection} aria-labelledby="personalities-title"><div className={`${styles.container} ${styles.section}`}>
        <div className={styles.splitHeading}><div><p className={styles.eyebrow}>A few introductions</p><h2 id="personalities-title">Who’s your kind<br />of <em>interesting?</em></h2></div><div><p>The music lover. The quiet thinker. The one with an answer for everything. Different personalities, different ways to find a spark.</p><Link href="/personalities" className={styles.textLink}>Explore the personalities <Icon name="arrow" /></Link></div></div>
        <div className={styles.personalityGrid}>{introductions.map(character => <article className={styles.personality} key={character.id}><div className={styles.personalityPhoto}><LandingPhoto src={`/images/characters/${character.portraitAssetId}.webp`} alt={`${character.name}, ${character.age}, a fictional adult AI character.`} name={character.name} sizes="(min-width: 1200px) 262px, (min-width: 700px) calc((100vw - 152px) / 4), calc((100vw - 64px) / 2)" /><span className={styles.aiLabel}>AI character</span></div><div className={styles.personalityBody}><h3>{character.name}<span>, {character.age}</span></h3><p className={styles.personalityTraits}>{character.personalityTags.slice(0, 2).join(' · ')}</p><p className={styles.personalityClue}>“{character.conversationClue}”</p></div></article>)}</div>
        <p className={styles.sectionNote}>A preview of fictional adult personalities. Photos are AI-generated.</p>
      </div></section>

      <section className={`${styles.container} ${styles.featureSection} ${styles.section}`} aria-labelledby="conversation-title">
        <div className={styles.conversationVisual}>
          <div className={styles.chatPreview}><div className={styles.chatHeader}><div className={styles.chatAvatar}><LandingPhoto src="/images/characters/char-amara-portrait.webp" name="Amara" sizes="42px" alt="Amara, fictional AI character." /></div><div><strong>Amara</strong><span>Fictional AI character</span></div><Icon name="message" /></div><div className={styles.chatMessages}><span className={styles.chatLabel}>An illustrative conversation</span><p className={styles.incoming}>Good music is a very good opening line.</p><p className={styles.outgoing}>Then let’s start with your favourite song.</p><div className={styles.chatClue}><Icon name="message" /><span>A little personality goes a long way.</span></div></div><div className={styles.chatComposer} aria-hidden="true"><span>Your next hello starts here</span><Icon name="arrow" /></div></div>
          <div className={styles.conversationCaption}>Less rehearsing the perfect opening.<br /><em>More seeing where it goes.</em></div>
        </div>
        <div className={styles.featureCopy}><p className={styles.eyebrow}>Stay for the conversation</p><h2 id="conversation-title">The spark is just<br />the <em>start.</em></h2><p>A cheeky introduction. A thoughtful question. A shared interest that turns into your next favourite topic. Make room for a conversation with its own rhythm.</p><div className={styles.featureList}><div><Icon name="message" /><div><h3>A familiar thread to come back to</h3><p>Pick up your existing conversation when you return.</p></div></div><div><Icon name="people" /><div><h3>A little Nigerian flavour</h3><p>Explore distinct personalities and choose English or English with Pidgin.</p></div></div><div><Icon name="settings" /><div><h3>Memory, on your terms</h3><p>Choose what stays, turn memory off, or clear saved facts.</p></div></div></div><EntryLink>Start your talking stage</EntryLink></div>
      </section>

      <section id="your-control" className={styles.controlSection} aria-labelledby="control-title"><div className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>A space that respects your choices</p><h2 id="control-title">Your talking stage.<br /><em>Your terms.</em></h2><p>Know who you’re talking to, choose what you share,<br />and keep control of your experience.</p></div>
        <div className={styles.controls}><article><Icon name="info" /><h3>Clearly fictional</h3><p>Every character is AI. Every biography and location is fictional. That stays clear from the first introduction.</p></article><article><Icon name="settings" /><h3>You’re in control</h3><p>Manage memories, archive a conversation, reset a thread, or delete it. The choices stay with you.</p></article><article><Icon name="shield" /><h3>Boundaries matter</h3><p>An adults-only, non-explicit experience, with reporting tools for characters, messages, and photos.</p></article><article><Icon name="payment" /><h3>No pressure to pay</h3><p>Payments, where available, are voluntary and go to the operator. You can switch monetary requests off.</p></article></div>
        <Link href="/support" className={styles.textLink}>Learn about support <Icon name="arrow" /></Link>
      </div></section>

      <section id="questions" className={`${styles.container} ${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title"><div className={styles.faqIntro}><p className={styles.eyebrow}>Before you say hello</p><h2 id="faq-title">A little more<br />to <em>know.</em></h2><p>Curious about the details?<br />Start here.</p><Link href="/support" className={styles.textLink}>Get in touch <Icon name="arrow" /></Link></div><div className={styles.faqList}>{questions.map(item => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}{item.question === 'Do I have to send money?' && <> <Link href="/payment-information">Read payment information.</Link></>}</p></details>)}</div><Link href="/faqs" className="faq-full-guide">Browse all FAQs <Icon name="arrow" /></Link></section>

      <section className={`${styles.container} ${styles.finalSection}`} aria-labelledby="final-title"><div className={styles.finalCard}><span className={styles.finalHeart} aria-hidden="true">♡</span><p className={styles.eyebrow}>There’s a conversation waiting to begin.</p><h2 id="final-title">Shoot your shot.<br /><em>Start with hello.</em></h2><p>A little curiosity could be the start of your kind of banter.</p><EntryLink light>Start with hello</EntryLink><span className={styles.finalNote}>18+ · Fictional AI dating · At your own pace</span></div></section>
    </main>
    <footer className={`${styles.container} ${styles.footer}`}><div className={styles.footerTop}><div className={styles.footerBrand}><Brand /><p>A little banter. A little chemistry.<br />A fictional AI dating experience<br />with Nigerian personality.</p></div><nav aria-label="Explore TalkingStage"><h3>Explore</h3><Link href="/how-it-works">How it works</Link><Link href="/personalities">The personalities</Link><Link href="/faqs">FAQs</Link><Link href="/sign-in">Sign in</Link></nav><nav aria-label="Help and information"><h3>Here to help</h3><Link href="/support">Support</Link><Link href="/payment-information">Payment information</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav></div><div className={styles.footerBottom}><p>© 2026 TalkingStage.</p><p>For adults 18+. All characters and their photos are fictional and AI-generated.</p></div>{!usesSupabase() && <p className={styles.previewNote}>Local frontend preview. Account and conversation actions use clearly labelled demo data; payments are simulated.</p>}</footer>
  </div>;
}
