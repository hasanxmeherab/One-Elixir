import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { Menu, Search, ShoppingBag, Heart, User, X } from 'lucide-react';
import axios from 'axios';

const Navbar = () => {
  const { user, logout } = useUser();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const res = await axios.get(`${API_URL}/api/perfumes?search=${searchQuery}`);
          setSuggestions(res.data.slice(0, 6)); 
        } catch (err) { console.error("Search Error:", err); }
      } else {
        setSuggestions([]); 
      }
    };
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, API_URL]);

  const handleLogout = () => {
    logout();
    setIsSidebarOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav style={navContainer}>
        {/* LEFT: MENU ICON */}
        <div style={sideSection}>
          <Menu size={22} onClick={() => setIsSidebarOpen(true)} style={iconAction} />
        </div>
        
        {/* MIDDLE: LOGO */}
        <div style={centerSection}>
          <Link to="/" style={logoLink}>ONEELIXIR</Link>
        </div>
        
        {/* RIGHT: ICONS & AUTH BUTTONS */}
        <div style={rightSection}>
          <Search size={20} style={iconAction} className="desktop-only" onClick={() => setIsSearchOpen(true)} />
          <Heart size={20} style={iconAction} className="desktop-only" onClick={() => navigate('/wishlist')} />

          {/* DESKTOP AUTH: On the right corner when logged out */}
          {!user && (
            <div className="desktop-only" style={desktopAuthGroup}>
              <Link to="/signin" style={desktopAuthLink}>SIGN IN</Link>
              <Link to="/signup" style={desktopRegisterBtn}>REGISTER</Link>
            </div>
          )}
          
          <div style={cartWrapper} onClick={() => navigate('/cart')}>
            <ShoppingBag size={20} style={iconAction} />
            {cart.length > 0 && <span style={badge}>{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
          </div>

          <User 
            size={20} 
            style={iconAction} 
            className="desktop-only" 
            onClick={() => user ? navigate('/account') : navigate('/signin')} 
          />
        </div>
      </nav>

      {/* --- SIDEBAR DRAWER --- */}
      {isSidebarOpen && (
        <div style={sidebarOverlay}>
          <div style={sidebarContent}>
            <div style={sidebarHeader}><X size={28} onClick={() => setIsSidebarOpen(false)} style={iconAction} /></div>
            <ul style={navList}>
              {/* Mobile Search - Top of menu */}
              <li className="mobile-only">
                <div style={{ ...navItem, borderBottom: '2px solid #f0f0f0', display: 'flex', alignItems: 'center' }} onClick={() => { setIsSearchOpen(true); setIsSidebarOpen(false); }}>
                  <Search size={18} style={{ marginRight: '12px' }} /> SEARCH
                </div>
              </li>

              <li><Link to="/shop" style={navItem} onClick={() => setIsSidebarOpen(false)}>THE COLLECTION</Link></li>
              
              <li className="mobile-only"><Link to="/wishlist" style={navItem} onClick={() => setIsSidebarOpen(false)}>WISHLIST</Link></li>

              {/* AUTH LINKS: Visible in Menu only for MOBILE */}
              {!user ? (
                <>
                  <li className="mobile-only"><Link to="/signin" style={navItem} onClick={() => setIsSidebarOpen(false)}>SIGN IN</Link></li>
                  <li className="mobile-only">
                    <Link to="/signup" style={{ ...navItem, backgroundColor: '#000', color: '#fff', textAlign: 'center', marginTop: '10px' }} onClick={() => setIsSidebarOpen(false)}>REGISTER</Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="mobile-only"><Link to="/account" style={navItem} onClick={() => setIsSidebarOpen(false)}>MY PROFILE</Link></li>
                  <li><button onClick={handleLogout} style={logoutButton}>LOGOUT</button></li>
                </>
              )}
            </ul>
          </div>
          <div style={backdrop} onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* --- SEARCH OVERLAY --- */}
      {isSearchOpen && (
        <div style={searchPageOverlay}>
          <div style={searchHeader}><X size={32} onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} style={iconAction} /></div>
          <div style={searchContent}>
            <input type="text" placeholder="START TYPING..." style={largeSearchInput} autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <div style={suggestionBox}>
              {searchQuery.length > 0 && suggestions.map((item) => (
                <div key={item._id} style={suggestionItem} onClick={() => { navigate(`/product/${item._id}`); setIsSearchOpen(false); setSearchQuery(""); }}>
                  <img src={item.image} alt={item.name} style={suggestionThumb} />
                  <div>
                    <div style={suggestionName}>{item.name.toUpperCase()}</div>
                    <div style={suggestionPrice}>{item.price.toLocaleString()} TK</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </>
  );
};

// --- STYLES ---
const navContainer = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', padding: '0 5%', height: '80px', backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 1000 };
const sideSection = { display: 'flex', justifyContent: 'flex-start' };
const centerSection = { display: 'flex', justifyContent: 'center' };
const rightSection = { display: 'flex', justifyContent: 'flex-end', gap: '20px', alignItems: 'center' };
const logoLink = { fontSize: '24px', fontWeight: 'bold', letterSpacing: '6px', textDecoration: 'none', color: '#000' };
const iconAction = { cursor: 'pointer', color: '#000' };
const cartWrapper = { position: 'relative', cursor: 'pointer' };
const badge = { position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#000', color: '#fff', fontSize: '10px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' };

const desktopAuthGroup = { display: 'flex', gap: '15px', alignItems: 'center', marginRight: '10px' };
const desktopAuthLink = { textDecoration: 'none', color: '#000', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' };
const desktopRegisterBtn = { ...desktopAuthLink, backgroundColor: '#000', color: '#fff', padding: '8px 15px', borderRadius: '2px' };

const searchPageOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: '#fff', zIndex: 5000, display: 'flex', flexDirection: 'column' };
const searchHeader = { padding: '30px 5%', display: 'flex', justifyContent: 'flex-end' };
const searchContent = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '60px', padding: '0 10%' };
const largeSearchInput = { width: '100%', maxWidth: '800px', border: 'none', borderBottom: '2px solid #000', padding: '20px', fontSize: 'clamp(24px, 5vw, 36px)', textAlign: 'center', outline: 'none', letterSpacing: '2px', textTransform: 'uppercase' };
const suggestionBox = { width: '100%', maxWidth: '800px', marginTop: '40px' };
const suggestionItem = { display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' };
const suggestionThumb = { width: '60px', height: '60px', objectFit: 'cover' };
const suggestionName = { fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px' };
const suggestionPrice = { color: '#666', fontSize: '12px' };

const sidebarOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 2000, display: 'flex' };
const sidebarContent = { width: '300px', backgroundColor: '#fff', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', zIndex: 2001 };
const backdrop = { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' };
const sidebarHeader = { marginBottom: '50px' };
const navList = { listStyle: 'none', padding: 0, margin: 0 };
const navItem = { display: 'block', textDecoration: 'none', color: '#000', fontSize: '14px', letterSpacing: '2px', padding: '18px 0', borderBottom: '1px solid #f9f9f9', fontWeight: 'bold', cursor: 'pointer' };
const logoutButton = { ...navItem, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' };

export default Navbar;