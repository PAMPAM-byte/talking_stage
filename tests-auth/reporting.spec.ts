import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

test('real reports save selected evidence, isolate accounts and support audited administrator resolution', async ({ page, browser }) => {
  test.setTimeout(240000);
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const service = createClient(endpoint, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
  const client = () => createClient(endpoint, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
  const a = client(), b = client(), admin = client();
  const created: string[] = [];
  const password = `Ts!${randomUUID()}Aa9`;
  const emails = [0, 1, 2].map(() => `report-check-${randomUUID()}@example.test`);
  const sql = (input: string) => execFileSync('docker', ['exec', '-i', 'supabase_db_talking_stage', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const adminPage = await adminContext.newPage();
  const errors: string[] = []; for (const p of [page, adminPage]) p.on('pageerror', error => errors.push(error.message));
  async function login(p: Page, email: string) {
    await p.goto('/sign-in');
    await p.getByLabel('Email address').fill(email); await p.getByLabel('Password', { exact: true }).fill(password);
    await p.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(p).toHaveURL(/\/discover$/, { timeout: 60000 });
  }
  try {
    for (const [index, actor] of [a, b, admin].entries()) {
      const result = await service.auth.admin.createUser({ email: emails[index], password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', synthetic_reporting_check: true } });
      expect(result.error).toBeNull(); created.push(result.data.user!.id);
      expect((await actor.auth.signInWithPassword({ email: emails[index], password })).error).toBeNull();
      expect((await actor.rpc('save_preferences', { p_name: 'Synthetic reviewer', p_genders: ['woman'], p_language: 'english', p_requests: false, p_version: 1 })).error).toBeNull();
      expect((await actor.rpc('complete_onboarding', { p_version: 2, p_consent: true })).error).toBeNull();
    }
    sql(`insert into private.user_roles(user_id,role) values('${created[2]}','admin');`);
    const cast = JSON.parse(readFileSync('.local-services/approved-cast-import.json', 'utf8'));
    const character = cast.characters['char-amara'].id;
    const conversation = await a.rpc('start_conversation', { p_character: character }); expect(conversation.error).toBeNull();
    const message = await a.rpc('save_user_message', { p_conversation: conversation.data, p_client_id: randomUUID(), p_generation: 1, p_text: 'Selected synthetic report message' }); expect(message.error).toBeNull();
    expect((await a.rpc('save_user_message', { p_conversation: conversation.data, p_client_id: randomUUID(), p_generation: 1, p_text: 'UNRELATED PRIVATE MESSAGE' })).error).toBeNull();
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, emails[0]);
    await page.goto(`/characters/${character}`);
    await page.getByRole('button', { name: 'Report Amara’s profile', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Choose a reason');
    await dialog.getByLabel('Report reason').selectOption('Safety concern');
    await dialog.getByLabel('Additional details (optional)').fill('Synthetic profile concern');
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    mkdirSync('docs/reviews/stage-12', { recursive: true });
    await page.screenshot({ path: 'docs/reviews/stage-12/report-dialog-390.png' });
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByRole('heading', { name: 'Report received' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Report Amara’s gallery photo', exact: true }).click();
    dialog = page.getByRole('dialog'); await dialog.getByLabel('Report reason').selectOption('Photo concern');
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByRole('heading', { name: 'Report received' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await page.goto(`/messages/${conversation.data}`);
    await page.getByRole('button', { name: 'Report Amara conversation message 1', exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Selected synthetic report message');
    await expect(dialog).not.toContainText('UNRELATED PRIVATE MESSAGE');
    await dialog.getByLabel('Report reason').selectOption('Inappropriate content');
    await dialog.getByLabel('Additional details (optional)').fill('Synthetic message concern');
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByRole('heading', { name: 'Report received' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    const reports = await a.from('reports').select('*'); expect(reports.error).toBeNull(); expect(reports.data).toHaveLength(3);
    const reportedMessage = reports.data!.find(row => row.target_kind === 'message')!;
    const replay = await a.rpc('submit_report', { p_kind: 'message', p_target: message.data.id, p_reason: reportedMessage.reason, p_details: reportedMessage.details, p_operation: reportedMessage.operation_id });
    expect(replay.error).toBeNull(); expect(replay.data.id).toBe(reportedMessage.id);
    expect((await b.from('reports').select('*')).data).toEqual([]);
    expect((await b.rpc('submit_report', { p_kind: 'message', p_target: message.data.id, p_reason: 'Other', p_details: '', p_operation: randomUUID() })).error).not.toBeNull();
    expect((await b.rpc('admin_report_detail', { p_id: reportedMessage.id })).error).not.toBeNull();
    await page.goto('/admin/reports'); await expect(page.getByText('Administrator access required')).toBeVisible();
    await login(adminPage, emails[2]);
    await adminPage.goto('/admin/reports');
    await expect(adminPage.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
    await adminPage.locator(`a[href="/admin/reports/${reportedMessage.id}"]`).click();
    await expect(adminPage).toHaveURL(new RegExp(`/admin/reports/${reportedMessage.id}$`));
    await expect(adminPage.getByText('Selected synthetic report message', { exact: true })).toBeVisible();
    await expect(adminPage.getByText('UNRELATED PRIVATE MESSAGE', { exact: true })).toHaveCount(0);
    await adminPage.getByRole('button', { name: 'Start review', exact: true }).click();
    await expect(adminPage.getByLabel('Resolution notes')).toBeVisible();
    await adminPage.getByLabel('Resolution notes').fill('Private synthetic resolution; reviewed selected evidence.');
    await adminPage.getByRole('button', { name: 'Resolve report', exact: true }).click();
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm resolution', exact: true }).click();
    await expect(adminPage.getByText('Report resolved.', { exact: true }).or(adminPage.getByText('Report resolved', { exact: true }))).toBeVisible();
    await expect(adminPage.getByRole('dialog')).not.toBeVisible();
    await expect(adminPage.getByLabel('Resolution notes')).toHaveCount(0);
    await expect(adminPage.getByText('Private synthetic resolution; reviewed selected evidence.', { exact: true })).toBeVisible();
    expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await adminPage.screenshot({ path: 'docs/reviews/stage-12/report-resolution-390.png', fullPage: true });
    const stale = await admin.rpc('admin_report_command', { p_id: reportedMessage.id, p_version: 1, p_operation: 'resolve', p_resolution: 'Stale change' });
    expect(stale.data.error).toBe('conflict');
    const audit = await admin.rpc('admin_list_audit'); expect(audit.error).toBeNull();
    expect(audit.data.events.some((event: { target_id: string; action: string }) => event.target_id === reportedMessage.id && event.action === 'report.view_context')).toBe(true);
    expect(JSON.stringify(audit.data)).not.toContain('Private synthetic resolution');
    const own = (await a.from('reports').select('*').eq('id', reportedMessage.id).single()).data;
    expect(own.state).toBe('resolved'); expect(own.resolution).toBeUndefined(); expect(own.context).toBeUndefined();
    // Photo evidence uses the existing authenticated image proxy, with no storage URLs.
    const photo = reports.data!.find(row => row.target_kind === 'photo')!;
    await adminPage.goto(`/admin/reports/${photo.id}`);
    await expect(adminPage.locator('.chat-photo img')).toBeVisible();
    await expect.poll(() => adminPage.locator('.chat-photo img').evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  } finally {
    await adminContext.close();
    for (const actor of [a, b, admin]) await actor.auth.signOut();
    for (const id of created) {
      expect(/^[a-f0-9-]{36}$/i.test(id)).toBe(true);
      sql(`delete from private.user_roles where user_id='${id}';
      delete from private.report_resolutions where report_id in(select id from public.reports where reporter_id='${id}');
      update private.report_resolutions set actor_id=null where actor_id='${id}';
      delete from public.reports where reporter_id='${id}';
      update private.admin_audit set actor_id=null where actor_id='${id}';
      delete from public.memories where user_id='${id}';delete from public.memory_preferences where user_id='${id}';
      delete from public.messages where conversation_id in(select id from public.conversations where user_id='${id}');
      delete from public.conversations where user_id='${id}';`);
      expect((await service.auth.admin.deleteUser(id)).error).toBeNull();
    }
  }
});
