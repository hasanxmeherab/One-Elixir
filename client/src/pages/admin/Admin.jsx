import React, { useState, useEffect } from 'react';
import adminAxios from '../../utils/adminAxios';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const LINKS = [
  { to: '/admin',              label: 'DASHBOARD',       icon: '▦' },
  { to: '/admin/inventory',    label: 'INVENTORY',       icon: '📦' },
  { to: '/admin/manual-order', label: 'MANUAL ORDER',    icon: '✏️' },
  { to: '/admin/order-list',   label: 'ORDER LIST',      icon: '🧾' },
  { to: '/admin/customers',    label: 'CUSTOMERS',       icon: '👥' },
  { to: '/admin/expenses',     label: 'EXPENSES',        icon: '💸' },
  { to: '/admin/investment',   label: 'INVESTMENT',      icon: '📈' },
  { to: '/admin/coupons',      label: 'COUPONS',         icon: '🏷️' },
  { to: '/admin/banners',      label: 'BANNERS',         icon: '🖼️' },
  { to: '/admin/bundles',      label: 'BUNDLES',         icon: '🎁' },
  { to: '/admin/logs',         label: 'ACTIVITY LOGS',   icon: '📋' },
  { to: '/admin/costs',        label: 'COST CALCULATION',icon: '🧮' },
  { to: '/admin/admins',       label: 'ADMIN MANAGEMENT',icon: '🔐' },
];

const Admin = () => {
  const [perfumes, setPerfumes]       = useState([]);
  const [orders, setOrders]           = useState([]);
  const [investments, setInvestments] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const API_URL  = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
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
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleAdminLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin-login');
  };

  const isActive = (path) => location.pathname === path;

  // Current page label for mobile header
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
          <div className="font-bold tracking-[3px] text-xs md:text-sm">
            ONEELIXIR
            <span className="text-[9px] bg-white text-black px-1.5 py-0.5 ml-2 rounded-sm hidden md:inline">ADMIN</span>
          </div>
          {/* Current page — mobile only */}
          <span className="md:hidden text-[10px] text-gray-400 tracking-wider">/ {currentPage}</span>
        </div>
        <button onClick={handleAdminLogout}
          className="bg-transparent border border-white text-white px-2 md:px-3 py-1 cursor-pointer text-[10px] md:text-xs tracking-wider hover:bg-white hover:text-black transition-colors">
          LOGOUT
        </button>
      </nav>

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
                className={`flex items-center gap-3 text-xs font-bold tracking-wider px-3 py-3 no-underline transition-colors rounded mb-0.5 ${
                  isActive(to) ? 'bg-black text-white' : 'text-[#555] hover:text-black hover:bg-[#eee]'
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
          <Outlet context={{ perfumes, orders, investments, fetchData }} />
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black text-white z-[999] border-t border-[#333]">
        <div className="grid grid-cols-5 h-14">
          {[
            { to: '/admin',            icon: '▦',  label: 'Home'    },
            { to: '/admin/order-list', icon: '🧾', label: 'Orders'  },
            { to: '/admin/inventory',  icon: '📦', label: 'Stock'   },
            { to: '/admin/customers',  icon: '👥', label: 'Clients' },
            { to: '/admin/costs',      icon: '🧮', label: 'Costs'   },
          ].map(({ to, icon, label }) => (
            <Link key={to} to={to}
              className={`flex flex-col items-center justify-center gap-0.5 no-underline transition-colors ${
                isActive(to) ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'
              }`}>
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[8px] tracking-wider font-bold">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom nav spacer on mobile */}
      <div className="md:hidden h-14" />
    </div>
  );
};

export default Admin;