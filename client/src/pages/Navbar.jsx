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

      {/* --- MOBILE HAMBURGER ICON (Visible only on mobile) --- */}
      <div 
        style={hamburgerContainerStyle} 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="mobile-hamburger-btn"
      >
        <div style={barStyle}></div>
        <div style={barStyle}></div>
        <div style={barStyle}></div>
      </div>

      {/* --- NAVIGATION LINKS --- */}
      <div 
        style={isMobileOpen ? mobileLinkGroupStyle : linkGroupStyle} 
        className={isMobileOpen ? "mobile-menu-active" : "nav-links-desktop"}
      >
        {/* Close Button for Mobile Overlay */}
        {isMobileOpen && (
          <div style={closeBtnStyle} onClick={closeMenu}>×</div>
        )}

        {isCurrentlyAdmin ? (
          <Link to="/" style={linkStyle} onClick={closeMenu}>EXIT TO SHOP</Link>
        ) : (
          <>
            <Link to="/shop" style={linkStyle} onClick={closeMenu}>COLLECTION</Link>
            
            <div onClick={() => { onCartClick(); closeMenu(); }} style={{ ...linkStyle, cursor: 'pointer' }}>
              CART ({cart.reduce((a, b) => a + b.quantity, 0)})
            </div>

            {user ? (
              <div className="auth-flex" style={authWrapperStyle}>
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
              <div className="auth-flex" style={authWrapperStyle}>
                <Link to="/signin" style={linkStyle} onClick={closeMenu}>SIGN IN</Link>
                <Link to="/signup" style={linkStyle} onClick={closeMenu}>SIGN UP</Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* FIXES THE SQUASHED LAYOUT ON MOBILE */}
      <style>
        {`
          @media (max-width: 850px) {
            .nav-links-desktop { 
              display: none !important; 
            }
            .mobile-hamburger-btn { 
              display: flex !important; 
            }
            .auth-flex {
              flex-direction: column;
              width: 100%;
            }
          }
          @media (min-width: 851px) {
            .mobile-hamburger-btn { 
              display: none !important; 
            }
            .nav-links-desktop { 
              display: flex !important; 
            }
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
  padding: '15px 5%',
  borderBottom: '1px solid #eee',
  position: 'sticky',
  top: 0,
  backgroundColor: '#fff',
  zIndex: 1000,
  minHeight: '70px'
};

const logoStyle = { 
  fontSize: '20px', 
  fontWeight: 'bold', 
  letterSpacing: '3px' 
};

const linkGroupStyle = { 
  display: 'flex', 
  gap: '25px', 
  alignItems: 'center' 
};

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
  gap: '35px',
  zIndex: 2000,
};

const linkStyle = { 
  textDecoration: 'none', 
  color: '#000', 
  fontSize: '12px', 
  fontWeight: 'bold', 
  letterSpacing: '1.5px' 
};

const authWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px'
};

const hamburgerContainerStyle = {
  display: 'none', 
  flexDirection: 'column',
  gap: '5px',
  cursor: 'pointer',
  padding: '10px'
};

const barStyle = {
  width: '22px',
  height: '2px',
  backgroundColor: '#000'
};

const closeBtnStyle = {
  position: 'absolute',
  top: '20px',
  right: '25px',
  fontSize: '35px',
  cursor: 'pointer'
};

const accountWrapperStyle = {
  cursor: 'pointer',
  padding: '8px 12px',
  backgroundColor: '#f8f8f8',
  borderRadius: '2px',
  display: 'flex',
  alignItems: 'center'
};

const userNameStyle = { 
  fontSize: '10px', 
  color: '#333', 
  fontWeight: 'bold',
  pointerEvents: 'none'
};

const logoutBtnStyle = { 
  background: 'none', 
  border: '1px solid #000', 
  padding: '6px 15px', 
  fontSize: '10px', 
  cursor: 'pointer', 
  fontWeight: 'bold' 
};

export default Navbar;