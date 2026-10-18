type DiscoveryPage<T> = { page: number; total: number; characters: T[]; interests: string[]; personalities: string[] };

/** Read the existing authorized pages into one complete, ordered swipe deck. */
export async function loadDiscoveryFeed<T extends { id: string }>(fetchPage: (page: number) => PromiseLike<{ data: DiscoveryPage<T> | null; error: unknown }>): Promise<DiscoveryPage<T>> {
    const first = await fetchPage(1);
    if (first.error || !first.data) throw new Error('Discovery unavailable');
    const start = first.data;
    if (!Number.isSafeInteger(start.total) || start.total < 0) throw new Error('Invalid discovery total');
    const remaining = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(start.total / 12) - 1) }, (_, index) => fetchPage(index + 2)));
    const characters = [...start.characters];
    for (const result of remaining) {
        if (result.error || !result.data || result.data.total !== start.total) throw new Error('Discovery changed or unavailable');
        characters.push(...result.data.characters);
    }
    // Fail visibly rather than presenting an incomplete or duplicated roster.
    if (characters.length !== start.total || new Set(characters.map(c => c.id)).size !== start.total) throw new Error('Incomplete discovery feed');
    return { ...start, page: 1, characters };
}
