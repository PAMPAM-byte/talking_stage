import Link from 'next/link';
import { Icon } from './ui/icon';
import { supportEmail } from '@/lib/support';

// Live policy text (15 Nov 2026): describes what the live service actually does. Founder
// decision: the operator is named "TalkingStage" until a registered business name is supplied.
export const privacySections: [string, string][] = [
  ['Who we are', `TalkingStage (talkingstage.buzz) is an adults-only (18+) entertainment service where you chat with fictional AI characters. TalkingStage decides how your information is used for the service. For any privacy question or request, email ${supportEmail}.`],
  ['What we collect', 'Your email address and password (stored securely by our sign-in provider, never readable by us), or your Google account email if you sign in with Google; your confirmation that you are 18 or over; your preferred name, who you want to meet and your conversation language; your conversations, saved memories, likes, coin balance and coin history; records of payments (amount, status, date and reference); reports you send; notification settings for your devices; and basic technical information needed to keep the service secure and working.'],
  ['Conversations and saved memories', 'Your conversations are private to you. They are seen only by automated systems that run the service and, when necessary, by the TalkingStage team to investigate a report, keep people safe or fix a problem. While replying, a character may note short facts you share about yourself, such as your name, city, job or interests, so it remembers them later. It never notes phone numbers, emails, addresses, bank details or passwords. You can see every saved memory, turn memory off for a character and delete individual facts.'],
  ['How we use your information', 'To create and secure your account, show you characters, run your conversations and generate characters’ replies, remember what you chose to keep, show who liked you back and send the notifications you turned on, process coin purchases and gifts, handle reports and support requests, prevent abuse and keep the service within its limits.'],
  ['Who helps us run TalkingStage', 'We use trusted providers who process information only to run the service for us: Supabase (accounts and database), Vercel (hosting), Anthropic (AI that writes characters’ replies from the conversation so far), Bachs (payments, including card and bank details, which TalkingStage never sees), Cloudflare (a check that sign-ups come from people), Google (if you choose Google sign-in) and your browser’s push service (if you turn notifications on). We do not sell your information.'],
  ['Your controls and deleting your account', 'You can archive, reset or delete a conversation, clear a character’s memories and turn notifications off at any time. You can delete your account in Settings › Account: it is frozen straight away, can be restored for 30 days, and is then erased, including your profile, conversations, memories, likes and coins. A record of each payment is kept without your name, email or chats, because payment records must be kept for accounting and to resolve disputes.'],
  ['How long we keep information', 'We keep your information while your account is open. After you delete your account, it is erased at the end of the 30-day restore period. Payment records are kept, without your name, email or chats, for as long as accounting and legal obligations require. Copies in our providers’ routine backups expire on their own schedules.'],
  ['Your rights and contacting us', `You can ask to see, correct or delete your information, or object to how it is used, by emailing ${supportEmail} from the address you signed up with. We may need to confirm it is you before acting. If you are not satisfied with our answer, you can complain to the Nigeria Data Protection Commission.`],
];

export function PrivacyHighlights() {
  return <div className="privacy-highlights" aria-label="Privacy at a glance">
    <div><Icon name="message" /><h2>Private conversations</h2><p>Your chats are yours. Saved memories have their own controls.</p></div>
    <div><Icon name="settings" /><h2>You choose what stays</h2><p>Delete chats, memories or your whole account whenever you like.</p></div>
    <div><Icon name="shield" /><h2>Never sold</h2><p>Providers only process information to run TalkingStage for us.</p></div>
  </div>;
}

export function PrivacySectionDetail({ index }: { index: number }) {
  if (index === 2) return <div className="privacy-control-note"><Icon name="info" /><p><strong>A useful distinction</strong>Deleting a conversation and deleting its saved memories are separate choices. Review both when you want to clear a character’s history.</p></div>;
  if (index === 5) return <div className="privacy-actions"><Link href="/settings/memories">Review memory controls </Link><Link href="/settings/account">Review account deletion </Link></div>;
  if (index === 4) return <Link href="/payment-information" className="privacy-section-link">Read Payment information </Link>;
  if (index === 7) return <a href={`mailto:${supportEmail}`} className="privacy-section-link">Email {supportEmail} </a>;
  return null;
}
