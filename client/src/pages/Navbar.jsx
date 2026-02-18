import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const Navbar = ({ onCartClick }) => {
  const { user, logout } = useUser();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // State for mobile menu toggle
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isCurrentlyAdmin = location.pathname.toLowerCase().includes('admin');

  const handleLogout = () => {
    logout();
    setIsMobileOpen(false);
    alert("Logged out from OneElixir");
    navigate('/');
  };

  const closeMenu = () => setIsMobileOpen(false);

  return (
    <nav style={navStyle}>
      <div style={logoStyle}>
        <Link to="/" style={{ textDecoration: 'none', color: '#000' }} onClick={closeMenu}>ONEELIXIR</Link>
      </div>

      {/* --- MOBILE HAMBURGER ICON --- */}
      <div 
        style={hamburgerContainerStyle} 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="mobile-only"
      >
        <div style={barStyle}></div>
        <div style={barStyle}></div>
        <div style={barStyle}></div>
      </div>

      {/* --- NAVIGATION LINKS --- */}
      <div 
        style={isMobileOpen ? mobileLinkGroupStyle : linkGroupStyle} 
        className={isMobileOpen ? "" : "desktop-only"}
      >
        {/* Close Button for Mobile Overlay */}
        {isMobileOpen && (
          <div style={closeBtnStyle} onClick={closeMenu}>×</div>
        )}

        {isCurrentlyAdmin ? (
          <Link to="/" style={linkStyle} onClick={closeMenu}>EXIT TO SHOP</Link>
        ) : (
          <>
            <Link to="/shop" style={linkStyle} onClick={closeMenu}>SHOP</Link>
            
            <div onClick={() => { onCartClick(); closeMenu(); }} style={{ ...linkStyle, cursor: 'pointer' }}>
              CART ({cart.reduce((a, b) => a + b.quantity, 0)})
            </div>

            {user ? (
              <div style={authWrapperStyle}>
                <div 
                  onClick={() => { navigate('/account'); closeMenu(); }} 
                  style={accountWrapperStyle}
                >
                  <span style={userNameStyle}>
                    HELLO, {user.name.toUpperCase()}
                  </span>
                </div>
                <button onClick={handleLogout} style={logoutBtnStyle}>LOGOUT</button>
              </div>
            ) : (
              <div style={authWrapperStyle}>
                <Link to="/signin" style={linkStyle} onClick={closeMenu}>SIGN IN</Link>
                <Link to="/signup" style={linkStyle} onClick={closeMenu}>SIGN UP</Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* RESPONSIVE CSS INJECTED GLOBALLY */}
      <style>
        {`
          @media (max-width: 850px) {
            .desktop-only { display: none !important; }
            .mobile-only { display: flex !important; }
          }
          @media (min-width: 851px) {
            .mobile-only { display: none !important; }
            .desktop-only { display: flex !important; }
          }
        `}
      </style>
    </nav>
  );
};

// --- STYLES ---

const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 5%',
  borderBottom: '1px solid #eee',
  position: 'sticky',
  top: 0,
  backgroundColor: '#fff',
  zIndex: 1000
};

const logoStyle = { 
  fontSize: '22px', 
  fontWeight: 'bold', 
  letterSpacing: '4px' 
};

// Desktop Link Container
const linkGroupStyle = { 
  display: 'flex', 
  gap: '30px', 
  alignItems: 'center' 
};

// Mobile Link Container (Overlay)
const mobileLinkGroupStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '100%',
  height: '100vh',
  backgroundColor: '#fff',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '40px',
  zIndex: 2000,
};

const linkStyle = { 
  textDecoration: 'none', 
  color: '#000', 
  fontSize: '13px', 
  fontWeight: 'bold', 
  letterSpacing: '2px' 
};

const authWrapperStyle = {
  display: 'flex',
  flexDirection: 'inherit', // Follows parent's direction (row on desktop, column on mobile)
  alignItems: 'center',
  gap: '20px'
};

const hamburgerContainerStyle = {
  display: 'none', // Hidden by default, shown via Media Query
  flexDirection: 'column',
  gap: '5px',
  cursor: 'pointer'
};

const barStyle = {
  width: '25px',
  height: '2px',
  backgroundColor: '#000'
};

const closeBtnStyle = {
  position: 'absolute',
  top: '20px',
  right: '30px',
  fontSize: '40px',
  cursor: 'pointer',
  lineHeight: '1'
};

const accountWrapperStyle = {
  cursor: 'pointer',
  padding: '10px 15px',
  backgroundColor: '#f5f5f5',
  borderRadius: '2px',
  display: 'flex',
  alignItems: 'center',
  border: '1px solid transparent'
};

const userNameStyle = { 
  fontSize: '11px', 
  color: '#333', 
  letterSpacing: '1px',
  fontWeight: 'bold',
  pointerEvents: 'none'
};

const logoutBtnStyle = { 
  background: 'none', 
  border: '1px solid #000', 
  padding: '8px 20px', 
  fontSize: '11px', 
  cursor: 'pointer', 
  fontWeight: 'bold',
  letterSpacing: '1px'
};

export default Navbar;