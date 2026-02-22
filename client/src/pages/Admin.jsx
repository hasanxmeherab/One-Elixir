import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import { X } from 'lucide-react';

const Admin = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      const pRes = await axios.get(`${API_URL}/api/perfumes`);
      const oRes = await axios.get(`${API_URL}/api/orders`);
      const iRes = await axios.get(`${API_URL}/api/investments`);
      setPerfumes(pRes.data);
      setOrders(oRes.data);
      setInvestments(iRes.data);
    } catch (err) { console.error("Fetch failed", err); }
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

  const linkClass = (path) =>
    `no-underline text-left px-4 py-3 text-xs font-bold tracking-wider block transition-colors duration-200 rounded ${
      isActive(path)
        ? 'bg-black text-white'
        : 'bg-transparent text-[#555] hover:bg-gray-100'
    }`;

  const navLinks = [
    { to: '/admin', label: 'DASHBOARD' },
    { to: '/admin/inventory', label: 'INVENTORY' },
    { to: '/admin/manual-order', label: 'MANUAL ORDER' },
    { to: '/admin/order-list', label: 'ORDER LIST' },
    { to: '/admin/expenses', label: 'EXPENSES' },
    { to: '/admin/investment', label: 'INVESTMENT' },
    { to: '/admin/admins', label: 'ADMIN MANAGEMENT' },
    { to: '/admin/coupons', label: 'COUPONS' },
    { to: '/admin/banners', label: 'BANNERS' },
  ];

  const SidebarLinks = () => (
    <>
      <p className="text-[10px] tracking-[2px] text-[#888] font-bold mb-5 pl-2.5">
        COMMAND CENTER
      </p>
      <div className="flex flex-col gap-1 flex-1">
        {navLinks.map(link => (
          <Link key={link.to} to={link.to} className={linkClass(link.to)}>
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={handleAdminLogout}
        className="text-center px-4 py-3 text-xs font-bold tracking-wider text-[#991b1b] bg-white border border-[#fee2e2] rounded cursor-pointer hover:bg-[#fee2e2] transition-colors w-full mt-4"
      >
        LOGOUT SYSTEM
      </button>
    </>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Pass hamburger handler to navbar */}
      <AdminNavbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1">

        {/* DESKTOP SIDEBAR */}
        <div className="hidden lg:flex flex-col w-[260px] shrink-0 bg-[#f9f9f9] border-r border-[#eee] px-4 py-8">
          <SidebarLinks />
        </div>

        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[1400]"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed top-0 left-0 h-full w-[260px] bg-[#f9f9f9] border-r border-[#eee] px-4 py-8 flex flex-col z-[1500]">
              <button
                onClick={() => setSidebarOpen(false)}
                className="self-end mb-4 text-gray-500 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
              <SidebarLinks />
            </div>
          </>
        )}

        {/* MAIN CONTENT */}
        <div className="flex-1 p-5 md:p-10 bg-white overflow-auto min-w-0">
          <Outlet context={{ perfumes, orders, investments, fetchData }} />
        </div>
      </div>
    </div>
  );
};

export default Admin;