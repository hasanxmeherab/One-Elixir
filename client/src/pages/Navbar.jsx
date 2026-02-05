import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const Navbar = () => {
  const { user, logout } = useUser();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // STRICT CHECK: If the URL has 'admin', we hide customer features entirely
  const isCurrentlyAdmin = location.pathname.toLowerCase().includes('admin');

  const handleLogout = () => {
    logout();
    alert("Logged out from OneElixir");
    navigate('/');
  };

  return (
    <nav style={navStyle}>
      <div style={logoStyle}>
        <Link to="/" style={{ textDecoration: 'none', color: '#000' }}>ONEELIXIR</Link>
      </div>

      <div style={linkGroupStyle}>
        {/* CASE 1: ADMIN IS LOGGED IN OR ON ADMIN LOGIN PAGE */}
        {isCurrentlyAdmin ? (
          <>
            <Link to="/" style={linkStyle}>EXIT TO SHOP</Link>
            {/* We show nothing else here to keep the admin panel clean */}
          </>
        ) : (
          /* CASE 2: CUSTOMER IS BROWSING (NORMAL VIEW) */
          <>
            <Link to="/" style={linkStyle}>SHOP</Link>
            <Link to="/cart" style={linkStyle}>
              CART ({cart.reduce((a, b) => a + b.quantity, 0)})
            </Link>

            {/* --- CUSTOMER AUTH LOGIC --- */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span style={userNameStyle}>HELLO, {user.name.toUpperCase()}</span>
                <button onClick={handleLogout} style={logoutBtnStyle}>LOGOUT</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '20px' }}>
                <Link to="/signin" style={linkStyle}>SIGN IN</Link>
                <Link to="/signup" style={linkStyle}>SIGN UP</Link>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
};

// --- Styles (Your Final Working Styles) ---
const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 10%',
  borderBottom: '1px solid #eee',
  position: 'sticky',
  top: 0,
  backgroundColor: '#fff',
  zIndex: 1000
};

const logoStyle = { fontSize: '24px', fontWeight: 'bold', letterSpacing: '4px' };
const linkGroupStyle = { display: 'flex', gap: '30px', alignItems: 'center' };
const linkStyle = { textDecoration: 'none', color: '#000', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' };
const userNameStyle = { fontSize: '11px', color: '#888', letterSpacing: '1px' };
const logoutBtnStyle = { background: 'none', border: '1px solid #000', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' };

export default Navbar;