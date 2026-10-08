"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getAccount, getServerAccount, hydrateAccount, subscribeAccount } from "@/lib/mock/account";
export function useMockAccount() {
  const account = useSyncExternalStore(subscribeAccount, getAccount, getServerAccount);
  const [ready, setReady] = useState(false);
  useEffect(() => { hydrateAccount(); queueMicrotask(() => setReady(true)); }, []);
  return { ...account, ready };
}
