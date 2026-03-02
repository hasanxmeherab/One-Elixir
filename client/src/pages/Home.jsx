import React, { useState, useEffect } from 'react';
import { HomeSkeleton } from '../components/Skeleton';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import BannerManagement from './BannerManagement'; 

const Home = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const sectionGap = '60px'; 

  const brandLogos = [
    "logos/chanel.png",
    "logos/dior.png",
    "logos/gucci.png",
    "logos/creed.png",
    "logos/dunhill.png",
    "logos/oneelixir.png",
  ];

  useEffect(() => {
    const fetchPerfumes = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes`);
        setPerfumes(res.data);
        setLoading(false);
      } catch (err) { console.error(err); setLoading(false); }
    };
    fetchPerfumes();
  }, [API_URL]);

  return (
    <div style={{ backgroundColor: '#fff' }}>
      {/* 1. BANNER SECTION */}
      <section>
        <BannerManagement />
      </section>

      {/* 2. TRANSPARENT LOGO CAROUSEL */}
      <section style={{ ...carouselSection, marginTop: sectionGap, marginBottom: sectionGap }}>
        <div className="carousel-track"> {/* FIXED: Removed undefined style ref */}
          {brandLogos.map((logo, index) => (
            <img key={`logo-1-${index}`} src={logo} alt="brand logo" style={logoStyle} className="brand-logo-img" />
          ))}
          {brandLogos.map((logo, index) => (
            <img key={`logo-2-${index}`} src={logo} alt="brand logo" style={logoStyle} className="brand-logo-img" />
          ))}
          {brandLogos.map((logo, index) => (
            <img key={`logo-3-${index}`} src={logo} alt="brand logo" style={logoStyle} className="brand-logo-img" />
          ))}
        </div>
      </section>

      {/* 3. COLLECTION SECTION */}
      <section className="collection-container" style={{ padding: '0 10% 80px 10%' }}>
        <div style={sectionHeader}>
          <h2 style={{ letterSpacing: '8px', fontSize: '24px', margin: 0 }}>EXCLUSIVE</h2>
          <div style={headerLine}></div>
        </div>

        <div style={gridStyle} className="product-grid">
          {loading ? <HomeSkeleton count={4} /> : perfumes.slice(0,4).map((p) => (
            <div key={p._id} style={cardStyle} className="product-card">
              {p.stock === 0 && <div style={badgeStyle}>SOLD OUT</div>}
              
              <Link to={`/product/${p.slug || p._id}`} style={{ textDecoration: 'none' }}>
                <div style={imageContainer} className="image-container">
                  <img src={p.image} alt={p.name} style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    opacity: p.stock === 0 ? 0.6 : 1 
                  }} className="product-image-hover" />
                </div>
              </Link>

              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', letterSpacing: '1px' }}>{p.name.toUpperCase()}</h4>
                <p style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>{p.price.toLocaleString()} TK</p>
                <button 
                  onClick={() => addToCart({ ...p, price: Number(p.price) })} 
                  disabled={p.stock === 0}
                  style={{ 
                    ...btnStyle, 
                    backgroundColor: p.stock === 0 ? '#ebebeb' : '#000',
                    color: p.stock === 0 ? '#999' : '#fff',
                    cursor: p.stock === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {p.stock === 0 ? 'UNAVAILABLE' : 'ADD TO BAG'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RESPONSIVE CSS */}
      <style>
        {`
          @keyframes infiniteScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(calc(-100% / 3)); }
          }
          .carousel-track {
            display: flex;
            width: max-content;
            animation: infiniteScroll 40s linear infinite;
          }
          .product-image-hover:hover {
            transform: scale(1.05);
            transition: transform 0.5s ease;
          }

          @media (max-width: 768px) {
            .collection-container { padding: 0 5% 50px 5% !important; }
            .product-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 15px !important;
            }
            .image-container { height: 250px !important; }
            .brand-logo-img {
              height: 40px !important;
              margin: 0 30px !important;
            }
          }

          @media (max-width: 480px) {
            .product-grid { grid-template-columns: 1fr !important; }
            .image-container { height: 350px !important; }
          }
        `}
      </style>
    </div>
  );
};

// --- STYLES ---
const carouselSection = {
  width: '100%',
  backgroundColor: 'transparent',
  padding: '10px 0',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center'
};

const logoStyle = {
  height: '75px',
  margin: '0 80px',
  opacity: 0.9,
  filter: 'grayscale(100%) brightness(1.1)',
  transition: '0.3s',
  cursor: 'pointer',
  objectFit: 'contain'
};

const sectionHeader = { textAlign: 'center', marginBottom: '40px' };
const headerLine = { width: '40px', height: '2px', backgroundColor: '#000', margin: '15px auto' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '40px' };
const cardStyle = { position: 'relative', overflow: 'hidden' };
const imageContainer = { width: '100%', height: '380px', backgroundColor: '#f9f9f9', overflow: 'hidden' };
const btnStyle = { width: '100%', padding: '12px', border: 'none', marginTop: '10px', fontWeight: 'bold', letterSpacing: '2px', fontSize: '11px', transition: '0.3s' };
const badgeStyle = { position: 'absolute', top: '15px', left: '15px', backgroundColor: '#000', color: '#fff', padding: '6px 15px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px', zIndex: 2 };

export default Home;