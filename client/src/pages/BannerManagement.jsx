import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BannerManagement = ({ isAdmin }) => {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ imageUrl: '', title: '', subtitle: '' });
  
  // Mobile check state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME = "dluvmed0b"; 
  const UPLOAD_PRESET = "one_elixir_uploads";

  const timerRef = useRef(null);

  // Handle window resizing to adjust responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/banners`);
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch (err) { 
      setBanners([]); 
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (banners.length > 0 ? (c + 1) % banners.length : 0));
    }, 5000);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (!isAdmin && banners.length > 0) {
      startTimer();
    }
    return () => clearInterval(timerRef.current);
  }, [isAdmin, banners.length]);

  const nextSlide = () => {
    setCurrent(current === banners.length - 1 ? 0 : current + 1);
    if (!isAdmin) startTimer(); 
  };

  const prevSlide = () => {
    setCurrent(current === 0 ? banners.length - 1 : current - 1);
    if (!isAdmin) startTimer(); 
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("upload_preset", UPLOAD_PRESET);
    setUploading(true);
    try {
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, uploadData);
      setFormData({ ...formData, imageUrl: res.data.secure_url });
      setUploading(false);
      alert("Image uploaded!");
    } catch (err) {
      setUploading(false);
      alert("Upload failed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imageUrl) return alert("Upload image first");
    try {
      await axios.post(`${API_URL}/api/banners`, formData);
      setFormData({ imageUrl: '', title: '', subtitle: '' });
      fetchBanners();
      alert("Published!");
    } catch (err) { alert("Save failed"); }
  };

  const deleteBanner = async (id) => {
    if (window.confirm("Remove?")) {
      await axios.delete(`${API_URL}/api/banners/${id}`);
      fetchBanners();
    }
  };

  if (isAdmin) {
    return (
      <div style={{ padding: isMobile ? '15px' : '40px' }}>
        <h3 style={{ letterSpacing: '2px', fontWeight: 'bold' }}>BANNER MANAGEMENT</h3>
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={uploadBox}>
            <label style={labelStyle}>UPLOAD IMAGE</label>
            <input type="file" onChange={handleFileUpload} accept="image/*" />
            {uploading && <p style={{ fontSize: '10px', color: 'blue' }}>Uploading...</p>}
            {formData.imageUrl && <p style={{ fontSize: '10px', color: 'green' }}>✓ Ready</p>}
          </div>
          <input placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={inputStyle} />
          <input placeholder="Subtitle" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} style={inputStyle} />
          <button type="submit" disabled={uploading || !formData.imageUrl} style={addBtn}>PUBLISH</button>
        </form>
        <div style={gridStyle}>
          {banners.map(b => (
            <div key={b._id} style={cardStyle}>
              <img src={b.imageUrl} width="100%" height="100px" style={{ objectFit: 'cover' }} alt="preview" />
              <button onClick={() => deleteBanner(b._id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: '5px' }}>REMOVE</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!banners || banners.length === 0) return null;

  return (
    <div style={{ ...sliderContainer, height: isMobile ? '40vh' : '70vh' }}>
      {/* Navigation Arrows (Hidden on very small screens for cleaner look) */}
      {!isMobile && (
        <>
          <button onClick={prevSlide} style={{ ...arrowBtn, left: '20px' }}>❮</button>
          <button onClick={nextSlide} style={{ ...arrowBtn, right: '20px' }}>❯</button>
        </>
      )}

      {/* Sliding Wrapper */}
      <div style={{ ...slideWrapper, transform: `translateX(-${current * 100}%)` }}>
        {banners.map((slide) => (
          <div key={slide._id} style={{ ...slideItem, backgroundImage: `url(${slide.imageUrl})` }}>
            <div style={{ ...overlay, padding: isMobile ? '20px' : '0' }}>
              <h1 style={{ ...heroTitle, fontSize: isMobile ? '1.8rem' : '3.5rem', letterSpacing: isMobile ? '4px' : '12px' }}>
                {slide.title?.toUpperCase()}
              </h1>
              <p style={{ ...heroSub, fontSize: isMobile ? '0.8rem' : '1.2rem', letterSpacing: isMobile ? '2px' : '5px' }}>
                {slide.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div style={dotContainer}>
        {banners.map((_, i) => (
          <div 
            key={i} 
            onClick={() => { setCurrent(i); startTimer(); }}
            style={{ ...dot, backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.4)' }}
          />
        ))}
      </div>
    </div>
  );
};

// --- Responsive Styles ---
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f9f9f9', padding: '30px', border: '1px solid #eee', marginBottom: '40px' };
const uploadBox = { border: '2px dashed #ddd', padding: '20px', textAlign: 'center', backgroundColor: '#fff' };
const labelStyle = { display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '10px' };
const inputStyle = { padding: '12px', border: '1px solid #ddd' };
const addBtn = { padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' };
const cardStyle = { border: '1px solid #eee', backgroundColor: '#fff' };

const sliderContainer = { position: 'relative', width: '100%', overflow: 'hidden', backgroundColor: '#000' };
const slideWrapper = { display: 'flex', width: '100%', height: '100%', transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' };
const slideItem = { minWidth: '100%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' };

const overlay = { textAlign: 'center', color: '#fff', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' };
const heroTitle = { margin: '0', fontWeight: 'bold' };
const heroSub = { marginTop: '10px' };

const arrowBtn = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '15px', cursor: 'pointer', zIndex: 10, fontSize: '20px', borderRadius: '50%' };
const dotContainer = { position: 'absolute', bottom: '20px', width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', zIndex: 10 };
const dot = { width: '8px', height: '8px', borderRadius: '50%', cursor: 'pointer', transition: '0.3s' };

export default BannerManagement;