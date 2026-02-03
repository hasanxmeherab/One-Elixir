import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Home = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [filteredPerfumes, setFilteredPerfumes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerfumes = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/perfumes');
        setPerfumes(res.data);
        setFilteredPerfumes(res.data); // Initially show all
        setLoading(false);
      } catch (err) {
        console.error("Error fetching OneElixir collection:", err);
        setLoading(false);
      }
    };
    fetchPerfumes();
  }, []);

  // Handle Filtering Logic
  useEffect(() => {
    const results = perfumes.filter(perfume =>
      perfume.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (perfume.scentProfile && perfume.scentProfile.some(note => 
        note.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
    setFilteredPerfumes(results);
  }, [searchTerm, perfumes]);

  if (loading) return <div style={loaderStyle}>Elevating your senses... </div>;

  return (
    <div style={{ padding: '20px' }}>
      <header style={headerStyle}>
        <h2 style={{ letterSpacing: '5px' }}>THE COLLECTION </h2>
        <p>Curated scents for the modern soul. </p>
        
        {/* Search Bar UI */}
        <div style={searchContainerStyle}>
          <input
            type="text"
            placeholder="Search by name or scent (e.g. Woody, Rose)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>
      </header>

      <div className="product-grid">
        {filteredPerfumes.length > 0 ? (
          filteredPerfumes.map((p) => (
            <div key={p._id} className="card">
              <Link to={`/product/${p._id}`} style={{ textDecoration: 'none', color: 'inherit' }}> 
                <div style={imageWrapper}>
                  <img src={p.image} alt={p.name} style={imageStyle} /> 
                </div>
                <h3 style={productTitle}>{p.name}</h3> 
                <p style={productPrice}>${p.price}</p> 
              </Link>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', gridColumn: '1/-1', marginTop: '50px' }}>
            No elixirs match your search. Try another scent.
          </p>
        )}
      </div>
    </div>
  );
};

// --- Updated Styles ---
const searchContainerStyle = {
  marginTop: '30px',
  display: 'flex',
  justifyContent: 'center'
};

const searchInputStyle = {
  width: '100%',
  maxWidth: '500px',
  padding: '12px 20px',
  border: '1px solid #eee',
  fontFamily: 'inherit',
  fontSize: '14px',
  outline: 'none',
  textAlign: 'center',
  letterSpacing: '1px'
};

const headerStyle = { textAlign: 'center', margin: '40px 0', textTransform: 'uppercase' };
const imageWrapper = { overflow: 'hidden', backgroundColor: '#f9f9f9', marginBottom: '15px' };
const imageStyle = { width: '100%', height: '400px', objectFit: 'cover', transition: 'transform 0.5s ease' };
const productTitle = { fontSize: '18px', fontWeight: '600', marginBottom: '5px' };
const productPrice = { color: '#666', fontSize: '16px' };
const loaderStyle = { height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', letterSpacing: '2px' };

export default Home;