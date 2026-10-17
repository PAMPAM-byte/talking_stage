import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const fields = ['name', 'age', 'gender', 'fictionalLocation', 'occupation', 'bio', 'conversationClue', 'interests', 'personalityTags'];
const sampleNames = ['greeting', 'lowEnergy', 'flirt', 'badDay', 'repair', 'disagree'];
const boundedText = (value, limit, label) => assert(typeof value === 'string' && value.trim().length > 0 && [...value].length <= limit, label);
const unique = (values, label) => assert.equal(new Set(values).size, values.length, label);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function validateRoster(pack) {
    assert.equal(pack.characters.length, 50, 'The target is 50 total, not 50 additions.');
    unique(pack.characters.map(c => c.key), 'Character keys must be unique.');
    unique(pack.characters.map(c => c.profile.name.normalize('NFC').toLowerCase()), 'Names must be distinct.');
    unique(pack.characters.map(c => c.profile.bio), 'Biographies must be individually authored.');
    unique(pack.characters.map(c => c.personality.handle), 'Voice concepts must be distinct.');
    for (const sample of sampleNames) unique(pack.characters.map(c => c.personality.samples[sample]), `Duplicate ${sample} script.`);
    assert.equal(pack.characters.filter(c => c.origin === 'existing_catalogue').length, 22);
    assert.equal(pack.characters.filter(c => c.origin === 'new_draft').length, 28);
    for (const c of pack.characters) {
        assert.match(c.key, /^char-[a-z]+(?:-[a-z]+)*$/);
        assert.deepEqual(Object.keys(c.profile).sort(), [...fields].sort(), `${c.key}: strict CastProfile shape`);
        const p = c.profile;
        assert(Number.isInteger(p.age) && p.age >= 18 && p.age <= 120, `${c.key}: adult age`);
        assert(['man', 'woman'].includes(p.gender));
        for (const [field, limit] of Object.entries({ name: 40, fictionalLocation: 100, occupation: 100, bio: 1200, conversationClue: 240 })) boundedText(p[field], limit, `${c.key}: ${field}`);
        for (const field of ['interests', 'personalityTags']) {
            assert(Array.isArray(p[field]) && p[field].length >= 1 && p[field].length <= 12);
            unique(p[field], `${c.key}: duplicate ${field}`);
            p[field].forEach(value => boundedText(value, 60, `${c.key}: ${field}`));
        }
        boundedText(c.direction, 12000, `${c.key}: private direction`);
        for (const field of ['handle', 'register', 'temperament', 'contradiction', 'socialWorld', 'texting', 'affection', 'softSpot', 'friction']) boundedText(c.personality[field], 1800, `${c.key}: ${field}`);
        assert(c.personality.opinions.length >= 3 && c.personality.knowledgeTopics.length >= 3);
        for (const sample of sampleNames) boundedText(c.personality.samples[sample], 600, `${c.key}: ${sample}`);
        for (const field of ['flirtStyle', 'pace', 'depthStyle', 'attractionReply', 'thoughtfulReply']) boundedText(c.personality.relationship[field], 1800, `${c.key}: relationship ${field}`);
        assert.equal(c.readiness.voiceEvaluation, 'pending');
        assert.equal(c.readiness.ownerReview, 'pending');
        assert(c.knowledgeCards.every(card => card.kind === 'fictional_character_fact'));
        assert.equal(c.knowledgeCards.length, 8);
        if (c.origin === 'new_draft') {
            assert(['not_generated', 'generated_visually_reviewed'].includes(c.readiness.photos));
            assert.equal(c.photoBriefs.length, 2);
        }
    }
}

