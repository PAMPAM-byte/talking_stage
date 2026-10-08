import Link from "next/link";
import { Brand } from "@/components/shells";
import { Icon } from "@/components/ui/icon";
import { LandingPortrait } from "@/components/landing-portrait";

export default function Home() {
  return <div>
    <header className="container landing-header"><Brand /><nav aria-label="Welcome navigation"><Link className="button button--quiet" href="/sign-in">Sign in</Link><Link className="button button--secondary header-entry" href="/onboarding/age">Get started</Link></nav></header>
    <main id="main-content">
      <section className="container landing-hero" aria-labelledby="landing-title"><div><span className="badge">Nigerian flavour. Fictional connections.</span><h1 id="landing-title" className="display">Your kind of <em>banter.</em></h1><p className="landing-copy">A little curiosity. A little chemistry. Meet fictional AI personalities with their own style, stories, and sense of humour.</p><div className="row landing-cta"><Link href="/onboarding/age" className="button button--primary">Find your conversation <Icon name="arrow" /></Link></div><p className="landing-disclosure supporting muted">For adults 18+ · AI dating, clearly fictional</p></div><LandingPortrait /></section>
      <section className="container landing-section" aria-labelledby="experience-title"><h2 id="experience-title" className="display page-title">More personality. Less small talk.</h2><div className="landing-benefits"><div className="landing-benefit"><Icon name="people" /><h3>Find a personality you like</h3><p>Welcoming, cheeky, thoughtful, or a little reserved. Choose who catches your curiosity.</p></div><div className="landing-benefit"><Icon name="message" /><h3>Let the conversation unfold</h3><p>Start with your introduction, enjoy the banter, and come back to a familiar conversation.</p></div><div className="landing-benefit"><Icon name="shield" /><h3>Keep your choices yours</h3><p>Control saved memories, report concerns, and turn monetary requests off whenever you like.</p></div></div></section>
      <section className="container landing-section landing-bottom"><div><h2 className="display page-title">Shoot your shot.<br />See where the conversation goes.</h2><p className="muted">No real-world matching. No pressure to pay.</p></div><Link href="/onboarding/age" className="button button--primary">Get started <Icon name="arrow" /></Link></section>
    </main>
    <footer className="container landing-footer supporting"><p className="muted">TalkingStage · Fictional AI characters for adults.</p><nav className="row" aria-label="Footer"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/payment-information">Payments</Link><Link href="/support">Support</Link>{process.env.NODE_ENV === "development" && <Link href="/dev/design-system">Design system</Link>}</nav><p className="caption muted" style={{ width: "100%" }}>Frontend preview. Registration, age assurance, and payments are not connected to live services.</p></footer>
  </div>;
}
