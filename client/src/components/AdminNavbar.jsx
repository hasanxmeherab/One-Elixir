import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    navigate('/admin-login');
  };

  return (
    <nav style={navStyle}>
      <div style={logoStyle}>ONEELIXIR <span style={tagStyle}>ADMIN</span></div>
      <button onClick={handleLogout} style={logoutBtn}>LOGOUT</button>
    </nav>
  );
};

const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: '#000', color: '#fff', position: 'sticky', top: 0, zIndex: 1000 };
const logoStyle = { fontWeight: 'bold', letterSpacing: '3px' };
const tagStyle = { fontSize: '10px', backgroundColor: '#fff', color: '#000', padding: '2px 6px', marginLeft: '10px', borderRadius: '2px' };
const logoutBtn = { background: 'none', border: '1px solid #fff', color: '#fff', padding: '5px 15px', cursor: 'pointer', fontSize: '12px' };

export default AdminNavbar;