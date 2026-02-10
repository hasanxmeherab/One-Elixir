import React from 'react'; 
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import { useCart } from './context/CartContext';
import { useUser } from './context/UserContext';

import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import ThankYou from './pages/ThankYou';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Shop from './pages/Shop';
// CartSidebar is no longer needed globally
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import ManualOrder from './pages/ManualOrder';

// --- Navbar Component ---
const Navbar = () => { // Removed onCartClick prop
  const { cart } = useCart();
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    alert("Logged out successfully.");
    navigate('/');
  };
  
  return (
    <nav style={navStyles}>
      <div className="logo">
        <Link to="/" style={logoLinkStyle}>OneElixir</Link>
      </div>
      <ul style={navLinksStyle}>
        <li><Link to="/shop" style={linkStyle}>Collection</Link></li>
        <li>
          {/* Changed from a div to a Link to navigate to the Cart page */}
          <Link to="/cart" style={linkStyle}>
            Cart ({cart.reduce((total, item) => total + item.quantity, 0)})
          </Link>
        </li>
        
        {user ? (
          <>
            <li>
              <Link to="/account" style={{ textDecoration: 'none' }}>
                <span style={welcomeTextStyle}>HI, {user.name.toUpperCase()}</span>
              </Link>
            </li>
            <li>
              <button onClick={handleLogout} style={logoutButtonStyle}>LOGOUT</button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/signin" style={linkStyle}>Sign In</Link></li>
            <li><Link to="/signup" style={linkStyle}>Sign Up</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

// --- Main App Content ---
const AppContent = () => {
  const location = useLocation();
  const isHideNavbar = location.pathname.startsWith('/admin');

  return (
    <>
      {/* Navbar no longer needs to control a sidebar state */}
      {!isHideNavbar && <Navbar />}
      
      {/* REMOVED: <CartSidebar />
          By removing this, we prevent the sidebar from overlaying the screen.
      */}
      
      <div className="container" style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* ProductDetails should no longer trigger a sidebar; 
              ensure that component also navigates to /cart instead of calling openCart.
          */}
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/checkout" element={<Checkout />} />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/account" element={<Account />} />
          <Route path="/manual-order" element={<ManualOrder />} />
        </Routes>
      </div>
    </>
  );
};

// --- App Root ---
function App() {
  return (
    <Router>
      <AppContent />
      <footer style={footerStyle}>
        <p>&copy; 2026 OneElixir Fragrances. Crafted for Elegance.</p>
      </footer>
    </Router>
  );
}

// --- Styles maintained from your version ---
const navStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 5%',
  borderBottom: '1px solid #eee',
  backgroundColor: '#fff',
  position: 'sticky',
  top: 0,
  zIndex: 1000
};

const logoLinkStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  letterSpacing: '4px',
  textDecoration: 'none',
  color: '#000',
  textTransform: 'uppercase'
};

const navLinksStyle = {
  display: 'flex',
  listStyle: 'none',
  gap: '30px',
  alignItems: 'center',
  margin: 0,
  padding: 0
};

const linkStyle = {
  textDecoration: 'none',
  color: '#555',
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontWeight: '500'
};

const welcomeTextStyle = {
  fontSize: '11px',
  color: '#999',
  letterSpacing: '1px',
  fontWeight: 'bold',
  cursor: 'pointer' 
};

const logoutButtonStyle = {
  background: 'none',
  border: '1px solid #000',
  padding: '6px 15px',
  fontSize: '11px',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontWeight: 'bold',
  transition: '0.3s'
};

const footerStyle = {
  textAlign: 'center',
  padding: '40px 0',
  marginTop: '50px',
  fontSize: '12px',
  color: '#999',
  borderTop: '1px solid #eee'
};

export default App;