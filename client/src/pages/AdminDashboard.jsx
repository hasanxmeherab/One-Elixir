import React, { useState } from 'react';

const AdminDashboard = ({ perfumes, orders, investments = [], onNavigate }) => {
  const [filterType, setFilterType] = useState(null);

  // --- Inventory Logic ---
  const lowStockItems = perfumes.filter(p => p.stock > 0 && p.stock <= 5);
  const outOfStockItems = perfumes.filter(p => p.stock === 0);
  
  const totalStock = perfumes.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalValuation = perfumes.reduce((acc, p) => acc + (p.price * (Number(p.stock) || 0)), 0);
  const totalRevenue = orders
  .filter(o => o.status?.toLowerCase() === 'delivered')
  .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const totalInvestment = (investments || []).reduce((acc, inv) => {
    const val = parseFloat(inv.totalAmount); // Use totalAmount, not amount
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  return (
    <div>
      <h3 style={{ letterSpacing: '3px', marginBottom: '30px', fontWeight: 'bold' }}>DASHBOARD OVERVIEW</h3>
      
      {/* Top Stats */}
      <div style={statsGrid}>
        <div style={statCard}>
          <span style={label}>TOTAL REVENUE</span>
          <span style={value}>{totalRevenue.toLocaleString()} TK</span>
        </div>
        <div style={statCard}>
          <span style={label}>TOTAL CAPITAL</span>
          <span style={value}>{totalInvestment.toLocaleString()} TK</span>
        </div>
        <div style={statCard}>
          <span style={label}>INVENTORY VALUE</span>
          <span style={value}>{totalValuation.toLocaleString()} TK</span>
        </div>
      </div>

      {/* Alert Cards */}
      <div style={{ ...statsGrid, marginTop: '20px' }}>
        <div style={statCard}>
          <span style={label}>TOTAL UNITS</span>
          <span style={value}>{totalStock}</span>
        </div>

        <div 
          onClick={() => setFilterType(filterType === 'low' ? null : 'low')} 
          style={{ ...statCard, borderLeft: '5px solid #f39c12', cursor: 'pointer', backgroundColor: filterType === 'low' ? '#fff9f0' : '#fff' }}
        >
          <span style={{ ...label, color: '#f39c12' }}>LOW STOCK (VIEW)</span>
          <span style={{ ...value, color: '#f39c12' }}>{lowStockItems.length}</span>
        </div>

        <div 
          onClick={() => setFilterType(filterType === 'out' ? null : 'out')} 
          style={{ ...statCard, borderLeft: '5px solid #e74c3c', cursor: 'pointer', backgroundColor: filterType === 'out' ? '#fff5f5' : '#fff' }}
        >
          <span style={{ ...label, color: '#e74c3c' }}>OUT OF STOCK (VIEW)</span>
          <span style={{ ...value, color: '#e74c3c' }}>{outOfStockItems.length}</span>
        </div>
      </div>

      {/* Dynamic List with Restock Shortcuts */}
      {filterType && (
        <div style={alertListBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '11px', letterSpacing: '1px' }}>
              {filterType === 'low' ? '⚠️ LOW STOCK ITEMS' : '🚫 OUT OF STOCK ITEMS'}
            </p>
            <button onClick={() => setFilterType(null)} style={closeBtn}>CLOSE</button>
          </div>
          
          <div style={listScroll}>
            {(filterType === 'low' ? lowStockItems : outOfStockItems).map(item => (
              <div key={item._id} style={itemRow}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
                  <span style={{ fontSize: '11px', color: filterType === 'low' ? '#f39c12' : '#e74c3c' }}>
                    Current Stock: {item.stock}
                  </span>
                </div>
                {/* Navigation Shortcut Button */}
                <button 
                  onClick={() => onNavigate('inventory')} 
                  style={restockBtn}
                >
                  RESTOCK →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Styles ---
const statsGrid = { display: 'flex', gap: '20px' };
const statCard = { flex: 1, padding: '25px', backgroundColor: '#fff', border: '1px solid #eee', borderLeft: '5px solid #000', transition: '0.2s' };
const label = { display: 'block', fontSize: '10px', color: '#888', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '10px' };
const value = { fontSize: '20px', fontWeight: 'bold' };
const alertListBox = { marginTop: '30px', padding: '25px', backgroundColor: '#fff', border: '1px solid #000' };
const listScroll = { maxHeight: '300px', overflowY: 'auto' };
const itemRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #eee' };
const closeBtn = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline' };
const restockBtn = { backgroundColor: '#000', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', borderRadius: '3px' };

export default AdminDashboard;