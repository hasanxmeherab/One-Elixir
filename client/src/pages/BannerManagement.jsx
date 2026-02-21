import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BannerManagement = ({ isAdmin }) => {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ imageUrl: '', title: '', subtitle: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME = "dluvmed0b";
  const UPLOAD_PRESET = "one_elixir_uploads";
  const timerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/banners`);
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch (err) { setBanners([]); }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (banners.length > 0 ? (c + 1) % banners.length : 0));
    }, 5000);
  };

  useEffect(() => { fetchBanners(); }, []);

  useEffect(() => {
    if (!isAdmin && banners.length > 0) startTimer();
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
    } catch (err) { setUploading(false); alert("Upload failed."); }
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

  // --- ADMIN VIEW ---
  if (isAdmin) {
    return (
      <div className="p-4 md:p-10">
        <h3 className="tracking-[2px] font-bold mb-6">BANNER MANAGEMENT</h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-[#f9f9f9] p-8 border border-[#eee] mb-10">
          {/* Upload Box */}
          <div className="border-2 border-dashed border-[#ddd] p-5 text-center bg-white">
            <label className="block text-[10px] font-bold mb-2.5 tracking-wider">UPLOAD IMAGE</label>
            <input type="file" onChange={handleFileUpload} accept="image/*" className="text-sm" />
            {uploading && <p className="text-[10px] text-blue-500 mt-1">Uploading...</p>}
            {formData.imageUrl && <p className="text-[10px] text-green-500 mt-1">✓ Ready</p>}
          </div>

          <input
            placeholder="Title"
            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
            className="p-3 border border-[#ddd] outline-none text-sm"
          />
          <input
            placeholder="Subtitle"
            value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})}
            className="p-3 border border-[#ddd] outline-none text-sm"
          />
          <button
            type="submit" disabled={uploading || !formData.imageUrl}
            className="p-4 bg-black text-white border-none font-bold cursor-pointer hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            PUBLISH
          </button>
        </form>

        {/* Banner Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {banners.map(b => (
            <div key={b._id} className="border border-[#eee] bg-white">
              <img src={b.imageUrl} alt="preview" className="w-full h-[100px] object-cover" />
              <button
                onClick={() => deleteBanner(b._id)}
                className="w-full text-red-500 border-none bg-transparent cursor-pointer py-1.5 text-xs hover:opacity-70 transition-opacity"
              >
                REMOVE
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- CUSTOMER CAROUSEL VIEW ---
  if (!banners || banners.length === 0) return null;

  return (
    <div className={`relative w-full overflow-hidden bg-black ${isMobile ? 'h-[40vh]' : 'h-[70vh]'}`}>

      {/* Navigation Arrows */}
      {!isMobile && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-5 top-1/2 -translate-y-1/2 bg-white/20 text-white border-none p-4 cursor-pointer z-10 text-xl rounded-full hover:bg-white/40 transition-colors"
          >❮</button>
          <button
            onClick={nextSlide}
            className="absolute right-5 top-1/2 -translate-y-1/2 bg-white/20 text-white border-none p-4 cursor-pointer z-10 text-xl rounded-full hover:bg-white/40 transition-colors"
          >❯</button>
        </>
      )}

      {/* Slides Wrapper */}
      <div
        className="flex w-full h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((slide) => (
          <div
            key={slide._id}
            className="min-w-full h-full bg-cover bg-center relative"
            style={{ backgroundImage: `url(${slide.imageUrl})` }}
          >
            <div className={`text-center text-white h-full flex flex-col justify-center bg-black/30 ${isMobile ? 'px-5' : ''}`}>
              <h1 className={`m-0 font-bold ${isMobile ? 'text-[1.8rem] tracking-[4px]' : 'text-[3.5rem] tracking-[12px]'}`}>
                {slide.title?.toUpperCase()}
              </h1>
              <p className={`mt-2.5 ${isMobile ? 'text-[0.8rem] tracking-[2px]' : 'text-[1.2rem] tracking-[5px]'}`}>
                {slide.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-5 w-full flex justify-center gap-2.5 z-10">
        {banners.map((_, i) => (
          <div
            key={i}
            onClick={() => { setCurrent(i); startTimer(); }}
            className="w-2 h-2 rounded-full cursor-pointer transition-all duration-300"
            style={{ backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.4)' }}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerManagement;