import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cart, removeFromCart, addToCart, cartTotal } = useCart(); // Changed updateQuantity back to addToCart to match your Context
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckout = () => {
    setLoading(true);
    if (!user) {
      alert("Please Sign In to complete your OneElixir order.");
      setLoading(false);
      navigate('/signin');
    } else {
      setTimeout(() => {
        setLoading(false);
        navigate('/checkout');
      }, 800); 
    }
  };

  return (
    <div style={pageWrapper}>
      <div style={containerStyle}>
        <h2 style={cartHeaderStyle}>YOUR SELECTION ({cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)})</h2>
        
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <p>Your OneElixir collection is currently empty.</p>
            <Link to="/" style={shopLinkStyle}>BROWSE FRAGRANCES</Link>
          </div>
        ) : (
          <div style={contentLayout}>
            {/* LEFT SIDE: PRODUCT LIST */}
            <div style={cartListStyle}>
              {cart.map((item) => (
                <div key={item._id} style={cartItemStyle}>
                  <div style={itemInfoStyle}>
                    <img src={item.image} alt={item.name} style={cartThumbStyle} />
                    <div>
                      <h4 style={itemNameStyle}>{item.name?.toUpperCase()}</h4>
                      <p style={itemPriceStyle}>{item.price} TK</p>
                      <button onClick={() => removeFromCart(item._id)} style={removeBtnStyle}>REMOVE</button>
                    </div>
                  </div>
                  
                  <div style={quantityControlsStyle}>
                    <button onClick={() => addToCart(item, -1)} style={qtyBtnStyle}>−</button>
                    <span style={qtyValueStyle}>{item.quantity}</span>
                    <button onClick={() => addToCart(item, 1)} style={qtyBtnStyle}>+</button>
                  </div>

                  <div style={itemTotalStyle}>
                    {(Number(item.price) * (Number(item.quantity) || 0)).toFixed(2)} TK
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT SIDE: SUMMARY BOX (Now fully visible on the page) */}
            <div style={summarySidebar}>
              <h3 style={summaryTitle}>ORDER SUMMARY</h3>
              <div style={totalRowStyle}>
                <span>SUBTOTAL</span>
                <span>{cartTotal.toFixed(2)} TK</span>
              </div>
              <div style={shippingRow}>
                <span>SHIPPING</span>
                <span>CALCULATED AT CHECKOUT</span>
              </div>
              <button 
                onClick={handleCheckout} 
                disabled={loading}
                style={{...checkoutBtnStyle, opacity: loading ? 0.7 : 1}}
              >
                {loading ? "PROCESSING..." : "PROCEED TO CHECKOUT"}
              </button>
              <Link to="/" style={continueShoppingStyle}>← CONTINUE SHOPPING</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Full Page Styles ---
const pageWrapper = { minHeight: '80vh', backgroundColor: '#fff', paddingTop: '40px' };
const containerStyle = { maxWidth: '1200px', margin: '0 auto', padding: '0 20px' };
const cartHeaderStyle = { letterSpacing: '5px', textAlign: 'left', marginBottom: '40px', borderBottom: '1px solid #eee', paddingBottom: '20px' };

// Flex Layout for Page
const contentLayout = { display: 'flex', gap: '60px', alignItems: 'flex-start', flexWrap: 'wrap' };
const cartListStyle = { flex: '2', minWidth: '350px' };

// Item Styles
const cartItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px 0', borderBottom: '1px solid #f1f1f1' };
const itemInfoStyle = { display: 'flex', gap: '20px', alignItems: 'center', flex: 1 };
const cartThumbStyle = { width: '100px', height: '130px', objectFit: 'cover', backgroundColor: '#f9f9f9' };
const itemNameStyle = { margin: '0 0 5px 0', fontSize: '14px', letterSpacing: '1px', fontWeight: 'bold' };
const itemPriceStyle = { margin: '0 0 10px 0', color: '#666', fontSize: '13px' };

const quantityControlsStyle = { display: 'flex', alignItems: 'center', border: '1px solid #ddd', padding: '5px' };
const qtyBtnStyle = { border: 'none', background: 'none', padding: '0 15px', cursor: 'pointer', fontSize: '18px' };
const qtyValueStyle = { fontSize: '14px', minWidth: '20px', textAlign: 'center' };
const itemTotalStyle = { width: '120px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' };
const removeBtnStyle = { background: 'none', border: 'none', color: '#999', fontSize: '10px', textDecoration: 'underline', cursor: 'pointer', padding: 0 };

// Summary Sidebar
const summarySidebar = { flex: '1', minWidth: '300px', backgroundColor: '#fbfbfb', padding: '40px', border: '1px solid #eee' };
const summaryTitle = { fontSize: '16px', letterSpacing: '2px', marginBottom: '30px' };
const totalRowStyle = { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '15px' };
const shippingRow = { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginBottom: '30px' };
const checkoutBtnStyle = { width: '100%', backgroundColor: '#000', color: '#fff', padding: '20px', border: 'none', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', marginBottom: '20px' };
const continueShoppingStyle = { display: 'block', textAlign: 'center', fontSize: '11px', color: '#000', textDecoration: 'none', fontWeight: 'bold', opacity: 0.6 };
const shopLinkStyle = { display: 'inline-block', marginTop: '20px', color: '#000', fontWeight: 'bold', textDecoration: 'underline' };

export default Cart;