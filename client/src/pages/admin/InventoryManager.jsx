import React, { useState } from 'react';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { Plus, X, ImagePlus, Search, Package, Pencil, Trash2, ArrowLeft } from 'lucide-react';


// ── Stock display cell ────────────────────────────────────────
const StockCell = ({ p, API_URL, fetchData, toast }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(p.stock);
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (saving) return;
    if (value === '' || !Number.isInteger(Number(value)) || Number(value) < 0) {
      toast.error('Enter a whole quantity of zero or more.'); return;
    }
    if (Number(value) === p.stock) { setEditing(false); return; }
    try {
      setSaving(true);
      await adminAxios.put(`${API_URL}/api/perfumes/${p._id}`, { stock: Number(value) });
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
    <button type="button" onClick={() => { setValue(p.stock); setEditing(true); }}
      className="im-stock-edit inline-flex! items-center! gap-[6px]! bg-[transparent]! p-[0]! [border:0]! cursor-pointer! [font:400_11px_'Jost',_sans-serif]! text-[#777]!" aria-label={`Edit stock for ${p.name}`}>
      {p.stock} units <Pencil size={11} />
    </button>
  );
};

// ── Add stock cell ────────────────────────────────────────────
const AddStockCell = ({ p, API_URL, fetchData, toast }) => {
  const [open, setOpen]     = useState(false);
  const [qty, setQty]       = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const add = Number(qty);
    if (!qty || !Number.isInteger(add) || add <= 0) { toast.error('Enter a positive whole quantity.'); return; }
    try {
      setSaving(true);
      const newStock = p.stock + add;
      await adminAxios.put(`${API_URL}/api/perfumes/${p._id}`, { stock: newStock });
      toast.success(`+${add} added → stock is now ${newStock}`);
      setQty(''); setOpen(false); fetchData();
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
      className="im-restock inline-flex! items-center! justify-center! gap-[7px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [border:1px_solid_#d9e9df]! text-[#397451]! bg-[#f5faf6]! rounded-[6px]! [padding:6px_10px]! [&:hover]:bg-[#e8f4ec]!">
      <Plus size={13} /> Restock
    </button>
  );
};


