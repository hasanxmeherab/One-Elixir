import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InvestmentTracker = () => {
  const [investments, setInvestments] = useState([]);
  const [newInvestorName, setNewInvestorName] = useState('');
  const [formData, setFormData] = useState({
    investorName: '', amount: '', note: '',
    date: new Date().toISOString().split('T')[0]
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const totalCapital = (investments || []).reduce((acc, inv) => {
  const val = parseFloat(inv.totalAmount);
  return acc + (isNaN(val) ? 0 : val);
  }, 0);
  const fullHistory = investments
    .flatMap(inv => (inv.transactions || []).map(t => ({ 
      ...t, investorName: inv.investorName, investorId: inv._id 
    })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/investments`);
      setInvestments(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddInvestor = async (e) => {
    e.preventDefault();
    if (!newInvestorName) return;
    try {
      await axios.post(`${API_URL}/api/investments/add`, { investorName: newInvestorName, amount: 0, note: 'New Account' });
      setNewInvestorName('');
      fetchData();
    } catch (err) { alert("Error"); }
  };

  const handleAddInvestment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/investments/add`, formData);
      setFormData({ ...formData, investorName: '', amount: '', note: '' });
      fetchData();
      alert("Investment Recorded!");
    } catch (err) { alert("Failed"); }
  };

  const removeTransaction = async (invId, transId) => {
    if (window.confirm("Remove this entry?")) {
      try {
        await axios.delete(`${API_URL}/api/investments/${invId}/transaction/${transId}`);
        fetchData();
      } catch (err) { alert("Error"); }
    }
  };

  return (
    <div style={{ padding: '40px' }}>
      <h3 style={{ letterSpacing: '4px', fontWeight: 'bold', marginBottom: '40px' }}>INVESTMENT DASHBOARD</h3>

      {/* TOP CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', marginBottom: '50px' }}>
        <div style={card}>
          <span style={cardLabel}>TOTAL BUSINESS CAPITAL</span>
          <span style={{ fontSize: '32px', fontWeight: 'bold' }}>{totalCapital.toLocaleString()} TK</span>
        </div>
        <div style={card}>
          <span style={cardLabel}>INVESTOR LIST & CREATE</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input value={newInvestorName} onChange={e => setNewInvestorName(e.target.value)} placeholder="Name" style={miniInput} />
            <button onClick={handleAddInvestor} style={miniBtn}>ADD</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
             {investments.map(inv => (
               <div key={inv._id} style={tag}>{inv.investorName.toUpperCase()}: {inv.totalAmount.toLocaleString()} TK</div>
             ))}
          </div>
        </div>
      </div>

      {/* FORM */}
      <section style={formBox}>
        <p style={labelStyle}>RECORD NEW INVESTMENT</p>
        <form onSubmit={handleAddInvestment} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 0.5fr', gap: '20px', alignItems: 'flex-end' }}>
          <select value={formData.investorName} onChange={e => setFormData({...formData, investorName: e.target.value})} required style={input}>
            <option value="">-- Investor --</option>
            {investments.map(inv => <option key={inv._id} value={inv.investorName}>{inv.investorName}</option>)}
          </select>
          <input type="number" placeholder="Amount" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required style={input} />
          <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={input} />
          <button type="submit" style={mainBtn}>CONFIRM</button>
        </form>
      </section>

      {/* HISTORY TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '50px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
            <th style={th}>DATE</th><th style={th}>INVESTOR</th><th style={th}>AMOUNT</th><th style={th}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {fullHistory.map((entry, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
              <td style={td}>{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td style={{...td, fontWeight: 'bold'}}>{entry.investorName.toUpperCase()}</td>
              <td style={{...td, color: '#27ae60', fontWeight: 'bold'}}>{entry.amount.toLocaleString()} TK</td>
              <td style={td}><button onClick={() => removeTransaction(entry.investorId, entry._id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '10px' }}>REMOVE</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Minimized Styles ---
const card = { backgroundColor: '#fff', border: '1px solid #eee', padding: '30px' };
const cardLabel = { fontSize: '10px', color: '#888', fontWeight: 'bold', letterSpacing: '2px', display: 'block', marginBottom: '10px' };
const tag = { fontSize: '10px', padding: '5px 10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px' };
const miniInput = { padding: '8px', border: '1px solid #ddd', flex: 1 };
const miniBtn = { backgroundColor: '#000', color: '#fff', border: 'none', padding: '0 15px', cursor: 'pointer' };
const formBox = { backgroundColor: '#fcfcfc', padding: '30px', border: '1px solid #eee' };
const input = { padding: '12px', border: '1px solid #ddd' };
const mainBtn = { backgroundColor: '#000', color: '#fff', border: 'none', padding: '12px', cursor: 'pointer', fontWeight: 'bold' };
const th = { padding: '15px 10px', fontSize: '11px', color: '#888' };
const td = { padding: '15px 10px', fontSize: '13px' };
const labelStyle = { fontSize: '11px', fontWeight: 'bold', marginBottom: '20px', display: 'block' };

export default InvestmentTracker;