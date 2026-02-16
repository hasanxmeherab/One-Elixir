import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email: email.toLowerCase() });
      setMessage("A reset link has been sent to your email.");
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSubmit} style={boxStyle}>
        <h2 style={titleStyle}>RESET PASSWORD</h2>
        <input 
          type="email" placeholder="EMAIL ADDRESS" required 
          value={email} onChange={(e) => setEmail(e.target.value)} 
          style={inputStyle} 
        />
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? "SENDING..." : "SEND RESET LINK"}
        </button>
        {message && <p style={successMsgStyle}>{message}</p>}
      </form>
    </div>
  );
};

const containerStyle = { height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const boxStyle = { width: '400px', textAlign: 'center', padding: '50px', border: '1px solid #eee' };
const titleStyle = { letterSpacing: '5px', fontWeight: '300', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '15px', marginBottom: '15px', border: '1px solid #ddd' };
const btnStyle = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', cursor: 'pointer' };
const successMsgStyle = { color: 'green', fontSize: '12px', marginTop: '15px' };

export default ForgotPassword;