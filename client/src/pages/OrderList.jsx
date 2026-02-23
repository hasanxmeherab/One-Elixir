import React, { useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const OrderList = () => {
  const toast = useToast();
  const { orders = [], fetchData } = useOutletContext();
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  if (!orders) {
    return <div className="p-10 text-center">Loading Order Data...</div>;
  }

  const updatePaymentStatus = async (id, paymentStatus) => {
    try {
      await axios.put(`${API_URL}/api/orders/${id}`, { paymentStatus });
      fetchData();
    } catch (err) { toast.error("Failed to update payment status."); }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/orders/${id}`, { status });
      fetchData();
      toast.success(`Order status updated to ${status}.`);
    } catch (err) { toast.error("Failed to update order status."); }
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
      if (order.createdBy) doc.text(`Processed By: ${order.createdBy}`, 20, 83);
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
        return [item.name, qty, `${itemPrice.toLocaleString()} TK`, discLabel, `${(finalPrice * qty).toLocaleString()} TK`];
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
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusClass = (status) => {
    const base = 'px-2 py-0.5 rounded-sm text-[10px] font-bold';
    if (status === 'Delivered') return `${base} bg-green-100 text-green-800`;
    if (status === 'Canceled') return `${base} bg-red-100 text-red-800`;
    if (status === 'Processing') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-yellow-100 text-yellow-800`;
  };

  const getPaymentSelectClass = (status) =>
    `p-1 text-[10px] font-bold border border-[#ddd] cursor-pointer ${status === 'Paid' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'}`;

  return (
    <div className="w-full">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h3 className="tracking-[2px] m-0 font-bold">
          {showArchived ? 'ARCHIVED ORDERS' : 'ACTIVE ORDERS'}
        </h3>
        <div className="flex gap-2.5 flex-wrap items-center">
          <input
            type="text" placeholder="Search customer..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-[#ddd] text-xs w-[150px] outline-none"
          />
          <select
            value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="p-2 border border-[#ddd] text-[11px] outline-none cursor-pointer font-bold"
          >
            <option value="ALL">ALL PAYMENT</option>
            <option value="Paid">PAID</option>
            <option value="Unpaid">UNPAID</option>
          </select>
          <select
            value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="p-2 border border-[#ddd] text-[11px] outline-none cursor-pointer font-bold"
          >
            <option value="ALL">ALL METHODS</option>
            <option value="Cash on Delivery">COD</option>
            <option value="Full Payment">FULL PAYMENT</option>
          </select>
          <button
            onClick={() => { setShowArchived(!showArchived); setSearchTerm(''); }}
            className={`px-3 py-2 text-[10px] font-bold tracking-wider cursor-pointer border transition-colors ${showArchived ? 'bg-black text-white border-black' : 'bg-[#f0f0f0] text-black border-[#ddd] hover:bg-gray-200'}`}
          >
            {showArchived ? '← BACK' : 'ARCHIVED'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b-2 border-black">
              {['DATE','CUSTOMER','ADDRESS','ITEMS','SHIPPING','TOTAL','PAYMENT','INFO','CREATED BY','STATUS','ACTIONS','PDF'].map(h => (
                <th key={h} className="p-2.5 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedOrders.length > 0 ? displayedOrders.map(order => (
              <tr key={order._id} className="border-b border-[#eee]">
                <td className="p-2.5 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="p-2.5">
                  <div className="font-bold">{order.customerName}</div>
                  <div className="text-[11px] text-[#666]">{order.phone}</div>
                </td>
                <td className="p-2.5 max-w-[120px]">
                  <div className="text-[11px]">{order.address?.split(',').slice(-2).join(',')}</div>
                </td>
                <td className="p-2.5">
                  <div className="text-[11px]">
                    {order.items.map((item, i) => <div key={i}>{item.quantity}x {item.name}</div>)}
                  </div>
                </td>
                <td className="p-2.5 text-[11px]">{order.shippingCost} TK</td>
                <td className="p-2.5 font-bold whitespace-nowrap">{order.totalAmount.toLocaleString()} TK</td>
                <td className="p-2.5">
                  <div className="text-[10px] mb-1">{order.paymentMethod}</div>
                  <select
                    value={order.paymentStatus || 'Unpaid'}
                    onChange={(e) => updatePaymentStatus(order._id, e.target.value)}
                    className={getPaymentSelectClass(order.paymentStatus)}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </td>
                <td className="p-2.5">
                  {order.paymentDetails?.transactionId ? (
                    <button
                      onClick={() => setSelectedPayment(order.paymentDetails)}
                      className="bg-black text-white border-none px-2 py-1 text-[9px] cursor-pointer font-bold hover:bg-gray-800 transition-colors"
                    >
                      INFO
                    </button>
                  ) : '-'}
                </td>
                <td className="p-2.5 text-[11px] text-[#666]">{order.createdBy || 'Customer'}</td>
                <td className="p-2.5">
                  <span className={getStatusClass(order.status)}>{order.status.toUpperCase()}</span>
                </td>
                <td className="p-2.5">
                  {order.status !== 'Canceled' ? (
                    <select
                      onChange={(e) => updateStatus(order._id, e.target.value)}
                      value={order.status}
                      className="p-1 text-[10px] border border-[#ddd] cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Canceled">Cancel Order</option>
                    </select>
                  ) : (
                    <button
                      onClick={() => updateStatus(order._id, 'Pending')}
                      className="bg-[#222] text-white border-none px-3 py-1 cursor-pointer text-[10px] hover:bg-gray-700 transition-colors"
                    >
                      RESTORE
                    </button>
                  )}
                </td>
                <td className="p-2.5">
                  <button
                    onClick={() => downloadReceipt(order)}
                    className="bg-white border border-black px-2 py-1 cursor-pointer text-xs font-bold hover:bg-black hover:text-white transition-colors"
                  >
                    📄
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="12" className="text-center py-12 text-[#999]">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Info Modal */}
      {selectedPayment && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/80 flex justify-center items-center z-[3000]">
          <div className="bg-white p-8 w-[90%] max-w-[350px] flex flex-col gap-2.5">
            <h3 className="text-sm tracking-wider font-bold">PAYMENT VERIFICATION</h3>
            <p className="text-sm"><b>Paid Amount:</b> <span className="text-green-600 font-bold">{selectedPayment.amountPaid} TK</span></p>
            <p className="text-sm"><b>Platform:</b> {selectedPayment.platform}</p>
            <p className="text-sm"><b>Sender:</b> {selectedPayment.senderNumber}</p>
            <p className="text-sm"><b>TrxID:</b> {selectedPayment.transactionId}</p>
            <p className="text-sm font-bold">Screenshot:</p>
            <a href={selectedPayment.screenshot} target="_blank" rel="noreferrer">
              <img
                src={selectedPayment.screenshot} alt="Payment"
                className="w-full max-h-[300px] object-contain border border-[#ddd]"
              />
            </a>
            <button
              onClick={() => setSelectedPayment(null)}
              className="bg-black text-white border-none p-2.5 cursor-pointer font-bold mt-2.5 hover:bg-gray-800 transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;