import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: 'Dhaka',
  });

  const [loading, setLoading] = useState(false);

  // --- FEATURE #54: COUPON STATES ---
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0); // Stores the discount amount
  const [couponLoading, setCouponLoading] = useState(false);

  // Calculate Final Amount
  const finalAmount = cartTotal - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    try {
      // Sending request to your new backend route
      const res = await axios.post(`${API_URL}/api/coupons/validate`, { code: couponCode });
      
      let discountAmount = 0;
      if (res.data.discountType === 'percentage') {
        discountAmount = (cartTotal * res.data.discountValue) / 100;
      } else {
        discountAmount = res.data.discountValue;
      }

      setDiscount(discountAmount);
      alert(`Coupon Applied! You saved ${discountAmount.toLocaleString()} TK`);
    } catch (err) {
      alert(err.response?.data?.message || "Invalid or expired coupon code.");
      setDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      navigate('/signin', { state: { from: '/checkout' } });
      return;
    }

    if (cart.length === 0) return alert("Your cart is empty");

    setLoading(true);
    const orderData = {
      customerName: user.name,
      customerEmail: user.email.toLowerCase(),
      phone: formData.phone,
      address: `${formData.address}, ${formData.city}`,
      items: cart.map(item => ({
        perfumeId: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: finalAmount, // Updated to use discounted amount
      discountApplied: discount,
      status: 'Pending'
    };

    try {
      await axios.post(`${API_URL}/api/orders`, orderData);
      clearCart();
      navigate('/thank-you');
    } catch (err) {
      alert("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <form onSubmit={handleSubmit} style={checkoutGrid}>
        <div style={formSection}>
          <h2 style={sectionTitle}>SHIPPING DETAILS</h2>
          <input type="text" value={user ? user.email : "Sign in to continue"} readOnly style={inputDisabled} />
          
          <input type="tel" placeholder="Phone Number" required value={formData.phone} 
            onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
          
          <textarea placeholder="Address" required value={formData.address} 
            onChange={e => setFormData({...formData, address: e.target.value})} style={{...inputStyle, minHeight: '100px'}} />
          
          <select style={inputStyle} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}>
            <option value="Dhaka">Dhaka</option>
            <option value="Chittagong">Chittagong</option>
            <option value="Sylhet">Sylhet</option>
          </select>

          {/* FEATURE #54: COUPON INPUT SECTION */}
          <h2 style={{...sectionTitle, marginTop: '40px'}}>HAVE A COUPON?</h2>
          <div style={couponContainer}>
            <input 
              type="text" 
              placeholder="Enter Code" 
              value={couponCode} 
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              style={{...inputStyle, flex: 1}} 
            />
            <button 
              type="button" 
              onClick={handleApplyCoupon} 
              disabled={couponLoading || !couponCode}
              style={couponBtn}
            >
              {couponLoading ? '...' : 'APPLY'}
            </button>
          </div>

          <h2 style={{...sectionTitle, marginTop: '40px'}}>PAYMENT</h2>
          <div style={paymentBox}>
            <input type="radio" checked readOnly /> <span style={{marginLeft: '10px'}}>Cash on Delivery</span>
          </div>
        </div>

        <div style={summarySection}>
          <h2 style={sectionTitle}>ORDER SUMMARY</h2>
          {cart.map(item => (
            <div key={item._id} style={itemRow}>
              <span>{item.name} (x{item.quantity})</span>
              <span>{(item.price * item.quantity).toLocaleString()} TK</span>
            </div>
          ))}
          
          <div style={totalDivider}></div>
          
          <div style={itemRow}>
            <span>SUBTOTAL</span>
            <span>{cartTotal.toLocaleString()} TK</span>
          </div>

          {discount > 0 && (
            <div style={{...itemRow, color: '#e63946'}}>
              <span>DISCOUNT</span>
              <span>-{discount.toLocaleString()} TK</span>
            </div>
          )}

          <div style={totalDivider}></div>
          <div style={totalRow}>
            <span>TOTAL</span>
            <span>{finalAmount.toLocaleString()} TK</span>
          </div>
          
          <button 
            type={user ? "submit" : "button"} 
            onClick={() => {
              if (!user) navigate('/signin', { state: { from: '/checkout' } });
            }}
            disabled={loading} 
            style={user ? confirmBtn : signInBtn}
          >
            {loading ? 'PROCESSING...' : user ? 'CONFIRM ORDER' : 'SIGN IN TO ORDER'}
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Styles (Maintained & Added) ---
const container = { padding: '120px 8%', maxWidth: '1200px', margin: '0 auto' };
const checkoutGrid = { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '60px' };
const formSection = { display: 'flex', flexDirection: 'column', gap: '15px' };
const sectionTitle = { fontSize: '12px', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '20px' };
const inputStyle = { padding: '15px', border: '1px solid #ddd', outline: 'none' };
const inputDisabled = { ...inputStyle, backgroundColor: '#f9f9f9', color: '#888' };
const paymentBox = { padding: '20px', border: '1px solid #000', display: 'flex', alignItems: 'center' };
const summarySection = { backgroundColor: '#fcfcfc', padding: '40px', border: '1px solid #eee' };
const itemRow = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '15px' };
const totalDivider = { height: '1px', backgroundColor: '#ddd', margin: '20px 0' };
const totalRow = { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' };
const confirmBtn = { width: '100%', padding: '20px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', marginTop: '30px' };
const signInBtn = { ...confirmBtn, backgroundColor: '#444' };
const couponContainer = { display: 'flex', gap: '10px' };
const couponBtn = { padding: '0 25px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };

export default Checkout;