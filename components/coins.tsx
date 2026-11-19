"use client";
import { useEffect, useSyncExternalStore } from 'react';
import { likesServerSnapshot, likesSnapshot, reviewDueLikes, subscribeLikes } from '@/lib/mock/likes';

/** Preview likes/coins state; answers any like left over from the old half-hourly preview. */
export function usePreviewLikes() {
  const state = useSyncExternalStore(subscribeLikes, likesSnapshot, likesServerSnapshot);
  useEffect(() => { reviewDueLikes(); }, []);
  return state;
}

export { Coin, CoinBalance } from './coin';
