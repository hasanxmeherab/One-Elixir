import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';

const Admin = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [investments, setInvestments] = useState([]);
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
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  return (
    <div className="flex flex-col min-h-screen">
      <AdminNavbar />

      <div className="flex flex-1">
        {/* SIDEBAR */}
        <div className="w-[260px] bg-[#f9f9f9] border-r border-[#eee] px-4 py-8 flex flex-col gap-1 shrink-0">
          <p className="text-[10px] tracking-[2px] text-[#888] font-bold mb-5 pl-2.5">
            COMMAND CENTER
          </p>

          <Link to="/admin" className={linkClass('/admin')}>DASHBOARD</Link>
          <Link to="/admin/inventory" className={linkClass('/admin/inventory')}>INVENTORY</Link>
          <Link to="/admin/manual-order" className={linkClass('/admin/manual-order')}>MANUAL ORDER</Link>
          <Link to="/admin/order-list" className={linkClass('/admin/order-list')}>ORDER LIST</Link>
          <Link to="/admin/expenses" className={linkClass('/admin/expenses')}>EXPENSES</Link>
          <Link to="/admin/investment" className={linkClass('/admin/investment')}>INVESTMENT</Link>
          <Link to="/admin/admins" className={linkClass('/admin/admins')}>ADMIN MANAGEMENT</Link>
          <Link to="/admin/coupons" className={linkClass('/admin/coupons')}>COUPONS</Link>
          <Link to="/admin/banners" className={linkClass('/admin/banners')}>BANNERS</Link>

          {/* Logout at bottom */}
          <button
            onClick={handleAdminLogout}
            className="mt-auto text-center px-4 py-3 text-xs font-bold tracking-wider text-[#991b1b] bg-white border border-[#fee2e2] rounded cursor-pointer hover:bg-[#fee2e2] transition-colors"
          >
            LOGOUT SYSTEM
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-10 bg-white overflow-auto">
          <Outlet context={{ perfumes, orders, investments, fetchData }} />
        </div>
      </div>
    </div>
  );
};

export default Admin;