const InventoryManager = () => {
  const toast = useToast();
  const { perfumes = [], fetchData } = useOutletContext();

  const [files, setFiles]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', price: '', description: '', scentProfile: '',
    image: '', images: [], stock: '', featured: false,
    variants: []
  });



  // ── Flash Sale ──────────────────────────────────────────────
  const [flashEditId, setFlashEditId] = useState(null);
  const [flashForm, setFlashForm]     = useState({ salePrice: '', endsAt: '' });

  const API_URL       = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const optimizeCloudinaryUrl = (url, width = 800) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  };

  const getStock = p => p.variants?.length
    ? p.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)
    : Number(p.stock || 0);
  const stockCounts = {
    all: perfumes.length,
    low: perfumes.filter(p => getStock(p) > 0 && getStock(p) < 5).length,
    out: perfumes.filter(p => getStock(p) === 0).length,
  };
  const filteredPerfumes = perfumes.filter(p => {
    const stock = getStock(p);
    return p.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      && (stockFilter === 'all' || (stockFilter === 'low' ? stock > 0 && stock < 5 : stock === 0));
  });

  const handleEditClick = (p) => {
    setFormOpen(true);
    setEditId(p._id);
    setFormData({
      name: p.name, price: p.price, description: p.description,
      scentProfile: p.scentProfile.join(', '),
      image: p.image, images: p.images || [], stock: p.stock,
      featured: p.featured || false,
      variants: p.variants?.length ? p.variants.map(v => ({ label: v.label, price: v.price, stock: v.stock, image: v.image || '' })) : []
    });
    setFiles([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setFormOpen(false);
    setEditId(null);
    setFormData({ name: '', price: '', description: '', scentProfile: '', image: '', images: [], stock: '', featured: false, variants: [] });
    setFiles([]);
  };

  const removeExistingImage = (url) => {
    setFormData(f => ({
      ...f,
      images: f.images.filter(img => img !== url),
      image: f.image === url ? (f.images.find(img => img !== url) || '') : f.image
    }));
  };

  // Compress image client-side before uploading (max 1200px, ~80% quality)
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.size < 200 * 1024) {
        return resolve(file);
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const [uploadProgress, setUploadProgress] = useState('');

  const uploadSingleFile = async (file, label) => {
    const compressed = await compressImage(file);
    if (label) setUploadProgress(label);
    const data = new FormData();
    data.append('file', compressed);
    data.append('upload_preset', UPLOAD_PRESET);
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      data,
      { timeout: 60000 }
    );
    return optimizeCloudinaryUrl(res.data.secure_url, 1200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    // Validate variant fields before upload
    for (const v of formData.variants) {
      if (!v.label || !v.price) {
        toast.error('Each size variant needs a label and price.');
        return;
      }
    }
    try {
      setUploading(true);
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadSingleFile(files[i], 'Uploading image ' + (i + 1) + ' of ' + files.length + '...');
        newUrls.push(url);
      }
      const allImages = [...(formData.images || []), ...newUrls];
      const primaryImage = allImages[0] || formData.image || '';

      // Upload variant images
      const finalVariants = await Promise.all(
        formData.variants
          .filter(v => v.label && v.price)
          .map(async (v) => {
            let img = v.image || '';
            if (v._file) {
              img = await uploadSingleFile(v._file, 'Uploading ' + v.label + ' image...');
            }
            return { label: v.label, price: Number(v.price), stock: Number(v.stock) || 0, image: img };
          })
      );

      // When variants exist, derive base price & stock from them
      const hasVariants = finalVariants.length > 0;
      const basePrice = hasVariants
        ? Math.min(...finalVariants.map(v => v.price))
        : Number(formData.price);
      const baseStock = hasVariants
        ? finalVariants.reduce((sum, v) => sum + v.stock, 0)
        : (formData.stock !== '' ? Number(formData.stock) : 0);

      const payload = {
        name:         formData.name,
        price:        basePrice,
        description:  formData.description || undefined,
        scentProfile: formData.scentProfile.split(',').map(s => s.trim()).filter(Boolean),
        image:        primaryImage || undefined,
        images:       allImages,
        stock:        baseStock,
        featured:     formData.featured,
        variants:     finalVariants.length > 0 ? finalVariants : [],
      };
      if (editId) {
        await adminAxios.put(`${API_URL}/api/perfumes/${editId}`, payload);
      } else {
        await adminAxios.post(`${API_URL}/api/perfumes`, payload);
      }
      toast.success(editId ? 'Product updated.' : 'Product added.');
      cancelEdit();
      fetchData();
    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const deletePerfume = async (id) => {
    if (window.confirm('Remove item from inventory?')) {
      try {
        await adminAxios.delete(`${API_URL}/api/perfumes/${id}`);
        fetchData();
        toast.success('Product removed.');
      } catch { toast.error('Failed to remove product.'); }
    }
  };

  const toggleFeatured = async (p) => {
    try {
      await adminAxios.put(`${API_URL}/api/perfumes/${p._id}`, { featured: !p.featured });
      fetchData();
    } catch { toast.error('Failed to update featured status.'); }
  };

  // ── Flash Sale ──────────────────────────────────────────────
  const openFlashEdit = (p) => {
    setFlashEditId(p._id);
    setFlashForm({
      salePrice: p.flashSale?.salePrice || '',
      endsAt: p.flashSale?.endsAt ? new Date(p.flashSale.endsAt).toISOString().slice(0, 16) : '',
    });
  };

  const saveFlashSale = async (id) => {
    if (!flashForm.salePrice || !flashForm.endsAt) {
      toast.error('Fill in sale price and end date/time.'); return;
    }
    try {
      await adminAxios.put(`${API_URL}/api/perfumes/${id}`, {
        flashSale: { active: true, salePrice: Number(flashForm.salePrice), endsAt: new Date(flashForm.endsAt) }
      });
      toast.success('Flash sale activated!');
      setFlashEditId(null); fetchData();
    } catch { toast.error('Failed to save flash sale.'); }
  };

  const endFlashSale = async (id) => {
    try {
      await adminAxios.put(`${API_URL}/api/perfumes/${id}`, { flashSale: { active: false } });
      toast.success('Flash sale ended.'); fetchData();
    } catch { toast.error('Failed to end flash sale.'); }
  };

  return (
    <section className="inventory-manager max-w-[1440px]! [margin:0_auto]! pb-[64px]! text-[#242424]! [font-family:'Jost',_sans-serif]! [&_[hidden]]:hidden! [&_button:focus-visible]:[outline:2px_solid_#dc4939]! [&_button:focus-visible]:[outline-offset:3px]! [&_button:disabled]:cursor-wait! [&_button:disabled]:opacity-[.55]!">
      <header className="im-header flex! items-center! justify-between! gap-[24px]! mb-[30px]! [&_h1]:[font:600_clamp(26px,_3vw,_38px)/1.2_'Playfair_Display',_serif]! [&_h1]:m-[0]! [&_h1]:tracking-[-.7px]! [&_>_div_>_p:last-child]:text-[#777]! [&_>_div_>_p:last-child]:text-[14px]! [&_>_div_>_p:last-child]:[margin:12px_0_0]! max-[700px]:flex-col! max-[700px]:items-start! max-[700px]:gap-[18px]!">
        <div><p className="im-eyebrow text-[#dc4939]! text-[11px]! font-bold! tracking-[2px]! [margin:0_0_10px]!">STOREFRONT / INVENTORY</p><h1>Your collection, in order.</h1><p>Manage fragrances, keep stock up to date, and get products ready to sell.</p></div>
        {!formOpen && <button className="im-primary inline-flex! items-center! justify-center! gap-[7px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [padding:12px_18px]! [border:0]! bg-[#222]! text-[white]! rounded-[8px]! text-[13px]! [&:hover]:bg-[#444]!" onClick={() => { cancelEdit(); setFormOpen(true); }}><Plus size={17} /> Add product</button>}
      </header>

      {/* FORM */}
      {formOpen && <div className="im-editor max-w-[900px]! [border:1px_solid_#e7e7e5]! rounded-[14px]! overflow-hidden!">
      <div className="im-editor-header [padding:22px_26px]! bg-[#fafaf8]! [border-bottom:1px_solid_#e7e7e5]! [&_h2]:[font:600_24px_'Playfair_Display',_serif]! [&_h2]:[margin:12px_0_0]! max-[700px]:[padding:18px_16px]!"><div><button type="button" className="im-back inline-flex! items-center! justify-center! gap-[7px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [border:0]! p-[0]! bg-[transparent]! text-[#888]!" onClick={cancelEdit} disabled={uploading}><ArrowLeft size={14} /> Back to inventory</button><h2>{editId ? 'Edit product' : 'Add a new fragrance'}</h2></div></div>
      <form onSubmit={handleSubmit} className="im-product-form [&_input:not([type='checkbox']):not([type='file'])]:min-w-[0]! [&_input:not([type='checkbox']):not([type='file'])]:rounded-[8px]! [&_input:not([type='checkbox']):not([type='file'])]:[border-color:#e2e2df]! [&_textarea]:min-w-[0]! [&_textarea]:rounded-[8px]! [&_textarea]:[border-color:#e2e2df]! [&_input:focus]:[border-color:#dc4939]! [&_input:focus]:[box-shadow:0_0_0_3px_#dc493914]! [&_textarea:focus]:[border-color:#dc4939]! [&_textarea:focus]:[box-shadow:0_0_0_3px_#dc493914]! [&_button]:rounded-[6px]!">
        <fieldset disabled={uploading} className="im-fields [border:0]! p-[0]! m-[0]! min-w-[0]!">
        <div className="im-form-section flex! flex-col! gap-[14px]! p-[26px]! [border-bottom:1px_solid_#eeedea]! [&_h3]:[font:600_16px_'Jost',_sans-serif]! [&_h3]:m-[0]! [&_>_p]:text-[#888]! [&_>_p]:text-[12px]! [&_>_p]:[margin:-8px_0_3px]! [&_>_small]:text-[#999]! [&_>_small]:text-[11px]! [&_>_small]:mt-[-8px]! max-[700px]:[padding:20px_16px]!"><h3>Basic details</h3><p>The name, story, and scent notes your customers will see.</p>
        <label className="im-field-label text-[12px]! font-medium! text-[#666]! mb-[-8px]!" htmlFor="im-name">Product name</label>
        <input
          id="im-name" type="text" placeholder="e.g. Amber Oud" required autoFocus
          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
          className="p-3 border border-[#ddd] outline-none text-sm"
        />
        <label className="im-field-label text-[12px]! font-medium! text-[#666]! mb-[-8px]!" htmlFor="im-description">Description</label>
        <textarea id="im-description" placeholder="Tell the story of this fragrance"
          value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
          className="p-3 border border-[#ddd] outline-none text-sm min-h-[80px]" />
        <label className="im-field-label text-[12px]! font-medium! text-[#666]! mb-[-8px]!" htmlFor="im-notes">Scent notes</label>
        <input id="im-notes" type="text" placeholder="Bergamot, rose, amber"
          value={formData.scentProfile} onChange={e => setFormData({...formData, scentProfile: e.target.value})}
          className="p-3 border border-[#ddd] outline-none text-sm" />
        <small>Separate notes with commas.</small>
        </div>
        <div className="im-form-section flex! flex-col! gap-[14px]! p-[26px]! [border-bottom:1px_solid_#eeedea]! [&_h3]:[font:600_16px_'Jost',_sans-serif]! [&_h3]:m-[0]! [&_>_p]:text-[#888]! [&_>_p]:text-[12px]! [&_>_p]:[margin:-8px_0_3px]! [&_>_small]:text-[#999]! [&_>_small]:text-[11px]! [&_>_small]:mt-[-8px]! max-[700px]:[padding:20px_16px]!"><h3>Pricing & sizes</h3><p>Set a single price and stock quantity, or add individual sizes below.</p>
        <div className="im-price-fields [&_>_label]:text-[12px]! [&_>_label]:font-medium! [&_>_label]:text-[#666]! [&_>_label]:flex! [&_>_label]:flex-col! [&_>_label]:gap-[7px]! grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[14px]! max-[700px]:[grid-template-columns:minmax(0,_1fr)]!">
          <label>Price (TK)
          <input
            type="number" placeholder="Price (TK)" min="1" required={formData.variants.length === 0}
            value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
            disabled={formData.variants.length > 0}
            className={`flex-1 p-3 border border-[#ddd] outline-none text-sm ${formData.variants.length > 0 ? 'opacity-40 cursor-not-allowed bg-gray-100' : ''}`}
          /></label>
          <label>Stock quantity
          <input
            type="number" placeholder="Quantity" required={formData.variants.length === 0} min="0"
            value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})}
            disabled={formData.variants.length > 0}
            className={`flex-1 p-3 border border-[#ddd] outline-none text-sm ${formData.variants.length > 0 ? 'opacity-40 cursor-not-allowed bg-gray-100' : ''}`}
          /></label>
        </div>
        {formData.variants.length > 0 && <p className="text-[10px] text-[#aaa] -mt-2">Price & quantity are set per variant below</p>}

        {/* ── Featured toggle ── */}
        <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
          <input type="checkbox" checked={formData.featured} onChange={e => setFormData(f => ({ ...f, featured: e.target.checked }))} className="im-feature-checkbox [accent-color:#222]! w-[16px]! h-[16px]! [&_+_div]:hidden!" />
          <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.featured ? 'bg-black' : 'bg-[#ddd]'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-[11px] font-bold tracking-wider">
            {formData.featured ? '★ SHOW IN EXCLUSIVE SECTION' : 'MARK AS FEATURED (EXCLUSIVE)'}
          </span>
        </label>

        {/* ── Size Variants ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold tracking-wider text-[#888]">SIZE VARIANTS <span className="font-normal text-[#bbb]">(optional — add if product has multiple sizes)</span></p>
            <button type="button" onClick={() => setFormData(f => ({ ...f, variants: [...f.variants, { label: '', price: '', stock: '', image: '' }] }))}
              className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-[9px] font-bold tracking-wider border-none cursor-pointer hover:bg-gray-800 transition-colors">
              <Plus size={12} /> ADD SIZE
            </button>
          </div>
          {formData.variants.map((v, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center mb-2 p-3 border border-[#eee] bg-[#fafafa]">
              <input type="text" placeholder="Size (e.g. 8ml)"
                value={v.label} onChange={e => { const arr = [...formData.variants]; arr[i] = { ...arr[i], label: e.target.value }; setFormData(f => ({ ...f, variants: arr })); }}
                className="w-24 p-2 border border-[#ddd] outline-none text-sm" />
              <input type="number" placeholder="Price" min="1"
                value={v.price} onChange={e => { const arr = [...formData.variants]; arr[i] = { ...arr[i], price: e.target.value }; setFormData(f => ({ ...f, variants: arr })); }}
                className="w-24 p-2 border border-[#ddd] outline-none text-sm" />
              <input type="number" placeholder="Stock" min="0"
                value={v.stock} onChange={e => { const arr = [...formData.variants]; arr[i] = { ...arr[i], stock: e.target.value }; setFormData(f => ({ ...f, variants: arr })); }}
                className="w-20 p-2 border border-[#ddd] outline-none text-sm" />
              {/* Variant image */}
              <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-[#ccc] cursor-pointer hover:border-black transition-colors bg-white">
                <ImagePlus size={14} className="text-[#888]" />
                <span className="text-[9px] font-bold tracking-wider text-[#666]">
                  {v._file ? v._file.name.slice(0, 12) + '...' : v.image ? 'CHANGE IMG' : 'SIZE IMAGE'}
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files[0]) { const arr = [...formData.variants]; arr[i] = { ...arr[i], _file: e.target.files[0] }; setFormData(f => ({ ...f, variants: arr })); } }} />
              </label>
              {(v.image || v._file) && (
                <img src={v._file ? URL.createObjectURL(v._file) : v.image} alt="" className="w-10 h-10 object-cover border border-[#eee]" />
              )}
              <button type="button" onClick={() => {
                const arr = formData.variants.filter((_, j) => j !== i);
                setFormData(f => ({ ...f, variants: arr }));
              }}
                className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer border-none p-0 hover:bg-red-600 shrink-0">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Existing images (edit mode) */}
        </div>
        <div className="im-form-section flex! flex-col! gap-[14px]! p-[26px]! [border-bottom:1px_solid_#eeedea]! [&_h3]:[font:600_16px_'Jost',_sans-serif]! [&_h3]:m-[0]! [&_>_p]:text-[#888]! [&_>_p]:text-[12px]! [&_>_p]:[margin:-8px_0_3px]! [&_>_small]:text-[#999]! [&_>_small]:text-[11px]! [&_>_small]:mt-[-8px]! max-[700px]:[padding:20px_16px]!"><h3>Product images</h3><p>Add clear photos that help customers explore your fragrance.</p>
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
        <div className={formData.variants.length > 0 ? 'opacity-40 pointer-events-none' : ''}>
          {!editId && <p className="text-[10px] font-bold tracking-wider text-[#888] mb-2">PRODUCT IMAGES <span className="font-normal text-[#bbb]">(upload up to 5)</span></p>}
          {editId  && <p className="text-[10px] font-bold tracking-wider text-[#888] mb-2">ADD MORE IMAGES</p>}
          {formData.variants.length > 0 && <p className="text-[10px] text-[#aaa] mb-2">Images are set per variant above</p>}
          <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded transition-colors p-6 ${formData.variants.length > 0 ? 'border-[#eee] bg-gray-50 cursor-not-allowed' : files.length > 0 ? 'border-black bg-gray-50 cursor-pointer' : 'border-[#ddd] hover:border-black hover:bg-gray-50 cursor-pointer'}`}>
            <ImagePlus size={22} className="text-[#888]" />
            <span className="text-xs font-bold tracking-wider text-black">
              {files.length > 0 ? `${files.length} FILE${files.length > 1 ? 'S' : ''} SELECTED` : 'CLICK TO UPLOAD IMAGES'}
            </span>
            <span className="text-[10px] text-[#aaa]">Select multiple — first image becomes the primary</span>
            <input type="file" accept="image/*" multiple
              onChange={e => setFiles(Array.from(e.target.files).slice(0, 5))}
              required={!editId && formData.images?.length === 0 && formData.variants.length === 0}
              className="hidden"
              disabled={formData.variants.length > 0}
            />
          </label>
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

        </div>
        <div className="im-form-actions flex! flex-wrap! gap-[10px]! [padding:20px_26px]! bg-[#fafaf8]! [&_button]:text-[12px]! [&_button]:font-medium! [&_button]:[padding:12px_20px]! max-[700px]:[padding:18px_16px]!">
          <button type="submit" disabled={uploading}
            className="px-6 py-4 bg-black text-white border-none cursor-pointer font-bold hover:bg-gray-800 transition-colors disabled:opacity-60">
            {uploading ? (uploadProgress || 'Saving…') : editId ? 'Save changes' : 'Add product'}
          </button>
            <button type="button" onClick={cancelEdit} disabled={uploading}
              className="px-6 py-4 bg-white text-black border border-black cursor-pointer font-bold hover:bg-gray-50 transition-colors">
              CANCEL
            </button>
        </div>
        </fieldset>
      </form>
      </div>}

      {/* SEARCH */}
      <div hidden={formOpen}>
      <div className="im-summary grid! [grid-template-columns:repeat(3,_minmax(0,_1fr))]! gap-[16px]! mb-[26px]! [&_>_div]:flex! [&_>_div]:items-start! [&_>_div]:gap-[14px]! [&_>_div]:p-[20px]! [&_>_div]:[border:1px_solid_#e7e7e5]! [&_>_div]:rounded-[12px]! [&_>_div]:bg-[#fafaf9]! [&_svg]:text-[#8a8580]! [&_svg]:mt-[3px]! [&_>_div_>_span:last-child]:flex! [&_>_div_>_span:last-child]:flex-col! [&_>_div_>_span:last-child]:gap-[6px]! [&_>_div_>_span:last-child]:text-[#777]! [&_>_div_>_span:last-child]:text-[12px]! [&_strong]:text-[#222]! [&_strong]:text-[28px]! [&_strong]:leading-[1.2]! [&_strong]:font-semibold! max-[700px]:gap-[8px]! max-[700px]:[&_>_div]:[padding:14px_10px]! max-[700px]:[&_>_div]:gap-[8px]! max-[700px]:[&_svg]:hidden! max-[700px]:[&_>_div_>_span:last-child]:text-[10px]! max-[700px]:[&_strong]:text-[24px]!">
        <div><Package size={20} /><span>Total fragrances<strong>{stockCounts.all}</strong></span></div>
        <div><span className="im-status-dot block! w-[10px]! h-[10px]! rounded-[50%]! mt-[7px]! max-[700px]:hidden! im-dot-low bg-[#d8a044]!" /><span>Low stock<strong>{stockCounts.low}</strong></span></div>
        <div><span className="im-status-dot block! w-[10px]! h-[10px]! rounded-[50%]! mt-[7px]! max-[700px]:hidden! im-dot-out bg-[#dc4939]!" /><span>Out of stock<strong>{stockCounts.out}</strong></span></div>
      </div>
      <div className="im-toolbar flex! justify-between! items-center! flex-wrap! gap-[16px]! max-[700px]:items-stretch! max-[700px]:flex-col!">
        <div className="im-filters flex! flex-wrap! gap-[5px]! p-[5px]! bg-[#f5f5f4]! [border:1px_solid_#ececea]! rounded-[10px]! max-[700px]:w-[fit-content]! max-[700px]:max-w-[100%]!" aria-label="Filter by stock">{[{ id: 'all', label: 'All products' }, { id: 'low', label: 'Low stock' }, { id: 'out', label: 'Out of stock' }].map(({ id, label }) => <button key={id} aria-pressed={stockFilter === id} className={stockFilter === id ? "im-filter inline-flex! items-center! gap-[8px]! [border:0]! rounded-[7px]! bg-[transparent]! text-[#777]! [padding:9px_12px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! [&.active]:bg-[#fff]! [&.active]:text-[#242424]! [&.active]:[box-shadow:0_1px_5px_#0000000d]! [&_span]:rounded-[4px]! [&_span]:[padding:1px_5px]! [&_span]:text-[10px]! [&_span]:bg-[#eee]! max-[700px]:p-[8px]! max-[700px]:text-[11px]! max-[700px]:gap-[5px]! active" : "im-filter inline-flex! items-center! gap-[8px]! [border:0]! rounded-[7px]! bg-[transparent]! text-[#777]! [padding:9px_12px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! [&.active]:bg-[#fff]! [&.active]:text-[#242424]! [&.active]:[box-shadow:0_1px_5px_#0000000d]! [&_span]:rounded-[4px]! [&_span]:[padding:1px_5px]! [&_span]:text-[10px]! [&_span]:bg-[#eee]! max-[700px]:p-[8px]! max-[700px]:text-[11px]! max-[700px]:gap-[5px]!"} onClick={() => setStockFilter(id)}>{label}<span>{stockCounts[id]}</span></button>)}</div>
        <label className="im-search flex! items-center! gap-[8px]! min-w-[220px]! max-w-[100%]! [border:1px_solid_#e2e2df]! rounded-[9px]! [padding:0_12px]! text-[#888]! [&:focus-within]:[border-color:#dc4939]! [&:focus-within]:[box-shadow:0_0_0_3px_#dc493914]! [&_input]:[border:0]! [&_input]:[outline:none]! [&_input]:w-[100%]! [&_input]:min-w-[0]! [&_input]:bg-[transparent]! [&_input]:text-[13px]! [&_input]:[padding:11px_0]! max-[700px]:w-[100%]!"><Search size={16} />
        <input
          type="search" placeholder="Search fragrances…" aria-label="Search fragrances by name"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="p-2.5 px-4 border border-black outline-none w-[300px] max-w-full text-sm"
        /></label>
      </div>
      <p className="im-results text-[11px]! text-[#999]! [margin:14px_0]!">Showing {filteredPerfumes.length} of {perfumes.length} fragrances · Low stock means fewer than 5 units.</p>

      {/* TABLE */}
      <div className="im-table-wrap [border:1px_solid_#e7e7e5]! rounded-[12px]! overflow-x-auto! max-[700px]:[border:0]! max-[700px]:rounded-[0]! max-[700px]:overflow-visible!">
        <table className="im-table w-[100%]! [border-collapse:collapse]! text-left! [&_thead]:bg-[#f8f8f6]! [&_thead_tr]:[border-bottom:1px_solid_#e7e7e5]! [&_th]:[padding:14px_16px]! [&_th]:text-[#888]! [&_th]:[font:600_10px_'Jost',_sans-serif]! [&_th]:tracking-[1px]! max-[700px]:block! max-[700px]:[&_tbody]:block! max-[700px]:[&_thead]:hidden!">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="p-2.5 text-xs tracking-wider">PRODUCT</th>
              <th className="p-2.5 text-xs tracking-wider">PRICE</th>
              <th className="p-2.5 text-xs tracking-wider">AVAILABILITY</th>
              <th className="p-2.5 text-xs tracking-wider">PROMOTIONS</th>
              <th className="p-2.5 text-xs tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPerfumes.length > 0 ? filteredPerfumes.map(p => {
              const saleActive = p.flashSale?.active && p.flashSale?.endsAt && new Date(p.flashSale.endsAt) > new Date();
              const stock = getStock(p);
              const thumbnail = p.images?.[0] || p.image || p.variants?.find(v => v.image)?.image;
              return (
                <React.Fragment key={p._id}>
                  <tr className="im-product-row [border-bottom:1px_solid_#eeedea]! [&:last-child]:[border-bottom:0]! [&:hover]:bg-[#fdfcfb]! [&_>_td]:[padding:18px_16px]! [&_>_td]:text-[13px]! [&_>_td]:[vertical-align:middle]! max-[700px]:grid! max-[700px]:[grid-template-columns:minmax(0,_1fr)_minmax(0,_1fr)]! max-[700px]:[border:1px_solid_#e7e7e5]! max-[700px]:rounded-[12px]! max-[700px]:mb-[14px]! max-[700px]:p-[16px]! max-[700px]:[gap:18px_12px]! max-[700px]:[&:last-child]:[border-bottom:1px_solid_#e7e7e5]! max-[700px]:[&_>_td]:block! max-[700px]:[&_>_td]:p-[0]! max-[700px]:[&_>_td]:min-w-[0]! max-[700px]:[&_>_td::before]:[content:attr(data-label)]! max-[700px]:[&_>_td::before]:block! max-[700px]:[&_>_td::before]:mb-[8px]! max-[700px]:[&_>_td::before]:text-[9px]! max-[700px]:[&_>_td::before]:text-[#999]! max-[700px]:[&_>_td::before]:uppercase! max-[700px]:[&_>_td::before]:tracking-[1px]! max-[700px]:[&_>_td:first-child]:[grid-column:1_/_-1]! max-[700px]:[&_>_td:first-child::before]:hidden! max-[700px]:[&_>_td:last-child]:[grid-column:1_/_-1]! max-[700px]:[&_>_td:last-child]:[border-top:1px_solid_#eeedea]! max-[700px]:[&_>_td:last-child]:pt-[12px]! max-[700px]:[&_>_td:last-child::before]:hidden!">
                    <td data-label="Product">
                      <div className="im-product-identity flex! items-center! gap-[12px]! min-w-[190px]!">
                      {thumbnail ? <img src={thumbnail} alt="" className="im-thumbnail w-[52px]! h-[58px]! [border:1px_solid_#eeedea]! rounded-[8px]! object-contain! bg-[#fafaf8]! [flex-shrink:0]!" loading="lazy" /> : <div className="im-thumbnail w-[52px]! h-[58px]! [border:1px_solid_#eeedea]! rounded-[8px]! object-contain! bg-[#fafaf8]! [flex-shrink:0]! im-no-image flex! justify-center! items-center! text-[#bbb]!"><Package size={22} /></div>}
                      <div className="im-product-name min-w-[0]! [&_>_strong]:block! [&_>_strong]:text-[13px]! [&_>_strong]:font-semibold! [&_>_strong]:[overflow-wrap:anywhere]! [&_span]:rounded-[4px]! [&_span]:font-normal!"><strong>{p.name}</strong>
                      {p.variants?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {p.variants.map((v, vi) => (
                            <span key={vi} className="text-[9px] bg-gray-100 border border-[#eee] px-1.5 py-0.5 font-bold text-[#666]">
                              {v.label} — {v.price}TK
                            </span>
                          ))}
                        </div>
                      )}
                      </div></div>
                    </td>
                    <td data-label="Price"><span className="im-price text-[12px]! font-medium! whitespace-nowrap!">{p.variants?.length > 0 ? 'From ' : ''}{Number(p.price).toLocaleString()} TK</span></td>
                    <td data-label="Availability">
                      <div className="im-stock-cell flex! flex-col! items-start! gap-[7px]!">
                      <span className={`im-stock-badge [padding:4px_8px]! rounded-[5px]! text-[10px]! font-medium! whitespace-nowrap! [&.in]:bg-[#eef6f0]! [&.in]:text-[#397451]! [&.low]:bg-[#fff5e3]! [&.low]:text-[#a17021]! [&.out]:bg-[#fff0ed]! [&.out]:text-[#c34c40]! ${stock === 0 ? 'out' : stock < 5 ? 'low' : 'in'}`}>{stock === 0 ? 'Sold out' : stock < 5 ? 'Low stock' : 'In stock'}</span>
                      {p.variants?.length ? <span className="im-stock-total text-[11px]! text-[#888]!">{stock} units across sizes</span> : <StockCell p={p} API_URL={API_URL} fetchData={fetchData} toast={toast} />}
                      </div>
                    </td>

                    {/* ── Featured / Exclusive Column ── */}
                    <td data-label="Promotions"><div className="im-promotions flex! items-start! flex-col! gap-[9px]!">
                      <button
                        onClick={() => toggleFeatured(p)}
                        title={p.featured ? 'Remove from Exclusive section' : 'Add to Exclusive section'}
                        aria-pressed={Boolean(p.featured)}
                        className={`im-featured [border:0]! bg-[transparent]! p-[0]! text-[#999]! [font:500_11px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [&.selected]:text-[#a17021]! ${p.featured ? 'selected' : ''}`}>
                        {p.featured ? '★ Featured' : '☆ Feature'}
                      </button>

                    {/* ── Flash Sale Column ── */}
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
                    </div></td>

                    <td data-label="Actions"><div className="im-row-actions flex! items-start! flex-wrap! gap-[8px]! min-w-[145px]!">
                      <button onClick={() => handleEditClick(p)}
                        className="im-edit inline-flex! items-center! justify-center! gap-[7px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [padding:6px_10px]! [border:1px_solid_#e2e2df]! rounded-[6px]! bg-[#fff]! text-[#444]! [&:hover]:bg-[#f4f4f2]!">
                        <Pencil size={13} /> Edit
                      </button>
                      {p.variants?.length ? <button className="im-restock inline-flex! items-center! justify-center! gap-[7px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [border:1px_solid_#d9e9df]! text-[#397451]! bg-[#f5faf6]! rounded-[6px]! [padding:6px_10px]! [&:hover]:bg-[#e8f4ec]!" onClick={() => handleEditClick(p)}><Plus size={13} /> Edit size stock</button> : <AddStockCell p={p} API_URL={API_URL} fetchData={fetchData} toast={toast} />}
                      <button onClick={() => deletePerfume(p._id)}
                        className="im-delete inline-flex! items-center! justify-center! gap-[7px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! bg-[transparent]! [border:0]! text-[#be6d64]! [padding:6px_2px]! text-[11px]! [&:hover]:text-[#a12d21]!" aria-label={`Delete ${p.name}`}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div></td>
                  </tr>

                  {/* ── Inline Flash Sale Form ── */}
                  {flashEditId === p._id && (
                    <tr className="im-sale-editor max-[700px]:block! max-[700px]:w-[100%]! max-[700px]:rounded-[10px]! max-[700px]:[margin:-6px_0_14px]! max-[700px]:[&_>_td]:block! max-[700px]:[&_>_td]:w-[100%]! max-[700px]:[&_input]:max-w-[100%]! border-b border-[#eee] bg-amber-50">
                      <td colSpan="5" className="px-3 py-3">
                        <div className="flex flex-wrap gap-2.5 items-center">
                          <span className="text-[10px] font-bold tracking-wider text-amber-600">🔥 FLASH SALE</span>
                          <input
                            type="number" placeholder="Sale Price (TK)" aria-label="Sale price in TK"
                            value={flashForm.salePrice}
                            onChange={e => setFlashForm({...flashForm, salePrice: e.target.value})}
                            className="p-2 border border-[#ddd] outline-none text-sm w-36"
                          />
                          <input
                            type="datetime-local" aria-label="Sale end date and time"
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
                <td colSpan="5" className="im-empty text-center! [padding:46px_20px]! text-[#999]! [&_>_svg]:[margin:0_auto_12px]! [&_h3]:[margin:0_0_8px]! [&_h3]:[font:600_18px_'Jost',_sans-serif]! [&_h3]:text-[#555]! [&_p]:[margin:0_0_16px]! [&_p]:text-[13px]!">
                  <Package size={28} /><h3>{perfumes.length === 0 ? 'Your collection starts here' : 'No fragrances found'}</h3>
                  <p>{perfumes.length === 0 ? 'Add your first product to start building your collection.' : 'Try a different search or stock filter.'}</p>
                  {perfumes.length > 0 && <button onClick={() => { setSearchTerm(''); setStockFilter('all'); }} className="im-edit inline-flex! items-center! justify-center! gap-[7px]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [padding:6px_10px]! [border:1px_solid_#e2e2df]! rounded-[6px]! bg-[#fff]! text-[#444]! [&:hover]:bg-[#f4f4f2]!">Clear filters</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  );
};

export default InventoryManager;
