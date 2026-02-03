import React from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';

const Cart = () => {
  const { cart, removeFromCart } = useCart();

  // Calculate the grand total of the entire cart
  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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
                    <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
                      ${item.price} x {item.quantity}
                    </p>
                  </div>
                </div>
                
                <div style={itemActionStyle}>
                  <span style={{ fontWeight: 'bold' }}>${(item.price * item.quantity).toFixed(2)}</span>
                  <button 
                    onClick={() => removeFromCart(item._id)} 
                    style={removeBtnStyle}
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={summaryStyle}>
            <div style={totalRowStyle}>
              <span>SUBTOTAL</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
            <p style={shippingNoteStyle}>Taxes and shipping calculated at checkout.</p>
            <button style={checkoutBtnStyle}>PROCEED TO CHECKOUT</button>
          </div>
        </>
      )}
    </div>
  );
};

// --- Styles for a Premium Experience ---
const cartContainerStyle = { padding: '80px 15%', minHeight: '70vh' };
const cartHeaderStyle = { letterSpacing: '4px', textAlign: 'center', marginBottom: '60px', borderBottom: '1px solid #eee', paddingBottom: '20px' };
const cartListStyle = { marginBottom: '40px' };

const cartItemStyle = { 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  padding: '20px 0', 
  borderBottom: '1px solid #f9f9f9' 
};

const itemInfoStyle = { display: 'flex', alignItems: 'center', gap: '20px' };
const cartThumbStyle = { width: '80px', height: '100px', objectFit: 'cover', backgroundColor: '#f9f9f9' };

const itemActionStyle = { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px' };
const removeBtnStyle = { background: 'none', border: 'none', color: '#999', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' };

const summaryStyle = { marginTop: '50px', borderTop: '2px solid #000', paddingTop: '30px', maxWidth: '400px', marginLeft: 'auto' };
const totalRowStyle = { display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px' };
const shippingNoteStyle = { fontSize: '12px', color: '#888', marginTop: '10px', fontStyle: 'italic' };

const checkoutBtnStyle = { 
  width: '100%', 
  backgroundColor: '#000', 
  color: '#fff', 
  padding: '18px', 
  border: 'none', 
  marginTop: '25px', 
  letterSpacing: '3px', 
  fontWeight: 'bold', 
  cursor: 'pointer' 
};

const shopLinkStyle = { display: 'inline-block', marginTop: '20px', color: '#000', fontWeight: 'bold', letterSpacing: '1px', textDecoration: 'none', borderBottom: '1px solid #000' };

export default Cart;