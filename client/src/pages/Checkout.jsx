import React, { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select'; 
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

  // --- PAYMENT STATES ---
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [showModal, setShowModal] = useState(false);
  const [mobilePayment, setMobilePayment] = useState({
    senderNumber: '',
    transactionId: '',
    platform: 'Bkash',
    screenshot: null
  });

  const shippingCost = useMemo(() => {
    if (!formData.district) return 0;
    return formData.district.value === 'Dhaka' ? 80 : 120;
  }, [formData.district]);

  const finalAmount = cartTotal - discount + shippingCost;
  
  // Logic: amount to pay now based on method
  const amountToVerify = paymentMethod === 'Cash on Delivery' ? shippingCost : finalAmount;

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

  // UPDATED: This button now triggers the form check and opens the modal
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!user) return navigate('/signin', { state: { from: '/checkout' } });
    
    // Validation
    if (!formData.division || !formData.district || !formData.phone || !formData.address) {
        return alert("Please complete the shipping details form first.");
    }

    // Always show modal now because even COD requires delivery charge payment
    setShowModal(true);
  };

  // NEW: Final placement function triggered inside the modal
  const handleFinalOrderSubmit = async () => {
    if (!mobilePayment.senderNumber || !mobilePayment.transactionId || !mobilePayment.screenshot) {
        return alert("Please fill all payment verification fields and upload the screenshot.");
    }

    setLoading(true);

    let screenshotUrl = "";
    if (mobilePayment.screenshot) {
      try {
        const data = new FormData();
        data.append("file", mobilePayment.screenshot);
        data.append("upload_preset", "one_elixir_uploads");
        const res = await axios.post(`https://api.cloudinary.com/v1_1/dluvmed0b/image/upload`, data);
        screenshotUrl = res.data.secure_url;
      } catch (err) {
        setLoading(false);
        return alert("Screenshot upload failed. Please try again.");
      }
    }

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
      paymentMethod: paymentMethod,
      paymentStatus: 'Pending Verification',
      paymentDetails: {
        ...mobilePayment,
        screenshot: screenshotUrl,
        amountPaid: amountToVerify
      },
      isManual: false 
    };

    try {
      await axios.post(`${API_URL}/api/orders`, orderData);
      clearCart();
      navigate('/thank-you');
    } catch (err) {
      alert("Order placement failed.");
    } finally {
      setLoading(false);
    }
  };

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      padding: '8px', border: '1px solid #ddd', borderRadius: '0', fontSize: '13px', boxShadow: 'none', '&:hover': { border: '1px solid #000' }
    })
  };

  return (
    <div style={container}>
      <form onSubmit={handleSubmit} style={checkoutGrid}>
        <div style={formSection}>
          <h2 style={sectionTitle}>SHIPPING DETAILS</h2>
          <input type="text" placeholder="Recipient Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
          <input type="tel" placeholder="Phone Number" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
          <div style={row}>
            <div style={{flex: 1}}>
              <label style={miniLabel}>DIVISION</label>
              <Select options={locationData.divisions} styles={customSelectStyles} placeholder="Select..." value={formData.division} onChange={(option) => setFormData({...formData, division: option, district: null})} />
            </div>
            <div style={{flex: 1}}>
              <label style={miniLabel}>DISTRICT</label>
              <Select options={formData.division ? locationData.districtsByDivision[formData.division.value] : []} styles={customSelectStyles} placeholder="Search..." isDisabled={!formData.division} value={formData.district} onChange={(option) => setFormData({...formData, district: option})} />
            </div>
          </div>
          <textarea placeholder="House Number, Road, Area Details" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{...inputStyle, minHeight: '80px', marginTop: '10px'}} />

          <h2 style={{...sectionTitle, marginTop: '40px'}}>COUPON</h2>
          <div style={couponContainer}>
            <input type="text" placeholder="Enter Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} style={{...inputStyle, flex: 1}} />
            <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={couponBtn}>{couponLoading ? '...' : 'APPLY'}</button>
          </div>

          <h2 style={{...sectionTitle, marginTop: '40px'}}>PAYMENT METHOD</h2>
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
             <label style={paymentOptionStyle}>
                <input type="radio" name="pay" value="Cash on Delivery" checked={paymentMethod === 'Cash on Delivery'} onChange={e => setPaymentMethod(e.target.value)} /> 
                <div style={{marginLeft:'10px'}}>
                    <div style={{fontWeight:'bold'}}>Cash on Delivery</div>
                    <div style={{fontSize:'11px', color:'#666'}}>Pay {shippingCost} TK Delivery Charge now, rest on delivery.</div>
                </div>
             </label>
             <label style={paymentOptionStyle}>
                <input type="radio" name="pay" value="Full Payment" checked={paymentMethod === 'Full Payment'} onChange={e => setPaymentMethod('Full Payment')} /> 
                <div style={{marginLeft:'10px'}}>
                    <div style={{fontWeight:'bold'}}>Full Payment</div>
                    <div style={{fontSize:'11px', color:'#666'}}>Pay {finalAmount} TK now and get a hassle-free delivery.</div>
                </div>
             </label>
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
          {shippingCost > 0 && <div style={itemRow}><span>SHIPPING ({formData.district?.label})</span><span>{shippingCost.toLocaleString()} TK</span></div>}
          {discount > 0 && <div style={{...itemRow, color: '#e63946'}}><span>DISCOUNT</span><span>-{discount.toLocaleString()} TK</span></div>}
          <div style={totalDivider}></div>
          <div style={totalRow}><span>TOTAL</span><span>{finalAmount.toLocaleString()} TK</span></div>
          <button type="submit" style={user ? confirmBtn : signInBtn} disabled={loading}>{loading ? 'PROCESSING...' : user ? 'CONFIRM ORDER' : 'SIGN IN TO ORDER'}</button>
        </div>
      </form>

      {/* --- PAYMENT MODAL --- */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{letterSpacing:'1px', fontSize:'14px'}}>MOBILE BANKING PAYMENT</h3>
            
            <div style={{background:'#f9f9f9', padding:'15px', borderRadius:'4px', borderLeft:'5px solid #000'}}>
                <p style={{fontSize:'12px', margin:0}}>Total Amount to Pay Now:</p>
                <p style={{fontSize:'24px', fontWeight:'bold', margin:0}}>
                    {amountToVerify.toLocaleString()} TK
                </p>
                <p style={{fontSize:'11px', color:'#888', marginTop:'5px'}}>
                    {paymentMethod === 'Cash on Delivery' ? "(Delivery Charge)" : "(Full Order Amount)"}
                </p>
            </div>

            <p style={{fontSize:'12px', color:'#666'}}>Send money to: <b>01816496457 (Personal)</b></p>
            
            <select style={inputStyle} value={mobilePayment.platform} onChange={e => setMobilePayment({...mobilePayment, platform: e.target.value})}>
              <option value="Bkash">Bkash</option>
              <option value="Nagad">Nagad</option>
            </select>

            <input type="text" placeholder="Sender Phone Number" style={inputStyle} onChange={e => setMobilePayment({...mobilePayment, senderNumber: e.target.value})} required />
            <input type="text" placeholder="Transaction ID (TrxID)" style={inputStyle} onChange={e => setMobilePayment({...mobilePayment, transactionId: e.target.value})} required />
            
            <label style={{fontSize:'11px', fontWeight:'bold'}}>Upload Screenshot:</label>
            <input type="file" accept="image/*" onChange={e => setMobilePayment({...mobilePayment, screenshot: e.target.files[0]})} required />

            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
               <button onClick={handleFinalOrderSubmit} style={{...confirmBtn, marginTop:0, padding:'12px', flex: 2}} disabled={loading}>
                 {loading ? 'PROCESSING...' : 'CONFIRM PAYMENT'}
               </button>
               <button onClick={() => setShowModal(false)} style={{...confirmBtn, marginTop:0, padding:'12px', background:'#888', flex: 1}} disabled={loading}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Existing Styles
