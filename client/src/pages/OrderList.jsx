import React, { useState } from 'react';
import axios from 'axios';

const OrderList = ({ orders, fetchData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // --- Search Logic ---
  const filteredOrders = orders.filter(order => 
    order.phone.includes(searchTerm) || 
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateOrderStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/orders/${id}`, { status });
      fetchData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const deleteOrder = async (order) => {
    if (window.confirm("Archive this order? This will restore stock to inventory.")) {
      try {
        for (const item of order.items) {
          await axios.put(`${API_URL}/api/perfumes/restore-stock`, { 
            id: item.perfumeId, 
            quantity: Number(item.quantity) 
          });
        }
        await axios.delete(`${API_URL}/api/orders/${order._id}`);
        fetchData();
        alert("Order archived and stock restored!");
      } catch (err) {
        alert("Archive failed.");
      }
    }
  };

  return (
    <div>
      <div style={headerStyle}>
        <h3 style={{ letterSpacing: '2px', margin: 0 }}>ORDER ARCHIVE</h3>
        <input 
          type="text" 
          placeholder="Search Name or Phone..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          style={searchStyle}
        />
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={thRow}>
            <th style={thStyle}>CUSTOMER</th>
            <th style={thStyle}>DETAILS</th>
            <th style={thStyle}>TOTAL</th>
            <th style={thStyle}>STATUS</th>
            <th style={thStyle}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(order => (
            <tr key={order._id} style={tdRow}>
              <td style={tdStyle}>
                <strong>{order.customerName}</strong><br/>
                <span style={{ fontSize: '11px', color: '#888' }}>{order.phone}</span>
              </td>
              <td style={tdStyle}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ fontSize: '12px' }}>{item.quantity}x {item.name}</div>
                ))}
              </td>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{order.totalAmount.toLocaleString()} TK</td>
              <td style={{ 
                ...tdStyle, 
                color: order.status === 'Delivered' ? 'green' : 
                       order.status === 'Processing' ? '#3498db' : 'orange', 
                fontWeight: 'bold' 
              }}>
                {order.status.toUpperCase()}
              </td>
              <td style={tdStyle}>
                <select 
                  onChange={(e) => updateOrderStatus(order._id, e.target.value)} 
                  style={selectStyle}
                  value={order.status} 
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option> {/* New option added */}
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                </select>
                <button onClick={() => deleteOrder(order)} style={deleteBtn}>ARCHIVE</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Styles ---
const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' };
const searchStyle = { padding: '10px', border: '1px solid #eee', width: '250px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thRow = { borderBottom: '2px solid #000', textAlign: 'left' };
const thStyle = { padding: '15px 10px', fontSize: '11px', color: '#888' };
const tdRow = { borderBottom: '1px solid #eee' };
const tdStyle = { padding: '15px 10px', fontSize: '13px' };
const selectStyle = { padding: '5px', fontSize: '11px', marginRight: '10px' };
const deleteBtn = { color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', fontSize: '11px' };

export default OrderList;