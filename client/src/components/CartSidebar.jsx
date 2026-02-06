import React from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom'; // 1. Added useNavigate import

const CartSidebar = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, addToCart, cartTotal } = useCart();
  const navigate = useNavigate(); // 2. Initialize navigate

  if (!isOpen) return null;

  const updateQuantity = (item, newQty) => {
    if (newQty < 1) return;
    if (newQty > item.stock) return; 
    
    const diff = newQty - item.quantity;
    addToCart(item, diff);
  };

  // 3. New function to handle checkout navigation
  const handleCheckout = () => {
    onClose(); // Close the sidebar first
    navigate('/checkout'); // Send user to the checkout page
  };

  return (
    <>
      <div style={overlay} onClick={onClose}></div>
      <div style={sidebar}>
        <div style={header}>
          <h2 style={title}>YOUR SELECTION</h2>
          <button onClick={onClose} style={closeBtn}>CLOSE ×</button>
        </div>

        <div style={itemList}>
          {cart.length === 0 ? (
            <p style={emptyMsg}>Your collection is currently empty.</p>
          ) : (
            cart.map(item => (
              <div key={item._id} style={cartItem}>
                <img src={item.image} alt={item.name} style={itemImg} />
                <div style={itemDetails}>
                  <p style={itemName}>{item.name.toUpperCase()}</p>
                  
                  <div style={qtyContainer}>
                    <button onClick={() => updateQuantity(item, item.quantity - 1)} style={qtySmallBtn}>-</button>
                    <span style={qtyText}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item, item.quantity + 1)} style={qtySmallBtn}>+</button>
                    <span style={priceText}>@ {item.price.toLocaleString()} TK</span>
                  </div>

                  <button onClick={() => removeFromCart(item._id)} style={removeBtn}>REMOVE</button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div style={footer}>
            <div style={totalRow}>
              <span>SUBTOTAL</span>
              <span>{cartTotal.toLocaleString()} TK</span>
            </div>
            {/* 4. Updated button to use handleCheckout */}
            <button style={checkoutBtn} onClick={handleCheckout}>
              PROCEED TO CHECKOUT
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// --- Styles (Existing Styles Maintained) ---
const overlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1001 };
const sidebar = { position: 'fixed', top: 0, right: 0, width: '380px', height: '100vh', backgroundColor: '#fff', zIndex: 1002, display: 'flex', flexDirection: 'column', padding: '30px', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)' };
const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' };
const title = { fontSize: '12px', letterSpacing: '3px', fontWeight: 'bold' };
const closeBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px' };
const itemList = { flex: 1, overflowY: 'auto' };
const emptyMsg = { textAlign: 'center', marginTop: '50px', color: '#888', fontSize: '11px', letterSpacing: '1px' };
const cartItem = { display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #f9f9f9', paddingBottom: '15px' };
const itemImg = { width: '60px', height: '80px', objectFit: 'cover', backgroundColor: '#f9f9f9' };
const itemDetails = { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const itemName = { fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '5px' };
const removeBtn = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', textDecoration: 'underline', padding: 0, textAlign: 'left', marginTop: '5px' };

const qtyContainer = { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' };
const qtySmallBtn = { width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '14px' };
const qtyText = { fontSize: '12px', fontWeight: 'bold', width: '20px', textAlign: 'center' };
const priceText = { fontSize: '11px', color: '#666', marginLeft: '5px' };

const footer = { borderTop: '1px solid #000', paddingTop: '20px' };
const totalRow = { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '20px', fontSize: '13px', letterSpacing: '1px' };
const checkoutBtn = { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', fontSize: '11px' };

export default CartSidebar;