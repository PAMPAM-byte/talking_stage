// schema.org descriptions that search engines and AI assistants read to explain the site.
export const siteUrl = 'https://www.talkingstage.buzz';
export const siteSummary = 'TalkingStage (talkingstage.buzz) is a Nigerian AI dating and chat app for adults. You chat with fictional AI characters who text like real Naija people, in English or English with Pidgin. Free to chat, 18+.';
export function StructuredData({ data }: { data: object }) {
  // JSON-LD is data, not script code; escaping "<" keeps it inert inside the tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }} />;
}
export const siteGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'TalkingStage', url: siteUrl, logo: `${siteUrl}/icons/icon-512.png`, email: 'support@talkingstage.buzz', contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'support@talkingstage.buzz', availableLanguage: ['English'] } },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: 'TalkingStage', alternateName: 'talkingstage.buzz', url: siteUrl, description: siteSummary, inLanguage: 'en-NG', publisher: { '@id': `${siteUrl}/#organization` } },
    { '@type': 'WebApplication', name: 'TalkingStage', url: siteUrl, description: siteSummary, applicationCategory: 'LifestyleApplication', operatingSystem: 'Web, Android, iOS', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' }, audience: { '@type': 'PeopleAudience', suggestedMinAge: 18 }, image: `${siteUrl}/opengraph-image.jpg?v=2`, publisher: { '@id': `${siteUrl}/#organization` } },
  ],
};
