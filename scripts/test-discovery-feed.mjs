import assert from 'node:assert/strict';
import { loadDiscoveryFeed } from '../lib/discovery-feed.ts';

const roster = Array.from({ length: 50 }, (_, index) => ({ id: `character-${index}`, gender: index < 26 ? 'woman' : 'man' }));
const calls = [];
const page = (rows, number) => ({ error: null, data: { page: number, total: rows.length, characters: rows.slice((number - 1) * 12, number * 12), interests: ['music'], personalities: ['warm'] } });
const result = await loadDiscoveryFeed(async number => { calls.push(number); return page(roster, number); });
assert.deepEqual(calls, [1, 2, 3, 4, 5]);
assert.deepEqual(result.characters, roster, 'Every profile remains reachable in the original order');
assert.deepEqual(result.interests, ['music']);
const women = roster.filter(c => c.gender === 'woman');
assert.deepEqual((await loadDiscoveryFeed(async number => page(women, number))).characters, women);
let emptyReads = 0;
assert.equal((await loadDiscoveryFeed(async number => { emptyReads++; return page([], number); })).characters.length, 0);
assert.equal(emptyReads, 1);
await assert.rejects(loadDiscoveryFeed(async number => number === 2 ? { error: true, data: null } : page(roster, number)), /unavailable/);
await assert.rejects(loadDiscoveryFeed(async number => ({ error: null, data: { ...page(roster, number).data, total: number === 2 ? 49 : 50 } })), /changed/);
await assert.rejects(loadDiscoveryFeed(async number => ({ error: null, data: { ...page(roster, number).data, characters: number === 2 ? roster.slice(0, 12) : page(roster, number).data.characters } })), /Incomplete/);
console.log('Continuous discovery passed: all 50 ordered profiles, filtered/empty rosters, preserved filter metadata, and no silently missing/duplicated characters after partial failure or catalogue changes. No network calls.');
