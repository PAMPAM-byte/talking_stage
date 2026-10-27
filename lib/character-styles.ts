// Public style labels shown on profiles, in display order. Temperament tags stay in Discover filters only.
const styleLabels: [tag: string, label: string][] = [
  ['Sugar daddy personality', 'Sugar daddy'],
  ['Sugar mummy personality', 'Sugar mummy'],
  ['playboy', 'Playboy'],
  ['baddie', 'Baddie'],
  ['big girl', 'Big girl'],
  ['big boy', 'Big boy'],
];
const cityStyles = new Set(['playboy', 'baddie', 'big girl', 'big boy']);
const styleCities = new Set(['Lagos', 'Abuja']);

// "Lagos baddie" and "Abuja big boy" only for characters who actually live there.
export function characterStyles(tags: string[], location: string) {
  const city = location.split(',')[0].trim();
  return styleLabels.filter(([tag]) => tags.includes(tag)).map(([tag, label]) => cityStyles.has(tag) && styleCities.has(city) ? `${city} ${label.toLowerCase()}` : label);
}
