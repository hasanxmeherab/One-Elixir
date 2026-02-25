import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useWishlist } from '../context/WishlistContext';
import { Eye, EyeOff, Check, X } from 'lucide-react'; 
import { useToast } from '../context/ToastContext';
import { GoogleLogin } from '@react-oauth/google';

const SignUp = () => {
  const toast = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useUser();
  const { reloadWishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const from = location.state?.from || '/';

  const strength = useMemo(() => {
    const pw = formData.password;
    if (!pw) return { score: 0, label: '', color: '#ddd' };
    let score = 0;
    if (pw.length > 6) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    switch (score) {
      case 1: return { score: 25, label: 'WEAK', color: '#ff4d4d' };
      case 2: return { score: 50, label: 'FAIR', color: '#ffa500' };
      case 3: return { score: 75, label: 'GOOD', color: '#2ecc71' };
      case 4: return { score: 100, label: 'STRONG', color: '#27ae60' };
      default: return { score: 10, label: 'VERY WEAK', color: '#ff4d4d' };
    }
  }, [formData.password]);

  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.confirmPassword && !passwordsMatch) {
      toast.error("Passwords do not match!");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/signup`, {
        name: formData.name,
        email: formData.email.toLowerCase(),
        password: formData.password
      });
      toast.success("Account created! Please verify your email to sign in.");
      navigate('/signin'); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, {
        credential: credentialResponse.credential
      });
      login(res.data);
      reloadWishlist();
      navigate(from, { replace: true });
    } catch (err) {
      toast.error('Google sign up failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[90vh] flex justify-center items-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-[400px] text-center p-10 border border-[#eee] bg-white">
        
        <h2 className="tracking-[5px] font-light mb-2.5">CREATE ACCOUNT</h2>
        <p className="text-[10px] text-[#888] mb-8 tracking-wider">Join the OneElixir inner circle</p>

        {/* Name */}
        <input
          type="text" placeholder="FULL NAME" required
          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
          className="w-full p-4 mb-4 border border-[#ddd] outline-none text-sm box-border"
        />

        {/* Email */}
        <input
          type="email" placeholder="EMAIL" required
          value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
          className="w-full p-4 mb-4 border border-[#ddd] outline-none text-sm box-border"
        />

        {/* Password */}
        <div className="relative w-full mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="PASSWORD" required
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
            className="w-full p-4 border border-[#ddd] outline-none text-sm box-border"
          />
          <div
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#888] flex items-center"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </div>
        </div>

        {/* Password Strength Meter */}
        {formData.password && (
          <div className="relative w-full h-1 bg-[#eee] mb-4 rounded-sm">
            <div
              className="h-full rounded-sm transition-all duration-400"
              style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
            />
            <span
              className="absolute right-0 top-1.5 text-[9px] font-bold tracking-wider"
              style={{ color: strength.color }}
            >
              {strength.label}
            </span>
          </div>
        )}

        {/* Confirm Password */}
        <div className="relative w-full mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="CONFIRM PASSWORD" required
            value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            className="w-full p-4 border border-[#ddd] outline-none text-sm box-border"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {formData.confirmPassword && (
              <span className={`flex ${passwordsMatch ? 'text-[#27ae60]' : 'text-[#ff4d4d]'}`}>
                {passwordsMatch ? <Check size={16} /> : <X size={16} />}
              </span>
            )}
            <div
              onClick={() => setShowPassword(!showPassword)}
              className="cursor-pointer text-[#888] flex items-center"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={(formData.confirmPassword && !passwordsMatch) || loading}
          className={`w-full p-4 text-white border-none cursor-pointer font-bold tracking-[2px] mt-2.5 transition-colors ${
            formData.confirmPassword && !passwordsMatch
              ? 'bg-[#888] cursor-not-allowed'
              : 'bg-black hover:bg-gray-800'
          }`}
        >
          {loading ? "SENDING EMAIL..." : "REGISTER"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#eee]"></div>
          <span className="text-[10px] text-[#bbb] tracking-wider">OR</span>
          <div className="flex-1 h-px bg-[#eee]"></div>
        </div>

        {/* Google Sign Up */}
        <div className="flex justify-center mb-5">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google sign up failed.')}
            theme="outline"
            shape="rectangular"
            width="280"
            text="signup_with"
          />
        </div>

        <p className="text-xs text-[#666]">
          Already have an account?{' '}
          <span
            onClick={() => navigate('/signin', { state: { from } })}
            className="underline cursor-pointer text-black font-bold hover:opacity-70 transition-opacity"
          >
            Sign In
          </span>
        </p>
      </form>
    </div>
  );
};

export default SignUp;