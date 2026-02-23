import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const Account = () => {
  const toast = useToast();
  const { user } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchOrderHistory = async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(`${API_URL}/api/orders/customer/${user.email.toLowerCase()}`);
      setOrders(res.data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => { if (!user) navigate('/signin'); }, 2000);
      return () => clearTimeout(timer);
    }
    fetchOrderHistory();
  }, [user, navigate]);

  const handleCancel = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/cancel`);
      fetchOrderHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancellation failed.");
    }
  };

  if (loading) return (
    <div className="h-[80vh] flex items-center justify-center tracking-[2px]">
      RETRIEVING YOUR COLLECTION...
    </div>
  );

  return (
    <div className="px-[10%] py-20 min-h-[80vh]">

      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="tracking-[5px] text-3xl md:text-4xl font-bold">
          WELCOME, {user?.name?.toUpperCase()}
        </h1>
        <p className="text-[#888] text-xs mt-2.5">
          Manage your details and track your OneElixir orders.
        </p>
      </header>

      {/* Order History */}
      <section className="mt-10">
        <h2 className="text-sm tracking-[3px] border-b border-black pb-2.5 mb-5">
          ORDER HISTORY
        </h2>

        {orders.length === 0 ? (
          <p className="text-center text-[#888] mt-12 italic">No elixirs secured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[#eee]">
                  <th className="py-4 px-2.5 text-[11px] text-[#999] font-bold">DATE</th>
                  <th className="py-4 px-2.5 text-[11px] text-[#999] font-bold">ITEMS</th>
                  <th className="py-4 px-2.5 text-[11px] text-[#999] font-bold">TOTAL</th>
                  <th className="py-4 px-2.5 text-[11px] text-[#999] font-bold">STATUS</th>
                  <th className="py-4 px-2.5 text-[11px] text-[#999] font-bold">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id} className="border-b border-[#f9f9f9]">
                    <td className="py-5 px-2.5 text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-5 px-2.5 text-sm max-w-[200px]">
                      {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                    </td>
                    <td className="py-5 px-2.5 text-sm">{order.totalAmount} TK</td>
                    <td className="py-5 px-2.5 text-sm font-bold" style={{ color: getStatusColor(order.status) }}>
                      {order.status.toUpperCase()}
                    </td>
                    <td className="py-5 px-2.5 text-sm">
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          to={`/track/${order._id}`}
                          className="bg-transparent border border-black text-black px-2.5 py-1 text-[10px] cursor-pointer hover:bg-black hover:text-white transition-colors no-underline"
                        >
                          TRACK
                        </Link>
                        {order.status.toLowerCase() === 'pending' && (
                          <button
                            onClick={() => handleCancel(order._id)}
                            className="bg-transparent border border-[#e74c3c] text-[#e74c3c] px-2.5 py-1 text-[10px] cursor-pointer hover:bg-[#e74c3c] hover:text-white transition-colors"
                          >
                            CANCEL
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const getStatusColor = (status) => {
  const s = status?.toLowerCase();
  if (s === 'delivered') return '#27ae60';
  if (s === 'shipped') return '#f39c12';
  if (s === 'cancelled') return '#e74c3c';
  return '#888';
};

export default Account;