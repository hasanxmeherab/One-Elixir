import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, UserPlus, ArrowLeft, Download, Search, Trash2, Wallet, Users, ArrowDownLeft } from 'lucide-react';
import adminAxios from '../../utils/adminAxios';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import { expenseDay } from '../../utils/expenseRecords';
import { investmentHistory, investmentType, filterInvestments, investmentSum, investmentCsv } from '../../utils/investmentRecords';

const PAGE_SIZE = 10;
const money = value => `${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })} TK`;
const field = 'w-full min-w-0 rounded-lg border border-[#e2e2df] bg-white px-3 py-2.5 text-[13px] font-normal text-[#333] outline-none focus:border-[#dc4939] focus:ring-2 focus:ring-[#dc4939]/10';
const label = 'flex min-w-0 flex-col gap-2 text-xs font-medium text-[#777]';
const button = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e2e2df] bg-white px-3.5 py-2.5 text-xs font-medium text-[#555] hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:opacity-50';
const primary = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#222] bg-[#222] px-3.5 py-2.5 text-xs font-medium text-white hover:bg-[#444] disabled:cursor-not-allowed disabled:opacity-50';
const freshForm = () => ({ investorName: '', amount: '', note: '', type: 'Contribution', date: expenseDay() });
const emptyFilters = () => ({ search: '', investor: 'ALL', type: 'ALL', from: '', to: '' });

export default function InvestmentTracker() {
  const [query] = useSearchParams();
  const toast = useToast();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeForm, setActiveForm] = useState(null);
  const [newInvestorName, setNewInvestorName] = useState('');
  const [form, setForm] = useState(freshForm);
  const [filters, setFilters] = useState(emptyFilters);
  useEffect(() => { setFilters(previous => ({ ...previous, investor: query.get('investor') || 'ALL' })); }, [query]);
  const [investorSearch, setInvestorSearch] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const submitLock = useRef(false);
  const deleteLock = useRef(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const fetchData = async () => {
    setLoading(true); setLoadError('');
    try {
      const { data } = await adminAxios.get(`${API_URL}/api/investments`);
      if (!Array.isArray(data)) throw new Error('Unexpected investment response.');
      setInvestments(data);
    } catch { setLoadError('Could not load investments. Please try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setPage(1); }, [filters]);
  const history = useMemo(() => investmentHistory(investments), [investments]);
  const filtered = useMemo(() => filterInvestments(history, filters), [history, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const today = expenseDay();
  const netCapital = Math.round(investments.reduce((sum, investor) => sum + (Number(investor.totalAmount) || 0), 0) * 100) / 100;
  const monthlyContributions = investmentSum(history.filter(entry => entry.amount > 0 && entry.date && expenseDay(entry.date).slice(0, 7) === today.slice(0, 7)));
  const selectedInvestor = investments.find(investor => investor._id === filters.investor);
  const investorCards = investments.filter(investor => investor.investorName.toLowerCase().includes(investorSearch.trim().toLowerCase()));
  const openForm = type => {
    setNewInvestorName('');
    setForm({ ...freshForm(), investorName: selectedInvestor?.investorName || '' });
    setActiveForm(type);
  };
  const closeForm = () => { if (!submitLock.current) setActiveForm(null); };
  const updateInvestor = investor => setInvestments(previous => previous.some(entry => entry._id === investor._id) ? previous.map(entry => entry._id === investor._id ? investor : entry) : [investor, ...previous]);
  const save = async event => {
    event.preventDefault();
    if (submitLock.current) return;
    const name = (activeForm === 'investor' ? newInvestorName : form.investorName).trim();
    if (!name) { toast.warning('Enter or select an investor.'); return; }
    if (activeForm === 'investor' && investments.some(investor => investor.investorName.trim().toLowerCase() === name.toLowerCase())) { toast.warning('This investor already exists. Select their account to record a transaction.'); return; }
    const amount = Math.round(Number(form.amount) * 100) / 100;
    if (activeForm === 'transaction' && (!Number.isFinite(amount) || amount <= 0 || !form.date)) { toast.warning('Enter a positive amount and valid date.'); return; }
    submitLock.current = true; setSaving(true);
    try {
      const payload = activeForm === 'investor' ? { investorName: name, amount: 0, note: 'New Account', date: today } : { investorName: name, amount: form.type === 'Withdrawal' ? -amount : amount, note: form.note.trim() || (form.type === 'Withdrawal' ? 'Capital withdrawal' : 'Capital contribution'), date: form.date };
      const { data } = await adminAxios.post(`${API_URL}/api/investments/add`, payload);
      updateInvestor(data);
      toast.success(activeForm === 'investor' ? 'Investor account created.' : `${form.type} recorded.`);
      setActiveForm(null); setNewInvestorName(''); setForm(freshForm());
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save. Your entries have been kept.'); }
    finally { submitLock.current = false; setSaving(false); }
  };
  const remove = async entry => {
    if (deleteLock.current || !window.confirm(`Remove this ${investmentType(entry.amount).toLowerCase()} for ${entry.investorName}? The investor balance will change.`)) return;
    deleteLock.current = true; setDeleting(entry._id);
    try {
      await adminAxios.delete(`${API_URL}/api/investments/${entry.investorId}/transaction/${entry._id}`);
      setInvestments(previous => previous.map(investor => investor._id === entry.investorId ? { ...investor, totalAmount: Math.round((Number(investor.totalAmount || 0) - entry.amount) * 100) / 100, transactions: investor.transactions.filter(transaction => transaction._id !== entry._id) } : investor));
      toast.success('Transaction removed and balance updated.');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not remove transaction.'); }
    finally { deleteLock.current = false; setDeleting(null); }
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([investmentCsv(filtered)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `investments-${today}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="mx-auto max-w-[1440px] pb-16 text-[#242424] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-[#dc4939] [&_button:focus-visible]:outline-offset-3">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-5"><div><p className="mb-2.5 text-[11px] font-bold tracking-[2px] text-[#dc4939]">FINANCES / INVESTMENTS</p><h1 className="m-0 text-[clamp(26px,3vw,38px)] leading-tight font-semibold tracking-[-.7px]">Capital with a clear history.</h1><p className="mt-3 text-sm text-[#888]">Track investor contributions, withdrawals, and the details behind every entry.</p></div>{!activeForm && <div className="flex flex-wrap gap-2"><button className={button} onClick={() => openForm('investor')} disabled={loading}><UserPlus size={15} /> Add investor</button><button className={primary} onClick={() => openForm('transaction')} disabled={loading || !investments.length}><Plus size={16} /> Record transaction</button></div>}</header>
    {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">{loadError}<button className={button} disabled={loading} onClick={fetchData}>Retry</button></div>}
    {activeForm ? <div className="max-w-[800px] rounded-xl border border-[#e7e7e5] bg-white"><header className="border-b border-[#eeedea] bg-[#fafaf8] p-5 sm:p-6"><button className="flex cursor-pointer items-center gap-2 border-0 bg-transparent text-xs text-[#888] disabled:opacity-50" disabled={saving} onClick={closeForm}><ArrowLeft size={14} /> Back to investments</button><h2 className="mt-3 text-2xl font-semibold">{activeForm === 'investor' ? 'Add an investor' : 'Record a transaction'}</h2></header>
      <form onSubmit={save}><fieldset disabled={saving} className="m-0 min-w-0 border-0 p-5 sm:p-6"><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {activeForm === 'investor' ? <label className={`${label} sm:col-span-2`}>Investor name<input autoFocus required maxLength={100} className={field} value={newInvestorName} onChange={event => setNewInvestorName(event.target.value)} placeholder="Full name" /><small className="font-normal leading-relaxed text-[#999]">Creates an account with no contribution. Record transactions separately.</small></label> : <>
          <label className={label}>Investor<select autoFocus required className={field} value={form.investorName} onChange={event => setForm({ ...form, investorName: event.target.value })}><option value="">Select investor</option>{investments.map(investor => <option key={investor._id} value={investor.investorName}>{investor.investorName}</option>)}</select></label><label className={label}>Transaction type<select className={field} value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option>Contribution</option><option>Withdrawal</option></select></label>
          <label className={label}>Amount (TK)<input required type="number" min="0.01" step="0.01" className={field} value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="Enter a positive amount" /><small className="font-normal text-[#999]">{form.type === 'Withdrawal' ? 'Deducted from the investor’s recorded capital.' : 'Added to the investor’s recorded capital.'}</small></label><label className={label}>Transaction date<input required type="date" className={field} value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label className={`${label} sm:col-span-2`}>Note <textarea rows={3} maxLength={500} className={`${field} resize-y`} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="Optional context or reference for this transaction" /></label>
        </>}
      </div><div className="mt-6 flex flex-wrap gap-3 border-t border-[#eeedea] pt-5"><button type="submit" className={primary} disabled={saving}>{saving ? 'Saving…' : activeForm === 'investor' ? 'Create investor' : 'Save transaction'}</button><button type="button" className={button} disabled={saving} onClick={closeForm}>Cancel</button></div></fieldset></form>
    </div> : <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: 'Net capital recorded', value: money(netCapital), note: 'Contributions less withdrawals', icon: Wallet }, { label: 'Investors', value: investments.length, note: 'Registered investor accounts', icon: Users }, { label: 'This month’s contributions', value: money(monthlyContributions), note: today.slice(0, 7), icon: ArrowDownLeft }, { label: 'Filtered net total', value: money(investmentSum(filtered)), note: `${filtered.length} matching entries`, icon: Wallet }].map(card => <div key={card.label} className="rounded-xl border border-[#e7e7e5] bg-[#fafaf9] p-4 sm:p-5"><div className="flex items-start justify-between gap-2 text-xs text-[#888]"><span>{card.label}</span><card.icon size={15} className="shrink-0 text-[#b29b8e]" /></div><strong className="my-2 block text-lg font-semibold sm:text-2xl">{(loading || loadError) && !investments.length ? '—' : card.value}</strong><small className="text-[10px] text-[#aaa]">{card.note}</small></div>)}</div>
      <section className="mb-7 rounded-xl border border-[#e7e7e5] p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="m-0 font-sans text-base font-semibold">Investor overview</h2><input type="search" aria-label="Search investors" className={`${field} max-w-[260px]`} placeholder="Find an investor…" value={investorSearch} onChange={event => setInvestorSearch(event.target.value)} /></div><div className="grid max-h-[350px] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {investorCards.map(investor => <button key={investor._id} aria-pressed={filters.investor === investor._id} className={`cursor-pointer rounded-lg border p-4 text-left transition-colors ${filters.investor === investor._id ? 'border-[#dc4939] bg-[#fff6f3]' : 'border-[#e7e7e5] bg-[#fafaf8] hover:border-[#ccc]'}`} onClick={() => setFilters({ ...filters, investor: filters.investor === investor._id ? 'ALL' : investor._id })}><strong className="block text-[13px] font-semibold [overflow-wrap:anywhere]">{investor.investorName}</strong><span className="mt-2 block text-lg font-medium">{money(investor.totalAmount)}</span><small className="mt-1 block text-[10px] text-[#999]">Net capital · {(investor.transactions || []).filter(transaction => Number(transaction.amount) !== 0).length} transactions</small></button>)}
      </div>{!investorCards.length && <p className="py-3 text-center text-xs text-[#999]">{loading ? 'Loading investors…' : loadError ? 'Investor accounts are unavailable.' : investments.length ? 'No investors match your search.' : 'Add your first investor to start tracking capital.'}</p>}</section>
      <div className="mb-4 flex flex-wrap items-end gap-3"><label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#e2e2df] px-3 py-2.5 text-[#aaa] focus-within:border-[#dc4939]"><Search size={15} /><input className="w-full min-w-0 border-0 text-[13px] text-[#444] outline-none" aria-label="Search transactions by investor or note" placeholder="Search investor or note…" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} /></label><label className={label}>Investor<select className={field} value={filters.investor} onChange={event => setFilters({ ...filters, investor: event.target.value })}><option value="ALL">All investors</option>{investments.map(investor => <option key={investor._id} value={investor._id}>{investor.investorName}</option>)}</select></label><label className={label}>Type<select className={field} value={filters.type} onChange={event => setFilters({ ...filters, type: event.target.value })}><option value="ALL">All entries</option><option>Contribution</option><option>Withdrawal</option><option>Account opened</option></select></label><label className={label}>From<input className={field} type="date" max={filters.to || undefined} value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label><label className={label}>To<input className={field} type="date" min={filters.from || undefined} value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} /></label><button className={button} disabled={!filtered.length || loading || Boolean(loadError)} onClick={exportCsv}><Download size={14} /> Export CSV</button></div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#999]"><span>{loading ? 'Loading transactions…' : `${filtered.length} entries · Page ${currentPage} of ${totalPages}`}{selectedInvestor ? ` · ${selectedInvestor.investorName}` : ''}</span>{(filters.search || filters.investor !== 'ALL' || filters.type !== 'ALL' || filters.from || filters.to) && <button className="cursor-pointer border-0 bg-transparent text-[#a75449]" onClick={() => setFilters(emptyFilters())}>Clear filters</button>}</div>
      <div className="rounded-xl border border-[#e7e7e5] max-[900px]:border-0"><table className="w-full border-collapse text-left max-[900px]:block"><thead className="bg-[#f8f8f6] max-[900px]:hidden"><tr>{['Date', 'Investor', 'Type', 'Note', 'Amount', 'Action'].map(heading => <th key={heading} className="border-b border-[#e7e7e5] px-4 py-3.5 text-[10px] font-semibold tracking-wide text-[#888] uppercase">{heading}</th>)}</tr></thead><tbody className="max-[900px]:block">
        {visible.map(entry => <tr key={`${entry.investorId}-${entry._id}`} className="border-b border-[#eeedea] last:border-b-0 hover:bg-[#fdfcfb] max-[900px]:mb-3 max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-4 max-[900px]:rounded-xl max-[900px]:border max-[900px]:border-[#e7e7e5] max-[900px]:p-4 max-[900px]:last:border-b [&>td]:px-4 [&>td]:py-4 [&>td]:text-xs max-[900px]:[&>td]:min-w-0 max-[900px]:[&>td]:p-0 max-[900px]:[&>td]:before:mb-1 max-[900px]:[&>td]:before:block max-[900px]:[&>td]:before:text-[9px] max-[900px]:[&>td]:before:text-[#999] max-[900px]:[&>td]:before:uppercase max-[900px]:[&>td]:before:content-[attr(data-label)]"><td data-label="Date">{entry.date ? expenseDay(entry.date) : '—'}</td><td data-label="Investor" className="font-medium [overflow-wrap:anywhere]">{entry.investorName}</td><td data-label="Type"><span className={`inline-block rounded px-2 py-1 text-[10px] ${entry.amount > 0 ? 'bg-[#edf6ef] text-[#397451]' : entry.amount < 0 ? 'bg-[#fff0ed] text-[#bd5142]' : 'bg-[#f0efed] text-[#888]'}`}>{investmentType(entry.amount)}</span></td><td data-label="Note" className="max-w-[260px] text-[#888] [overflow-wrap:anywhere] max-[900px]:col-span-full max-[900px]:max-w-none">{entry.note || '—'}</td><td data-label="Amount" className={entry.amount > 0 ? 'font-medium text-[#397451]' : entry.amount < 0 ? 'font-medium text-[#bd5142]' : 'text-[#999]'}>{entry.amount > 0 ? '+' : ''}{money(entry.amount)}</td><td data-label="Action"><button className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent py-2 text-[11px] text-[#bd5142] disabled:opacity-50" disabled={Boolean(deleting)} onClick={() => remove(entry)} aria-label={`Remove transaction for ${entry.investorName}`}><Trash2 size={12} />{deleting === entry._id ? 'Removing…' : 'Remove'}</button></td></tr>)}
        {!visible.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-xs text-[#999] max-[900px]:block"><Wallet size={26} className="mx-auto mb-3" />{loading ? 'Loading transactions…' : loadError ? 'Transactions are unavailable.' : history.length ? 'No transactions match these filters.' : 'No transactions recorded yet.'}</td></tr>}
      </tbody></table></div><p className="mt-4 text-[11px] leading-relaxed text-[#999]">Net capital is recorded contributions less withdrawals. Legacy zero-value entries are shown as account openings.</p><Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </>}
  </section>;
}
