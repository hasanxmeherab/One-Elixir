import React from 'react';

const AdminDashboard = ({ perfumes, orders }) => {
  // Calculations for OneElixir business overview
  const totalStock = perfumes.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalValuation = perfumes.reduce((acc, p) => acc + (p.price * (Number(p.stock) || 0)), 0);
  const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <div>
      <h3 style={{ letterSpacing: '3px', marginBottom: '30px', fontWeight: 'bold' }}>DASHBOARD OVERVIEW</h3>
      
      <div style={statsGrid}>
        <div style={statCard}>
          <span style={label}>TOTAL REVENUE</span>
          <span style={value}>{totalRevenue.toLocaleString()} TK</span>
        </div>
        <div style={statCard}>
          <span style={label}>INVENTORY VALUATION</span>
          <span style={value}>{totalValuation.toLocaleString()} TK</span>
        </div>
        <div style={statCard}>
          <span style={label}>STOCK ON HAND</span>
          <span style={value}>{totalStock} Bottles</span>
        </div>
      </div>

      <div style={{ marginTop: '50px', padding: '30px', border: '1px solid #eee', backgroundColor: '#fafafa' }}>
        <p style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>RECENT ACTIVITY</p>
        <p style={{ fontSize: '14px' }}>You have <strong>{orders.length}</strong> total orders recorded in the system.</p>
        <p style={{ fontSize: '14px' }}>Your collection currently features <strong>{perfumes.length}</strong> unique scents.</p>
      </div>
    </div>
  );
};

// --- Styles maintained ---
const statsGrid = { display: 'flex', gap: '20px' };
const statCard = { flex: 1, padding: '25px', backgroundColor: '#fff', border: '1px solid #eee', borderLeft: '5px solid #000' };
const label = { display: 'block', fontSize: '10px', color: '#888', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '10px' };
const value = { fontSize: '20px', fontWeight: 'bold' };

export default AdminDashboard;