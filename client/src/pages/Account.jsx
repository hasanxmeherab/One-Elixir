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

  useEffect(() => {
    // 1. If no user is found after loading, redirect to signin
    if (!user) {
      const timer = setTimeout(() => {
        if (!user) navigate('/signin');
      }, 2000); // Give it a 2-second grace period to load context
      return () => clearTimeout(timer);
    }

    const fetchOrderHistory = async () => {
      try {
        console.log("Fetching orders for:", user.email); // DEBUG: Check if email exists
        
        // 2. Added .toLowerCase() to ensure match with database
        const userEmail = user.email.toLowerCase();
        const res = await axios.get(`${API_URL}/api/orders/customer/${userEmail}`);
        
        console.log("Orders found:", res.data); // DEBUG: See what the backend returned
        setOrders(res.data);
      } catch (err) {
        console.error("Order fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchOrderHistory();
    }
  }, [user, navigate, API_URL]);

  if (loading) return <div style={centerMsg}>RETRIEVING YOUR COLLECTION...</div>;

  return (
    <div style={container}>
      <header style={header}>
        <h1 style={title}>WELCOME, {user?.name?.toUpperCase() || 'USER'}</h1>
        <p style={subtitle}>Manage your details and track your OneElixir orders.</p>
      </header>

      <section style={orderSection}>
        <h2 style={sectionTitle}>ORDER HISTORY</h2>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <p style={emptyMsg}>You haven't secured any Elixirs yet.</p>
            <p style={{ fontSize: '10px', color: '#ccc' }}>Logged in as: {user?.email}</p>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={thRow}>
                <th style={th}>DATE</th>
                <th style={th}>ITEMS</th>
                <th style={th}>TOTAL</th>
                <th style={th}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id} style={trStyle}>
                  <td style={td}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td style={td}>
                    {order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                  </td>
                  <td style={td}>{order.totalAmount} TK</td>
                  <td style={{ ...td, color: getStatusColor(order.status) }}>
                    {order.status ? order.status.toUpperCase() : 'PENDING'}
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

// Helper for Status Coloring
const getStatusColor = (status) => {
  if (status === 'Delivered') return '#27ae60';
  if (status === 'Shipped') return '#f39c12';
  return '#888';
};

// --- Minimalist Styles ---
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

export default Account;