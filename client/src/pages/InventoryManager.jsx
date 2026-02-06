import React, { useState } from 'react';
import axios from 'axios';

const InventoryManager = ({ perfumes, fetchData }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // Search state
  const [formData, setFormData] = useState({
    name: '', price: '', description: '', scentProfile: '', image: '', stock: 0
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME = "dluvmed0b";
  const UPLOAD_PRESET = "one_elixir_uploads";

  // --- Search Filtering Logic ---
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
    setFormData({ name: '', price: '', description: '', scentProfile: '', image: '', stock: 0 });
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
        finalImageUrl = res.data.secure_url;
      }
      const payload = { ...formData, image: finalImageUrl, scentProfile: formData.scentProfile.split(',').map(s => s.trim()) };
      if (editId) { await axios.put(`${API_URL}/api/perfumes/${editId}`, payload); }
      else { await axios.post(`${API_URL}/api/perfumes`, payload); }
      cancelEdit(); 
      fetchData();
    } catch (err) { alert('Operation failed'); } finally { setUploading(false); }
  };

  const deletePerfume = async (id) => {
    if (window.confirm("Remove item from inventory?")) {
      await axios.delete(`${API_URL}/api/perfumes/${id}`);
      fetchData();
    }
  };

  return (
    <section>
      <h3 style={{ letterSpacing: '2px', marginBottom: '20px' }}>INVENTORY MANAGEMENT</h3>
      
      {/* FORM SECTION */}
      <form onSubmit={handleSubmit} style={formStyle}>
        <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={inputStyle}/>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="number" placeholder="Price (TK)" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required style={{...inputStyle, flex: 1}}/>
          <input type="number" placeholder="Stock" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required style={{...inputStyle, flex: 1}}/>
        </div>
        <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{...inputStyle, minHeight: '80px'}}/>
        <input type="text" placeholder="Scent Notes" value={formData.scentProfile} onChange={e => setFormData({...formData, scentProfile: e.target.value})} style={inputStyle}/>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} required={!editId} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={uploading} style={btnStyle}>{uploading ? 'SAVING...' : editId ? 'UPDATE CHANGES' : 'UPLOAD ELIXIR'}</button>
          {editId && <button type="button" onClick={cancelEdit} style={cancelBtnStyle}>CANCEL</button>}
        </div>
      </form>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '40px 0' }} />

      {/* SEARCH BAR BEFORE LIST */}
      <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>SEARCH PERFUME:</span>
        <input 
          type="text" 
          placeholder="Type perfume name to search..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          style={searchBarStyle}
        />
      </div>

      {/* INVENTORY LIST */}
      <table style={tableStyle}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={thStyle}>NAME</th><th style={thStyle}>PRICE</th><th style={thStyle}>STOCK</th><th style={thStyle}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {filteredPerfumes.length > 0 ? (
            filteredPerfumes.map(p => (
              <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{p.name}</td>
                <td style={tdStyle}>{p.price} TK</td>
                <td style={{...tdStyle, color: p.stock < 5 ? 'red' : 'black', fontWeight: 'bold'}}>{p.stock}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleEditClick(p)} style={actionBtn}>EDIT</button>
                  <button onClick={() => deletePerfume(p._id)} style={{...actionBtn, color: 'red'}}>DELETE</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No perfumes found matching "{searchTerm}"</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
};

// Styles
const searchBarStyle = { padding: '10px 15px', border: '1px solid #000', outline: 'none', width: '300px', fontSize: '13px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '10px' };
const inputStyle = { padding: '12px', border: '1px solid #ddd', outline: 'none' };
const btnStyle = { padding: '15px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const cancelBtnStyle = { ...btnStyle, background: '#fff', color: '#000', border: '1px solid #000' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const thStyle = { padding: '10px', fontSize: '12px', letterSpacing: '1px' };
const tdStyle = { padding: '10px', fontSize: '13px' };
const actionBtn = { background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px', textDecoration: 'underline' };

export default InventoryManager;