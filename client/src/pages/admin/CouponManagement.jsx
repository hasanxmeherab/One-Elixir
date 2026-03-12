import React, { useState, useEffect } from 'react';
import adminAxios from '../utils/adminAxios';
import { useToast } from '../context/ToastContext';

const CouponManagement = () => {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountValue: '', discountType: 'percentage' });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try {
      const res = await adminAxios.get(`${API_URL}/api/coupons`);
      setCoupons(res.data);
    } catch (err) { console.error("Error fetching coupons", err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminAxios.post(`${API_URL}/api/coupons`, newCoupon);
      setNewCoupon({ code: '', discountValue: '', discountType: 'percentage' });
      fetchCoupons();
      toast.success("Coupon created successfully!");
    } catch (err) { toast.error("Failed to create coupon."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this coupon?")) {
      try {
        await adminAxios.delete(`${API_URL}/api/coupons/${id}`);
        fetchCoupons();
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="p-5 bg-white border border-[#eee]">
      <h2 className="tracking-[2px] text-sm mb-5 font-bold">COUPON MANAGEMENT</h2>

      {/* Create Coupon Form */}
      <form onSubmit={handleCreate} className="flex gap-2.5 mb-8 flex-wrap">
        <input
          type="text" placeholder="CODE (e.g. SAVE20)" required
          value={newCoupon.code}
          onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
          className="p-2.5 border border-[#ddd] outline-none text-sm flex-1 min-w-[120px]"
        />
        <input
          type="number" placeholder="Value" required
          value={newCoupon.discountValue}
          onChange={e => setNewCoupon({...newCoupon, discountValue: e.target.value})}
          className="p-2.5 border border-[#ddd] outline-none text-sm flex-1 min-w-[100px]"
        />
        <select
          value={newCoupon.discountType}
          onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value})}
          className="p-2.5 border border-[#ddd] outline-none text-sm flex-1 min-w-[140px]"
        >
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed Amount (TK)</option>
        </select>
        <button
          type="submit"
          className="bg-black text-white border-none px-5 py-2.5 cursor-pointer font-bold text-sm hover:bg-gray-800 transition-colors"
        >
          CREATE COUPON
        </button>
      </form>

      {/* Coupon Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b-2 border-black text-xs">
              <th className="py-3 px-2">CODE</th>
              <th className="py-3 px-2">VALUE</th>
              <th className="py-3 px-2">TYPE</th>
              <th className="py-3 px-2">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c._id} className="border-b border-[#eee] text-sm">
                <td className="py-3 px-2 font-bold tracking-wider">{c.code}</td>
                <td className="py-3 px-2">{c.discountValue}</td>
                <td className="py-3 px-2 capitalize">{c.discountType}</td>
                <td className="py-3 px-2">
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="text-red-500 bg-transparent border-none cursor-pointer text-[11px] underline hover:opacity-70 transition-opacity"
                  >
                    DELETE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CouponManagement;