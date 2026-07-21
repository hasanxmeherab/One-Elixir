import React, { useState, useEffect, useRef, useCallback } from 'react';
import adminAxios from '../../utils/adminAxios';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useToast from '../../hooks/useToast';
import ToastContainer from '../../components/ToastContainer';

const LINKS = [
  { to: '/admin', label: 'DASHBOARD', icon: '▦' },
  { to: '/admin/inventory', label: 'INVENTORY', icon: '📦' },
  { to: '/admin/manual-order', label: 'MANUAL ORDER', icon: '✏️' },
  { to: '/admin/order-list', label: 'ORDER LIST', icon: '🧾' },
  { to: '/admin/customers', label: 'CUSTOMERS', icon: '👥' },
  { to: '/admin/expenses', label: 'EXPENSES', icon: '💸' },
  { to: '/admin/investment', label: 'INVESTMENT', icon: '📈' },
  { to: '/admin/coupons', label: 'COUPONS', icon: '🏷️' },
  { to: '/admin/banners', label: 'BANNERS', icon: '🖼️' },
  { to: '/admin/bundles', label: 'BUNDLES', icon: '🎁' },
  { to: '/admin/logs', label: 'ACTIVITY LOGS', icon: '📋' },
  { to: '/admin/costs', label: 'COST CALCULATION', icon: '🧮' },
  { to: '/admin/settlements', label: 'SETTLEMENTS', icon: '💰' },
  { to: '/admin/admins', label: 'ADMIN MANAGEMENT', icon: '🔐' },
];

const SEEN_KEY = 'admin_seen_order_ids';
const getSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } };
const saveSeen = (set) => localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));

