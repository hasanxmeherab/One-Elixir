import React, { useState, useEffect } from 'react';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';


const PAGE_SIZE = 15;

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="px-4 py-2 border border-[#ddd] text-xs font-bold tracking-wider disabled:opacity-30 hover:border-black transition-colors cursor-pointer bg-white">
        ← PREV
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onPageChange(n)}
          className={`w-9 h-9 text-xs font-bold border transition-colors cursor-pointer ${
            n === page ? 'bg-black text-white border-black' : 'bg-white border-[#ddd] hover:border-black'
          }`}>
          {n}
        </button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
        className="px-4 py-2 border border-[#ddd] text-xs font-bold tracking-wider disabled:opacity-30 hover:border-black transition-colors cursor-pointer bg-white">
        NEXT →
      </button>
    </div>
  );
};

const OrderList = () => {
  const { orders = [], fetchData } = useOutletContext();
  const toast = useToast();
  const [showArchived, setShowArchived]           = useState(false);
  const [searchTerm, setSearchTerm]               = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment]     = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [editPaymentOrder, setEditPaymentOrder]   = useState(null);
  const [editPaymentForm, setEditPaymentForm]     = useState({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' });
  const [editUploading, setEditUploading]         = useState(false);
  const [page, setPage]                           = useState(1);

  const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const API_URL       = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setPage(1); }, [searchTerm, paymentStatusFilter, paymentMethodFilter, orderStatusFilter, showArchived]);

  if (!orders) return <div className="p-10 text-center">Loading Order Data...</div>;

  const updatePaymentStatus = async (id, paymentStatus) => {
    try { await adminAxios.put(`${API_URL}/api/orders/${id}`, { paymentStatus }); fetchData(); }
    catch { toast.error('Failed to update payment status'); }
  };

  const updateStatus = async (id, status) => {
    try { await adminAxios.put(`${API_URL}/api/orders/${id}`, { status }); fetchData(); toast.success(`Order updated to ${status}`); }
    catch { toast.error('Failed to update order status'); }
  };

  const openEditPayment = (order) => {
    setEditPaymentOrder(order);
    setEditPaymentForm({
      senderNumber: order.paymentDetails?.senderNumber || '',
      transactionId: order.paymentDetails?.transactionId || '',
      screenshot: null,
      screenshotUrl: order.paymentDetails?.screenshot || ''
    });
  };

  const savePaymentDetails = async () => {
    if (!editPaymentForm.senderNumber || !editPaymentForm.transactionId)
      return toast.warning('Please fill sender number and transaction ID.');
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
      await adminAxios.put(`${API_URL}/api/orders/${editPaymentOrder._id}`, {
        paymentDetails: {
          platform: editPaymentOrder.paymentMethod,
          senderNumber: editPaymentForm.senderNumber,
          transactionId: editPaymentForm.transactionId,
          screenshot: screenshotUrl
        }
      });
      toast.success('Payment details saved.');
      setEditPaymentOrder(null);
      fetchData();
    } catch { toast.error('Failed to save payment details.'); }
    finally { setEditUploading(false); }
  };

  const downloadReceipt = async (order) => {
    try {
      const doc = new jsPDF();
      
      // Fetch and embed logo image
      const logoResponse = await fetch('/logos/OneElixir Name(Sg).png');
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(logoBlob);
      });
      
      // Add logo image to PDF (centered at top)
      doc.addImage(logoDataUrl, 'PNG', 65, 10, 80, 20);
      
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text('Ashulia, Dhaka, Bangladesh', 105, 37, { align: 'center' });
      doc.text('Phone: +880 1690-272870', 105, 42, { align: 'center' });
      doc.line(20, 48, 190, 48);
      doc.setTextColor(0); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', 20, 58); doc.setFont('helvetica', 'normal');
      doc.text(`${order.customerName}`, 20, 64);
      doc.text(`Phone: ${order.phone}`, 20, 70);
      if (order.address) doc.text(`Address: ${order.address}`, 20, 76);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 140, 64);
      doc.text(`Order ID: #${order._id.slice(-6).toUpperCase()}`, 140, 70);
      doc.text(`Payment Method: ${order.paymentMethod}`, 20, 82);
      if (order.createdBy) doc.text(`Processed By: ${order.createdBy}`, 20, 88);
      const tableRows = order.items.map(item => {
        const itemPrice = item.price || 0; const qty = item.quantity || 1;
        let discLabel = '0 TK';
        if (item.discountType === 'percentage') discLabel = `${item.discountValue}%`;
        else if (item.discountType === 'fixed') discLabel = `${item.discountValue} TK`;
        const finalPrice = item.finalItemPrice || (item.discountType === 'percentage' ? itemPrice - (itemPrice * item.discountValue / 100) : itemPrice - (item.discountValue || 0));
        return [item.name, qty, `${itemPrice.toLocaleString()} TK`, discLabel, `${(finalPrice * qty).toLocaleString()} TK`];
      });
      autoTable(doc, { startY: order.createdBy ? 95 : 90, head: [['Item', 'Qty', 'Price', 'Discount', 'Total']], body: tableRows, theme: 'striped', headStyles: { fillColor: [0, 0, 0] }, styles: { fontSize: 10, cellPadding: 5 } });
      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(11);
      const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      doc.text('Subtotal:', 135, finalY); doc.text(`${subtotal.toLocaleString()} TK`, 190, finalY, { align: 'right' });
      let currentY = finalY + 8;
      if (order.shippingCost > 0) { doc.text('Shipping Fee:', 135, currentY); doc.text(`${order.shippingCost.toLocaleString()} TK`, 190, currentY, { align: 'right' }); currentY += 8; }
      const totalSavings = subtotal - (order.totalAmount - (order.shippingCost || 0));
      if (totalSavings > 0) { doc.setTextColor(200, 0, 0); doc.text('Total Discount:', 135, currentY); doc.text(`-${totalSavings.toLocaleString()} TK`, 190, currentY, { align: 'right' }); currentY += 8; }
      doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text('GRAND TOTAL:', 120, currentY + 5); doc.text(`${order.totalAmount.toLocaleString()} TK`, 190, currentY + 5, { align: 'right' });
      doc.save(`OneElixir_Receipt_${order.customerName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) { console.error('PDF Error:', error); }
  };

  const exportToExcel = () => {
    const rows = allFiltered.map(order => ({
      'Date':           new Date(order.createdAt).toLocaleDateString('en-GB'),
      'Order ID':       order._id.slice(-6).toUpperCase(),
      'Customer':       order.customerName,
      'Phone':          order.phone,
      'Address':        order.address || '',
      'Items':          order.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
      'Shipping (TK)':  order.shippingCost || 0,
      'Total (TK)':     order.totalAmount,
      'Payment Method': order.paymentMethod,
      'Payment Status': order.paymentStatus || 'Unpaid',
      'Order Status':   order.status,
      'Created By':     order.createdBy || (order.isManual ? 'Admin' : 'Customer'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 15 },
      { wch: 30 }, { wch: 40 }, { wch: 14 }, { wch: 12 },
      { wch: 18 }, { wch: 15 }, { wch: 14 }, { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `OneElixir_Orders_${date}.xlsx`);
    toast.success(`Exported ${rows.length} orders to Excel`);
  };

  const baseFiltered    = orders.filter(o => showArchived ? o.status === 'Canceled' : o.status !== 'Canceled');
  const allFiltered = baseFiltered.filter(order => {
    const s = searchTerm.toLowerCase();
    return (order.customerName.toLowerCase().includes(s) || order.phone.includes(s))
      && (paymentStatusFilter === 'ALL' || order.paymentStatus === paymentStatusFilter)
      && (paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter)
      && (orderStatusFilter   === 'ALL' || order.status       === orderStatusFilter);
  });
  const totalPages      = Math.ceil(allFiltered.length / PAGE_SIZE);
  const displayedOrders = allFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getStatusClass = (status) => {
    if (status === 'Delivered')  return 'bg-emerald-100 text-emerald-800';
    if (status === 'Canceled')   return 'bg-red-100 text-red-800';
    if (status === 'Processing') return 'bg-blue-100 text-blue-800';
    if (status === 'Shipped')    return 'bg-violet-100 text-violet-800';
    return 'bg-amber-100 text-amber-800';
  };

  // ✅ Check if order has payment details (works for COD + Full Payment)
  const hasPaymentDetails = (order) =>
    !!(order.paymentDetails?.senderNumber || order.paymentDetails?.transactionId);

  return (
    <div className="w-full">
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h3 className="tracking-[2px] font-bold m-0">{showArchived ? 'ARCHIVED ORDERS' : 'ACTIVE ORDERS'}</h3>
        <div className="flex gap-2.5 flex-wrap items-center">
          <input type="text" placeholder="Search customer..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-[#ddd] text-xs outline-none w-36" />
          <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}
            className="px-2 py-2 border border-[#ddd] text-[11px] outline-none cursor-pointer font-bold">
            <option value="ALL">ALL STATUS</option>
            <option value="Pending">PENDING</option>
            <option value="Processing">PROCESSING</option>
            <option value="Shipped">SHIPPED</option>
            <option value="Delivered">DELIVERED</option>
            <option value="Canceled">CANCELED</option>
          </select>
          <select value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value)}
            className="px-2 py-2 border border-[#ddd] text-[11px] outline-none cursor-pointer font-bold">
            <option value="ALL">ALL PAYMENT</option>
            <option value="Paid">PAID</option>
            <option value="Unpaid">UNPAID</option>
          </select>
          <select value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)}
            className="px-2 py-2 border border-[#ddd] text-[11px] outline-none cursor-pointer font-bold">
            <option value="ALL">ALL METHODS</option>
            <option value="Cash on Delivery">COD</option>
            <option value="Full Payment">FULL PAYMENT</option>
          </select>
          <button onClick={() => { setShowArchived(!showArchived); setSearchTerm(''); }}
            className={`px-3 py-2 text-[10px] font-bold tracking-wider cursor-pointer border transition-colors ${showArchived ? 'bg-black text-white border-black' : 'bg-[#f0f0f0] text-black border-[#ddd]'}`}>
            {showArchived ? '← BACK' : 'ARCHIVED'}
          </button>
          <button onClick={exportToExcel}
            className="px-3 py-2 text-[10px] font-bold tracking-wider cursor-pointer border border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white transition-colors">
            ↓ EXCEL ({allFiltered.length})
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b-2 border-black">
              {['DATE','CUSTOMER','ADDRESS','ITEMS','SHIPPING','TOTAL','PAYMENT','INFO','CREATED BY','STATUS','ACTIONS','PDF'].map(h => (
                <th key={h} className="py-2.5 px-2 font-bold tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedOrders.length > 0 ? displayedOrders.map(order => (
              <tr key={order._id} className="border-b border-[#eee]">
                <td className="py-2.5 px-2">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="py-2.5 px-2">
                  <div className="font-bold">{order.customerName}</div>
                  <div className="text-[11px] text-gray-500">{order.phone}</div>
                </td>
                <td className="py-2.5 px-2 max-w-[180px]">
                  <div className="text-[11px] leading-relaxed">{order.address || '—'}</div>
                </td>
                <td className="py-2.5 px-2">
                  <div className="text-[11px]">
                    {order.items.map((item, i) => <div key={i}>{item.quantity}x {item.name}</div>)}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-[11px]">{order.shippingCost} TK</td>
                <td className="py-2.5 px-2 font-bold">{order.totalAmount.toLocaleString()} TK</td>
                <td className="py-2.5 px-2">
                  <div className="text-[10px] mb-1 font-bold">{order.paymentMethod}</div>
                  <select value={order.paymentStatus || 'Unpaid'} onChange={e => updatePaymentStatus(order._id, e.target.value)}
                    className={`p-1 text-[10px] font-bold border border-[#ddd] cursor-pointer outline-none ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Paid">Paid</option>
                  </select>
                </td>

                {/* ✅ INFO column — shows for ANY order with payment details, including COD */}
                <td className="py-2.5 px-2 text-center align-middle">
                  {hasPaymentDetails(order) ? (
                    <div className="flex flex-col gap-1 items-center justify-center">
                      <button
                        onClick={() => setSelectedPayment({
                          platform: order.paymentDetails?.platform || order.paymentMethod,
                          senderNumber: order.paymentDetails?.senderNumber || '—',
                          transactionId: order.paymentDetails?.transactionId || '—',
                          amountPaid: order.paymentDetails?.amountPaid || null,
                          screenshot: order.paymentDetails?.screenshot || null,
                        })}
                        className="bg-black text-white border-none px-2 py-1 text-[9px] cursor-pointer font-bold">
                        VIEW
                      </button>
                      <button
                        onClick={() => openEditPayment(order)}
                        className="bg-[#555] text-white border-none px-2 py-1 text-[9px] cursor-pointer font-bold">
                        EDIT
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-300 block text-center">—</span>
                  )}
                </td>

                <td className="py-2.5 px-2 text-[11px] text-gray-500">{order.createdBy || (order.isManual ? 'Admin' : 'Customer')}</td>
                <td className="py-2.5 px-2">
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${getStatusClass(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  {order.status !== 'Canceled' ? (
                    <select onChange={e => updateStatus(order._id, e.target.value)} value={order.status}
                      className="p-1 text-[10px] border border-[#ddd] outline-none">
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Canceled">Cancel Order</option>
                    </select>
                  ) : (
                    <button onClick={() => updateStatus(order._id, 'Pending')}
                      className="bg-[#222] text-white border-none px-3 py-1 cursor-pointer text-[10px]">RESTORE</button>
                  )}
                </td>
                <td className="py-2.5 px-2">
                  <button onClick={() => downloadReceipt(order)}
                    className="bg-white border border-black px-2 py-1 cursor-pointer text-[11px] font-bold">📄</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="12" className="text-center py-12 text-gray-300">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Payment Info Modal ── */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000]" onClick={() => setSelectedPayment(null)}>
          <div className="bg-white p-8 w-[350px] flex flex-col gap-2.5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[13px] tracking-[2px] m-0 font-bold">PAYMENT DETAILS</h3>
              <button onClick={() => setSelectedPayment(null)} className="bg-transparent border-none text-lg cursor-pointer text-gray-400">×</button>
            </div>
            <div className="flex flex-col gap-2.5">
              {selectedPayment.platform && (
                <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                  <span className="text-[10px] font-bold tracking-wider text-gray-400">PLATFORM</span>
                  <span className="text-xs text-gray-600">{selectedPayment.platform}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                <span className="text-[10px] font-bold tracking-wider text-gray-400">SENDER NUMBER</span>
                <span className="text-xs text-gray-600">{selectedPayment.senderNumber || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                <span className="text-[10px] font-bold tracking-wider text-gray-400">TRANSACTION ID</span>
                <span className="text-xs font-mono font-bold text-black tracking-wider">{selectedPayment.transactionId || '—'}</span>
              </div>
              {selectedPayment.amountPaid && (
                <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                  <span className="text-[10px] font-bold tracking-wider text-gray-400">AMOUNT PAID</span>
                  <span className="text-xs font-bold text-emerald-700">{selectedPayment.amountPaid} TK</span>
                </div>
              )}
            </div>
            {selectedPayment.screenshot && (
              <div className="mt-2">
                <p className="text-[10px] font-bold tracking-wider text-gray-400 mb-2">PAYMENT SCREENSHOT</p>
                <a href={selectedPayment.screenshot} target="_blank" rel="noreferrer">
                  <img src={selectedPayment.screenshot} alt="Payment proof" className="w-full max-h-[280px] object-contain border border-[#eee] cursor-zoom-in" />
                  <p className="text-[10px] text-gray-400 text-center mt-1">Click to open full size</p>
                </a>
              </div>
            )}
            <button onClick={() => setSelectedPayment(null)}
              className="bg-black text-white border-none p-2.5 cursor-pointer font-bold mt-4 tracking-wider">CLOSE</button>
          </div>
        </div>
      )}

      {/* ── Edit Payment Modal ── */}
      {editPaymentOrder && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000]" onClick={() => setEditPaymentOrder(null)}>
          <div className="bg-white p-8 w-[400px] flex flex-col gap-2.5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[13px] tracking-[2px] m-0 font-bold">EDIT PAYMENT INFO</h3>
              <button onClick={() => setEditPaymentOrder(null)} className="bg-transparent border-none text-lg cursor-pointer text-gray-400">×</button>
            </div>
            <p className="text-[11px] text-gray-400 mb-1">{editPaymentOrder.paymentMethod} — {editPaymentOrder.customerName}</p>
            <div className="flex flex-col gap-2.5">
              <input type="tel" placeholder="Sender Number" inputMode="numeric"
                value={editPaymentForm.senderNumber}
                onChange={e => setEditPaymentForm({ ...editPaymentForm, senderNumber: e.target.value.replace(/\D/g, '') })}
                className="p-2.5 border border-[#ddd] text-[13px] outline-none" />
              <input type="text" placeholder="Transaction ID"
                value={editPaymentForm.transactionId}
                onChange={e => setEditPaymentForm({ ...editPaymentForm, transactionId: e.target.value })}
                className="p-2.5 border border-[#ddd] text-[13px] outline-none" />
              <label className={`flex flex-col items-center gap-1.5 p-4 border-2 border-dashed cursor-pointer rounded transition-colors ${editPaymentForm.screenshot || editPaymentForm.screenshotUrl ? 'border-black bg-green-50' : 'border-[#ddd] bg-[#fafafa]'}`}>
                <span className="text-[11px] font-bold tracking-wider">
                  {editPaymentForm.screenshot ? '✓ ' + editPaymentForm.screenshot.name : editPaymentForm.screenshotUrl ? '✓ SCREENSHOT SAVED — CLICK TO REPLACE' : 'CLICK TO UPLOAD SCREENSHOT'}
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => setEditPaymentForm({ ...editPaymentForm, screenshot: e.target.files[0] })} />
              </label>
              {editPaymentForm.screenshotUrl && !editPaymentForm.screenshot && (
                <img src={editPaymentForm.screenshotUrl} alt="Current screenshot"
                  className="w-full max-h-[160px] object-contain border border-[#eee]" />
              )}
            </div>
            <button onClick={savePaymentDetails} disabled={editUploading}
              className={`bg-black text-white border-none p-2.5 cursor-pointer font-bold mt-4 tracking-wider transition-opacity ${editUploading ? 'opacity-60' : ''}`}>
              {editUploading ? 'SAVING...' : 'SAVE PAYMENT INFO'}
            </button>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default OrderList;