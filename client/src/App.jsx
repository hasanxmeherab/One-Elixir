import React, { Suspense, lazy, useEffect } from 'react'; 
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
//import { Analytics } from "@vercel/analytics/react";
//import { SpeedInsights } from '@vercel/speed-insights/react';

// --- PAGES ---
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import ThankYou from './pages/ThankYou';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Collection from './pages/Collection';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import Wishlist from './pages/Wishlist';
import OrderTracking from './pages/OrderTracking';
import Bundles from './pages/Bundles';

// --- COMPONENTS --- (#17 Navbar moved to components/)
import Navbar from './components/Navbar';
import MobileTabBar from './components/MobileTabBar';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import FloatingWhatsapp from './components/FloatingWhatsapp';

// --- #18 LAZY-LOADED ADMIN PAGES ---
const Admin = lazy(() => import('./pages/Admin'));
const AdminManagement = lazy(() => import('./pages/AdminManagement'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const InventoryManager = lazy(() => import('./pages/InventoryManager'));
const ManualOrder = lazy(() => import('./pages/ManualOrder'));
const OrderList = lazy(() => import('./pages/OrderList'));
const ExpenseManagement = lazy(() => import('./pages/ExpenseManagement'));
const InvestmentTracker = lazy(() => import('./pages/InvestmentTracker'));
const CouponManagement = lazy(() => import('./pages/CouponManagement'));
const BannerManagement = lazy(() => import('./pages/BannerManagement'));
const CustomerList = lazy(() => import('./pages/CustomerList'));
const CostCalculator = lazy(() => import('./pages/CostCalculator'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const AdminBundles = lazy(() => import('./pages/AdminBundles'));

// --- CONTEXT ---
import { WishlistProvider } from './context/WishlistContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastProvider } from './context/ToastContext';

const AppContent = () => {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  // Hide Navbar for any admin-related paths
  const isHideNavbar = location.pathname.startsWith('/admin') || location.pathname === '/admin-login';

  return (
    <>      {!isHideNavbar && <Navbar onCartClick={() => console.log("Cart Open")} />}
      
      <div style={{ minHeight: '80vh' }} className={!isHideNavbar ? 'pb-16 md:pb-0' : ''}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0', color: '#999', letterSpacing: '2px', fontSize: '13px' }}>Loading...</div>}>
        <div key={location.pathname} className="page-transition">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* --- ADMIN ROUTES (lazy-loaded) --- */}
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
            <Route path="customers" element={<CustomerList />} />
            <Route path="/admin/costs" element={<CostCalculator />} />
            <Route path="bundles" element={<AdminBundles />} />
          </Route>
          
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/account" element={<Account />} />
          <Route path="/manual-order" element={<ManualOrder />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/track/:orderId" element={<OrderTracking />} />
          <Route path="/track" element={<OrderTracking />} />
          <Route path="/bundles" element={<Bundles />} />
        </Routes>
        </div>
        </Suspense>
      </div>

      {!isHideNavbar && <MobileTabBar />}
    </>
  );
};

function App() {
  return (
    <>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <ToastProvider>
          <WishlistProvider>
          <FloatingWhatsapp />
            <Router>
              <ScrollToTop />
              <AppContent />
              <footer style={footerStyle}>
                <p>&copy; 2026 OneElixir Fragrances. Crafted for Elegance.</p>
              </footer>
            </Router>
          </WishlistProvider>
        </ToastProvider>
      </GoogleOAuthProvider>
      {/* <Analytics /> */}
      {/* <SpeedInsights /> */} 
    </>
  );
}

const footerStyle = {
  textAlign: 'center', padding: '40px 0', marginTop: '50px',
  fontSize: '12px', color: '#999', borderTop: '1px solid #eee'
};

export default App;