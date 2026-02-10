import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountValue: '', discountType: 'percentage' });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/coupons`);
      setCoupons(res.data);
    } catch (err) { console.error("Error fetching coupons", err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/coupons`, newCoupon);
      setNewCoupon({ code: '', discountValue: '', discountType: 'percentage' });
      fetchCoupons();
      alert("Coupon created successfully!");
    } catch (err) { alert("Failed to create coupon."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this coupon?")) {
      try {
        await axios.delete(`${API_URL}/api/coupons/${id}`);
        fetchCoupons();
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div style={panelStyle}>
      <h2 style={titleStyle}>COUPON MANAGEMENT</h2>
      
      {/* Create Coupon Form */}
      <form onSubmit={handleCreate} style={formStyle}>
        <input 
          type="text" placeholder="CODE (e.g. SAVE20)" required 
          value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
          style={inputStyle}
        />
        <input 
          type="number" placeholder="Value" required 
          value={newCoupon.discountValue} onChange={e => setNewCoupon({...newCoupon, discountValue: e.target.value})}
          style={inputStyle}
        />
        <select 
          value={newCoupon.discountType} 
          onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value})}
          style={inputStyle}
        >
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed Amount (TK)</option>
        </select>
        <button type="submit" style={addBtn}>CREATE COUPON</button>
      </form>

      {/* Coupon List Table */}
      <table style={tableStyle}>
        <thead>
          <tr style={headerRow}>
            <th>CODE</th>
            <th>VALUE</th>
            <th>TYPE</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map(c => (
            <tr key={c._id} style={rowStyle}>
              <td>{c.code}</td>
              <td>{c.discountValue}</td>
              <td>{c.discountType}</td>
              <td>
                <button onClick={() => handleDelete(c._id)} style={delBtn}>DELETE</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Admin UI Styles ---
const panelStyle = { padding: '20px', backgroundColor: '#fff', border: '1px solid #eee' };
const titleStyle = { letterSpacing: '2px', fontSize: '14px', marginBottom: '20px' };
const formStyle = { display: 'flex', gap: '10px', marginBottom: '30px' };
const inputStyle = { padding: '10px', border: '1px solid #ddd', outline: 'none' };
const addBtn = { backgroundColor: '#000', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const headerRow = { textAlign: 'left', borderBottom: '2px solid #000', fontSize: '12px' };
const rowStyle = { borderBottom: '1px solid #eee', fontSize: '13px' };
const delBtn = { color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' };

export default CouponManagement;