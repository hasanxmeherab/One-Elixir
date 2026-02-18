import React, { useState } from 'react';
import axios from 'axios';
import { useOutletContext } from 'react-router-dom'; // Added for nested routing

const ManualOrder = () => {
  // --- REPLACED PROPS WITH OUTLET CONTEXT ---
  const { perfumes = [], fetchData } = useOutletContext();

  const [orderData, setOrderData] = useState({ customerName: '', phone: '', address: '' });
  
  // --- NEW: PAYMENT STATES ---
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');

  const [selectedItems, setSelectedItems] = useState([{ 
    perfumeId: '', 
    quantity: 1, 
    discountType: 'none', 
    discountValue: 0 
  }]);
  
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0); 
  const [couponLoading, setCouponLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // --- SAFETY CHECK ---
  if (!perfumes || perfumes.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Perfume Data...</div>;
  }

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      if (!perfume) return sum;

      let itemPrice = perfume.price;
      if (item.discountType === 'percentage') {
        itemPrice -= (itemPrice * item.discountValue) / 100;
      } else if (item.discountType === 'fixed') {
        itemPrice -= item.discountValue;
      }
      
      return sum + (itemPrice * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const grandTotal = subtotal - couponDiscount;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/coupons/validate`, { code: couponCode });
      let discountAmount = 0;
      if (res.data.discountType === 'percentage') {
        discountAmount = (subtotal * res.data.discountValue) / 100;
      } else {
        discountAmount = res.data.discountValue;
      }
      setCouponDiscount(discountAmount);
      alert(`Coupon applied! Extra ${discountAmount.toLocaleString()} TK off.`);
    } catch (err) {
      alert("Invalid or expired coupon.");
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
    const itemsToOrder = [];

    // --- NEW: GET ADMIN NAME FROM LOCALSTORAGE ---
    const adminDataString = localStorage.getItem('adminData');
    const adminData = adminDataString ? JSON.parse(adminDataString) : null;
    const adminName = adminData ? adminData.name : "System Admin";

    for (const item of selectedItems) {
      if (!item.perfumeId) continue; 
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      if (!perfume || perfume.stock < item.quantity) {
        alert(`Insufficient stock for ${perfume?.name || 'selected item'}`);
        return;
      }

      let finalItemPrice = perfume.price;
      if (item.discountType === 'percentage') finalItemPrice -= (perfume.price * item.discountValue) / 100;
      else if (item.discountType === 'fixed') finalItemPrice -= item.discountValue;

      itemsToOrder.push({ 
        perfumeId: perfume._id, 
        name: perfume.name, 
        price: perfume.price, 
        quantity: item.quantity,
        discountType: item.discountType,
        discountValue: item.discountValue,
        finalItemPrice: finalItemPrice 
      });
    }

    try {
      // --- UPDATED: Payload now includes payment details AND createdBy ---
      await axios.post(`${API_URL}/api/orders/manual`, { 
        ...orderData, 
        items: itemsToOrder, 
        totalAmount: grandTotal,
        discountApplied: couponDiscount,
        paymentMethod,
        paymentStatus,
        isManual: true,
        createdBy: adminName // NEW TRACKING FIELD
      });
      
      for (const item of itemsToOrder) {
        const perfume = perfumes.find(p => p._id === item.perfumeId);
        await axios.put(`${API_URL}/api/perfumes/${item.perfumeId}`, { stock: perfume.stock - item.quantity });
      }
      
      setOrderData({ customerName: '', phone: '', address: '' });
      setSelectedItems([{ perfumeId: '', quantity: 1, discountType: 'none', discountValue: 0 }]);
      setCouponDiscount(0);
      setCouponCode('');
      setPaymentMethod('Cash on Delivery');
      setPaymentStatus('Unpaid');
      fetchData();
      alert("Manual Order Recorded Successfully!");
    } catch (err) {
      alert("Failed to record order.");
    }
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ letterSpacing: '2px', marginBottom: '30px' }}>CREATE MANUAL ORDER</h3>
      
      <form onSubmit={handleOrderSubmit} style={formStyle}>
        <div style={row}>
          <input type="text" placeholder="Customer Name" value={orderData.customerName} onChange={e => setOrderData({...orderData, customerName: e.target.value})} required style={inputStyle}/>
          <input type="text" placeholder="Phone Number" value={orderData.phone} onChange={e => setOrderData({...orderData, phone: e.target.value})} required style={inputStyle}/>
        </div>

        <p style={labelStyle}>SELECT ITEMS & DISCOUNTS</p>
        {selectedItems.map((item, index) => {
          const currentPerfume = perfumes.find(p => p._id === item.perfumeId);
          
          let linePrice = currentPerfume ? currentPerfume.price : 0;
          if (item.discountType === 'percentage') linePrice -= (linePrice * item.discountValue) / 100;
          else if (item.discountType === 'fixed') linePrice -= item.discountValue;
          
          const lineTotal = linePrice * item.quantity;
          
          const otherSelectedIds = selectedItems.filter((_, i) => i !== index).map(si => si.perfumeId);

          return (
            <div key={index} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '15px', marginBottom: '15px' }}>
              <div style={itemRowStyle}>
                <select 
                  value={item.perfumeId} 
                  onChange={e => updateItemRow(index, 'perfumeId', e.target.value)} 
                  required 
                  style={{ ...inputStyle, flex: 3 }}
                >
                  <option value="" disabled hidden>-- PICK PERFUME --</option>
                  {perfumes.map(p => !otherSelectedIds.includes(p._id) && (
                    <option key={p._id} value={p._id} disabled={p.stock <= 0}>
                      {p.name} ({p.price} TK)
                    </option>
                  ))}
                </select>
                <input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => updateItemRow(index, 'quantity', parseInt(e.target.value))} required style={{ ...inputStyle, flex: 1 }}/>
                {selectedItems.length > 1 && (<button type="button" onClick={() => removeItemRow(index)} style={removeBtn}>×</button>)}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                <select 
                  value={item.discountType} 
                  onChange={e => updateItemRow(index, 'discountType', e.target.value)}
                  style={{ ...inputStyle, flex: 1, backgroundColor: '#f9f9f9' }}
                >
                  <option value="none">No Discount</option>
                  <option value="fixed">Fixed (TK)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                <input 
                  type="number" 
                  placeholder="Disc. Val" 
                  disabled={item.discountType === 'none'}
                  value={item.discountValue || ''} 
                  onChange={e => updateItemRow(index, 'discountValue', parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <div style={priceTag}>{lineTotal.toLocaleString()} TK</div>
              </div>
            </div>
          );
        })}

        <button type="button" onClick={addMoreItems} style={addBtn}>+ ADD ANOTHER ITEM</button>
        <input type="text" placeholder="Shipping Address" value={orderData.address} onChange={e => setOrderData({...orderData, address: e.target.value})} required style={{...inputStyle, marginTop: '10px'}}/>

        {/* --- NEW: PAYMENT SECTION --- */}
        <p style={labelStyle}>PAYMENT DETAILS</p>
        <div style={row}>
           <select 
            value={paymentMethod} 
            onChange={e => setPaymentMethod(e.target.value)} 
            style={inputStyle}
           >
             <option value="Cash on Delivery">Cash on Delivery</option>
             <option value="Bkash">Bkash</option>
             <option value="Nagad">Nagad</option>
             <option value="Bank Transfer">Bank Transfer</option>
           </select>
           <select 
            value={paymentStatus} 
            onChange={e => setPaymentStatus(e.target.value)} 
            style={{...inputStyle, backgroundColor: paymentStatus === 'Paid' ? '#d1fae5' : '#fee2e2'}}
           >
             <option value="Unpaid">Unpaid</option>
             <option value="Paid">Paid</option>
           </select>
        </div>

        <p style={labelStyle}>APPLY COUPON (OPTIONAL)</p>
        <div style={row}>
           <input type="text" placeholder="COUPON CODE" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} style={inputStyle}/>
           <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={couponApplyBtn}>
             {couponLoading ? '...' : 'APPLY'}
           </button>
        </div>

        <div style={totalBar}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>AFTER ITEM DISCOUNTS: {subtotal.toLocaleString()} TK</span>
            {couponDiscount > 0 && <span style={{ fontSize: '10px', color: '#ff4d4d' }}>COUPON: -{couponDiscount.toLocaleString()} TK</span>}
            <span style={{ fontSize: '12px', letterSpacing: '2px', marginTop: '5px' }}>GRAND TOTAL</span>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{grandTotal.toLocaleString()} TK</span>
        </div>
        <button type="submit" style={submitBtn}>CONFIRM ORDER</button>
      </form>
    </div>
  );
};

// Styles maintained from existing
const containerStyle = { maxWidth: '800px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#fcfcfc', padding: '30px', border: '1px solid #eee' };
const row = { display: 'flex', gap: '10px' };
const inputStyle = { padding: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '13px', flex: 1 };
const labelStyle = { fontSize: '10px', fontWeight: 'bold', color: '#888', letterSpacing: '1px', marginTop: '10px' };
const itemRowStyle = { display: 'flex', gap: '10px', alignItems: 'center' };
const priceTag = { minWidth: '100px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' };
const removeBtn = { color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' };
const addBtn = { background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textDecoration: 'underline', alignSelf: 'flex-start' };
const totalBar = { marginTop: '20px', padding: '20px', backgroundColor: '#000', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const submitBtn = { padding: '15px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', marginTop: '10px' };
const couponApplyBtn = { padding: '0 20px', backgroundColor: '#444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };

export default ManualOrder;