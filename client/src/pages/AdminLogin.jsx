import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/admins/login`, { email, password });
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      localStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin');
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 pt-24 pb-20 text-center">
      <h2 className="tracking-[4px] text-xl font-bold mb-2">ONEELIXIR COMMAND CENTER</h2>
      <p className="text-xs text-[#888] mb-8">ADMINISTRATOR AUTHENTICATION</p>

      <form onSubmit={handleLogin} className="max-w-[400px] mx-auto">
        <input
          type="email" placeholder="Admin Email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 border border-[#ddd] outline-none text-sm box-border"
        />
        <input
          type="password" placeholder="Password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 border border-[#ddd] outline-none text-sm box-border mt-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="block w-full mt-5 px-8 py-4 bg-black text-white border-none cursor-pointer font-bold tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {loading ? 'VERIFYING...' : 'ACCESS DASHBOARD'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;