import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

// 1. Added { openCart } to the component props
const ProductDetails = ({ openCart }) => { 
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes/${id}`);
        setProduct(res.data);
      } catch (err) {
        console.error("Product not found");
      }
    };
    fetchProduct();
  }, [id]);

  if (!product) return <div style={loadingStyle}>AWAKENING THE SCENT...</div>;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    // 2. Corrected call from props.openCart() to openCart()
    if (openCart) openCart(); 
  };

  return (
    <div style={container}>
      {/* Left: Product Image */}
      <div style={imageSection}>
        <img src={product.image} alt={product.name} style={mainImg} />
      </div>

      {/* Right: Product Info */}
      <div style={infoSection}>
        <button onClick={() => navigate('/shop')} style={backBtn}>← BACK TO COLLECTION</button>
        
        <h1 style={title}>{product.name.toUpperCase()}</h1>
        <p style={price}>{product.price.toLocaleString()} TK</p>
        
        <div style={divider}></div>

        <p style={description}>{product.description}</p>

        {/* Scent Architecture Section */}
        <div style={notesSection}>
          <p style={sectionLabel}>SCENT ARCHITECTURE</p>
          <div style={notesGrid}>
            {product.scentProfile.map((note, index) => (
              <span key={index} style={noteTag}>{note}</span>
            ))}
          </div>
        </div>

        {/* Purchase Actions */}
        <div style={purchaseSection}>
          {product.stock > 0 ? (
            <>
              <div style={qtyWrapper}>
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                  style={qtyBtn}
                >-</button>
                <span style={qtyDisplay}>{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} 
                  style={qtyBtn}
                >+</button>
              </div>
              <button onClick={handleAddToCart} style={addBtn}>ADD TO COLLECTION</button>
            </>
          ) : (
            <button disabled style={outBtn}>CURRENTLY UNAVAILABLE</button>
          )}
        </div>
        
        <p style={stockInfo}>
          {product.stock > 0 ? `Inventory: ${product.stock} units available` : 'Restocking soon.'}
        </p>
      </div>
    </div>
  );
};

// --- Styles (Matching OneElixir Luxury Aesthetic) ---
const container = { display: 'flex', minHeight: '100vh', padding: '120px 8%', gap: '80px', flexWrap: 'wrap' };
const imageSection = { flex: '1', minWidth: '400px', backgroundColor: '#fcfcfc' };
const mainImg = { width: '100%', height: 'auto', objectFit: 'cover' };
const infoSection = { flex: '1', minWidth: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };
const backBtn = { background: 'none', border: 'none', fontSize: '10px', letterSpacing: '2px', cursor: 'pointer', marginBottom: '30px', textAlign: 'left', padding: 0 };
const title = { fontSize: '48px', fontWeight: '300', letterSpacing: '12px', marginBottom: '10px' };
const price = { fontSize: '20px', color: '#555', marginBottom: '30px' };
const divider = { height: '1px', backgroundColor: '#eee', width: '60px', marginBottom: '30px' };
const description = { fontSize: '15px', lineHeight: '1.8', color: '#444', marginBottom: '40px' };
const notesSection = { marginBottom: '50px' };
const sectionLabel = { fontSize: '10px', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '15px', color: '#888' };
const notesGrid = { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '50px' };
const noteTag = { padding: '8px 15px', border: '1px solid #ddd', fontSize: '12px', letterSpacing: '1px' };
const purchaseSection = { display: 'flex', gap: '20px', marginBottom: '20px' };
const qtyWrapper = { display: 'flex', alignItems: 'center', border: '1px solid #000' };
const qtyBtn = { padding: '10px 15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' };
const qtyDisplay = { padding: '0 20px', fontWeight: 'bold' };
const addBtn = { flex: 1, backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', fontSize: '12px' };
const outBtn = { flex: 1, backgroundColor: '#eee', color: '#888', border: 'none', cursor: 'not-allowed', letterSpacing: '2px' };
const stockInfo = { fontSize: '11px', color: '#aaa', fontStyle: 'italic' };
const loadingStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', letterSpacing: '5px' };

export default ProductDetails;