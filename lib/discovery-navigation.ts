export type DiscoveryFilters = { gender?: string; interest?: string; personality?: string; page?: string };

// Carry only discovery filters, never an arbitrary redirect destination.
export function discoveryQuery(filters: DiscoveryFilters) {
  const query = new URLSearchParams();
  if (['all', 'woman', 'man'].includes(filters.gender ?? '')) query.set('gender', filters.gender!);
  for (const key of ['interest', 'personality'] as const) {
    if (typeof filters[key] === 'string' && filters[key]!.length <= 100 && filters[key]) query.set(key, filters[key]!);
  }
  if (typeof filters.page === 'string' && /^[1-9]\d{0,5}$/.test(filters.page)) query.set('page', filters.page);
  return query.toString();
}

export function discoveryHref(filters: DiscoveryFilters = {}) {
  const query = discoveryQuery(filters);
  return `/discover${query ? `?${query}` : ''}`;
}

export function characterHref(id: string, filters: DiscoveryFilters) {
  const query = discoveryQuery(filters);
  return `/characters/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;
}
