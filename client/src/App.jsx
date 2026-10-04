import React, { Suspense, lazy, useEffect } from 'react'; 
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from '@vercel/speed-insights/react';

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
import NotFound from './pages/NotFound';
import { PageFallbackSkeleton } from './components/Skeleton';

// --- COMPONENTS ---
import Navbar from './components/Navbar';
import MobileTabBar from './components/MobileTabBar';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import FloatingWhatsapp from './components/FloatingWhatsapp';
import Footer from './components/Footer';

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
const SettlementDashboard = lazy(() => import('./pages/admin/SettlementDashboard'));

// --- CONTEXT ---
import { WishlistProvider } from './context/WishlistContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastProvider } from './context/ToastContext';

// --- MODALS ---

const AppContent = () => {
  const location = useLocation();
  
  // Scroll to top on route change
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  // Hide Navbar for any admin-related paths
  const isHideNavbar = location.pathname.startsWith('/admin') || location.pathname === '/admin-login';

  return (
    <>      {!isHideNavbar && <Navbar onCartClick={() => console.log("Cart Open")} />}
      
      <div style={{ minHeight: '80vh' }} className={!isHideNavbar ? 'pb-16 md:pb-0' : ''}>
        <Suspense fallback={<PageFallbackSkeleton />}>
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
            <Route path="settlements" element={<SettlementDashboard />} />
          </Route>
          
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/account" element={<Account />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/track/:orderId" element={<OrderTracking />} />
          <Route path="/track" element={<OrderTracking />} />
          <Route path="/bundles" element={<Bundles />} />
          <Route path="*" element={<NotFound />} />
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
              <Footer />
            </Router>
          </WishlistProvider>
        </ToastProvider>
      </GoogleOAuthProvider>
      {/* ⚡ Vercel Analytics & Speed Insights (self-defer, non-blocking) */}
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;