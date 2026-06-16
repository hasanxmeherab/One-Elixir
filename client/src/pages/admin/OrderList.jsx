import React, { useState, useEffect, useMemo } from 'react';
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
          className={`w-9 h-9 text-xs font-bold border transition-colors cursor-pointer ${n === page ? 'bg-black text-white border-black' : 'bg-white border-[#ddd] hover:border-black'
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
  const { orders = [], perfumes = [], fetchData } = useOutletContext();
  const toast = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [editPaymentOrder, setEditPaymentOrder] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' });
  const [editUploading, setEditUploading] = useState(false);
  const [page, setPage] = useState(1);

  // ── NEW: Date range filter ──
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── NEW: Bulk selection ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── NEW: Edit Order modal ──
  const [editOrder, setEditOrder] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // ── NEW: Order notes ──
  const [notesOrder, setNotesOrder] = useState(null);
  const [noteText, setNoteText] = useState('');

  // ── NEW: Customer history ──
  const [customerHistory, setCustomerHistory] = useState(null);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');

  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setPage(1); }, [searchTerm, paymentStatusFilter, paymentMethodFilter, orderStatusFilter, showArchived, dateFrom, dateTo]);

  if (!orders) return <div className="p-10 text-center">Loading Order Data...</div>;

  // ── Existing handlers (unchanged) ──
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

  // ── NEW: Full order edit ──
  const openEditOrder = (order) => {
    setEditForm({
      customerName: order.customerName,
      phone: order.phone,
      address: order.address || '',
      customerEmail: order.customerEmail || '',
      paymentMethod: order.paymentMethod,
      shippingCost: order.shippingCost || 0,
      orderDate: new Date(order.createdAt).toISOString().slice(0, 16),
      items: order.items.map(item => ({
        perfumeId: item.perfumeId || '',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        discountType: item.discountType || 'none',
        discountValue: item.discountValue || 0,
        finalItemPrice: item.finalItemPrice || item.price,
      })),
    });
    setEditOrder(order);
  };

  const calcEditTotal = (form) => {
    if (!form) return 0;
    const itemsTotal = form.items.reduce((sum, item) => {
      let price = item.price;
      if (item.discountType === 'percentage') price = price - (price * item.discountValue / 100);
      else if (item.discountType === 'fixed') price = price - (item.discountValue || 0);
      return sum + Math.max(0, price) * item.quantity;
    }, 0);
    return itemsTotal + (Number(form.shippingCost) || 0);
  };

  const saveEditOrder = async () => {
    if (!editForm.customerName || !editForm.phone) return toast.warning('Customer name and phone required.');
    if (editForm.items.length === 0) return toast.warning('At least one item required.');
    setEditSaving(true);
    try {
      const totalAmount = calcEditTotal(editForm);
      const items = editForm.items.map(item => {
        let finalPrice = item.price;
        if (item.discountType === 'percentage') finalPrice = item.price - (item.price * item.discountValue / 100);
        else if (item.discountType === 'fixed') finalPrice = item.price - (item.discountValue || 0);
        return { ...item, finalItemPrice: Math.max(0, finalPrice) };
      });
      await adminAxios.put(`${API_URL}/api/orders/${editOrder._id}`, {
        customerName: editForm.customerName,
        phone: editForm.phone,
        address: editForm.address,
        customerEmail: editForm.customerEmail,
        paymentMethod: editForm.paymentMethod,
        shippingCost: Number(editForm.shippingCost) || 0,
        totalAmount,
        items,
        createdAt: editForm.orderDate ? new Date(editForm.orderDate).toISOString() : undefined,
      });
      toast.success('Order updated successfully.');
      setEditOrder(null);
      setEditForm(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order.');
    } finally {
      setEditSaving(false);
    }
  };

  const addEditItem = () => {
    setEditForm(f => ({
      ...f,
      items: [...f.items, { perfumeId: '', name: '', price: 0, quantity: 1, discountType: 'none', discountValue: 0 }]
    }));
  };

  const removeEditItem = (idx) => {
    setEditForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateEditItem = (idx, field, value) => {
    setEditForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      // If selecting a perfume from dropdown, auto-fill name/price
      if (field === 'perfumeId' && value) {
        const p = perfumes.find(p => p._id === value);
        if (p) {
          items[idx].name = p.name;
          items[idx].price = p.price;
        }
      }
      return { ...f, items };
    });
  };

  // ── NEW: Bulk actions ──
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedOrders.map(o => o._id)));
    }
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const [type, value] = bulkAction.split(':');
      const body = { orderIds: [...selectedIds] };
      if (type === 'status') body.status = value;
      if (type === 'payment') body.paymentStatus = value;
      await adminAxios.put(`${API_URL}/api/orders/bulk-update`, body);
      toast.success(`${selectedIds.size} orders updated.`);
      setSelectedIds(new Set());
      setBulkAction('');
      fetchData();
    } catch { toast.error('Bulk update failed.'); }
    finally { setBulkLoading(false); }
  };

  // ── NEW: Notes ──
  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      const existingNotes = notesOrder.adminNotes || [];
      await adminAxios.put(`${API_URL}/api/orders/${notesOrder._id}`, {
        adminNotes: [...existingNotes, { text: noteText.trim(), adminName: adminData?.name || 'Admin' }]
      });
      toast.success('Note added.');
      setNoteText('');
      fetchData();
      // Refresh the notes order
      setNotesOrder(prev => ({
        ...prev,
        adminNotes: [...(prev.adminNotes || []), { text: noteText.trim(), adminName: adminData?.name || 'Admin', createdAt: new Date().toISOString() }]
      }));
    } catch { toast.error('Failed to add note.'); }
  };

  // ── NEW: Customer history ──
  const showCustomerHistory = (customerName, phone) => {
    const history = orders.filter(o => o.customerName === customerName || o.phone === phone);
    const totalSpent = history.filter(o => o.status?.toLowerCase() === 'delivered' && o.paymentStatus?.toLowerCase() === 'paid')
      .reduce((a, o) => a + (Number(o.totalAmount) || 0), 0);
    setCustomerHistory({ name: customerName, phone, orders: history, totalSpent });
  };

  // ── Receipt download (unchanged) ──
  const downloadReceipt = async (order) => {
    try {
      const doc = new jsPDF();

      const logoResponse = await fetch('/logos/OneElixir Text Logo Bk.png');
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(logoBlob);
      });

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
      'Date': new Date(order.createdAt).toLocaleDateString('en-GB'),
      'Order ID': order._id.slice(-6).toUpperCase(),
      'Customer': order.customerName,
      'Phone': order.phone,
      'Address': order.address || '',
      'Items': order.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
      'Shipping (TK)': order.shippingCost || 0,
      'Total (TK)': order.totalAmount,
      'Payment Method': order.paymentMethod,
      'Payment Status': order.paymentStatus || 'Unpaid',
      'Order Status': order.status,
      'Created By': order.createdBy || (order.isManual ? 'Admin' : 'Customer'),
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

  // ── Filtering (UPDATED: search by Order ID + date range) ──
  const baseFiltered = orders.filter(o => showArchived ? o.status === 'Canceled' : o.status !== 'Canceled');
  const allFiltered = baseFiltered.filter(order => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !s ||
      order.customerName.toLowerCase().includes(s) ||
      order.phone.includes(s) ||
      order._id.slice(-6).toUpperCase().includes(s.toUpperCase());
    const matchesPaymentStatus = paymentStatusFilter === 'ALL' || order.paymentStatus === paymentStatusFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter;
    const matchesOrderStatus = orderStatusFilter === 'ALL' || order.status === orderStatusFilter;
    // Date range filter
    let matchesDate = true;
    if (dateFrom) matchesDate = new Date(order.createdAt) >= new Date(dateFrom);
    if (dateTo && matchesDate) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      matchesDate = new Date(order.createdAt) <= to;
    }
    return matchesSearch && matchesPaymentStatus && matchesPaymentMethod && matchesOrderStatus && matchesDate;
  });
  const totalPages = Math.ceil(allFiltered.length / PAGE_SIZE);
  const displayedOrders = allFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getStatusClass = (status) => {
    if (status === 'Delivered') return 'bg-emerald-100 text-emerald-800';
    if (status === 'Canceled') return 'bg-red-100 text-red-800';
    if (status === 'Processing') return 'bg-blue-100 text-blue-800';
    if (status === 'Shipped') return 'bg-violet-100 text-violet-800';
    return 'bg-amber-100 text-amber-800';
  };

  const hasPaymentDetails = (order) =>
    !!(order.paymentDetails?.senderNumber || order.paymentDetails?.transactionId);

  return (
    <div className="w-full">
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h3 className="tracking-[2px] font-bold m-0">{showArchived ? 'ARCHIVED ORDERS' : 'ACTIVE ORDERS'}</h3>
        <div className="flex gap-2.5 flex-wrap items-center">
          <input type="text" placeholder="Search name / phone / ID..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-[#ddd] text-xs outline-none w-48" />
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

      {/* ── NEW: Date Range Filter ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[10px] font-bold text-[#888] tracking-wider">DATE RANGE:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-2 py-1.5 border border-[#ddd] text-[11px] outline-none" />
        <span className="text-[#aaa] text-xs">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-2 py-1.5 border border-[#ddd] text-[11px] outline-none" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-[10px] text-[#888] underline cursor-pointer bg-transparent border-none">CLEAR</button>
        )}
      </div>

      {/* ── NEW: Bulk Actions Bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-[#f5f5f5] border border-[#ddd]">
          <span className="text-[11px] font-bold">{selectedIds.size} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="px-2 py-1.5 border border-[#ddd] text-[11px] outline-none cursor-pointer font-bold">
            <option value="">— BULK ACTION —</option>
            <option value="status:Pending">Set Pending</option>
            <option value="status:Processing">Set Processing</option>
            <option value="status:Shipped">Set Shipped</option>
            <option value="status:Delivered">Set Delivered</option>
            <option value="status:Canceled">Cancel All</option>
            <option value="payment:Paid">Mark Paid</option>
            <option value="payment:Unpaid">Mark Unpaid</option>
          </select>
          <button onClick={executeBulkAction} disabled={!bulkAction || bulkLoading}
            className="px-3 py-1.5 text-[10px] font-bold bg-black text-white border-none cursor-pointer disabled:opacity-50">
            {bulkLoading ? 'APPLYING...' : 'APPLY'}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-[10px] text-[#888] underline cursor-pointer bg-transparent border-none ml-auto">DESELECT ALL</button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2.5 px-2 w-8">
                <input type="checkbox" checked={selectedIds.size === displayedOrders.length && displayedOrders.length > 0}
                  onChange={toggleSelectAll} className="cursor-pointer" />
              </th>
              {['DATE', 'ID', 'CUSTOMER', 'ADDRESS', 'ITEMS', 'SHIPPING', 'TOTAL', 'PAYMENT', 'INFO', 'NOTES', 'CREATED BY', 'STATUS', 'ACTIONS', 'EDIT', 'PDF'].map(h => (
                <th key={h} className="py-2.5 px-2 font-bold tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedOrders.length > 0 ? displayedOrders.map(order => (
              <tr key={order._id} className={`border-b border-[#eee] ${selectedIds.has(order._id) ? 'bg-blue-50' : ''}`}>
                <td className="py-2.5 px-2">
                  <input type="checkbox" checked={selectedIds.has(order._id)} onChange={() => toggleSelect(order._id)} className="cursor-pointer" />
                </td>
                <td className="py-2.5 px-2 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="py-2.5 px-2 font-mono text-[10px] text-[#888]">#{order._id.slice(-6).toUpperCase()}</td>
                <td className="py-2.5 px-2">
                  <div className="font-bold cursor-pointer hover:underline" onClick={() => showCustomerHistory(order.customerName, order.phone)}>
                    {order.customerName}
                  </div>
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
                <td className="py-2.5 px-2 text-center align-middle">
                  {hasPaymentDetails(order) ? (
                    <div className="flex flex-col gap-1 items-center justify-center">
                      <button onClick={() => setSelectedPayment({
                        platform: order.paymentDetails?.platform || order.paymentMethod,
                        senderNumber: order.paymentDetails?.senderNumber || '—',
                        transactionId: order.paymentDetails?.transactionId || '—',
                        amountPaid: order.paymentDetails?.amountPaid || null,
                        screenshot: order.paymentDetails?.screenshot || null,
                      })}
                        className="bg-black text-white border-none px-2 py-1 text-[9px] cursor-pointer font-bold">
                        VIEW
                      </button>
                      <button onClick={() => openEditPayment(order)}
                        className="bg-[#555] text-white border-none px-2 py-1 text-[9px] cursor-pointer font-bold">
                        EDIT
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-300 block text-center">—</span>
                  )}
                </td>
                {/* NOTES column */}
                <td className="py-2.5 px-2 text-center">
                  <button onClick={() => setNotesOrder(order)}
                    className="bg-transparent border border-[#ddd] px-2 py-1 text-[9px] cursor-pointer font-bold hover:border-black transition-colors relative">
                    📝 {(order.adminNotes?.length || 0) > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black text-white rounded-full text-[8px] flex items-center justify-center">
                        {order.adminNotes.length}
                      </span>
                    )}
                  </button>
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
                {/* EDIT button */}
                <td className="py-2.5 px-2">
                  <button onClick={() => openEditOrder(order)}
                    className="bg-blue-50 border border-blue-300 text-blue-700 px-2 py-1 cursor-pointer text-[10px] font-bold hover:bg-blue-100 transition-colors">
                    ✏️ EDIT
                  </button>
                </td>
                <td className="py-2.5 px-2">
                  <button onClick={() => downloadReceipt(order)}
                    className="bg-white border border-black px-2 py-1 cursor-pointer text-[11px] font-bold">📄</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="16" className="text-center py-12 text-gray-300">No orders found.</td></tr>
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

      {/* ── NEW: Full Edit Order Modal ── */}
      {editOrder && editForm && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000] overflow-y-auto py-10" onClick={() => { setEditOrder(null); setEditForm(null); }}>
          <div className="bg-white p-5 sm:p-6 w-[95vw] max-w-[650px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px] tracking-[2px] m-0 font-bold">EDIT ORDER #{editOrder._id.slice(-6).toUpperCase()}</h3>
              <button onClick={() => { setEditOrder(null); setEditForm(null); }} className="bg-transparent border-none text-lg cursor-pointer text-gray-400">×</button>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">CUSTOMER NAME *</label>
                <input value={editForm.customerName} onChange={e => setEditForm({ ...editForm, customerName: e.target.value })}
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">PHONE *</label>
                <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">ADDRESS</label>
                <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">EMAIL</label>
                <input value={editForm.customerEmail} onChange={e => setEditForm({ ...editForm, customerEmail: e.target.value })}
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">PAYMENT METHOD</label>
                <select value={editForm.paymentMethod} onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none cursor-pointer box-border">
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Full Payment">Full Payment</option>
                  <option value="Bkash">Bkash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">ORDER DATE</label>
                <input type="datetime-local" value={editForm.orderDate} onChange={e => setEditForm({ ...editForm, orderDate: e.target.value })}
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold tracking-wider text-[#888]">ORDER ITEMS</label>
                <button onClick={addEditItem}
                  className="text-[10px] font-bold border border-[#ddd] px-2 py-1 cursor-pointer hover:border-black transition-colors bg-white">
                  + ADD ITEM
                </button>
              </div>
              {editForm.items.map((item, idx) => {
                let itemSubtotal = item.price;
                if (item.discountType === 'percentage') itemSubtotal = itemSubtotal - (itemSubtotal * item.discountValue / 100);
                else if (item.discountType === 'fixed') itemSubtotal = itemSubtotal - (item.discountValue || 0);
                itemSubtotal = Math.max(0, itemSubtotal) * item.quantity;

                return (
                  <div key={idx} className="border border-[#eee] p-3 mb-2 rounded relative">
                    {editForm.items.length > 1 && (
                      <button onClick={() => removeEditItem(idx)}
                        className="absolute top-2 right-2 text-red-400 cursor-pointer bg-transparent border-none text-base hover:text-red-600">×</button>
                    )}
                    {/* Row 1: Product selector */}
                    <div className="mb-2">
                      <label className="text-[9px] text-[#aaa] block mb-0.5">Product</label>
                      <select value={item.perfumeId || ''} onChange={e => updateEditItem(idx, 'perfumeId', e.target.value)}
                        className="w-full p-1.5 border border-[#ddd] text-[11px] outline-none box-border">
                        <option value="">— Custom —</option>
                        {perfumes.map(p => <option key={p._id} value={p._id}>{p.name} ({p.price} TK)</option>)}
                      </select>
                      {!item.perfumeId && (
                        <input value={item.name} onChange={e => updateEditItem(idx, 'name', e.target.value)}
                          placeholder="Item name" className="w-full p-1.5 border border-[#ddd] text-[11px] outline-none mt-1 box-border" />
                      )}
                    </div>
                    {/* Row 2: Price, Qty, Discount, Subtotal */}
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="w-20">
                        <label className="text-[9px] text-[#aaa] block mb-0.5">Price</label>
                        <input type="number" value={item.price} onChange={e => updateEditItem(idx, 'price', Number(e.target.value))}
                          className="w-full p-1.5 border border-[#ddd] text-[11px] outline-none box-border" />
                      </div>
                      <div className="w-14">
                        <label className="text-[9px] text-[#aaa] block mb-0.5">Qty</label>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateEditItem(idx, 'quantity', Number(e.target.value) || 1)}
                          className="w-full p-1.5 border border-[#ddd] text-[11px] outline-none box-border" />
                      </div>
                      <div>
                        <label className="text-[9px] text-[#aaa] block mb-0.5">Discount</label>
                        <div className="flex gap-1">
                          <select value={item.discountType} onChange={e => updateEditItem(idx, 'discountType', e.target.value)}
                            className="p-1.5 border border-[#ddd] text-[10px] outline-none w-16">
                            <option value="none">None</option>
                            <option value="fixed">Fixed</option>
                            <option value="percentage">%</option>
                          </select>
                          {item.discountType !== 'none' && (
                            <input type="number" value={item.discountValue} onChange={e => updateEditItem(idx, 'discountValue', Number(e.target.value))}
                              className="p-1.5 border border-[#ddd] text-[10px] outline-none w-14 box-border" />
                          )}
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <label className="text-[9px] text-[#aaa] block mb-0.5">Subtotal</label>
                        <p className="text-[12px] font-bold m-0">{itemSubtotal.toLocaleString()} TK</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shipping + Total */}
            <div className="flex flex-wrap items-center gap-4 border-t border-[#eee] pt-4">
              <div>
                <label className="text-[10px] font-bold text-[#888] block mb-1">SHIPPING</label>
                <input type="number" value={editForm.shippingCost} onChange={e => setEditForm({ ...editForm, shippingCost: Number(e.target.value) })}
                  className="w-24 p-2 border border-[#ddd] text-sm outline-none box-border" />
              </div>
              <div className="ml-auto text-right">
                <span className="text-[10px] text-[#888] font-bold">GRAND TOTAL</span>
                <p className="text-xl font-bold m-0">{calcEditTotal(editForm).toLocaleString()} TK</p>
              </div>
            </div>

            <button onClick={saveEditOrder} disabled={editSaving}
              className="w-full bg-black text-white border-none p-3 cursor-pointer font-bold tracking-wider mt-5 hover:bg-gray-800 transition-colors disabled:opacity-60">
              {editSaving ? 'SAVING ORDER...' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      )}

      {/* ── NEW: Notes Modal ── */}
      {notesOrder && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000]" onClick={() => setNotesOrder(null)}>
          <div className="bg-white p-6 w-[420px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px] tracking-[2px] m-0 font-bold">ORDER NOTES</h3>
              <button onClick={() => setNotesOrder(null)} className="bg-transparent border-none text-lg cursor-pointer text-gray-400">×</button>
            </div>
            <p className="text-[11px] text-[#888] mb-3">#{notesOrder._id.slice(-6).toUpperCase()} — {notesOrder.customerName}</p>

            {/* Existing notes */}
            <div className="flex-1 overflow-y-auto mb-4 max-h-[300px]">
              {(!notesOrder.adminNotes || notesOrder.adminNotes.length === 0) ? (
                <p className="text-xs text-[#ccc] text-center py-6">No notes yet.</p>
              ) : (
                notesOrder.adminNotes.map((note, i) => (
                  <div key={i} className="border-b border-[#f0f0f0] py-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-[#555]">{note.adminName}</span>
                      <span className="text-[9px] text-[#aaa]">{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-[12px] text-[#333] leading-relaxed">{note.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add note */}
            <div className="flex gap-2 border-t border-[#eee] pt-3">
              <input value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note..." onKeyDown={e => e.key === 'Enter' && addNote()}
                className="flex-1 p-2.5 border border-[#ddd] text-[13px] outline-none" />
              <button onClick={addNote} disabled={!noteText.trim()}
                className="bg-black text-white border-none px-4 cursor-pointer font-bold text-[11px] disabled:opacity-40">
                ADD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Customer History Side Panel ── */}
      {customerHistory && (
        <div className="fixed inset-0 bg-black/80 flex justify-end z-[3000]" onClick={() => setCustomerHistory(null)}>
          <div className="bg-white w-[450px] h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px] tracking-[2px] m-0 font-bold">CUSTOMER HISTORY</h3>
              <button onClick={() => setCustomerHistory(null)} className="bg-transparent border-none text-lg cursor-pointer text-gray-400">×</button>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-bold mb-1">{customerHistory.name}</h4>
              <p className="text-sm text-[#666]">{customerHistory.phone}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-[#f9f9f9] border border-[#eee] text-center">
                <p className="text-[10px] font-bold text-[#888] tracking-wider">TOTAL ORDERS</p>
                <p className="text-xl font-bold">{customerHistory.orders.length}</p>
              </div>
              <div className="p-3 bg-[#f9f9f9] border border-[#eee] text-center">
                <p className="text-[10px] font-bold text-[#888] tracking-wider">TOTAL SPENT</p>
                <p className="text-xl font-bold">{customerHistory.totalSpent.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-[#f9f9f9] border border-[#eee] text-center">
                <p className="text-[10px] font-bold text-[#888] tracking-wider">AVG ORDER</p>
                <p className="text-xl font-bold">
                  {customerHistory.orders.length ? Math.round(customerHistory.totalSpent / customerHistory.orders.filter(o => o.status?.toLowerCase() === 'delivered').length || 1).toLocaleString() : 0}
                </p>
              </div>
            </div>

            <p className="text-[10px] font-bold text-[#888] tracking-wider mb-3">ORDER HISTORY</p>
            {customerHistory.orders.map(o => (
              <div key={o._id} className="border-b border-[#f0f0f0] py-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-mono text-[#888]">#{o._id.slice(-6).toUpperCase()}</span>
                  <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${getStatusClass(o.status)}`}>{o.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[#666]">{new Date(o.createdAt).toLocaleDateString()}</span>
                  <span className="text-[12px] font-bold">{o.totalAmount.toLocaleString()} TK</span>
                </div>
                <div className="text-[10px] text-[#999] mt-1">
                  {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default OrderList;