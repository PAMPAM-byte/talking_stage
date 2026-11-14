"use client";
import { useEffect, useSyncExternalStore } from 'react';
import { likesServerSnapshot, likesSnapshot, reviewDueLikes, subscribeLikes } from '@/lib/mock/likes';

/** Preview likes/coins state; runs the due 30-minute review on mount and every 30 seconds. */
export function usePreviewLikes() {
  const state = useSyncExternalStore(subscribeLikes, likesSnapshot, likesServerSnapshot);
  useEffect(() => { reviewDueLikes(); const t = setInterval(() => reviewDueLikes(), 30_000); return () => clearInterval(t); }, []);
  return state;
}

export { Coin, CoinBalance } from './coin';
