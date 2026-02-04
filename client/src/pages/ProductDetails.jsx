import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [perfume, setPerfume] = useState(null);
  const { addToCart } = useCart();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchPerfume = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes/${id}`);
        setPerfume(res.data);
      } catch (err) {
        console.error("Error loading product", err);
      }
    };
    fetchPerfume();
  }, [id, API_URL]);

  if (!perfume) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={containerStyle}>
      <button onClick={() => navigate(-1)} style={backBtnStyle}>← BACK</button>
      
      <div style={contentWrapperStyle}>
        <div style={imageSectionStyle}>
          <img src={perfume.image} alt={perfume.name} style={{ 
            width: '100%', 
            maxHeight: '600px', 
            objectFit: 'cover',
            opacity: perfume.stock === 0 ? 0.6 : 1 
          }} />
        </div>

        <div style={detailsSectionStyle}>
          <h1 style={titleStyle}>{perfume.name}</h1>
          <p style={priceStyle}>TK {perfume.price}</p>
          
          {/* Stock Logic Indicators */}
          {perfume.stock === 0 ? (
            <div style={outOfStockBox}>UNAVAILABLE: This elixir is currently sold out.</div>
          ) : perfume.stock < 5 ? (
            <div style={lowStockBox}>RARE: Only {perfume.stock} bottles remaining in this batch.</div>
          ) : (
            <div style={inStockBox}>In Stock and ready for immediate shipment.</div>
          )}

          <div style={divider}></div>
          
          <h4 style={labelStyle}>THE EXPERIENCE</h4>
          <p style={descStyle}>{perfume.description}</p>
          
          <h4 style={labelStyle}>SCENT PROFILE</h4>
          <p style={scentStyle}>{perfume.scentProfile.join(' — ')}</p>

          <button 
            onClick={() => addToCart(perfume)}
            disabled={perfume.stock === 0}
            style={{ 
              ...cartBtnStyle, 
              backgroundColor: perfume.stock === 0 ? '#eee' : '#000',
              color: perfume.stock === 0 ? '#999' : '#fff',
              cursor: perfume.stock === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {perfume.stock === 0 ? 'SOLD OUT' : 'ADD TO CART'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Styles ---
const containerStyle = { padding: '50px 10%', minHeight: '90vh' };
const contentWrapperStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '40px' };
const imageSectionStyle = { backgroundColor: '#f9f9f9' };
const detailsSectionStyle = { display: 'flex', flexDirection: 'column', justifyContent: 'center' };

const titleStyle = { letterSpacing: '5px', fontSize: '2.5rem', margin: '0' };
const priceStyle = { fontSize: '1.5rem', margin: '20px 0', fontWeight: '300' };
const divider = { height: '1px', backgroundColor: '#eee', margin: '30px 0' };
const labelStyle = { letterSpacing: '2px', fontSize: '12px', color: '#888', marginBottom: '10px' };
const descStyle = { lineHeight: '1.8', marginBottom: '30px' };
const scentStyle = { letterSpacing: '1px', fontStyle: 'italic', marginBottom: '40px' };

const cartBtnStyle = { padding: '20px', border: 'none', fontWeight: 'bold', letterSpacing: '2px' };
const backBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '2px', fontSize: '12px' };

// Stock Status Boxes
const baseStatus = { padding: '12px', fontSize: '13px', letterSpacing: '1px', marginBottom: '20px', fontWeight: 'bold' };
const outOfStockBox = { ...baseStatus, backgroundColor: '#fff1f1', color: '#d93025', border: '1px solid #d93025' };
const lowStockBox = { ...baseStatus, backgroundColor: '#fff8e1', color: '#f57c00', border: '1px solid #f57c00' };
const inStockBox = { ...baseStatus, color: '#2e7d32', fontSize: '12px', fontWeight: 'normal' };

export default ProductDetails;