import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Eye, EyeOff, Check, X } from 'lucide-react'; 

const SignUp = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const from = location.state?.from || '/';

  // --- Password Strength Logic ---
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

  // --- Match Indicator Logic ---
  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.confirmPassword && !passwordsMatch) {
      alert("Passwords do not match!");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/auth/signup`, {
        name: formData.name,
        email: formData.email.toLowerCase(),
        password: formData.password
      });
      login(res.data);
      navigate(from, { replace: true });
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div style={container}>
      <form onSubmit={handleSubmit} style={signUpBox}>
        <h2 style={title}>CREATE ACCOUNT</h2>
        <p style={subtitle}>Join the OneElixir inner circle</p>
        
        <input 
          type="text" placeholder="FULL NAME" required
          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
          style={inputStyle} 
        />
        <input 
          type="email" placeholder="EMAIL" required
          value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
          style={inputStyle} 
        />
        
        {/* Main Password Group */}
        <div style={passwordWrapper}>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="PASSWORD" required
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
            style={passwordInput} 
          />
          <div onClick={() => setShowPassword(!showPassword)} style={iconStyle}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </div>
        </div>

        {/* Strength Meter Bar */}
        {formData.password && (
          <div style={meterContainer}>
            <div style={{ ...meterBar, width: `${strength.score}%`, backgroundColor: strength.color }}></div>
            <span style={{ ...strengthText, color: strength.color }}>{strength.label}</span>
          </div>
        )}

        {/* Confirm Password Group - CLEANED UP */}
        <div style={passwordWrapper}>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="CONFIRM PASSWORD" required
            value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
            style={passwordInput} 
          />
          <div style={indicatorGroup}>
            {formData.confirmPassword && (
              <span style={{ marginRight: '8px', display: 'flex', color: passwordsMatch ? '#27ae60' : '#ff4d4d' }}>
                {passwordsMatch ? <Check size={16} /> : <X size={16} />}
              </span>
            )}
            <div onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer', color: '#888', display: 'flex' }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          style={formData.confirmPassword && !passwordsMatch ? disabledBtn : btnStyle} 
          disabled={formData.confirmPassword && !passwordsMatch}
        >
          REGISTER
        </button>
        <p style={footerText}>
          Already have an account? <span onClick={() => navigate('/signin', { state: { from } })} style={link}>Sign In</span>
        </p>
      </form>
    </div>
  );
};

// --- Styles ---
const container = { height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const signUpBox = { width: '400px', textAlign: 'center', padding: '50px', border: '1px solid #eee', backgroundColor: '#fff' };
const title = { letterSpacing: '5px', fontWeight: '300', marginBottom: '10px' };
const subtitle = { fontSize: '10px', color: '#888', marginBottom: '30px', letterSpacing: '1px' };
const inputStyle = { width: '100%', padding: '15px', marginBottom: '15px', border: '1px solid #ddd', outline: 'none', fontSize: '13px' };

const passwordWrapper = { position: 'relative', width: '100%', marginBottom: '15px' };
const passwordInput = { ...inputStyle, marginBottom: '0' };
const iconStyle = { position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center' };

// This group keeps both icons aligned on the right of the input
const indicatorGroup = { position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '5px' };

const meterContainer = { width: '100%', height: '4px', backgroundColor: '#eee', marginBottom: '15px', position: 'relative', borderRadius: '2px' };
const meterBar = { height: '100%', transition: 'all 0.4s ease', borderRadius: '2px' };
const strengthText = { position: 'absolute', right: '0', top: '6px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px' };

const btnStyle = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', marginTop: '10px' };
const disabledBtn = { ...btnStyle, backgroundColor: '#888', cursor: 'not-allowed' };
const footerText = { fontSize: '12px', marginTop: '20px', color: '#666' };
const link = { textDecoration: 'underline', cursor: 'pointer', color: '#000', fontWeight: 'bold' };

export default SignUp;