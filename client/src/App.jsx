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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import Shop from './pages/Shop';
import Checkout from './pages/Checkout';
import Account from './pages/Account';

// --- IMPORT ADMIN SUB-COMPONENTS ---
import AdminDashboard from './pages/AdminDashboard';
import InventoryManager from './pages/InventoryManager';
import ManualOrder from './pages/ManualOrder';
import OrderList from './pages/OrderList';
import ExpenseManagement from './pages/ExpenseManagement';
import InvestmentTracker from './pages/InvestmentTracker';
import CouponManagement from './pages/CouponManagement';
import BannerManagement from './pages/BannerManagement';

// --- Navbar Component ---
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
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* --- UPDATED NESTED ADMIN ROUTES --- */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          >
            {/* The index route is what shows at /admin */}
            <Route index element={<AdminDashboard />} />
            <Route path="inventory" element={<InventoryManager />} />
            <Route path="manual-order" element={<ManualOrder />} />
            <Route path="order-list" element={<OrderList />} />
            <Route path="expenses" element={<ExpenseManagement />} />
            <Route path="investment" element={<InvestmentTracker />} />
            <Route path="coupons" element={<CouponManagement />} />
            <Route path="banners" element={<BannerManagement isAdmin={true} />} />
          </Route>

          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/account" element={<Account />} />
          
          {/* Kept this route just in case you use it outside the admin panel */}
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

// --- Styles maintained ---
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