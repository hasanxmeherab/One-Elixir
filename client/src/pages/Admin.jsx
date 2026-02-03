import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Admin = () => {
  const navigate = useNavigate();
  
  // State Management
  const [perfumes, setPerfumes] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null); // Tracks if we are editing an existing item

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    scentProfile: '',
    image: '' // Stores existing image URL during edits
  });

  // Fetch collection from MongoDB
  const fetchPerfumes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/perfumes');
      setPerfumes(res.data);
    } catch (err) {
      console.error("Error fetching collection:", err);
    }
  };

  useEffect(() => {
    fetchPerfumes();
  }, []);

  // Logout Logic
  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    navigate('/admin-login');
  };

  // Populate form for editing
  const handleEditClick = (perfume) => {
    setEditId(perfume._id);
    setFormData({
      name: perfume.name,
      price: perfume.price,
      description: perfume.description,
      scentProfile: perfume.scentProfile.join(', '),
      image: perfume.image
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset form and exit edit mode
  const cancelEdit = () => {
    setEditId(null);
    setFormData({ name: '', price: '', description: '', scentProfile: '', image: '' });
    setFile(null);
  };

  // Main Submit Logic (Create & Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let finalImageUrl = formData.image;

      // 1. If a new file is selected, upload to Cloudinary
      if (file) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "one_elixir_uploads"); // Use your preset
        data.append("cloud_name", "your_cloud_name"); // Use your cloud name

        const cloudinaryRes = await axios.post(
          "https://api.cloudinary.com/v1_1/your_cloud_name/image/upload",
          data
        );
        finalImageUrl = cloudinaryRes.data.secure_url;
      }

      const payload = {
        ...formData,
        image: finalImageUrl,
        scentProfile: formData.scentProfile.split(',').map(s => s.trim())
      };

      // 2. Choose PUT or POST
      if (editId) {
        await axios.put(`http://localhost:5000/api/perfumes/${editId}`, payload);
        alert('Elixir updated successfully!');
      } else {
        await axios.post('http://localhost:5000/api/perfumes', payload);
        alert('New Elixir added to collection!');
      }

      cancelEdit();
      fetchPerfumes();
    } catch (err) {
      console.error("Operation failed:", err);
      alert('Error saving product. Check console for details.');
    } finally {
      setUploading(false);
    }
  };

  // Delete Logic
  const deletePerfume = async (id) => {
    if (window.confirm("Are you sure you want to remove this elixir?")) {
      try {
        await axios.delete(`http://localhost:5000/api/perfumes/${id}`);
        setPerfumes(perfumes.filter(p => p._id !== id));
      } catch (err) {
        alert("Error deleting product");
      }
    }
  };

  return (
    <div style={{ padding: '50px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
        <h1 style={{ letterSpacing: '3px' }}>COMMAND CENTER</h1>
        <button onClick={handleLogout} style={logoutBtnStyle}>LOGOUT</button>
      </div>

      {/* Form Section */}
      <section style={{ marginBottom: '80px', padding: '40px', border: '1px solid #eee' }}>
        <h3 style={{ letterSpacing: '2px' }}>{editId ? 'EDITING ELIXIR' : 'ADD NEW ELIXIR'}</h3>
        <form onSubmit={handleSubmit} style={formStyle}>
          <input type="text" placeholder="Perfume Name" value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} required style={inputStyle}/>
          
          <input type="number" placeholder="Price ($)" value={formData.price} 
            onChange={(e) => setFormData({...formData, price: e.target.value})} required style={inputStyle}/>
          
          <textarea placeholder="Description" value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})} style={{ ...inputStyle, minHeight: '100px' }}/>
          
          <input type="text" placeholder="Scent Profile (e.g. Woody, Floral)" value={formData.scentProfile} 
            onChange={(e) => setFormData({...formData, scentProfile: e.target.value})} style={inputStyle}/>
          
          <div>
            <label style={{ fontSize: '11px', display: 'block', marginBottom: '8px' }}>
              {editId ? 'REPLACE IMAGE (OPTIONAL)' : 'PRODUCT IMAGE'}
            </label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} required={!editId} />
          </div>
          
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button type="submit" disabled={uploading} style={btnStyle}>
              {uploading ? 'PROCESSING...' : editId ? 'SAVE CHANGES' : 'UPLOAD TO COLLECTION'}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit} style={cancelBtnStyle}>CANCEL</button>
            )}
          </div>
        </form>
      </section>

      {/* Management Table */}
      <section>
        <h3 style={{ letterSpacing: '2px' }}>COLLECTION MANAGEMENT</h3>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={thStyle}>NAME</th>
              <th style={thStyle}>PRICE</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {perfumes.map((p) => (
              <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{p.name}</td>
                <td style={tdStyle}>${p.price}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleEditClick(p)} style={editActionBtn}>EDIT</button>
                  <button onClick={() => deletePerfume(p._id)} style={deleteActionBtn}>DELETE</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

// --- Styles ---
const formStyle = { display: 'flex', flexDirection: 'column', gap: '20px' };
const inputStyle = { padding: '15px', border: '1px solid #eee', outline: 'none', fontFamily: 'inherit' };
const btnStyle = { flex: 2, backgroundColor: '#000', color: '#fff', padding: '15px', cursor: 'pointer', border: 'none', letterSpacing: '2px', fontWeight: 'bold' };
const cancelBtnStyle = { flex: 1, backgroundColor: '#fff', border: '1px solid #000', cursor: 'pointer', letterSpacing: '2px' };

const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };
const thStyle = { textAlign: 'left', padding: '15px 10px', fontSize: '12px', letterSpacing: '1px' };
const tdStyle = { padding: '15px 10px' };

const editActionBtn = { background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginRight: '20px', textDecoration: 'underline' };
const deleteActionBtn = { background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };
const logoutBtnStyle = { background: 'none', border: '1px solid #000', padding: '10px 25px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };

export default Admin;