const Admin = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Global toast notifications ──
  const { toasts, toast, dismiss } = useToast();

  // ── Order bell notification state ──
  const [unreadOrders, setUnreadOrders] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [toastNotifs, setToastNotifs] = useState([]);
  const bellRef = useRef(null);
  const prevOrderIdsRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = useCallback(async () => {
    try {
      const [pRes, oRes, iRes] = await Promise.all([
        adminAxios.get(`${API_URL}/api/perfumes`),
        adminAxios.get(`${API_URL}/api/orders`),
        adminAxios.get(`${API_URL}/api/investments`),
      ]);
      setPerfumes(pRes.data);
      setOrders(oRes.data);
      setInvestments(iRes.data);
    } catch (err) { console.error('Fetch failed', err); }
  }, [API_URL]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // ── Compute unread orders whenever orders change ──
  useEffect(() => {
    if (!orders.length) return;
    const seen = getSeen();
    const currentIds = new Set(orders.map(o => o._id));

    // Detect brand-new orders (not in previous poll) for toast
    if (prevOrderIdsRef.current !== null) {
      const brandNew = orders.filter(o =>
        !prevOrderIdsRef.current.has(o._id) && !seen.has(o._id)
      );
      if (brandNew.length > 0) {
        setToastNotifs(prev => [...prev, ...brandNew.map(o => ({ ...o, _toastId: Date.now() + Math.random() }))]);
      }
    }
    prevOrderIdsRef.current = currentIds;

    // Compute unread list
    const unread = orders.filter(o => !seen.has(o._id));
    setUnreadOrders(unread);
  }, [orders]);

  // ── Poll every 30s ──
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Auto-dismiss toast after 6s ──
  useEffect(() => {
    if (toastNotifs.length === 0) return;
    const timer = setTimeout(() => {
      setToastNotifs(prev => prev.slice(1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toastNotifs]);

  // ── Close bell dropdown on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Mark one as read ──
  const dismissOrder = (orderId) => {
    const seen = getSeen();
    seen.add(orderId);
    saveSeen(seen);
    setUnreadOrders(prev => prev.filter(o => o._id !== orderId));
  };

  // ── Mark all as read ──
  const markAllRead = () => {
    const seen = getSeen();
    unreadOrders.forEach(o => seen.add(o._id));
    saveSeen(seen);
    setUnreadOrders([]);
    setBellOpen(false);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin-login');
  };

  const isActive = (path) => location.pathname === path;
  const currentPage = LINKS.find(l => isActive(l.to))?.label || 'ADMIN';

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Top Navbar ── */}
      <nav className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-black text-white sticky top-0 z-[1000]">
        <div className="flex items-center gap-3">
          {/* Hamburger */}
          <button
            className="flex flex-col gap-1.5 p-1 bg-transparent border-none cursor-pointer"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${sidebarOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${sidebarOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${sidebarOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
          <Link to="/admin" className="flex items-center gap-2 no-underline">
            <img src="/logos/OneElixir Name(Sg).png" alt="OneElixir" className="h-8 md:h-10 w-auto" />
            <span className="text-[9px] bg-white text-black px-1.5 py-0.5 rounded-sm hidden md:inline">ADMIN</span>
          </Link>
          {/* Current page — mobile only */}
          <span className="md:hidden text-[10px] text-gray-400 tracking-wider">/ {currentPage}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* ── Notification Bell ── */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen(o => !o)}
              className="relative bg-transparent border-none cursor-pointer p-1.5 hover:opacity-80 transition-opacity"
              aria-label="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadOrders.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadOrders.length > 99 ? '99+' : unreadOrders.length}
                </span>
              )}
            </button>

            {/* ── Dropdown ── */}
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-[320px] bg-white text-black border border-[#eee] shadow-2xl z-[2000] max-h-[420px] flex flex-col"
                style={{ animation: 'fadeSlideIn 0.15s ease-out' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#eee] bg-[#fafafa]">
                  <span className="text-[10px] font-bold tracking-[2px] text-[#888]">
                    NOTIFICATIONS ({unreadOrders.length})
                  </span>
                  {unreadOrders.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] font-bold tracking-wider text-emerald-600 bg-transparent border-none cursor-pointer hover:underline"
                    >
                      ✓ MARK ALL READ
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {unreadOrders.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-[32px] mb-2">🔔</p>
                      <p className="text-[11px] text-[#aaa] tracking-wider">No new notifications</p>
                    </div>
                  ) : (
                    unreadOrders.slice(0, 20).map(order => (
                      <div key={order._id} className="flex items-start gap-3 px-4 py-3 border-b border-[#f5f5f5] hover:bg-[#f9f9f9] transition-colors group">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-sm">🛒</span>
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { navigate('/admin/order-list'); dismissOrder(order._id); setBellOpen(false); }}>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-bold text-emerald-700 tracking-wider m-0">NEW ORDER!</p>
                            <span className="text-[16px] animate-bounce">🔔</span>
                          </div>
                          <p className="text-[12px] font-bold m-0 mt-0.5 truncate">{order.customerName}</p>
                          <p className="text-[10px] text-[#888] m-0 mt-0.5">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} · {Number(order.totalAmount || 0).toLocaleString()} TK
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissOrder(order._id); }}
                          className="text-[#ccc] hover:text-[#888] bg-transparent border-none cursor-pointer text-sm p-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {unreadOrders.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-[#eee] bg-[#fafafa]">
                    <button
                      onClick={() => { navigate('/admin/order-list'); setBellOpen(false); }}
                      className="w-full text-center text-[10px] font-bold tracking-wider text-black bg-transparent border-none cursor-pointer hover:underline py-1"
                    >
                      VIEW ALL ORDERS →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={handleAdminLogout}
            className="bg-transparent border border-white text-white px-2 md:px-3 py-1 cursor-pointer text-[10px] md:text-xs tracking-wider hover:bg-white hover:text-black transition-colors">
            LOGOUT
          </button>
        </div>
      </nav>

      {/* ── Global toast system ── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex flex-1 relative">
        {/* ── Overlay ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        <aside className={`
          fixed top-0 left-0 h-full w-[260px] bg-[#f9f9f9] border-r border-[#eee]
          flex flex-col pt-[56px] md:pt-[64px] pb-6
          z-50 transition-transform duration-300 shadow-xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="px-4 pt-6 pb-2">
            <p className="text-[10px] tracking-[2px] text-[#bbb] font-bold mb-4 px-2">COMMAND CENTER</p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3">
            {LINKS.map(({ to, label, icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-3 text-xs font-bold tracking-wider px-3 py-3 no-underline transition-colors rounded mb-0.5 ${isActive(to) ? 'bg-black text-white' : 'text-[#555] hover:text-black hover:bg-[#eee]'
                  }`}>
                <span className="text-base w-5 text-center">{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="px-3 pt-3 border-t border-[#eee]">
            <button onClick={handleAdminLogout}
              className="w-full flex items-center gap-3 text-xs font-bold tracking-wider px-3 py-3 bg-white border border-red-100 text-red-600 rounded cursor-pointer text-left hover:bg-red-50 transition-colors">
              <span className="text-base w-5 text-center">🚪</span>
              LOGOUT SYSTEM
            </button>
          </div>
        </aside>

        {/* ── Page Content ── */}
        <main className="flex-1 p-4 md:p-10 bg-white overflow-x-auto min-w-0 w-full">
          <Outlet context={{ perfumes, orders, investments, fetchData, toast }} />
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black text-white z-[999] border-t border-[#333]">
        <div className="grid grid-cols-5 h-14">
          {[
            { to: '/admin', icon: '▦', label: 'Home' },
            { to: '/admin/order-list', icon: '🧾', label: 'Orders' },
            { to: '/admin/inventory', icon: '📦', label: 'Stock' },
            { to: '/admin/customers', icon: '👥', label: 'Clients' },
            { to: '/admin/costs', icon: '🧮', label: 'Costs' },
          ].map(({ to, icon, label }) => (
            <Link key={to} to={to}
              className={`flex flex-col items-center justify-center gap-0.5 no-underline transition-colors ${isActive(to) ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'
                }`}>
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[8px] tracking-wider font-bold">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom nav spacer on mobile */}
      <div className="md:hidden h-14" />

      {/* ── Notification animations ── */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Admin;