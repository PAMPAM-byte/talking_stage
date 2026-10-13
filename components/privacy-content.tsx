import Link from 'next/link';
import { Icon } from './ui/icon';

export const privacySections: [string, string][] = [
  ['About this privacy information', 'TalkingStage is an adult entertainment experience with fictional AI characters. This draft explains the product’s privacy controls and the local frontend preview. It does not establish production privacy or security. The final policy must identify the data controller and explain the live service’s processing practices.'],
  ['Account information and preferences', 'The account flow asks for account details, adult eligibility confirmation, a preferred name, personality preferences, and conversation language. These choices support account access and the experience you select. Use sample information in the local preview; its disposable fixtures do not establish how production account data is stored.'],
  ['Conversations and saved memories', 'Conversation history and saved memories are separate. The planned product keeps conversations private to their owner and authorised operational processes. You can inspect saved memories, turn memory off for a character, and delete individual saved facts. Turning memory off is a separate control from deleting a conversation or clearing previously saved memories.'],
  ['Your conversation and deletion controls', 'You can archive, reset, or delete a conversation and review account deletion in Settings. Resetting or deleting a conversation keeps memories by default, with an explicit option to clear that character’s memories. Payment history remains separate. Real retention periods, backup expiry, and necessary transaction-record exceptions still require policy review.'],
  ['Payments and reports', 'Payment and report records are separate from a conversation. In the local frontend preview, these records are simulated. No money moves and no report reaches a real moderation team. Final handling of live transaction records, report details, authorised access, and retention must be described before public launch.'],
  ['Storage in the local preview', 'Disposable onboarding, synthetic memory, conversation, and simulated payment/report metadata use your browser’s session storage in local mock mode. Custom chat text and report details are replaced by placeholders in stored fixtures. Email addresses and passwords are not saved in that fixture storage. Signing out ends demo access; deleting the demo account clears its disposable fixtures. This description applies to the local preview, not to live account storage.'],
  ['Questions and the final policy', 'The data controller, lawful processing details, service providers, retention schedule, and rights/contact procedures still require review. Visit Support for current guidance. A verified privacy contact and final policy must be supplied before public launch; this draft does not invent an email address, a response deadline, or a retention period.'],
];

export function PrivacyHighlights() {
  return <div className="privacy-highlights" aria-label="Privacy at a glance">
    <div><Icon name="message" /><h2>Understand your data</h2><p>Conversations, saved memories, and other records have separate controls.</p></div>
    <div><Icon name="settings" /><h2>Choose what stays</h2><p>Review memory and conversation options before making a change.</p></div>
    <div><Icon name="shield" /><h2>Know the scope</h2><p>This is draft product information. Live privacy details still need review.</p></div>
  </div>;
}

export function PrivacySectionDetail({ index }: { index: number }) {
  if (index === 2) return <div className="privacy-control-note"><Icon name="info" /><p><strong>A useful distinction</strong>Deleting a conversation and deleting its saved memories are separate choices. Review both when you want to clear a character’s history.</p></div>;
  if (index === 3) return <div className="privacy-actions"><Link href="/settings/memories">Review memory controls <Icon name="arrow" /></Link><Link href="/settings/account">Review account deletion <Icon name="arrow" /></Link></div>;
  if (index === 4) return <Link href="/payment-information" className="privacy-section-link">Read Payment information <Icon name="arrow" /></Link>;
  if (index === 6) return <Link href="/support" className="privacy-section-link">Visit Support <Icon name="arrow" /></Link>;
  return null;
}
