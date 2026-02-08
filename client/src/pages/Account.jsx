import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const Account = () => {
  const { user } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchOrderHistory = async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(`${API_URL}/api/orders/customer/${user.email.toLowerCase()}`);
      setOrders(res.data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => { if (!user) navigate('/signin'); }, 2000);
      return () => clearTimeout(timer);
    }
    fetchOrderHistory();
  }, [user, navigate]);

  const handleCancel = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/cancel`);
      fetchOrderHistory();
    } catch (err) {
      alert(err.response?.data?.message || "Cancellation failed.");
    }
  };

  if (loading) return <div style={centerMsg}>RETRIEVING YOUR COLLECTION...</div>;

  return (
    <div style={container}>
      <header style={header}>
        <h1 style={title}>WELCOME, {user?.name?.toUpperCase()}</h1>
        <p style={subtitle}>Manage your details and track your OneElixir orders.</p>
      </header>

      <section style={orderSection}>
        <h2 style={sectionTitle}>ORDER HISTORY</h2>
        {orders.length === 0 ? (
          <p style={emptyMsg}>No elixirs secured yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={thRow}>
                <th style={th}>DATE</th>
                <th style={th}>ITEMS</th>
                <th style={th}>TOTAL</th>
                <th style={th}>STATUS</th>
                <th style={th}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id} style={trStyle}>
                  <td style={td}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td style={td}>{order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</td>
                  <td style={td}>{order.totalAmount} TK</td>
                  <td style={{ ...td, color: getStatusColor(order.status) }}>
                    {order.status.toUpperCase()}
                  </td>
                  <td style={td}>
                    {order.status.toLowerCase() === 'pending' && (
                      <button onClick={() => handleCancel(order._id)} style={cancelBtn}>CANCEL</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

const getStatusColor = (status) => {
  const s = status?.toLowerCase();
  if (s === 'delivered') return '#27ae60';
  if (s === 'shipped') return '#f39c12';
  if (s === 'cancelled') return '#e74c3c';
  return '#888';
};

// Styles
const container = { padding: '80px 10%', minHeight: '80vh' };
const header = { marginBottom: '50px', textAlign: 'center' };
const title = { letterSpacing: '5px', fontSize: '2rem', fontWeight: 'bold' };
const subtitle = { color: '#888', fontSize: '12px', marginTop: '10px' };
const orderSection = { marginTop: '40px' };
const sectionTitle = { fontSize: '14px', letterSpacing: '3px', borderBottom: '1px solid #000', paddingBottom: '10px', marginBottom: '20px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const thRow = { borderBottom: '2px solid #eee' };
const th = { padding: '15px 10px', fontSize: '11px', color: '#999', fontWeight: 'bold' };
const trStyle = { borderBottom: '1px solid #f9f9f9' };
const td = { padding: '20px 10px', fontSize: '13px' };
const centerMsg = { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '2px' };
const emptyMsg = { textAlign: 'center', color: '#888', marginTop: '50px', fontStyle: 'italic' };
const cancelBtn = { background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', padding: '5px 10px', fontSize: '10px', cursor: 'pointer' };

export default Account;