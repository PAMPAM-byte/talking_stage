'use client';
import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Overlay } from './ui/overlay';
import { Button } from './ui/primitives';
import { Icon } from './ui/icon';
import {personalityDefinitions,interestDefinitions} from '@/lib/discovery-taxonomy.mjs';
import styles from './discovery-filter-controls.module.css';

export function FilterChoices({ label, options, value, onChange, anyLabel }: { label: string; options: string[]; value: string; onChange: (value: string) => void; anyLabel: string }) {
  const id = useId();
  const definitions:Record<string,string>=label==='Personality'?personalityDefinitions:label==='Interest'?interestDefinitions:{};
  const description=definitions[value];
  return <fieldset className={`filter-choice-group ${styles.group}`} aria-describedby={description?`${id}-description`:undefined}><legend>{label}</legend>{description&&<p id={`${id}-description`} className={`caption muted ${styles.description}`}>{description}</p>}<div className={`filter-choice-options ${styles.options}`}>{['', ...options].map(option => <label key={option} className={`filter-choice${option === value ? ' is-selected' : ''}`}><input type="radio" name={id} value={option} checked={value === option} onChange={() => onChange(option)} /><span>{label === 'Character gender' && option === 'woman' ? 'Women' : label === 'Character gender' && option === 'man' ? 'Men' : option || anyLabel}</span><span className="filter-choice-check" aria-hidden="true">{option === value && <Icon name="check" />}</span></label>)}</div></fieldset>;
}

export function ConnectedDiscoveryFilters({ filters, interests, personalities }: { filters: {gender?: string; interest?: string; personality?: string}; interests: string[]; personalities: string[] }) {
  const router = useRouter(); const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  return <div className="connected-filter-trigger"><Button variant="secondary" onClick={() => {setDraft(filters);setOpen(true);}}><Icon name="filter" />Filters</Button><Overlay className="discovery-filter-dialog" sheet open={open} onClose={() => setOpen(false)} title="Find your kind of conversation" description="Choose the interests and personality that catch your curiosity." footer={<><Button variant="quiet" onClick={() => setDraft({gender:filters.gender})}>Clear selections</Button><Button onClick={() => {const query = new URLSearchParams({gender:draft.gender || 'all'});if(draft.interest)query.set('interest',draft.interest);if(draft.personality)query.set('personality',draft.personality);router.push(`/discover?${query}`);setOpen(false);}}>Apply filters</Button></>}><div className="discovery-filter-fields"><FilterChoices label="Personality" value={draft.personality || ''} options={personalities} anyLabel="Any personality" onChange={value => setDraft({...draft,personality:value})} /><FilterChoices label="Interest" value={draft.interest || ''} options={interests} anyLabel="Any interest" onChange={value => setDraft({...draft,interest:value})} /></div></Overlay></div>;
}
