import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Eye, EyeOff } from 'lucide-react';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/signin`, { 
        email: email.toLowerCase(), 
        password 
      });
      login(res.data);
      navigate(from, { replace: true });
    } catch (err) {
      alert("Invalid email or password.");
    }
  };

  return (
    <div className="h-[85vh] flex justify-center items-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-[350px] text-center p-10 border border-[#eee] bg-white">
        
        <h2 className="tracking-[5px] font-light mb-2.5">SIGN IN</h2>
        <p className="text-[10px] text-[#888] mb-8">Welcome back to OneElixir.</p>

        {/* Email */}
        <input
          type="email" placeholder="EMAIL" required
          value={email} onChange={e => setEmail(e.target.value)}
          className="w-full p-4 mb-4 border border-[#ddd] outline-none box-border text-sm"
        />

        {/* Password with Eye Toggle */}
        <div className="relative w-full mb-2.5">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="PASSWORD" required
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full p-4 border border-[#ddd] outline-none box-border text-sm"
          />
          <div
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#888] flex items-center"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </div>
        </div>

        {/* Forgot Password */}
        <div className="w-full text-right mb-5">
          <span
            onClick={() => navigate('/forgot-password')}
            className="text-[10px] text-[#888] cursor-pointer tracking-wider uppercase hover:text-black transition-colors"
          >
            Forgot Password?
          </span>
        </div>

        <button
          type="submit"
          className="w-full p-4 bg-black text-white border-none cursor-pointer font-bold tracking-[2px] hover:bg-gray-800 transition-colors"
        >
          LOGIN
        </button>

        <p className="text-xs mt-5 text-[#666]">
          Don't have an account?{' '}
          <span
            onClick={() => navigate('/signup', { state: { from } })}
            className="underline cursor-pointer text-black font-bold hover:opacity-70 transition-opacity"
          >
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
};

export default SignIn;