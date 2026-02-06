import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InvestmentTracker = () => {
  const [investments, setInvestments] = useState([]);
  const [formData, setFormData] = useState({
    investorName: '', // TRACKING WHO
    amount: '',       // TRACKING HOW MUCH
    date: new Date().toISOString().split('T')[0] // TRACKING WHEN
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const totalCapital = investments.reduce((acc, inv) => acc + Number(inv.amount), 0);

  const fetchInvestments = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/investments`);
      setInvestments(res.data);
    } catch (err) { console.error("Failed to fetch", err); }
  };

  useEffect(() => { fetchInvestments(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/investments`, formData);
      setFormData({ investorName: '', amount: '', date: new Date().toISOString().split('T')[0] });
      fetchInvestments();
      alert("Investment recorded!");
    } catch (err) { alert("Error saving record"); }
  };

  const deleteInvestment = async (id) => {
    if (window.confirm("Remove this investment record?")) {
      await axios.delete(`${API_URL}/api/investments/${id}`);
      fetchInvestments();
    }
  };

  return (
    <div>
      <h3 style={{ letterSpacing: '3px', marginBottom: '30px', fontWeight: 'bold' }}>OWNER INVESTMENTS</h3>

      <div style={statBox}>
        <span style={label}>TOTAL BUSINESS CAPITAL</span>
        <span style={value}>{totalCapital.toLocaleString()} TK</span>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        <p style={formLabel}>RECORD NEW INVESTMENT</p>
        <div style={row}>
          <input 
            type="text" 
            placeholder="Investor Name (Who)" 
            value={formData.investorName} 
            onChange={e => setFormData({...formData, investorName: e.target.value})} 
            required style={inputStyle}
          />
          <input 
            type="number" 
            placeholder="Amount (How Much)" 
            value={formData.amount} 
            onChange={e => setFormData({...formData, amount: e.target.value})} 
            required style={inputStyle}
          />
          <input 
            type="date" 
            value={formData.date} 
            onChange={e => setFormData({...formData, date: e.target.value})} 
            style={inputStyle}
          />
        </div>
        <button type="submit" style={btnStyle}>CONFIRM INVESTMENT</button>
      </form>

      <table style={tableStyle}>
        <thead>
          <tr style={thRow}>
            <th style={thStyle}>DATE (WHEN)</th>
            <th style={thStyle}>INVESTOR (WHO)</th>
            <th style={thStyle}>AMOUNT (HOW MUCH)</th>
            <th style={thStyle}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {investments.map(inv => (
            <tr key={inv._id} style={tdRow}>
              <td style={tdStyle}>{new Date(inv.date).toLocaleDateString()}</td>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{inv.investorName.toUpperCase()}</td>
              <td style={{ ...tdStyle, color: '#27ae60', fontWeight: 'bold' }}>{Number(inv.amount).toLocaleString()} TK</td>
              <td style={tdStyle}>
                <button onClick={() => deleteInvestment(inv._id)} style={deleteBtn}>REMOVE</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Styles (OneElixir Dark Theme) ---
const statBox = { padding: '25px', backgroundColor: '#fff', border: '1px solid #eee', borderLeft: '5px solid #000', marginBottom: '30px', maxWidth: '300px' };
const label = { display: 'block', fontSize: '10px', color: '#888', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '10px' };
const value = { fontSize: '22px', fontWeight: 'bold' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#fcfcfc', padding: '30px', border: '1px solid #eee', marginBottom: '50px' };
const formLabel = { fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' };
const row = { display: 'flex', gap: '10px' };
const inputStyle = { padding: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '13px', flex: 1 };
const btnStyle = { padding: '15px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thRow = { borderBottom: '2px solid #000', textAlign: 'left' };
const thStyle = { padding: '15px 10px', fontSize: '11px', color: '#888' };
const tdRow = { borderBottom: '1px solid #eee' };
const tdStyle = { padding: '15px 10px', fontSize: '13px' };
const deleteBtn = { color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' };

export default InvestmentTracker;