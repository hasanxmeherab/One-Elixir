import { useEffect, useRef } from 'react';
import { X, Pencil, Download, MessageSquare } from 'lucide-react';
import { orderMoney, orderDate, statusTone } from './OrderTable';

export default function OrderDetailsDrawer({ order, onClose, onStatus, onPaymentStatus, onAction }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!order || !element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, [Boolean(order)]);
  if (!order) return null;
  const due = Math.max(0, order.amountDue ?? (order.totalAmount - (order.amountPaid || 0)));
  return <dialog ref={dialog} className="ol-drawer" aria-labelledby="ol-drawer-title" onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="ol-drawer-content"><header className="ol-drawer-header"><div><p>ORDER DETAILS</p><h2 id="ol-drawer-title">#{order._id.slice(-6).toUpperCase()}</h2><small>{orderDate(order.createdAt)} · {order.isManual ? 'Manual order' : 'Website order'}</small></div><button autoFocus className="ol-icon-button" aria-label="Close order details" onClick={onClose}><X size={20} /></button></header>
    <div className="ol-drawer-body">
      <section><h3>Customer & delivery</h3><strong>{order.customerName}</strong><p>{order.phone}</p><p>{order.address || 'No address provided'}</p><button className="ol-text-button" onClick={() => onAction('history', order)}>View customer history</button></section>
      <section><h3>Products</h3>{order.items?.map((item, index) => <div className="ol-detail-item" key={index}><span>{item.name}<small>{item.quantity} × {orderMoney(item.finalItemPrice ?? item.price)}{Number(item.discountValue) > 0 ? ' · Item discount included' : ''}</small></span><strong>{orderMoney((item.finalItemPrice ?? item.price) * item.quantity)}</strong></div>)}
        <dl className="ol-detail-totals"><div><dt>Shipping</dt><dd>{orderMoney(order.shippingCost)}</dd></div><div><dt>Order / coupon discount</dt><dd>−{orderMoney(order.discountApplied)}</dd></div><div><dt>Total</dt><dd><strong>{orderMoney(order.totalAmount)}</strong></dd></div></dl>
      </section>
      <section><h3>Order status</h3><label className="ol-field">Fulfilment<select value={order.status || 'Pending'} onChange={event => onStatus(order._id, event.target.value)}>{['Pending', 'Processing', 'Shipped', 'Delivered', 'Canceled'].map(status => <option key={status}>{status}</option>)}</select></label></section>
      <section><h3>Payment</h3><div className="ol-payment-heading"><span>{order.paymentMethod || '—'}</span><span className={`ol-badge ${statusTone(order.paymentStatus || 'Unpaid')}`}>{order.paymentStatus || 'Unpaid'}</span></div>
        <label className="ol-field">Payment status<select value={order.paymentStatus || 'Unpaid'} onChange={event => onPaymentStatus(order._id, event.target.value)}>{['Unpaid', 'Pending Verification', 'Partial', 'Paid'].map(status => <option key={status}>{status}</option>)}</select></label>
        {(order.partialPayments?.length > 0 || order.paymentStatus === 'Partial') && <p>Collected: {orderMoney(order.amountPaid)} · Due: {orderMoney(due)}</p>}
        <p>Received by: {order.paymentReceivedBy?.adminName || 'Unassigned'}</p>
        {order.paymentDetails?.senderNumber && <p>Sender: {order.paymentDetails.senderNumber}</p>}{order.paymentDetails?.transactionId && <p>Transaction: {order.paymentDetails.transactionId}</p>}
        {order.paymentDetails?.screenshot && <a href={order.paymentDetails.screenshot} target="_blank" rel="noreferrer"><img className="ol-payment-proof" src={order.paymentDetails.screenshot} alt="Payment proof" /></a>}
        <div className="ol-detail-actions"><button className="ol-button" onClick={() => onAction('payment', order)}>View payment details</button><button className="ol-button" onClick={() => onAction('editPayment', order)}>Edit payment details</button>{(order.paymentStatus !== 'Paid' || order.partialPayments?.length > 0) && <button className="ol-button" onClick={() => onAction('partial', order)}>{order.paymentStatus === 'Paid' ? 'View payments' : 'Record partial payment'}</button>}{order.paymentStatus === 'Paid' && <button className="ol-button" onClick={() => onAction('receiver', order)}>Assign / change receiver</button>}</div>
      </section>
      <section><h3>Admin notes <span>({order.adminNotes?.length || 0})</span></h3><button className="ol-button" onClick={() => onAction('notes', order)}><MessageSquare size={14} /> View & manage notes</button><p>Created by {order.createdBy || (order.isManual ? 'Admin' : 'Customer')}</p></section>
    </div><footer className="ol-drawer-footer"><button className="ol-button" onClick={() => onAction('edit', order)}><Pencil size={14} /> Edit order</button><button className="ol-button" onClick={() => onAction('receipt', order)}><Download size={14} /> Download receipt</button></footer></div>
  </dialog>;
}
