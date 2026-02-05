import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // New Loading State
  const navigate = useNavigate();
  const { login } = useUser();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading
    try {
      const res = await axios.post(`${API_URL}/api/auth/signin`, { email, password });
      login(res.data); 
      alert(`Welcome back, ${res.data.user.name}!`);
      navigate('/cart'); 
    } catch (err) {
      alert(err.response?.data || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false); // Stop loading regardless of success/fail
    }
  };

  return (
    <div style={authContainerStyle}>
      <h2 style={authHeaderStyle}>SIGN IN</h2>
      <form onSubmit={handleSignIn} style={authFormStyle}>
        <input 
          type="email" 
          placeholder="Email Address" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          disabled={loading} // Disable input while loading
          style={authInputStyle}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          disabled={loading} // Disable input while loading
          style={authInputStyle}
        />
        <button 
          type="submit" 
          style={{...authBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer'}} 
          disabled={loading}
        >
          {loading ? "AUTHENTICATING..." : "LOG IN"}
        </button>
      </form>
      <p style={{ marginTop: '20px', fontSize: '14px' }}>
        New to OneElixir? <Link to="/signup" style={{ color: '#000', fontWeight: 'bold' }}>Create Account</Link>
      </p>
    </div>
  );
};

// Shared Styles for Auth
const authContainerStyle = { padding: '100px 15%', textAlign: 'center', minHeight: '60vh' };
const authHeaderStyle = { letterSpacing: '3px', marginBottom: '40px' };
const authFormStyle = { maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '15px' };
const authInputStyle = { padding: '15px', border: '1px solid #ddd', outline: 'none' };
const authBtnStyle = { padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold' };

export default SignIn;