import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';


const PAGE_SIZE = 10;

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

const CustomerList = () => {
  const { orders = [] } = useOutletContext();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const customers = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      const key = order.phone;
      if (!map[key]) {
        map[key] = {
          name: order.customerName, phone: order.phone,
          email: order.customerEmail || '—', orders: [],
          totalSpent: 0, firstOrder: order.createdAt, lastOrder: order.createdAt,
        };
      }
      map[key].orders.push(order);
      if (order.status?.toLowerCase() === 'delivered' && order.paymentStatus?.toLowerCase() === 'paid')
        map[key].totalSpent += Number(order.totalAmount) || 0;
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

  // Reset page on search change
  React.useEffect(() => { setPage(1); }, [search]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return selectedCustomer.orders
      .filter(o => {
        const matchSearch = orderSearch ? o.items?.some(i => i.name.toLowerCase().includes(orderSearch.toLowerCase())) : true;
        const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [selectedCustomer, orderSearch, statusFilter]);

  const getStatusClass = (status) => {
    const map = {
      Pending:    'bg-amber-100 text-amber-800',
      Processing: 'bg-blue-100 text-blue-800',
      Shipped:    'bg-violet-100 text-violet-800',
      Delivered:  'bg-emerald-100 text-emerald-800',
      Cancelled:  'bg-red-100 text-red-800',
      Canceled:   'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const totalPages        = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedCustomers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h3 className="tracking-[3px] font-bold text-base">CUSTOMER LIST</h3>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400">{filtered.length} customers</span>
          <input
            type="text" placeholder="Search name, phone, email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-[#ddd] text-xs outline-none w-56"
          />
        </div>
      </div>

      <div className={`grid gap-5 ${selectedCustomer ? 'grid-cols-[1fr_1.6fr]' : 'grid-cols-1'}`}>

        {/* ── Customer Table ── */}
        <div className="border border-[#eee] overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-[#fafafa]">
                {['#', 'CUSTOMER', 'ORDERS', 'TOTAL SPENT', 'LAST ORDER', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-gray-300">No customers found.</td></tr>
              ) : paginatedCustomers.map((c, i) => (
                <tr key={c.phone}
                  className={`border-b border-[#f0f0f0] cursor-pointer hover:bg-[#fafafa] transition-colors ${selectedCustomer?.phone === c.phone ? 'bg-[#f9f9f9]' : 'bg-white'}`}
                  onClick={() => { setSelectedCustomer(c); setOrderSearch(''); setStatusFilter('ALL'); }}
                >
                  <td className="px-3 py-2.5 align-middle"><span className="text-gray-300 text-[11px]">{i + 1}</span></td>
                  <td className="px-3 py-2.5 align-middle">
                    <div className="font-bold">{c.name}</div>
                    <div className="text-[10px] text-gray-400">{c.phone}</div>
                    {c.email !== '—' && <div className="text-[10px] text-gray-300">{c.email}</div>}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-center font-bold">{c.orders.length}</td>
                  <td className={`px-3 py-2.5 align-middle font-bold ${c.totalSpent > 0 ? 'text-black' : 'text-gray-300'}`}>
                    {c.totalSpent > 0 ? `${c.totalSpent.toLocaleString()} TK` : '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-[11px] text-gray-400">
                    {new Date(c.lastOrder).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <div className={`w-2 h-2 rounded-full mx-auto ${selectedCustomer?.phone === c.phone ? 'bg-black' : 'bg-[#eee]'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Order History Panel ── */}
        {selectedCustomer && (
          <div className="border border-[#eee] flex flex-col">
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-[#eee] bg-[#fafafa]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm mb-0.5">{selectedCustomer.name}</p>
                  <p className="text-[11px] text-gray-400">{selectedCustomer.phone}</p>
                  {selectedCustomer.email !== '—' && (
                    <p className="text-[11px] text-gray-300 mt-0.5">{selectedCustomer.email}</p>
                  )}
                </div>
                <button onClick={() => setSelectedCustomer(null)}
                  className="bg-transparent border-none text-lg cursor-pointer text-gray-400 leading-none hover:text-black">×</button>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-3">
                {[
                  { label: 'TOTAL ORDERS', value: selectedCustomer.orders.length },
                  { label: 'TOTAL SPENT',  value: `${selectedCustomer.totalSpent.toLocaleString()} TK` },
                  { label: 'FIRST ORDER',  value: new Date(selectedCustomer.firstOrder).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) },
                  { label: 'LAST ORDER',   value: new Date(selectedCustomer.lastOrder).toLocaleDateString('en-GB',  { day: '2-digit', month: 'short', year: '2-digit' }) },
                ].map(s => (
                  <div key={s.label} className="flex-1 bg-white border border-[#eee] px-2.5 py-2">
                    <div className="text-[9px] text-gray-300 font-bold tracking-wider mb-0.5">{s.label}</div>
                    <div className="text-[13px] font-bold">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex gap-2 mt-2.5">
                <input type="text" placeholder="Search items..." value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-[#ddd] text-[11px] outline-none" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 border border-[#ddd] text-[11px] outline-none">
                  <option value="ALL">ALL STATUS</option>
                  <option value="Pending">PENDING</option>
                  <option value="Processing">PROCESSING</option>
                  <option value="Shipped">SHIPPED</option>
                  <option value="Delivered">DELIVERED</option>
                  <option value="Canceled">CANCELED</option>
                </select>
              </div>
            </div>

            {/* Orders List */}
            <div className="overflow-y-auto max-h-[600px]">
              {customerOrders.length === 0 ? (
                <div className="py-10 text-center text-gray-300 text-xs">No orders match filter.</div>
              ) : customerOrders.map(order => (
                <div key={order._id} className="px-5 py-3.5 border-b border-[#f5f5f5]">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] text-gray-300 font-mono">#{order._id.slice(-6).toUpperCase()}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm ${getStatusClass(order.status)}`}>
                        {order.status?.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm ${order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {order.paymentStatus?.toUpperCase()}
                      </span>
                    </div>
                    <span className="font-bold text-[13px]">{Number(order.totalAmount).toLocaleString()} TK</span>
                  </div>

                  <div className="text-[11px] text-gray-500 mb-1">
                    {order.items?.map((item, i) => (
                      <span key={i}>{item.quantity}× {item.name}{i < order.items.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-gray-300">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {order.paymentMethod && ` · ${order.paymentMethod}`}
                      {order.shippingCost > 0 && ` · Shipping: ${order.shippingCost} TK`}
                    </div>
                    {order.isManual && (
                      <span className="text-[9px] text-gray-300 border border-[#eee] px-1.5 py-0.5">MANUAL</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default CustomerList;