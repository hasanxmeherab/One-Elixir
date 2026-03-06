import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import adminAxios from '../utils/adminAxios';

const AdminNavbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [showBell, setShowBell]         = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchPendingCount = async () => {
    try {
      const res = await adminAxios.get(`${API_URL}/api/orders`);
      const count = res.data.filter(o =>
        o.status?.toLowerCase() === 'pending'
      ).length;
      // If count went up since last check, animate the bell
      setPendingCount(prev => {
        if (count > prev && prev !== 0) setShowBell(true);
        return count;
      });
    } catch (err) {
      console.error('Failed to fetch pending orders');
    }
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60000); // every 60s
    return () => clearInterval(interval);
  }, []);

  // Stop bell animation after 3s
  useEffect(() => {
    if (showBell) {
      const t = setTimeout(() => setShowBell(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showBell]);

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('adminRole');
    navigate('/admin-login');
  };

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-black text-white sticky top-0 z-[1000]">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden bg-transparent border-none text-white cursor-pointer flex items-center hover:opacity-70 transition-opacity"
          >
            <Menu size={22} />
          </button>
        )}
        <div className="font-bold tracking-md">
          ONEELIXIR{' '}
          <span className="text-label bg-white text-black px-1.5 py-0.5 ml-2.5 rounded-sm">
            ADMIN
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button
          onClick={() => navigate('/admin/order-list')}
          className={`relative bg-transparent border-none text-white cursor-pointer p-1 hover:opacity-70 transition-opacity ${showBell ? 'animate-bounce' : ''}`}
          title={`${pendingCount} pending order${pendingCount !== 1 ? 's' : ''}`}
        >
          <Bell size={18} />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-2xs font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="bg-transparent border border-white text-white px-4 py-1.5 cursor-pointer text-xs hover:bg-white hover:text-black transition-colors"
        >
          LOGOUT
        </button>
      </div>
    </nav>
  );
};

export default AdminNavbar;