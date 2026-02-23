import React, { useState } from 'react';
import axios from 'axios';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const InventoryManager = () => {
  const toast = useToast();
  const { perfumes = [], fetchData } = useOutletContext();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', price: '', description: '', scentProfile: '', image: '', stock: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME = "dluvmed0b";

  // Cloudinary image optimizer — adds auto-format + auto-quality + width cap
  const optimizeCloudinaryUrl = (url, width = 800) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  };
  const UPLOAD_PRESET = "one_elixir_uploads";

  if (!perfumes) {
    return <div className="p-10 text-center">Loading Inventory Data...</div>;
  }

  const filteredPerfumes = perfumes.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (p) => {
    setEditId(p._id);
    setFormData({
      name: p.name, price: p.price, description: p.description,
      scentProfile: p.scentProfile.join(', '), image: p.image, stock: p.stock
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormData({ name: '', price: '', description: '', scentProfile: '', image: '', stock: '' });
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let finalImageUrl = formData.image;
      if (file) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET);
        data.append("cloud_name", CLOUD_NAME);
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
        finalImageUrl = optimizeCloudinaryUrl(res.data.secure_url, 1200);
      }
      const payload = {
        ...formData,
        image: finalImageUrl,
        scentProfile: formData.scentProfile.split(',').map(s => s.trim())
      };
      if (editId) {
        await axios.put(`${API_URL}/api/perfumes/${editId}`, payload);
      } else {
        await axios.post(`${API_URL}/api/perfumes`, payload);
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
    if (window.confirm("Remove item from inventory?")) {
      await axios.delete(`${API_URL}/api/perfumes/${id}`);
      fetchData();
    }
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
        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded cursor-pointer transition-colors p-6 ${file ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black hover:bg-gray-50'}`}>
          <span className="text-2xl">{file ? '✓' : '📁'}</span>
          <span className="text-xs font-bold tracking-wider text-black">
            {file ? 'IMAGE SELECTED' : 'CLICK TO UPLOAD IMAGE'}
          </span>
          <span className="text-[10px] text-[#aaa] truncate max-w-full px-2 text-center">
            {file ? file.name : 'JPG, PNG, WEBP supported'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            required={!editId}
            className="hidden"
          />
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="submit" disabled={uploading}
            className="px-6 py-4 bg-black text-white border-none cursor-pointer font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {uploading ? 'SAVING...' : editId ? 'UPDATE CHANGES' : 'UPLOAD ELIXIR'}
          </button>
          {editId && (
            <button
              type="button" onClick={cancelEdit}
              className="px-6 py-4 bg-white text-black border border-black cursor-pointer font-bold hover:bg-gray-50 transition-colors"
            >
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
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2.5 px-4 border border-black outline-none w-[300px] max-w-full text-sm"
        />
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="p-2.5 text-xs tracking-wider">NAME</th>
              <th className="p-2.5 text-xs tracking-wider">PRICE</th>
              <th className="p-2.5 text-xs tracking-wider">STOCK</th>
              <th className="p-2.5 text-xs tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPerfumes.length > 0 ? (
              filteredPerfumes.map(p => (
                <tr key={p._id} className="border-b border-[#eee]">
                  <td className="p-2.5 text-sm">{p.name}</td>
                  <td className="p-2.5 text-sm">{p.price} TK</td>
                  <td className={`p-2.5 text-sm font-bold ${p.stock < 5 ? 'text-red-500' : 'text-black'}`}>
                    {p.stock}
                  </td>
                  <td className="p-2.5 text-sm">
                    <button
                      onClick={() => handleEditClick(p)}
                      className="bg-transparent border-none text-black cursor-pointer font-bold underline mr-2.5 hover:opacity-60 transition-opacity"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => deletePerfume(p._id)}
                      className="bg-transparent border-none text-red-500 cursor-pointer font-bold underline hover:opacity-60 transition-opacity"
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-5 text-center text-[#888]">
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