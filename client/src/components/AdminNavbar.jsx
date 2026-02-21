import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    navigate('/admin-login');
  };

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-black text-white sticky top-0 z-[1000]">
      <div className="font-bold tracking-[3px]">
        ONEELIXIR{' '}
        <span className="text-[10px] bg-white text-black px-1.5 py-0.5 ml-2.5 rounded-sm">
          ADMIN
        </span>
      </div>
      <button
        onClick={handleLogout}
        className="bg-transparent border border-white text-white px-4 py-1.5 cursor-pointer text-xs hover:bg-white hover:text-black transition-colors"
      >
        LOGOUT
      </button>
    </nav>
  );
};

export default AdminNavbar;