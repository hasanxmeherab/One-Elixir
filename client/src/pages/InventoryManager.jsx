import React, { useState } from 'react';
import axios from 'axios';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Plus, X, ImagePlus } from 'lucide-react';

// ── Stock display cell (edit full quantity) ───────────────────
const StockCell = ({ p, API_URL, authHeader, fetchData, toast }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(p.stock);
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (Number(value) === p.stock) { setEditing(false); return; }
    try {
      setSaving(true);
      await axios.put(`${API_URL}/api/perfumes/${p._id}`, { stock: Number(value) }, authHeader());
      toast.success(`Stock set to ${value}`);
      fetchData();
      setEditing(false);
    } catch { toast.error('Failed to update stock.'); }
    finally { setSaving(false); }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') { setValue(p.stock); setEditing(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input type="number" min="0" autoFocus
          value={value} onChange={e => setValue(e.target.value)} onKeyDown={onKey}
          className="w-16 p-1 border border-black outline-none text-sm font-bold text-center" />
        <button onClick={save} disabled={saving}
          className="px-2 py-1 bg-black text-white text-[9px] font-bold border-none cursor-pointer hover:bg-gray-800 disabled:opacity-50">
          {saving ? '...' : 'OK'}
        </button>
        <button onClick={() => { setValue(p.stock); setEditing(false); }}
          className="px-2 py-0.5 bg-white text-black text-[9px] font-bold border border-[#ddd] cursor-pointer hover:bg-gray-50">
          ✕
        </button>
      </div>
    );
  }

  return (
    <span className={`text-sm font-bold ${p.stock < 5 ? 'text-red-500' : 'text-black'}`}>
      {p.stock}
    </span>
  );
};

// ── Add stock cell (sums on top of existing quantity) ─────────
const AddStockCell = ({ p, API_URL, authHeader, fetchData, toast }) => {
  const [open, setOpen]     = useState(false);
  const [qty, setQty]       = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const add = parseInt(qty);
    if (!qty || isNaN(add) || add <= 0) { toast.error('Enter a valid quantity.'); return; }
    try {
      setSaving(true);
      const newStock = p.stock + add;
      await axios.put(`${API_URL}/api/perfumes/${p._id}`, { stock: newStock }, authHeader());
      toast.success(`+${add} added → stock is now ${newStock}`);
      setQty('');
      setOpen(false);
      fetchData();
    } catch { toast.error('Failed to add stock.'); }
    finally { setSaving(false); }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') { setQty(''); setOpen(false); }
  };

  if (open) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-400 font-bold">+</span>
        <input type="number" min="1" autoFocus placeholder="Qty"
          value={qty} onChange={e => setQty(e.target.value)} onKeyDown={onKey}
          className="w-16 p-1 border border-emerald-500 outline-none text-sm font-bold text-center" />
        <button onClick={save} disabled={saving}
          className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-bold border-none cursor-pointer hover:bg-emerald-700 disabled:opacity-50">
          {saving ? '...' : 'ADD'}
        </button>
        <button onClick={() => { setQty(''); setOpen(false); }}
          className="px-2 py-0.5 bg-white text-black text-[9px] font-bold border border-[#ddd] cursor-pointer hover:bg-gray-50">
          ✕
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setOpen(true)}
      className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-bold border-none cursor-pointer hover:bg-emerald-700 transition-colors tracking-wider">
      + ADD STOCK
    </button>
  );
};


