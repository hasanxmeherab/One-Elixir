import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const SignUp = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create a submission object with a lowercase email
      const submissionData = {
        ...formData,
        email: formData.email.toLowerCase()
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
        <input 
          type="password" placeholder="PASSWORD" required
          value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
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
const signUpBox = { width: '380px', textAlign: 'center', padding: '50px', border: '1px solid #eee' };
const title = { letterSpacing: '5px', fontWeight: '300', marginBottom: '10px' };
const subtitle = { fontSize: '10px', color: '#888', marginBottom: '30px', letterSpacing: '1px' };
const inputStyle = { width: '100%', padding: '15px', marginBottom: '15px', border: '1px solid #ddd', outline: 'none' };
const btnStyle = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px' };
const footerText = { fontSize: '12px', marginTop: '20px', color: '#666' };
const link = { textDecoration: 'underline', cursor: 'pointer', color: '#000', fontWeight: 'bold' };

export default SignUp;