import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Package, CheckCircle, Truck, Clock, XCircle } from 'lucide-react';
import { TrackingSkeleton } from '../components/Skeleton';

const STEPS = [
  { key: 'Pending',    label: 'ORDER PLACED',  icon: Clock,       desc: 'Your order has been received and is awaiting confirmation.' },
  { key: 'Processing', label: 'PROCESSING',    icon: Package,     desc: 'Your fragrance is being carefully prepared and packed.' },
  { key: 'Shipped',    label: 'SHIPPED',       icon: Truck,       desc: 'Your order is on its way to you.' },
  { key: 'Delivered',  label: 'DELIVERED',     icon: CheckCircle, desc: 'Your order has been delivered. Enjoy your elixir.' },
];

// ── Estimated delivery logic ─────────────────────────────────
// Pending → +5 days, Processing → +4 days, Shipped → +2 days
const DELIVERY_DAYS = { Pending: 5, Processing: 4, Shipped: 2 };

const getEstimatedDelivery = (order) => {
  if (!order || order.status === 'Delivered' || order.status === 'Canceled') return null;
  const days = DELIVERY_DAYS[order.status];
  if (!days) return null;
  const base = new Date(order.updatedAt || order.createdAt);
  base.setDate(base.getDate() + days);
  return base;
};

