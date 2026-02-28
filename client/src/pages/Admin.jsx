import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';

const LINKS = [
  { to: '/admin',              label: 'DASHBOARD' },
  { to: '/admin/inventory',    label: 'INVENTORY' },
  { to: '/admin/manual-order', label: 'MANUAL ORDER' },
  { to: '/admin/order-list',   label: 'ORDER LIST' },
  { to: '/admin/customers',    label: 'CUSTOMERS' },
  { to: '/admin/expenses',     label: 'EXPENSES' },
  { to: '/admin/investment',   label: 'INVESTMENT' },
  { to: '/admin/coupons',      label: 'COUPONS' },
  { to: '/admin/banners',      label: 'BANNERS' },
  { to: '/admin/logs',         label: 'ACTIVITY LOGS' },
  { to: '/admin/admins',       label: 'ADMIN MANAGEMENT' },
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
        axios.get(`${API_URL}/api/perfumes`),
        axios.get(`${API_URL}/api/orders`),
        axios.get(`${API_URL}/api/investments`),
      ]);
      setPerfumes(pRes.data);
      setOrders(oRes.data);
      setInvestments(iRes.data);
    } catch (err) { console.error('Fetch failed', err); }
  };

  useEffect(() => { fetchData(); }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleAdminLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin-login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Navbar with hamburger ── */}
      <nav className="flex items-center justify-between px-6 py-4 bg-black text-white sticky top-0 z-[1000]">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only, on the LEFT */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-1 bg-transparent border-none cursor-pointer"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${sidebarOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${sidebarOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${sidebarOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
          <div className="font-bold tracking-[3px] text-sm">
            ONEELIXIR <span className="text-[10px] bg-white text-black px-1.5 py-0.5 ml-2 rounded-sm">ADMIN</span>
          </div>
        </div>
        <button onClick={handleAdminLogout}
          className="bg-transparent border border-white text-white px-3 py-1 cursor-pointer text-xs tracking-wider hover:bg-white hover:text-black transition-colors">
          LOGOUT
        </button>
      </nav>

      <div className="flex flex-1 relative">
        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        <aside className={`
          fixed md:static top-0 left-0 h-full md:h-auto
          w-[260px] bg-[#f9f9f9] border-r border-[#eee]
          flex flex-col gap-1 pt-[70px] md:pt-[30px] px-4 pb-8
          z-50 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}>
          <p className="text-[10px] tracking-[2px] text-[#888] font-bold mb-5 pl-2.5">COMMAND CENTER</p>

          {LINKS.map(({ to, label }) => (
            <Link key={to} to={to}
              className={`text-xs font-bold tracking-wider px-3 py-3 no-underline transition-colors block ${
                isActive(to) ? 'bg-black text-white rounded' : 'text-[#555] hover:text-black hover:bg-[#eee] rounded'
              }`}>
              {label}
            </Link>
          ))}

          <button onClick={handleAdminLogout}
            className="mt-auto text-xs font-bold tracking-wider px-3 py-3 bg-white border border-[#fee2e2] text-red-800 rounded cursor-pointer text-left hover:bg-red-50 transition-colors">
            LOGOUT SYSTEM
          </button>
        </aside>

        {/* ── Page Content ── */}
        <main className="flex-1 p-5 md:p-10 bg-white overflow-x-auto min-w-0">
          <Outlet context={{ perfumes, orders, investments, fetchData }} />
        </main>
      </div>
    </div>
  );
};

export default Admin;