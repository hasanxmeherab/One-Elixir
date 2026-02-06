import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Packaging',
    date: new Date().toISOString().split('T')[0]
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // --- Calculations ---
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  }).reduce((acc, exp) => acc + Number(exp.amount), 0);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/expenses`);
      setExpenses(res.data);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/expenses`, formData);
      setFormData({ title: '', amount: '', category: 'Packaging', date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
      alert("Expense logged!");
    } catch (err) {
      alert("Failed to save expense");
    }
  };

  const deleteExpense = async (id) => {
    if (window.confirm("Delete this expense record?")) {
      await axios.delete(`${API_URL}/api/expenses/${id}`);
      fetchExpenses();
    }
  };

  return (
    <div>
      <h3 style={{ letterSpacing: '3px', marginBottom: '30px', fontWeight: 'bold' }}>EXPENSE MANAGEMENT</h3>

      {/* Expense Summary Boxes */}
      <div style={statsGrid}>
        <div style={statCard}>
          <span style={label}>THIS MONTH'S SPEND</span>
          <span style={value}>{monthlyExpenses.toLocaleString()} TK</span>
        </div>
        <div style={statCard}>
          <span style={label}>TOTAL EXPENDITURE</span>
          <span style={value}>{totalExpenses.toLocaleString()} TK</span>
        </div>
      </div>

      {/* Log Form */}
      <form onSubmit={handleSubmit} style={formStyle}>
        <p style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '15px', letterSpacing: '1px' }}>LOG NEW EXPENDITURE</p>
        <div style={row}>
          <input type="text" placeholder="Description (e.g. Alcohol 5L)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={inputStyle}/>
          <input type="number" placeholder="Amount (TK)" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required style={inputStyle}/>
        </div>
        <div style={row}>
          <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={inputStyle}>
            <option value="Packaging">Packaging (Bottles/Boxes)</option>
            <option value="Ingredients">Ingredients (Oil/Alcohol)</option>
            <option value="Marketing">Marketing/Ads</option>
            <option value="Tools">Tools/Equipment</option>
            <option value="Other">Other</option>
          </select>
          <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={inputStyle}/>
        </div>
        <button type="submit" style={btnStyle}>SAVE EXPENSE</button>
      </form>

      {/* History Table */}
      <table style={tableStyle}>
        <thead>
          <tr style={thRow}>
            <th style={thStyle}>DATE</th>
            <th style={thStyle}>TITLE</th>
            <th style={thStyle}>CATEGORY</th>
            <th style={thStyle}>AMOUNT</th>
            <th style={thStyle}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            <tr key={exp._id} style={tdRow}>
              <td style={tdStyle}>{new Date(exp.date).toLocaleDateString()}</td>
              <td style={tdStyle}>{exp.title}</td>
              <td style={tdStyle}>{exp.category}</td>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{Number(exp.amount).toLocaleString()} TK</td>
              <td style={tdStyle}>
                <button onClick={() => deleteExpense(exp._id)} style={deleteBtn}>REMOVE</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Styles ---
const statsGrid = { display: 'flex', gap: '20px', marginBottom: '40px' };
const statCard = { flex: 1, padding: '25px', backgroundColor: '#fff', border: '1px solid #eee', borderLeft: '5px solid #000' };
const label = { display: 'block', fontSize: '10px', color: '#888', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '10px' };
const value = { fontSize: '20px', fontWeight: 'bold' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#fcfcfc', padding: '30px', border: '1px solid #eee', marginBottom: '50px' };
const row = { display: 'flex', gap: '10px' };
const inputStyle = { padding: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '13px', flex: 1, backgroundColor: '#fff' };
const btnStyle = { padding: '15px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', fontSize: '12px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const thRow = { borderBottom: '2px solid #000' };
const thStyle = { padding: '15px 10px', fontSize: '11px', color: '#888', letterSpacing: '1px' };
const tdRow = { borderBottom: '1px solid #eee' };
const tdStyle = { padding: '15px 10px', fontSize: '13px' };
const deleteBtn = { color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', fontWeight: 'bold' };

export default ExpenseManagement;