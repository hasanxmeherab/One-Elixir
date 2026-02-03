import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import { useCart } from './context/CartContext';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';

// Basic Navbar Component
const Navbar = () => {
  const { cart } = useCart();
  
  return (
    <nav style={navStyles}>
      <div className="logo">
        <Link to="/" style={logoLinkStyle}>OneElixir</Link>
      </div>
      <ul style={navLinksStyle}>
        <li><Link to="/" style={linkStyle}>Collection</Link></li>
        <li>
          <Link to="/cart" style={linkStyle}>
            Cart ({cart.reduce((total, item) => total + item.quantity, 0)})
          </Link>
        </li>
      </ul>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
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
      <footer style={footerStyle}>
        <p>&copy; 2026 OneElixir Fragrances. Crafted for Elegance.</p>
      </footer>
    </Router>
  );
}

// Inline Styles for OneElixir's Premium Look
const navStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 5%',
  borderBottom: '1px solid #eee',
  backgroundColor: '#fff'
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
  gap: '30px'
};

const linkStyle = {
  textDecoration: 'none',
  color: '#555',
  fontSize: '14px',
  textTransform: 'uppercase',
  letterSpacing: '1px'
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