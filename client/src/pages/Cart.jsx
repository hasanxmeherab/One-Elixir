import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false); // Loading state

  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    setLoading(true);
    // Mimic a small delay for premium feel or use real logic if needed
    if (!user) {
      alert("Please Sign In to complete your OneElixir order.");
      setLoading(false);
      navigate('/signin');
    } else {
      // If you had a direct "confirm order" API call here, you'd await it
      setTimeout(() => {
        setLoading(false);
        navigate('/thank-you');
      }, 800); 
    }
  };

  return (
    <div style={cartContainerStyle}>
      <h2 style={cartHeaderStyle}>YOUR COLLECTION ({cart.reduce((a, b) => a + b.quantity, 0)})</h2>
      
      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <p>Your OneElixir collection is currently empty.</p>
          <Link to="/" style={shopLinkStyle}>BROWSE FRAGRANCES</Link>
        </div>
      ) : (
        <>
          <div style={cartListStyle}>
            {cart.map((item) => (
              <div key={item._id} style={cartItemStyle}>
                <div style={itemInfoStyle}>
                  <img src={item.image} alt={item.name} style={cartThumbStyle} />
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', letterSpacing: '1px' }}>{item.name}</h4>
                    <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>{item.price} Tk</p>
                  </div>
                </div>
                
                <div style={itemActionStyle}>
                  <div style={quantityControlsStyle}>
                    <button onClick={() => updateQuantity(item._id, item.quantity - 1)} disabled={loading} style={qtyBtnStyle}>−</button>
                    <span style={{ padding: '0 15px', fontSize: '14px' }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, item.quantity + 1)} disabled={loading} style={qtyBtnStyle}>+</button>
                  </div>

                  <span style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {(item.price * item.quantity).toFixed(2)} Tk
                  </span>
                  <button onClick={() => removeFromCart(item._id)} disabled={loading} style={removeBtnStyle}>REMOVE</button>
                </div>
              </div>
            ))}
          </div>

          <div style={summaryStyle}>
            <div style={totalRowStyle}>
              <span>SUBTOTAL</span>
              <span>{totalAmount.toFixed(2)} Tk</span>
            </div>
            <button 
              onClick={handleCheckout} 
              disabled={loading}
              style={{...checkoutBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer'}}
            >
              {loading ? "PROCESSING..." : "PROCEED TO CHECKOUT"}
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link to="/" style={continueShoppingStyle}>← CONTINUE SHOPPING</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- Styles (Your original styles) ---
const cartContainerStyle = { padding: '80px 15%', minHeight: '70vh' };
const cartHeaderStyle = { letterSpacing: '4px', textAlign: 'center', marginBottom: '60px', borderBottom: '1px solid #eee', paddingBottom: '20px' };
const cartListStyle = { marginBottom: '40px' };
const cartItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid #f9f9f9' };
const itemInfoStyle = { display: 'flex', alignItems: 'center', gap: '20px' };
const cartThumbStyle = { width: '80px', height: '100px', objectFit: 'cover' };
const itemActionStyle = { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' };
const quantityControlsStyle = { display: 'flex', alignItems: 'center', border: '1px solid #eee', marginBottom: '10px', width: 'fit-content' };
const qtyBtnStyle = { border: 'none', background: 'none', padding: '5px 12px', cursor: 'pointer', fontSize: '16px' };
const removeBtnStyle = { background: 'none', border: 'none', color: '#999', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' };
const summaryStyle = { marginTop: '50px', borderTop: '2px solid #000', paddingTop: '30px', maxWidth: '400px', marginLeft: 'auto' };
const totalRowStyle = { display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' };
const checkoutBtnStyle = { width: '100%', backgroundColor: '#000', color: '#fff', padding: '18px', border: 'none', fontWeight: 'bold', letterSpacing: '1px' };
const continueShoppingStyle = { fontSize: '12px', color: '#000', textDecoration: 'none', fontWeight: 'bold', opacity: 0.7 };
const shopLinkStyle = { display: 'inline-block', marginTop: '20px', color: '#000', fontWeight: 'bold', textDecoration: 'none', borderBottom: '1px solid #000' };

export default Cart;