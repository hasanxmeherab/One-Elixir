import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from '../../components/Skeleton';
import adminAxios from '../../utils/adminAxios';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const [filterType, setFilterType] = useState(null);
  const [revenueRange, setRevenueRange] = useState('30');
  const [now, setNow] = useState(new Date());

  // ── Cost records for margin calculation ──────────────────
  const [costRecords, setCostRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  useEffect(() => {
    adminAxios.get(`${API_URL}/api/costs`).then(r => setCostRecords(r.data)).catch(() => { });
    adminAxios.get(`${API_URL}/api/expenses`).then(r => setExpenses(r.data)).catch(() => { });
  }, []);

  // ── Live clock for flash sale countdowns ────────────────
  const activeFlashSales = perfumes.filter(p =>
    p.flashSale?.active && p.flashSale?.salePrice && p.flashSale?.endsAt && new Date(p.flashSale.endsAt) > now
  );
  useEffect(() => {
    if (activeFlashSales.length === 0) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [activeFlashSales.length > 0]);
  const getCountdown = (endsAt) => {
    const diff = new Date(endsAt) - now;
    if (diff <= 0) return null;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // ── Product revenue chart tab ─────────────────────────────
  const [productTab, setProductTab] = useState('revenue');

  if (!perfumes || !orders) {
    return <DashboardSkeleton />;
  }

  // ── KPIs ────────────────────────────────────────────────────
  const lowStockItems = perfumes.filter(p => p.stock > 0 && p.stock <= 5);
  const outOfStockItems = perfumes.filter(p => p.stock === 0);
  const totalStock = perfumes.reduce((a, p) => a + (Number(p.stock) || 0), 0);
  const totalValuation = perfumes.reduce((a, p) => a + (p.price * (Number(p.stock) || 0)), 0);
  const totalRevenue = orders
    .filter(o => o.status?.toLowerCase() === 'delivered' && o.paymentStatus?.toLowerCase() === 'paid')
    .reduce((a, o) => a + (Number(o.totalAmount) || 0), 0);
  const totalInvestment = investments.reduce((a, inv) => {
    const v = parseFloat(inv.totalAmount); return a + (isNaN(v) ? 0 : v);
  }, 0);
  const totalExpenses = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const availableMoney = (totalRevenue + totalInvestment) - totalExpenses;
  const totalOrders = orders.length;

  // ── Quick stats ────────────────────────────────────────────────
  const deliveredOrders = orders.filter(o => o.status?.toLowerCase() === 'delivered' && o.paymentStatus?.toLowerCase() === 'paid');
  const avgOrderValue = deliveredOrders.length
    ? Math.round(deliveredOrders.reduce((a, o) => a + (Number(o.totalAmount) || 0), 0) / deliveredOrders.length)
    : 0;
  const uniqueCustomers = new Set(orders.map(o => o.customerEmail).filter(Boolean)).size;
  const conversionRate = totalOrders > 0
    ? Math.round((deliveredOrders.length / totalOrders) * 100)
    : 0;

  // ── Payment status data for pie chart ───────────────────
  const paymentData = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const s = o.paymentStatus || 'Unknown';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);
  const PAYMENT_COLORS = { Paid: '#16a34a', Unpaid: '#dc2626', Partial: '#f59e0b', Unknown: '#999' };

  // ── Revenue + Volume data ────────────────────────────────────
  const chartData = useMemo(() => {
    const days = parseInt(revenueRange);
    const now = new Date();
    const map = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      map[key] = { date: key, revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const d = new Date(o.createdAt);
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

  // ── Product Revenue / Units / Margin data ────────────────────
  const productRevenueData = useMemo(() => {
    const map = {};
    orders
      .filter(o => o.status?.toLowerCase() === 'delivered' && o.paymentStatus?.toLowerCase() === 'paid')
      .forEach(o => o.items?.forEach(item => {
        if (!map[item.name]) map[item.name] = { name: item.name, revenue: 0, units: 0 };
        map[item.name].units += item.quantity;
        map[item.name].revenue += (Number(item.price) || 0) * item.quantity;
      }));

    // Attach latest margin from cost records
    const latestMargin = {};
    costRecords.forEach(r => {
      if (!latestMargin[r.perfumeName] ||
        new Date(r.createdAt) > new Date(latestMargin[r.perfumeName].createdAt)) {
        latestMargin[r.perfumeName] = r;
      }
    });

    return Object.values(map)
      .map(p => ({
        ...p,
        margin: latestMargin[p.name] ? parseFloat(latestMargin[p.name].profitMargin.toFixed(1)) : null,
        shortName: p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [orders, costRecords]);

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

  const BAR_COLORS = ['#111', '#333', '#555', '#777', '#999', '#bbb'];

  const axisStyle = { fontSize: 10, fill: '#bbb' };

  // margin bar color
  const marginBarColor = (val) => val >= 60 ? '#16a34a' : val >= 30 ? '#d97706' : '#dc2626';

  return (
    <div>
      <h3 className="tracking-[3px] mb-8 font-bold">DASHBOARD OVERVIEW</h3>

      {/* ── KPI Cards ── */}
      <div className="flex gap-5 flex-wrap mb-5">
        {[
          { label: 'TOTAL REVENUE', value: `${totalRevenue.toLocaleString()} TK`, accent: 'border-l-black' },
          { label: 'TOTAL CAPITAL', value: `${totalInvestment.toLocaleString()} TK`, accent: 'border-l-black' },
          { label: 'AVAILABLE MONEY', value: `${availableMoney.toLocaleString()} TK`, accent: 'border-l-black' },
          { label: 'TOTAL UNITS', value: totalStock, accent: 'border-l-black' },
          { label: 'INVENTORY VALUE', value: `${totalValuation.toLocaleString()} TK`, accent: 'border-l-[#8b5cf6]' },
        ].map(c => (
          <div key={c.label} className={`flex-1 min-w-[150px] p-6 bg-white border border-[#eee] border-l-4 ${c.accent}`}>
            <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">{c.label}</span>
            <span className="text-xl font-bold">{c.value}</span>
          </div>
        ))}
      </div>

      {/* ── Alert KPI Cards ── */}
      <div className="flex gap-5 flex-wrap mb-5">
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

      {/* ── Quick Stats Row ── */}
      <div className="flex gap-5 flex-wrap mb-8">
        {[
          { label: 'AVG ORDER VALUE', value: `${avgOrderValue.toLocaleString()} TK`, color: '#8b5cf6' },
          { label: 'UNIQUE CUSTOMERS', value: uniqueCustomers, color: '#0ea5e9' },
          { label: 'DELIVERED RATE', value: `${conversionRate}%`, color: '#16a34a' },
          { label: 'ACTIVE FLASH SALES', value: activeFlashSales.length, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className="flex-1 min-w-[130px] p-5 bg-white border border-[#eee] border-l-4" style={{ borderLeftColor: s.color }}>
            <span className="block text-[10px] font-bold tracking-[2px] mb-2" style={{ color: s.color }}>{s.label}</span>
            <span className="text-lg font-bold">{s.value}</span>
          </div>
        ))}
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

      {/* ── Active Flash Sales Panel ── */}
      {activeFlashSales.length > 0 && (
        <div className="bg-white border border-[#eee] p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] tracking-[3px] text-[#888] font-bold">🔥 ACTIVE FLASH SALES</p>
              <p className="text-xs text-[#aaa] mt-0.5">{activeFlashSales.length} product{activeFlashSales.length !== 1 ? 's' : ''} on sale right now</p>
            </div>
            <button onClick={() => navigate('/admin/inventory')}
              className="px-3 py-1.5 text-[10px] font-bold tracking-wider border border-[#ddd] bg-white hover:border-black transition-colors cursor-pointer">
              MANAGE →
            </button>
          </div>
          <div className="space-y-3">
            {activeFlashSales.map(p => {
              const cd = getCountdown(p.flashSale.endsAt);
              const discount = Math.round(((p.price - p.flashSale.salePrice) / p.price) * 100);
              return (
                <div key={p._id} className="flex items-center gap-4 p-4 border border-[#f0f0f0] rounded">
                  <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded bg-[#f9f9f9]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-red-600 font-bold">{p.flashSale.salePrice.toLocaleString()} TK</span>
                      <span className="text-[10px] text-[#aaa] line-through">{p.price.toLocaleString()} TK</span>
                      <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 font-bold rounded">-{discount}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-[9px] text-[#888] tracking-wider font-bold">ENDS IN</span>
                    <span className="text-[13px] font-mono font-bold" style={{ color: cd ? '#111' : '#e74c3c' }}>{cd || 'EXPIRED'}</span>
                  </div>
                </div>
              );
            })}
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
            {[['7', '7D'], ['30', '30D'], ['90', '90D']].map(([val, label]) => (
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
                <stop offset="5%" stopColor="#000" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
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

      {/* ── NEW: Revenue by Product ── */}
      <div className="bg-white border border-[#eee] p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[10px] tracking-[3px] text-[#888] font-bold">REVENUE BY PRODUCT</p>
            <p className="text-xs text-[#aaa] mt-0.5">Delivered & paid orders only</p>
          </div>
          {/* Tab switcher */}
          <div className="flex gap-2">
            {[
              ['revenue', 'REVENUE'],
              ['units', 'UNITS SOLD'],
              ['margin', 'MARGIN %'],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setProductTab(key)}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-wider border transition-colors cursor-pointer ${productTab === key ? 'bg-black text-white border-black' : 'bg-white text-[#888] border-[#ddd] hover:border-black'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {productRevenueData.length === 0 ? (
          <p className="text-xs text-[#aaa] text-center py-10">No delivered orders yet.</p>
        ) : productTab === 'margin' && productRevenueData.every(p => p.margin === null) ? (
          <div className="text-center py-10">
            <p className="text-xs text-[#aaa] mb-2">No cost records found.</p>
            <p className="text-[10px] text-[#bbb]">Add cost records in the <button onClick={() => navigate('/admin/costs')} className="underline cursor-pointer bg-transparent border-none text-[#bbb]">Cost Calculator</button> to see margins.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={productRevenueData}
                margin={{ top: 5, right: 10, left: 0, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 9, fill: '#888' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v =>
                    productTab === 'revenue' && v >= 1000 ? `${(v / 1000).toFixed(0)}k`
                      : productTab === 'margin' ? `${v}%`
                        : v
                  }
                />
                <Tooltip
                  content={<CustomTooltip
                    suffix={productTab === 'revenue' ? ' TK' : productTab === 'margin' ? '%' : ' units'}
                  />}
                />
                <Bar
                  dataKey={productTab}
                  name={productTab === 'revenue' ? 'Revenue' : productTab === 'units' ? 'Units Sold' : 'Margin'}
                  radius={[3, 3, 0, 0]}
                >
                  {productRevenueData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        productTab === 'margin' && entry.margin !== null
                          ? marginBarColor(entry.margin)
                          : BAR_COLORS[i % BAR_COLORS.length]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* ── Summary table below chart ── */}
            <div className="mt-6 border-t border-[#f5f5f5] pt-4">
              <div className="grid grid-cols-4 gap-2 mb-2">
                {['PRODUCT', 'REVENUE', 'UNITS', 'MARGIN'].map(h => (
                  <span key={h} className="text-[9px] font-bold tracking-wider text-[#aaa]">{h}</span>
                ))}
              </div>
              {productRevenueData.map((p, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 py-2.5 border-b border-[#f9f9f9]">
                  <span className="text-[11px] font-medium truncate">{p.name}</span>
                  <span className="text-[11px]">{p.revenue.toLocaleString()} TK</span>
                  <span className="text-[11px]">{p.units}</span>
                  <span className="text-[11px] font-bold" style={{
                    color: p.margin !== null ? marginBarColor(p.margin) : '#ccc'
                  }}>
                    {p.margin !== null ? `${p.margin}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Status Breakdown + Payment Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#eee] p-6">
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
                        style={{ width: `${totalOrders ? (value / totalOrders) * 100 : 0}%`, background: STATUS_COLORS[name] || '#999' }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* ── Payment Status Pie Chart ── */}
        <div className="bg-white border border-[#eee] p-6">
          <p className="text-[10px] tracking-[3px] text-[#888] font-bold mb-4">PAYMENT STATUS</p>
          {paymentData.length === 0
            ? <p className="text-xs text-[#aaa] text-center py-6">No data.</p>
            : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                      {paymentData.map((entry, i) => (
                        <Cell key={i} fill={PAYMENT_COLORS[entry.name] || '#999'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip suffix=" orders" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-3">
                  {paymentData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PAYMENT_COLORS[d.name] || '#999' }} />
                      <span className="text-[10px] font-bold text-[#666]">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;