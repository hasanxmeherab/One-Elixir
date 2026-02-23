import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const ForgotPassword = () => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email: email.toLowerCase() });
      setMessage("A reset link has been sent to your email.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[80vh] flex justify-center items-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-[400px] text-center p-12 border border-[#eee]">
        <h2 className="tracking-[5px] font-light mb-5">RESET PASSWORD</h2>
        <input
          type="email" placeholder="EMAIL ADDRESS" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 mb-4 border border-[#ddd] outline-none text-sm box-border"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full p-4 bg-black text-white border-none cursor-pointer font-bold tracking-[2px] hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {loading ? "SENDING..." : "SEND RESET LINK"}
        </button>
        {message && (
          <p className="text-green-600 text-xs mt-4">{message}</p>
        )}
      </form>
    </div>
  );
};

export default ForgotPassword;