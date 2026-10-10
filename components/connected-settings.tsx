import Link from 'next/link';
import { currentAccount } from '@/lib/backend/server';
import { Icon, type IconName } from './ui/icon';

export async function ConnectedSettings() {
  const account = await currentAccount();
  if (!account) return null;
  const items: { title: string; description: string; href: string; icon: IconName; detail: string }[] = [
    { title: 'Preferences', description: 'Your name, who you want to meet and your conversation language.', href: '/settings/preferences', icon: 'people', detail: `${(account.profile.genders as string[]).map(g => g === 'woman' ? 'Women' : 'Men').join(' & ')} · ${account.profile.language === 'english_pidgin' ? 'English with Pidgin' : 'English'}` },
    { title: 'Saved memories', description: 'Choose what each character remembers, or remove a saved detail.', href: '/settings/memories', icon: 'message', detail: 'Managed separately for each character' },
    { title: 'Monetary requests', description: 'Set your overall preference and manage requests in each conversation.', href: '/settings/requests', icon: 'shield', detail: account.profile.requests_enabled ? 'Requests allowed' : 'Requests turned off' },
  ];
  return <section className="space-page stack settings-home">
    <header className="stack"><p className="supporting muted">Your space, {account.profile.display_name}.</p><h1 className="display page-title">Settings</h1><p className="muted">Make TalkingStage feel comfortable for you.</p></header>
    <nav className="settings-controls" aria-label="Personal settings">{items.map(item => <Link className="setting-link" href={item.href} key={item.href}><span className="setting-link__icon"><Icon name={item.icon} /></span><div><h2>{item.title}</h2><p className="supporting muted">{item.description}</p><span className="settings-detail">{item.detail}</span></div><Icon name="arrow" /></Link>)}</nav>
    <aside className="settings-help"><Icon name="info" /><div><h2>Your choices stay in your hands</h2><p className="supporting muted">Saving memories and giving are optional. You can change your preferences at any time.</p><div className="row"><Link href="/privacy">Privacy information</Link><Link href="/support">Help & support</Link></div></div></aside>
  </section>;
}
