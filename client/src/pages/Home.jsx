import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import BannerManagement from './BannerManagement'; 

const Home = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [banners, setBanners] = useState([]); 
  const { addToCart } = useCart();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchPerfumes = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes`);
        setPerfumes(res.data);
      } catch (err) { console.error(err); }
    };

    const fetchBanners = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/banners`);
        setBanners(res.data);
      } catch (err) { console.error("Banner fetch failed", err); }
    };

    fetchPerfumes();
    fetchBanners(); 
  }, [API_URL]);

  return (
    <div>
      {/* 1. RENDER THE BANNER AT THE TOP */}
      <BannerManagement />

      <div style={{ padding: '50px 10%' }}>
        <h2 style={{ textAlign: 'center', letterSpacing: '5px', marginBottom: '40px' }}>THE COLLECTION</h2>
        <div style={gridStyle}>
          {perfumes.map((p) => (
            <div key={p._id} style={cardStyle}>
              {p.stock === 0 && <div style={badgeStyle}>SOLD OUT</div>}
              
              <Link to={`/product/${p._id}`}>
                <img src={p.image} alt={p.name} style={{ 
                  width: '100%', 
                  height: '350px', 
                  objectFit: 'cover',
                  opacity: p.stock === 0 ? 0.5 : 1 
                }} />
              </Link>

              <div style={{ padding: '15px', textAlign: 'center' }}>
                <h4 style={{ margin: '10px 0' }}>{p.name}</h4>
                <p style={{ fontWeight: 'bold' }}>TK {p.price}</p>
                <button 
                  // FIX: Explicitly pass price as a Number to prevent NaN in cart
                  onClick={() => addToCart({
                    ...p,
                    price: Number(p.price) 
                  })} 
                  disabled={p.stock === 0}
                  style={{ 
                    ...btnStyle, 
                    backgroundColor: p.stock === 0 ? '#ccc' : '#000',
                    cursor: p.stock === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {p.stock === 0 ? 'UNAVAILABLE' : 'ADD TO CART'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Styles maintained from your file ---
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' };
const cardStyle = { border: '1px solid #eee', position: 'relative', overflow: 'hidden' };
const btnStyle = { width: '100%', color: '#fff', padding: '12px', border: 'none', marginTop: '10px', fontWeight: 'bold' };
const badgeStyle = { position: 'absolute', top: '15px', left: '15px', backgroundColor: '#ff4444', color: '#fff', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', zIndex: 2 };

export default Home;