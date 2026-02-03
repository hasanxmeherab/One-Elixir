import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const ProductDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  
  // State Management
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetailsAndRelated = async () => {
      try {
        setLoading(true);
        // 1. Fetch current product details from your Node.js server 
        const productRes = await axios.get(`http://localhost:5000/api/perfumes/${id}`);
        setProduct(productRes.data);

        // 2. Fetch all products to filter for the 'Related' section
        const allRes = await axios.get('http://localhost:5000/api/perfumes');
        
        // Exclude current item and limit to 3 recommendations
        const filtered = allRes.data
          .filter(item => item._id !== id)
          .slice(0, 3);
        
        setRelated(filtered);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching OneElixir collection:", err);
        setLoading(false);
      }
    };

    fetchDetailsAndRelated();
    // Reset quantity to 1 when navigating between different products
    setQuantity(1);
  }, [id]);

  if (loading) return <div style={loaderStyle}>Unveiling the notes...</div>;
  if (!product) return <div style={loaderStyle}>Elixir not found.</div>;

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* Main Product Section */}
      <div style={detailsContainerStyle}>
        <div style={imageSectionStyle}>
          <img 
            src={product.image} 
            alt={product.name} 
            style={{ width: '100%', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} 
          />
        </div>

        <div style={infoSectionStyle}>
          <h4 style={{ color: '#888', letterSpacing: '2px', textTransform: 'uppercase' }}>
            {product.brand || "OneElixir"}
          </h4>
          <h1 style={{ fontSize: '3.5rem', margin: '10px 0', fontFamily: "'Playfair Display', serif" }}>
            {product.name}
          </h1>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${product.price}</p>
          
          <hr style={{ margin: '30px 0', border: '0.5px solid #eee' }} />
          
          <p style={{ lineHeight: '1.8', color: '#444', marginBottom: '20px', fontSize: '1.1rem' }}>
            {product.description}
          </p>
          
          {product.scentProfile && product.scentProfile.length > 0 && (
            <p style={{ letterSpacing: '1px', marginBottom: '30px' }}>
              <strong>SCENT PROFILE:</strong> {product.scentProfile.join(' — ')}
            </p>
          )}

          {/* Quantity Selector UI */}
          <div style={quantityContainerStyle}>
            <label style={{ letterSpacing: '1px', fontSize: '12px', fontWeight: 'bold' }}>QUANTITY</label>
            <div style={quantitySelectorStyle}>
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                style={qtyBtnStyle}>−</button>
              <span style={{ padding: '0 20px', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
                {quantity}
              </span>
              <button 
                onClick={() => setQuantity(q => q + 1)} 
                style={qtyBtnStyle}>+</button>
            </div>
          </div>

          <button 
            onClick={() => addToCart(product, quantity)} 
            style={addBtnStyle}
          >
            ADD TO COLLECTION
          </button>
        </div>
      </div>

      {/* Related Products Section */}
      {related.length > 0 && (
        <div style={relatedSectionStyle}>
          <h3 style={{ textAlign: 'center', letterSpacing: '4px', marginBottom: '40px' }}>
            DISCOVER MORE
          </h3>
          <div style={relatedGridStyle}>
            {related.map((item) => (
              <Link key={item._id} to={`/product/${item._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ overflow: 'hidden', backgroundColor: '#f9f9f9' }}>
                    <img src={item.image} alt={item.name} style={relatedImageStyle} />
                  </div>
                  <h4 style={{ marginTop: '15px', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {item.name}
                  </h4>
                  <p style={{ color: '#888', fontSize: '13px' }}>${item.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Styles ---
const detailsContainerStyle = { 
  display: 'flex', 
  padding: '80px 10%', 
  gap: '80px', 
  alignItems: 'center' 
};

const imageSectionStyle = { flex: 1.2 };
const infoSectionStyle = { flex: 1, textAlign: 'left' };

const quantityContainerStyle = {
  marginTop: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const quantitySelectorStyle = {
  display: 'flex',
  alignItems: 'center',
  border: '1px solid #ddd',
  width: 'fit-content',
  padding: '5px'
};

const qtyBtnStyle = {
  background: 'none',
  border: 'none',
  padding: '10px 15px',
  cursor: 'pointer',
  fontSize: '18px',
  color: '#333'
};

const addBtnStyle = { 
  marginTop: '40px', 
  backgroundColor: '#000', 
  color: '#fff', 
  padding: '20px', 
  border: 'none', 
  width: '100%', 
  cursor: 'pointer', 
  letterSpacing: '3px', 
  fontWeight: 'bold',
  transition: 'background-color 0.3s ease'
};

const loaderStyle = { 
  height: '80vh', 
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  letterSpacing: '2px',
  fontSize: '1.2rem'
};

const relatedSectionStyle = { marginTop: '100px', padding: '0 10%' };
const relatedGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' };
const relatedImageStyle = { 
  width: '100%', 
  height: '350px', 
  objectFit: 'cover', 
  transition: 'transform 0.5s ease' 
};

export default ProductDetails;