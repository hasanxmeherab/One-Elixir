import React, { useState, useMemo } from 'react';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { useOutletContext } from 'react-router-dom';
import Select from 'react-select';
import locationData from '../../data/locationData.json';
import { ImagePlus } from 'lucide-react';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;


// Returns today's date in local timezone as YYYY-MM-DD
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const ManualOrder = () => {
  const { perfumes = [], fetchData } = useOutletContext();

  const today = getLocalDate();
  const [orderData, setOrderData]         = useState({ customerName: '', phone: '', address: '', orderDate: today });
  const [division, setDivision]           = useState(null);
  const [district, setDistrict]           = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [freeDelivery, setFreeDelivery]   = useState(false);
  const [uploading, setUploading]         = useState(false);

  const [onlinePayment, setOnlinePayment] = useState({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' });
  const [selectedItems, setSelectedItems] = useState([{ perfumeId: '', variantIdx: null, quantity: 1, discountType: 'none', discountValue: 0 }]);
  const [couponCode, setCouponCode]       = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [totalDiscountType, setTotalDiscountType] = useState('none');
  const [totalDiscountValue, setTotalDiscountValue] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const isOnlinePayment = ['Bkash', 'Nagad', 'Bank Transfer'].includes(paymentMethod);

  const shippingCost = useMemo(() => {
    if (freeDelivery) return 0;
    if (!district) return 0;
    return district.value === 'Dhaka' ? 80 : 120;
  }, [district, freeDelivery]);

  const perfumeOptions = useMemo(() => {
    if (!perfumes.length) return [];
    const options = [];
    perfumes.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v, idx) => {
          options.push({
            value: `${p._id}__${idx}`,
            label: `${p.name} — ${v.label} (${v.price} TK) — Stock: ${v.stock}`,
            perfumeId: p._id,
            variantIdx: idx,
            price: v.price,
            stock: v.stock,
            fullName: `${p.name} — ${v.label}`,
          });
        });
      } else {
        options.push({
          value: p._id,
          label: `${p.name} (${p.price} TK) — Stock: ${p.stock}`,
          perfumeId: p._id,
          variantIdx: null,
          price: p.price,
          stock: p.stock,
          fullName: p.name,
        });
      }
    });
    return options;
  }, [perfumes]);

  const getSelectedOption = (item) => {
    if (!item.perfumeId) return null;
    const key = item.variantIdx != null ? `${item.perfumeId}__${item.variantIdx}` : item.perfumeId;
    return perfumeOptions.find(opt => opt.value === key) || null;
  };

  if (!perfumes || perfumes.length === 0)
    return <div className="p-10 text-center">Loading Perfume Data...</div>;

  const calculateSubtotal = () => selectedItems.reduce((sum, item) => {
    const opt = getSelectedOption(item);
    if (!opt) return sum;
    let itemPrice = opt.price;
    if (item.discountType === 'percentage') itemPrice -= (itemPrice * item.discountValue) / 100;
    else if (item.discountType === 'fixed')  itemPrice -= item.discountValue;
    return sum + (itemPrice * item.quantity);
  }, 0);

  const subtotal   = calculateSubtotal();
  const afterCoupon = subtotal - couponDiscount;
  const totalDiscountAmount = totalDiscountType === 'percentage'
    ? (afterCoupon * totalDiscountValue) / 100
    : totalDiscountType === 'fixed' ? totalDiscountValue : 0;
  const grandTotal = afterCoupon - totalDiscountAmount + shippingCost;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    try {
      const res = await adminAxios.post(`${API_URL}/api/coupons/validate`, { code: couponCode });
      const discountAmount = res.data.discountType === 'percentage'
        ? (subtotal * res.data.discountValue) / 100
        : res.data.discountValue;
      setCouponDiscount(discountAmount);
      alert(`Coupon applied! ${discountAmount.toLocaleString()} TK off.`);
    } catch {
      alert('Invalid or expired coupon.');
      setCouponDiscount(0);
    } finally { setCouponLoading(false); }
  };

  const uploadScreenshot = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
    return res.data.secure_url;
  };

  const addMoreItems  = () => setSelectedItems([...selectedItems, { perfumeId: '', variantIdx: null, quantity: 1, discountType: 'none', discountValue: 0 }]);
  const removeItemRow = (index) => { if (selectedItems.length > 1) setSelectedItems(selectedItems.filter((_, i) => i !== index)); };
  const updateItemRow = (index, field, value) => {
    const updated = [...selectedItems]; updated[index][field] = value; setSelectedItems(updated);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!division || !district) { alert('Please select Division and District.'); return; }
    if (isOnlinePayment && (!onlinePayment.senderNumber || !onlinePayment.transactionId)) {
      alert('Please fill sender number and transaction ID.'); return;
    }

    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const adminName = adminData.name || 'System Admin';
    const itemsToOrder = [];

    for (const item of selectedItems) {
      if (!item.perfumeId) continue;
      const opt = getSelectedOption(item);
      if (!opt || opt.stock < item.quantity) { alert(`Insufficient stock for ${opt?.fullName || 'selected item'}`); return; }
      let finalItemPrice = opt.price;
      if (item.discountType === 'percentage') finalItemPrice -= (opt.price * item.discountValue) / 100;
      else if (item.discountType === 'fixed')  finalItemPrice -= item.discountValue;
      itemsToOrder.push({ perfumeId: item.perfumeId, name: opt.fullName, price: opt.price, quantity: item.quantity, discountType: item.discountType, discountValue: item.discountValue, finalItemPrice });
    }

    try {
      setUploading(true);
      let screenshotUrl = onlinePayment.screenshotUrl;
      if (isOnlinePayment && onlinePayment.screenshot) {
        try { screenshotUrl = await uploadScreenshot(onlinePayment.screenshot); }
        catch { console.warn('Screenshot upload failed, continuing without it.'); }
      }
      const authHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } };
      const orderPayload = {
        ...orderData,
        address: `${orderData.address}, ${district.label}, ${division.label}`,
        items: itemsToOrder, totalAmount: grandTotal, shippingCost, freeDelivery,
        discountApplied: couponDiscount + totalDiscountAmount, paymentMethod, paymentStatus,
        isManual: true, createdBy: adminName,
        createdAt: orderData.orderDate ? new Date(orderData.orderDate).toISOString() : new Date().toISOString(),
        ...(isOnlinePayment && { paymentDetails: { platform: paymentMethod, senderNumber: onlinePayment.senderNumber, transactionId: onlinePayment.transactionId, screenshot: screenshotUrl } })
      };
      console.log('Order payload being sent:', orderPayload);
      await adminAxios.post(`${API_URL}/api/orders/manual`, orderPayload, authHeader);

      setOrderData({ customerName: '', phone: '', address: '', orderDate: getLocalDate() });
      setDivision(null); setDistrict(null);
      setSelectedItems([{ perfumeId: '', variantIdx: null, quantity: 1, discountType: 'none', discountValue: 0 }]);
      setCouponDiscount(0); setCouponCode('');
      setTotalDiscountType('none'); setTotalDiscountValue(0);
      setPaymentMethod('Cash on Delivery'); setPaymentStatus('Unpaid');
      setFreeDelivery(false);
      setOnlinePayment({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' });
      fetchData();
      alert('Manual Order Recorded Successfully!');
    } catch (err) { 
      console.error('Order submission error:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.join(', ') || err.message || 'Failed to record order.';
      alert(`Error: ${errorMessage}`);
    }
    finally { setUploading(false); }
  };

  const customSelectStyles = {
    control: (p) => ({ ...p, padding: '5px', border: '1px solid #ddd', borderRadius: 0, fontSize: '13px', boxShadow: 'none', '&:hover': { border: '1px solid #000' } })
  };

  return (
    <div className="w-full">
      <h3 className="tracking-[2px] mb-8 font-bold">CREATE MANUAL ORDER</h3>

      <form onSubmit={handleOrderSubmit} className="flex flex-col gap-4 bg-[#fcfcfc] p-4 sm:p-8 border border-[#eee]">

        {/* ── Customer Info ── */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input type="text" placeholder="Customer Name" value={orderData.customerName}
            onChange={e => setOrderData({...orderData, customerName: e.target.value})} required
            className="flex-1 p-3 border border-[#ddd] outline-none text-[13px]" />
          <input type="tel" placeholder="Phone Number" value={orderData.phone}
            inputMode="numeric" maxLength={11}
            onChange={e => setOrderData({...orderData, phone: e.target.value.replace(/\D/g, '')})} required
            className="flex-1 p-3 border border-[#ddd] outline-none text-[13px]" />
        </div>

        {/* ── Order Date ── */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 tracking-wider">ORDER DATE</label>
            <input type="date" value={orderData.orderDate}
              onChange={e => setOrderData({...orderData, orderDate: e.target.value})} required
              className="p-3 border border-[#ddd] outline-none text-[13px] w-full" />
          </div>
          <div className="flex-1" />
        </div>

        {/* ── Items ── */}
        <p className="text-[10px] font-bold text-gray-400 tracking-wider mt-2">SELECT ITEMS & DISCOUNTS</p>
        {selectedItems.map((item, index) => {
          const currentOption = getSelectedOption(item);
          let linePrice = currentOption ? currentOption.price : 0;
          if (item.discountType === 'percentage') linePrice -= (linePrice * item.discountValue) / 100;
          else if (item.discountType === 'fixed')  linePrice -= item.discountValue;
          const lineTotal = linePrice * item.quantity;
          const otherValues = selectedItems.filter((_, i) => i !== index).map(si => si.variantIdx != null ? `${si.perfumeId}__${si.variantIdx}` : si.perfumeId);
          return (
            <div key={index} className="border-b border-[#f0f0f0] pb-4 mb-1">
              <div className="flex flex-wrap gap-2.5 items-center">
                <div className="flex-[3] min-w-[200px]">
                  <Select
                    options={perfumeOptions.filter(opt => !otherValues.includes(opt.value))}
                    isOptionDisabled={(opt) => opt.stock <= 0}
                    value={currentOption}
                    onChange={(opt) => {
                      const updated = [...selectedItems];
                      if (opt) {
                        updated[index] = { ...updated[index], perfumeId: opt.perfumeId, variantIdx: opt.variantIdx };
                      } else {
                        updated[index] = { ...updated[index], perfumeId: '', variantIdx: null };
                      }
                      setSelectedItems(updated);
                    }}
                    placeholder="Search & pick perfume..."
                    isClearable
                    styles={customSelectStyles}
                  />
                </div>
                <input type="number" placeholder="Qty" min="1" value={item.quantity}
                  onChange={e => updateItemRow(index, 'quantity', parseInt(e.target.value))} required
                  className="flex-1 p-3 border border-[#ddd] outline-none text-[13px]" />
                {selectedItems.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(index)}
                    className="text-red-500 border-none bg-transparent cursor-pointer text-xl font-bold">×</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5 mt-2.5 items-center">
                <select value={item.discountType} onChange={e => updateItemRow(index, 'discountType', e.target.value)}
                  className="flex-1 p-3 border border-[#ddd] outline-none text-[13px] bg-[#f9f9f9]">
                  <option value="none">No Discount</option>
                  <option value="fixed">Fixed (TK)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                <input type="number" placeholder="Disc. Val" disabled={item.discountType === 'none'}
                  value={item.discountValue || ''} onChange={e => updateItemRow(index, 'discountValue', parseFloat(e.target.value) || 0)}
                  className="flex-1 p-3 border border-[#ddd] outline-none text-[13px] disabled:opacity-40" />
                <div className="min-w-[100px] text-right font-bold text-sm">{lineTotal.toLocaleString()} TK</div>
              </div>
            </div>
          );
        })}
        <button type="button" onClick={addMoreItems}
          className="bg-transparent border-none text-black cursor-pointer font-bold text-[11px] underline self-start">
          + ADD ANOTHER ITEM
        </button>

        {/* ── Location ── */}
        <p className="text-[10px] font-bold text-gray-400 tracking-wider mt-2">SHIPPING LOCATION</p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1">
            <Select options={locationData.divisions} styles={customSelectStyles} placeholder="Select Division"
              value={division} onChange={opt => { setDivision(opt); setDistrict(null); }} />
          </div>
          <div className="flex-1">
            <Select options={division ? locationData.districtsByDivision[division.value] : []}
              styles={customSelectStyles} placeholder="Select District"
              isDisabled={!division} value={district} onChange={opt => setDistrict(opt)} />
          </div>
        </div>
        <input type="text" placeholder="House Number, Road, Area Details"
          value={orderData.address} onChange={e => setOrderData({...orderData, address: e.target.value})} required
          className="p-3 border border-[#ddd] outline-none text-[13px]" />

        {/* ── Free Delivery Toggle ── */}
        <div
          onClick={() => setFreeDelivery(f => !f)}
          className={`flex items-center gap-3 px-4 py-3.5 border rounded cursor-pointer transition-colors ${freeDelivery ? 'bg-green-50 border-green-300' : 'bg-[#f9f9f9] border-[#eee]'}`}>
          <div className={`relative w-[42px] h-6 rounded-full transition-colors flex-shrink-0 ${freeDelivery ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${freeDelivery ? 'left-[21px]' : 'left-[3px]'}`} />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wider m-0">FREE DELIVERY</p>
            <p className="text-[10px] text-gray-400 m-0">
              {freeDelivery ? '✓ Shipping charge waived' : `Normal charge: ${district ? (district.value === 'Dhaka' ? '80' : '120') : '80–120'} TK`}
            </p>
          </div>
        </div>

        {/* ── Payment ── */}
        <p className="text-[10px] font-bold text-gray-400 tracking-wider mt-2">PAYMENT DETAILS</p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <select value={paymentMethod}
            onChange={e => { setPaymentMethod(e.target.value); setOnlinePayment({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' }); }}
            className="flex-1 p-3 border border-[#ddd] outline-none text-[13px]">
            <option value="Cash on Delivery">Cash on Delivery</option>
            <option value="Bkash">Bkash</option>
            <option value="Nagad">Nagad</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
          <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
            className={`flex-1 p-3 border border-[#ddd] outline-none text-[13px] font-bold ${paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        {/* ── Online Payment Fields ── */}
        {isOnlinePayment && (
          <div className="flex flex-col gap-2.5 p-5 bg-[#f9f9f9] border border-[#eee] rounded">
            <p className="text-[10px] font-bold text-gray-500 tracking-wider mt-0">
              {paymentMethod.toUpperCase()} PAYMENT DETAILS
            </p>
            <input type="tel"
              placeholder={`Sender ${paymentMethod === 'Bank Transfer' ? 'Account Number' : 'Phone Number'}`}
              value={onlinePayment.senderNumber} inputMode="numeric"
              maxLength={paymentMethod === 'Bank Transfer' ? 20 : 11}
              onChange={e => setOnlinePayment({ ...onlinePayment, senderNumber: e.target.value.replace(/\D/g, '') })}
              className="p-3 border border-[#ddd] outline-none text-[13px]" />
            <input type="text" placeholder="Transaction ID (TrxID / Ref No.)"
              value={onlinePayment.transactionId}
              onChange={e => setOnlinePayment({ ...onlinePayment, transactionId: e.target.value })}
              className="p-3 border border-[#ddd] outline-none text-[13px]" />
            <label className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed cursor-pointer rounded transition-all ${onlinePayment.screenshot ? 'border-black bg-green-50' : 'border-[#ddd] bg-white'}`}>
              <ImagePlus size={22} className="text-gray-400" />
              <span className="text-[11px] font-bold tracking-wider">
                {onlinePayment.screenshot ? '✓ SCREENSHOT SELECTED' : 'CLICK TO UPLOAD PAYMENT SCREENSHOT'}
              </span>
              <span className="text-[10px] text-gray-300">
                {onlinePayment.screenshot ? onlinePayment.screenshot.name : 'JPG or PNG — proof of payment'}
              </span>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => setOnlinePayment({ ...onlinePayment, screenshot: e.target.files[0], screenshotUrl: '' })} />
            </label>
            {onlinePayment.screenshotUrl && !onlinePayment.screenshot && (
              <div className="flex items-center gap-2.5 text-[11px] text-gray-500">
                <img src={onlinePayment.screenshotUrl} alt="Payment proof" className="w-15 h-15 object-cover border border-[#eee]" style={{width:60,height:60}} />
                <span>Payment screenshot uploaded</span>
              </div>
            )}
          </div>
        )}

        {/* ── Coupon ── */}
        <p className="text-[10px] font-bold text-gray-400 tracking-wider mt-2">APPLY COUPON (OPTIONAL)</p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input type="text" placeholder="COUPON CODE" value={couponCode}
            onChange={e => setCouponCode(e.target.value.toUpperCase())}
            className="flex-1 p-3 border border-[#ddd] outline-none text-[13px]" />
          <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode}
            className="px-5 bg-[#444] text-white border-none cursor-pointer text-xs font-bold disabled:opacity-50">
            {couponLoading ? '...' : 'APPLY'}
          </button>
        </div>

        {/* ── Total Discount ── */}
        <p className="text-[10px] font-bold text-gray-400 tracking-wider mt-2">DISCOUNT ON TOTAL (OPTIONAL)</p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <select value={totalDiscountType} onChange={e => { setTotalDiscountType(e.target.value); if (e.target.value === 'none') setTotalDiscountValue(0); }}
            className="flex-1 p-3 border border-[#ddd] outline-none text-[13px] bg-[#f9f9f9]">
            <option value="none">No Discount</option>
            <option value="fixed">Fixed (TK)</option>
            <option value="percentage">Percentage (%)</option>
          </select>
          <input type="number" placeholder="Discount value" min="0"
            disabled={totalDiscountType === 'none'}
            value={totalDiscountValue || ''}
            onChange={e => setTotalDiscountValue(parseFloat(e.target.value) || 0)}
            className="flex-1 p-3 border border-[#ddd] outline-none text-[13px] disabled:opacity-40" />
        </div>

        {/* ── Summary ── */}
        <div className="mt-5 p-5 bg-black text-white flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] opacity-70">SUBTOTAL: {subtotal.toLocaleString()} TK</span>
            {couponDiscount > 0 && <span className="text-[11px] text-red-400">COUPON: -{couponDiscount.toLocaleString()} TK</span>}
            {totalDiscountAmount > 0 && <span className="text-[11px] text-red-400">TOTAL DISCOUNT: -{totalDiscountAmount.toLocaleString()} TK</span>}
            <span className="text-[11px] opacity-70">SHIPPING: {freeDelivery ? '🎁 FREE' : `+${shippingCost} TK`}</span>
            <span className="text-xs tracking-[2px] mt-1">GRAND TOTAL</span>
          </div>
          <span className="text-[22px] font-bold">{grandTotal.toLocaleString()} TK</span>
        </div>

        <button type="submit" disabled={uploading}
          className={`p-4 bg-black text-white border-none cursor-pointer font-bold tracking-[2px] mt-2.5 transition-opacity ${uploading ? 'opacity-60' : 'hover:opacity-80'}`}>
          {uploading ? 'UPLOADING...' : 'CONFIRM ORDER'}
        </button>
      </form>
    </div>
  );
};

export default ManualOrder;