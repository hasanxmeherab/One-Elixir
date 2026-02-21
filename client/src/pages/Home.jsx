import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import BannerManagement from './BannerManagement'; 

const Home = () => {
  const [perfumes, setPerfumes] = useState([]);
  const { addToCart } = useCart();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      } catch (err) { console.error(err); }
    };
    fetchPerfumes();
  }, [API_URL]);

  return (
    <div className="bg-white">
      {/* 1. BANNER SECTION */}
      <section>
        <BannerManagement />
      </section>

      {/* 2. TRANSPARENT LOGO CAROUSEL */}
      <section className="w-full bg-transparent py-2 overflow-hidden flex items-center my-16">
        <div className="carousel-track">
          {brandLogos.map((logo, index) => (
            <img key={`logo-1-${index}`} src={logo} alt="brand logo" className="brand-logo-img h-[75px] mx-20 opacity-90 grayscale brightness-110 transition-all duration-300 cursor-pointer object-contain" />
          ))}
          {brandLogos.map((logo, index) => (
            <img key={`logo-2-${index}`} src={logo} alt="brand logo" className="brand-logo-img h-[75px] mx-20 opacity-90 grayscale brightness-110 transition-all duration-300 cursor-pointer object-contain" />
          ))}
          {brandLogos.map((logo, index) => (
            <img key={`logo-3-${index}`} src={logo} alt="brand logo" className="brand-logo-img h-[75px] mx-20 opacity-90 grayscale brightness-110 transition-all duration-300 cursor-pointer object-contain" />
          ))}
        </div>
      </section>

      {/* 3. COLLECTION SECTION */}
      <section className="collection-container px-[10%] pb-20 md:px-[5%]">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="tracking-[8px] text-2xl m-0">THE COLLECTION</h2>
          <div className="w-10 h-0.5 bg-black mx-auto mt-4"></div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 md:gap-4">
          {perfumes.map((p) => (
            <div key={p._id} className="relative overflow-hidden product-card">
              {p.stock === 0 && (
                <div className="absolute top-4 left-4 bg-black text-white px-4 py-1.5 text-[10px] font-bold tracking-[2px] z-[2]">
                  SOLD OUT
                </div>
              )}

              <Link to={`/product/${p._id}`} className="no-underline">
                <div className="w-full h-[380px] sm:h-[250px] md:h-[380px] bg-[#f9f9f9] overflow-hidden image-container">
                  <img
                    src={p.image}
                    alt={p.name}
                    className={`w-full h-full object-cover product-image-hover transition-transform duration-500 hover:scale-105 ${p.stock === 0 ? 'opacity-60' : 'opacity-100'}`}
                  />
                </div>
              </Link>

              <div className="py-5 text-center">
                <h4 className="m-0 mb-2.5 text-sm tracking-wider">{p.name.toUpperCase()}</h4>
                <p className="font-bold text-[15px] text-[#333]">{p.price.toLocaleString()} TK</p>
                <button
                  onClick={() => addToCart({ ...p, price: Number(p.price) })}
                  disabled={p.stock === 0}
                  className={`w-full py-3 border-none mt-2.5 font-bold tracking-[2px] text-[11px] transition-all duration-300 ${
                    p.stock === 0
                      ? 'bg-[#ebebeb] text-[#999] cursor-not-allowed'
                      : 'bg-black text-white cursor-pointer hover:bg-gray-800'
                  }`}
                >
                  {p.stock === 0 ? 'UNAVAILABLE' : 'ADD TO BAG'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CAROUSEL ANIMATION - kept in style tag since @keyframes can't be done in Tailwind */}
      <style>{`
        @keyframes infiniteScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
        .carousel-track {
          display: flex;
          width: max-content;
          animation: infiniteScroll 40s linear infinite;
        }
        @media (max-width: 768px) {
          .brand-logo-img {
            height: 40px !important;
            margin: 0 30px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;