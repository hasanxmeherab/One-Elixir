import React from 'react';
import { Link } from 'react-router-dom';

const Wishlist = () => {
  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>WISHLIST</h2>
      <div style={lineStyle}></div>
      
      <div style={emptyContent}>
        <p style={{ letterSpacing: '2px', color: '#888', fontSize: '12px' }}>YOUR WISHLIST IS CURRENTLY EMPTY</p>
        <Link to="/shop" style={shopBtn}>EXPLORE COLLECTION</Link>
      </div>
    </div>
  );
};

const containerStyle = { padding: '100px 5%', textAlign: 'center', minHeight: '70vh' };
const titleStyle = { letterSpacing: '10px', fontSize: '26px', fontWeight: 'bold' };
const lineStyle = { width: '40px', height: '2px', backgroundColor: '#000', margin: '20px auto 60px' };
const emptyContent = { marginTop: '80px' };
const shopBtn = {
  display: 'inline-block', marginTop: '40px', padding: '18px 50px',
  backgroundColor: '#000', color: '#fff', textDecoration: 'none',
  fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px', transition: '0.3s'
};

export default Wishlist;