import { useState, useEffect } from 'react';
import { RefreshCw, Download, Trash2 } from 'lucide-react';
import adminAxios from '../../utils/adminAxios';
import { useToast } from '../../context/ToastContext';
import { downloadCsv } from '../../utils/adminExport';
import { PageHeading, Empty, ErrorNotice, Modal, Pager } from '../../components/admin/AdminUi';
import { panel, field, button } from '../../utils/adminPresentation';
const label = value => String(value || '').toLowerCase().replaceAll('_', ' ');
const time = value => new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });
export default function ActivityLogs() {
  const toast = useToast();
  const superadmin = localStorage.getItem('adminRole') === 'superadmin';
  const [data, setData] = useState({ items: [], total: 0, actions: [] });
  const [filters, setFilters] = useState({ search: '', action: '', from: '', to: '' });
  const [draft, setDraft] = useState({ ...filters });
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clear, setClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    adminAxios.get('/api/logs', { params: { ...filters, page, pageSize: 25 }, signal: controller.signal }).then(res => {
      if (!Array.isArray(res.data.items)) throw new Error('Deploy the updated backend to enable log pagination.');
      if (!controller.signal.aborted) setData(res.data);
    }).catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || err.message || 'Could not load activity.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, revision]);
  const clearLogs = async () => {
    setClearing(true);
    try { await adminAxios.delete('/api/logs'); setClear(false); setPage(1); setRevision(v => v + 1); toast.success('Logs cleared.'); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not clear logs.'); }
    finally { setClearing(false); }
  };
  return <section className="mx-auto max-w-[1400px] pb-12"><PageHeading eyebrow="WORKSPACE / ACTIVITY" title="A clear record of changes." description="Search recorded staff activity across the full history. All times shown in Bangladesh time."><button className={button} disabled={loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={14} />Refresh</button><button className={button} disabled={loading || !!error || !data.items.length} onClick={() => downloadCsv(`activity-page-${page}.csv`, ['Time (Bangladesh)', 'Admin', 'Action', 'Target', 'Detail'], data.items.map(log => [time(log.createdAt), log.adminName, log.action, log.target, log.detail]))}><Download size={14} />Export this page</button></PageHeading>
    <ErrorNotice message={error} onRetry={() => setRevision(v => v + 1)} /><div className={panel}><form onSubmit={e => { e.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) return toast.warning('Check your date range.'); setPage(1); setFilters({ ...draft }); }} className="mb-6 flex flex-wrap items-end gap-3"><label className="min-w-48 flex-1 text-xs text-[#888]">Search<input className={`${field} mt-2`} placeholder="Admin, action, or detail…" value={draft.search} onChange={e => setDraft({ ...draft, search: e.target.value })} /></label><label className="text-xs text-[#888]">Action<select className={`${field} mt-2 max-w-52`} value={draft.action} onChange={e => setDraft({ ...draft, action: e.target.value })}><option value="">All actions</option>{data.actions.map(action => <option key={action} value={action}>{label(action)}</option>)}</select></label>{['from', 'to'].map(key => <label key={key} className="text-xs capitalize text-[#888]">{key}<input type="date" className={`${field} mt-2`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}<button className={button}>Apply</button><button type="button" className={button} onClick={() => { const blank = { search: '', action: '', from: '', to: '' }; setDraft(blank); setFilters(blank); setPage(1); }}>Reset</button></form><p className="text-xs text-[#999]">{loading ? 'Loading…' : `${data.total} matching records`}</p>
    {loading ? <p role="status" className="py-12 text-center text-sm text-[#999]">Loading activity…</p> : error ? null : !data.items.length ? <Empty>No activity matches these filters.</Empty> : <div className="space-y-2">{data.items.map(log => <details key={log._id} className="rounded-lg border border-[#eaeae7] p-4 open:bg-[#fafaf8]"><summary className="cursor-pointer text-sm"><span className="ml-2 inline-flex flex-wrap items-center gap-x-4 gap-y-2"><span className="text-[11px] text-[#999]">{time(log.createdAt)}</span><strong className="font-medium">{log.adminName}</strong><span className={`rounded-full px-2 py-1 text-[10px] capitalize ${/DELETE|REJECT|RESET/.test(log.action) ? 'bg-red-50 text-red-700' : 'bg-[#f0f2ed] text-[#64755b]'}`}>{label(log.action)}</span><span className="text-xs text-[#999]">{log.target}</span></span></summary><p className="mb-0 mt-4 border-t border-[#eee] pt-3 text-sm leading-6 whitespace-pre-wrap break-words text-[#666]">{log.detail}</p></details>)}</div>}<Pager page={page} pages={Math.ceil(data.total / 25)} onChange={setPage} busy={loading} /></div>
    {superadmin && <details className="mt-7 rounded-lg border border-[#eee] p-4"><summary className="cursor-pointer text-xs text-[#999]">Log maintenance</summary><p className="text-xs text-[#888]">Clearing removes the entire recorded history.</p><button className={`${button} text-red-600!`} onClick={() => setClear(true)}><Trash2 size={14} />Clear all logs</button></details>}
    <Modal open={clear} title="Clear all activity logs?" busy={clearing} onClose={() => setClear(false)}><p className="text-sm leading-6 text-[#777]">This permanently removes all activity records, including records outside the current filters. This cannot be undone.</p><button className={`${button} text-red-600!`} disabled={clearing} onClick={clearLogs}>{clearing ? 'Clearing…' : 'Permanently clear logs'}</button></Modal>
  </section>;
}
