import { useEffect, useRef } from 'react';
import { Eye, MoreHorizontal, Package } from 'lucide-react';

export const orderMoney = value => `${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })} TK`;
export const orderDate = value => new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' });
export const statusTone = status => ({ Paid: 'green', Delivered: 'green', Processing: 'blue', Shipped: 'purple', Pending: 'amber', Partial: 'amber', 'Pending Verification': 'amber', Unpaid: 'red', Canceled: 'gray' })[status] || 'gray';

export default function OrderTable({ orders, selectedIds, allSelected, onSelect, onSelectAll, onView, onEdit, onReceipt, onNotes }) {
  const checkbox = useRef(null);
  useEffect(() => {
    if (checkbox.current) checkbox.current.indeterminate = !allSelected && orders.some(order => selectedIds.has(order._id));
  }, [orders, selectedIds, allSelected]);
  return <div className="ol-table-wrap"><button className="ol-button ol-mobile-select" disabled={!orders.length} onClick={onSelectAll}>{allSelected ? 'Deselect this page' : 'Select this page'}</button><table className="ol-table"><thead><tr>
    <th><input ref={checkbox} type="checkbox" aria-label="Select orders on this page" checked={allSelected} onChange={onSelectAll} disabled={!orders.length} /></th>
    {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Actions'].map(label => <th key={label}>{label}</th>)}
  </tr></thead><tbody>{orders.map(order => <tr key={order._id} className={selectedIds.has(order._id) ? 'ol-selected' : ''}>
    <td className="ol-selection"><input type="checkbox" aria-label={`Select order ${order._id.slice(-6)}`} checked={selectedIds.has(order._id)} onChange={() => onSelect(order._id)} /></td>
    <td data-label="Order"><button className="ol-order-id" onClick={() => onView(order._id)}>#{order._id.slice(-6).toUpperCase()}</button><small>{orderDate(order.createdAt)}</small></td>
    <td data-label="Customer"><strong>{order.customerName}</strong><small>{order.phone}</small></td>
    <td data-label="Items"><span className="ol-item-summary">{order.items?.[0]?.name || 'No items'}</span><small>{order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0} units{order.items?.length > 1 ? ` · ${order.items.length} products` : ''}</small></td>
    <td data-label="Total"><strong className="ol-nowrap">{orderMoney(order.totalAmount)}</strong>{order.paymentStatus === 'Partial' && <small className="ol-due">Due {orderMoney(order.amountDue ?? Math.max(0, order.totalAmount - (order.amountPaid || 0)))}</small>}</td>
    <td data-label="Payment"><span className={`ol-badge ${statusTone(order.paymentStatus || 'Unpaid')}`}>{order.paymentStatus || 'Unpaid'}</span><small>{order.paymentMethod || '—'}</small></td>
    <td data-label="Status"><span className={`ol-badge ${statusTone(order.status)}`}>{order.status || 'Pending'}</span></td>
    <td data-label="Actions"><div className="ol-row-actions"><button className="ol-button" onClick={() => onView(order._id)}><Eye size={13} /> View order</button>
      <details className="ol-menu"><summary aria-label={`More actions for order ${order._id.slice(-6)}`}><MoreHorizontal size={17} /></summary><div>
        <button onClick={event => { event.currentTarget.closest('details').open = false; onEdit(order); }}>Edit order</button>
        <button onClick={event => { event.currentTarget.closest('details').open = false; onNotes(order); }}>Notes ({order.adminNotes?.length || 0})</button>
        <button onClick={event => { event.currentTarget.closest('details').open = false; onReceipt(order); }}>Download receipt</button>
      </div></details></div></td>
  </tr>)}{!orders.length && <tr><td colSpan={8} className="ol-empty"><Package size={28} /><h3>No orders found</h3><p>Try another search, status, or date range.</p></td></tr>}</tbody></table></div>;
}
