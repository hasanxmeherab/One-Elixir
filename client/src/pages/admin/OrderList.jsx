import React, { useState, useEffect, useMemo } from 'react';
import adminAxios from '../../utils/adminAxios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { outstandingAmount } from '../../utils/customerProfiles';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import PaymentDetailsModal from './order-modals/PaymentDetailsModal';
import EditPaymentModal from './order-modals/EditPaymentModal';
import EditOrderModal from './order-modals/EditOrderModal';
import OrderNotesModal from './order-modals/OrderNotesModal';
import CustomerHistoryDrawer from './order-modals/CustomerHistoryDrawer';
import PaymentReceiverModal from './order-modals/PaymentReceiverModal';
import PartialPaymentModal from './order-modals/PartialPaymentModal';
import OrderTable from './order-modals/OrderTable';
import OrderDetailsDrawer from './order-modals/OrderDetailsDrawer';
import { togglePageSelection, isPageSelected } from '../../utils/orderSelection';


const PAGE_SIZE = 15;

const OrderList = () => {
  const [query] = useSearchParams();
  const [dueOnly, setDueOnly] = useState(query.get('due') === '1');
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
  const [viewOrderId, setViewOrderId] = useState(null);
  const viewOrder = orders.find(order => order._id === viewOrderId);
  useEffect(() => {
    setOrderStatusFilter(['Pending', 'Processing', 'Shipped', 'Delivered', 'Canceled'].includes(query.get('status')) ? query.get('status') : 'ALL');
    setPaymentStatusFilter(['Paid', 'Unpaid', 'Partial', 'Pending Verification'].includes(query.get('payment')) ? query.get('payment') : 'ALL');
    setDueOnly(query.get('due') === '1');
    setViewOrderId(query.get('order'));
    setPage(1);
  }, [query]);

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

  // ── NEW: Payment Receiver Modal ──
  const [receiverModal, setReceiverModal] = useState(null); // { orderId, currentStatus } or { bulk: true }
  const [adminList, setAdminList] = useState([]);

  // ── Partial Payment Modal ──
  const [partialPaymentOrder, setPartialPaymentOrder] = useState(null);
  const [partialSaving, setPartialSaving]   = useState(false);
  const [partialDeleting, setPartialDeleting] = useState(null); // paymentId being deleted
  const [selectedReceiver, setSelectedReceiver] = useState(null);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');



  useEffect(() => { setPage(1); }, [searchTerm, paymentStatusFilter, paymentMethodFilter, orderStatusFilter, showArchived, dateFrom, dateTo, dueOnly]);
  useEffect(() => { setSelectedIds(new Set()); }, [searchTerm, paymentStatusFilter, paymentMethodFilter, orderStatusFilter, showArchived, dateFrom, dateTo, dueOnly]);

  // Fetch admin list for payment receiver selection
  useEffect(() => {
    adminAxios.get(`${API_URL}/api/admins/list`)
      .then(res => setAdminList(res.data))
      .catch(() => {});
  }, [API_URL]);

  if (!orders) return <div className="p-10 text-center">Loading Order Data...</div>;

  // ── Existing handlers (updated for payment receiver) ──
  const updatePaymentStatus = async (id, paymentStatus, receiverInfo) => {
    if (paymentStatus === 'Partial') {
      const order = orders.find(order => order._id === id);
      if (!order) { toast.error('Order not found. Please refresh the order list.'); return; }
      setViewOrderId(null);
      setPartialPaymentOrder(order);
      return;
    }
    // If marking as Paid and no receiver yet, show the modal
    if (paymentStatus === 'Paid' && !receiverInfo) {
      setReceiverModal({ orderId: id });
      setSelectedReceiver(adminData?.id || null);
      return;
    }
    try {
      const body = { paymentStatus };
      if (paymentStatus === 'Paid' && receiverInfo) {
        body.paymentReceivedBy = receiverInfo;
      }
      await adminAxios.put(`${API_URL}/api/orders/${id}`, body);
      fetchData();
    }
    catch { toast.error('Failed to update payment status'); }
  };

  const confirmPaymentReceiver = () => {
    if (!selectedReceiver) return toast.warning('Please select who received the payment.');
    const admin = adminList.find(a => a._id === selectedReceiver);
    if (!admin) return toast.error('Admin not found.');
    const receiverInfo = { adminId: admin._id, adminName: admin.name };

    if (receiverModal.bulk) {
      // Bulk mark as paid
      executeBulkPaid(receiverInfo);
    } else {
      updatePaymentStatus(receiverModal.orderId, 'Paid', receiverInfo);
    }
    setReceiverModal(null);
    setSelectedReceiver(null);
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
      discountApplied: order.discountApplied || 0,
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
    const discount = Number(form.discountApplied) || 0;
    return Math.max(0, itemsTotal + (Number(form.shippingCost) || 0) - discount);
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
        discountApplied: Number(editForm.discountApplied) || 0,
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
    setSelectedIds(previous => togglePageSelection(previous, displayedOrders));
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const [type, value] = bulkAction.split(':');
      // If marking as Paid, intercept and show receiver modal
      if (type === 'payment' && value === 'Paid') {
        setReceiverModal({ bulk: true });
        setSelectedReceiver(adminData?.id || null);
        return;
      }
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

  // Bulk paid with receiver info (called from modal)
  const executeBulkPaid = async (receiverInfo) => {
    setBulkLoading(true);
    try {
      const body = {
        orderIds: [...selectedIds],
        paymentStatus: 'Paid',
        paymentReceivedBy: receiverInfo
      };
      await adminAxios.put(`${API_URL}/api/orders/bulk-update`, body);
      toast.success(`${selectedIds.size} orders marked as Paid.`);
      setSelectedIds(new Set());
      setBulkAction('');
      fetchData();
    } catch { toast.error('Bulk paid update failed.'); }
    finally { setBulkLoading(false); }
  };

  // ── Partial Payment ──
  const savePartialPayment = async ({ amount, method, note, receiverAdminId }) => {
    if (!partialPaymentOrder || partialSaving) return false;
    setPartialSaving(true);
    try {
      const res = await adminAxios.post(`${API_URL}/api/orders/${partialPaymentOrder._id}/partial-payment`, { amount, method, note, receiverAdminId });
      toast.success(`${amount.toLocaleString()} TK recorded successfully.`);
      // Update the modal order in-place so history shows immediately
      setPartialPaymentOrder(res.data.order);
      fetchData();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record partial payment.');
      return false;
    } finally {
      setPartialSaving(false);
    }
  };

  const deletePartialPayment = async (paymentId) => {
    if (!partialPaymentOrder) return;
    setPartialDeleting(paymentId);
    try {
      const res = await adminAxios.delete(`${API_URL}/api/orders/${partialPaymentOrder._id}/partial-payment/${paymentId}`);
      toast.success('Partial payment removed.');
      setPartialPaymentOrder(res.data.order);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove partial payment.');
    } finally {
      setPartialDeleting(null);
    }
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

      // ── Logo watermark slightly below center of page ──
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const wmWidth = 120;
      const wmHeight = 30;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight / 2) + 30; // slightly below center
      const gState = new doc.GState({ opacity: 0.08 });
      doc.saveGraphicsState();
      doc.setGState(gState);
      doc.addImage(logoDataUrl, 'PNG', wmX, wmY, wmWidth, wmHeight);
      doc.restoreGraphicsState();

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
  const baseFiltered = orders.filter(o => showArchived ? ['canceled', 'cancelled'].includes(String(o.status).toLowerCase()) : !['canceled', 'cancelled'].includes(String(o.status).toLowerCase()));
  const allFiltered = baseFiltered.filter(order => {
    const s = searchTerm.trim().toLowerCase();
    const matchesSearch = !s ||
      order.customerName.toLowerCase().includes(s) ||
      order.phone.includes(s) ||
      order._id.toLowerCase().includes(s.replace(/^#/, ''));
    const orderPaymentStatus = order.paymentStatus || 'Unpaid';
    const matchesPaymentStatus = paymentStatusFilter === 'ALL' ||
      orderPaymentStatus.toLowerCase() === paymentStatusFilter.toLowerCase();
    const matchesPaymentMethod = paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter;
    const matchesOrderStatus = orderStatusFilter === 'ALL' || order.status === orderStatusFilter;
    // Date range filter
    let matchesDate = true;
    if (dateFrom) matchesDate = new Date(order.createdAt) >= new Date(`${dateFrom}T00:00:00+06:00`);
    if (dateTo && matchesDate) {
      const to = new Date(`${dateTo}T23:59:59.999+06:00`);
      matchesDate = new Date(order.createdAt) <= to;
    }
    return matchesSearch && matchesPaymentStatus && matchesPaymentMethod && matchesOrderStatus && matchesDate && (!dueOnly || outstandingAmount(order) > 0);
  });
  const totalPages = Math.max(1, Math.ceil(allFiltered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const displayedOrders = allFiltered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const isUnpaidSelected = paymentStatusFilter.toLowerCase() === 'unpaid';

  // Stats for unpaid orders matching current filters
  const unpaidStats = useMemo(() => {
    if (!isUnpaidSelected) {
      return {
        totalAmount: 0,
        count: 0,
        deliveredAmount: 0,
        deliveredCount: 0,
        shippedAmount: 0,
        shippedCount: 0,
        processingAmount: 0,
        processingCount: 0,
        pendingAmount: 0,
        pendingCount: 0,
      };
    }

    let totalAmount = 0;
    let deliveredAmount = 0;
    let deliveredCount = 0;
    let shippedAmount = 0;
    let shippedCount = 0;
    let processingAmount = 0;
    let processingCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    allFiltered.forEach(order => {
      const amt = order.amountDue != null 
        ? Math.max(0, Number(order.amountDue)) 
        : Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.amountPaid) || 0));
      totalAmount += amt;

      const status = (order.status || '').toLowerCase();
      if (status === 'delivered') {
        deliveredAmount += amt;
        deliveredCount++;
      } else if (status === 'shipped') {
        shippedAmount += amt;
        shippedCount++;
      } else if (status === 'processing') {
        processingAmount += amt;
        processingCount++;
      } else if (status === 'pending') {
        pendingAmount += amt;
        pendingCount++;
      }
    });

    return {
      totalAmount,
      count: allFiltered.length,
      deliveredAmount,
      deliveredCount,
      shippedAmount,
      shippedCount,
      processingAmount,
      processingCount,
      pendingAmount,
      pendingCount,
    };
  }, [allFiltered, isUnpaidSelected]);

  // Overall unpaid stats across all active/archived orders in this view (ignoring search/date filters)
  const overallUnpaidStats = useMemo(() => {
    if (!isUnpaidSelected) return { totalAmount: 0, count: 0 };
    const allUnpaid = baseFiltered.filter(
      o => (o.paymentStatus || 'Unpaid').toLowerCase() === 'unpaid'
    );
    const totalAmount = allUnpaid.reduce(
      (sum, o) => sum + (Number(o.totalAmount) || 0),
      0
    );
    return { totalAmount, count: allUnpaid.length };
  }, [baseFiltered, isUnpaidSelected]);

  const getStatusClass = (status) => {
    if (status === 'Delivered') return 'bg-emerald-100 text-emerald-800';
    if (status === 'Canceled') return 'bg-red-100 text-red-800';
    if (status === 'Processing') return 'bg-blue-100 text-blue-800';
    if (status === 'Shipped') return 'bg-violet-100 text-violet-800';
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="order-list max-w-[1500px]! [margin:0_auto]! pb-[64px]! text-[#242424]! [font-family:'Jost',_sans-serif]! [&_button:focus-visible]:[outline:2px_solid_#dc4939]! [&_button:focus-visible]:[outline-offset:3px]! [&_summary:focus-visible]:[outline:2px_solid_#dc4939]! [&_summary:focus-visible]:[outline-offset:3px]!">
      <header className="ol-header flex! items-center! justify-between! gap-[24px]! mb-[28px]! [&_h1]:[font:600_clamp(26px,_3vw,_38px)/1.2_'Playfair_Display',_serif]! [&_h1]:m-[0]! [&_h1]:tracking-[-.7px]! [&_>_div_>_p:last-child]:text-[#888]! [&_>_div_>_p:last-child]:text-[14px]! [&_>_div_>_p:last-child]:[margin:12px_0_0]! max-[1100px]:items-start! max-[1100px]:flex-col!"><div><p className="ol-eyebrow text-[#dc4939]! text-[11px]! font-bold! tracking-[2px]! [margin:0_0_10px]!">SALES / ORDERS</p><h1>{showArchived ? 'Archived orders.' : 'Every order, at a glance.'}</h1><p>Track fulfilment, follow up on payments, and keep customers informed.</p></div><div className="ol-header-actions flex! flex-wrap! gap-[8px]!"><button className="ol-button inline-flex! justify-center! items-center! gap-[6px]! bg-[white]! [border:1px_solid_#e2e2df]! rounded-[7px]! [padding:9px_12px]! text-[#444]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [&:hover]:bg-[#f5f5f3]! [&.ol-export]:bg-[#222]! [&.ol-export]:text-[white]! [&.ol-export]:[border-color:#222]! [&.ol-export:hover]:bg-[#444]! [&.ol-mobile-select]:hidden! max-[1100px]:[&.ol-mobile-select]:inline-flex! max-[1100px]:[&.ol-mobile-select]:mb-[14px]!" onClick={() => { setShowArchived(!showArchived); setOrderStatusFilter('ALL'); setSearchTerm(''); }}>{showArchived ? 'Back to active orders' : 'Archived orders'}</button><button className="ol-button inline-flex! justify-center! items-center! gap-[6px]! bg-[white]! [border:1px_solid_#e2e2df]! rounded-[7px]! [padding:9px_12px]! text-[#444]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! whitespace-nowrap! [&:hover]:bg-[#f5f5f3]! [&.ol-export]:bg-[#222]! [&.ol-export]:text-[white]! [&.ol-export]:[border-color:#222]! [&.ol-export:hover]:bg-[#444]! [&.ol-mobile-select]:hidden! max-[1100px]:[&.ol-mobile-select]:inline-flex! max-[1100px]:[&.ol-mobile-select]:mb-[14px]! ol-export" onClick={exportToExcel}>Export Excel ({allFiltered.length})</button></div></header>
      <nav className="ol-status-tabs flex! gap-[5px]! [border:1px_solid_#ececea]! rounded-[11px]! p-[5px]! bg-[#f5f5f4]! overflow-x-auto! mb-[22px]! [&_button]:flex! [&_button]:[flex:1_0_auto]! [&_button]:justify-center! [&_button]:items-center! [&_button]:gap-[9px]! [&_button]:[padding:11px_14px]! [&_button]:[border:0]! [&_button]:rounded-[7px]! [&_button]:bg-[transparent]! [&_button]:text-[#888]! [&_button]:[font:500_12px_'Jost',_sans-serif]! [&_button]:cursor-pointer! [&_button.active]:bg-[white]! [&_button.active]:text-[#222]! [&_button.active]:[box-shadow:0_1px_5px_#0000000d]! [&_span]:bg-[#eae9e6]! [&_span]:[padding:1px_6px]! [&_span]:rounded-[4px]! [&_span]:text-[10px]!" aria-label="Order status">{['ALL', ...(showArchived ? ['Canceled'] : ['Pending', 'Processing', 'Shipped', 'Delivered'])].map(status => <button key={status} className={orderStatusFilter === status ? 'active' : ''} aria-pressed={orderStatusFilter === status} onClick={() => setOrderStatusFilter(status)}>{status === 'ALL' ? 'All orders' : status}<span>{baseFiltered.filter(order => status === 'ALL' || order.status === status).length}</span></button>)}</nav>
      <div className="ol-toolbar flex! items-start! gap-[14px]! [&_label]:flex! [&_label]:flex-col! [&_label]:gap-[7px]! [&_label]:text-[#888]! [&_label]:text-[11px]! [&_input]:w-[100%]! [&_input]:min-w-[0]! [&_input]:[padding:11px_12px]! [&_input]:[border:1px_solid_#e2e2df]! [&_input]:rounded-[8px]! [&_input]:bg-[white]! [&_input]:text-[#444]! [&_input]:[font:400_13px_'Jost',_sans-serif]! [&_input]:[outline:none]! [&_select]:w-[100%]! [&_select]:min-w-[0]! [&_select]:[padding:11px_12px]! [&_select]:[border:1px_solid_#e2e2df]! [&_select]:rounded-[8px]! [&_select]:bg-[white]! [&_select]:text-[#444]! [&_select]:[font:400_13px_'Jost',_sans-serif]! [&_select]:[outline:none]! [&_input:focus]:[border-color:#dc4939]! [&_input:focus]:[box-shadow:0_0_0_3px_#dc493914]! [&_select:focus]:[border-color:#dc4939]! [&_select:focus]:[box-shadow:0_0_0_3px_#dc493914]! max-[600px]:flex-col!"><label className="ol-search [flex:1]! max-w-[480px]! max-[600px]:w-[100%]!">Search orders<input type="search" placeholder="Customer name, phone, or order ID…" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /></label>
        <details className="ol-filters [flex:1]! pt-[23px]! [&_>_summary]:w-[fit-content]! [&_>_summary]:[border:1px_solid_#e2e2df]! [&_>_summary]:rounded-[8px]! [&_>_summary]:[padding:11px_14px]! [&_>_summary]:text-[12px]! [&_>_summary]:text-[#555]! [&_>_summary]:cursor-pointer! max-[600px]:w-[100%]! max-[600px]:pt-[0]!"><summary>Filters{[paymentStatusFilter !== 'ALL', paymentMethodFilter !== 'ALL', Boolean(dateFrom || dateTo)].filter(Boolean).length > 0 && <span> · Active</span>}</summary><div className="ol-filter-fields grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[12px]! mt-[12px]! [border:1px_solid_#eee]! rounded-[10px]! p-[16px]! bg-[#fafaf8]! max-[600px]:[grid-template-columns:minmax(0,_1fr)]!">
          <label>Payment status<select value={paymentStatusFilter} onChange={event => setPaymentStatusFilter(event.target.value)}>{['ALL', 'Paid', 'Unpaid', 'Partial', 'Pending Verification'].map(status => <option key={status} value={status}>{status === 'ALL' ? 'All payments' : status}</option>)}</select></label>
          <label>Payment method<select value={paymentMethodFilter} onChange={event => setPaymentMethodFilter(event.target.value)}>{['ALL', ...new Set(['Cash on Delivery', 'Full Payment', 'Bkash', 'Nagad', 'Bank Transfer', ...orders.map(order => order.paymentMethod).filter(Boolean)])].map(method => <option key={method} value={method}>{method === 'ALL' ? 'All methods' : method}</option>)}</select></label>
          <label>From date<input type="date" value={dateFrom} max={dateTo || undefined} onChange={event => setDateFrom(event.target.value)} /></label><label>To date<input type="date" value={dateTo} min={dateFrom || undefined} onChange={event => setDateTo(event.target.value)} /></label>
          <button className="ol-text-button [border:0]! bg-[transparent]! p-[0]! text-[#a75449]! [font:500_12px_'Jost',_sans-serif]! cursor-pointer! text-left!" onClick={() => { setPaymentStatusFilter('ALL'); setPaymentMethodFilter('ALL'); setDateFrom(''); setDateTo(''); }}>Clear filters</button>
        </div></details>
      </div><p className="ol-results text-[#999]! text-[11px]! [margin:15px_0]!">{allFiltered.length} matching {allFiltered.length === 1 ? 'order' : 'orders'} · Page {currentPage} of {totalPages}{selectedIds.size > 0 ? ` · ${selectedIds.size} selected across pages` : ''}</p>
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

      {/* ── Unpaid Summary Banner ── */}
      {isUnpaidSelected && (
        <div className="mb-5 p-4 sm:p-5 bg-gradient-to-r from-red-50 via-rose-50/60 to-amber-50/40 border border-red-200 border-l-4 border-l-red-600 rounded-sm shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Primary Stat */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 font-extrabold text-2xl shrink-0 shadow-xs">
                ৳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-red-800">
                    Total Unpaid Amount
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-600 text-white tracking-wide">
                    {unpaidStats.count} {unpaidStats.count === 1 ? 'ORDER' : 'ORDERS'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-red-950 tracking-tight mt-0.5">
                  {unpaidStats.totalAmount.toLocaleString()}{' '}
                  <span className="text-base font-bold text-red-700">TK</span>
                </div>
                {allFiltered.length !== overallUnpaidStats.count && (
                  <p className="text-[11px] text-red-700 m-0 mt-1">
                    Filtered view ({unpaidStats.count} of {overallUnpaidStats.count} unpaid orders). Total across all unpaid:{' '}
                    <span className="font-bold underline">{overallUnpaidStats.totalAmount.toLocaleString()} TK</span>
                  </p>
                )}
              </div>
            </div>

            {/* Status Breakdown Pills */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
              {unpaidStats.deliveredCount > 0 && (
                <button
                  type="button"
                  title="Click to filter by Delivered"
                  onClick={() => setOrderStatusFilter(orderStatusFilter === 'Delivered' ? 'ALL' : 'Delivered')}
                  className={`px-3 py-2 border rounded-sm text-left transition-all cursor-pointer ${
                    orderStatusFilter === 'Delivered'
                      ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white border-emerald-200 hover:border-emerald-400'
                  }`}
                >
                  <div className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Delivered (Due)
                  </div>
                  <div className="text-sm font-bold text-emerald-950 mt-0.5">
                    {unpaidStats.deliveredAmount.toLocaleString()} TK
                  </div>
                  <div className="text-[10px] text-gray-500">{unpaidStats.deliveredCount} orders</div>
                </button>
              )}

              {unpaidStats.shippedCount > 0 && (
                <button
                  type="button"
                  title="Click to filter by Shipped"
                  onClick={() => setOrderStatusFilter(orderStatusFilter === 'Shipped' ? 'ALL' : 'Shipped')}
                  className={`px-3 py-2 border rounded-sm text-left transition-all cursor-pointer ${
                    orderStatusFilter === 'Shipped'
                      ? 'bg-violet-100 border-violet-500 ring-2 ring-violet-500/20'
                      : 'bg-white border-violet-200 hover:border-violet-400'
                  }`}
                >
                  <div className="text-[9px] font-bold text-violet-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                    Shipped
                  </div>
                  <div className="text-sm font-bold text-violet-950 mt-0.5">
                    {unpaidStats.shippedAmount.toLocaleString()} TK
                  </div>
                  <div className="text-[10px] text-gray-500">{unpaidStats.shippedCount} orders</div>
                </button>
              )}

              {unpaidStats.processingCount > 0 && (
                <button
                  type="button"
                  title="Click to filter by Processing"
                  onClick={() => setOrderStatusFilter(orderStatusFilter === 'Processing' ? 'ALL' : 'Processing')}
                  className={`px-3 py-2 border rounded-sm text-left transition-all cursor-pointer ${
                    orderStatusFilter === 'Processing'
                      ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-white border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="text-[9px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Processing
                  </div>
                  <div className="text-sm font-bold text-blue-950 mt-0.5">
                    {unpaidStats.processingAmount.toLocaleString()} TK
                  </div>
                  <div className="text-[10px] text-gray-500">{unpaidStats.processingCount} orders</div>
                </button>
              )}

              {unpaidStats.pendingCount > 0 && (
                <button
                  type="button"
                  title="Click to filter by Pending"
                  onClick={() => setOrderStatusFilter(orderStatusFilter === 'Pending' ? 'ALL' : 'Pending')}
                  className={`px-3 py-2 border rounded-sm text-left transition-all cursor-pointer ${
                    orderStatusFilter === 'Pending'
                      ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-white border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <div className="text-[9px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Pending
                  </div>
                  <div className="text-sm font-bold text-amber-950 mt-0.5">
                    {unpaidStats.pendingAmount.toLocaleString()} TK
                  </div>
                  <div className="text-[10px] text-gray-500">{unpaidStats.pendingCount} orders</div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {dueOnly && <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><span>Showing orders with a remaining customer balance.</span><button className="cursor-pointer border-0 bg-transparent underline" onClick={() => setDueOnly(false)}>Show all balances</button></div>}
      <OrderTable orders={displayedOrders} selectedIds={selectedIds} allSelected={isPageSelected(selectedIds, displayedOrders)} onSelect={toggleSelect} onSelectAll={toggleSelectAll} onView={setViewOrderId} onEdit={openEditOrder} onReceipt={downloadReceipt} onNotes={setNotesOrder} />
      <OrderDetailsDrawer order={viewOrder} onClose={() => setViewOrderId(null)} onStatus={updateStatus}
        onPaymentStatus={(id, status) => { if (status === 'Paid') setViewOrderId(null); updatePaymentStatus(id, status); }}
        onAction={(action, order) => {
          setViewOrderId(null);
          if (action === 'history') showCustomerHistory(order.customerName, order.phone);
          if (action === 'edit') openEditOrder(order);
          if (action === 'receipt') downloadReceipt(order);
          if (action === 'notes') setNotesOrder(order);
          if (action === 'editPayment') openEditPayment(order);
          if (action === 'partial') setPartialPaymentOrder(order);
          if (action === 'receiver') { setReceiverModal({ orderId: order._id }); setSelectedReceiver(order.paymentReceivedBy?.adminId || adminData?.id || null); }
          if (action === 'payment') setSelectedPayment({ platform: order.paymentDetails?.platform || order.paymentMethod, senderNumber: order.paymentDetails?.senderNumber || '—', transactionId: order.paymentDetails?.transactionId || '—', amountPaid: order.paymentDetails?.amountPaid ?? order.amountPaid ?? null, screenshot: order.paymentDetails?.screenshot || null });
        }} />
      {/* ── Payment Info Modal ── */}
      <PaymentDetailsModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />

      {/* ── Edit Payment Modal ── */}
      <EditPaymentModal
        order={editPaymentOrder}
        form={editPaymentForm}
        setForm={setEditPaymentForm}
        uploading={editUploading}
        onSave={savePaymentDetails}
        onClose={() => setEditPaymentOrder(null)}
      />

      {/* ── Full Edit Order Modal ── */}
      <EditOrderModal
        editOrder={editOrder}
        editForm={editForm}
        setEditForm={setEditForm}
        perfumes={perfumes}
        addEditItem={addEditItem}
        removeEditItem={removeEditItem}
        updateEditItem={updateEditItem}
        calcEditTotal={calcEditTotal}
        editSaving={editSaving}
        onSave={saveEditOrder}
        onClose={() => { setEditOrder(null); setEditForm(null); }}
      />

      {/* ── Notes Modal ── */}
      <OrderNotesModal
        order={notesOrder}
        noteText={noteText}
        setNoteText={setNoteText}
        onAddNote={addNote}
        onClose={() => setNotesOrder(null)}
      />

      {/* ── Customer History Side Panel ── */}
      <CustomerHistoryDrawer
        customerHistory={customerHistory}
        getStatusClass={getStatusClass}
        onClose={() => setCustomerHistory(null)}
      />

      {/* ── Payment Receiver Selection Modal ── */}
      <PaymentReceiverModal
        receiverModal={receiverModal}
        selectedReceiver={selectedReceiver}
        setSelectedReceiver={setSelectedReceiver}
        adminList={adminList}
        adminData={adminData}
        selectedCount={selectedIds.size}
        onConfirm={confirmPaymentReceiver}
        onClose={() => { setReceiverModal(null); setSelectedReceiver(null); }}
      />

      {/* ── Partial Payment Modal ── */}
      <PartialPaymentModal
        adminList={adminList}
        key={partialPaymentOrder?._id || 'closed'}
        order={partialPaymentOrder}
        saving={partialSaving}
        deleting={partialDeleting}
        onSave={savePartialPayment}
        onDelete={deletePartialPayment}
        onClose={() => setPartialPaymentOrder(null)}
      />

      <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default OrderList;
