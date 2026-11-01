import { useState, useEffect } from 'react';
import { Plus, Copy, Pencil, Trash2, RefreshCw } from 'lucide-react';
import adminAxios from '../../utils/adminAxios';
import { useToast } from '../../context/ToastContext';
import { PageHeading, Stats, Empty, ErrorNotice, Modal } from '../../components/admin/AdminUi';
import { panel, field, button, primary, money } from '../../utils/adminPresentation';
const blank = () => ({ code: '', discountValue: '', discountType: 'percentage', expiryDate: '', isActive: true });
const status = c => c.expiryDate && new Date(c.expiryDate) <= new Date() ? 'Expired' : c.isActive ? 'Active' : 'Inactive';
const localDateTime = date => { if (!date) return ''; const value = new Date(date); return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export default function CouponManagement() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [removing, setRemoving] = useState(null);
  const [sample, setSample] = useState('2000');
  const load = async () => {
    setLoading(true); setError('');
    try { setCoupons((await adminAxios.get('/api/coupons')).data); }
    catch (err) { setError(err.response?.data?.message || 'Could not load coupons.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const save = async event => {
    event.preventDefault(); if (saving) return;
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0 || (form.discountType === 'percentage' && value > 100)) return toast.warning('Enter a positive discount; percentage discounts cannot exceed 100%.');
    setSaving(true);
    try {
      const payload = { code: form.code.trim().toUpperCase(), discountType: form.discountType, isActive: form.isActive, discountValue: value, expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null };
      if (editing) await adminAxios.put(`/api/coupons/${editing}`, payload); else await adminAxios.post('/api/coupons', payload);
      toast.success(editing ? 'Coupon updated.' : 'Coupon created.'); setOpen(false); await load();
    } catch (err) { toast.error(err.response?.data?.errors?.join(', ') || err.response?.data?.message || 'Could not save coupon.'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try { await adminAxios.delete(`/api/coupons/${removing._id}`); setRemoving(null); toast.success('Coupon deleted.'); await load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not delete coupon.'); }
    finally { setSaving(false); }
  };
  const filtered = coupons.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) && (filter === 'All' || status(c) === filter));
  const subtotal = Math.max(0, Number(sample) || 0);
  const discount = Math.min(subtotal, Math.max(0, form.discountType === 'percentage' ? subtotal * (Number(form.discountValue) || 0) / 100 : Number(form.discountValue) || 0));
  return <section className="mx-auto max-w-[1300px] pb-12">
    <PageHeading eyebrow="MARKETING / COUPONS" title="Make a little go further." description="Manage discount codes, availability, and expiry dates."><button className={button} disabled={loading} onClick={load}><RefreshCw size={14} />Refresh</button><button className={primary} onClick={() => { setForm(blank()); setEditing(null); setOpen(true); }}><Plus size={14} />New coupon</button></PageHeading>
    <ErrorNotice message={error} onRetry={load} /><Stats items={['Active', 'Inactive', 'Expired'].map(label => ({ label: `${label} coupons`, value: loading || error ? '—' : coupons.filter(c => status(c) === label).length }))} />
    <div className={panel}><div className="mb-5 flex flex-wrap gap-3"><input aria-label="Search coupon codes" className={`${field} max-w-sm`} placeholder="Search coupon code…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Coupon status" className={`${field} max-w-44`} value={filter} onChange={e => setFilter(e.target.value)}>{['All', 'Active', 'Inactive', 'Expired'].map(value => <option key={value}>{value}</option>)}</select></div>
    {loading ? <p role="status" className="py-10 text-center text-sm text-[#999]">Loading coupons…</p> : error ? null : !filtered.length ? <Empty>No coupons match. Create a code or adjust your filters.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[#eee] text-[10px] tracking-wider text-[#999]"><tr>{['CODE', 'DISCOUNT', 'STATUS', 'EXPIRES', 'ACTIONS'].map(h => <th className="px-3 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map(c => <tr className="border-b border-[#f0f0ee] last:border-0" key={c._id}><td className="px-3 py-4 font-mono font-semibold">{c.code}</td><td className="px-3 py-4 whitespace-nowrap">{c.discountType === 'percentage' ? `${c.discountValue}%` : money(c.discountValue)}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] ${status(c) === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f3f3f0] text-[#888]'}`}>{status(c)}</span></td><td className="px-3 py-4 text-xs whitespace-nowrap text-[#888]">{c.expiryDate ? new Date(c.expiryDate).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }) : 'No expiry'}<small className="block text-[9px]">{c.expiryDate && 'Bangladesh time'}</small></td><td className="px-3 py-4"><div className="flex gap-2"><button className={button} aria-label={`Copy ${c.code}`} onClick={async () => { try { await navigator.clipboard.writeText(c.code); toast.success('Code copied.'); } catch { toast.error('Could not copy code.'); } }}><Copy size={13} /></button><button className={button} onClick={() => { setEditing(c._id); setForm({ ...c, expiryDate: localDateTime(c.expiryDate) }); setOpen(true); }}><Pencil size={13} />Edit</button><button className={`${button} text-red-600!`} aria-label={`Delete ${c.code}`} onClick={() => setRemoving(c)}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div>}</div>
    <Modal open={open} title={editing ? 'Edit coupon' : 'Create coupon'} busy={saving} onClose={() => setOpen(false)}><form onSubmit={save} className="space-y-4"><label className="block text-xs font-medium">Coupon code<input required maxLength={30} className={`${field} mt-2 uppercase`} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium">Discount type<select className={`${field} mt-2`} value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (TK)</option></select></label><label className="text-xs font-medium">Discount value<input required type="number" min="0.01" step="0.01" max={form.discountType === 'percentage' ? 100 : undefined} className={`${field} mt-2`} value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} /></label></div><label className="block text-xs font-medium">Expiry (optional, your device time)<input type="datetime-local" className={`${field} mt-2`} value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />Enabled for checkout</label><div className="rounded-lg bg-[#fafaf8] p-4"><label className="text-xs text-[#888]">Preview subtotal (TK)<input type="number" min="0" step="0.01" value={sample} onChange={e => setSample(e.target.value)} className={`${field} my-2`} /></label><p className="m-0 text-xs leading-6">Discount: <strong>{money(discount)}</strong><br />After discount: <strong>{money(subtotal - discount)}</strong></p><p className="mb-0 mt-2 text-[10px] text-[#999]">Illustration only. Availability and checkout rules still apply.</p></div><button disabled={saving} className={`${primary} w-full`}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}</button></form></Modal>
    <Modal open={Boolean(removing)} title="Delete coupon?" busy={saving} onClose={() => setRemoving(null)}><p className="mb-5 text-sm text-[#777]">Delete {removing?.code}? Customers will no longer be able to use this code.</p><button disabled={saving} className={primary} onClick={remove}>{saving ? 'Deleting…' : 'Delete coupon'}</button></Modal>
  </section>;
}