const InventoryManager = () => {
  const toast = useToast();
  const { perfumes = [], fetchData } = useOutletContext();

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', price: '', description: '', scentProfile: '', image: '', images: [], stock: ''
  });

  // ── Flash Sale ──────────────────────────────────────────────
  const [flashEditId, setFlashEditId] = useState(null);
  const [flashForm, setFlashForm] = useState({ salePrice: '', endsAt: '' });

  const API_URL    = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
  const CLOUD_NAME    = 'dluvmed0b';
  const UPLOAD_PRESET = 'one_elixir_uploads';

  const optimizeCloudinaryUrl = (url, width = 800) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  };

  const filteredPerfumes = perfumes.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (p) => {
    setEditId(p._id);
    setFormData({
      name: p.name, price: p.price, description: p.description,
      scentProfile: p.scentProfile.join(', '),
      image: p.image, images: p.images || [], stock: p.stock
    });
    setFiles([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormData({ name: '', price: '', description: '', scentProfile: '', image: '', images: [], stock: '' });
    setFiles([]);
  };

  const removeExistingImage = (url) => {
    setFormData(f => ({
      ...f,
      images: f.images.filter(img => img !== url),
      image: f.image === url ? (f.images.find(img => img !== url) || '') : f.image
    }));
  };

  const uploadSingleFile = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
    return optimizeCloudinaryUrl(res.data.secure_url, 1200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const newUrls = files.length > 0 ? await Promise.all(files.map(uploadSingleFile)) : [];
      const allImages = [...(formData.images || []), ...newUrls];
      const primaryImage = allImages[0] || formData.image || '';
      const payload = {
        ...formData,
        image:        primaryImage,
        images:       allImages,
        scentProfile: formData.scentProfile.split(',').map(s => s.trim())
      };
      if (editId) {
        await axios.put(`${API_URL}/api/perfumes/${editId}`, payload, authHeader());
      } else {
        await axios.post(`${API_URL}/api/perfumes`, payload, authHeader());
      }
      cancelEdit();
      fetchData();
    } catch (err) {
      toast.error('Operation failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deletePerfume = async (id) => {
    if (window.confirm('Remove item from inventory?')) {
      await axios.delete(`${API_URL}/api/perfumes/${id}`, authHeader());
      fetchData();
    }
  };

  // ── Flash Sale Handlers ─────────────────────────────────────
  const openFlashEdit = (p) => {
    setFlashEditId(p._id);
    setFlashForm({
      salePrice: p.flashSale?.salePrice || '',
      endsAt: p.flashSale?.endsAt ? new Date(p.flashSale.endsAt).toISOString().slice(0, 16) : '',
    });
  };

  const saveFlashSale = async (id) => {
    if (!flashForm.salePrice || !flashForm.endsAt) {
      toast.error('Fill in sale price and end date/time.');
      return;
    }
    try {
      await axios.put(`${API_URL}/api/perfumes/${id}`, {
        flashSale: { active: true, salePrice: Number(flashForm.salePrice), endsAt: new Date(flashForm.endsAt) }
      }, authHeader());
      toast.success('Flash sale activated!');
      setFlashEditId(null);
      fetchData();
    } catch { toast.error('Failed to save flash sale.'); }
  };

  const endFlashSale = async (id) => {
    try {
      await axios.put(`${API_URL}/api/perfumes/${id}`, { flashSale: { active: false } }, authHeader());
      toast.success('Flash sale ended.');
      fetchData();
    } catch { toast.error('Failed to end flash sale.'); }
  };

  return (
    <section>
      <h3 className="tracking-[2px] mb-5 font-bold">INVENTORY MANAGEMENT</h3>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-2.5">
        <input
          type="text" placeholder="Name" required
          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
          className="p-3 border border-[#ddd] outline-none text-sm"
        />
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="number" placeholder="Price (TK)" required
            value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
            className="flex-1 p-3 border border-[#ddd] outline-none text-sm"
          />
          <input
            type="number" placeholder="Quantity" required min="0"
            value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})}
            className="flex-1 p-3 border border-[#ddd] outline-none text-sm"
          />
        </div>
        <textarea
          placeholder="Description"
          value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
          className="p-3 border border-[#ddd] outline-none text-sm min-h-[80px]"
        />
        <input
          type="text" placeholder="Scent Notes (comma separated)"
          value={formData.scentProfile} onChange={e => setFormData({...formData, scentProfile: e.target.value})}
          className="p-3 border border-[#ddd] outline-none text-sm"
        />

        {/* Existing images (edit mode) */}
        {editId && formData.images?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[#888] mb-2">CURRENT IMAGES</p>
            <div className="flex flex-wrap gap-2">
              {formData.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 border border-[#eee]">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black text-white text-[8px] text-center py-0.5 font-bold">PRIMARY</span>
                  )}
                  <button type="button" onClick={() => removeExistingImage(img)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer border-none p-0 hover:bg-red-600">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload new images */}
        <div>
          {!editId && <p className="text-[10px] font-bold tracking-wider text-[#888] mb-2">PRODUCT IMAGES <span className="font-normal text-[#bbb]">(upload up to 5)</span></p>}
          {editId  && <p className="text-[10px] font-bold tracking-wider text-[#888] mb-2">ADD MORE IMAGES</p>}

          <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded cursor-pointer transition-colors p-6 ${files.length > 0 ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black hover:bg-gray-50'}`}>
            <ImagePlus size={22} className="text-[#888]" />
            <span className="text-xs font-bold tracking-wider text-black">
              {files.length > 0 ? `${files.length} FILE${files.length > 1 ? 'S' : ''} SELECTED` : 'CLICK TO UPLOAD IMAGES'}
            </span>
            <span className="text-[10px] text-[#aaa]">Select multiple — first image becomes the primary</span>
            <input type="file" accept="image/*" multiple
              onChange={e => setFiles(Array.from(e.target.files).slice(0, 5))}
              required={!editId && formData.images?.length === 0}
              className="hidden"
            />
          </label>

          {/* Preview selected files */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((f, i) => (
                <div key={i} className="relative w-16 h-16 border border-[#ddd] overflow-hidden">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  {i === 0 && !editId && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black text-white text-[7px] text-center py-0.5 font-bold">PRIMARY</span>
                  )}
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer border-none p-0">
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button type="submit" disabled={uploading}
            className="px-6 py-4 bg-black text-white border-none cursor-pointer font-bold hover:bg-gray-800 transition-colors disabled:opacity-60">
            {uploading ? 'UPLOADING...' : editId ? 'UPDATE CHANGES' : 'UPLOAD ELIXIR'}
          </button>
          {editId && (
            <button type="button" onClick={cancelEdit}
              className="px-6 py-4 bg-white text-black border border-black cursor-pointer font-bold hover:bg-gray-50 transition-colors">
              CANCEL
            </button>
          )}
        </div>
      </form>

      <hr className="border-none border-t border-[#eee] my-10" />

      {/* SEARCH */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <span className="text-[11px] font-bold tracking-wider">SEARCH PERFUME:</span>
        <input
          type="text" placeholder="Type perfume name to search..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="p-2.5 px-4 border border-black outline-none w-[300px] max-w-full text-sm"
        />
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="p-2.5 text-xs tracking-wider">NAME</th>
              <th className="p-2.5 text-xs tracking-wider">IMAGES</th>
              <th className="p-2.5 text-xs tracking-wider">PRICE</th>
              <th className="p-2.5 text-xs tracking-wider">STOCK</th>
              <th className="p-2.5 text-xs tracking-wider">ADD STOCK</th>
              <th className="p-2.5 text-xs tracking-wider">FLASH SALE</th>
              <th className="p-2.5 text-xs tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPerfumes.length > 0 ? filteredPerfumes.map(p => {
              const saleActive = p.flashSale?.active && p.flashSale?.endsAt && new Date(p.flashSale.endsAt) > new Date();
              return (
                <React.Fragment key={p._id}>
                  <tr className="border-b border-[#eee]">
                    <td className="p-2.5 text-sm">{p.name}</td>
                    <td className="p-2.5">
                      <div className="flex gap-1">
                        {(p.images?.length > 0 ? p.images : [p.image]).filter(Boolean).slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className="w-8 h-8 object-cover border border-[#eee]" />
                        ))}
                        {(p.images?.length || 0) > 3 && (
                          <div className="w-8 h-8 bg-[#f5f5f5] border border-[#eee] flex items-center justify-center text-[9px] font-bold text-[#888]">
                            +{p.images.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 text-sm">{p.price} TK</td>
                    <td className="p-2.5">
                      <StockCell p={p} API_URL={API_URL} authHeader={authHeader} fetchData={fetchData} toast={toast} />
                    </td>

                    {/* ── Add Stock Column ── */}
                    <td className="p-2.5">
                      <AddStockCell p={p} API_URL={API_URL} authHeader={authHeader} fetchData={fetchData} toast={toast} />
                    </td>


                    {/* ── Flash Sale Column ── */}
                    <td className="p-2.5 text-sm">
                      {saleActive ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-bold text-red-600">🔥 {p.flashSale.salePrice} TK</span>
                          <span className="text-[10px] text-[#888]">
                            Ends {new Date(p.flashSale.endsAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button onClick={() => endFlashSale(p._id)}
                            className="text-[9px] text-red-500 underline bg-transparent border-none cursor-pointer p-0 text-left hover:opacity-60">
                            END SALE
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => openFlashEdit(p)}
                          className="text-[11px] font-bold text-amber-500 underline bg-transparent border-none cursor-pointer p-0 hover:opacity-60">
                          + SET SALE
                        </button>
                      )}
                    </td>

                    <td className="p-2.5 text-sm">
                      <button onClick={() => handleEditClick(p)}
                        className="bg-transparent border-none text-black cursor-pointer font-bold underline mr-2.5 hover:opacity-60 transition-opacity">
                        EDIT
                      </button>
                      <button onClick={() => deletePerfume(p._id)}
                        className="bg-transparent border-none text-red-500 cursor-pointer font-bold underline hover:opacity-60 transition-opacity">
                        DELETE
                      </button>
                    </td>
                  </tr>

                  {/* ── Inline Flash Sale Form ── */}
                  {flashEditId === p._id && (
                    <tr className="border-b border-[#eee] bg-amber-50">
                      <td colSpan="7" className="px-3 py-3">
                        <div className="flex flex-wrap gap-2.5 items-center">
                          <span className="text-[10px] font-bold tracking-wider text-amber-600">🔥 FLASH SALE</span>
                          <input
                            type="number" placeholder="Sale Price (TK)"
                            value={flashForm.salePrice}
                            onChange={e => setFlashForm({...flashForm, salePrice: e.target.value})}
                            className="p-2 border border-[#ddd] outline-none text-sm w-36"
                          />
                          <input
                            type="datetime-local"
                            value={flashForm.endsAt}
                            onChange={e => setFlashForm({...flashForm, endsAt: e.target.value})}
                            className="p-2 border border-[#ddd] outline-none text-sm"
                          />
                          <button onClick={() => saveFlashSale(p._id)}
                            className="px-4 py-2 bg-amber-500 text-white border-none cursor-pointer text-xs font-bold tracking-wider hover:bg-amber-600 transition-colors">
                            ACTIVATE
                          </button>
                          <button onClick={() => setFlashEditId(null)}
                            className="px-4 py-2 bg-white text-black border border-[#ddd] cursor-pointer text-xs font-bold tracking-wider hover:bg-gray-50 transition-colors">
                            CANCEL
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan="7" className="p-5 text-center text-[#888]">
                  No perfumes found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default InventoryManager;