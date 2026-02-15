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
    setMessage('');

    try {
      const res = await axios.post(`${API_URL}/api/auth/forgot-password`, { email: email.toLowerCase() });
      setMessage("A reset link has been sent to your email.");
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <form onSubmit={handleSubmit} style={box}>
        <h2 style={title}>RESET PASSWORD</h2>
        <p style={subtitle}>Enter your email to receive a recovery link</p>
        
        <input 
          type="email" placeholder="EMAIL ADDRESS" required
          value={email} onChange={(e) => setEmail(e.target.value)} 
          style={inputStyle} 
        />
        
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? "SENDING..." : "SEND RESET LINK"}
        </button>

        {message && <p style={successMsg}>{message}</p>}

        <p style={footerText}>
          Remembered your password? <span onClick={() => navigate('/signin')} style={link}>Sign In</span>
        </p>
      </form>
    </div>
  );
};

// --- Styles (Matching OneElixir Theme) ---
const container = { height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const box = { width: '400px', textAlign: 'center', padding: '50px', border: '1px solid #eee', backgroundColor: '#fff' };
const title = { letterSpacing: '5px', fontWeight: '300', marginBottom: '10px' };
const subtitle = { fontSize: '10px', color: '#888', marginBottom: '30px', letterSpacing: '1px' };
const inputStyle = { width: '100%', padding: '15px', marginBottom: '15px', border: '1px solid #ddd', outline: 'none', fontSize: '13px', boxSizing: 'border-box' };
const btnStyle = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px' };
const footerText = { fontSize: '12px', marginTop: '20px', color: '#666' };
const link = { textDecoration: 'underline', cursor: 'pointer', color: '#000', fontWeight: 'bold' };
const successMsg = { color: '#27ae60', fontSize: '13px', marginTop: '15px', fontWeight: '500' };

export default ForgotPassword;