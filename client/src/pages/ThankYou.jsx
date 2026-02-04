import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const ThankYou = () => {
  const { setCart } = useCart();

  useEffect(() => {
    // Only call if setCart exists to prevent crashing
    if (setCart) {
      setCart([]); 
    }
  }, [setCart]);

  return (
    <div style={thankYouStyle}>
      <h1 style={{ letterSpacing: '10px', fontSize: '3rem' }}>Thank You for Your Order</h1>
      <p style={{ color: '#888', letterSpacing: '2px' }}>YOUR ORDER IS BEING PREPARED</p>
      <div style={{ height: '1px', width: '50px', background: '#000', margin: '30px auto' }}></div>
      <p style={{ marginBottom: '40px', lineHeight: '1.6' }}>
        Confirmation has been sent to your email. <br />
        We hope you enjoy your new Elixir.
      </p>
      <Link to="/" style={homeBtnStyle}>RETURN TO SHOP</Link>
    </div>
  );
};

const thankYouStyle = { height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
const homeBtnStyle = { backgroundColor: '#000', color: '#fff', padding: '15px 35px', textDecoration: 'none', fontWeight: 'bold' };

export default ThankYou;