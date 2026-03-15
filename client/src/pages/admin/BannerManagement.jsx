import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { ImagePlus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const BannerManagement = ({ isAdmin }) => {
  const toast = useToast();
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ imageUrl: '', title: '', subtitle: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME = "dluvmed0b";

  // Cloudinary image optimizer — adds auto-format + auto-quality + width cap
  const optimizeCloudinaryUrl = (url, width = 1920) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  };
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
      setFormData({ ...formData, imageUrl: optimizeCloudinaryUrl(res.data.secure_url, 1920) });
      setUploading(false);
      toast.success("Image uploaded successfully!");
    } catch (err) { setUploading(false); toast.error("Upload failed. Please try again."); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imageUrl) return toast.warning("Please upload an image first.");
    try {
      await adminAxios.post(`${API_URL}/api/banners`, formData);
      setFormData({ imageUrl: '', title: '', subtitle: '' });
      fetchBanners();
      toast.success("Banner published successfully!");
    } catch (err) { toast.error("Failed to save banner."); }
  };

  const deleteBanner = async (id) => {
    if (window.confirm("Remove?")) {
      await adminAxios.delete(`${API_URL}/api/banners/${id}`);
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
          <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded cursor-pointer transition-colors p-6 ${formData.imageUrl ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black hover:bg-gray-50'}`}>
            <ImagePlus size={22} className="text-[#888]" />
            <span className="text-xs font-bold tracking-wider text-black">
              {uploading ? 'UPLOADING...' : formData.imageUrl ? 'BANNER READY' : 'CLICK TO UPLOAD BANNER'}
            </span>
            <span className="text-[10px] text-[#aaa] text-center">
              {uploading ? 'Please wait...' : formData.imageUrl ? '✓ Uploaded successfully' : 'JPG, PNG, WEBP — recommended 1920×600px'}
            </span>
            <input type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
          </label>

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
    <div className="relative w-full overflow-hidden bg-black">

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="hidden sm:block absolute left-3 md:left-6 top-1/2 -translate-y-1/2 bg-white/20 text-white border-none p-2 md:p-4 cursor-pointer z-10 text-base md:text-xl rounded-full hover:bg-white/40 transition-colors"
      >❮</button>
      <button
        onClick={nextSlide}
        className="hidden sm:block absolute right-3 md:right-6 top-1/2 -translate-y-1/2 bg-white/20 text-white border-none p-2 md:p-4 cursor-pointer z-10 text-base md:text-xl rounded-full hover:bg-white/40 transition-colors"
      >❯</button>

      {/* Slides Wrapper */}
      <div
        className="flex w-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((slide) => (
          <div key={slide._id} className="relative min-w-full">
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="w-full block min-h-[200px] max-h-[60vh] object-cover"
            />
            {/* Text overlay */}
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white bg-black/30 px-4 sm:px-8">
              <h1 className="m-0 font-bold
                text-[clamp(1rem,4vw,3.5rem)]
                tracking-[clamp(2px,1.2vw,12px)]">
                {slide.title?.toUpperCase()}
              </h1>
              <p className="mt-2
                text-[clamp(0.6rem,1.8vw,1.2rem)]
                tracking-[clamp(1px,0.8vw,5px)]">
                {slide.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-3 sm:bottom-5 w-full flex justify-center gap-2 z-10">
        {banners.map((_, i) => (
          <div
            key={i}
            onClick={() => { setCurrent(i); startTimer(); }}
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full cursor-pointer transition-all duration-300"
            style={{ backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.4)' }}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerManagement;