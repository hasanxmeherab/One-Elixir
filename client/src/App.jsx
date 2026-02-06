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

// Updated Navbar with User Auth Logic
const Navbar = () => {
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
          <Link to="/cart" style={linkStyle}>
            Cart ({cart.reduce((total, item) => total + item.quantity, 0)})
          </Link>
        </li>
        
        {user ? (
          <>
            <li style={welcomeTextStyle}>HI, {user.name.toUpperCase()}</li>
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

// Wrapper component to handle conditional Navbar rendering
const AppContent = () => {
  const location = useLocation();
  // Hide this navbar if the path is /admin or /admin-login
  const isHideNavbar = location.pathname.startsWith('/admin');

  return (
    <>
      {!isHideNavbar && <Navbar />}
      <div className="container" style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/shop" element={<Shop />} />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route path="/admin-login" element={<AdminLogin />} />
        </Routes>
      </div>
    </>
  );
};

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

// --- Styles ---

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
  fontWeight: 'bold'
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