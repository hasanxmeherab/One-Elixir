import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, ArrowUpRight, Plus, Clock, AlertCircle, Wallet, Package, Users, ChevronRight } from 'lucide-react';
import adminAxios from '../../utils/adminAxios';
import { expenseDay } from '../../utils/expenseRecords';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';

const button = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e2e2df] bg-white px-3.5 py-2.5 text-xs font-medium text-[#555] no-underline hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:opacity-50';
const card = 'min-w-0 rounded-xl border border-[#e7e7e5] bg-white p-5 sm:p-6';
const field = 'min-w-0 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-xs text-[#555] outline-none focus:border-[#dc4939]';
const money = value => `${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })} TK`;
const shiftDay = (value, days) => new Date(Date.parse(`${value}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const presetDates = days => { const to = expenseDay(); return { from: shiftDay(to, 1 - days), to }; };
const dateLabel = value => new Date(`${value}T00:00:00+06:00`).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short' });
const changeText = (current, previous, percent = false) => {
  if (percent) return `${Math.round((current - previous) * 100) / 100 > 0 ? '+' : ''}${Math.round((current - previous) * 100) / 100} percentage points vs previous period`;
  if (!previous) return current ? 'No previous-period baseline' : 'No change vs previous period';
  const difference = Math.round((current - previous) / previous * 1000) / 10;
  return `${difference > 0 ? '+' : ''}${difference}% vs previous period`;
};

export default function AdminDashboard() {
  const toast = useToast();
  const [dates, setDates] = useState(() => presetDates(30));
  const [preset, setPreset] = useState('30');
  const [draft, setDraft] = useState(() => presetDates(30));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [chartMode, setChartMode] = useState('money');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const refresh = () => setRevision(value => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    adminAxios.get('/api/dashboard', { params: dates, signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setData(response.data); })
      .catch(requestError => { if (!controller.signal.aborted) setError(requestError.response?.data?.message === 'Route not found' ? 'Dashboard API is not deployed yet. Deploy the updated backend, then refresh.' : requestError.response?.data?.message || 'Could not load the dashboard. Please retry.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [dates, revision]);
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  const selectPreset = value => {
    setPreset(value);
    if (value !== 'custom') { const next = presetDates(Number(value)); setDates(next); setDraft(next); }
  };
  const applyCustom = event => {
    event.preventDefault();
    const days = (Date.parse(draft.to) - Date.parse(draft.from)) / 86400000 + 1;
    if (!Number.isFinite(days) || days < 1 || days > 366) { toast.warning('Select a date range of 1 to 366 days.'); return; }
    setDates({ ...draft });
  };
  const resetBalances = async () => {
    setConfirmReset(false); setResetting(true);
    try { await adminAxios.post('/api/settlements/reset-ledger'); toast.success('Accounting balances reset.'); refresh(); }
    catch (requestError) { toast.error(requestError.response?.data?.message || 'Could not reset balances.'); }
    finally { setResetting(false); }
  };
  const business = data?.isSuperadmin;
  const headlineCards = data ? [
    { label: 'Orders placed', key: 'orders', format: value => value, note: 'Active orders created in this period' },
    { label: business ? 'Customer collections' : 'My collections', key: 'collections', format: money, note: 'Ledger entries + saved payment receipts by date' },
    business ? { label: 'Completed sales', key: 'completedSales', format: money, note: 'Delivered & paid orders placed in period' } : { label: 'Delivered rate', key: 'deliveredRate', format: value => `${value}%`, percent: true, note: 'Delivered share of orders placed in period' },
    business ? { label: 'Expenses', key: 'expenses', format: money, note: 'Expense dates within this period' } : { label: 'Completed sales', key: 'completedSales', format: money, note: 'Business delivered & paid orders in period' },
  ] : [];
  const snapshot = data?.snapshot;
  const moneyCards = data ? business ? [
    { label: 'Customer balances due', value: snapshot.customerDue, note: 'Active order totals less customer payments', path: '/admin/order-list?due=1' },
    { label: 'Held by regular admins', value: snapshot.adminHeld, note: 'Outstanding collection ledger balances', path: '/admin/settlements' },
    { label: 'My superadmin holding', value: snapshot.myHolding, note: 'Direct collections + received funds − vault transfers', path: '/admin/settlements' },
    { label: 'Transferred to vault', value: snapshot.vault, note: 'Recorded vault transfers; not spendable-cash inference', path: '/admin/settlements' },
    { label: 'Net capital recorded', value: snapshot.netCapital, note: 'Investor contributions less withdrawals', path: '/admin/investment' },
    { label: 'All-time expenses', value: snapshot.allExpenses, note: 'Recorded expenditure, shown separately', path: '/admin/expenses' },
  ] : [
    { label: 'My outstanding settlement balance', value: snapshot.myOutstanding, note: 'My collections + adjustments − settled amounts', path: '/admin/settlements' },
    { label: 'My total collections', value: snapshot.myCollected, note: 'Recorded in the current ledger', path: '/admin/settlements' },
    { label: 'Customer balances due', value: snapshot.customerDue, note: 'Business snapshot of active unpaid balances', path: '/admin/order-list?due=1' },
  ] : [];

  return <section className="mx-auto max-w-[1500px] pb-16 text-[#242424] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-[#dc4939] [&_button:focus-visible]:outline-offset-3 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-[#dc4939] [&_a:focus-visible]:outline-offset-3">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-5"><div><p className="mb-2.5 text-[11px] font-bold tracking-[2px] text-[#dc4939]">OVERVIEW / {business ? 'BUSINESS' : 'OPERATIONS'}</p><h1 className="m-0 text-[clamp(26px,3vw,38px)] leading-tight font-semibold tracking-[-.7px]">A clearer view of  business.</h1><p className="mt-3 text-sm text-[#888]">What needs attention, where money sits, and how business is moving.</p></div><div className="flex flex-wrap gap-2"><Link className={button} to="/admin/manual-order"><Plus size={14} /> New order</Link><Link className={button} to="/admin/inventory">Inventory</Link><button className={button} disabled={loading} onClick={refresh}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button></div></header>
    <div className="mb-5 rounded-xl border border-[#e7e7e5] bg-[#fafaf8] p-4"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-1.5" aria-label="Dashboard date range">{[{ value: '1', label: 'Today' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: 'custom', label: 'Custom' }].map(option => <button key={option.value} aria-pressed={preset === option.value} className={`cursor-pointer rounded-lg border px-3.5 py-2 text-xs ${preset === option.value ? 'border-[#222] bg-[#222] text-white' : 'border-[#e5e5e2] bg-white text-[#777]'}`} onClick={() => selectPreset(option.value)}>{option.label}</button>)}</div><p className="m-0 text-[11px] text-[#999]">{dates.from} — {dates.to} · Bangladesh time</p></div>{preset === 'custom' && <form onSubmit={applyCustom} className="mt-4 flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1 text-[11px] text-[#888]">From<input required type="date" className={field} max={draft.to} value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /></label><label className="flex flex-col gap-1 text-[11px] text-[#888]">To<input required type="date" className={field} min={draft.from} value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} /></label><button className={button}>Apply range</button></form>}<p className="mb-0 mt-3 text-[10px] leading-relaxed text-[#999]">Period metrics follow this date range. Balances, stock, and customer counts below are current snapshots.</p></div>
    {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700"><AlertCircle size={16} className="shrink-0" /><div>{error}<button className="ml-3 cursor-pointer underline" onClick={refresh}>Retry</button></div></div>}
    {loading ? <div role="status" aria-label="Loading dashboard" className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map(value => <div key={value} className="h-36 rounded-xl bg-[#f1f1ef]" />)}</div> : !error && data && <>
      <section className="mb-6 rounded-xl border border-[#ded9d1] bg-[#faf8f4] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-medium text-[#777]">Current balance</p>
            <strong className="my-3 block text-3xl font-semibold tracking-tight">{snapshot.currentBalance == null ? 'Unavailable' : money(snapshot.currentBalance)}</strong>
            <p className="m-0 max-w-[650px] text-[11px] leading-relaxed text-[#999]">Recorded customer payments + net investor capital - expenses. Includes money held by admins; this is a recorded balance, not vault-only cash.</p>
          </div>
          <span className="rounded border border-[#e5e0d8] bg-white px-2 py-1 text-[10px] text-[#999]">Current snapshot - independent of date filter</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#e8e3db] pt-3 text-[11px] text-[#888]">
          <span>Customer payments: {snapshot.recordedCustomerPayments == null ? 'Unavailable' : money(snapshot.recordedCustomerPayments)}</span>
          <span>Net capital: {snapshot.netCapital == null ? 'Unavailable' : money(snapshot.netCapital)}</span>
          <span>Expenses: {snapshot.allExpenses == null ? 'Unavailable' : money(snapshot.allExpenses)}</span>
        </div>
      </section>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{headlineCards.map(metric => <div className="rounded-xl border border-[#e7e7e5] bg-white p-5" key={metric.key}><p className="m-0 text-xs text-[#888]">{metric.label}</p><strong className="my-3 block text-2xl font-semibold">{metric.format(data.current[metric.key])}</strong><p className="m-0 text-[11px] text-[#777]">{changeText(data.current[metric.key], data.previous[metric.key], metric.percent)}</p><p className="mb-0 mt-2 text-[10px] leading-relaxed text-[#aaa]">{metric.note}</p></div>)}</div>
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-[#fafaf8] px-5 py-3 text-[11px] text-[#888]"><span>Delivered rate: <strong className="font-medium text-[#444]">{data.current.deliveredRate}%</strong></span><span>Average completed order: <strong className="font-medium text-[#444]">{data.current.completedOrders ? money(data.current.completedSales / data.current.completedOrders) : '?'}</strong></span><span>{data.current.completedOrders} delivered & paid orders placed in period</span></div>
      <section className={`${card} mb-6`}><div className="mb-4 flex items-center gap-2"><AlertCircle size={17} className="text-[#dc4939]" /><h2 className="m-0 font-sans text-base font-semibold">Needs attention</h2><span className="ml-auto text-[10px] text-[#aaa]">Current snapshot</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.attention.map(item => <Link key={item.label} to={item.path} className={`flex items-center justify-between gap-3 rounded-lg border p-4 no-underline ${item.count ? 'border-[#eee0d4] bg-[#fffaf5] text-[#5b4437]' : 'border-[#eeedea] bg-[#fafaf8] text-[#888]'}`}><span className="text-xs">{item.label}</span><strong className="ml-auto text-xl font-semibold">{item.count}</strong><ChevronRight size={14} /></Link>)}</div></section>
      <section className={`${card} mb-6`}><div className="mb-2 flex flex-wrap items-center justify-between gap-3"><h2 className="m-0 flex items-center gap-2 font-sans text-base font-semibold"><Wallet size={17} className="text-[#dc4939]" />{business ? 'Money overview' : 'My collections & settlements'}</h2><Link className="flex items-center gap-1 text-xs text-[#888] no-underline hover:text-[#dc4939]" to="/admin/settlements">Open settlements <ArrowUpRight size={13} /></Link></div><p className="mb-5 text-[11px] leading-relaxed text-[#999]">Current snapshots. These categories overlap and must not be added together as available cash.{data.resetAt ? ` Ledger balances reflect the reset on ${expenseDay(data.resetAt)}.` : ''}</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{moneyCards.map(metric => <Link key={metric.label} to={metric.path} className="rounded-lg border border-[#eeedea] bg-[#fafaf8] p-4 text-inherit no-underline hover:border-[#ccc]"><span className="text-xs text-[#888]">{metric.label}</span><strong className="my-2 block text-xl font-semibold">{money(metric.value)}</strong><small className="text-[10px] leading-relaxed text-[#999]">{metric.note}</small></Link>)}</div>{business && data.adminBalances.some(admin => admin.role !== 'superadmin') && <details className="mt-5 border-t border-[#eee] pt-4"><summary className="cursor-pointer text-xs text-[#777]">Balances by admin</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.adminBalances.filter(admin => admin.role !== 'superadmin').map(admin => <div className="flex justify-between gap-3 rounded-lg bg-[#fafaf8] p-3 text-xs" key={admin.id}><span>{admin.name}</span><strong className="font-medium">{money(admin.outstanding)}</strong></div>)}</div></details>}</section>
      {data.collectionCoverage > 0 && <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">{data.collectionCoverage} active paid/part-paid orders have no matching collection ledger entry. Saved receipts with a recorded payment date are included in collections. Payments without a known receipt date remain excluded; review their payment records. This does not change settlement balances.</p>}
      <section className={`${card} mb-6`}><div className="mb-2 flex flex-wrap items-center justify-between gap-3"><h2 className="m-0 font-sans text-base font-semibold">{chartMode === 'money' ? business ? 'Collections & expenses' : 'My collection trend' : 'Order volume'}</h2><div className="flex gap-2">{['money', 'orders'].map(mode => <button key={mode} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[11px] ${chartMode === mode ? 'border-[#222] bg-[#222] text-white' : 'border-[#eee] bg-white text-[#888]'}`} onClick={() => setChartMode(mode)} aria-pressed={chartMode === mode}>{mode === 'money' ? 'Money' : 'Orders'}</button>)}</div></div><p className="mb-5 text-[11px] text-[#999]">{chartMode === 'money' ? 'Collections use ledger dates or saved receipt dates when no collection ledger entry exists. Expenses use expense dates.' : 'Active orders by placement date, excluding canceled orders.'}</p><div className="h-[280px] w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trend} margin={{ top: 12, right: 12, left: 4, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} /><XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={25} tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis width={55} tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={value => value >= 1000 ? `${Math.round(value / 100) / 10}k` : value} /><Tooltip labelFormatter={dateLabel} formatter={(value, name) => [chartMode === 'orders' ? value : money(value), name]} contentStyle={{ borderRadius: 8, borderColor: '#eee', fontSize: 12 }} /><Area type="monotone" dataKey={chartMode === 'orders' ? 'orders' : 'collections'} name={chartMode === 'orders' ? 'Orders' : business ? 'Collections' : 'My collections'} stroke="#dc4939" fill="#dc4939" fillOpacity={0.1} strokeWidth={2} dot={data.trend.length === 1 ? { r: 3 } : false} />{chartMode === 'money' && business && <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#7d879b" fill="#7d879b" fillOpacity={0.06} strokeWidth={2} />}</AreaChart></ResponsiveContainer></div></section>
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2"><section className={card}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="m-0 font-sans text-base font-semibold">Product performance</h2><span className="text-[10px] text-[#aaa]">Selected period</span></div><p className="mb-4 text-[11px] leading-relaxed text-[#999]">Delivered & paid orders placed in period. Item and order discounts allocated to goods; delivery excluded. Cost margins are omitted without a reliable historical cost basis.</p>{data.topProducts.length ? <div className="space-y-3">{data.topProducts.map(product => <div key={product.id} className="border-b border-[#eee] pb-3 last:border-0"><div className="flex items-start justify-between gap-4 text-xs"><span className="min-w-0 [overflow-wrap:anywhere]">{product.name}<small className="mt-1 block text-[10px] text-[#aaa]">{product.units} units sold</small></span><strong className="shrink-0 font-medium">{money(product.revenue)}</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]"><div className="h-full rounded-full bg-[#cf9d88]" style={{ width: `${data.topProducts[0].revenue > 0 ? product.revenue / data.topProducts[0].revenue * 100 : 0}%` }} /></div></div>)}</div> : <p className="py-8 text-center text-xs text-[#aaa]">No completed product sales in this period.</p>}</section>
        <section className={card}><div className="mb-4 flex items-center justify-between gap-3"><h2 className="m-0 flex items-center gap-2 font-sans text-base font-semibold"><Clock size={16} className="text-[#dc4939]" /> Recent activity</h2><span className="text-[10px] text-[#aaa]">Selected period</span></div>{data.activity.length ? <div className="max-h-[440px] overflow-y-auto">{data.activity.map(entry => <Link key={entry.key} to={entry.path} className="flex items-start gap-3 border-b border-[#eee] py-3 text-inherit no-underline last:border-0 hover:bg-[#fafaf8]"><span className="mt-0.5 rounded bg-[#f3eeea] px-2 py-1 text-[9px] text-[#967c70]">{entry.type}</span><span className="min-w-0 flex-1 text-xs [overflow-wrap:anywhere]">{entry.text}<small className="mt-1 block text-[10px] text-[#aaa]">{new Date(entry.date).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span><strong className="shrink-0 text-[11px] font-medium">{money(entry.amount)}</strong></Link>)}</div> : <p className="py-8 text-center text-xs text-[#aaa]">No activity in this period.</p>}</section></div>
      <section className={card}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="m-0 flex items-center gap-2 font-sans text-base font-semibold"><Package size={17} className="text-[#dc4939]" /> Stock & customers</h2><span className="text-[10px] text-[#aaa]">Current snapshots</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[{ label: 'Units in stock', value: snapshot.stockUnits, icon: Package }, { label: 'Retail value of stock', value: money(snapshot.retailStockValue), icon: Wallet }, { label: 'Customers with active orders', value: snapshot.customers, icon: Users }].map(metric => <div key={metric.label} className="rounded-lg bg-[#fafaf8] p-4"><span className="text-xs text-[#888]">{metric.label}</span><strong className="mt-2 block text-xl font-semibold">{metric.value}</strong></div>)}</div><p className="my-3 text-[10px] text-[#999]">Retail stock value uses each size’s listed price, not inventory cost. Customers are grouped by normalized phone, with email fallback.</p><div className="grid gap-5 sm:grid-cols-2">{[{ label: 'Low stock · fewer than 5 units', items: snapshot.lowStock, filter: 'low' }, { label: 'Sold out', items: snapshot.outOfStock, filter: 'out' }].map(group => <div key={group.filter}><h3 className="mb-3 font-sans text-xs font-medium text-[#777]">{group.label}</h3>{group.items.length ? <div className="max-h-48 overflow-y-auto">{group.items.slice(0, 10).map((item, index) => <Link className="flex justify-between gap-3 border-b border-[#eee] py-2 text-xs text-[#666] no-underline hover:text-[#dc4939]" key={`${item.id}-${index}`} to={`/admin/inventory?stock=${group.filter}`}><span>{item.name}{item.size ? ` · ${item.size}` : ''}</span><span>{item.stock}</span></Link>)}<Link to={`/admin/inventory?stock=${group.filter}`} className="mt-3 inline-block text-[11px] text-[#a75449]">View all {group.items.length} alerts →</Link></div> : <p className="text-xs text-[#aaa]">No alerts.</p>}</div>)}</div></section>
      <p className="mt-5 text-[10px] text-[#aaa]">Updated {new Date(data.generatedAt).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka' })} Bangladesh time · Refreshes every minute while visible. Comparison period: {data.range.previousFrom} — {data.range.previousTo}.</p>
      {business && <details className="mt-8 rounded-lg border border-[#eee] p-4"><summary className="cursor-pointer text-xs text-[#999]">Accounting maintenance</summary><p className="mt-3 text-[11px] text-[#999]">Resetting the ledger is a separate administrative action and does not correct order payment history.</p><button className="mt-2 cursor-pointer rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 disabled:opacity-50" disabled={resetting} onClick={() => setConfirmReset(true)}>{resetting ? 'Resetting…' : 'Reset accounting balances'}</button></details>}
    </>}
    <ConfirmDialog isOpen={confirmReset} type="danger" title="Reset accounting balances?" message="This permanently clears the payment ledger and settlement balances. It cannot be undone." confirmText="Reset balances" cancelText="Cancel" onCancel={() => setConfirmReset(false)} onConfirm={resetBalances} />
  </section>;
}
