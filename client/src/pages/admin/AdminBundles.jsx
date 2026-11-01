import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, ImagePlus, Pencil, RefreshCw } from 'lucide-react';
import adminAxios from '../../utils/adminAxios';
import { useToast } from '../../context/ToastContext';
import { PageHeading, Stats, Empty, ErrorNotice, Modal } from '../../components/admin/AdminUi';
import { panel, field, button, primary, money } from '../../utils/adminPresentation';
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const blank = () => ({ name: '', description: '', bundlePrice: '', products: [], image: '', active: true });
const stock = p => p.variants?.length ? p.variants.reduce((s, v) => s + Math.max(0, Number(v.stock) || 0), 0) : Number(p.stock) || 0;
export default function AdminBundles() {
  const toast = useToast();
  const [bundles, setBundles] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [removing, setRemoving] = useState(null);
  useEffect(() => { if (!imageFile) { setPreview(''); return; } const url = URL.createObjectURL(imageFile); setPreview(url); return () => URL.revokeObjectURL(url); }, [imageFile]);
  const load = async () => {
    setLoading(true); setError('');
    try { const [b, p] = await Promise.all([adminAxios.get('/api/bundles?admin=true'), adminAxios.get('/api/perfumes')]); setBundles(b.data); setPerfumes(p.data); }
    catch (err) { setError(err.response?.data?.message || 'Could not load bundles.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const edit = bundle => {
    setForm(bundle ? { ...bundle, products: bundle.products.map(p => typeof p === 'string' ? p : p?._id).filter(Boolean) } : blank());
    setEditId(bundle?._id || null); setProductSearch(''); setImageFile(null); setOpen(true);
  };
  const save = async event => {
    event.preventDefault(); if (busy) return;
    if (form.products.length < 2) return toast.warning('Select at least two products.');
    if (form.products.some(id => !perfumes.some(p => p._id === id))) return toast.warning('Remove unavailable products before saving.');
    if (!Number.isFinite(Number(form.bundlePrice)) || Number(form.bundlePrice) <= 0) return toast.warning('Enter a positive bundle price.');
    setBusy(true);
    try {
      let image = form.image;
      if (imageFile) {
        if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('Image uploads are not configured.');
        const data = new FormData(); data.append('file', imageFile); data.append('upload_preset', UPLOAD_PRESET);
        image = (await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data)).data.secure_url;
      }
      const payload = { name: form.name.trim(), description: form.description || '', bundlePrice: Number(form.bundlePrice), products: form.products, active: form.active, image };
      if (editId) await adminAxios.put(`/api/bundles/${editId}`, payload); else await adminAxios.post('/api/bundles', payload);
      toast.success(editId ? 'Bundle updated.' : 'Bundle created.'); setOpen(false); await load();
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Could not save bundle.'); }
    finally { setBusy(false); }
  };
  const toggle = async b => {
    setBusy(true);
    try { await adminAxios.put(`/api/bundles/${b._id}`, { active: !b.active }); await load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not change availability.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await adminAxios.delete(`/api/bundles/${removing._id}`); setRemoving(null); toast.success('Bundle deleted.'); await load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not delete bundle.'); }
    finally { setBusy(false); }
  };
  const selected = perfumes.filter(p => form.products.includes(p._id));
  const missing = form.products.filter(id => !perfumes.some(p => p._id === id));
  const original = selected.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const savings = original - (Number(form.bundlePrice) || 0);
  const filtered = bundles.filter(b => `${b.name} ${b.description}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'active') === b.active));
  return <section className="mx-auto max-w-[1400px] pb-12"><PageHeading eyebrow="MARKETING / BUNDLES" title="Better together." description="Build product combinations with a clear price and customer preview."><button className={button} disabled={loading} onClick={load}><RefreshCw size={14} />Refresh</button><button className={primary} disabled={loading || !!error} onClick={() => edit(null)}><Plus size={14} />New bundle</button></PageHeading><ErrorNotice message={error} onRetry={load} /><Stats items={[{ label: 'All bundles', value: loading || error ? '—' : bundles.length }, { label: 'Active', value: loading || error ? '—' : bundles.filter(b => b.active).length }, { label: 'Inactive', value: loading || error ? '—' : bundles.filter(b => !b.active).length }]} />
    {open && <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"><form onSubmit={save} className={`${panel} space-y-5`}><div className="flex justify-between gap-3"><h2 className="m-0 font-sans! text-lg font-semibold">{editId ? 'Edit bundle' : 'New bundle'}</h2><button type="button" className={button} disabled={busy} onClick={() => setOpen(false)}>Close</button></div><label className="block text-xs font-medium">Bundle name<input required maxLength={200} className={`${field} mt-2`} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label className="block text-xs font-medium">Description<textarea rows={2} maxLength={2000} className={`${field} mt-2`} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></label><label className="block text-xs font-medium">Bundle price (TK)<input required min="0.01" step="0.01" type="number" className={`${field} mt-2`} value={form.bundlePrice} onChange={e => setForm({ ...form, bundlePrice: e.target.value })} /></label><div><p className="text-xs font-medium">Included products · {form.products.length} selected</p><input aria-label="Search products" className={`${field} mb-3`} value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products…" />{missing.length > 0 && <div className="mb-3 rounded bg-amber-50 p-3 text-xs text-amber-800">{missing.length} selected products are unavailable.<button type="button" className="ml-2 underline" onClick={() => setForm({ ...form, products: selected.map(p => p._id) })}>Remove unavailable products</button></div>}<div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">{perfumes.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => <label key={p._id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${form.products.includes(p._id) ? 'border-[#b8c3ad] bg-[#f4f6f0]' : 'border-[#eee]'}`}><input type="checkbox" checked={form.products.includes(p._id)} onChange={() => setForm(f => ({ ...f, products: f.products.includes(p._id) ? f.products.filter(id => id !== p._id) : [...f.products, p._id] }))} /><span className="min-w-0 text-xs"><strong className="block truncate font-medium">{p.name}</strong><span className="mt-1 block text-[10px] text-[#888]">{money(p.price)} · {stock(p)} units</span>{stock(p) <= 0 && <span className="text-[10px] text-amber-700">Sold out</span>}</span></label>)}</div></div><label className="block rounded-lg border border-dashed border-[#ccc] p-4 text-xs"><span className="mb-3 flex items-center gap-2"><ImagePlus size={16} />Bundle image (optional)</span><input type="file" accept="image/*" className="w-full" onChange={e => { const file = e.target.files?.[0]; if (file && (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024)) { toast.warning('Choose an image under 10 MB.'); e.target.value = ''; return; } setImageFile(file || null); }} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Visible to customers</label><button className={primary} disabled={busy}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Create bundle'}</button></form><aside className={`${panel} h-fit lg:sticky lg:top-6`}><p className="mb-4 text-[10px] tracking-[2px] text-[#999]">CUSTOMER PREVIEW</p>{preview || form.image ? <img src={preview || form.image} alt="Bundle preview" className="mb-5 aspect-square w-full rounded-lg bg-[#fafaf8] object-contain" /> : <div className="mb-5 flex aspect-[4/3] items-center justify-center rounded-lg bg-[#f4f3ef] text-[#bbb]"><ImagePlus size={40} strokeWidth={1} /></div>}<h3 className="text-2xl">{form.name || 'Your bundle name'}</h3><p className="text-sm leading-6 text-[#888]">{form.description || 'Your bundle description will appear here.'}</p><div className="my-5 space-y-2">{selected.map(p => <div key={p._id} className="flex justify-between gap-3 text-xs"><span>{p.name}</span><span>{money(p.price)}</span></div>)}</div><div className="space-y-3 border-t border-[#eee] pt-4 text-sm"><p className="flex justify-between"><span className="text-[#888]">Regular total</span><span>{money(original)}</span></p><p className="flex justify-between text-lg font-semibold"><span>Bundle price</span><span>{money(form.bundlePrice)}</span></p><p className={savings > 0 ? 'text-emerald-700' : 'text-amber-700'}>{savings > 0 ? `Save ${money(savings)} (${Math.round(savings / original * 100)}%)` : 'No savings at this price.'}</p></div>{selected.some(p => stock(p) <= 0) && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">This bundle includes sold-out products. Review stock before making it available.</p>}<p className="mb-0 text-[10px] leading-5 text-[#999]">Regular totals use current product base prices. Size selection and stock rules apply at checkout.</p></aside></div>}
    <div className={`${panel} mb-5 flex flex-wrap gap-3`}><input className={`${field} max-w-sm`} aria-label="Search bundles" placeholder="Search bundles…" value={search} onChange={e => setSearch(e.target.value)} /><select className={`${field} max-w-44`} aria-label="Bundle status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All bundles</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>{loading ? <p role="status" className="py-12 text-center text-sm text-[#999]">Loading bundles…</p> : error ? null : !filtered.length ? <Empty>No bundles match your filters.</Empty> : <div className="grid gap-4 lg:grid-cols-2">{filtered.map(b => <article className={panel} key={b._id}><div className="flex items-start gap-4">{b.image && <img src={b.image} alt="" className="h-24 w-24 shrink-0 rounded-lg bg-[#fafaf8] object-contain" />}<div className="min-w-0"><span className={`rounded-full px-2 py-1 text-[10px] ${b.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-[#888]'}`}>{b.active ? 'Active' : 'Inactive'}</span><h2 className="mb-2 mt-3 text-xl break-words">{b.name}</h2><strong className="text-lg font-semibold">{money(b.bundlePrice)}</strong></div></div><p className="text-xs leading-6 text-[#888]">{b.description}</p><div className="mb-5 flex flex-wrap gap-2">{b.products.map((p, index) => <span key={p?._id || index} className="rounded bg-[#f5f5f2] px-2 py-1 text-[10px] text-[#777]">{p?.name || 'Unavailable product'}{p && (p.isDeleted || stock(p) <= 0) ? ' · Unavailable' : ''}</span>)}</div><div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => edit(b)}><Pencil size={13} />Edit</button><button className={button} disabled={busy} onClick={() => toggle(b)}>{b.active ? 'Deactivate' : 'Activate'}</button><button className={`${button} text-red-600!`} disabled={busy} onClick={() => setRemoving(b)}>Delete</button></div></article>)}</div>}
    <Modal open={!!removing} title="Delete bundle?" busy={busy} onClose={() => setRemoving(null)}><p className="text-sm text-[#777]">Delete {removing?.name}? This removes the bundle from the store.</p><button className={primary} disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete bundle'}</button></Modal>
  </section>;
}