export async function loadRoster() {
    const generated = await read('docs/cast-50/image-generation.json').catch(error => { if (error.code === 'ENOENT') return { photos: {} }; throw error; });
    const [current, original, expansion, seeds, voices, knowledge, research, relationships, contentScope] = await Promise.all([
        read('docs/cast-50/existing-identities.json'), read('docs/stage-0/characters.json'),
        read('docs/cast-expansion/characters.json'), read('docs/cast-50/identity-seeds.json'),
        read('docs/cast-50/voice-profiles.json'), read('docs/cast-50/knowledge-base.json'), read('docs/cast-50/research.json'),
        read('docs/cast-50/relationship-profiles.json'), read('docs/cast-50/content-scope.json'),
    ]);
    assert.equal(current.length, 22);
    assert.equal(seeds.characters.length, 28);
    assert.equal(voices.characters.length, 50);
    unique(voices.characters.map(c => c.key), 'Duplicate voice source.');
    assert.equal(relationships.characters.length, 50);
    unique(relationships.characters.map(c => c.key), 'Duplicate relationship source.');
    assert.deepEqual(relationships.characters.map(c => c.key).sort(), voices.characters.map(c => c.key).sort(), 'Relationship sources must cover the exact same 50 voices.');
    unique(relationships.characters.map(c => c.attractionReply), 'Attraction examples must be individually authored.');
    unique(relationships.characters.map(c => c.thoughtfulReply), 'Substantive examples must be individually authored.');
    assert.equal(contentScope.explicitGenerationEnabled, false, 'Do not enable an unsupported provider through editorial metadata.');
    const sourceIds = new Set(research.sources.map(s => s.id));
    unique(research.sources.map(s => s.id), 'Duplicate source ID.');
    for (const item of [...knowledge.slang, ...knowledge.modules]) {
        assert(item.sources.every(id => sourceIds.has(id)), 'Missing research provenance.');
    }
    const identities = [...current.map(c => ({ ...c, key: c.id, origin: 'existing_catalogue' })), ...seeds.characters.map(c => ({ ...c, origin: 'new_draft' }))];
    const characters = identities.map(identity => {
        const voice = voices.characters.find(c => c.key === identity.key);
        assert(voice, `Missing voice for ${identity.key}`);
        const relationship = Object.fromEntries(Object.entries(relationships.characters.find(c => c.key === identity.key)).filter(([key]) => key !== 'key'));
        const old = original.characters.find(c => c.id === identity.key);
        const expanded = expansion.characters.find(c => c.key === identity.key);
        const appearance = identity.appearance ?? expanded?.appearance ?? old?.appearanceContinuity;
        boundedText(appearance, 2500, `${identity.key}: appearance continuity`);
        const profile = Object.fromEntries(fields.map(field => [field, identity[field]]));
        profile.bio = voice.bio;
        profile.conversationClue = voice.clue;
        // Existing public tags remain useful filters; the deeper temperament is
        // represented separately instead of adding unreviewed filter taxonomies.
        const facts = [voice.socialWorld, voice.contradiction, ...voice.opinions, voice.softSpot, voice.friction, voice.affection];
        const knowledgeCards = facts.map((text, index) => ({ id: `${identity.key}-fact-${index + 1}`, kind: 'fictional_character_fact', text }));
        const direction = [
            `Fictional adult Nigerian AI character: ${profile.name}, ${profile.age}.`,
            'Remain honest about being fictional AI when asked. Keep chat non-explicit. No money requests, financial rescue, actual meetings, off-platform contact or claims of real services.',
            'Follow server language preferences and explicit current tone requests before the register examples below. A short reply is allowed. Do not ask a question every turn or turn your career into every topic.',
            `Appearance continuity, never a fact about the user: ${appearance}`,
            ...['handle', 'register', 'temperament', 'contradiction', 'socialWorld', 'texting', 'affection', 'softSpot', 'friction'].map(field => `${field}: ${voice[field]}`),
            `Fictional preferences, not universal Nigerian views: ${voice.opinions.join(' / ')}`,
            `Familiar conversation topics, not professional authority or live knowledge: ${voice.knowledgeTopics.join(' / ')}`,
            `Romantic style: ${relationship.flirtStyle}`,
            `Relationship pace: ${relationship.pace}`,
            `Substantive conversation: ${relationship.depthStyle}`,
            'Maintain the thread and give a reason for an opinion. Do not reset each turn into small talk or an interview. Reciprocate welcomed romance naturally; no erotic chat under the current provider. Ordinary friendliness and vulnerability do not signal permission to escalate. Ease back immediately when asked and stay warm.',
            'No live news knowledge: do not invent current prices, politics, match results, releases or gossip. User-supplied claims are not verified facts. Never invent shared memories or relationship milestones.',
            'Original examples of range, never mandatory repeated scripts. Change wording and respond to the actual context:',
            ...sampleNames.map(name => `${name}: ${voice.samples[name]}`),
            `Sincere attraction: ${relationship.attractionReply}`,
            `Thoughtful discussion: ${relationship.thoughtfulReply}`,
            expanded?.roleBoundary,
        ].filter(Boolean).join('\n');
        const photoBriefs = identity.origin === 'new_draft' ? ['portrait', 'gallery'].map(slot => ({
            slot, status: generated.photos[`${identity.key}-${slot}`]?.visualReview === 'passed' ? 'generated_visually_reviewed' : 'not_generated', reference: slot === 'gallery' ? `${identity.key}-portrait (reviewed identity reference)` : null,
            prompt: `Create one realistic photograph of a wholly fictional Nigerian adult aged ${profile.age}. ${appearance} ${slot === 'portrait' ? identity.portraitScene : identity.galleryScene} Preserve the exact same adult identity, age, face, skin tone, hair and build across both photos; gallery uses the reviewed portrait as reference, with different clothing and composition. Natural skin texture, ordinary credible setting, fully clothed non-explicit presentation. No real-person likeness request, celebrity, readable logo, watermark, text, collage or additional identifiable people.`,
        })) : [];
        return {
            key: identity.key, origin: identity.origin, profile, appearance,
            personality: { ...Object.fromEntries(Object.entries(voice).filter(([key]) => !['key', 'bio', 'clue'].includes(key))), relationship },
            knowledgeCards, direction, photoBriefs,
            readiness: { ownerReview: 'pending', voiceEvaluation: 'pending', photos: identity.origin === 'new_draft' ? (photoBriefs.every(photo => photo.status === 'generated_visually_reviewed') ? 'generated_visually_reviewed' : 'not_generated') : 'existing_photos_retained_as_recorded', publication: 'see_publication_record' },
        };
    });
    const pack = {
        version: 1, preparedOn: '2026-10-17', status: 'editorial_rework_not_published',
        sourceFingerprint: hash({ current, original, expansion, seeds, voices, knowledge, research, relationships, contentScope }),
        contentScope,
        counts: { total: 50, existing: 22, additions: 28, women: characters.filter(c => c.profile.gender === 'woman').length, men: characters.filter(c => c.profile.gender === 'man').length, newPhotosRequired: 56 },
        characters,
    };
    const publication = await read('docs/cast-50/publication.json').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (publication?.sourceFingerprint === pack.sourceFingerprint && publication.profiles === 50 && publication.photos === 100 && publication.ordinaryAdultPaginationVerified === true) {
        pack.status = 'hosted_published_voice_evaluation_pending';
        for (const c of characters) c.readiness.publication = 'hosted_published';
    }
    validateRoster(pack);
    return pack;
}

