import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password/${token}`, { password });
      alert("Password updated successfully!");
      navigate('/signin');
    } catch (err) {
      alert("Reset failed. Link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSubmit} style={boxStyle}>
        <h2 style={titleStyle}>NEW PASSWORD</h2>
        <input 
          type="password" placeholder="NEW PASSWORD" required 
          value={password} onChange={(e) => setPassword(e.target.value)} 
          style={inputStyle} 
        />
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? "UPDATING..." : "UPDATE PASSWORD"}
        </button>
      </form>
    </div>
  );
};

const containerStyle = { height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const boxStyle = { width: '400px', textAlign: 'center', padding: '50px', border: '1px solid #eee' };
const titleStyle = { letterSpacing: '5px', fontWeight: '300', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '15px', marginBottom: '15px', border: '1px solid #ddd' };
const btnStyle = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', cursor: 'pointer' };

export default ResetPassword;