import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';
import AdminDashboard from './AdminDashboard'; // Renamed import
import InventoryManager from './InventoryManager';
import ManualOrder from './ManualOrder';
import OrderList from './OrderList';

const Admin = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [perfumes, setPerfumes] = useState([]);
  const [orders, setOrders] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      const pRes = await axios.get(`${API_URL}/api/perfumes`);
      const oRes = await axios.get(`${API_URL}/api/orders`);
      setPerfumes(pRes.data);
      setOrders(oRes.data);
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdminNavbar />
      
      <div style={{ display: 'flex', flex: 1 }}>
        {/* SIDEBAR */}
        <div style={sidebarStyle}>
          <p style={sidebarLabel}>COMMAND CENTER</p>
          <button onClick={() => setActivePage('dashboard')} style={activePage === 'dashboard' ? activeBtn : menuBtn}>DASHBOARD</button>
          <button onClick={() => setActivePage('inventory')} style={activePage === 'inventory' ? activeBtn : menuBtn}>INVENTORY</button>
          <button onClick={() => setActivePage('manual-order')} style={activePage === 'manual-order' ? activeBtn : menuBtn}>MANUAL ORDER</button>
          <button onClick={() => setActivePage('order-list')} style={activePage === 'order-list' ? activeBtn : menuBtn}>ORDER LIST</button>
          <button onClick={() => setActivePage('expenses')} style={activePage === 'expenses' ? activeBtn : menuBtn}>EXPENSES</button>
          <button onClick={() => setActivePage('investment')} style={activePage === 'investment' ? activeBtn : menuBtn}>INVESTMENT</button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div style={{ flex: 1, padding: '40px', backgroundColor: '#fff' }}>
          {activePage === 'dashboard' && <AdminDashboard perfumes={perfumes} orders={orders} />}
          {activePage === 'inventory' && <InventoryManager perfumes={perfumes} fetchData={fetchData} />}
          {activePage === 'manual-order' && <ManualOrder perfumes={perfumes} fetchData={fetchData} />}
          {activePage === 'order-list' && <OrderList orders={orders} fetchData={fetchData} />}
          
          {activePage === 'expenses' && <div>Expense Management Coming Soon...</div>}
          {activePage === 'investment' && <div>Investment Tracker Coming Soon...</div>}
        </div>
      </div>
    </div>
  );
};

// --- Styles maintained from previous step ---
const sidebarStyle = { width: '260px', backgroundColor: '#f9f9f9', borderRight: '1px solid #eee', padding: '30px 15px', display: 'flex', flexDirection: 'column', gap: '5px' };
const sidebarLabel = { fontSize: '10px', letterSpacing: '2px', color: '#888', fontWeight: 'bold', marginBottom: '20px', paddingLeft: '10px' };
const menuBtn = { textAlign: 'left', padding: '12px 15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', color: '#555', transition: '0.2s' };
const activeBtn = { ...menuBtn, backgroundColor: '#000', color: '#fff', borderRadius: '4px' };

export default Admin;