function reviewMarkdown(pack) {
    const lines = ['# Fifty Nigerian character voice drafts', '',
        '**Fifty compiled profiles.** All 56 new photos are generated and visually reviewed; the frontend catalogue includes all 50. See README and publication record for hosted status. Every example below is written sample dialogue, not a live-model result. Native-speaker and live voice evaluation remain pending.', '',
        'The founder requested explicit adult text chat. **Explicit mode is not enabled:** the current Claude provider prohibits it. The romantic examples below remain non-explicit; see [scope decision](./adult-chat-scope.md).', '',
        'Generated from the identity and voice sources by `npm run cast:build`. Edit those sources, then rebuild. Research and evaluation requirements are in [README](./README.md).', '',
        '| Name | Adult age | Location | Voice concept |', '| --- | --- | --- | --- |',
        ...pack.characters.map(c => `| ${c.profile.name} | ${c.profile.age} | ${c.profile.fictionalLocation} | ${c.personality.handle} |`), '',
    ];
    for (const c of pack.characters) {
        lines.push(`## ${c.profile.name}, ${c.profile.age}`, '', `${c.profile.occupation} · ${c.profile.fictionalLocation} · ${c.key}`, '',
            c.profile.bio, '', `**Conversation clue:** ${c.profile.conversationClue}`, '',
            ...['handle', 'register', 'temperament', 'contradiction', 'socialWorld', 'texting', 'affection', 'softSpot', 'friction'].map(field => `- **${field}:** ${c.personality[field]}`), '',
            `**Own opinions:** ${c.personality.opinions.join(' / ')}`, '',
            `**Familiar topics:** ${c.personality.knowledgeTopics.join(' / ')}`, '',
            `**Flirting:** ${c.personality.relationship.flirtStyle}`, '',
            `**Pacing:** ${c.personality.relationship.pace}`, '',
            `**Conversation depth:** ${c.personality.relationship.depthStyle}`, '',
            '| Situation | Original sample |', '| --- | --- |',
            ...sampleNames.map(name => `| ${name} | ${c.personality.samples[name]} |`), '',
            `**Sincere attraction sample:** ${c.personality.relationship.attractionReply}`, '',
            `**Substantive discussion sample:** ${c.personality.relationship.thoughtfulReply}`, '',
            '**Evaluation:** Pending native-speaker, owner and live-model review. Private backstory is fictional; it is not user memory.', '',
        );
    }
    return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const pack = await loadRoster();
    const outputs = {
        'docs/cast-50/characters.json': JSON.stringify(pack, null, 2) + '\n',
        'docs/cast-50/review.md': reviewMarkdown(pack),
        'docs/cast-50/draft-plan.json': JSON.stringify({ version: 1, status: 'review_only_no_import_or_publication', sourceFingerprint: pack.sourceFingerprint, characters: pack.characters.map(({ key, origin, profile, direction }) => ({ key, origin, profile, direction })) }, null, 2) + '\n',
    };
    for (const [path, content] of Object.entries(outputs)) {
        if (process.argv.includes('--check')) assert.equal(await readFile(new URL(path, root), 'utf8'), content, `${path} is stale; run npm run cast:build.`);
        else await writeFile(new URL(path, root), content);
    }
    console.log(`Validated 50 distinct adult Nigerian voice drafts: ${pack.counts.women} women, ${pack.counts.men} men; 400 original example replies, 400 fictional knowledge cards. Explicit mode is not enabled. Photo readiness is recorded per character; voice evaluations remain pending. No services contacted.`);
}
