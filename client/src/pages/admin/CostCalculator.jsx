import React, { useState, useEffect, useRef } from 'react';
import adminAxios from '../../utils/adminAxios';
import { PageHeading, ErrorNotice, Empty } from '../../components/admin/AdminUi';
import { panel, field, button } from '../../utils/adminPresentation';
import { downloadCsv } from '../../utils/adminExport';
import { validateCostBatch, costPercentages } from '../../utils/costBatch';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const UNITS = ['ml', 'g', 'kg', 'L', 'pcs', 'bottle', 'box', ''];

const emptyIngredient = () => ({ name: '', qty: '', unit: 'ml',  cost: '' });
const emptyPackaging  = () => ({ name: '', qty: '', unit: 'pcs', cost: '' });

const marginColor = (m) => m >= 60 ? '#16a34a' : m >= 30 ? '#d97706' : '#dc2626';
const fmt = (n) => Number(n).toLocaleString();

/* ─── Row editor (ingredients / packaging) ─────────────────── */
const RowEditor = ({ rows, onUpdate, onAdd, onRemove, label }) => (
  <div className="mb-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold tracking-[2px] text-[#888]">{label}</span>
      <button onClick={onAdd}
        className="text-[9px] font-bold tracking-wider px-2.5 py-1 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer bg-white">
        + ADD ROW
      </button>
    </div>
    <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mb-1">
      {['ITEM', 'QTY', 'UNIT', 'TOTAL COST (TK)', ''].map((h, i) => (
        <span key={i} className="text-[9px] font-bold tracking-wider text-[#bbb]">{h}</span>
      ))}
    </div>
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center
          border border-[#eee] p-2 sm:border-0 sm:p-0">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[9px] font-bold text-[#bbb] sm:hidden mb-1 block">ITEM</span>
            <input aria-label={`Item name for ${label} row ${i + 1}`} value={row.name} onChange={e => onUpdate(i, 'name', e.target.value)}
              placeholder={label === 'INGREDIENTS / ITEMS' ? 'e.g. Oud Oil' : 'e.g. Glass Bottle'}
              className="border border-[#ddd] px-2 py-1.5 text-xs outline-none w-full focus:border-black transition-colors" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-[#bbb] sm:hidden mb-1 block">QTY</span>
            <input aria-label={`Quantity for ${label} row ${i + 1}`} min="0.01" step="any" type="number" value={row.qty} onChange={e => onUpdate(i, 'qty', e.target.value)}
              placeholder="50" className="border border-[#ddd] px-2 py-1.5 text-xs outline-none w-full focus:border-black transition-colors" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-[#bbb] sm:hidden mb-1 block">UNIT</span>
            <select aria-label={`Unit for ${label} row ${i + 1}`} value={row.unit} onChange={e => onUpdate(i, 'unit', e.target.value)}
              className="border border-[#ddd] px-2 py-1.5 text-xs outline-none bg-white w-full focus:border-black transition-colors">
              {UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
            </select>
          </div>
          <div className="flex gap-1 items-center">
            <div className="flex-1">
              <span className="text-[9px] font-bold text-[#bbb] sm:hidden mb-1 block">COST</span>
              <input aria-label={`Total cost for ${label} row ${i + 1}`} min="0" step="0.01" type="number" value={row.cost} onChange={e => onUpdate(i, 'cost', e.target.value)}
                placeholder="2000" className="border border-[#ddd] px-2 py-1.5 text-xs outline-none w-full focus:border-black transition-colors" />
            </div>
            <button onClick={() => onRemove(i)} disabled={rows.length === 1}
              className="text-[#ccc] hover:text-red-400 disabled:opacity-20 text-xl leading-none cursor-pointer bg-transparent border-none w-6 text-center flex-shrink-0">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Searchable perfume dropdown ──────────────────────────── */
const SearchableSelect = ({ perfumes, value, onChange }) => {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = perfumes.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const selected = perfumes.find(p => p._id === value);

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full border border-[#ddd] px-3 py-2.5 text-sm bg-white cursor-pointer flex items-center justify-between hover:border-black transition-colors"
      >
        <span className={selected ? 'text-black' : 'text-[#bbb]'}>
          {selected ? `${selected.name} — ${fmt(selected.price)} TK` : '— Choose a perfume —'}
        </span>
        <div className="flex items-center gap-1">
          {selected && (
            <button onClick={e => { e.stopPropagation(); onChange(''); setSearch(''); }}
              className="text-[#bbb] hover:text-red-400 text-base leading-none bg-transparent border-none cursor-pointer px-1">
              ×
            </button>
          )}
          <span className="text-[10px] text-[#bbb]">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#ddd] shadow-xl max-h-[260px] flex flex-col">
          <div className="p-2 border-b border-[#eee]">
            <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search perfume…"
              className="w-full border border-[#ddd] px-3 py-2 text-sm outline-none focus:border-black transition-colors"
              onClick={e => e.stopPropagation()} />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0
              ? <div className="px-3 py-4 text-xs text-[#bbb] text-center tracking-wider">NO MATCH FOUND</div>
              : filtered.map(p => (
                  <div key={p._id} onClick={() => { onChange(p._id); setOpen(false); setSearch(''); }}
                    className={`px-3 py-2.5 text-sm cursor-pointer transition-colors hover:bg-[#f5f5f5] ${p._id === value ? 'bg-[#f0f0f0] font-semibold' : ''}`}>
                    {p.name} <span className="text-[#aaa]">— {fmt(p.price)} TK</span>
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Stat row helper ───────────────────────────────────────── */
const StatRow = ({ label, value, valueClass = '' }) => (
  <>
    <span className="text-[11px] text-[#888]">{label}</span>
    <span className={`text-[11px] font-bold text-right ${valueClass}`}>{value}</span>
  </>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const CostCalculator = () => {
  const [perfumes,           setPerfumes]           = useState([]);
  const [records,            setRecords]             = useState([]);
  const [selectedPerfume,    setSelectedPerfume]     = useState('');
  const [customSellingPrice, setCustomSellingPrice]  = useState('');
  const [ingredients,        setIngredients]         = useState([emptyIngredient()]);
  const [packaging,          setPackaging]           = useState([emptyPackaging()]);
  const [bottles,            setBottles]             = useState('');
  const [notes,              setNotes]               = useState('');
  const [saving,             setSaving]              = useState(false);
  const [toast,              setToast]               = useState('');
  const [view, setView] = useState('history');
  const [recordsError, setRecordsError] = useState('');
  const [productsError, setProductsError] = useState('');
  const [wacError, setWacError] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [wacLoading, setWacLoading] = useState(true);
  const [filterPerfume,      setFilterPerfume]       = useState('');
  const [deleteConfirm,      setDeleteConfirm]       = useState(null);
  const [wacSummaries,       setWacSummaries]        = useState([]);
  const [stockEdit,          setStockEdit]           = useState(null);   // { recordId, sold }
  const [priceEdit,          setPriceEdit]           = useState(null);   // { recordId, price }
  const [editingBatch,       setEditingBatch]        = useState(null);
  const [updatingBatch,      setUpdatingBatch]       = useState(false);
  const [expandedRecord,     setExpandedRecord]      = useState(null);   // id of expanded history card

  /* ── fetch ─────────────────────────────────────────────── */
  const fetchPerfumes = async () => {
    setProductsError('');
    try { setPerfumes((await adminAxios.get(`${API_URL}/api/perfumes`)).data); }
    catch { setProductsError('Could not load the product selector.'); }
  };
  useEffect(() => { fetchPerfumes(); }, []);

  const fetchRecords = async (pid = '', signal) => {
    setRecordsLoading(true); setRecordsError('');
    try {
      const r = await adminAxios.get(`${API_URL}/api/costs${pid ? `?perfumeId=${pid}` : ''}`, { signal });
      if (!signal?.aborted) setRecords(r.data);
    } catch (err) { if (!signal?.aborted) setRecordsError(err.response?.data?.message || 'Could not load batch history.'); } finally { if (!signal?.aborted) setRecordsLoading(false); }
  };
  const fetchWac = async (pid = '', signal) => {
    setWacLoading(true); setWacError('');
    try {
      const r = await adminAxios.get(`${API_URL}/api/costs/summary/wac${pid ? `?perfumeId=${pid}` : ''}`, { signal });
      if (!signal?.aborted) setWacSummaries(r.data);
    } catch (err) { if (!signal?.aborted) setWacError(err.response?.data?.message || 'Could not load cost summaries.'); } finally { if (!signal?.aborted) setWacLoading(false); }
  };

  useEffect(() => { const controller = new AbortController(); fetchRecords(filterPerfume, controller.signal); fetchWac(filterPerfume, controller.signal); return () => controller.abort(); }, [filterPerfume]);

  /* ── live calcs (new record form) ─────────────────────── */
  const ingCost      = ingredients.reduce((s, i) => s + (Number(i.cost) || 0), 0);
  const pkgCost      = packaging.reduce((s, p) => s + (Number(p.cost) || 0), 0);
  const totalCost    = ingCost + pkgCost;
  const bottleCount  = Number(bottles) || 0;
  const cpb          = bottleCount > 0 ? totalCost / bottleCount : 0;
  const perfumeData  = perfumes.find(p => p._id === selectedPerfume);
  const sp           = customSellingPrice !== '' ? Number(customSellingPrice) : (perfumeData?.price || 0);
  const profitPB     = sp - cpb;
  const margin       = sp > 0 ? (profitPB / sp) * 100 : 0;

  /* ── live calcs (edit modal) ───────────────────────────── */
  const eIngCost = editingBatch?.ingredients?.reduce((s, i) => s + (Number(i.cost) || 0), 0) || 0;
  const ePkgCost = editingBatch?.packaging?.reduce((s, p) => s + (Number(p.cost) || 0), 0) || 0;
  const eTotalCost = eIngCost + ePkgCost;
  const eBotCount  = Number(editingBatch?.bottlesProduced) || 0;
  const eCPB       = eBotCount > 0 ? eTotalCost / eBotCount : 0;
  const eSP        = Number(editingBatch?.sellingPrice) || 0;
  const eProfit    = eSP - eCPB;
  const eMargin    = eSP > 0 ? (eProfit / eSP) * 100 : 0;

  /* ── helpers ───────────────────────────────────────────── */
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const updateIng = (i, f, v) => { const u = [...ingredients]; u[i] = { ...u[i], [f]: v }; setIngredients(u); };
  const updatePkg = (i, f, v) => { const u = [...packaging];   u[i] = { ...u[i], [f]: v }; setPackaging(u); };
  const updateEditIng = (i, f, v) => {
    if (!editingBatch) return;
    const u = [...editingBatch.ingredients]; u[i] = { ...u[i], [f]: v };
    setEditingBatch({ ...editingBatch, ingredients: u });
  };
  const updateEditPkg = (i, f, v) => {
    if (!editingBatch) return;
    const u = [...editingBatch.packaging]; u[i] = { ...u[i], [f]: v };
    setEditingBatch({ ...editingBatch, packaging: u });
  };

  const openEditModal = (r) => setEditingBatch({
    _id: r._id, perfumeName: r.perfumeName, createdAt: r.createdAt,
    bottlesProduced: r.bottlesProduced,
    remainingBottles: r.remainingBottles ?? r.bottlesProduced,
    sellingPrice: r.sellingPrice,
    ingredients: r.ingredients?.length > 0 ? r.ingredients.map(i => ({ ...i })) : [emptyIngredient()],
    packaging:   r.packaging?.length   > 0 ? r.packaging.map(p => ({ ...p }))   : [emptyPackaging()],
    notes: r.notes || '',
  });

  /* ── actions ───────────────────────────────────────────── */
  const handleSave = async () => {
    if (!selectedPerfume)   return showToast('Please select a perfume');
    const issue = validateCostBatch({ bottlesProduced: bottleCount, sellingPrice: customSellingPrice, ingredients, packaging });
    if (issue) return showToast(issue);
    setSaving(true);
    try {
      await adminAxios.post(`${API_URL}/api/costs`, {
        perfumeId: selectedPerfume,
        ingredients: ingredients.map(i => ({ ...i, qty: Number(i.qty), cost: Number(i.cost) })),
        packaging:   packaging.filter(p => p.name).map(p => ({ ...p, qty: Number(p.qty), cost: Number(p.cost) })),
        bottlesProduced: bottleCount,
        sellingPrice: customSellingPrice !== '' ? Number(customSellingPrice) : undefined,
        notes,
      });
      showToast('✓ Cost record saved');
      setIngredients([emptyIngredient()]); setPackaging([emptyPackaging()]);
      setBottles(''); setCustomSellingPrice(''); setNotes(''); setSelectedPerfume(''); setView('history');
      fetchRecords(filterPerfume); fetchWac(filterPerfume);
    } catch (err) { showToast(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await adminAxios.delete(`${API_URL}/api/costs/${id}`);
      showToast('Record deleted'); fetchRecords(filterPerfume); fetchWac(filterPerfume);
    } catch { showToast('Failed to delete'); }
    setDeleteConfirm(null);
  };

  const handleStockUpdate = async (recordId) => {
    const sold = Number(stockEdit?.sold);
    if (!sold || sold <= 0) return showToast('Enter bottles sold');
    try {
      await adminAxios.patch(`${API_URL}/api/costs/${recordId}/stock`, { sold });
      showToast(`✓ ${sold} bottle(s) sold`);
      setStockEdit(null); fetchRecords(filterPerfume); fetchWac(filterPerfume);
    } catch (err) { showToast(err.response?.data?.message || 'Failed'); }
  };

  const handlePriceUpdate = async (recordId) => {
    const p = Number(priceEdit?.price);
    if (isNaN(p) || p < 0) return showToast('Enter a valid selling price');
    try {
      await adminAxios.patch(`${API_URL}/api/costs/${recordId}/price`, { sellingPrice: p });
      showToast('✓ Selling price updated');
      setPriceEdit(null); fetchRecords(filterPerfume); fetchWac(filterPerfume);
    } catch (err) { showToast(err.response?.data?.message || 'Failed'); }
  };

  const handleSaveBatchEdit = async () => {
    if (!editingBatch) return;
    const issue = validateCostBatch(editingBatch);
    if (issue) return showToast(issue);
    if (!Number.isInteger(Number(editingBatch.remainingBottles)) || Number(editingBatch.remainingBottles) < 0 || Number(editingBatch.remainingBottles) > Number(editingBatch.bottlesProduced)) return showToast('Remaining bottles must be a whole number within the batch total.');
    setUpdatingBatch(true);
    try {
      await adminAxios.put(`${API_URL}/api/costs/${editingBatch._id}`, {
        bottlesProduced:  Number(editingBatch.bottlesProduced),
        remainingBottles: Number(editingBatch.remainingBottles),
        sellingPrice:     Number(editingBatch.sellingPrice),
        ingredients: editingBatch.ingredients.map(i => ({ ...i, qty: Number(i.qty), cost: Number(i.cost) })),
        packaging:   editingBatch.packaging.filter(p => p.name).map(p => ({ ...p, qty: Number(p.qty), cost: Number(p.cost) })),
        notes: editingBatch.notes,
      });
      showToast('✓ Batch updated');
      setEditingBatch(null); fetchRecords(filterPerfume); fetchWac(filterPerfume);
    } catch (err) { showToast(err.response?.data?.message || 'Failed');
    } finally { setUpdatingBatch(false); }
  };

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-black text-white px-4 py-3 text-xs tracking-widest shadow-lg max-w-[90vw]">
          {toast}
        </div>
      )}

      <PageHeading eyebrow="PRODUCTION / COSTS" title="Know what every bottle costs." description="Record batch inputs, review production history, and compare the cost of remaining batches."><button className={button} onClick={() => { fetchRecords(filterPerfume); fetchWac(filterPerfume); }}>Refresh</button><button className={button} disabled={recordsLoading || !!recordsError || !records.length} onClick={() => downloadCsv('production-costs.csv', ['Perfume', 'Batch date', 'Produced', 'Remaining', 'Batch cost (TK)', 'Cost per bottle (TK)', 'Selling price (TK)', 'Gross margin (%)'], records.map(r => [r.perfumeName, new Date(r.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }), r.bottlesProduced, r.remainingBottles ?? r.bottlesProduced, r.totalCost, r.costPerBottle, r.sellingPrice, r.profitMargin]))}>Export loaded batches</button></PageHeading>
      <nav aria-label="Cost calculator views" className="mb-6 flex flex-wrap gap-2">{[{ id: 'new', label: 'New batch' }, { id: 'history', label: 'Batch history' }, { id: 'summary', label: 'Cost summary' }].map(tab => <button className={button + (view === tab.id ? ' bg-[#252525]! text-white! border-[#252525]!' : '')} aria-pressed={view === tab.id} key={tab.id} onClick={() => setView(tab.id)}>{tab.label}</button>)}</nav>
      {view !== 'new' && <div className={panel + ' mb-6'}><label className="block max-w-sm text-xs text-[#888]">Filter product<select className={field + ' mt-2'} value={filterPerfume} onChange={e => setFilterPerfume(e.target.value)}><option value="">All perfumes</option>{perfumes.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label><p className="mb-0 mt-3 text-[11px] text-[#999]">Batch quantities track production records and are separate from storefront inventory.</p></div>}
      <ErrorNotice message={view === 'history' ? recordsError : view === 'summary' ? wacError : ''} />
      <ErrorNotice message={productsError} onRetry={fetchPerfumes} />

      {/* ── 2-col layout ── */}
      <div className={view === 'new' ? 'grid grid-cols-1 gap-6 items-start xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : 'block'}>

        {/* ════════════════════════════════════════════════
            LEFT — New Batch Form
        ════════════════════════════════════════════════ */}
        <div className={view === 'new' ? panel : 'hidden'}>
          {/* Form header */}
          <div className="px-5 py-4 border-b border-[#f0f0f0]">
            <p className="text-[10px] font-bold tracking-[3px] text-[#666]">NEW COST RECORD</p>
          </div>

          <div className="p-5">
            {/* Perfume */}
            <div className="mb-5">
              <label className="text-[10px] font-bold tracking-[2px] text-[#888] block mb-2">SELECT PERFUME</label>
              <SearchableSelect perfumes={perfumes} value={selectedPerfume}
                onChange={(id) => { setSelectedPerfume(id); setCustomSellingPrice(''); }} />
            </div>

            {/* Bottles + Sell price */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-[10px] font-bold tracking-[2px] text-[#888] block mb-2">BOTTLES PRODUCED</label>
                <input type="number" min="1" value={bottles} onChange={e => setBottles(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full border border-[#ddd] px-3 py-2.5 text-sm outline-none focus:border-black transition-colors" />
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="text-[10px] font-bold tracking-[2px] text-[#888]">SELL PRICE (TK)</label>
                  {perfumeData && (
                    <span className="text-[9px] text-[#bbb]">Default {fmt(perfumeData.price)}</span>
                  )}
                </div>
                <input type="number" min="0" value={customSellingPrice}
                  onChange={e => setCustomSellingPrice(e.target.value)}
                  placeholder={perfumeData ? `${perfumeData.price}` : 'e.g. 1500'}
                  className="w-full border border-[#ddd] px-3 py-2.5 text-sm outline-none focus:border-black transition-colors" />
              </div>
            </div>

            {/* Ingredients */}
            <RowEditor rows={ingredients} label="INGREDIENTS / ITEMS"
              onUpdate={updateIng}
              onAdd={() => setIngredients([...ingredients, emptyIngredient()])}
              onRemove={i => setIngredients(ingredients.filter((_, idx) => idx !== i))} />

            {/* Packaging */}
            <div className="border-t border-[#f0f0f0] pt-4 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold tracking-[2px] text-[#888]">📦 PACKAGING</span>
                {pkgCost > 0 && (
                  <span className="text-[9px] bg-[#f5f5f5] px-2 py-0.5 font-bold text-[#666]">
                    {fmt(pkgCost)} TK
                  </span>
                )}
              </div>
              <RowEditor rows={packaging} label="PACKAGING ITEMS"
                onUpdate={updatePkg}
                onAdd={() => setPackaging([...packaging, emptyPackaging()])}
                onRemove={i => setPackaging(packaging.filter((_, idx) => idx !== i))} />
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="text-[10px] font-bold tracking-[2px] text-[#888] block mb-2">NOTES (OPTIONAL)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Winter batch, bought from Chawkbazar…" rows={2}
                className="w-full border border-[#ddd] px-3 py-2.5 text-sm outline-none resize-none focus:border-black transition-colors" />
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full bg-black text-white py-3.5 text-[10px] font-bold tracking-[3px] hover:bg-[#111] transition-colors disabled:opacity-50 cursor-pointer border-none">
              {saving ? 'SAVING…' : 'SAVE COST RECORD'}
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            RIGHT — WAC + History
        ════════════════════════════════════════════════ */}
        {view === 'new' && <aside className={panel + ' xl:sticky xl:top-6'}><h2 className="mb-5 font-sans! text-base font-semibold">Live batch breakdown</h2>            {/* Live Summary */}
            <div className="bg-[#fafafa] border border-[#ebebeb] p-4 mb-5">
              <p className="text-[9px] font-bold tracking-[3px] text-[#aaa] mb-3">LIVE SUMMARY</p>
              <div className="grid grid-cols-2 gap-y-2">
                <StatRow label="Ingredient Cost"   value={`${fmt(ingCost)} TK`} />
                <StatRow label="Packaging Cost"    value={pkgCost > 0 ? `${fmt(pkgCost)} TK` : '—'} />
                <StatRow label="Total Batch Cost"  value={`${fmt(totalCost)} TK`} />
                <StatRow label="Bottles Produced"  value={bottleCount || '—'} />
                <StatRow label="Cost Per Bottle"   value={cpb > 0 ? `${cpb.toFixed(0)} TK` : '—'} />
                <StatRow label="Selling Price"     value={sp > 0 ? `${fmt(sp)} TK` : '—'} />
                <StatRow label="Profit / Bottle"   value={bottleCount > 0 ? `${profitPB.toFixed(0)} TK` : '—'} />
              </div>
              <div className="mt-3 pt-3 border-t border-[#e8e8e8] flex items-center justify-between">
                <span className="text-[11px] text-[#888]">Profit Margin</span>
                <span className="text-base font-bold" style={{ color: marginColor(margin) }}>
                  {sp > 0 ? `${margin.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>

<div className="flex justify-between text-sm"><span>Markup on cost</span><strong>{cpb > 0 ? costPercentages(cpb, sp).markup.toFixed(1) + '%' : 'N/A'}</strong></div><p className="mt-5 text-xs leading-6 text-[#888]">Enter the total cost for each quantity used in this batch. Quantities are descriptive; costs are summed once. Gross margin = profit / selling price. Markup = profit / cost.</p><p className="mb-0 text-[11px] leading-6 text-[#999]">These are estimated gross figures, excluding expenses not recorded here.</p></aside>}
        {view === 'summary' && (wacLoading ? <p role="status" className="py-12 text-center text-sm text-[#999]">Loading cost summary...</p> : !wacError && !wacSummaries.length ? <Empty>No remaining batches for this product.</Empty> : null)}
        <div className={view === 'new' ? 'hidden' : 'min-w-0'}>

          {/* ── WAC SUMMARY ── */}
          {view === 'summary' && !wacLoading && !wacError && wacSummaries.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <p className="text-[10px] font-bold tracking-[3px] text-[#666]">WEIGHTED AVG COST</p>
                <div className="flex-1 h-px bg-[#eee]" />
                <span className="text-[9px] text-[#bbb] tracking-wider">{wacSummaries.length} product{wacSummaries.length !== 1 ? 's' : ''}</span>
              </div>

              <p className="mb-5 text-xs leading-6 text-[#888]">Weighted average cost = sum of (batch cost per bottle x remaining bottles) / all remaining bottles. Gross margin uses selling price as the denominator; markup uses cost. Figures exclude costs not entered in the batch.</p>
              {/* WAC cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                {wacSummaries.map(s => {
                  const mc = marginColor(s.profitMargin);
                  return (
                    <div key={s.perfumeId} className="rounded-xl border border-[#e8e8e8] bg-white overflow-hidden">
                      {/* Card header */}
                      <div className="px-4 py-3 flex items-center justify-between border-b border-[#f0f0f0]"
                        style={{ borderLeft: `3px solid ${mc}` }}>
                        <p className="text-[11px] font-bold tracking-wider truncate pr-2">
                          {s.perfumeName.toUpperCase()}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-[#aaa]">{s.totalBottles} batch bottles left</span>
                          <span className="text-sm font-bold" style={{ color: mc }}>{s.profitMargin}%</span>
                        </div>
                      </div>

                      {/* Card stats */}
                      <div className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <span className="text-[10px] text-[#999]">WAC / Bottle</span>
                          <span className="text-[10px] font-bold text-right">{fmt(s.wac)} TK</span>

                          <span className="text-[10px] text-[#999]">Selling Price</span>
                          <span className="text-[10px] font-bold text-right">{fmt(s.sellingPrice)} TK</span>

                          <span className="text-[10px] text-[#999]">Gross profit / Bottle</span>
                          <span className="text-[10px] font-bold text-right" style={{ color: mc }}>
                            {fmt(s.profitPerBottle)} TK
                          </span>

                          <span className="text-[10px] text-[#999]">Stock Value</span>
                          <span className="text-[10px] font-bold text-right">
                            {fmt(Math.round(s.wac * s.totalBottles))} TK
                          </span>
                        </div>

                        {/* Multi-batch breakdown */}
                        {s.batches.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
                            <p className="text-[9px] text-[#bbb] font-bold tracking-wider mb-2">BATCH BREAKDOWN</p>
                            <div className="flex flex-col gap-1">
                              {s.batches.map((b, i) => (
                                <div key={i} className="flex items-center justify-between text-[10px]">
                                  <span className="text-[#888]">
                                    {new Date(b.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    <span className="text-[#ccc] mx-1">·</span>
                                    {b.costPerBottle.toFixed(0)} TK/bottle
                                  </span>
                                  <span className="font-bold text-[#555]">{b.remaining} left</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── COST HISTORY ── */}
          <section className={view === 'history' ? 'block' : 'hidden'}>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[10px] font-bold tracking-[3px] text-[#666]">COST HISTORY</p>
              <div className="flex-1 h-px bg-[#eee]" />
              {/* Filter */}
              <select value={filterPerfume} onChange={e => setFilterPerfume(e.target.value)}
                className="border border-[#ddd] px-3 py-1.5 text-[10px] outline-none bg-white hover:border-black transition-colors cursor-pointer tracking-wider">
                <option value="">ALL PERFUMES</option>
                {perfumes.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>

            {recordsLoading ? <p role="status" className="py-12 text-center text-sm text-[#999]">Loading batch history...</p> : recordsError ? null : records.length === 0 ? (
              <div className="border border-[#eee] py-20 text-center text-[#ccc] tracking-[3px] text-[11px]">
                NO RECORDS YET.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {records.map(r => {
                  const mc      = marginColor(r.profitMargin);
                  const totalPkg = r.packaging?.reduce((s, p) => s + (p.cost || 0), 0) || 0;
                  const remaining = r.remainingBottles ?? r.bottlesProduced;
                  const isExpanded = expandedRecord === r._id;

                  return (
                    <div key={r._id} className="rounded-xl border border-[#e8e8e8] bg-white overflow-hidden">

                      {/* ── Record header (always visible, click to expand) ── */}
                      <div
                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#fafafa] transition-colors"
                        style={{ borderLeft: `3px solid ${mc}` }}
                        onClick={() => setExpandedRecord(isExpanded ? null : r._id)}
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold tracking-wider truncate">
                            {r.perfumeName.toUpperCase()}
                          </p>
                          <p className="text-[10px] text-[#aaa] mt-0.5">
                            {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <span className="mx-1.5 text-[#ddd]">·</span>
                            {r.bottlesProduced} produced
                            <span className="mx-1.5 text-[#ddd]">·</span>
                            <span className={remaining === 0 ? 'text-red-400' : 'text-[#aaa]'}>
                              {remaining} remaining
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-[#aaa]">Cost/bottle</p>
                            <p className="text-[11px] font-bold">{r.costPerBottle.toFixed(0)} TK</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-[#aaa]">Sell price</p>
                            <p className="text-[11px] font-bold">{fmt(r.sellingPrice)} TK</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-bold" style={{ color: mc }}>
                              {r.profitMargin.toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-[#ccc] text-sm">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* ── Expanded detail ── */}
                      {isExpanded && (
                        <div className="border-t border-[#f0f0f0]">

                          {/* Ingredients + Packaging side by side */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f0f0]">
                            {/* Ingredients */}
                            <div className="px-4 py-3">
                              <p className="text-[9px] font-bold tracking-[2px] text-[#bbb] mb-2">INGREDIENTS</p>
                              {r.ingredients.map((ing, i) => (
                                <div key={i} className="flex justify-between text-[11px] text-[#555] mb-1.5">
                                  <span className="truncate pr-2">
                                    {ing.name}
                                    {ing.qty ? <span className="text-[#aaa] ml-1">({ing.qty}{ing.unit})</span> : ''}
                                  </span>
                                  <span className="font-semibold flex-shrink-0">{fmt(ing.cost)} TK</span>
                                </div>
                              ))}
                            </div>

                            {/* Packaging (if any) */}
                            {r.packaging?.length > 0 && (
                              <div className="px-4 py-3">
                                <p className="text-[9px] font-bold tracking-[2px] text-[#bbb] mb-2">📦 PACKAGING</p>
                                {r.packaging.map((p, i) => (
                                  <div key={i} className="flex justify-between text-[11px] text-[#555] mb-1.5">
                                    <span className="truncate pr-2">
                                      {p.name}
                                      {p.qty ? <span className="text-[#aaa] ml-1">({p.qty}{p.unit})</span> : ''}
                                    </span>
                                    <span className="font-semibold flex-shrink-0">{fmt(p.cost)} TK</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Key stats bar */}
                          <div className="border-t border-[#f0f0f0] px-4 py-3 bg-[#fafafa]">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { l: 'Batch Cost',    v: `${fmt(r.totalCost)} TK` },
                                ...(totalPkg > 0 ? [{ l: 'Packaging', v: `${fmt(totalPkg)} TK` }] : []),
                                { l: 'Cost / Bottle', v: `${r.costPerBottle.toFixed(0)} TK` },
                                { l: 'Sell Price',    v: `${fmt(r.sellingPrice)} TK` },
                                { l: 'Profit / Bottle', v: `${r.profitPerBottle.toFixed(0)} TK`, color: mc },
                              ].map(({ l, v, color }) => (
                                <div key={l}>
                                  <p className="text-[9px] text-[#aaa] tracking-wider mb-0.5">{l}</p>
                                  <p className="text-[12px] font-bold" style={color ? { color } : {}}>
                                    {v}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          {r.notes && (
                            <div className="px-4 py-2.5 border-t border-[#f0f0f0] bg-[#fafafa]">
                              <p className="text-[10px] text-[#888] italic">"{r.notes}"</p>
                            </div>
                          )}

                          {/* Actions row */}
                          <div className="border-t border-[#f0f0f0] px-4 py-3 flex flex-wrap items-center gap-3">

                            {/* Quick sell price edit */}
                            {priceEdit?.recordId === r._id ? (
                              <div className="flex items-center gap-2 bg-[#f5f5f5] border border-[#e8e8e8] px-3 py-2">
                                <span className="text-[9px] font-bold text-[#888] tracking-wider whitespace-nowrap">SELL PRICE:</span>
                                <input type="number" min="0" value={priceEdit.price}
                                  onChange={e => setPriceEdit({ ...priceEdit, price: e.target.value })}
                                  className="border border-[#ddd] px-2 py-1 text-xs outline-none w-24 bg-white focus:border-black" />
                                <button onClick={() => handlePriceUpdate(r._id)}
                                  className="bg-black text-white text-[9px] font-bold tracking-wider px-3 py-1 cursor-pointer border-none">SAVE</button>
                                <button onClick={() => setPriceEdit(null)}
                                  className="text-[10px] text-[#aaa] cursor-pointer bg-transparent border-none">×</button>
                              </div>
                            ) : (
                              <button onClick={() => setPriceEdit({ recordId: r._id, price: r.sellingPrice })}
                                className="text-[10px] text-[#666] hover:text-black transition-colors cursor-pointer bg-transparent border border-[#e8e8e8] hover:border-black px-3 py-1.5 tracking-wider">
                                ✏ EDIT PRICE
                              </button>
                            )}

                            {/* Mark sold */}
                            {remaining > 0 && (
                              stockEdit?.recordId === r._id ? (
                                <div className="flex items-center gap-2 bg-[#f5f5f5] border border-[#e8e8e8] px-3 py-2">
                                  <span className="text-[9px] font-bold text-[#888] tracking-wider whitespace-nowrap">SOLD:</span>
                                  <input type="number" min="1" max={remaining}
                                    value={stockEdit.sold} onChange={e => setStockEdit({ ...stockEdit, sold: e.target.value })}
                                    className="border border-[#ddd] px-2 py-1 text-xs outline-none w-16 bg-white focus:border-black" />
                                  <button onClick={() => handleStockUpdate(r._id)}
                                    className="bg-black text-white text-[9px] font-bold tracking-wider px-3 py-1 cursor-pointer border-none">CONFIRM</button>
                                  <button onClick={() => setStockEdit(null)}
                                    className="text-[10px] text-[#aaa] cursor-pointer bg-transparent border-none">×</button>
                                </div>
                              ) : (
                                <button onClick={() => setStockEdit({ recordId: r._id, sold: '' })}
                                  className="text-[10px] text-[#666] hover:text-black transition-colors cursor-pointer bg-transparent border border-[#e8e8e8] hover:border-black px-3 py-1.5 tracking-wider">
                                  MARK SOLD
                                </button>
                              )
                            )}

                            {/* Edit batch */}
                            <button onClick={() => openEditModal(r)}
                              className="text-[10px] text-[#666] hover:text-black transition-colors cursor-pointer bg-transparent border border-[#e8e8e8] hover:border-black px-3 py-1.5 tracking-wider">
                              EDIT BATCH
                            </button>

                            {/* Spacer */}
                            <div className="flex-1" />

                            {/* Delete */}
                            {deleteConfirm === r._id ? (
                              <div className="flex gap-2">
                                <button onClick={() => handleDelete(r._id)}
                                  className="bg-red-600 text-white text-[9px] font-bold tracking-wider px-3 py-1.5 cursor-pointer border-none">
                                  CONFIRM DELETE
                                </button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="border border-[#ddd] text-[9px] font-bold tracking-wider px-3 py-1.5 cursor-pointer bg-white">
                                  CANCEL
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(r._id)}
                                className="text-[10px] text-[#ccc] hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none tracking-wider">
                                DELETE
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          EDIT BATCH MODAL
      ══════════════════════════════════════════════════════ */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] flex flex-col border border-[#ddd] shadow-2xl my-auto">

            {/* Modal header */}
            <div className="px-5 py-4 border-b border-[#eee] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <p className="text-sm font-bold tracking-[2px]">
                  EDIT BATCH — {editingBatch.perfumeName?.toUpperCase()}
                </p>
                <p className="text-[10px] text-[#aaa] mt-0.5">
                  {new Date(editingBatch.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setEditingBatch(null)}
                className="text-[#aaa] hover:text-black text-2xl leading-none bg-transparent border-none cursor-pointer w-8 h-8 flex items-center justify-center">
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 overflow-y-auto flex-1">

              {/* Batch meta */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'BOTTLES PRODUCED', key: 'bottlesProduced', min: 1 },
                  { label: 'REMAINING IN STOCK', key: 'remainingBottles', min: 0 },
                  { label: 'SELLING PRICE (TK)', key: 'sellingPrice', min: 0 },
                ].map(({ label, key, min }) => (
                  <div key={key}>
                    <label className="text-[10px] font-bold tracking-[2px] text-[#888] block mb-2">{label}</label>
                    <input type="number" min={min} value={editingBatch[key]}
                      onChange={e => setEditingBatch({ ...editingBatch, [key]: e.target.value })}
                      className="w-full border border-[#ddd] px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
                  </div>
                ))}
              </div>

              {/* Ingredients */}
              <RowEditor rows={editingBatch.ingredients} label="INGREDIENTS / ITEMS"
                onUpdate={updateEditIng}
                onAdd={() => setEditingBatch({ ...editingBatch, ingredients: [...editingBatch.ingredients, emptyIngredient()] })}
                onRemove={i => setEditingBatch({ ...editingBatch, ingredients: editingBatch.ingredients.filter((_, idx) => idx !== i) })} />

              {/* Packaging */}
              <div className="border-t border-[#eee] pt-4 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold tracking-[2px] text-[#888]">📦 PACKAGING</span>
                  {ePkgCost > 0 && (
                    <span className="text-[9px] bg-[#f5f5f5] px-2 py-0.5 font-bold text-[#666]">
                      {fmt(ePkgCost)} TK
                    </span>
                  )}
                </div>
                <RowEditor rows={editingBatch.packaging} label="PACKAGING ITEMS"
                  onUpdate={updateEditPkg}
                  onAdd={() => setEditingBatch({ ...editingBatch, packaging: [...editingBatch.packaging, emptyPackaging()] })}
                  onRemove={i => setEditingBatch({ ...editingBatch, packaging: editingBatch.packaging.filter((_, idx) => idx !== i) })} />
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="text-[10px] font-bold tracking-[2px] text-[#888] block mb-2">NOTES</label>
                <textarea value={editingBatch.notes}
                  onChange={e => setEditingBatch({ ...editingBatch, notes: e.target.value })}
                  placeholder="Notes about this batch…" rows={2}
                  className="w-full border border-[#ddd] px-3 py-2 text-sm outline-none resize-none focus:border-black transition-colors" />
              </div>

              {/* Updated summary */}
              <div className="bg-[#fafafa] border border-[#ebebeb] p-4">
                <p className="text-[9px] font-bold tracking-[3px] text-[#aaa] mb-3">UPDATED SUMMARY</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { l: 'Total Cost',     v: `${fmt(eTotalCost)} TK` },
                    { l: 'Cost / Bottle',  v: eCPB > 0 ? `${eCPB.toFixed(0)} TK` : '—' },
                    { l: 'Sell Price',     v: eSP > 0  ? `${fmt(eSP)} TK` : '—' },
                    { l: 'Profit Margin',  v: eMargin > 0 ? `${eMargin.toFixed(1)}%` : '—', color: marginColor(eMargin) },
                  ].map(({ l, v, color }) => (
                    <div key={l}>
                      <p className="text-[9px] text-[#aaa] tracking-wider mb-1">{l}</p>
                      <p className="text-sm font-bold" style={color ? { color } : {}}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-[#eee] bg-[#fafafa] flex gap-3 justify-end sticky bottom-0">
              <button onClick={() => setEditingBatch(null)}
                className="px-5 py-2.5 border border-[#ddd] text-[10px] font-bold tracking-wider hover:bg-gray-100 transition-colors cursor-pointer bg-white">
                CANCEL
              </button>
              <button onClick={handleSaveBatchEdit} disabled={updatingBatch}
                className="px-6 py-2.5 bg-black text-white text-[10px] font-bold tracking-wider hover:bg-[#111] transition-colors disabled:opacity-50 cursor-pointer border-none">
                {updatingBatch ? 'SAVING…' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCalculator;
