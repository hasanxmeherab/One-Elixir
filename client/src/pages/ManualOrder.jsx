import React, { useState } from 'react';
import axios from 'axios';

const ManualOrder = ({ perfumes, fetchData }) => {
  const [orderData, setOrderData] = useState({ customerName: '', phone: '', address: '' });
  const [selectedItems, setSelectedItems] = useState([{ perfumeId: '', quantity: 1 }]);
  
  // --- FEATURE #54: MANUAL ORDER COUPON STATES ---
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      return sum + (perfume ? perfume.price * item.quantity : 0);
    }, 0);
  };

  // Final Total after applying discount
  const subtotal = calculateSubtotal();
  const grandTotal = subtotal - discount;

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

      setDiscount(discountAmount);
      alert(`Discount of ${discountAmount.toLocaleString()} TK applied!`);
    } catch (err) {
      alert("Invalid or expired coupon.");
      setDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const addMoreItems = () => setSelectedItems([...selectedItems, { perfumeId: '', quantity: 1 }]);

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

    for (const item of selectedItems) {
      if (!item.perfumeId) continue; 
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      if (!perfume || perfume.stock < item.quantity) {
        alert(`Insufficient stock for ${perfume?.name || 'selected item'}`);
        return;
      }
      itemsToOrder.push({ perfumeId: perfume._id, name: perfume.name, price: perfume.price, quantity: item.quantity });
    }

    try {
      // UPDATED: Now sends the grandTotal (discounted) to the backend
      await axios.post(`${API_URL}/api/orders/manual`, { 
        ...orderData, 
        items: itemsToOrder, 
        totalAmount: grandTotal,
        discountApplied: discount 
      });
      
      for (const item of itemsToOrder) {
        const perfume = perfumes.find(p => p._id === item.perfumeId);
        await axios.put(`${API_URL}/api/perfumes/${item.perfumeId}`, { stock: perfume.stock - item.quantity });
      }
      
      setOrderData({ customerName: '', phone: '', address: '' });
      setSelectedItems([{ perfumeId: '', quantity: 1 }]);
      setDiscount(0);
      setCouponCode('');
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

        <p style={labelStyle}>SELECT ITEMS</p>
        {selectedItems.map((item, index) => {
          const currentPerfume = perfumes.find(p => p._id === item.perfumeId);
          const lineTotal = currentPerfume ? currentPerfume.price * item.quantity : 0;
          
          const otherSelectedIds = selectedItems
            .filter((_, i) => i !== index)
            .map(si => si.perfumeId);

          return (
            <div key={index} style={itemRowStyle}>
              <select 
                value={item.perfumeId} 
                onChange={e => updateItemRow(index, 'perfumeId', e.target.value)} 
                required 
                style={{ ...inputStyle, flex: 3 }}
              >
                <option value="" selected disabled hidden>-- PICK PERFUME --</option>
                {perfumes.map(p => {
                  if (otherSelectedIds.includes(p._id)) return null; 
                  return (
                    <option key={p._id} value={p._id} disabled={p.stock <= 0}>
                      {p.name} ({p.price} TK) - Stock: {p.stock}
                    </option>
                  );
                })}
              </select>
              
              <input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => updateItemRow(index, 'quantity', parseInt(e.target.value))} required style={{ ...inputStyle, flex: 1 }}/>
              <div style={priceTag}>{lineTotal.toLocaleString()} TK</div>
              {selectedItems.length > 1 && (<button type="button" onClick={() => removeItemRow(index)} style={removeBtn}>×</button>)}
            </div>
          );
        })}

        <button type="button" onClick={addMoreItems} style={addBtn}>+ ADD ANOTHER ITEM</button>
        <input type="text" placeholder="Shipping Address" value={orderData.address} onChange={e => setOrderData({...orderData, address: e.target.value})} required style={{...inputStyle, marginTop: '10px'}}/>

        {/* FEATURE #54: MANUAL COUPON INPUT */}
        <p style={labelStyle}>APPLY COUPON</p>
        <div style={row}>
           <input 
             type="text" 
             placeholder="COUPON CODE" 
             value={couponCode} 
             onChange={e => setCouponCode(e.target.value.toUpperCase())} 
             style={inputStyle}
           />
           <button 
             type="button" 
             onClick={handleApplyCoupon} 
             disabled={couponLoading || !couponCode} 
             style={couponApplyBtn}
           >
             {couponLoading ? '...' : 'APPLY'}
           </button>
        </div>

        <div style={totalBar}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', letterSpacing: '1px', opacity: 0.7 }}>SUBTOTAL: {subtotal.toLocaleString()} TK</span>
            {discount > 0 && <span style={{ fontSize: '10px', color: '#ff4d4d' }}>DISCOUNT: -{discount.toLocaleString()} TK</span>}
            <span style={{ fontSize: '12px', letterSpacing: '2px', marginTop: '5px' }}>GRAND TOTAL</span>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{grandTotal.toLocaleString()} TK</span>
        </div>
        <button type="submit" style={submitBtn}>CONFIRM ORDER</button>
      </form>
    </div>
  );
};

// --- Styles (Maintained & Updated) ---
const containerStyle = { maxWidth: '800px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#fcfcfc', padding: '30px', border: '1px solid #eee' };
const row = { display: 'flex', gap: '10px' };
const inputStyle = { padding: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '13px', flex: 1 };
const labelStyle = { fontSize: '10px', fontWeight: 'bold', color: '#888', letterSpacing: '1px', marginTop: '10px' };
const itemRowStyle = { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' };
const priceTag = { minWidth: '100px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' };
const removeBtn = { color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' };
const addBtn = { background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textDecoration: 'underline', alignSelf: 'flex-start' };
const totalBar = { marginTop: '20px', padding: '20px', backgroundColor: '#000', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const submitBtn = { padding: '15px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', marginTop: '10px' };

// Added for Coupon System
const couponApplyBtn = { padding: '0 20px', backgroundColor: '#444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };

export default ManualOrder;