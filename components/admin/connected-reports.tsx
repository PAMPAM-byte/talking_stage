import Link from 'next/link';
import { currentAccount } from '@/lib/backend/server';
import type { ReportDetail, ReportRow } from '@/lib/backend/report-types';
import { Badge, Card, EmptyState, Notice } from '@/components/ui/primitives';
import { ReportReviewForm } from './connected-report-form';
import { ConnectedChatPhoto } from '@/components/connected-chat-photo';

const labels = { open: 'Open', in_review: 'In review', resolved: 'Resolved' };
export async function ConnectedReports({ state, page = 1 }: { state?: string; page?: number }) {
  const account = await currentAccount(); if (!account) return null;
  const result = await account.client.rpc('admin_list_reports', { p_state: state || null, p_page: page });
  if (result.error) return <Notice title="Reports unavailable" tone="warning"><Link href="/admin/reports">Reload the report queue</Link></Notice>;
  const data = result.data as { reports: ReportRow[]; page: number; total: number };
  const href = (number: number) => `/admin/reports?page=${number}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
  return <div className="stack"><header className="admin-heading"><div className="stack"><h1 className="display page-title">Reports</h1><p className="muted">Review concerns with the selected content and record a private resolution.</p></div></header>
    <form className="row" action="/admin/reports"><label className="field">Report state<select className="field__control" name="state" defaultValue={state ?? ''}><option value="">All states</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="button button--secondary">Filter reports</button><Link href="/admin/reports">Reset filters</Link></form>
    <p className="caption muted" role="status">{data.total} reports</p>
    {data.reports.length ? <div className="admin-record-list">{data.reports.map(report => <Link prefetch={false} key={report.id} className="admin-record" href={`/admin/reports/${report.id}`}><div className="stack"><strong>{report.reason}</strong><span className="supporting muted">Selected {report.target_kind}</span><time className="caption muted" dateTime={report.created_at}>{new Date(report.created_at).toISOString().slice(0, 10)}</time></div><Badge tone={report.state === 'resolved' ? 'success' : 'warning'}>{labels[report.state]}</Badge></Link>)}</div> : <EmptyState title="No reports to review">Reports matching this filter will appear here.</EmptyState>}
    {data.total > 10 && <nav className="row" aria-label="Report pagination">{page > 1 && <Link className="button button--secondary" href={href(page - 1)}>Previous page</Link>}<span className="caption muted">Page {page} of {Math.ceil(data.total / 10)}</span>{page * 10 < data.total && <Link className="button button--secondary" href={href(page + 1)}>Next page</Link>}</nav>}
  </div>;
}

export async function ConnectedReportDetail({ id }: { id: string }) {
  const account = await currentAccount(); if (!account) return null;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return <EmptyState title="Report unavailable" action={<Link href="/admin/reports">Back to reports</Link>}>Choose a report from the queue.</EmptyState>;
  const result = await account.client.rpc('admin_report_detail', { p_id: id });
  if (result.error || !result.data) return <EmptyState title="Report unavailable" action={<Link href="/admin/reports">Back to reports</Link>}>This report could not be loaded.</EmptyState>;
  const report = result.data as ReportDetail; const context = report.context;
  return <div className="stack"><Link href="/admin/reports">Back to reports</Link><header className="admin-heading"><div className="stack"><h1 className="display page-title">{report.reason}</h1><p className="caption muted" style={{ overflowWrap: 'anywhere' }}>Reference: {report.id}</p></div><Badge tone={report.state === 'resolved' ? 'success' : 'warning'}>{labels[report.state]}</Badge></header>
    <div className="admin-form-grid"><Card className="stack"><h2>Selected context</h2><p className="caption muted">Access to this context is logged. Only the reported content is included.</p>{context ? <><p><strong>{context.characterName ?? context.name}</strong>{context.age ? `, ${context.age}` : ''}</p><p className="supporting muted">Selected {report.targetKind}{context.role ? ` · ${context.role} message` : ''}</p><blockquote className="report-context"><p>{context.text ?? context.bio ?? context.altText ?? 'Selected photo message'}</p></blockquote>{(report.targetKind === 'photo' || context.assetId) && <ConnectedChatPhoto assetId={context.assetId ?? report.targetId} name={context.characterName ?? 'the character'} description={context.altText} />}</> : <Notice title="Selected context unavailable">This older report does not have saved context.</Notice>}</Card>
    <Card className="stack"><h2>Report details</h2><p className="report-context">{report.details || 'No additional details supplied.'}</p><p className="caption muted">Reporter reference: {report.reporterId}</p><time className="caption muted" dateTime={report.createdAt}>{new Date(report.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</time></Card></div>
    <Card className="stack"><h2>Review and resolution</h2><ReportReviewForm report={report} /></Card><Link href="/admin/audit">Review administrator activity</Link>
  </div>;
}
