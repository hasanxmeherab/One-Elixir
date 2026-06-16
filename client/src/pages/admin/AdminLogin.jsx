import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { useToast } from '../../context/ToastContext';

const AdminLogin = () => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // ── Password change state ──
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/admins/login`, { email, password });

      // Check if password change is required
      if (res.data.mustChangePassword) {
        setTempToken(res.data.accessToken);
        localStorage.setItem('adminToken', res.data.accessToken);
        localStorage.setItem('adminRefreshToken', res.data.refreshToken);
        setCurrentPass(password); // remember current password for verification
        setMustChangePassword(true);
        toast.warning('You must set a new password before continuing.');
        return;
      }

      // Normal login
      localStorage.setItem('adminToken', res.data.accessToken);
      localStorage.setItem('adminRefreshToken', res.data.refreshToken);
      localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      localStorage.setItem('adminRole', res.data.admin.role);
      localStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) return toast.warning('New password must be at least 6 characters.');
    if (newPass !== confirmPass) return toast.warning('Passwords do not match.');
    if (newPass === currentPass) return toast.warning('New password must be different from the current one.');

    setChangingPass(true);
    try {
      await adminAxios.post(`${API_URL}/api/admins/change-password`, {
        currentPassword: currentPass,
        newPassword: newPass,
      });

      toast.success('Password updated! Logging you in...');

      // Re-login with new password to get fresh tokens
      const res = await axios.post(`${API_URL}/api/admins/login`, { email, password: newPass });
      localStorage.setItem('adminToken', res.data.accessToken);
      localStorage.setItem('adminRefreshToken', res.data.refreshToken);
      localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      localStorage.setItem('adminRole', res.data.admin.role);
      localStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  // ── Password Change Screen ──
  if (mustChangePassword) {
    return (
      <div className="px-5 pt-24 pb-20 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-5">
          <span className="text-2xl">🔐</span>
        </div>
        <h2 className="tracking-[4px] text-xl font-bold mb-2">SET NEW PASSWORD</h2>
        <p className="text-xs text-[#888] mb-2">Welcome! Your account requires a password change.</p>
        <p className="text-[11px] text-[#aaa] mb-8">Please choose a secure password that you'll remember.</p>

        <form onSubmit={handleChangePassword} className="max-w-[400px] mx-auto text-left">
          <label className="block text-[10px] font-bold tracking-[2px] text-[#888] mb-2">NEW PASSWORD</label>
          <input
            type="password" placeholder="Min. 6 characters" required minLength={6}
            value={newPass} onChange={(e) => setNewPass(e.target.value)}
            className="w-full p-4 border border-[#ddd] outline-none text-sm box-border"
          />
          <label className="block text-[10px] font-bold tracking-[2px] text-[#888] mb-2 mt-4">CONFIRM PASSWORD</label>
          <input
            type="password" placeholder="Re-enter new password" required minLength={6}
            value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
            className="w-full p-4 border border-[#ddd] outline-none text-sm box-border"
          />
          {newPass && confirmPass && newPass !== confirmPass && (
            <p className="text-[11px] text-red-500 mt-2">⚠ Passwords do not match</p>
          )}
          <button
            type="submit"
            disabled={changingPass || !newPass || !confirmPass || newPass !== confirmPass}
            className="block w-full mt-5 px-8 py-4 bg-black text-white border-none cursor-pointer font-bold tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {changingPass ? 'UPDATING...' : 'SET PASSWORD & CONTINUE'}
          </button>
        </form>
      </div>
    );
  }

  // ── Login Screen ──
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