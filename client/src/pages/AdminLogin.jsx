import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Replace 'yourSecretPassword' with your actual desired password
    if (password === 'OneElixir2026') { 
      localStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin');
    } else {
      alert('Unauthorized access.');
    }
  };

  return (
    <div style={loginContainerStyle}>
      <h2>ONEELIXIR AUTHENTICATION</h2>
      <form onSubmit={handleLogin}>
        <input 
          type="password" 
          placeholder="Enter Admin Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={inputStyle}
        />
        <button type="submit" style={btnStyle}>ACCESS COMMAND CENTER</button>
      </form>
    </div>
  );
};

const loginContainerStyle = { padding: '100px 20px', textAlign: 'center' };
const inputStyle = { padding: '15px', width: '300px', border: '1px solid #eee', outline: 'none' };
const btnStyle = { display: 'block', margin: '20px auto', padding: '15px 30px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer' };

export default AdminLogin;