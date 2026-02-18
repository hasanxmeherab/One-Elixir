import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, ShieldCheck, Mail, Calendar } from 'lucide-react';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admins/list`);
      setAdmins(res.data);
    } catch (err) { console.error("Could not fetch admins"); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admins/register`, formData);
      alert("New Admin Created Successfully");
      setFormData({ name: '', email: '', password: '' });
      fetchAdmins();
    } catch (err) { alert("Failed to create admin. Email might already exist."); }
  };

  return (
    <div style={container}>
      <div style={header}>
        <h2 style={{ letterSpacing: '3px' }}>ADMINISTRATOR MANAGEMENT</h2>
        <p style={{ fontSize: '12px', color: '#666' }}>Manage access and roles for OneElixir staff.</p>
      </div>

      <div style={contentGrid}>
        {/* ADD FORM */}
        <div style={card}>
          <h3 style={cardTitle}><UserPlus size={18} /> CREATE NEW ADMIN</h3>
          <form onSubmit={handleSubmit} style={formStyle}>
            <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={inputStyle} />
            <input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={inputStyle} />
            <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required style={inputStyle} />
            <button type="submit" style={submitBtn}>AUTHORIZE ADMIN</button>
          </form>
        </div>

        {/* ADMIN LIST */}
        <div style={tableCard}>
          <table style={tableStyle}>
            <thead>
              <tr style={thRow}>
                <th style={th}>NAME</th>
                <th style={th}>CONTACT</th>
                <th style={th}>ROLE</th>
                <th style={th}>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin._id} style={tr}>
                  <td style={td}><strong>{admin.name}</strong></td>
                  <td style={td}>{admin.email}</td>
                  <td style={td}><span style={badge}><ShieldCheck size={12} /> {admin.role.toUpperCase()}</span></td>
                  <td style={td}>{new Date(admin.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const container = { padding: '20px' };
const header = { marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' };
const contentGrid = { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' };
const card = { backgroundColor: '#fff', padding: '25px', border: '1px solid #eee', borderRadius: '4px' };
const tableCard = { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' };
const cardTitle = { fontSize: '14px', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inputStyle = { padding: '12px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' };
const submitBtn = { padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thRow = { backgroundColor: '#f9f9f9', textAlign: 'left' };
const th = { padding: '15px', fontSize: '11px', letterSpacing: '1px', color: '#888' };
const tr = { borderBottom: '1px solid #f0f0f0' };
const td = { padding: '15px', fontSize: '13px' };
const badge = { display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#e6fffa', color: '#2c7a7b', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold' };

export default AdminManagement;