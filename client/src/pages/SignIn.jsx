import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Eye, EyeOff } from 'lucide-react'; // Import icons for consistency

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Eye toggle state
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Normalize email to lowercase before sending to backend
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
    <div style={container}>
      <form onSubmit={handleSubmit} style={loginBox}>
        <h2 style={title}>SIGN IN</h2>
        <p style={subtitle}>Welcome back to OneElixir.</p>
        
        <input 
          type="email" placeholder="EMAIL" value={email} 
          onChange={e => setEmail(e.target.value)} required style={inputStyle} 
        />

        {/* Password field with Eye Toggle */}
        <div style={passwordWrapper}>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="PASSWORD" value={password} 
            onChange={e => setPassword(e.target.value)} required 
            style={passwordInput} 
          />
          <div onClick={() => setShowPassword(!showPassword)} style={iconStyle}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </div>
        </div>
        
        {/* Forgot Password Link */}
        <div style={forgotPasswordContainer}>
          <span onClick={() => navigate('/forgot-password')} style={forgotLink}>
            Forgot Password?
          </span>
        </div>
        
        <button type="submit" style={btnStyle}>LOGIN</button>
        
        <p style={footerText}>
          Don't have an account? <span onClick={() => navigate('/signup', { state: { from } })} style={link}>Sign Up</span>
        </p>
      </form>
    </div>
  );
};

// --- Styles ---
const container = { height: '85vh', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const loginBox = { width: '350px', textAlign: 'center', padding: '40px', border: '1px solid #eee', backgroundColor: '#fff' };
const title = { letterSpacing: '5px', fontWeight: '300', marginBottom: '10px' };
const subtitle = { fontSize: '10px', color: '#888', marginBottom: '30px' };

const inputStyle = { width: '100%', padding: '15px', marginBottom: '15px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' };

// Added for Password/Eye Toggle alignment
const passwordWrapper = { position: 'relative', width: '100%', marginBottom: '10px' };
const passwordInput = { ...inputStyle, marginBottom: '0' };
const iconStyle = { position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', display: 'flex' };

// Forgot Password Styles
const forgotPasswordContainer = { width: '100%', textAlign: 'right', marginBottom: '20px' };
const forgotLink = { fontSize: '10px', color: '#888', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' };

const btnStyle = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px' };
const footerText = { fontSize: '12px', marginTop: '20px', color: '#666' };
const link = { textDecoration: 'underline', cursor: 'pointer', color: '#000', fontWeight: 'bold' };

export default SignIn;