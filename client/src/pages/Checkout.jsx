import React, { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select'; 
// Import the JSON data
import locationData from '../data/locationData.json'; 

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    address: '',
    division: null, 
    district: null, 
  });

  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // --- SHIPPING CALCULATION ---
  const shippingCost = useMemo(() => {
    if (!formData.district) return 0;
    // Specific logic: Dhaka District = 80, Others = 120
    return formData.district.value === 'Dhaka' ? 80 : 120;
  }, [formData.district]);

  const finalAmount = cartTotal - discount + shippingCost;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/coupons/validate`, { code: couponCode });
      let discountAmount = res.data.discountType === 'percentage' 
        ? (cartTotal * res.data.discountValue) / 100 
        : res.data.discountValue;
      setDiscount(discountAmount);
      alert(`Coupon Applied!`);
    } catch (err) {
      alert("Invalid coupon.");
      setDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/signin', { state: { from: '/checkout' } });
    
    // VALIDATION: Must select district
    if (!formData.division || !formData.district) {
        return alert("Please select both Division and District to proceed.");
    }

    setLoading(true);
    const orderData = {
      customerName: formData.name,
      customerEmail: user.email.toLowerCase(),
      phone: formData.phone,
      address: `${formData.address}, ${formData.district.label}, ${formData.division.label}`,
      items: cart.map(item => ({
        perfumeId: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: finalAmount,
      shippingCost: shippingCost, 
      discountApplied: discount,
      status: 'Pending',
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Unpaid',
      isManual: false 
    };

    try {
      await axios.post(`${API_URL}/api/orders`, orderData);
      clearCart();
      navigate('/thank-you');
    } catch (err) {
      alert("Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '0',
      fontSize: '13px',
      boxShadow: 'none',
      '&:hover': { border: '1px solid #000' }
    })
  };

  return (
    <div style={container}>
      <form onSubmit={handleSubmit} style={checkoutGrid}>
        <div style={formSection}>
          <h2 style={sectionTitle}>SHIPPING DETAILS</h2>
          
          <input type="text" placeholder="Recipient Name" required value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
          
          <input type="tel" placeholder="Phone Number" required value={formData.phone} 
            onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
          
          <div style={row}>
            <div style={{flex: 1}}>
              <label style={miniLabel}>DIVISION</label>
              <Select 
                options={locationData.divisions}
                styles={customSelectStyles}
                placeholder="Select..."
                value={formData.division}
                onChange={(option) => setFormData({...formData, division: option, district: null})}
              />
            </div>
            <div style={{flex: 1}}>
              <label style={miniLabel}>DISTRICT</label>
              <Select 
                options={formData.division ? locationData.districtsByDivision[formData.division.value] : []}
                styles={customSelectStyles}
                placeholder="Search..."
                isDisabled={!formData.division}
                value={formData.district}
                onChange={(option) => setFormData({...formData, district: option})}
              />
            </div>
          </div>

          <textarea placeholder="House Number, Road, Area Details" required value={formData.address} 
            onChange={e => setFormData({...formData, address: e.target.value})} style={{...inputStyle, minHeight: '80px', marginTop: '10px'}} />

          <h2 style={{...sectionTitle, marginTop: '40px'}}>COUPON</h2>
          <div style={couponContainer}>
            <input type="text" placeholder="Enter Code" value={couponCode} 
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())} style={{...inputStyle, flex: 1}} />
            <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={couponBtn}>
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
          <div style={itemRow}><span>SUBTOTAL</span><span>{cartTotal.toLocaleString()} TK</span></div>
          
          {shippingCost > 0 && (
            <div style={itemRow}>
              <span>SHIPPING ({formData.district?.label})</span>
              <span>{shippingCost.toLocaleString()} TK</span>
            </div>
          )}

          {discount > 0 && (
            <div style={{...itemRow, color: '#e63946'}}><span>DISCOUNT</span><span>-{discount.toLocaleString()} TK</span></div>
          )}
          
          <div style={totalDivider}></div>
          <div style={totalRow}><span>TOTAL</span><span>{finalAmount.toLocaleString()} TK</span></div>
          
          <button type={user ? "submit" : "button"} style={user ? confirmBtn : signInBtn} disabled={loading}>
            {loading ? 'PROCESSING...' : user ? 'CONFIRM ORDER' : 'SIGN IN TO ORDER'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Styles maintained
const container = { padding: '120px 8%', maxWidth: '1200px', margin: '0 auto' };
const checkoutGrid = { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '60px' };
const formSection = { display: 'flex', flexDirection: 'column', gap: '15px' };
const sectionTitle = { fontSize: '12px', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '20px' };
const inputStyle = { padding: '15px', border: '1px solid #ddd', outline: 'none', fontSize: '13px' };
const row = { display: 'flex', gap: '15px' };
const miniLabel = { fontSize: '9px', fontWeight: 'bold', marginBottom: '5px', display: 'block', letterSpacing: '1px' };
const paymentBox = { padding: '20px', border: '1px solid #000', display: 'flex', alignItems: 'center', fontSize: '13px' };
const summarySection = { backgroundColor: '#fcfcfc', padding: '40px', border: '1px solid #eee' };
const itemRow = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '15px' };
const totalDivider = { height: '1px', backgroundColor: '#ddd', margin: '20px 0' };
const totalRow = { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' };
const confirmBtn = { width: '100%', padding: '20px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', marginTop: '30px' };
const signInBtn = { ...confirmBtn, backgroundColor: '#444' };
const couponContainer = { display: 'flex', gap: '10px' };
const couponBtn = { padding: '0 25px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };

export default Checkout;