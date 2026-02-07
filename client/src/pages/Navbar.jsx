import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const Navbar = ({ onCartClick }) => {
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
        {/* CASE 1: ADMIN VIEW */}
        {isCurrentlyAdmin ? (
          <>
            <Link to="/" style={linkStyle}>EXIT TO SHOP</Link>
          </>
        ) : (
          /* CASE 2: CUSTOMER VIEW */
          <>
            <Link to="/shop" style={linkStyle}>SHOP</Link>
            
            {/* Cart Trigger */}
            <div onClick={onCartClick} style={{ ...linkStyle, cursor: 'pointer' }}>
              CART ({cart.reduce((a, b) => a + b.quantity, 0)})
            </div>

            {/* --- CUSTOMER AUTH LOGIC --- */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                
                {/* 1. Clickable wrapper that manually triggers navigation */}
                <div 
                  onClick={() => navigate('/account')} 
                  style={accountWrapperStyle}
                >
                  <span style={userNameStyle}>
                    HELLO, {user.name.toUpperCase()}
                  </span>
                </div>

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

// --- Styles maintained and optimized for clickability ---
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

const logoStyle = { 
  fontSize: '24px', 
  fontWeight: 'bold', 
  letterSpacing: '4px' 
};

const linkGroupStyle = { 
  display: 'flex', 
  gap: '30px', 
  alignItems: 'center' 
};

const linkStyle = { 
  textDecoration: 'none', 
  color: '#000', 
  fontSize: '12px', 
  fontWeight: 'bold', 
  letterSpacing: '1px' 
};

const accountWrapperStyle = {
  cursor: 'pointer',
  padding: '8px 12px',
  backgroundColor: '#f5f5f5', // Subtle background to confirm hit area
  borderRadius: '2px',
  display: 'flex',
  alignItems: 'center',
  transition: 'background 0.2s',
  border: '1px solid transparent'
};

const userNameStyle = { 
  fontSize: '11px', 
  color: '#333', 
  letterSpacing: '1px',
  fontWeight: 'bold',
  pointerEvents: 'none' // Ensures click registers on the wrapper
};

const logoutBtnStyle = { 
  background: 'none', 
  border: '1px solid #000', 
  padding: '5px 12px', 
  fontSize: '11px', 
  cursor: 'pointer', 
  fontWeight: 'bold' 
};

export default Navbar;