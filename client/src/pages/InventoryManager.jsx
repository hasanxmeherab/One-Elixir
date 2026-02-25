import React, { useState } from 'react';
import axios from 'axios';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Plus, X, ImagePlus } from 'lucide-react';

const InventoryManager = () => {
  const toast = useToast();
  const { perfumes = [], fetchData } = useOutletContext();

  const [files, setFiles] = useState([]);          // multiple image files
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', price: '', description: '', scentProfile: '', image: '', images: [], stock: ''
  });

  const API_URL   = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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

      // Upload any new files
      const newUrls = files.length > 0
        ? await Promise.all(files.map(uploadSingleFile))
        : [];

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
              <th className="p-2.5 text-xs tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPerfumes.length > 0 ? (
              filteredPerfumes.map(p => (
                <tr key={p._id} className="border-b border-[#eee]">
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
                  <td className={`p-2.5 text-sm font-bold ${p.stock < 5 ? 'text-red-500' : 'text-black'}`}>{p.stock}</td>
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
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-5 text-center text-[#888]">
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