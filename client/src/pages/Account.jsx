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
    // 1. Safety Timer: If after 3 seconds we still don't have a user, 
    // stop the loading screen and redirect to sign-in.
    const authTimer = setTimeout(() => {
      if (!user) {
        setLoading(false);
        navigate('/signin');
      }
    }, 3000);

    const fetchOrderHistory = async () => {
      // If user isn't loaded yet, don't run the fetch
      if (!user || !user.email) return;

      try {
        // Clear the timer since we found a user
        clearTimeout(authTimer);
        
        console.log("Attempting to fetch orders for:", user.email.toLowerCase());
        const res = await axios.get(`${API_URL}/api/orders/customer/${user.email.toLowerCase()}`);
        
        setOrders(res.data);
      } catch (err) {
        console.error("API Error - check if backend is running:", err);
      } finally {
        // 2. CRITICAL: This MUST run to remove the loading screen
        setLoading(false);
      }
    };

    fetchOrderHistory();

    return () => clearTimeout(authTimer);
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
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <p style={emptyMsg}>You haven't secured any Elixirs yet.</p>
            <p style={{ fontSize: '10px', color: '#ccc', marginTop: '10px' }}>
              Logged in as: {user?.email}
            </p>
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
                    {(order.status || 'pending').toUpperCase()}
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

// Helper for Status Coloring (Matches your Schema defaults)
const getStatusColor = (status) => {
  const s = status?.toLowerCase();
  if (s === 'delivered') return '#27ae60';
  if (s === 'shipped') return '#f39c12';
  return '#888';
};

// --- Styles (Maintained) ---
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
const centerMsg = { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '2px', textAlign: 'center' };
const emptyMsg = { textAlign: 'center', color: '#888', fontSize: '14px', fontStyle: 'italic' };

export default Account;