import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useOutletContext } from 'react-router-dom';
import Select from 'react-select';
import locationData from '../data/locationData.json';
import { ImagePlus } from 'lucide-react';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const ManualOrder = () => {
  const { perfumes = [], fetchData } = useOutletContext();

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [orderData, setOrderData]       = useState({ customerName: '', phone: '', address: '', orderDate: today });
  const [division, setDivision]         = useState(null);
  const [district, setDistrict]         = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [uploading, setUploading]       = useState(false);

  // Online payment fields
  const [onlinePayment, setOnlinePayment] = useState({
    senderNumber:  '',
    transactionId: '',
    screenshot:    null,
    screenshotUrl: '',
  });

  const [selectedItems, setSelectedItems] = useState([{
    perfumeId: '', quantity: 1, discountType: 'none', discountValue: 0
  }]);

  const [couponCode, setCouponCode]       = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const isOnlinePayment = ['Bkash', 'Nagad', 'Bank Transfer'].includes(paymentMethod);

  const shippingCost = useMemo(() => {
    if (freeDelivery) return 0;
    if (!district) return 0;
    return district.value === 'Dhaka' ? 80 : 120;
  }, [district, freeDelivery]);

  if (!perfumes || perfumes.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Perfume Data...</div>;
  }

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      if (!perfume) return sum;
      let itemPrice = perfume.price;
      if (item.discountType === 'percentage') itemPrice -= (itemPrice * item.discountValue) / 100;
      else if (item.discountType === 'fixed')  itemPrice -= item.discountValue;
      return sum + (itemPrice * item.quantity);
    }, 0);
  };

  const subtotal   = calculateSubtotal();
  const grandTotal = subtotal - couponDiscount + shippingCost;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/coupons/validate`, { code: couponCode });
      const discountAmount = res.data.discountType === 'percentage'
        ? (subtotal * res.data.discountValue) / 100
        : res.data.discountValue;
      setCouponDiscount(discountAmount);
      alert(`Coupon applied! ${discountAmount.toLocaleString()} TK off.`);
    } catch {
      alert('Invalid or expired coupon.');
      setCouponDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const uploadScreenshot = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
    return res.data.secure_url;
  };

  const addMoreItems  = () => setSelectedItems([...selectedItems, { perfumeId: '', quantity: 1, discountType: 'none', discountValue: 0 }]);
  const removeItemRow = (index) => { if (selectedItems.length > 1) setSelectedItems(selectedItems.filter((_, i) => i !== index)); };
  const updateItemRow = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!division || !district) { alert('Please select Division and District.'); return; }

    // Validate online payment fields
    if (isOnlinePayment) {
      if (!onlinePayment.senderNumber || !onlinePayment.transactionId) {
        alert('Please fill sender number and transaction ID.');
        return;
      }
      // Screenshot is optional — order saves without it if upload fails
    }

    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const adminName = adminData.name || 'System Admin';

    const itemsToOrder = [];
    for (const item of selectedItems) {
      if (!item.perfumeId) continue;
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      if (!perfume || perfume.stock < item.quantity) {
        alert(`Insufficient stock for ${perfume?.name || 'selected item'}`);
        return;
      }
      let finalItemPrice = perfume.price;
      if (item.discountType === 'percentage') finalItemPrice -= (perfume.price * item.discountValue) / 100;
      else if (item.discountType === 'fixed')  finalItemPrice -= item.discountValue;
      itemsToOrder.push({
        perfumeId: perfume._id, name: perfume.name,
        price: perfume.price, quantity: item.quantity,
        discountType: item.discountType, discountValue: item.discountValue,
        finalItemPrice
      });
    }

    try {
      setUploading(true);

      // Upload screenshot if new file selected (optional — order saves without it if upload fails)
      let screenshotUrl = onlinePayment.screenshotUrl;
      if (isOnlinePayment && onlinePayment.screenshot) {
        try {
          screenshotUrl = await uploadScreenshot(onlinePayment.screenshot);
        } catch (uploadErr) {
          console.warn('Screenshot upload failed, continuing without it.');
        }
      }

      const authHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } };

      await axios.post(`${API_URL}/api/orders/manual`, {
        ...orderData,
        address: `${orderData.address}, ${district.label}, ${division.label}`,
        items: itemsToOrder,
        totalAmount: grandTotal,
        shippingCost,
        freeDelivery,
        discountApplied: couponDiscount,
        paymentMethod,
        paymentStatus,
        isManual: true,
        createdBy: adminName,
        createdAt: orderData.orderDate ? new Date(orderData.orderDate).toISOString() : new Date().toISOString(),
        // Online payment details — saved to paymentDetails field (same as web checkout)
        ...(isOnlinePayment && {
          paymentDetails: {
            platform:      paymentMethod,
            senderNumber:  onlinePayment.senderNumber,
            transactionId: onlinePayment.transactionId,
            screenshot:    screenshotUrl,
          }
        })
      }, authHeader);

      // Reset
      setOrderData({ customerName: '', phone: '', address: '', orderDate: new Date().toISOString().split('T')[0] });
      setDivision(null); setDistrict(null);
      setSelectedItems([{ perfumeId: '', quantity: 1, discountType: 'none', discountValue: 0 }]);
      setCouponDiscount(0); setCouponCode('');
      setPaymentMethod('Cash on Delivery'); setPaymentStatus('Unpaid');
      setFreeDelivery(false);
      setOnlinePayment({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' });
      fetchData();
      alert('Manual Order Recorded Successfully!');
    } catch (err) {
      alert('Failed to record order.');
    } finally {
      setUploading(false);
    }
  };

  const customSelectStyles = {
    control: (p) => ({ ...p, padding: '5px', border: '1px solid #ddd', borderRadius: 0, fontSize: '13px', boxShadow: 'none', '&:hover': { border: '1px solid #000' } })
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ letterSpacing: '2px', marginBottom: '30px' }}>CREATE MANUAL ORDER</h3>

      <form onSubmit={handleOrderSubmit} style={formStyle}>

        {/* ── Customer Info ── */}
        <div style={row}>
          <input type="text" placeholder="Customer Name" value={orderData.customerName}
            onChange={e => setOrderData({...orderData, customerName: e.target.value})} required style={inputStyle} />
          <input type="tel" placeholder="Phone Number" value={orderData.phone}
            inputMode="numeric" maxLength={11}
            onChange={e => setOrderData({...orderData, phone: e.target.value.replace(/\D/g, '')})} required style={inputStyle} />
        </div>

        {/* ── Order Date ── */}
        <div style={row}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={labelStyle}>ORDER DATE</label>
            <input type="date" value={orderData.orderDate}
              onChange={e => setOrderData({...orderData, orderDate: e.target.value})}
              required style={inputStyle} />
          </div>
          <div style={{ flex: 1 }} /> {/* spacer */}
        </div>

        {/* ── Items ── */}
        <p style={labelStyle}>SELECT ITEMS & DISCOUNTS</p>
        {selectedItems.map((item, index) => {
          const currentPerfume = perfumes.find(p => p._id === item.perfumeId);
          let linePrice = currentPerfume ? currentPerfume.price : 0;
          if (item.discountType === 'percentage') linePrice -= (linePrice * item.discountValue) / 100;
          else if (item.discountType === 'fixed')  linePrice -= item.discountValue;
          const lineTotal = linePrice * item.quantity;
          const otherIds  = selectedItems.filter((_, i) => i !== index).map(si => si.perfumeId);

          return (
            <div key={index} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '15px', marginBottom: '15px' }}>
              <div style={itemRowStyle}>
                <select value={item.perfumeId} onChange={e => updateItemRow(index, 'perfumeId', e.target.value)}
                  required style={{ ...inputStyle, flex: 3 }}>
                  <option value="" disabled hidden>-- PICK PERFUME --</option>
                  {perfumes.map(p => !otherIds.includes(p._id) && (
                    <option key={p._id} value={p._id} disabled={p.stock <= 0}>
                      {p.name} ({p.price} TK) — Stock: {p.stock}
                    </option>
                  ))}
                </select>
                <input type="number" placeholder="Qty" min="1" value={item.quantity}
                  onChange={e => updateItemRow(index, 'quantity', parseInt(e.target.value))}
                  required style={{ ...inputStyle, flex: 1 }} />
                {selectedItems.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(index)} style={removeBtn}>×</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                <select value={item.discountType} onChange={e => updateItemRow(index, 'discountType', e.target.value)}
                  style={{ ...inputStyle, flex: 1, backgroundColor: '#f9f9f9' }}>
                  <option value="none">No Discount</option>
                  <option value="fixed">Fixed (TK)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                <input type="number" placeholder="Disc. Val" disabled={item.discountType === 'none'}
                  value={item.discountValue || ''} onChange={e => updateItemRow(index, 'discountValue', parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, flex: 1 }} />
                <div style={priceTag}>{lineTotal.toLocaleString()} TK</div>
              </div>
            </div>
          );
        })}
        <button type="button" onClick={addMoreItems} style={addBtn}>+ ADD ANOTHER ITEM</button>

        {/* ── Location ── */}
        <p style={labelStyle}>SHIPPING LOCATION</p>
        <div style={row}>
          <div style={{ flex: 1 }}>
            <Select options={locationData.divisions} styles={customSelectStyles} placeholder="Select Division"
              value={division} onChange={opt => { setDivision(opt); setDistrict(null); }} />
          </div>
          <div style={{ flex: 1 }}>
            <Select options={division ? locationData.districtsByDivision[division.value] : []}
              styles={customSelectStyles} placeholder="Select District"
              isDisabled={!division} value={district} onChange={opt => setDistrict(opt)} />
          </div>
        </div>
        <input type="text" placeholder="House Number, Road, Area Details"
          value={orderData.address} onChange={e => setOrderData({...orderData, address: e.target.value})}
          required style={{ ...inputStyle, marginTop: '10px' }} />

        {/* ── Free Delivery Toggle ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: freeDelivery ? '#f0fdf4' : '#f9f9f9', border: `1px solid ${freeDelivery ? '#86efac' : '#eee'}`, borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => setFreeDelivery(f => !f)}>
          <div style={{
            width: 42, height: 24, borderRadius: 12, background: freeDelivery ? '#22c55e' : '#ddd',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0
          }}>
            <div style={{
              position: 'absolute', top: 3, left: freeDelivery ? 21 : 3, width: 18, height: 18,
              borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', margin: 0 }}>
              FREE DELIVERY
            </p>
            <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>
              {freeDelivery ? '✓ Shipping charge waived' : `Normal charge: ${district ? (district.value === 'Dhaka' ? '80' : '120') : '80–120'} TK`}
            </p>
          </div>
        </div>

        {/* ── Payment ── */}
        <p style={labelStyle}>PAYMENT DETAILS</p>
        <div style={row}>
          <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setOnlinePayment({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' }); }} style={inputStyle}>
            <option value="Cash on Delivery">Cash on Delivery</option>
            <option value="Bkash">Bkash</option>
            <option value="Nagad">Nagad</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
          <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
            style={{ ...inputStyle, backgroundColor: paymentStatus === 'Paid' ? '#d1fae5' : '#fee2e2' }}>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        {/* ── Online Payment Fields ── */}
        {isOnlinePayment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '4px' }}>
            <p style={{ ...labelStyle, marginTop: 0, color: '#555' }}>
              {paymentMethod.toUpperCase()} PAYMENT DETAILS
            </p>

            <input type="tel" placeholder={`Sender ${paymentMethod === 'Bank Transfer' ? 'Account Number' : 'Phone Number'}`}
              value={onlinePayment.senderNumber} inputMode="numeric" maxLength={paymentMethod === 'Bank Transfer' ? 20 : 11}
              onChange={e => setOnlinePayment({ ...onlinePayment, senderNumber: e.target.value.replace(/\D/g, '') })}
              style={inputStyle} />

            <input type="text" placeholder="Transaction ID (TrxID / Ref No.)"
              value={onlinePayment.transactionId}
              onChange={e => setOnlinePayment({ ...onlinePayment, transactionId: e.target.value })}
              style={inputStyle} />

            {/* Screenshot Upload */}
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '20px', border: `2px dashed ${onlinePayment.screenshot || onlinePayment.screenshotUrl ? '#000' : '#ddd'}`,
              cursor: 'pointer', background: onlinePayment.screenshot ? '#f0fdf4' : '#fff',
              borderRadius: '4px', transition: 'all 0.2s'
            }}>
              <ImagePlus size={22} color="#888" />
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
                {onlinePayment.screenshot ? '✓ SCREENSHOT SELECTED' : 'CLICK TO UPLOAD PAYMENT SCREENSHOT'}
              </span>
              <span style={{ fontSize: '10px', color: '#aaa' }}>
                {onlinePayment.screenshot ? onlinePayment.screenshot.name : 'JPG or PNG — proof of payment'}
              </span>
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => setOnlinePayment({ ...onlinePayment, screenshot: e.target.files[0], screenshotUrl: '' })} />
            </label>

            {/* Show existing screenshot if editing */}
            {onlinePayment.screenshotUrl && !onlinePayment.screenshot && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#555' }}>
                <img src={onlinePayment.screenshotUrl} alt="Payment proof" style={{ width: 60, height: 60, objectFit: 'cover', border: '1px solid #eee' }} />
                <span>Payment screenshot uploaded</span>
              </div>
            )}
          </div>
        )}

        {/* ── Coupon ── */}
        <p style={labelStyle}>APPLY COUPON (OPTIONAL)</p>
        <div style={row}>
          <input type="text" placeholder="COUPON CODE" value={couponCode}
            onChange={e => setCouponCode(e.target.value.toUpperCase())} style={inputStyle} />
          <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={couponApplyBtn}>
            {couponLoading ? '...' : 'APPLY'}
          </button>
        </div>

        {/* ── Summary ── */}
        <div style={totalBar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>SUBTOTAL: {subtotal.toLocaleString()} TK</span>
            {couponDiscount > 0 && <span style={{ fontSize: '11px', color: '#ff7675' }}>COUPON DISCOUNT: -{couponDiscount.toLocaleString()} TK</span>}
            <span style={{ fontSize: '11px', opacity: 0.7 }}>
              SHIPPING: {freeDelivery ? '🎁 FREE' : `+${shippingCost} TK`}
            </span>
            <span style={{ fontSize: '12px', letterSpacing: '2px', marginTop: '4px' }}>GRAND TOTAL</span>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 'bold' }}>{grandTotal.toLocaleString()} TK</span>
        </div>

        <button type="submit" disabled={uploading} style={{ ...submitBtn, opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'UPLOADING...' : 'CONFIRM ORDER'}
        </button>
      </form>
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────
const containerStyle  = { maxWidth: '800px' };
const formStyle       = { display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#fcfcfc', padding: '30px', border: '1px solid #eee' };
const row             = { display: 'flex', gap: '10px' };
const inputStyle      = { padding: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '13px', flex: 1 };
const labelStyle      = { fontSize: '10px', fontWeight: 'bold', color: '#888', letterSpacing: '1px', marginTop: '10px' };
const itemRowStyle    = { display: 'flex', gap: '10px', alignItems: 'center' };
const priceTag        = { minWidth: '100px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' };
const removeBtn       = { color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' };
const addBtn          = { background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textDecoration: 'underline', alignSelf: 'flex-start' };
const totalBar        = { marginTop: '20px', padding: '20px', backgroundColor: '#000', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const submitBtn       = { padding: '15px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', marginTop: '10px' };
const couponApplyBtn  = { padding: '0 20px', backgroundColor: '#444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };

export default ManualOrder;