import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminLogin = () => {
  const [email, setEmail] = useState(''); // New field
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Connects to the login route in adminRoutes.js
      const res = await axios.post(`${API_URL}/api/admins/login`, { email, password });
      
      // Store JWT and Admin details
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      localStorage.setItem('isAdminAuthenticated', 'true');
      
      navigate('/admin');
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={loginContainerStyle}>
      <h2 style={{ letterSpacing: '4px' }}>ONEELIXIR COMMAND CENTER</h2>
      <p style={{ fontSize: '12px', color: '#888', marginBottom: '30px' }}>ADMINISTRATOR AUTHENTICATION</p>
      
      <form onSubmit={handleLogin} style={{ maxWidth: '400px', margin: '0 auto' }}>
        <input 
          type="email" 
          placeholder="Admin Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={inputStyle}
          required
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={{ ...inputStyle, marginTop: '15px' }}
          required
        />
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'VERIFYING...' : 'ACCESS DASHBOARD'}
        </button>
      </form>
    </div>
  );
};

const loginContainerStyle = { padding: '100px 20px', textAlign: 'center' };
const inputStyle = { padding: '15px', width: '100%', border: '1px solid #ddd', outline: 'none', fontSize: '14px' };
const btnStyle = { display: 'block', width: '100%', marginTop: '20px', padding: '15px 30px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px' };

export default AdminLogin;