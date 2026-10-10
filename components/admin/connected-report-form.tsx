"use client";
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewReport } from '@/lib/backend/report-actions';
import type { ReportDetail } from '@/lib/backend/report-types';
import { Button, Notice, TextArea } from '@/components/ui/primitives';
import { Overlay } from '@/components/ui/overlay';

export function ReportReviewForm({ report }: { report: ReportDetail }) {
  const router = useRouter(); const [notes, setNotes] = useState(''); const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({}); const [pending, start] = useTransition(); const lock = useRef(false);
  function perform(operation: string) {
    if (lock.current) return;
    lock.current = true; setFeedback({});
    start(async () => {
      try {
        const form = new FormData(); form.set('id', report.id); form.set('version', String(report.version)); form.set('operation', operation); form.set('resolution', notes);
        const result = await reviewReport(form); setFeedback(result);
        if (!result.error) { setConfirm(false); router.refresh(); }
      } catch { setFeedback({ error: 'The review could not be saved. Your notes are still here.' }); }
      finally { lock.current = false; }
    });
  }
  if (report.state === 'resolved') return <Notice live tone="success" title="Report resolved"><p className="report-context">{report.resolution}</p><p className="caption">Internal resolution notes. Not visible to the reporter.</p></Notice>;
  return <div className="stack">{feedback.error && <Notice live tone="danger" title="Review not saved">{feedback.error}<Button variant="quiet" onClick={() => router.refresh()}>Reload latest version</Button></Notice>}{feedback.message && <p role="status">{feedback.message}</p>}
    {report.state === 'open' ? <Button disabled={pending} loading={pending} onClick={() => perform('start_review')}>Start review</Button> : <><TextArea label="Resolution notes" value={notes} disabled={pending} maxLength={1000} onChange={event => setNotes(event.target.value)} hint="Required. Private to administrators; excluded from activity logs." /><Button disabled={pending || !notes.trim()} onClick={() => setConfirm(true)}>Resolve report</Button></>}
    <Overlay open={confirm} onClose={() => { if (!pending) setConfirm(false); }} title="Resolve this report?" description="Your notes will be saved with this report. Resolving it does not delete content or change character availability." footer={<><Button variant="secondary" disabled={pending} onClick={() => setConfirm(false)}>Keep reviewing</Button><Button loading={pending} onClick={() => perform('resolve')}>Confirm resolution</Button></>}><p className="report-context">{notes}</p>{feedback.error && <Notice live tone="danger" title="Review not saved">{feedback.error}</Notice>}</Overlay>
  </div>;
}
