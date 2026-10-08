"use client";
import { useEffect, useSyncExternalStore } from 'react';
import { capabilities, hydrateOperatorPublic, operatorPublicVersion, serverOperatorPublicVersion, subscribeOperatorPublic } from '@/lib/mock/operator-public';
export function useOperatorPreview(characterId = '') { const revision = useSyncExternalStore(subscribeOperatorPublic, operatorPublicVersion, serverOperatorPublicVersion); useEffect(hydrateOperatorPublic, []); return { revision, ...capabilities(characterId) }; }
