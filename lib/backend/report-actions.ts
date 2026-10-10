"use server";
import { revalidatePath } from 'next/cache';
import { currentAccount } from './server';
import { reportReasons, type ReportTarget } from './report-types';
import { observe, emit } from '@/lib/monitoring/events.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function submitReport(target: ReportTarget, reason: string, details: string, operation: string): Promise<{ id?: string; error?: string }> {
  try {
    const account = await currentAccount();
    if (!account?.profile.onboarding_complete || !account.profile.adult_declared_at) return { error: 'Sign in to send a report.' };
    if (!target || !['character', 'message', 'photo'].includes(target.kind) || !uuid.test(target.id) || !uuid.test(operation)
      || !reportReasons.some(value => value === reason) || typeof details !== 'string' || details.length > 1000) return { error: 'Choose a reason and keep details within 1,000 characters.' };
    const result = await observe('report.submit', () => account.client.rpc('submit_report', { p_kind: target.kind, p_target: target.id, p_reason: reason, p_details: details, p_operation: operation }));
    if (result.error) return { error: result.error.message.includes('rate_limited') ? 'Too many reports. Wait a minute and try again.' : result.error.message.includes('target_unavailable') ? 'The selected content is no longer available to report.' : result.error.message.includes('idempotency_conflict') ? 'This attempt already saved a report with your earlier details. Close this form and reopen reporting if you want to send different details.' : 'Your report could not be saved. Please try again.' };
    return { id: result.data.id };
  } catch { emit('report.submit', 'unexpected');return { error: 'Reporting is unavailable. Your details are still here; please try again.' }; }
}

export async function reviewReport(form: FormData): Promise<{ error?: string; message?: string }> {
  try {
    const account = await currentAccount();
    if (!account?.profile.onboarding_complete || !account.profile.adult_declared_at) return { error: 'Administrator access required.' };
    const id = String(form.get('id') ?? '');
    const version = Number(form.get('version'));
    if (!uuid.test(id) || !Number.isSafeInteger(version) || version < 1) return { error: 'Reload the current report before reviewing it.' };
    const result = await observe('report.review', () => account.client.rpc('admin_report_command', { p_id: id, p_version: version, p_operation: String(form.get('operation') ?? ''), p_resolution: String(form.get('resolution') ?? '') }));
    const failure = result.data?.error ?? result.error?.message;
    if (failure) return { error: failure.includes('conflict') ? 'Another administrator changed this report. Reload the latest version; your notes are still here.' : failure.includes('resolution_required') ? 'Add resolution notes before resolving this report.' : failure.includes('rate_limited') ? 'Too many changes. Wait a minute and try again.' : 'The review could not be saved. Check its current state and try again.' };
    revalidatePath('/admin/reports', 'layout');
    revalidatePath('/admin/audit');
    return { message: form.get('operation') === 'resolve' ? 'Report resolved.' : 'Review started.' };
  } catch { emit('report.review', 'unexpected');return { error: 'Report services are unavailable. Please try again.' }; }
}
