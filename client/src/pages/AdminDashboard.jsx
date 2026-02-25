import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111', padding: '8px 12px', borderRadius: 4 }}>
      <p style={{ color: '#aaa', fontSize: 10, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#fff', fontSize: 11, margin: 0 }}>
          {p.name}: {Number(p.value).toLocaleString()}{suffix}
        </p>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const { perfumes = [], orders = [], investments = [] } = useOutletContext();
  const navigate = useNavigate();
  const [filterType, setFilterType]    = useState(null);
  const [revenueRange, setRevenueRange] = useState('30');

  if (!perfumes || !orders) {
    return <div className="p-10 text-center">Loading Dashboard Data...</div>;
  }

  // ── KPIs ────────────────────────────────────────────────────
  const lowStockItems   = perfumes.filter(p => p.stock > 0 && p.stock <= 5);
  const outOfStockItems = perfumes.filter(p => p.stock === 0);
  const totalStock      = perfumes.reduce((a, p) => a + (Number(p.stock) || 0), 0);
  const totalValuation  = perfumes.reduce((a, p) => a + (p.price * (Number(p.stock) || 0)), 0);
  const totalRevenue    = orders
    .filter(o => o.status?.toLowerCase() === 'delivered' && o.paymentStatus?.toLowerCase() === 'paid')
    .reduce((a, o) => a + (Number(o.totalAmount) || 0), 0);
  const totalInvestment = investments.reduce((a, inv) => {
    const v = parseFloat(inv.totalAmount); return a + (isNaN(v) ? 0 : v);
  }, 0);
  const totalOrders = orders.length;

  // ── Revenue + Volume data ────────────────────────────────────
  const chartData = useMemo(() => {
    const days = parseInt(revenueRange);
    const now  = new Date();
    const map  = {};
    for (let i = days - 1; i >= 0; i--) {
      const d   = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      map[key]  = { date: key, revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const d    = new Date(o.createdAt);
      const diff = Math.floor((now - d) / 86400000);
      if (diff < days) {
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (map[key]) {
          map[key].orders += 1;
          if (o.status?.toLowerCase() === 'delivered' && o.paymentStatus?.toLowerCase() === 'paid')
            map[key].revenue += Number(o.totalAmount) || 0;
        }
      }
    });
    return Object.values(map);
  }, [orders, revenueRange]);

  // ── Top Products ─────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map = {};
    orders
      .filter(o => o.status?.toLowerCase() === 'delivered' && o.paymentStatus?.toLowerCase() === 'paid')
      .forEach(o => o.items?.forEach(item => {
        if (!map[item.name]) map[item.name] = { name: item.name, units: 0 };
        map[item.name].units += item.quantity;
      }));
    return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 6);
  }, [orders]);

  // ── Status Breakdown ─────────────────────────────────────────
  const statusData = useMemo(() => {
    const map = {};
    orders.forEach(o => { const s = o.status || 'Unknown'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const STATUS_COLORS = {
    Pending: '#f39c12', Processing: '#3498db',
    Shipped: '#9b59b6', Delivered: '#27ae60',
    Cancelled: '#e74c3c', Canceled: '#e74c3c',
  };

  const BAR_COLORS = ['#111','#333','#555','#777','#999','#bbb'];

  const axisStyle  = { fontSize: 10, fill: '#bbb' };
  const gridStyle  = { stroke: '#f0f0f0' };

  return (
    <div>
      <h3 className="tracking-[3px] mb-8 font-bold">DASHBOARD OVERVIEW</h3>

      {/* ── KPI Cards ── */}
      <div className="flex gap-5 flex-wrap mb-5">
        {[
          { label: 'TOTAL REVENUE',   value: `${totalRevenue.toLocaleString()} TK`,   accent: 'border-l-black' },
          { label: 'TOTAL CAPITAL',   value: `${totalInvestment.toLocaleString()} TK`, accent: 'border-l-black' },
          { label: 'INVENTORY VALUE', value: `${totalValuation.toLocaleString()} TK`,  accent: 'border-l-black' },
          { label: 'TOTAL UNITS',     value: totalStock,                                accent: 'border-l-black' },
        ].map(c => (
          <div key={c.label} className={`flex-1 min-w-[150px] p-6 bg-white border border-[#eee] border-l-4 ${c.accent}`}>
            <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">{c.label}</span>
            <span className="text-xl font-bold">{c.value}</span>
          </div>
        ))}
      </div>

      {/* ── Alert KPI Cards ── */}
      <div className="flex gap-5 flex-wrap mb-8">
        <div onClick={() => setFilterType(f => f === 'low' ? null : 'low')}
          className={`flex-1 min-w-[150px] p-6 border border-[#eee] border-l-4 border-l-[#f39c12] cursor-pointer transition-colors ${filterType === 'low' ? 'bg-[#fff9f0]' : 'bg-white'}`}>
          <span className="block text-[10px] text-[#f39c12] font-bold tracking-[2px] mb-2.5">LOW STOCK (VIEW)</span>
          <span className="text-xl font-bold text-[#f39c12]">{lowStockItems.length}</span>
        </div>
        <div onClick={() => setFilterType(f => f === 'out' ? null : 'out')}
          className={`flex-1 min-w-[150px] p-6 border border-[#eee] border-l-4 border-l-[#e74c3c] cursor-pointer transition-colors ${filterType === 'out' ? 'bg-[#fff5f5]' : 'bg-white'}`}>
          <span className="block text-[10px] text-[#e74c3c] font-bold tracking-[2px] mb-2.5">OUT OF STOCK (VIEW)</span>
          <span className="text-xl font-bold text-[#e74c3c]">{outOfStockItems.length}</span>
        </div>
      </div>

      {/* ── Alert List ── */}
      {filterType && (
        <div className="mb-8 p-6 bg-white border border-black">
          <div className="flex justify-between mb-4">
            <p className="font-bold text-[11px] tracking-wider">
              {filterType === 'low' ? '⚠️ LOW STOCK ITEMS' : '🚫 OUT OF STOCK ITEMS'}
            </p>
            <button onClick={() => setFilterType(null)} className="bg-transparent border-none text-[#888] cursor-pointer text-[10px] underline">CLOSE</button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {(filterType === 'low' ? lowStockItems : outOfStockItems).map(item => (
              <div key={item._id} className="flex justify-between items-center py-4 border-b border-[#eee]">
                <div>
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className={`block text-[11px] ${filterType === 'low' ? 'text-[#f39c12]' : 'text-[#e74c3c]'}`}>Stock: {item.stock}</span>
                </div>
                <button onClick={() => navigate('/admin/inventory')}
                  className="bg-black text-white border-none px-3 py-1.5 text-[10px] cursor-pointer font-bold hover:bg-gray-800 transition-colors">
                  RESTOCK →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue Chart ── */}
      <div className="bg-white border border-[#eee] p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[10px] tracking-[3px] text-[#888] font-bold">REVENUE OVER TIME</p>
            <p className="text-xs text-[#aaa] mt-0.5">Delivered orders only</p>
          </div>
          <div className="flex gap-2">
            {[['7','7D'],['30','30D'],['90','90D']].map(([val, label]) => (
              <button key={val} onClick={() => setRevenueRange(val)}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-wider border transition-colors ${revenueRange === val ? 'bg-black text-white border-black' : 'bg-white text-[#888] border-[#ddd] hover:border-black'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#000" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip suffix=" TK" />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#000" strokeWidth={2} fill="url(#revenueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Top Products + Order Volume ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-[#eee] p-6">
          <p className="text-[10px] tracking-[3px] text-[#888] font-bold mb-1">TOP SELLING PRODUCTS</p>
          <p className="text-xs text-[#aaa] mb-5">By units sold — delivered orders</p>
          {topProducts.length === 0
            ? <p className="text-xs text-[#aaa] text-center py-10">No delivered orders yet.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip suffix=" units" />} />
                  <Bar dataKey="units" name="Units Sold" radius={[3, 3, 0, 0]}>
                    {topProducts.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-white border border-[#eee] p-6">
          <p className="text-[10px] tracking-[3px] text-[#888] font-bold mb-1">ORDER VOLUME</p>
          <p className="text-xs text-[#aaa] mb-5">All orders — last {revenueRange} days</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip suffix=" orders" />} />
              <Bar dataKey="orders" name="Orders" fill="#111" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Status Breakdown ── */}
      <div className="bg-white border border-[#eee] p-6">
        <p className="text-[10px] tracking-[3px] text-[#888] font-bold mb-6">ORDER STATUS BREAKDOWN</p>
        {statusData.length === 0
          ? <p className="text-xs text-[#aaa] text-center py-6">No orders yet.</p>
          : (
            <div className="flex flex-wrap gap-4">
              {statusData.map(({ name, value }) => (
                <div key={name} className="flex-1 min-w-[110px] border border-[#eee] p-4 text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: STATUS_COLORS[name] || '#999' }} />
                  <p className="text-[9px] tracking-wider text-[#888] font-bold mb-1">{name.toUpperCase()}</p>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-[10px] text-[#aaa]">{totalOrders ? Math.round((value / totalOrders) * 100) : 0}%</p>
                  <div className="mt-2 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalOrders ? (value/totalOrders)*100 : 0}%`, background: STATUS_COLORS[name] || '#999' }} />
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
};

export default AdminDashboard;