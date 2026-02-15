import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Check, X } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // --- Password Strength Logic (Identical to SignUp for consistency) ---
  const strength = useMemo(() => {
    const pw = formData.password;
    if (!pw) return { score: 0, label: '', color: '#ddd' };
    let score = 0;
    if (pw.length > 6) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    switch (score) {
      case 1: return { score: 25, label: 'WEAK', color: '#ff4d4d' };
      case 2: return { score: 50, label: 'FAIR', color: '#ffa500' };
      case 3: return { score: 75, label: 'GOOD', color: '#2ecc71' };
      case 4: return { score: 100, label: 'STRONG', color: '#27ae60' };
      default: return { score: 10, label: 'VERY WEAK', color: '#ff4d4d' };
    }
  }, [formData.password]);

  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordsMatch) return alert("Passwords do not match!");

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password/${token}`, { password: formData.password });
      alert("Password reset successful! You can now sign in with your new password.");
      navigate('/signin');
    } catch (err) {
      alert(err.response?.data?.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <form onSubmit={handleSubmit} style={box}>
        <h2 style={title}>NEW PASSWORD</h2>
        <p style={subtitle}>Create a secure new password for your account</p>

        {/* Main Password Input */}
        <div style={passwordWrapper}>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="NEW PASSWORD" required
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
            style={passwordInput} 
          />
          <div onClick={() => setShowPassword(!showPassword)} style={iconStyle}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </div>
        </div>

        {/* Strength Meter */}
        {formData.password && (
          <div style={meterContainer}>
            <div style={{ ...meterBar, width: `${strength.score}%`, backgroundColor: strength.color }}></div>
            <span style={{ ...strengthText, color: strength.color }}>{strength.label}</span>
          </div>
        )}

        {/* Confirm Password Input */}
        <div style={passwordWrapper}>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="CONFIRM NEW PASSWORD" required
            value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
            style={passwordInput} 
          />
          <div style={indicatorGroup}>
            {formData.confirmPassword && (
              <span style={{ marginRight: '8px', display: 'flex', color: passwordsMatch ? '#27ae60' : '#ff4d4d' }}>
                {passwordsMatch ? <Check size={16} /> : <X size={16} />}
              </span>
            )}
            <div onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer', color: '#888', display: 'flex' }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          style={formData.confirmPassword && !passwordsMatch ? disabledBtn : btnStyle} 
          disabled={(formData.confirmPassword && !passwordsMatch) || loading}
        >
          {loading ? "UPDATING..." : "UPDATE PASSWORD"}
        </button>
      </form>
    </div>
  );
};

// --- Styles (Consistent with OneElixir Theme) ---
const container = { height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const box = { width: '400px', textAlign: 'center', padding: '50px', border: '1px solid #eee', backgroundColor: '#fff' };
const title = { letterSpacing: '5px', fontWeight: '300', marginBottom: '10px' };
const subtitle = { fontSize: '10px', color: '#888', marginBottom: '30px', letterSpacing: '1px' };
const inputStyle = { width: '100%', padding: '15px', marginBottom: '15px', border: '1px solid #ddd', outline: 'none', fontSize: '13px', boxSizing: 'border-box' };
const passwordWrapper = { position: 'relative', width: '100%', marginBottom: '15px' };
const passwordInput = { ...inputStyle, marginBottom: '0' };
const iconStyle = { position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center' };
const indicatorGroup = { position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '5px' };
const meterContainer = { width: '100%', height: '4px', backgroundColor: '#eee', marginBottom: '15px', position: 'relative', borderRadius: '2px' };
const meterBar = { height: '100%', transition: 'all 0.4s ease', borderRadius: '2px' };
const strengthText = { position: 'absolute', right: '0', top: '6px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px' };
const btnStyle = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', marginTop: '10px' };
const disabledBtn = { ...btnStyle, backgroundColor: '#888', cursor: 'not-allowed' };

export default ResetPassword;