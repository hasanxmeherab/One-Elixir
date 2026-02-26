import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const OrderList = () => {
  const { orders = [], fetchData } = useOutletContext();
  const toast = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [editPaymentOrder, setEditPaymentOrder] = useState(null); // order being edited
  const [editPaymentForm, setEditPaymentForm] = useState({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' });
  const [editUploading, setEditUploading] = useState(false);

  const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!orders) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Order Data...</div>;
  }

  const updatePaymentStatus = async (id, paymentStatus) => {
    try {
      await axios.put(`${API_URL}/api/orders/${id}`, { paymentStatus }, authHeader());
      fetchData();
    } catch (err) { toast.error("Failed to update payment status"); }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/orders/${id}`, { status }, authHeader());
      fetchData();
      toast.success(`Order updated to ${status}`);
    } catch (err) { toast.error("Failed to update order status"); }
  };

  const openEditPayment = (order) => {
    setEditPaymentOrder(order);
    setEditPaymentForm({
      senderNumber:  order.paymentDetails?.senderNumber  || '',
      transactionId: order.paymentDetails?.transactionId || '',
      screenshot:    null,
      screenshotUrl: order.paymentDetails?.screenshot    || '',
    });
  };

  const savePaymentDetails = async () => {
    if (!editPaymentForm.senderNumber || !editPaymentForm.transactionId) {
      return toast.warning('Please fill sender number and transaction ID.');
    }
    try {
      setEditUploading(true);
      let screenshotUrl = editPaymentForm.screenshotUrl;

      if (editPaymentForm.screenshot) {
        const data = new FormData();
        data.append('file', editPaymentForm.screenshot);
        data.append('upload_preset', UPLOAD_PRESET);
        data.append('cloud_name', CLOUD_NAME);
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
        screenshotUrl = res.data.secure_url;
      }

      await axios.put(`${API_URL}/api/orders/${editPaymentOrder._id}`, {
        paymentDetails: {
          platform:      editPaymentOrder.paymentMethod,
          senderNumber:  editPaymentForm.senderNumber,
          transactionId: editPaymentForm.transactionId,
          screenshot:    screenshotUrl,
        }
      }, authHeader());

      toast.success('Payment details saved.');
      setEditPaymentOrder(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save payment details.');
    } finally {
      setEditUploading(false);
    }
  };

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
      doc.text(`Payment Method: ${order.paymentMethod}`, 20, 77);
      
      if (order.createdBy) {
        doc.text(`Processed By: ${order.createdBy}`, 20, 83);
      }

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
        startY: order.createdBy ? 90 : 85,
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
      if (order.shippingCost > 0) {
        doc.text("Shipping Fee:", 135, currentY);
        doc.text(`${order.shippingCost.toLocaleString()} TK`, 190, currentY, { align: "right" });
        currentY += 8;
      }

      const totalSavings = subtotal - (order.totalAmount - (order.shippingCost || 0));
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

  const baseFiltered = orders.filter(order => showArchived ? order.status === 'Canceled' : order.status !== 'Canceled');
  
  const displayedOrders = baseFiltered.filter(order => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = order.customerName.toLowerCase().includes(search) || order.phone.includes(search);
    const matchesStatus = paymentStatusFilter === 'ALL' || order.paymentStatus === paymentStatusFilter;
    const matchesMethod = paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter;
    const matchesOrderStatus = orderStatusFilter === 'ALL' || order.status === orderStatusFilter;
    return matchesSearch && matchesStatus && matchesMethod && matchesOrderStatus;
  });

  return (
    <div style={containerStyle}>
      <div style={headerRow}>
        <h3 style={{ letterSpacing: '2px', margin: 0 }}>{showArchived ? 'ARCHIVED ORDERS' : 'ACTIVE ORDERS'}</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={searchStyle} />
          <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} style={filterDropdownStyle}>
            <option value="ALL">ALL STATUS</option>
            <option value="Pending">PENDING</option>
            <option value="Processing">PROCESSING</option>
            <option value="Shipped">SHIPPED</option>
            <option value="Delivered">DELIVERED</option>
            <option value="Canceled">CANCELED</option>
          </select>
          <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} style={filterDropdownStyle}>
            <option value="ALL">ALL PAYMENT</option>
            <option value="Paid">PAID</option>
            <option value="Unpaid">UNPAID</option>
          </select>
          <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} style={filterDropdownStyle}>
            <option value="ALL">ALL METHODS</option>
            <option value="Cash on Delivery">COD</option>
            <option value="Full Payment">FULL PAYMENT</option>
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
            <th>ADDRESS</th>
            <th>ITEMS</th>
            <th>SHIPPING</th>
            <th>TOTAL</th>
            <th>PAYMENT</th>
            <th>INFO</th>
            <th>CREATED BY</th>
            <th>STATUS</th>
            <th>ACTIONS</th>
            <th>PDF</th>
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
              <td style={{ maxWidth: '180px' }}>
                <div style={{ fontSize: '11px', lineHeight: '1.5' }}>{order.address || '—'}</div>
              </td>
              <td>
                <div style={{ fontSize: '11px' }}>
                  {order.items.map((item, i) => <div key={i}>{item.quantity}x {item.name}</div>)}
                </div>
              </td>
              <td style={{ fontSize: '11px' }}>{order.shippingCost} TK</td>
              <td style={{ fontWeight: 'bold' }}>{order.totalAmount.toLocaleString()} TK</td>
              <td>
                <div style={{ fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' }}>{order.paymentMethod}</div>
                <select value={order.paymentStatus || 'Unpaid'} onChange={(e) => updatePaymentStatus(order._id, e.target.value)} style={paymentSelectStyle(order.paymentStatus)}>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                </select>
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                {order.paymentMethod !== 'Cash on Delivery' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      onClick={() => setSelectedPayment({
                        platform:      order.paymentDetails?.platform      || order.paymentMethod,
                        senderNumber:  order.paymentDetails?.senderNumber  || '—',
                        transactionId: order.paymentDetails?.transactionId || '—',
                        amountPaid:    order.paymentDetails?.amountPaid    || null,
                        screenshot:    order.paymentDetails?.screenshot    || null,
                      })}
                      style={infoBtnStyle}>
                      VIEW
                    </button>
                    <button onClick={() => openEditPayment(order)}
                      style={{ ...infoBtnStyle, backgroundColor: '#555' }}>
                      EDIT
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: '#ccc', display: 'block', textAlign: 'center' }}>—</span>
                )}
              </td>
              <td style={{ fontSize: '11px', color: '#666' }}>{order.createdBy || 'Customer'}</td>
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
              <td><button onClick={() => downloadReceipt(order)} style={downloadBtn}>📄</button></td>
            </tr>
          )) : (
            <tr><td colSpan="12" style={{ textAlign: 'center', padding: '50px', color: '#999' }}>No orders found.</td></tr>
          )}
        </tbody>
      </table>

      {/* --- PAYMENT INFO MODAL --- */}
      {selectedPayment && (
        <div style={adminModalOverlay} onClick={() => setSelectedPayment(null)}>
          <div style={adminModalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', letterSpacing: '2px', margin: 0 }}>PAYMENT DETAILS</h3>
              <button onClick={() => setSelectedPayment(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedPayment.platform && (
                <div style={infoRow}>
                  <span style={infoLabel}>PLATFORM</span>
                  <span style={infoValue}>{selectedPayment.platform}</span>
                </div>
              )}
              <div style={infoRow}>
                <span style={infoLabel}>SENDER NUMBER</span>
                <span style={infoValue}>{selectedPayment.senderNumber || '—'}</span>
              </div>
              <div style={infoRow}>
                <span style={infoLabel}>TRANSACTION ID</span>
                <span style={{ ...infoValue, fontFamily: 'monospace', letterSpacing: '1px', color: '#000', fontWeight: 'bold' }}>
                  {selectedPayment.transactionId || '—'}
                </span>
              </div>
              {selectedPayment.amountPaid && (
                <div style={infoRow}>
                  <span style={infoLabel}>AMOUNT PAID</span>
                  <span style={{ ...infoValue, color: '#065f46', fontWeight: 'bold' }}>{selectedPayment.amountPaid} TK</span>
                </div>
              )}
            </div>

            {selectedPayment.screenshot && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', color: '#888', marginBottom: '8px' }}>PAYMENT SCREENSHOT</p>
                <a href={selectedPayment.screenshot} target="_blank" rel="noreferrer">
                  <img src={selectedPayment.screenshot} alt="Payment proof"
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', border: '1px solid #eee', borderRadius: '2px', cursor: 'zoom-in' }} />
                  <p style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '4px' }}>Click to open full size</p>
                </a>
              </div>
            )}

            <button onClick={() => setSelectedPayment(null)} style={closeBtnStyle}>CLOSE</button>
          </div>
        </div>
      )}
      {/* ── Edit Payment Details Modal ── */}
      {editPaymentOrder && (
        <div style={adminModalOverlay} onClick={() => setEditPaymentOrder(null)}>
          <div style={{ ...adminModalContent, width: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', letterSpacing: '2px', margin: 0 }}>EDIT PAYMENT INFO</h3>
              <button onClick={() => setEditPaymentOrder(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <p style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
              {editPaymentOrder.paymentMethod} — {editPaymentOrder.customerName}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="tel" placeholder="Sender Number" inputMode="numeric"
                value={editPaymentForm.senderNumber}
                onChange={e => setEditPaymentForm({ ...editPaymentForm, senderNumber: e.target.value.replace(/\D/g, '') })}
                style={{ padding: '10px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
              />
              <input
                type="text" placeholder="Transaction ID"
                value={editPaymentForm.transactionId}
                onChange={e => setEditPaymentForm({ ...editPaymentForm, transactionId: e.target.value })}
                style={{ padding: '10px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
              />

              {/* Screenshot upload */}
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '16px', border: `2px dashed ${editPaymentForm.screenshot || editPaymentForm.screenshotUrl ? '#000' : '#ddd'}`,
                cursor: 'pointer', borderRadius: '4px',
                background: editPaymentForm.screenshot ? '#f0fdf4' : '#fafafa'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  {editPaymentForm.screenshot ? '✓ ' + editPaymentForm.screenshot.name : editPaymentForm.screenshotUrl ? '✓ SCREENSHOT SAVED — CLICK TO REPLACE' : 'CLICK TO UPLOAD SCREENSHOT'}
                </span>
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => setEditPaymentForm({ ...editPaymentForm, screenshot: e.target.files[0] })} />
              </label>

              {editPaymentForm.screenshotUrl && !editPaymentForm.screenshot && (
                <img src={editPaymentForm.screenshotUrl} alt="Current screenshot"
                  style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', border: '1px solid #eee' }} />
              )}
            </div>

            <button onClick={savePaymentDetails} disabled={editUploading}
              style={{ ...closeBtnStyle, opacity: editUploading ? 0.6 : 1 }}>
              {editUploading ? 'SAVING...' : 'SAVE PAYMENT INFO'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const containerStyle = { width: '100%' };
const headerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const searchStyle = { padding: '8px 12px', border: '1px solid #ddd', fontSize: '12px', width: '150px', outline: 'none' };
const filterDropdownStyle = { padding: '8px', border: '1px solid #ddd', fontSize: '11px', outline: 'none', cursor: 'pointer', fontWeight: 'bold' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' };
const headerStyle = { borderBottom: '2px solid #000', padding: '10px' };
const rowStyle = { borderBottom: '1px solid #eee' };
const selectStyle = { padding: '5px', fontSize: '10px', border: '1px solid #ddd' };
const toggleBtn = { backgroundColor: '#f0f0f0', border: '1px solid #ddd', padding: '8px 12px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' };
const activeToggleBtn = { ...toggleBtn, backgroundColor: '#000', color: '#fff' };
const restoreBtn = { backgroundColor: '#222', color: '#fff', border: 'none', padding: '5px 12px', cursor: 'pointer', fontSize: '10px' };
const downloadBtn = { backgroundColor: '#fff', border: '1px solid #000', padding: '5px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };
const infoBtnStyle = { background: '#000', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '9px', cursor: 'pointer', fontWeight: 'bold' };
const adminModalOverlay = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:3000 };
const adminModalContent = { background:'#fff', padding:'30px', width:'350px', display:'flex', flexDirection:'column', gap:'10px' };
const closeBtnStyle = { background:'#000', color:'#fff', border:'none', padding:'10px', cursor:'pointer', fontWeight:'bold', marginTop:'16px', letterSpacing:'1px' };
const infoRow   = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f0f0f0' };
const infoLabel = { fontSize:'10px', fontWeight:'bold', letterSpacing:'1px', color:'#aaa' };
const infoValue = { fontSize:'12px', color:'#333' };

const paymentSelectStyle = (status) => ({
  padding: '4px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #ddd', color: status === 'Paid' ? '#065f46' : '#991b1b', backgroundColor: status === 'Paid' ? '#d1fae5' : '#fee2e2', cursor: 'pointer'
});

const getStatusStyle = (status) => {
  const base = { padding: '3px 8px', borderRadius: '2px', fontSize: '10px', fontWeight: 'bold' };
  if (status === 'Delivered') return { ...base, backgroundColor: '#d1fae5', color: '#065f46' };
  if (status === 'Canceled') return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' };
  if (status === 'Processing') return { ...base, backgroundColor: '#dbeafe', color: '#1e40af' };
  return { ...base, backgroundColor: '#fef3c7', color: '#92400e' };
};

export default OrderList;