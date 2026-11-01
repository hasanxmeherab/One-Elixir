import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import Select from 'react-select';
import { Plus, ArrowLeft, Pencil, Trash2, Download, Search, Receipt } from 'lucide-react';
import adminAxios from '../../utils/adminAxios';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import { expenseDay, expenseAmount, filterExpenses, sumExpenses, expensesCsv } from '../../utils/expenseRecords';

const CATEGORIES = ['Packaging', 'Ingredients', 'Marketing', 'Tools', 'Other'];
const PAGE_SIZE = 10;
const field = 'w-full min-w-0 rounded-lg border border-[#e2e2df] bg-white px-3 py-2.5 text-[13px] font-normal text-[#333] outline-none focus:border-[#dc4939] focus:ring-2 focus:ring-[#dc4939]/10 disabled:bg-[#f5f5f3]';
const button = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e2e2df] bg-white px-3.5 py-2.5 text-xs font-medium text-[#555] hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#222] bg-[#222] px-3.5 py-2.5 text-xs font-medium text-white hover:bg-[#444] disabled:cursor-not-allowed disabled:opacity-50';
const label = 'flex min-w-0 flex-col gap-2 text-xs font-medium text-[#777]';
const money = value => `${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })} TK`;
const freshForm = () => ({ title: '', amount: '', quantity: '', unitPrice: '', unit: 'pcs', category: 'Packaging', date: expenseDay() });
const categoryColors = { Packaging: 'bg-[#f4eefb] text-[#8064a8]', Ingredients: 'bg-[#edf6ef] text-[#397451]', Marketing: 'bg-[#fff5e3] text-[#a17021]', Tools: 'bg-[#eef3fc] text-[#4d70a2]', Other: 'bg-[#f0efed] text-[#888]' };

export default function ExpenseManagement() {
  const [query] = useSearchParams();
  const toast = useToast();
  const { perfumes = [] } = useOutletContext();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [mode, setMode] = useState('total');
  const [form, setForm] = useState(freshForm);
  const [filters, setFilters] = useState({ search: '', category: 'ALL', from: '', to: '' });
  useEffect(() => { setFilters(previous => ({ ...previous, search: query.get('search') || '' })); }, [query]);
  const [page, setPage] = useState(1);
  const submitLock = useRef(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const fetchExpenses = async () => {
    setLoading(true); setLoadError('');
    try {
      const { data } = await adminAxios.get(`${API_URL}/api/expenses`);
      if (!Array.isArray(data)) throw new Error('Unexpected expense response.');
      setExpenses(data);
    } catch { setLoadError('Could not load expenses. Please try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchExpenses(); }, []);
  useEffect(() => { setPage(1); }, [filters]);
  const filtered = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const today = expenseDay();
  const todayTotal = sumExpenses(expenses.filter(expense => expenseDay(expense.date) === today));
  const monthTotal = sumExpenses(expenses.filter(expense => expenseDay(expense.date).slice(0, 7) === today.slice(0, 7)));
  const amount = mode === 'calculated' ? expenseAmount(form.quantity, form.unitPrice) : Number(form.amount);
  const productOptions = useMemo(() => perfumes.flatMap(product => product.variants?.length
    ? product.variants.map(variant => ({ value: `${product.name} — ${variant.label}`, label: `${product.name} — ${variant.label}` }))
    : [{ value: product.name, label: product.name }]), [perfumes]);
  const setValue = (name, value) => setForm(previous => ({ ...previous, [name]: value }));
  const closeForm = () => { if (submitLock.current) return; setFormOpen(false); setEditId(null); setForm(freshForm()); };
  const openForm = expense => {
    setEditId(expense?._id || null);
    setForm(expense ? { title: expense.title, amount: expense.amount, quantity: expense.quantity ?? '', unitPrice: expense.unitPrice ?? '', unit: expense.unit || 'pcs', category: expense.category || 'Other', date: expenseDay(expense.date) } : freshForm());
    setMode(expense?.quantity > 0 && expense?.unitPrice > 0 && expenseAmount(expense.quantity, expense.unitPrice) === Number(expense.amount) ? 'calculated' : 'total');
    setFormOpen(true);
  };
  const saveExpense = async event => {
    event.preventDefault();
    if (submitLock.current) return;
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) { toast.warning('Enter a description, valid date, and positive amount.'); return; }
    if (mode === 'calculated' && (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0 || !Number.isFinite(Number(form.unitPrice)) || Number(form.unitPrice) <= 0)) { toast.warning('Quantity and unit price must be greater than zero.'); return; }
    submitLock.current = true; setSaving(true);
    try {
      const payload = { title: form.title.trim(), amount: Math.round(amount * 100) / 100, category: form.category, date: form.date, unit: form.unit,
        ...(mode === 'calculated' ? { quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) } : {}) };
      const { data } = editId ? await adminAxios.put(`${API_URL}/api/expenses/${editId}`, payload) : await adminAxios.post(`${API_URL}/api/expenses`, payload);
      setExpenses(previous => editId ? previous.map(expense => expense._id === editId ? data : expense) : [data, ...previous]);
      toast.success(editId ? 'Expense updated.' : 'Expense added.');
      setFormOpen(false); setEditId(null); setForm(freshForm());
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save expense. Your entries have been kept.'); }
    finally { submitLock.current = false; setSaving(false); }
  };
  const removeExpense = async expense => {
    if (deleting || !window.confirm(`Delete expense “${expense.title}”?`)) return;
    setDeleting(expense._id);
    try { await adminAxios.delete(`${API_URL}/api/expenses/${expense._id}`); setExpenses(previous => previous.filter(record => record._id !== expense._id)); toast.success('Expense removed.'); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not delete expense.'); }
    finally { setDeleting(null); }
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([expensesCsv(filtered)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `expenses-${today}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="mx-auto max-w-[1440px] pb-16 text-[#242424] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-[#dc4939] [&_button:focus-visible]:outline-offset-3">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-5"><div><p className="mb-2.5 text-[11px] font-bold tracking-[2px] text-[#dc4939]">FINANCES / EXPENSES</p><h1 className="m-0 text-[clamp(26px,3vw,38px)] leading-tight font-semibold tracking-[-.7px]">Every expense, accounted for.</h1><p className="mt-3 text-sm text-[#888]">Track spending, review costs, and keep your records in order.</p></div>{!formOpen && <button className={primaryButton} onClick={() => openForm()}><Plus size={16} /> Add expense</button>}</header>
    {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">{loadError}<button className={button} onClick={fetchExpenses} disabled={loading}>Retry</button></div>}
    {formOpen ? <div className="max-w-[900px] rounded-xl border border-[#e7e7e5] bg-white"><header className="border-b border-[#eeedea] bg-[#fafaf8] p-5 sm:p-6"><button className="flex cursor-pointer items-center gap-2 border-0 bg-transparent text-xs text-[#888] disabled:opacity-50" onClick={closeForm} disabled={saving}><ArrowLeft size={14} /> Back to expenses</button><h2 className="mt-3 text-2xl font-semibold">{editId ? 'Edit expense' : 'Add an expense'}</h2></header>
      <form onSubmit={saveExpense}><fieldset disabled={saving} className="m-0 min-w-0 border-0 p-5 sm:p-6"><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="mb-2 block text-xs font-medium text-[#777]" htmlFor="expense-product">Quick-fill description from a product <span className="font-normal text-[#aaa]">(optional)</span></label><Select inputId="expense-product" options={productOptions} value={productOptions.find(option => option.value === form.title) || null} onChange={option => { if (option) setValue('title', option.value); }} placeholder="Search fragrances…" isDisabled={saving} isClearable styles={{ control: (base, state) => ({ ...base, minHeight: 43, borderRadius: 8, borderColor: state.isFocused ? '#dc4939' : '#e2e2df', fontSize: 13, boxShadow: 'none' }) }} /></div>
        <label className={`${label} sm:col-span-2`}>Description<input autoFocus required maxLength={200} className={field} value={form.title} onChange={event => setValue('title', event.target.value)} placeholder="e.g. Bottles for the next batch" /></label>
        <label className={label}>Category<select className={field} value={form.category} onChange={event => setValue('category', event.target.value)}>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label><label className={label}>Expense date<input required className={field} type="date" value={form.date} onChange={event => setValue('date', event.target.value)} /></label>
        <label className={`${label} sm:col-span-2`}>Amount entry<select className={field} value={mode} onChange={event => { if (event.target.value === 'total' && Number.isFinite(amount) && amount > 0) setValue('amount', amount); setMode(event.target.value); }}><option value="total">Enter a total</option><option value="calculated">Calculate quantity × unit price</option></select></label>
        {mode === 'calculated' ? <><label className={label}>Quantity<input required type="number" min="0.001" step="any" className={field} value={form.quantity} onChange={event => setValue('quantity', event.target.value)} /></label><label className={label}>Unit<select className={field} value={form.unit} onChange={event => setValue('unit', event.target.value)}>{[...new Set(['pcs', 'ml', 'ltr', 'kg', 'gm', 'pkt', form.unit])].map(unit => <option key={unit}>{unit}</option>)}</select></label><label className={label}>Unit price (TK)<input required type="number" min="0.001" step="any" className={field} value={form.unitPrice} onChange={event => setValue('unitPrice', event.target.value)} /></label><div className="rounded-lg border border-[#e7e7e5] bg-[#fafaf8] p-3"><span className="text-xs text-[#888]">Calculated total</span><strong className="mt-2 block text-xl font-semibold">{money(Number.isFinite(amount) ? amount : 0)}</strong></div></> : <label className={`${label} sm:col-span-2`}>Total amount (TK)<input required type="number" min="0.01" step="0.01" className={field} value={form.amount} onChange={event => setValue('amount', event.target.value)} /></label>}
      </div><div className="mt-6 flex flex-wrap gap-3 border-t border-[#eeedea] pt-5"><button type="submit" className={primaryButton} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Save expense'}</button><button type="button" className={button} onClick={closeForm} disabled={saving}>Cancel</button></div></fieldset></form>
    </div> : <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: 'Today', value: todayTotal, note: today }, { label: 'This month', value: monthTotal, note: today.slice(0, 7) }, { label: 'All time', value: sumExpenses(expenses), note: `${expenses.length} records` }, { label: 'Filtered total', value: sumExpenses(filtered), note: `${filtered.length} matching records` }].map(card => <div className="rounded-xl border border-[#e7e7e5] bg-[#fafaf9] p-4 sm:p-5" key={card.label}><p className="m-0 text-xs text-[#888]">{card.label}</p><strong className="my-2 block text-lg font-semibold sm:text-2xl">{loading && !expenses.length ? '—' : money(card.value)}</strong><small className="text-[10px] text-[#aaa]">{card.note}</small></div>)}</div>
      <div className="mb-4 flex flex-wrap items-end gap-3"><label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#e2e2df] px-3 py-2.5 text-[#aaa] focus-within:border-[#dc4939]"><Search size={15} /><input className="w-full min-w-0 border-0 text-[13px] text-[#444] outline-none" aria-label="Search expenses by description" placeholder="Search expenses…" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} /></label><label className={label}>Category<select className={field} value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })}><option value="ALL">All categories</option>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label><label className={label}>From<input className={field} type="date" max={filters.to || undefined} value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label><label className={label}>To<input className={field} type="date" min={filters.from || undefined} value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} /></label><button className={button} disabled={!filtered.length || loading || Boolean(loadError)} onClick={exportCsv}><Download size={14} /> Export CSV</button></div>
      <div className="mb-4 flex items-center justify-between gap-3 text-[11px] text-[#999]"><span>{loading ? 'Loading expenses…' : `${filtered.length} records · Page ${currentPage} of ${totalPages}`}</span>{(filters.search || filters.category !== 'ALL' || filters.from || filters.to) && <button className="cursor-pointer border-0 bg-transparent text-[#a75449]" onClick={() => setFilters({ search: '', category: 'ALL', from: '', to: '' })}>Clear filters</button>}</div>
      <div className="rounded-xl border border-[#e7e7e5] max-[900px]:border-0"><table className="w-full border-collapse text-left max-[900px]:block"><thead className="bg-[#f8f8f6] max-[900px]:hidden"><tr>{['Date', 'Description', 'Category', 'Quantity × price', 'Total', 'Actions'].map(heading => <th key={heading} className="border-b border-[#e7e7e5] px-4 py-3.5 text-[10px] font-semibold tracking-wide text-[#888] uppercase">{heading}</th>)}</tr></thead><tbody className="max-[900px]:block">{visible.map(expense => <tr key={expense._id} className="border-b border-[#eeedea] last:border-b-0 hover:bg-[#fdfcfb] max-[900px]:mb-3 max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-4 max-[900px]:rounded-xl max-[900px]:border max-[900px]:border-[#e7e7e5] max-[900px]:p-4 max-[900px]:last:border-b [&>td]:px-4 [&>td]:py-4 [&>td]:text-xs max-[900px]:[&>td]:min-w-0 max-[900px]:[&>td]:p-0 max-[900px]:[&>td]:before:mb-1 max-[900px]:[&>td]:before:block max-[900px]:[&>td]:before:text-[9px] max-[900px]:[&>td]:before:text-[#999] max-[900px]:[&>td]:before:uppercase max-[900px]:[&>td]:before:content-[attr(data-label)]">
        <td data-label="Date">{expenseDay(expense.date)}</td><td data-label="Description" className="font-medium [overflow-wrap:anywhere]">{expense.title}</td><td data-label="Category"><span className={`inline-block rounded px-2 py-1 text-[10px] ${categoryColors[expense.category] || categoryColors.Other}`}>{expense.category}</span></td><td data-label="Quantity × price" className="text-[#888]">{expense.quantity && expense.unitPrice ? `${expense.quantity} ${expense.unit || 'pcs'} × ${money(expense.unitPrice)}` : 'Direct total'}</td><td data-label="Total" className="font-semibold">{money(expense.amount)}</td><td data-label="Actions" className="max-[900px]:col-span-full"><div className="flex flex-wrap items-center gap-2"><button className={button} disabled={Boolean(deleting)} aria-label={`Edit ${expense.title}`} onClick={() => openForm(expense)}><Pencil size={12} /> Edit</button><button className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent px-2 py-2 text-[11px] text-[#bd5142] disabled:opacity-50" disabled={Boolean(deleting)} aria-label={`Delete ${expense.title}`} onClick={() => removeExpense(expense)}><Trash2 size={12} /> {deleting === expense._id ? 'Removing…' : 'Delete'}</button></div></td>
      </tr>)}{!visible.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-[#999] max-[900px]:block"><Receipt size={27} className="mx-auto mb-3" /><p className="text-sm">{loading ? 'Loading expense records…' : loadError ? 'Expense records are unavailable.' : expenses.length ? 'No expenses match your filters.' : 'No expenses yet. Add your first expense above.'}</p></td></tr>}</tbody></table></div>
      <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </>}
  </section>;
}
