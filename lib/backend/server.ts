import "server-only";
import { cache } from 'react';
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseConfig } from "./config";
import { observe } from '@/lib/monitoring/events.mjs';
import { dependencyFetch } from './dependency-fetch.mjs';

export async function backendClient() {
  const config = supabaseConfig();
  if (!config) return null;
  // Auth's internal timers must run for a request, never in a shared static shell.
  await connection();
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    global: { fetch: dependencyFetch },
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        // Server Components cannot set cookies. Proxy refreshes them first.
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch {}
      },
    },
  });
}

export async function currentAccount({ failOnUnavailable = false }: { failOnUnavailable?: boolean } = {}) {
  const client = await backendClient();
  if (!client) return null;
  const { data, error } = await observe('auth.identity', () => client.auth.getUser());
  if (error || !data.user) {
    // API callers must distinguish an unavailable identity service from a
    // signed-out session. Network/rate-limit failures should be retryable 503s.
    if (failOnUnavailable && error && error.name !== 'AuthSessionMissingError' && ![400, 401, 403].includes(error.status ?? 0)) throw new Error('Identity service unavailable');
    return null;
  }
  const profile = await observe('account.profile', () => client.from("profiles").select("id,display_name,genders,language,requests_enabled,onboarding_complete,adult_declared_at,version").eq("id", data.user.id).single());
  if (profile.error || !profile.data) {
    if (failOnUnavailable && (profile.status === 0 || profile.status === 429 || profile.status >= 500)) throw new Error('Account service unavailable');
    return null;
  }
  return { client, user: data.user, profile: profile.data };
}

// React scopes this to one Server Component render, never another user/request.
// Mutating actions retain the uncached reader so sign-in/out changes stay fresh.
export const renderAccount = cache(() => currentAccount({ failOnUnavailable: true }));
