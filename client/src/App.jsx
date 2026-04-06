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

// --- COMPONENTS ---
import Navbar from './components/Navbar';
import MobileTabBar from './components/MobileTabBar';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import FloatingWhatsapp from './components/FloatingWhatsapp';
import Footer from './components/Footer';
import CartRecovery from './components/CartRecovery';

// --- #18 LAZY-LOADED ADMIN PAGES ---
const Admin = lazy(() => import('./pages/admin/Admin'));
const AdminManagement = lazy(() => import('./pages/admin/AdminManagement'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const InventoryManager = lazy(() => import('./pages/admin/InventoryManager'));
const ManualOrder = lazy(() => import('./pages/admin/ManualOrder'));
const OrderList = lazy(() => import('./pages/admin/OrderList'));
const ExpenseManagement = lazy(() => import('./pages/admin/ExpenseManagement'));
const InvestmentTracker = lazy(() => import('./pages/admin/InvestmentTracker'));
const CouponManagement = lazy(() => import('./pages/admin/CouponManagement'));
const BannerManagement = lazy(() => import('./pages/admin/BannerManagement'));
const CustomerList = lazy(() => import('./pages/admin/CustomerList'));
const CostCalculator = lazy(() => import('./pages/admin/CostCalculator'));
const ActivityLogs = lazy(() => import('./pages/admin/ActivityLogs'));
const AdminBundles = lazy(() => import('./pages/admin/AdminBundles'));

// --- CONTEXT ---
import { WishlistProvider } from './context/WishlistContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastProvider } from './context/ToastContext';
import { ComparisonProvider } from './context/ComparisonContext';

// --- MODALS ---
import ComparisonModal from './components/ComparisonModal';

// --- HOOKS ---
import { useCartAbandonment } from './hooks/useCartAbandonment';

const AppContent = () => {
  const location = useLocation();
  const [showComparison, setShowComparison] = React.useState(false);
  
  // ✅ FEATURE #5: Track cart abandonment
  useCartAbandonment();

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
          <Route path="/recover" element={<CartRecovery />} />
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
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/track/:orderId" element={<OrderTracking />} />
          <Route path="/track" element={<OrderTracking />} />
          <Route path="/bundles" element={<Bundles />} />
          <Route path="*" element={
            <div style={{ textAlign: 'center', padding: '120px 20px', minHeight: '60vh' }}>
              <h1 style={{ fontSize: '72px', fontWeight: 200, letterSpacing: '8px', marginBottom: '16px' }}>404</h1>
              <p style={{ fontSize: '12px', letterSpacing: '3px', color: '#888', marginBottom: '32px' }}>PAGE NOT FOUND</p>
              <a href="/" style={{ background: '#000', color: '#fff', padding: '14px 36px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px' }}>BACK TO HOME</a>
            </div>
          } />
        </Routes>
        </div>
        </Suspense>
      </div>

      {!isHideNavbar && <MobileTabBar />}
      
      {/* ✅ FEATURE #3: Comparison Modal */}
      <ComparisonModal isOpen={showComparison} onClose={() => setShowComparison(false)} />
      
      {/* ✅ FEATURE #3: Floating Comparison Button */}
      {!isHideNavbar && (
        <button
          onClick={() => setShowComparison(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 z-30"
          title="Open product comparison"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18" />
          </svg>
        </button>
      )}
    </>
  );
};

function App() {
  return (
    <>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <ToastProvider>
          <WishlistProvider>
            {/* ✅ FEATURE #3: Comparison Provider */}
            <ComparisonProvider>
              <FloatingWhatsapp />

              <Router>
                <ScrollToTop />
                <AppContent />
                <Footer />
              </Router>
            </ComparisonProvider>
          </WishlistProvider>
        </ToastProvider>
      </GoogleOAuthProvider>
      {/* <Analytics /> */}
      {/* <SpeedInsights /> */} 
    </>
  );
}

export default App;