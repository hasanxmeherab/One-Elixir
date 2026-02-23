import React from 'react'; 
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import ThankYou from './pages/ThankYou';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Shop from './pages/Shop';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import Wishlist from './pages/Wishlist';
import OrderTracking from './pages/OrderTracking';
import ActivityLogs from './pages/ActivityLogs';

// --- COMPONENTS ---
import Navbar from './pages/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// --- ADMIN PAGES ---
import Admin from './pages/Admin';
import AdminManagement from './pages/AdminManagement';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import InventoryManager from './pages/InventoryManager';
import ManualOrder from './pages/ManualOrder';
import OrderList from './pages/OrderList';
import ExpenseManagement from './pages/ExpenseManagement';
import InvestmentTracker from './pages/InvestmentTracker';
import CouponManagement from './pages/CouponManagement';
import BannerManagement from './pages/BannerManagement';

// --- CONTEXT ---
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './context/ToastContext';

const AppContent = () => {
  const location = useLocation();
  // Hide Navbar for any admin-related paths
  const isHideNavbar = location.pathname.startsWith('/admin') || location.pathname === '/admin-login';

  return (
    <>
      {!isHideNavbar && <Navbar onCartClick={() => console.log("Cart Open")} />}
      
      <div style={{ minHeight: '80vh' }}>
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
          
          {/* --- ADMIN ROUTES --- */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          >
            <Route index element={<AdminDashboard />} />
            <Route path="inventory" element={<InventoryManager />} />
            <Route path="manual-order" element={<ManualOrder />} />
            <Route path="order-list" element={<OrderList />} />
            <Route path="expenses" element={<ExpenseManagement />} />
            <Route path="investment" element={<InvestmentTracker />} />
            <Route path="coupons" element={<CouponManagement />} />
            <Route path="banners" element={<BannerManagement isAdmin={true} />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="logs" element={<ActivityLogs />} />
          </Route>

          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/account" element={<Account />} />
          <Route path="/manual-order" element={<ManualOrder />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/track/:orderId" element={<OrderTracking />} />
          <Route path="/track" element={<OrderTracking />} />
        </Routes>
      </div>
    </>
  );
};

function App() {
  return (
    <ToastProvider>
    <WishlistProvider>
      <Router>
        <AppContent />
        <footer style={footerStyle}>
          <p>&copy; 2026 OneElixir Fragrances. Crafted for Elegance.</p>
        </footer>
      </Router>
    </WishlistProvider>
    </ToastProvider>
  );
}

const footerStyle = {
  textAlign: 'center', padding: '40px 0', marginTop: '50px',
  fontSize: '12px', color: '#999', borderTop: '1px solid #eee'
};

export default App;