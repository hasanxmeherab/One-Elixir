import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const SignUp = () => {
  // Added confirmPassword to the state object
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Client-side Validation: Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match! Please check again.");
      return;
    }

    // 2. Client-side Validation: Minimum length (optional but recommended)
    if (formData.password.length < 6) {
      alert("Password should be at least 6 characters long.");
      return;
    }

    try {
      const submissionData = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        password: formData.password
      };

      const res = await axios.post(`${API_URL}/api/auth/signup`, submissionData);
      
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
        
        {/* Main Password Field */}
        <input 
          type="password" placeholder="PASSWORD" required
          value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
          style={inputStyle} 
        />

        {/* NEW: Confirm Password Field */}
        <input 
          type="password" placeholder="CONFIRM PASSWORD" required
          value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
          style={inputStyle} 
        />
        
        <button type="submit" style={btnStyle}>REGISTER</button>
        
        <p style={footerText}>
          Already have an account? <span onClick={() => navigate('/signin', { state: { from } })} style={link}>Sign In</span>
        </p>
      </form>
    </div>
  );
};

// --- Styles (Maintained from your version) ---
const container = { height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const signUpBox = { width: '380px', textAlign: 'center', padding: '50px', border: '1px solid #eee', backgroundColor: '#fff' };
const title = { letterSpacing: '5px', fontWeight: '300', marginBottom: '10px' };
const subtitle = { fontSize: '10px', color: '#888', marginBottom: '30px', letterSpacing: '1px' };
const inputStyle = { width: '100%', padding: '15px', marginBottom: '15px', border: '1px solid #ddd', outline: 'none', fontSize: '13px' };
const btnStyle = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', transition: '0.3s' };
const footerText = { fontSize: '12px', marginTop: '20px', color: '#666' };
const link = { textDecoration: 'underline', cursor: 'pointer', color: '#000', fontWeight: 'bold' };

export default SignUp;