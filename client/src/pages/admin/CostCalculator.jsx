import React, { useState, useEffect } from 'react';
import adminAxios from '../../utils/adminAxios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UNITS = ['ml', 'g', 'kg', 'L', 'pcs', 'bottle', 'box', ''];

const emptyIngredient  = () => ({ name: '', qty: '', unit: 'ml', cost: '' });
const emptyPackaging   = () => ({ name: '', qty: '', unit: 'pcs', cost: '' });

const RowEditor = ({ rows, onUpdate, onAdd, onRemove, label }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-3">
      <label className="text-[10px] font-bold tracking-[2px] text-[#888]">{label}</label>
      <button onClick={onAdd}
        className="text-[10px] font-bold tracking-wider px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer bg-white">
        + ADD ROW
      </button>
    </div>
    {/* Desktop header */}
    <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mb-2">
      {['ITEM', 'QTY', 'UNIT', 'COST (TK)', ''].map((h, i) => (
        <span key={i} className="text-[9px] font-bold tracking-wider text-[#aaa]">{h}</span>
      ))}
    </div>
    <div className="flex flex-col gap-3 sm:gap-2">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center border border-[#eee] sm:border-0 p-3 sm:p-0">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[9px] font-bold text-[#aaa] sm:hidden mb-1 block">ITEM</span>
            <input value={row.name} onChange={e => onUpdate(i, 'name', e.target.value)}
              placeholder={label === 'INGREDIENTS / ITEMS' ? 'e.g. Oud Oil' : 'e.g. Glass Bottle'}
              className="border border-[#ddd] px-2 py-2 text-xs outline-none w-full" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-[#aaa] sm:hidden mb-1 block">QTY</span>
            <input type="number" value={row.qty} onChange={e => onUpdate(i, 'qty', e.target.value)}
              placeholder="50" className="border border-[#ddd] px-2 py-2 text-xs outline-none w-full" />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <span className="text-[9px] font-bold text-[#aaa] sm:hidden mb-1 block">UNIT</span>
              <select value={row.unit} onChange={e => onUpdate(i, 'unit', e.target.value)}
                className="border border-[#ddd] px-2 py-2 text-xs outline-none bg-white w-full">
                {UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <span className="text-[9px] font-bold text-[#aaa] sm:hidden mb-1 block">COST (TK)</span>
              <input type="number" value={row.cost} onChange={e => onUpdate(i, 'cost', e.target.value)}
                placeholder="2000" className="border border-[#ddd] px-2 py-2 text-xs outline-none w-full" />
            </div>
            <button onClick={() => onRemove(i)} disabled={rows.length === 1}
              className="text-[#ccc] hover:text-red-500 disabled:opacity-20 text-lg leading-none cursor-pointer bg-transparent border-none px-1 sm:mb-0 mb-1">×</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CostCalculator = () => {
  const [perfumes, setPerfumes]           = useState([]);
  const [records, setRecords]             = useState([]);
  const [selectedPerfume, setSelectedPerfume] = useState('');
  const [ingredients, setIngredients]     = useState([emptyIngredient()]);
  const [packaging, setPackaging]         = useState([emptyPackaging()]);
  const [bottles, setBottles]             = useState('');
  const [notes, setNotes]                 = useState('');
  const [saving, setSaving]               = useState(false);
  const [toast, setToast]                 = useState('');
  const [filterPerfume, setFilterPerfume] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [wacSummaries, setWacSummaries]   = useState([]);
  const [stockEdit, setStockEdit]         = useState(null); // { recordId, sold: '' }

  useEffect(() => {
    adminAxios.get(`${API_URL}/api/perfumes`).then(r => setPerfumes(r.data)).catch(() => {});
    fetchRecords();
    fetchWac();
  }, []);

  const fetchRecords = async (pid = '') => {
    try {
      const url = pid ? `${API_URL}/api/costs?perfumeId=${pid}` : `${API_URL}/api/costs`;
      const res = await adminAxios.get(url);
      setRecords(res.data);
    } catch {}
  };

  useEffect(() => { fetchRecords(filterPerfume); fetchWac(filterPerfume); }, [filterPerfume]);

  const fetchWac = async (pid = '') => {
    try {
      const url = pid ? `${API_URL}/api/costs/summary/wac?perfumeId=${pid}` : `${API_URL}/api/costs/summary/wac`;
      const res = await adminAxios.get(url);
      setWacSummaries(res.data);
    } catch {}
  };

  // ── Live calculations ─────────────────────────────────────
  const ingredientCost = ingredients.reduce((s, i) => s + (Number(i.cost) || 0), 0);
  const packagingCost  = packaging.reduce((s, p) => s + (Number(p.cost) || 0), 0);
  const totalCost      = ingredientCost + packagingCost;
  const bottleCount    = Number(bottles) || 0;
  const costPerBottle  = bottleCount > 0 ? totalCost / bottleCount : 0;
  const perfumeData    = perfumes.find(p => p._id === selectedPerfume);
  const sellingPrice   = perfumeData?.price || 0;
  const profit         = sellingPrice - costPerBottle;
  const margin         = sellingPrice > 0 ? ((profit / sellingPrice) * 100) : 0;

  // ── Ingredient helpers ────────────────────────────────────
  const updateIngredient = (i, field, value) => {
    const u = [...ingredients]; u[i] = { ...u[i], [field]: value }; setIngredients(u);
  };
  const updatePackaging = (i, field, value) => {
    const u = [...packaging]; u[i] = { ...u[i], [field]: value }; setPackaging(u);
  };

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedPerfume)   return showToast('Please select a perfume');
    if (bottleCount <= 0)   return showToast('Enter number of bottles produced');
    if (ingredients.some(i => !i.name || !i.cost)) return showToast('Fill in all ingredient names and costs');

    setSaving(true);
    try {
      await adminAxios.post(`${API_URL}/api/costs`, {
        perfumeId: selectedPerfume,
        ingredients: ingredients.map(i => ({ ...i, qty: Number(i.qty), cost: Number(i.cost) })),
        packaging:   packaging.filter(p => p.name).map(p => ({ ...p, qty: Number(p.qty), cost: Number(p.cost) })),
        bottlesProduced: bottleCount,
        notes,
      });
      showToast('✓ Cost record saved');
      setIngredients([emptyIngredient()]);
      setPackaging([emptyPackaging()]);
      setBottles('');
      setNotes('');
      setSelectedPerfume('');
      fetchRecords(filterPerfume);
      fetchWac(filterPerfume);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await adminAxios.delete(`${API_URL}/api/costs/${id}`);
      showToast('Record deleted');
      fetchRecords(filterPerfume);
      fetchWac(filterPerfume);
    } catch { showToast('Failed to delete'); }
    setDeleteConfirm(null);
  };

  const handleStockUpdate = async (recordId) => {
    const sold = Number(stockEdit?.sold);
    if (!sold || sold <= 0) return showToast('Enter bottles sold');
    try {
      await adminAxios.patch(`${API_URL}/api/costs/${recordId}/stock`, { sold });
      showToast(`✓ ${sold} bottle(s) sold from batch`);
      setStockEdit(null);
      fetchRecords(filterPerfume);
      fetchWac(filterPerfume);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update stock');
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const marginColor = margin >= 60 ? '#16a34a' : margin >= 30 ? '#d97706' : '#dc2626';

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-black text-white px-4 py-2.5 sm:px-5 sm:py-3 text-xs tracking-widest max-w-[90vw]">{toast}</div>
      )}

      <h1 className="text-xl sm:text-2xl font-light tracking-[5px] sm:tracking-[8px] mb-1">COST CALCULATOR</h1>
      <p className="text-[11px] text-[#888] tracking-[2px] mb-6 sm:mb-10">Calculate production cost and profit margin per perfume batch.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-10">

        {/* ── LEFT: Calculator Form ── */}
        <div className="border border-[#eee] p-4 sm:p-6">
          <p className="text-[10px] font-bold tracking-[3px] text-[#888] mb-6">NEW COST RECORD</p>

          {/* Perfume selector */}
          <div className="mb-5">
            <label className="text-[10px] font-bold tracking-[2px] text-[#888] block mb-2">SELECT PERFUME</label>
            <select value={selectedPerfume} onChange={e => setSelectedPerfume(e.target.value)}
              className="w-full border border-[#ddd] px-3 py-2.5 text-sm outline-none bg-white">
              <option value="">— Choose a perfume —</option>
              {perfumes.map(p => (
                <option key={p._id} value={p._id}>{p.name} — {p.price.toLocaleString()} TK</option>
              ))}
            </select>
          </div>

          {/* Bottles */}
          <div className="mb-6">
            <label className="text-[10px] font-bold tracking-[2px] text-[#888] block mb-2">BOTTLES PRODUCED FROM THIS BATCH</label>
            <input type="number" min="1" value={bottles} onChange={e => setBottles(e.target.value)}
              placeholder="e.g. 10" className="w-full border border-[#ddd] px-3 py-2.5 text-sm outline-none" />
          </div>

          {/* Ingredients */}
          <RowEditor
            rows={ingredients} label="INGREDIENTS / ITEMS"
            onUpdate={updateIngredient}
            onAdd={() => setIngredients([...ingredients, emptyIngredient()])}
            onRemove={i => setIngredients(ingredients.filter((_, idx) => idx !== i))}
          />

          {/* ── Packaging Materials ── */}
          <div className="border-t border-[#eee] pt-5 mb-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold tracking-[2px] text-[#888]">📦 PACKAGING MATERIALS</span>
              {packagingCost > 0 && (
                <span className="text-[9px] bg-[#f0f0f0] px-2 py-0.5 font-bold text-[#555]">
                  {packagingCost.toLocaleString()} TK total
                </span>
              )}
            </div>
            <RowEditor
              rows={packaging} label="PACKAGING ITEMS"
              onUpdate={updatePackaging}
              onAdd={() => setPackaging([...packaging, emptyPackaging()])}
              onRemove={i => setPackaging(packaging.filter((_, idx) => idx !== i))}
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-[10px] font-bold tracking-[2px] text-[#888] block mb-2">NOTES (OPTIONAL)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Winter batch, bought from Chawkbazar..." rows={2}
              className="w-full border border-[#ddd] px-3 py-2.5 text-sm outline-none resize-none" />
          </div>

          {/* Live Summary */}
          <div className="bg-[#fafafa] border border-[#eee] p-4 sm:p-5 mb-6">
            <p className="text-[10px] font-bold tracking-[3px] text-[#888] mb-4">LIVE SUMMARY</p>
            <div className="grid grid-cols-2 gap-y-2 sm:gap-y-3">
              {[
                ['Ingredient Cost',   `${ingredientCost.toLocaleString()} TK`],
                ['Packaging Cost',    packagingCost > 0 ? `${packagingCost.toLocaleString()} TK` : '—'],
                ['Total Batch Cost',  `${totalCost.toLocaleString()} TK`],
                ['Bottles Produced',  bottleCount || '—'],
                ['Cost Per Bottle',   costPerBottle > 0 ? `${costPerBottle.toFixed(0)} TK` : '—'],
                ['Selling Price',     sellingPrice > 0 ? `${sellingPrice.toLocaleString()} TK` : '—'],
                ['Profit Per Bottle', profit > 0 ? `${profit.toFixed(0)} TK` : '—'],
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <span className="text-[11px] text-[#888]">{label}</span>
                  <span className="text-[11px] font-bold text-right">{value}</span>
                </React.Fragment>
              ))}
              <span className="text-[11px] text-[#888]">Profit Margin</span>
              <span className="text-sm font-bold text-right" style={{ color: marginColor }}>
                {margin > 0 ? `${margin.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-black text-white py-3.5 text-[10px] font-bold tracking-[3px] hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer border-none">
            {saving ? 'SAVING...' : 'SAVE COST RECORD'}
          </button>
        </div>

        {/* ── RIGHT: History ── */}
        <div>
          {/* ── WAC Summary ── */}
          {wacSummaries.length > 0 && (
            <div className="mb-8">
              <p className="text-[10px] font-bold tracking-[3px] text-[#888] mb-4">WEIGHTED AVERAGE COST (STOCK)</p>
              <div className="flex flex-col gap-3">
                {wacSummaries.map(s => {
                  const mc = s.profitMargin >= 60 ? '#16a34a' : s.profitMargin >= 30 ? '#d97706' : '#dc2626';
                  return (
                    <div key={s.perfumeId} className="bg-[#fafafa] border border-[#eee] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold tracking-wider">{s.perfumeName.toUpperCase()}</p>
                        <span className="text-sm font-bold" style={{ color: mc }}>{s.profitMargin}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5">
                        <span className="text-[10px] text-[#aaa]">In Stock</span>
                        <span className="text-[10px] font-bold text-right">{s.totalBottles} bottles</span>
                        <span className="text-[10px] text-[#aaa]">Avg Cost/Bottle (WAC)</span>
                        <span className="text-[10px] font-bold text-right">{s.wac.toLocaleString()} TK</span>
                        <span className="text-[10px] text-[#aaa]">Selling Price</span>
                        <span className="text-[10px] font-bold text-right">{s.sellingPrice.toLocaleString()} TK</span>
                        <span className="text-[10px] text-[#aaa]">True Profit/Bottle</span>
                        <span className="text-[10px] font-bold text-right" style={{ color: mc }}>{s.profitPerBottle.toLocaleString()} TK</span>
                        <span className="text-[10px] text-[#aaa]">Stock Value</span>
                        <span className="text-[10px] font-bold text-right">{Math.round(s.wac * s.totalBottles).toLocaleString()} TK</span>
                      </div>
                      {s.batches.length > 1 && (
                        <div className="mt-2 border-t border-[#eee] pt-2">
                          <p className="text-[9px] text-[#bbb] font-bold tracking-wider mb-1">BATCHES</p>
                          {s.batches.map((b, i) => (
                            <div key={i} className="flex justify-between text-[10px] text-[#888]">
                              <span>{new Date(b.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {b.costPerBottle.toFixed(0)} TK/bottle</span>
                              <span>{b.remaining} left</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <p className="text-[10px] font-bold tracking-[3px] text-[#888]">COST HISTORY</p>
            <select value={filterPerfume} onChange={e => setFilterPerfume(e.target.value)}
              className="border border-[#ddd] px-3 py-2 text-xs outline-none bg-white">
              <option value="">All Perfumes</option>
              {perfumes.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-20 text-[#ccc] tracking-[3px] text-xs">NO RECORDS YET.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {records.map(r => {
                const mc = r.profitMargin >= 60 ? '#16a34a' : r.profitMargin >= 30 ? '#d97706' : '#dc2626';
                const totalPkg = r.packaging?.reduce((s, p) => s + (p.cost || 0), 0) || 0;
                return (
                  <div key={r._id} className="border border-[#eee] p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold tracking-wider">{r.perfumeName.toUpperCase()}</p>
                        <p className="text-[10px] text-[#aaa] mt-0.5">
                          {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: mc }}>{r.profitMargin.toFixed(1)}%</span>
                    </div>

                    {/* Ingredients */}
                    <div className="mb-2 border-t border-[#f5f5f5] pt-3">
                      <p className="text-[9px] font-bold tracking-wider text-[#bbb] mb-1.5">INGREDIENTS</p>
                      {r.ingredients.map((ing, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-[#666] mb-1">
                          <span>{ing.name} {ing.qty ? `(${ing.qty}${ing.unit})` : ''}</span>
                          <span>{Number(ing.cost).toLocaleString()} TK</span>
                        </div>
                      ))}
                    </div>

                    {/* Packaging */}
                    {r.packaging?.length > 0 && (
                      <div className="mb-3 border-t border-[#f5f5f5] pt-3">
                        <p className="text-[9px] font-bold tracking-wider text-[#bbb] mb-1.5">📦 PACKAGING</p>
                        {r.packaging.map((p, i) => (
                          <div key={i} className="flex justify-between text-[11px] text-[#666] mb-1">
                            <span>{p.name} {p.qty ? `(${p.qty}${p.unit})` : ''}</span>
                            <span>{Number(p.cost).toLocaleString()} TK</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[#f5f5f5] pt-3 mb-3">
                      {[
                        ['Batch Cost',    `${r.totalCost.toLocaleString()} TK`],
                        ...(totalPkg > 0 ? [['Packaging', `${totalPkg.toLocaleString()} TK`]] : []),
                        ['Bottles',       r.bottlesProduced],
                        ['Remaining',     `${r.remainingBottles ?? r.bottlesProduced} of ${r.bottlesProduced}`],
                        ['Cost/Bottle',   `${r.costPerBottle.toFixed(0)} TK`],
                        ['Selling Price', `${r.sellingPrice.toLocaleString()} TK`],
                        ['Profit/Bottle', `${r.profitPerBottle.toFixed(0)} TK`],
                      ].map(([label, value]) => (
                        <React.Fragment key={label}>
                          <span className="text-[10px] text-[#aaa]">{label}</span>
                          <span className="text-[10px] font-bold">{value}</span>
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Stock adjustment */}
                    {(r.remainingBottles ?? r.bottlesProduced) > 0 && (
                      <div className="border-t border-[#f5f5f5] pt-2 mb-3">
                        {stockEdit?.recordId === r._id ? (
                          <div className="flex flex-wrap gap-2 items-center">
                            <input type="number" min="1" max={r.remainingBottles ?? r.bottlesProduced}
                              value={stockEdit.sold} onChange={e => setStockEdit({ ...stockEdit, sold: e.target.value })}
                              placeholder="Sold qty" className="border border-[#ddd] px-2 py-1.5 text-xs outline-none w-20" />
                            <button onClick={() => handleStockUpdate(r._id)}
                              className="bg-black text-white text-[9px] font-bold tracking-wider px-3 py-1.5 cursor-pointer border-none">SELL</button>
                            <button onClick={() => setStockEdit(null)}
                              className="text-[10px] text-[#aaa] cursor-pointer bg-transparent border-none">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setStockEdit({ recordId: r._id, sold: '' })}
                            className="text-[10px] text-[#888] hover:text-black transition-colors cursor-pointer bg-transparent border-none tracking-wider">
                            MARK SOLD FROM BATCH
                          </button>
                        )}
                      </div>
                    )}

                    {r.notes && (
                      <p className="text-[10px] text-[#888] italic border-t border-[#f5f5f5] pt-2 mb-3">{r.notes}</p>
                    )}

                    {deleteConfirm === r._id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(r._id)}
                          className="flex-1 bg-red-600 text-white text-[10px] font-bold tracking-wider py-2 cursor-pointer border-none">CONFIRM DELETE</button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="flex-1 border border-[#ddd] text-[10px] font-bold tracking-wider py-2 cursor-pointer bg-white">CANCEL</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(r._id)}
                        className="text-[10px] text-[#ccc] hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none tracking-wider">
                        DELETE RECORD
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostCalculator;