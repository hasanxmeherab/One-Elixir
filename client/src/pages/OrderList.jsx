import React, { useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOutletContext } from 'react-router-dom';

const OrderList = () => {
  const { orders = [], fetchData } = useOutletContext();
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- NEW: FILTER STATES ---
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  if (!orders) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Order Data...</div>;
  }

  const updatePaymentStatus = async (id, paymentStatus) => {
    try {
      await axios.put(`${API_URL}/api/orders/${id}`, { paymentStatus });
      fetchData();
    } catch (err) { alert("Failed to update payment status"); }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/orders/${id}`, { status });
      fetchData();
      alert(`Order updated to ${status}`);
    } catch (err) { alert("Failed to update status"); }
  };

  // --- PDF RECEIPT GENERATOR (Maintained) ---
  const downloadReceipt = (order) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("OneElixir Fragrances", 105, 20, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Ashulia, Dhaka, Bangladesh", 105, 33, { align: "center" });
      doc.text("Phone: +880 1690-272870", 105, 38, { align: "center" }); 
      doc.line(20, 43, 190, 43);

      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("BILL TO:", 20, 53);
      doc.setFont("helvetica", "normal");
      doc.text(`${order.customerName}`, 20, 59);
      doc.text(`Phone: ${order.phone}`, 20, 65);
      if (order.address) doc.text(`Address: ${order.address}`, 20, 71);

      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 140, 59);
      doc.text(`Order ID: #${order._id.slice(-6).toUpperCase()}`, 140, 65);
      doc.text(`Payment: ${order.paymentMethod} (${order.paymentStatus})`, 20, 77);

      const tableColumn = ["Item", "Qty", "Price", "Discount", "Total"];
      const tableRows = order.items.map(item => {
        const itemPrice = item.price || 0;
        const qty = item.quantity || 1;
        let discLabel = "0 TK";
        if (item.discountType === 'percentage') discLabel = `${item.discountValue}%`;
        else if (item.discountType === 'fixed') discLabel = `${item.discountValue} TK`;

        const finalPrice = item.finalItemPrice || (item.discountType === 'percentage' 
          ? itemPrice - (itemPrice * item.discountValue / 100) 
          : itemPrice - (item.discountValue || 0));

        return [item.name, qty, `${itemPrice.toLocaleString()} TK`, discLabel, `${(finalPrice * qty).toLocaleString()} TK` ];
      });

      autoTable(doc, {
        startY: 85,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 0, 0] },
        styles: { fontSize: 10, cellPadding: 5 }
      });

      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(11);
      const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      doc.text("Subtotal:", 135, finalY);
      doc.text(`${subtotal.toLocaleString()} TK`, 190, finalY, { align: "right" });

      let currentY = finalY + 8;
      const totalSavings = subtotal - order.totalAmount;
      if (totalSavings > 0) {
        doc.setTextColor(200, 0, 0);
        doc.text("Total Discount:", 135, currentY);
        doc.text(`-${totalSavings.toLocaleString()} TK`, 190, currentY, { align: "right" });
        currentY += 8;
      }

      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("GRAND TOTAL:", 120, currentY + 5); 
      doc.text(`${order.totalAmount.toLocaleString()} TK`, 190, currentY + 5, { align: "right" });

      doc.save(`OneElixir_Receipt_${order.customerName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) { console.error("PDF Error:", error); }
  };

  // --- UPDATED: ADVANCED FILTERING LOGIC ---
  const baseFiltered = orders.filter(order => showArchived ? order.status === 'Canceled' : order.status !== 'Canceled');
  
  const displayedOrders = baseFiltered.filter(order => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = order.customerName.toLowerCase().includes(search) || order.phone.includes(search);
    const matchesStatus = paymentStatusFilter === 'ALL' || order.paymentStatus === paymentStatusFilter;
    const matchesMethod = paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  return (
    <div style={containerStyle}>
      <div style={headerRow}>
        <h3 style={{ letterSpacing: '2px', margin: 0 }}>{showArchived ? 'ARCHIVED ORDERS' : 'ACTIVE ORDERS'}</h3>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* SEARCH */}
          <input type="text" placeholder="Search customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={searchStyle} />
          
          {/* PAYMENT STATUS FILTER */}
          <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} style={filterDropdownStyle}>
            <option value="ALL">ALL PAYMENT</option>
            <option value="Paid">PAID</option>
            <option value="Unpaid">UNPAID</option>
          </select>

          {/* PAYMENT METHOD FILTER */}
          <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} style={filterDropdownStyle}>
            <option value="ALL">ALL METHODS</option>
            <option value="Cash on Delivery">COD</option>
            <option value="Bkash">BKASH</option>
            <option value="Nagad">NAGAD</option>
          </select>

          <button onClick={() => { setShowArchived(!showArchived); setSearchTerm(''); }} style={showArchived ? activeToggleBtn : toggleBtn}>
            {showArchived ? '← BACK' : 'ARCHIVED'}
          </button>
        </div>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={headerStyle}>
            <th>DATE</th>
            <th>CUSTOMER</th>
            <th>ITEMS</th>
            <th>TOTAL</th>
            <th>PAYMENT METHOD</th>
            <th>PAYMENT</th>
            <th>ORDER STATUS</th>
            <th>ACTIONS</th>
            <th>RECEIPT</th>
          </tr>
        </thead>
        <tbody>
          {displayedOrders.length > 0 ? displayedOrders.map(order => (
            <tr key={order._id} style={rowStyle}>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>
                <div style={{ fontWeight: 'bold' }}>{order.customerName}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{order.phone}</div>
              </td>
              <td>
                <div style={{ fontSize: '11px' }}>
                  {order.items.map((item, i) => <div key={i}>{item.quantity}x {item.name}</div>)}
                </div>
              </td>
              <td style={{ fontWeight: 'bold' }}>{order.totalAmount.toLocaleString()} TK</td>
              <td style={{ fontSize: '11px' }}>{order.paymentMethod || 'COD'}</td>
              <td>
                <select 
                  value={order.paymentStatus || 'Unpaid'} 
                  onChange={(e) => updatePaymentStatus(order._id, e.target.value)}
                  style={paymentSelectStyle(order.paymentStatus)}
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                </select>
              </td>
              <td><span style={getStatusStyle(order.status)}>{order.status.toUpperCase()}</span></td>
              <td>
                {order.status !== 'Canceled' ? (
                  <select onChange={(e) => updateStatus(order._id, e.target.value)} value={order.status} style={selectStyle}>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Canceled">Cancel Order</option>
                  </select>
                ) : (
                  <button onClick={() => updateStatus(order._id, 'Pending')} style={restoreBtn}>RESTORE</button>
                )}
              </td>
              <td><button onClick={() => downloadReceipt(order)} style={downloadBtn}>PDF 📄</button></td>
            </tr>
          )) : (
            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: '#999' }}>No orders found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// --- Styles ---
const containerStyle = { width: '100%' };
const headerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const searchStyle = { padding: '8px 12px', border: '1px solid #ddd', fontSize: '12px', width: '180px', outline: 'none' };
const filterDropdownStyle = { padding: '8px', border: '1px solid #ddd', fontSize: '11px', outline: 'none', cursor: 'pointer', fontWeight: 'bold' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' };
const headerStyle = { borderBottom: '2px solid #000', padding: '10px' };
const rowStyle = { borderBottom: '1px solid #eee' };
const selectStyle = { padding: '5px', fontSize: '11px', border: '1px solid #ddd' };
const toggleBtn = { backgroundColor: '#f0f0f0', border: '1px solid #ddd', padding: '8px 15px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' };
const activeToggleBtn = { ...toggleBtn, backgroundColor: '#000', color: '#fff' };
const restoreBtn = { backgroundColor: '#222', color: '#fff', border: 'none', padding: '5px 12px', cursor: 'pointer', fontSize: '10px' };
const downloadBtn = { backgroundColor: '#fff', border: '1px solid #000', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };

const paymentSelectStyle = (status) => ({
  padding: '4px',
  fontSize: '10px',
  fontWeight: 'bold',
  border: '1px solid #ddd',
  color: status === 'Paid' ? '#065f46' : '#991b1b',
  backgroundColor: status === 'Paid' ? '#d1fae5' : '#fee2e2',
  cursor: 'pointer'
});

const getStatusStyle = (status) => {
  const base = { padding: '3px 8px', borderRadius: '2px', fontSize: '10px', fontWeight: 'bold' };
  if (status === 'Delivered') return { ...base, backgroundColor: '#d1fae5', color: '#065f46' };
  if (status === 'Canceled') return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' };
  if (status === 'Processing') return { ...base, backgroundColor: '#dbeafe', color: '#1e40af' };
  return { ...base, backgroundColor: '#fef3c7', color: '#92400e' };
};

export default OrderList;