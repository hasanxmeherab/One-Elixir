import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useOutletContext } from 'react-router-dom';
import Select from 'react-select';
import locationData from '../data/locationData.json';
import { useToast } from '../context/ToastContext';

const ManualOrder = () => {
  const toast = useToast();
  const { perfumes = [], fetchData } = useOutletContext();

  const [orderData, setOrderData] = useState({ customerName: '', phone: '', address: '' });
  const [division, setDivision] = useState(null);
  const [district, setDistrict] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [selectedItems, setSelectedItems] = useState([{ perfumeId: '', quantity: 1, discountType: 'none', discountValue: 0 }]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const shippingCost = useMemo(() => {
    if (!district) return 0;
    return district.value === 'Dhaka' ? 80 : 120;
  }, [district]);

  if (!perfumes || perfumes.length === 0) {
    return <div className="p-10 text-center">Loading Perfume Data...</div>;
  }

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      if (!perfume) return sum;
      let itemPrice = perfume.price;
      if (item.discountType === 'percentage') itemPrice -= (itemPrice * item.discountValue) / 100;
      else if (item.discountType === 'fixed') itemPrice -= item.discountValue;
      return sum + (itemPrice * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const grandTotal = subtotal - couponDiscount + shippingCost;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/coupons/validate`, { code: couponCode });
      let discountAmount = res.data.discountType === 'percentage'
        ? (subtotal * res.data.discountValue) / 100
        : res.data.discountValue;
      setCouponDiscount(discountAmount);
      toast.success(`Coupon applied! ${discountAmount.toLocaleString()} TK discount added.`);
    } catch (err) {
      toast.error("Invalid or expired coupon.");
      setCouponDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const addMoreItems = () => setSelectedItems([...selectedItems, { perfumeId: '', quantity: 1, discountType: 'none', discountValue: 0 }]);

  const updateItemRow = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  const removeItemRow = (index) => {
    if (selectedItems.length > 1) setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!division || !district) { toast.warning("Please select Division and District."); return; }

    const itemsToOrder = [];
    const adminDataString = localStorage.getItem('adminData');
    const adminData = adminDataString ? JSON.parse(adminDataString) : null;
    const adminName = adminData ? adminData.name : "System Admin";

    for (const item of selectedItems) {
      if (!item.perfumeId) continue;
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      if (!perfume || perfume.stock < item.quantity) {
        toast.error(`Insufficient stock for ${perfume?.name || 'selected item'}.`);
        return;
      }
      let finalItemPrice = perfume.price;
      if (item.discountType === 'percentage') finalItemPrice -= (perfume.price * item.discountValue) / 100;
      else if (item.discountType === 'fixed') finalItemPrice -= item.discountValue;
      itemsToOrder.push({
        perfumeId: perfume._id, name: perfume.name, price: perfume.price,
        quantity: item.quantity, discountType: item.discountType,
        discountValue: item.discountValue, finalItemPrice
      });
    }

    try {
      await axios.post(`${API_URL}/api/orders/manual`, {
        ...orderData,
        address: `${orderData.address}, ${district.label}, ${division.label}`,
        items: itemsToOrder, totalAmount: grandTotal, shippingCost,
        discountApplied: couponDiscount, paymentMethod, paymentStatus,
        isManual: true, createdBy: adminName
      });
      for (const item of itemsToOrder) {
        const perfume = perfumes.find(p => p._id === item.perfumeId);
        await axios.put(`${API_URL}/api/perfumes/${item.perfumeId}`, { stock: perfume.stock - item.quantity });
      }
      setOrderData({ customerName: '', phone: '', address: '' });
      setDivision(null); setDistrict(null);
      setSelectedItems([{ perfumeId: '', quantity: 1, discountType: 'none', discountValue: 0 }]);
      setCouponDiscount(0); setCouponCode('');
      setPaymentMethod('Cash on Delivery'); setPaymentStatus('Unpaid');
      fetchData();
      toast.success("Manual order recorded successfully!");
    } catch (err) {
      toast.error("Failed to record order. Please try again.");
    }
  };

  const customSelectStyles = {
    control: (provided) => ({
      ...provided, padding: '5px', border: '1px solid #ddd', borderRadius: '0',
      fontSize: '13px', boxShadow: 'none', '&:hover': { border: '1px solid #000' }
    })
  };

  return (
    <div className="max-w-[800px]">
      <h3 className="tracking-[2px] mb-8 font-bold">CREATE MANUAL ORDER</h3>

      <form onSubmit={handleOrderSubmit} className="flex flex-col gap-4 bg-[#fcfcfc] p-8 border border-[#eee]">

        {/* CUSTOMER INFO */}
        <div className="flex gap-2.5 flex-col sm:flex-row">
          <input
            type="text" placeholder="Customer Name" required
            value={orderData.customerName} onChange={e => setOrderData({...orderData, customerName: e.target.value})}
            className="flex-1 p-3 border border-[#ddd] outline-none text-sm"
          />
          <input
            type="text" placeholder="Phone Number" required
            value={orderData.phone} onChange={e => setOrderData({...orderData, phone: e.target.value})}
            className="flex-1 p-3 border border-[#ddd] outline-none text-sm"
          />
        </div>

        {/* ITEMS */}
        <p className="text-[10px] font-bold text-[#888] tracking-wider mt-2.5">SELECT ITEMS & DISCOUNTS</p>
        {selectedItems.map((item, index) => {
          const currentPerfume = perfumes.find(p => p._id === item.perfumeId);
          let linePrice = currentPerfume ? currentPerfume.price : 0;
          if (item.discountType === 'percentage') linePrice -= (linePrice * item.discountValue) / 100;
          else if (item.discountType === 'fixed') linePrice -= item.discountValue;
          const lineTotal = linePrice * item.quantity;
          const otherSelectedIds = selectedItems.filter((_, i) => i !== index).map(si => si.perfumeId);

          return (
            <div key={index} className="border-b border-[#f0f0f0] pb-4 mb-1">
              <div className="flex gap-2.5 items-center flex-wrap">
                <select
                  value={item.perfumeId} required
                  onChange={e => updateItemRow(index, 'perfumeId', e.target.value)}
                  className="flex-[3] min-w-[140px] p-3 border border-[#ddd] outline-none text-sm"
                >
                  <option value="" disabled hidden>-- PICK PERFUME --</option>
                  {perfumes.map(p => !otherSelectedIds.includes(p._id) && (
                    <option key={p._id} value={p._id} disabled={p.stock <= 0}>
                      {p.name} ({p.price} TK)
                    </option>
                  ))}
                </select>
                <input
                  type="number" placeholder="Qty" min="1" required
                  value={item.quantity}
                  onChange={e => updateItemRow(index, 'quantity', parseInt(e.target.value))}
                  className="w-[70px] p-3 border border-[#ddd] outline-none text-sm"
                />
                {selectedItems.length > 1 && (
                  <button
                    type="button" onClick={() => removeItemRow(index)}
                    className="text-red-500 border-none bg-transparent cursor-pointer text-xl font-bold"
                  >×</button>
                )}
              </div>

              <div className="flex gap-2.5 mt-2.5 items-center flex-wrap">
                <select
                  value={item.discountType}
                  onChange={e => updateItemRow(index, 'discountType', e.target.value)}
                  className="flex-1 p-3 border border-[#ddd] outline-none text-sm bg-[#f9f9f9]"
                >
                  <option value="none">No Discount</option>
                  <option value="fixed">Fixed (TK)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                <input
                  type="number" placeholder="Disc. Val"
                  disabled={item.discountType === 'none'}
                  value={item.discountValue || ''}
                  onChange={e => updateItemRow(index, 'discountValue', parseFloat(e.target.value) || 0)}
                  className="flex-1 p-3 border border-[#ddd] outline-none text-sm disabled:opacity-50"
                />
                <div className="min-w-[100px] text-right font-bold text-sm">
                  {lineTotal.toLocaleString()} TK
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button" onClick={addMoreItems}
          className="bg-transparent border-none text-black cursor-pointer font-bold text-[11px] underline self-start"
        >
          + ADD ANOTHER ITEM
        </button>

        {/* LOCATION */}
        <p className="text-[10px] font-bold text-[#888] tracking-wider mt-2.5">SHIPPING LOCATION</p>
        <div className="flex gap-2.5 flex-col sm:flex-row">
          <div className="flex-1">
            <Select
              options={locationData.divisions} styles={customSelectStyles}
              placeholder="Select Division" value={division}
              onChange={(opt) => { setDivision(opt); setDistrict(null); }}
            />
          </div>
          <div className="flex-1">
            <Select
              options={division ? locationData.districtsByDivision[division.value] : []}
              styles={customSelectStyles} placeholder="Select District"
              isDisabled={!division} value={district}
              onChange={(opt) => setDistrict(opt)}
            />
          </div>
        </div>
        <input
          type="text" placeholder="House Number, Road, Area Details" required
          value={orderData.address} onChange={e => setOrderData({...orderData, address: e.target.value})}
          className="p-3 border border-[#ddd] outline-none text-sm mt-2.5"
        />

        {/* PAYMENT */}
        <p className="text-[10px] font-bold text-[#888] tracking-wider mt-2.5">PAYMENT DETAILS</p>
        <div className="flex gap-2.5 flex-col sm:flex-row">
          <select
            value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
            className="flex-1 p-3 border border-[#ddd] outline-none text-sm"
          >
            <option value="Cash on Delivery">Cash on Delivery</option>
            <option value="Bkash">Bkash</option>
            <option value="Nagad">Nagad</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
          <select
            value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
            className={`flex-1 p-3 border border-[#ddd] outline-none text-sm font-bold ${paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        {/* COUPON */}
        <p className="text-[10px] font-bold text-[#888] tracking-wider mt-2.5">APPLY COUPON (OPTIONAL)</p>
        <div className="flex gap-2.5 items-stretch max-w-[320px]">
          <input
            type="text" placeholder="COUPON CODE"
            value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
            className="flex-1 p-3 border border-[#ddd] outline-none text-sm"
          />
          <button
            type="button" onClick={handleApplyCoupon}
            disabled={couponLoading || !couponCode}
            className="px-5 py-3 bg-[#444] text-white border-none cursor-pointer text-xs font-bold hover:bg-gray-600 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {couponLoading ? '...' : 'APPLY'}
          </button>
        </div>

        {/* TOTAL BAR */}
        <div className="mt-5 p-5 bg-black text-white flex justify-between items-center flex-wrap gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] opacity-70">SUBTOTAL: {subtotal.toLocaleString()} TK</span>
            {couponDiscount > 0 && (
              <span className="text-[10px] text-red-400">COUPON: -{couponDiscount.toLocaleString()} TK</span>
            )}
            <span className="text-[10px] opacity-90">
              SHIPPING ({district ? district.label : 'Select District'}): +{shippingCost.toLocaleString()} TK
            </span>
            <span className="text-xs tracking-[2px] mt-1">GRAND TOTAL</span>
          </div>
          <span className="text-xl font-bold">{grandTotal.toLocaleString()} TK</span>
        </div>

        <button
          type="submit"
          className="p-4 bg-black text-white border-none cursor-pointer font-bold tracking-[2px] mt-2.5 hover:bg-gray-800 transition-colors"
        >
          CONFIRM ORDER
        </button>
      </form>
    </div>
  );
};

export default ManualOrder;