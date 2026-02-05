import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleAdminLogout = () => {
    localStorage.removeItem('isAdminAuthenticated'); // Clear admin session
    navigate('/admin-login');
  };

  return (
    <nav style={adminNavStyle}>
      <div style={logoStyle}>ONEELIXIR <span style={adminTag}>ADMIN</span></div>
      <div style={linkGroup}>
        <Link to="/" style={exitLink}>EXIT TO SHOP</Link>
        <button onClick={handleAdminLogout} style={logoutBtn}>LOGOUT</button>
      </div>
    </nav>
  );
};

// Styles to keep it professional
const adminNavStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 5%', backgroundColor: '#000', color: '#fff' };
const logoStyle = { letterSpacing: '4px', fontWeight: 'bold' };
const adminTag = { fontSize: '10px', backgroundColor: '#fff', color: '#000', padding: '2px 5px', marginLeft: '10px' };
const linkGroup = { display: 'flex', gap: '20px', alignItems: 'center' };
const exitLink = { color: '#fff', textDecoration: 'none', fontSize: '12px', opacity: 0.8 };
const logoutBtn = { backgroundColor: 'transparent', border: '1px solid #fff', color: '#fff', padding: '5px 15px', cursor: 'pointer', fontSize: '11px' };

export default AdminNavbar;