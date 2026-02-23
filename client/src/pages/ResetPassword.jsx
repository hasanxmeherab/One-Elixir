import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const ResetPassword = () => {
  const toast = useToast();
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password/${token}`, { password });
      toast.success("Password updated! Redirecting to sign in...");
      navigate('/signin');
    } catch (err) {
      toast.error("Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[80vh] flex justify-center items-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-[400px] text-center p-12 border border-[#eee]">
        <h2 className="tracking-[5px] font-light mb-5">NEW PASSWORD</h2>
        <input
          type="password" placeholder="NEW PASSWORD" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 mb-4 border border-[#ddd] outline-none text-sm box-border"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full p-4 bg-black text-white border-none cursor-pointer font-bold tracking-[2px] hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {loading ? "UPDATING..." : "UPDATE PASSWORD"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;