const formatDeliveryDate = (date) =>
  date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [searchId, setSearchId] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchOrder = async (id) => {
    if (!id) return;
    try {
      setLoading(true); setError('');
      const res = await axios.get(`${API_URL}/api/orders/${id}`);
      setOrder(res.data);
    } catch {
      setError('Order not found. Please check your Order ID.');
      setOrder(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (orderId) { setSearchId(orderId); fetchOrder(orderId); }
    else setLoading(false);
  }, [orderId]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    navigate(`/track/${searchId.trim()}`);
  };

  const isCancelled      = order?.status === 'Canceled';
  const currentStepIndex = isCancelled ? -1 : STEPS.findIndex(s => s.key === order?.status);
  const estimatedDate    = getEstimatedDelivery(order);

  return (
    <div className="px-[5%] md:px-[10%] pt-24 pb-20 min-h-[80vh] max-w-[900px] mx-auto">

      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="tracking-[8px] text-2xl md:text-3xl font-bold mb-3">TRACK YOUR ORDER</h1>
        <div className="w-10 h-0.5 bg-black mx-auto mb-4" />
        <p className="text-xs text-[#888] tracking-[2px]">Enter your Order ID to see real-time delivery status</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-14 max-w-[560px] mx-auto">
        <input type="text" placeholder="Enter Order ID..."
          value={searchId} onChange={e => setSearchId(e.target.value)}
          className="flex-1 p-3 border border-[#ddd] outline-none text-sm tracking-wider" />
        <button type="submit"
          className="px-6 py-3 bg-black text-white text-xs font-bold tracking-[2px] hover:bg-gray-800 transition-colors whitespace-nowrap border-none cursor-pointer">
          TRACK
        </button>
      </form>

      {loading && orderId && (
        <TrackingSkeleton />
      )}

      {error && (
        <div className="text-center py-12">
          <XCircle size={40} className="mx-auto mb-4 text-red-300" />
          <p className="text-sm text-red-500 tracking-wider">{error}</p>
          <p className="text-xs text-[#aaa] mt-2">Double-check the ID from your order confirmation email.</p>
        </div>
      )}

      {order && !loading && (
        <div>
          {/* Order Meta */}
          <div className="bg-[#f9f9f9] border border-[#eee] p-6 mb-6 flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-[10px] text-[#888] tracking-[2px] mb-1">ORDER ID</p>
              <p className="text-xs font-bold tracking-wider">{order._id}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#888] tracking-[2px] mb-1">DATE PLACED</p>
              <p className="text-xs font-bold">
                {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#888] tracking-[2px] mb-1">TOTAL</p>
              <p className="text-xs font-bold">{order.totalAmount?.toLocaleString()} TK</p>
            </div>
            <div>
              <p className="text-[10px] text-[#888] tracking-[2px] mb-1">PAYMENT</p>
              <p className={`text-xs font-bold ${order.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>
                {order.paymentStatus?.toUpperCase()}
              </p>
            </div>
          </div>

          {/* ── Estimated Delivery Banner ── */}
          {estimatedDate && (
            <div className="flex items-center gap-3 px-5 py-4 bg-black text-white mb-8">
              <Truck size={16} className="shrink-0" />
              <div>
                <p className="text-[9px] tracking-[2px] opacity-60 mb-0.5">ESTIMATED DELIVERY</p>
                <p className="text-sm font-bold tracking-wider">Expected by {formatDeliveryDate(estimatedDate)}</p>
              </div>
            </div>
          )}
          {order.status === 'Delivered' && (
            <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 mb-8">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-bold text-emerald-700 tracking-wider">Your order has been delivered!</p>
            </div>
          )}

          {/* Cancelled */}
          {isCancelled ? (
            <div className="text-center py-12 border border-red-100 bg-red-50 mb-10">
              <XCircle size={40} className="mx-auto mb-4 text-red-400" />
              <p className="text-sm font-bold tracking-[3px] text-red-500 mb-2">ORDER CANCELLED</p>
              <p className="text-xs text-[#888]">This order has been cancelled.</p>
            </div>
          ) : (
            <div className="mb-12">
              {/* Desktop stepper */}
              <div className="hidden sm:flex items-center justify-between mb-8 relative">
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#eee] z-0" />
                <div className="absolute top-5 left-0 h-0.5 bg-black z-0 transition-all duration-700"
                  style={{ width: currentStepIndex >= 0 ? `${(currentStepIndex / (STEPS.length - 1)) * 100}%` : '0%' }} />
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const done = i < currentStepIndex;
                  const active = i === currentStepIndex;
                  return (
                    <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        done ? 'bg-black border-black text-white' :
                        active ? 'bg-black border-black text-white scale-110 shadow-lg' :
                        'bg-white border-[#ddd] text-[#ccc]'}`}>
                        <Icon size={16} />
                      </div>
                      <p className={`text-[9px] font-bold tracking-wider mt-2 text-center ${active || done ? 'text-black' : 'text-[#bbb]'}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Mobile stepper */}
              <div className="sm:hidden flex flex-col gap-0 mb-8">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const done = i < currentStepIndex;
                  const active = i === currentStepIndex;
                  const last = i === STEPS.length - 1;
                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 ${done || active ? 'bg-black border-black text-white' : 'bg-white border-[#ddd] text-[#ccc]'}`}>
                          <Icon size={14} />
                        </div>
                        {!last && <div className={`w-0.5 flex-1 my-1 ${done ? 'bg-black' : 'bg-[#eee]'}`} />}
                      </div>
                      <div className="pb-6">
                        <p className={`text-[10px] font-bold tracking-wider ${active || done ? 'text-black' : 'text-[#bbb]'}`}>{step.label}</p>
                        {active && <p className="text-xs text-[#666] mt-1 leading-relaxed">{step.desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentStepIndex >= 0 && (
                <div className="hidden sm:block text-center p-5 bg-[#f9f9f9] border border-[#eee]">
                  <p className="text-xs text-[#666] leading-relaxed">{STEPS[currentStepIndex].desc}</p>
                </div>
              )}
            </div>
          )}

          {/* Address */}
          <div className="border border-[#eee] p-5 mb-8">
            <p className="text-[10px] text-[#888] tracking-[2px] mb-3">DELIVERY ADDRESS</p>
            <p className="text-sm text-[#444]">{order.address}</p>
          </div>

          {/* Items */}
          <div className="border border-[#eee] p-5 mb-10">
            <p className="text-[10px] text-[#888] tracking-[2px] mb-4">ORDER ITEMS</p>
            <div className="flex flex-col gap-3">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#f5f5f5] last:border-none">
                  <div>
                    <p className="text-sm font-bold tracking-wider">{item.name}</p>
                    <p className="text-xs text-[#888]">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold">{((item.finalItemPrice ?? item.price) * item.quantity).toLocaleString()} TK</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#eee] flex justify-between text-sm font-bold">
              <span>TOTAL</span>
              <span>{order.totalAmount?.toLocaleString()} TK</span>
            </div>
          </div>

          <div className="text-center">
            <Link to="/account" className="inline-flex items-center gap-2 text-xs tracking-[2px] text-[#888] hover:text-black transition-colors no-underline">
              ← BACK TO MY ACCOUNT
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;