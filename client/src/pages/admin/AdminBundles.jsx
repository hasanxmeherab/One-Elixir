import React, { useState, useEffect } from 'react';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { useToast } from '../../context/ToastContext';
import { X, ImagePlus } from 'lucide-react';

const API_URL       = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const AdminBundles = () => {
  const toast = useToast();
  const [bundles, setBundles]     = useState([]);
  const [perfumes, setPerfumes]   = useState([]);
  const [editId, setEditId]       = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', bundlePrice: '',
    products: [], image: '', active: true,
  });

  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });

  const fetchAll = async () => {
    try {
      const [bRes, pRes] = await Promise.all([
        adminAxios.get(`${API_URL}/api/bundles?admin=true`),
        adminAxios.get(`${API_URL}/api/perfumes`),
      ]);
      setBundles(bRes.data);
      setPerfumes(pRes.data);
    } catch { toast.error('Failed to load data'); }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', bundlePrice: '', products: [], image: '', active: true });
    setEditId(null);
    setImageFile(null);
  };

  const handleEdit = (b) => {
    setEditId(b._id);
    setForm({
      name: b.name, description: b.description,
      bundlePrice: b.bundlePrice, image: b.image,
      products: b.products.map(p => p._id || p),
      active: b.active,
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleProduct = (id) => {
    setForm(f => ({
      ...f,
      products: f.products.includes(id) ? f.products.filter(x => x !== id) : [...f.products, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.products.length < 2) return toast.error('Select at least 2 products for a bundle.');
    if (!form.bundlePrice)        return toast.error('Set a bundle price.');
    try {
      setUploading(true);
      let imageUrl = form.image;
      if (imageFile) {
        const data = new FormData();
        data.append('file', imageFile);
        data.append('upload_preset', UPLOAD_PRESET);
        data.append('cloud_name', CLOUD_NAME);
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
        imageUrl = res.data.secure_url;
      }
      const payload = { ...form, image: imageUrl, bundlePrice: Number(form.bundlePrice) };
      if (editId) {
        await adminAxios.put(`${API_URL}/api/bundles/${editId}`, payload);
        toast.success('Bundle updated!');
      } else {
        await adminAxios.post(`${API_URL}/api/bundles`, payload);
        toast.success('Bundle created!');
      }
      resetForm();
      fetchAll();
    } catch { toast.error('Failed to save bundle.'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await adminAxios.delete(`${API_URL}/api/bundles/${id}`);
      toast.success('Bundle deleted.');
      fetchAll();
    } catch { toast.error('Failed to delete.'); }
    setDeleteConfirm(null);
  };

  const toggleActive = async (b) => {
    try {
      await adminAxios.put(`${API_URL}/api/bundles/${b._id}`, { active: !b.active });
      fetchAll();
    } catch { toast.error('Failed to update.'); }
  };

  // Original price sum of selected products
  const selectedPerfumes = perfumes.filter(p => form.products.includes(p._id));
  const originalTotal    = selectedPerfumes.reduce((s, p) => s + p.price, 0);
  const savings          = originalTotal - (Number(form.bundlePrice) || 0);
  const savingsPct       = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

  return (
    <div className="max-w-[1100px]">
      <h3 className="tracking-[3px] font-bold mb-1">BUNDLE MANAGEMENT</h3>
      <p className="text-[11px] text-[#888] tracking-wider mb-8">Create product bundles with fixed pricing.</p>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="border border-[#eee] p-6 mb-10">
        <p className="text-[10px] font-bold tracking-[3px] text-[#888] mb-6">
          {editId ? 'EDIT BUNDLE' : 'CREATE NEW BUNDLE'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" placeholder="Bundle Name *" required
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="p-3 border border-[#ddd] outline-none text-sm col-span-2" />
          <textarea placeholder="Description (optional)"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2} className="p-3 border border-[#ddd] outline-none text-sm resize-none col-span-2" />
          <input type="number" placeholder="Bundle Price (TK) *" required min="1"
            value={form.bundlePrice} onChange={e => setForm(f => ({ ...f, bundlePrice: e.target.value }))}
            className="p-3 border border-[#ddd] outline-none text-sm" />

          {/* Savings preview */}
          <div className={`flex items-center px-3 py-2 border text-sm ${savings > 0 ? 'border-emerald-300 bg-emerald-50' : 'border-[#eee] bg-[#fafafa]'}`}>
            {originalTotal > 0 ? (
              savings > 0
                ? <span className="text-emerald-700 font-bold text-xs">Customer saves {savings.toLocaleString()} TK ({savingsPct}% off)</span>
                : <span className="text-red-500 text-xs font-bold">Bundle price ≥ original total ({originalTotal.toLocaleString()} TK)</span>
            ) : <span className="text-[#aaa] text-xs">Select products to see savings</span>}
          </div>
        </div>

        {/* Product selector */}
        <div className="mb-4">
          <p className="text-[10px] font-bold tracking-wider text-[#888] mb-3">
            SELECT PRODUCTS <span className="font-normal text-[#bbb]">(min 2)</span>
            {form.products.length > 0 && <span className="ml-2 text-black">{form.products.length} selected</span>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1">
            {perfumes.map(p => {
              const selected = form.products.includes(p._id);
              return (
                <div key={p._id} onClick={() => toggleProduct(p._id)}
                  className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors ${selected ? 'border-black bg-black text-white' : 'border-[#eee] hover:border-black'}`}>
                  <img src={p.image || p.variants?.[0]?.image} alt={p.name} className="w-8 h-8 object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className={`text-[10px] font-bold truncate ${selected ? 'text-white' : ''}`}>{p.name}</p>
                    <p className={`text-[10px] ${selected ? 'text-gray-300' : 'text-[#888]'}`}>{p.price.toLocaleString()} TK</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Image upload */}
        <div className="mb-4">
          <p className="text-[10px] font-bold tracking-wider text-[#888] mb-2">BUNDLE IMAGE (optional)</p>
          <label className={`flex items-center gap-3 p-4 border-2 border-dashed cursor-pointer transition-colors ${imageFile || form.image ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black'}`}>
            <ImagePlus size={18} className="text-[#888] shrink-0" />
            <span className="text-[11px] font-bold tracking-wider">
              {imageFile ? `✓ ${imageFile.name}` : form.image ? '✓ IMAGE SET — CLICK TO REPLACE' : 'CLICK TO UPLOAD BUNDLE IMAGE'}
            </span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => setImageFile(e.target.files[0])} />
          </label>
          {form.image && !imageFile && (
            <img src={form.image} alt="bundle" className="mt-2 h-20 w-20 object-cover border border-[#eee]" />
          )}
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-3 cursor-pointer mb-6"
          onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${form.active ? 'bg-black' : 'bg-[#ddd]'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-[11px] font-bold tracking-wider">{form.active ? 'ACTIVE — VISIBLE TO CUSTOMERS' : 'INACTIVE — HIDDEN'}</span>
        </label>

        <div className="flex gap-3">
          <button type="submit" disabled={uploading}
            className="px-8 py-3 bg-black text-white text-[10px] font-bold tracking-[3px] hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer border-none">
            {uploading ? 'SAVING...' : editId ? 'UPDATE BUNDLE' : 'CREATE BUNDLE'}
          </button>
          {editId && (
            <button type="button" onClick={resetForm}
              className="px-8 py-3 border border-black text-[10px] font-bold tracking-[3px] hover:bg-gray-50 transition-colors cursor-pointer bg-white">
              CANCEL
            </button>
          )}
        </div>
      </form>

      {/* ── Bundle List ── */}
      <p className="text-[10px] font-bold tracking-[3px] text-[#888] mb-4">ALL BUNDLES ({bundles.length})</p>
      {bundles.length === 0 ? (
        <div className="text-center py-16 text-[#ccc] tracking-[3px] text-xs">NO BUNDLES YET.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {bundles.map(b => {
            const orig = b.products.reduce((s, p) => s + (p.price || 0), 0);
            const save = orig - b.bundlePrice;
            return (
              <div key={b._id} className={`border p-5 ${b.active ? 'border-[#eee]' : 'border-[#eee] opacity-60'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    {b.image && <img src={b.image} alt={b.name} className="w-16 h-16 object-cover border border-[#eee] shrink-0" />}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold tracking-wider text-sm">{b.name.toUpperCase()}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f0f0f0] text-[#888]'}`}>
                          {b.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      {b.description && <p className="text-[11px] text-[#888] mb-2">{b.description}</p>}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-base font-bold">{b.bundlePrice.toLocaleString()} TK</span>
                        {orig > 0 && <span className="text-[11px] text-[#aaa] line-through">{orig.toLocaleString()} TK</span>}
                        {save > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5">SAVE {save.toLocaleString()} TK</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {b.products.map(p => (
                          <span key={p._id} className="text-[10px] border border-[#eee] px-2 py-0.5 text-[#555]">{p.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <button onClick={() => toggleActive(b)}
                      className={`px-3 py-1.5 text-[10px] font-bold tracking-wider border cursor-pointer transition-colors bg-white ${b.active ? 'border-[#ddd] text-[#888] hover:border-black hover:text-black' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'}`}>
                      {b.active ? 'DEACTIVATE' : 'ACTIVATE'}
                    </button>
                    <button onClick={() => handleEdit(b)}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-wider border border-black cursor-pointer hover:bg-black hover:text-white transition-colors bg-white">
                      EDIT
                    </button>
                    {deleteConfirm === b._id ? (
                      <>
                        <button onClick={() => handleDelete(b._id)}
                          className="px-3 py-1.5 text-[10px] font-bold bg-red-600 text-white border-none cursor-pointer tracking-wider">
                          CONFIRM
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-[10px] font-bold border border-[#ddd] cursor-pointer bg-white">
                          CANCEL
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteConfirm(b._id)}
                        className="px-3 py-1.5 text-[10px] font-bold tracking-wider border border-red-200 text-red-500 cursor-pointer hover:bg-red-50 transition-colors bg-white">
                        DELETE
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminBundles;