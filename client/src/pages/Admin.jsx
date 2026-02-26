import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import AdminNavbar from '../components/AdminNavbar';

const Admin = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [investments, setInvestments] = useState([]);
  const location = useLocation(); 
  const navigate = useNavigate(); // Initialize navigate for logout
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      const pRes = await axios.get(`${API_URL}/api/perfumes`);
      const oRes = await axios.get(`${API_URL}/api/orders`);
      const iRes = await axios.get(`${API_URL}/api/investments`);
      setPerfumes(pRes.data);
      setOrders(oRes.data);
      setInvestments(iRes.data);
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- NEW: LOGOUT LOGIC ---
  const handleAdminLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin-login');
  };

  // Helper to check if a link is active for styling
  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdminNavbar />
      
      <div style={{ display: 'flex', flex: 1 }}>
        {/* SIDEBAR WITH DEDICATED LINKS */}
        <div style={sidebarStyle}>
          <p style={sidebarLabel}>COMMAND CENTER</p>
          
          <Link to="/admin" style={isActive('/admin') ? activeBtn : menuBtn}>
            DASHBOARD
          </Link>
          
          <Link to="/admin/inventory" style={isActive('/admin/inventory') ? activeBtn : menuBtn}>
            INVENTORY
          </Link>
          
          <Link to="/admin/manual-order" style={isActive('/admin/manual-order') ? activeBtn : menuBtn}>
            MANUAL ORDER
          </Link>
          
          <Link to="/admin/order-list" style={isActive('/admin/order-list') ? activeBtn : menuBtn}>
            ORDER LIST
          </Link>
          
          <Link to="/admin/expenses" style={isActive('/admin/expenses') ? activeBtn : menuBtn}>
            EXPENSES
          </Link>
          
          <Link to="/admin/investment" style={isActive('/admin/investment') ? activeBtn : menuBtn}>
            INVESTMENT
          </Link>

          <Link to="/admin/customers" style={isActive('/admin/customers') ? activeBtn : menuBtn}>
            CUSTOMERS
          </Link>

          <Link to="/admin/logs" style={isActive('/admin/logs') ? activeBtn : menuBtn}>
            ACTIVITY LOGS
          </Link>

          <Link to="/admin/admins" style={isActive('/admin/admins') ? activeBtn : menuBtn}>
            ADMIN MANAGEMENT
          </Link>
          
          <Link to="/admin/coupons" style={isActive('/admin/coupons') ? activeBtn : menuBtn}>
            COUPONS
          </Link>
          
          <Link to="/admin/banners" style={isActive('/admin/banners') ? activeBtn : menuBtn}>
            BANNERS
          </Link>

          {/* --- NEW: LOGOUT BUTTON AT BOTTOM --- */}
          <button onClick={handleAdminLogout} style={logoutBtnStyle}>
            LOGOUT SYSTEM
          </button>
        </div>

        {/* DEDICATED PAGE CONTENT AREA */}
        <div style={{ flex: 1, padding: '40px', backgroundColor: '#fff' }}>
          <Outlet context={{ perfumes, orders, investments, fetchData }} />
        </div>
      </div>
    </div>
  );
};

// --- Styles (Maintained & Luxury Feel) ---
const sidebarStyle = { 
  width: '260px', 
  backgroundColor: '#f9f9f9', 
  borderRight: '1px solid #eee', 
  padding: '30px 15px', 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '5px' 
};

const sidebarLabel = { 
  fontSize: '10px', 
  letterSpacing: '2px', 
  color: '#888', 
  fontWeight: 'bold', 
  marginBottom: '20px', 
  paddingLeft: '10px' 
};

const menuBtn = { 
  textDecoration: 'none',
  textAlign: 'left', 
  padding: '12px 15px', 
  backgroundColor: 'transparent', 
  border: 'none', 
  cursor: 'pointer', 
  fontSize: '12px', 
  fontWeight: 'bold', 
  letterSpacing: '1px', 
  color: '#555', 
  transition: '0.2s',
  display: 'block' 
};

const activeBtn = { 
  ...menuBtn, 
  backgroundColor: '#000', 
  color: '#fff', 
  borderRadius: '4px' 
};

// --- NEW: LOGOUT STYLE ---
const logoutBtnStyle = {
  ...menuBtn,
  marginTop: 'auto', // Pushes button to the bottom
  color: '#991b1b', // Dark red for danger/logout action
  backgroundColor: '#fff',
  border: '1px solid #fee2e2',
  borderRadius: '4px',
  textAlign: 'center'
};

export default Admin;