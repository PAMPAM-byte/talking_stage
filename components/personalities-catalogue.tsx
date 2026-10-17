'use client';

import { useId, useState } from 'react';
import type { PublicCharacter } from '@/lib/contracts';
import { LandingPhoto } from './landing-photo';
import { Icon } from './ui/icon';

export function PersonalitiesCatalogue({ characters }: { characters: PublicCharacter[] }) {
  const searchId = useId();
  const genderId = useId();
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('everyone');
  const [limit, setLimit] = useState(12);
  const needle = query.trim().toLocaleLowerCase();
  const matches = characters.filter(character => (gender === 'everyone' || character.gender === gender)
    && (!needle || [character.name, character.occupation, character.fictionalLocation, ...character.interests, ...character.personalityTags].join(' ').toLocaleLowerCase().includes(needle)));
  function clear() { setQuery(''); setGender('everyone'); setLimit(12); }

  return <div className="personalities-catalogue">
    <div className="personalities-catalogue-controls">
      <label htmlFor={searchId}>Find a personality<input id={searchId} type="search" placeholder="Name, city or interest" value={query} onChange={event => { setQuery(event.target.value); setLimit(12); }} /></label>
      <label htmlFor={genderId}>Show<select id={genderId} value={gender} onChange={event => { setGender(event.target.value); setLimit(12); }}><option value="everyone">Everyone</option><option value="woman">Women</option><option value="man">Men</option></select></label>
    </div>
    <p className="personalities-catalogue-count" role="status">Showing {Math.min(limit, matches.length)} of {matches.length} {matches.length === 1 ? 'personality' : 'personalities'}</p>
    <div className="personalities-cards">{matches.slice(0, limit).map(character => <article key={character.id}>
      <div className="personalities-card-photo"><LandingPhoto src={`/images/characters/${character.portraitAssetId}.webp`} name={character.name} sizes="(min-width: 1200px) 262px, (min-width: 1000px) calc((100vw - 152px) / 4), (min-width: 600px) calc((100vw - 112px) / 2), calc(100vw - 48px)" alt={`${character.name}, ${character.age}, a fictional adult AI character.`} /><span>AI character</span></div>
      <div className="personalities-card-body"><div className="personalities-name"><h3>{character.name}<span>, {character.age}</span></h3><Icon name="message" /></div><p className="personalities-occupation">{character.occupation}</p><p className="personalities-traits">{character.personalityTags.join(' · ')}</p><blockquote>“{character.conversationClue}”</blockquote><div className="personalities-interests" aria-label={`${character.name}'s interests`}>{character.interests.map(interest => <span key={interest}>{interest}</span>)}</div><details><summary>A little more about {character.name}<span aria-hidden="true">+</span></summary><p>{character.bio}</p><p className="personalities-location">{character.fictionalLocation} · Fictional setting</p></details></div>
    </article>)}</div>
    {matches.length === 0 && <div className="personalities-catalogue-empty"><h3>No personalities found</h3><p>Try another name, city or interest.</p><button className="button button--secondary" type="button" onClick={clear}>Clear filters</button></div>}
    {matches.length > limit && <div className="personalities-catalogue-more"><button className="button button--secondary" type="button" onClick={() => setLimit(value => value + 12)}>Show more personalities</button></div>}
  </div>;
}
