import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

const CustomerList = () => {
  const { orders = [] } = useOutletContext();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // ── Build customer map from all orders ──────────────────────
  const customers = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      const key = order.phone; // group by phone number
      if (!map[key]) {
        map[key] = {
          name:        order.customerName,
          phone:       order.phone,
          email:       order.customerEmail || '—',
          orders:      [],
          totalSpent:  0,
          firstOrder:  order.createdAt,
          lastOrder:   order.createdAt,
        };
      }
      map[key].orders.push(order);
      if (order.status?.toLowerCase() === 'delivered' && order.paymentStatus?.toLowerCase() === 'paid') {
        map[key].totalSpent += Number(order.totalAmount) || 0;
      }
      if (new Date(order.createdAt) < new Date(map[key].firstOrder)) map[key].firstOrder = order.createdAt;
      if (new Date(order.createdAt) > new Date(map[key].lastOrder))  map[key].lastOrder  = order.createdAt;
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const s = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(s) || c.phone.includes(s) || c.email.toLowerCase().includes(s)
    );
  }, [customers, search]);

  // ── Customer orders with filters ─────────────────────────────
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return selectedCustomer.orders
      .filter(o => {
        const matchSearch = orderSearch
          ? o.items?.some(i => i.name.toLowerCase().includes(orderSearch.toLowerCase()))
          : true;
        const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [selectedCustomer, orderSearch, statusFilter]);

  const STATUS_COLORS = {
    Pending:    { bg: '#fef3c7', color: '#92400e' },
    Processing: { bg: '#dbeafe', color: '#1e40af' },
    Shipped:    { bg: '#ede9fe', color: '#5b21b6' },
    Delivered:  { bg: '#d1fae5', color: '#065f46' },
    Cancelled:  { bg: '#fee2e2', color: '#991b1b' },
    Canceled:   { bg: '#fee2e2', color: '#991b1b' },
  };

  const getStatusStyle = (status) => ({
    padding: '2px 8px', fontSize: '9px', fontWeight: 'bold', borderRadius: '2px',
    ...(STATUS_COLORS[status] || { bg: '#f0f0f0', color: '#666' }),
    backgroundColor: (STATUS_COLORS[status] || { bg: '#f0f0f0' }).bg,
  });

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h3 style={{ letterSpacing: '3px', margin: 0, fontWeight: 'bold' }}>CUSTOMER LIST</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#888' }}>{filtered.length} customers</span>
          <input
            type="text" placeholder="Search name, phone, email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', width: '220px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 1.6fr' : '1fr', gap: '20px' }}>

        {/* ── Customer Table ── */}
        <div style={{ border: '1px solid #eee', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#fafafa' }}>
                <th style={th}>#</th>
                <th style={th}>CUSTOMER</th>
                <th style={th}>ORDERS</th>
                <th style={th}>TOTAL SPENT</th>
                <th style={th}>LAST ORDER</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>No customers found.</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.phone}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: selectedCustomer?.phone === c.phone ? '#f9f9f9' : 'white',
                    cursor: 'pointer',
                  }}
                  onClick={() => { setSelectedCustomer(c); setOrderSearch(''); setStatusFilter('ALL'); }}
                >
                  <td style={td}><span style={{ color: '#bbb', fontSize: '11px' }}>{i + 1}</span></td>
                  <td style={td}>
                    <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>{c.phone}</div>
                    {c.email !== '—' && <div style={{ fontSize: '10px', color: '#aaa' }}>{c.email}</div>}
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 'bold' }}>{c.orders.length}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: c.totalSpent > 0 ? '#000' : '#bbb' }}>
                    {c.totalSpent > 0 ? `${c.totalSpent.toLocaleString()} TK` : '—'}
                  </td>
                  <td style={{ ...td, fontSize: '11px', color: '#888' }}>
                    {new Date(c.lastOrder).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={td}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: selectedCustomer?.phone === c.phone ? '#000' : '#eee',
                      margin: '0 auto'
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Order History Panel ── */}
        {selectedCustomer && (
          <div style={{ border: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '14px', margin: '0 0 2px' }}>{selectedCustomer.name}</p>
                  <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{selectedCustomer.phone}</p>
                  {selectedCustomer.email !== '—' && (
                    <p style={{ fontSize: '11px', color: '#aaa', margin: '2px 0 0' }}>{selectedCustomer.email}</p>
                  )}
                </div>
                <button onClick={() => setSelectedCustomer(null)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                {[
                  { label: 'TOTAL ORDERS', value: selectedCustomer.orders.length },
                  { label: 'TOTAL SPENT', value: `${selectedCustomer.totalSpent.toLocaleString()} TK` },
                  { label: 'FIRST ORDER', value: new Date(selectedCustomer.firstOrder).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) },
                  { label: 'LAST ORDER',  value: new Date(selectedCustomer.lastOrder).toLocaleDateString('en-GB',  { day: '2-digit', month: 'short', year: '2-digit' }) },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #eee', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '2px' }}>{s.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <input type="text" placeholder="Search items..." value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', fontSize: '11px', outline: 'none' }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '11px', outline: 'none' }}>
                  <option value="ALL">ALL STATUS</option>
                  <option value="Pending">PENDING</option>
                  <option value="Processing">PROCESSING</option>
                  <option value="Shipped">SHIPPED</option>
                  <option value="Delivered">DELIVERED</option>
                  <option value="Canceled">CANCELED</option>
                </select>
              </div>
            </div>

            {/* Orders */}
            <div style={{ overflowY: 'auto', maxHeight: '600px' }}>
              {customerOrders.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#bbb', fontSize: '12px' }}>No orders match filter.</div>
              ) : customerOrders.map(order => (
                <div key={order._id} style={{ padding: '14px 20px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#aaa', fontFamily: 'monospace' }}>
                        #{order._id.slice(-6).toUpperCase()}
                      </span>
                      <span style={getStatusStyle(order.status)}>{order.status?.toUpperCase()}</span>
                      <span style={{
                        padding: '2px 8px', fontSize: '9px', fontWeight: 'bold', borderRadius: '2px',
                        backgroundColor: order.paymentStatus === 'Paid' ? '#d1fae5' : '#fee2e2',
                        color: order.paymentStatus === 'Paid' ? '#065f46' : '#991b1b',
                      }}>{order.paymentStatus?.toUpperCase()}</span>
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{Number(order.totalAmount).toLocaleString()} TK</span>
                  </div>

                  {/* Items */}
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>
                    {order.items?.map((item, i) => (
                      <span key={i}>{item.quantity}× {item.name}{i < order.items.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {order.paymentMethod && ` · ${order.paymentMethod}`}
                      {order.shippingCost > 0 && ` · Shipping: ${order.shippingCost} TK`}
                    </div>
                    {order.isManual && (
                      <span style={{ fontSize: '9px', color: '#aaa', border: '1px solid #eee', padding: '1px 6px' }}>MANUAL</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const th = { padding: '10px 12px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', color: '#888', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', verticalAlign: 'middle' };

export default CustomerList;