const container = { padding: '120px 8%', maxWidth: '1200px', margin: '0 auto' };
const checkoutGrid = { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '60px' };
const formSection = { display: 'flex', flexDirection: 'column', gap: '15px' };
const sectionTitle = { fontSize: '12px', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '20px' };
const inputStyle = { padding: '15px', border: '1px solid #ddd', outline: 'none', fontSize: '13px' };
const row = { display: 'flex', gap: '15px' };
const miniLabel = { fontSize: '9px', fontWeight: 'bold', marginBottom: '5px', display: 'block', letterSpacing: '1px' };
const paymentOptionStyle = { padding: '15px', border: '1px solid #ddd', display: 'flex', alignItems: 'center', fontSize: '13px', cursor:'pointer' };
const summarySection = { backgroundColor: '#fcfcfc', padding: '40px', border: '1px solid #eee' };
const itemRow = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '15px' };
const totalDivider = { height: '1px', backgroundColor: '#ddd', margin: '20px 0' };
const totalRow = { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' };
const confirmBtn = { width: '100%', padding: '20px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', marginTop: '30px' };
const signInBtn = { ...confirmBtn, backgroundColor: '#444' };
const couponContainer = { display: 'flex', gap: '10px' };
const couponBtn = { padding: '0 25px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };
const modalOverlay = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000 };
const modalContent = { background:'#fff', padding:'30px', width:'400px', display:'flex', flexDirection:'column', gap:'15px' };

export default Checkout;