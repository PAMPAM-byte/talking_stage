import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

test('clear-all removes only synthetic owned active/archived history through the real action', async ({ page, context }) => {
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const service = createClient(endpoint, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const jar: { name: string; value: string }[] = [];
  const member = createServerClient(endpoint, key, { cookies: { getAll: () => jar, setAll: values => { for (const value of values) { const prior = jar.findIndex(c => c.name === value.name); if (prior >= 0) jar.splice(prior, 1); jar.push({ name: value.name, value: value.value }); } } } });
  const receipt = JSON.parse(readFileSync('docs/cast-50/publication.json', 'utf8'));
  const email = `clear-all-ui-${randomUUID()}@example.test`, password = `Ts!${randomUUID()}Aa9`;
  let actor: string | undefined;
  function checked<T extends { data: unknown; error: unknown }>(result: T, label: string): T['data'] { if (result.error) throw new Error(`${label} unavailable; private diagnostics suppressed.`); return result.data; }
  try {
    actor = checked(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', synthetic_clear_all_check: true } }), 'Synthetic account').user!.id;
    checked(await member.auth.signInWithPassword({ email, password }), 'Synthetic login');
    checked(await member.rpc('save_preferences', { p_name: 'Clear-all check', p_genders: ['woman', 'man'], p_language: 'english', p_requests: false, p_version: 1 }), 'Preferences');
    checked(await member.rpc('complete_onboarding', { p_version: 2, p_consent: true }), 'Onboarding');
    const ids: string[] = [];
    for (const character of ['char-amara', 'char-chidi']) {
      const id = checked(await member.rpc('start_conversation', { p_character: receipt.keys[character] }), 'Conversation') as string;
      ids.push(id);
      checked(await member.rpc('save_user_message', { p_conversation: id, p_client_id: randomUUID(), p_generation: 1, p_text: 'Synthetic clear-all history' }), 'Synthetic message');
    }
    const before = checked(await member.rpc('conversation_thread', { p_id: ids[1] }), 'Thread');
    checked(await member.rpc('manage_conversation', { p_id: ids[1], p_version: before.conversation.version, p_operation: 'archive', p_clear_memories: false }), 'Archive');
    await context.addCookies(jar.map(cookie => ({ ...cookie, url: 'http://localhost:3102', httpOnly: true, sameSite: 'Lax' as const })));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/messages');
    await expect(page.locator('.conversation-row')).toHaveCount(1);
    await page.getByRole('button', { name: 'Clear all chats', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Clear all chats?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep chats' }).click();
    await expect(page.locator('.conversation-row')).toHaveCount(1);
    await page.getByRole('link', { name: 'Archived', exact: true }).click();
    await expect(page.locator('.conversation-row')).toHaveCount(1);
    await page.getByRole('button', { name: 'Clear all chats', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Clear all chats?' });
    await dialog.getByRole('button', { name: 'Clear all chats', exact: true }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(page.getByRole('heading', { name: 'Your first conversation starts here' })).toBeVisible();
    await page.reload();
    await expect(page.locator('.conversation-row')).toHaveCount(0);
    for (const archived of [true, false]) expect(checked(await member.rpc('list_conversations', { p_archived: archived, p_page: 1 }), 'List').total).toBe(0);
    for (const id of ids) expect((await member.rpc('conversation_thread', { p_id: id })).error !== null).toBe(true);
    const fresh = checked(await member.rpc('start_conversation', { p_character: receipt.keys['char-amara'] }), 'Fresh conversation') as string;
    expect(ids.includes(fresh)).toBe(false);
    expect(checked(await member.rpc('conversation_thread', { p_id: fresh }), 'Fresh history').messages).toHaveLength(0);
  } finally {
    if (actor) checked(await service.auth.admin.updateUserById(actor, { ban_duration: '876000h' }), 'Disable synthetic login');
  }
});
