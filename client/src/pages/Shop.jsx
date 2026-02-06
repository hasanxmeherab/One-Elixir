import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Shop = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes`);
        setPerfumes(res.data);
      } catch (err) {
        console.error("Collection unavailable", err);
      }
    };
    fetchProducts();
  }, []);

  const filteredPerfumes = perfumes.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={container}>
      {/* Header Section */}
      <div style={header}>
        <h1 style={title}>OUR ELIXIRS</h1>
        <p style={subtitle}>Bespoke fragrances, crafted in small batches.</p>
        
        <input 
          type="text" 
          placeholder="Search for a scent..." 
          style={searchStyle} 
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Product Grid */}
      <div style={productGrid}>
        {filteredPerfumes.map(p => (
          <div key={p._id} style={card} onClick={() => navigate(`/product/${p._id}`)}>
            <div style={imageBox}>
              <img src={p.image} alt={p.name} style={imgStyle} />
              {p.stock === 0 && <div style={soldOutBadge}>SOLD OUT</div>}
              {p.stock > 0 && p.stock <= 5 && <div style={lowStockBadge}>LIMITED</div>}
            </div>

            <div style={details}>
              <h3 style={pName}>{p.name.toUpperCase()}</h3>
              <p style={pPrice}>{p.price.toLocaleString()} TK</p>
              <p style={pNotes}>{p.scentProfile.join(' • ')}</p>
              
              <button style={viewBtn}>
                {p.stock > 0 ? 'VIEW ELIXIR' : 'OUT OF STOCK'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Styles (OneElixir Client Theme) ---
const container = { padding: '100px 5%', maxWidth: '1300px', margin: '0 auto', minHeight: '100vh' };
const header = { textAlign: 'center', marginBottom: '80px' };
const title = { fontSize: '40px', fontWeight: '300', letterSpacing: '10px', marginBottom: '15px' };
const subtitle = { fontSize: '11px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '30px' };
const searchStyle = { padding: '12px 20px', border: '1px solid #eee', width: '100%', maxWidth: '400px', textAlign: 'center', outline: 'none', fontSize: '13px', letterSpacing: '1px' };

const productGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '50px' };
const card = { cursor: 'pointer', transition: '0.4s transform ease', textAlign: 'center' };
const imageBox = { position: 'relative', width: '100%', height: '380px', backgroundColor: '#fcfcfc', marginBottom: '20px', overflow: 'hidden' };
const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' };

const soldOutBadge = { position: 'absolute', top: '15px', right: '15px', backgroundColor: '#000', color: '#fff', padding: '5px 12px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '2px' };
const lowStockBadge = { ...soldOutBadge, backgroundColor: '#f39c12' };

const details = { padding: '0 10px' };
const pName = { fontSize: '15px', letterSpacing: '3px', marginBottom: '8px', fontWeight: 'bold' };
const pPrice = { fontSize: '14px', marginBottom: '12px', color: '#333' };
const pNotes = { fontSize: '10px', color: '#999', marginBottom: '20px', fontStyle: 'italic', letterSpacing: '1px' };
const viewBtn = { background: 'none', border: '1px solid #000', padding: '12px 30px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', width: '100%' };

export default Shop;