"use client";
import { useRef, useState, useTransition } from 'react';
import { submitReport } from '@/lib/backend/report-actions';
import { reportReasons, type ReportTarget } from '@/lib/backend/report-types';
import { Button, Notice, SelectField, TextArea } from './ui/primitives';
import { Overlay } from './ui/overlay';

export function ReportControl({ target, label, preview, buttonLabel = 'Report', compact = false }: { target: ReportTarget; label: string; preview: string; buttonLabel?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="quiet" className={compact ? 'caption' : undefined} onClick={() => setOpen(true)} aria-label={`Report ${label}`}>{buttonLabel}</Button>{open && <ConnectedReportDialog target={target} label={label} preview={preview} onClose={() => setOpen(false)} />}</>;
}

function ConnectedReportDialog({ target, label, preview, onClose }: { target: ReportTarget; label: string; preview: string; onClose: () => void }) {
  const [reason, setReason] = useState(''); const [details, setDetails] = useState('');
  const [error, setError] = useState(''); const [id, setId] = useState(''); const [pending, start] = useTransition();
  const operation = useRef(crypto.randomUUID()); const lock = useRef(false);
  function send() {
    if (lock.current) return;
    if (!reason) { setError('Choose a reason for your report.'); return; }
    lock.current = true; setError('');
    start(async () => {
      try { const result = await submitReport(target, reason, details, operation.current); if (result.id) setId(result.id); else setError(result.error ?? 'Your report could not be saved. Please try again.'); }
      catch { setError('Reporting is unavailable. Your details are still here; please try again.'); }
      finally { lock.current = false; }
    });
  }
  return <Overlay open onClose={() => { if (!pending) onClose(); }} title={id ? 'Report received' : `Report ${label}`} description={id ? 'Your report has been saved for administrator review.' : 'Only the selected content and the details you add will be included in this report.'} sheet footer={id ? <Button onClick={onClose}>Done</Button> : <><Button variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button><Button loading={pending} onClick={send}>Send report</Button></>}>
    <div className="stack">{id ? <Notice live tone="success" title="Report saved"><p>Thank you for flagging this concern.</p><p className="caption">Reference: {id}</p></Notice> : <><blockquote className="report-context"><span className="caption muted">Selected {target.kind}</span><p>{preview}</p></blockquote><SelectField label="Report reason" value={reason} disabled={pending} onChange={event => { setReason(event.target.value); setError(''); }}><option value="">Choose a reason</option>{reportReasons.map(value => <option key={value}>{value}</option>)}</SelectField><TextArea label="Additional details (optional)" value={details} disabled={pending} maxLength={1000} onChange={event => { setDetails(event.target.value); setError(''); }} hint="Include only what is needed to explain the concern. These details are private to the review team." />{error && <Notice live title="Report not saved" tone="danger">{error}</Notice>}</>}</div>
  </Overlay>;
}
