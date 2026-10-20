// Small, reviewed public-fact catalogue. No user text is copied into instructions,
// no network call occurs during chat, and these facts are not character memories.
export const musicReferences = Object.freeze([
    Object.freeze({
        title: 'Bend', artist: 'Wizkid', album: 'Morayo', albumReleased: '2024-11-22',
        reviewed: '2026-10-20',
        sources: Object.freeze([
            'https://music.apple.com/us/song/1780459836',
            'https://music.apple.com/us/album/morayo/1780459822',
            'https://www.youtube.com/watch?v=ysCEMY5xji8',
        ]),
    }),
]);

function text(message) { return message?.text ?? message?.content ?? ''; }
function normalized(value) { return value.normalize('NFKC').toLocaleLowerCase('en').trim(); }
function literal(value) { return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'); }

export function conversationKnowledge(history) {
    const lastUser = history.findLastIndex(message => message.role === 'user');
    if (lastUser < 0) return '';
    const latest = normalized(text(history[lastUser]));
    const previous = history.slice(0, lastUser).findLast(message => ['assistant', 'character'].includes(message.role));
    const previousText = normalized(text(previous));
    // A bare title is identifiable when it directly answers an artist-specific
    // music question. An old artist mention or the verb "bend" is insufficient.
    const answersMusicQuestion = /\b(?:song|track|music|listen|album|favourite|favorite)\b/u.test(previousText) && previousText.includes('?');
    const matches = musicReferences.filter(reference => {
        const title = normalized(reference.title);
        const artist = normalized(reference.artist);
        const bareTitle = latest.replace(/^["'\u2018\u2019\u201c\u201d]+|["'\u2018\u2019\u201c\u201d.!?]+$/gu, '') === title;
        const explicitTitle = new RegExp(`\\b${literal(title)}\\b.{0,30}\\bby ${literal(artist)}\\b|\\b${literal(artist)}(?:['\u2019]s)?\\b.{0,30}\\b${literal(title)}\\b`, 'u').test(latest);
        return explicitTitle || (bareTitle && answersMusicQuestion && previousText.includes(artist));
    });
    if (!matches.length) return '';
    return `Reviewed public music reference, relevant to the immediate exchange:
${matches.map(reference => `${reference.title} is a song by ${reference.artist} on ${reference.album}; that album was released ${reference.albumReleased}.`).join('\n')}
Use these as factual anchors, not a review, a required fact recital or evidence you listened to anything. Do not announce this reference block. They do not establish lyrics, production details, popularity, personal taste or a current trend. Respond in this character's own voice; a short reaction can stand alone. If unsure about another detail, do not invent it. No live lookup occurred during this reply.`;
}
