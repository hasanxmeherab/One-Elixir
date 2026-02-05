import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext'; // MISSING IMPORT FIXED

const SignUp = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useUser(); // Now this will work
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/signup`, formData);
      
      // If your backend returns user data + token on signup:
      if(res.data.token) {
        login(res.data);
        alert("Welcome to OneElixir!");
        navigate('/'); // Go to shop
      } else {
        alert("Account created! Please sign in.");
        navigate('/signin');
      }
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed. Email might already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authContainerStyle}>
      <h2 style={authHeaderStyle}>CREATE ACCOUNT</h2>
      <form onSubmit={handleSignUp} style={authFormStyle}>
        <input 
          type="text" 
          placeholder="Full Name" 
          disabled={loading}
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          required style={authInputStyle}
        />
        <input 
          type="email" 
          placeholder="Email Address" 
          disabled={loading}
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})} 
          required style={authInputStyle}
        />
        <input 
          type="password" 
          placeholder="Create Password" 
          disabled={loading}
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
          required style={authInputStyle}
        />
        <button 
          type="submit" 
          disabled={loading} 
          style={{...authBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer'}}
        >
          {loading ? "CREATING ACCOUNT..." : "JOIN ONEELIXIR"}
        </button>
      </form>
      <p style={{ marginTop: '20px', fontSize: '14px' }}>
        Already have an account? <Link to="/signin" style={{ color: '#000', fontWeight: 'bold' }}>Sign In</Link>
      </p>
    </div>
  );
};

// --- Styles (Identical to your provided code) ---
const authContainerStyle = { padding: '100px 15%', textAlign: 'center', minHeight: '60vh' };
const authHeaderStyle = { letterSpacing: '3px', marginBottom: '40px' };
const authFormStyle = { maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '15px' };
const authInputStyle = { padding: '15px', border: '1px solid #ddd', outline: 'none' };
const authBtnStyle = { padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold' };

export default SignUp;