import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { loadRoster } from './build-cast-roster.mjs';
import { buildInput } from '../lib/ai/provider.mjs';
import { conversationStyle } from '../lib/ai/conversation-style.mjs';

// Validate real compiled content against the actual PostgreSQL draft contract.
// This database is in memory. No environment files, providers or services used.
const pack = await loadRoster();
const publicCast = JSON.parse(await readFile(new URL('../lib/mock/public-cast.json', import.meta.url), 'utf8'));
for (const c of pack.characters) {
    const exposed = publicCast.find(row => row.id === c.key);
    assert(exposed, `${c.key}: missing public profile`);
    assert.equal(exposed.fictionalLocation, `${c.world.city}, ${c.world.region}, ${c.world.country}`);
    assert.equal(exposed.occupation, c.profile.occupation);
    assert.equal(exposed.bio, c.world.bio);
    for (const privateField of ['world', 'direction', 'backstory', 'knowledgeCards', 'personality']) assert(!Object.hasOwn(exposed, privateField), `${c.key}: private canon leaked`);
    for (const field of ['roots', 'arrival', 'work', 'routine', 'offDuty', 'story']) assert(c.direction.includes(c.world[field]), `${c.key}: ${field} missing from model context`);
    assert(c.direction.includes(c.world.timeZone));
    assert(!/Lagos (?:big boy|big girl)|Abuja (?:big boy|big girl)/i.test(c.profile.personalityTags.join(' ')), 'Social style must not impose a home city.');
    const history = [{ role: 'user', text: 'I like jazz.' }, { role: 'character', text: 'One good song can improve an ordinary evening.' }, { role: 'user', text: 'What music did I mention?' }];
    const input = buildInput({ character: { name: c.profile.name, direction: c.direction }, preferences: { language: 'english' }, memories: [], history, maxInputTokens: 48000, maxOutputTokens: 1024 });
    assert(input[0].content.includes(c.direction), `${c.key}: complete individual voice must reach the provider alongside shared rules`);
    assert(input[0].content.includes(conversationStyle('english')), `${c.key}: all shared conversation and contextual-understanding rules must reach every character`);
    const greeting = `hi ${c.profile.name}`;
    const opening = buildInput({ character: { name: c.profile.name, direction: c.direction }, preferences: { language: 'english' }, memories: [], history: [{ role: 'user', text: greeting }], maxInputTokens: 48000, maxOutputTokens: 1024 });
    assert(opening[0].content.includes('Keep the entire reply under 12 words'), `${c.key}: every character needs concise greeting guidance`);
    assert.equal(opening.at(-1).content, greeting);
    assert.deepEqual(input.slice(-3), history.map(m => ({ role: m.role === 'character' ? 'assistant' : 'user', content: m.text })), 'Recent user details and character replies must survive prompt assembly.');
    const musicInput = buildInput({ character: { name: c.profile.name, direction: c.direction }, preferences: { language: 'english' }, memories: [], history: [{ role: 'character', text: 'Which Wizkid song do you like most?' }, { role: 'user', text: 'Bend' }], maxInputTokens: 48000, maxOutputTokens: 1024 });
    assert(musicInput[0].content.includes('Bend is a song by Wizkid on Morayo'), `${c.key}: grounded cultural context must reach every character`);
    assert(musicInput[0].content.includes(c.direction), `${c.key}: grounding must preserve the complete individual voice`);
    assert.equal(musicInput.at(-1).content, 'Bend', `${c.key}: recent context must survive grounding`);
    const intentInput = buildInput({ character: { name: c.profile.name, direction: c.direction }, preferences: { language: 'english' }, memories: [], history: [{ role: 'character', text: 'I meant the compliment.' }, { role: 'user', text: 'Are you for real?' }], maxInputTokens: 48000, maxOutputTokens: 1024 });
    assert(intentInput[0].content.includes('Meaning check for this turn'), `${c.key}: contextual sincerity guidance must reach every character`);
    assert(intentInput[0].content.includes(c.direction), `${c.key}: interpretation guidance must retain the complete individual voice`);
    assert.equal(intentInput.at(-1).content, 'Are you for real?');
}
const db = new PGlite();
const admins = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
const member = '00000000-0000-4000-8000-000000000003';
try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
        create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        grant usage on schema auth,public to authenticated,anon;
        grant execute on function auth.uid() to authenticated,anon;`);
    for (const migration of ['202610080001_foundation.sql', '202610080002_cast_drafts.sql']) {
        await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    for (const actor of [...admins, member]) {
        await db.query('insert into auth.users values ($1,$2)', [actor, JSON.stringify({ adult_declaration: '18-plus-v1' })]);
        await db.query("update public.profiles set display_name='Synthetic roster reviewer',genders=array['woman','man'],ai_consent_at=now(),onboarding_complete=true where id=$1", [actor]);
    }
    for (const actor of admins) await db.query("insert into private.user_roles(user_id,role) values ($1,'admin')", [actor]);
    const saved = [];
    for (let index = 0; index < pack.characters.length; index++) {
        // Two synthetic admins save 25 each, staying within the real 30/min cap.
        await db.exec('reset role; set role authenticated');
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admins[Math.floor(index / 25)]]);
        const c = pack.characters[index];
        const result = await db.query('select public.admin_save_cast(null,0,$1,$2) as id', [JSON.stringify(c.profile), c.direction]);
        saved.push({ ...c, id: result.rows[0].id });
    }
    await db.exec('reset role');
    const stored = (await db.query('select character_id,profile,direction,instruction_version from private.cast_drafts')).rows;
    assert.equal(stored.length, 50);
    for (const c of saved) {
        const row = stored.find(r => r.character_id === c.id);
        assert.deepEqual(row.profile, c.profile, `${c.key}: saved profile round trip`);
        assert.equal(row.direction, c.direction, `${c.key}: saved private voice round trip`);
        assert.equal(row.instruction_version, 1);
    }
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [member]);
    assert.equal((await db.query('select * from public.characters')).rows.length, 0, 'Unpublished drafts must not appear to customers.');
    await assert.rejects(db.query('select * from private.cast_drafts'), /permission denied/);
    await assert.rejects(db.query('select public.admin_list_cast()'), /forbidden/);
    console.log('All 50 compiled adult profiles/private directions passed real PostgreSQL draft validation and round-trip checks. Unpublished profiles and directions remain inaccessible to members. This is not a live voice-quality evaluation.');
} finally {
    await db.close();
}
