import React, { useState, useEffect, useRef } from 'react';
import { HomeSkeleton } from '../components/Skeleton';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import BannerManagement from './BannerManagement';
import { optimizeImage } from '../utils/optimizeImage';

/* ─── Horizontal scroll carousel hook ─── */
const useCarousel = () => {
  const ref = useRef(null);
  const scroll = (dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };
  return { ref, scrollLeft: () => scroll(-1), scrollRight: () => scroll(1) };
};

/* ─── Single product card ─── */
const ProductCard = ({ p, ratings, addToCart, navigate }) => {
  const price         = p.variants?.length > 0 ? Math.min(...p.variants.map(v => v.price)) : p.price;
  const originalPrice = p.originalPrice || p.compareAtPrice || null;
  const discount      = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null;

  return (
    <div className="shrink-0 w-[170px] sm:w-[200px] bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300 relative flex flex-col" style={{ border: '1px solid #efefef' }}>

      {/* Discount badge */}
      {discount && (
        <div className="absolute top-2.5 left-2.5 bg-[#22c55e] text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-10">
          -{discount}%
        </div>
      )}
      {p.stock === 0 && (
        <div className="absolute top-2.5 right-2.5 bg-black text-white text-[9px] font-bold px-2 py-1 rounded-full z-10 tracking-wider">
          SOLD OUT
        </div>
      )}

      {/* Image — pure white bg like sheitech */}
      <Link to={`/product/${p.slug || p._id}`} className="no-underline block">
        <div className="w-full h-[160px] sm:h-[190px] bg-white flex items-center justify-center overflow-hidden">
          <img
            src={optimizeImage(p.image || p.variants?.[0]?.image, 400)}
            alt={p.name}
            className="w-full h-full object-contain p-2 transition-transform duration-500 hover:scale-105"
            style={{ opacity: p.stock === 0 ? 0.5 : 1 }}
            loading="lazy"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1 border-t border-[#f5f5f5]">
        <p className="text-[12px] sm:text-[13px] font-bold text-[#111] leading-snug line-clamp-2 mb-1.5">
          {p.name}
        </p>

        {/* Ratings */}
        <div className="flex items-center gap-0.5 mb-1.5 min-h-[14px]">
          {ratings?.[p._id] ? (
            <>
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={10}
                  fill={i <= Math.round(ratings[p._id].avgRating) ? '#facc15' : 'none'}
                  className="text-yellow-400" />
              ))}
              <span className="text-[10px] text-[#aaa] ml-1">({ratings[p._id].count})</span>
            </>
          ) : (
            <span className="text-[10px] text-[#ccc] italic">No reviews yet</span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-1.5 mb-auto flex-wrap">
          {originalPrice && originalPrice > price && (
            <span className="text-[11px] text-[#bbb] line-through">
              {originalPrice.toLocaleString()} TK
            </span>
          )}
          <span className="text-[13px] sm:text-[14px] font-bold text-[#e74c3c]">
            {p.variants?.length > 0 ? `From ${price.toLocaleString()}` : price.toLocaleString()} TK
          </span>
        </div>

        {/* Button */}
        <button
          onClick={() => p.variants?.length > 0
            ? navigate(`/product/${p.slug || p._id}`)
            : addToCart({ ...p, price: Number(p.price) })}
          disabled={p.stock === 0 && !(p.variants?.length > 0)}
          className="w-full mt-2.5 py-2 text-[10px] sm:text-[11px] font-bold tracking-widest rounded-xl border-none transition-colors duration-200"
          style={{
            backgroundColor: p.stock === 0 && !(p.variants?.length > 0) ? '#f0f0f0' : '#111',
            color: p.stock === 0 && !(p.variants?.length > 0) ? '#999' : '#fff',
            cursor: p.stock === 0 && !(p.variants?.length > 0) ? 'not-allowed' : 'pointer',
          }}
        >
          {p.stock === 0 && !(p.variants?.length > 0)
            ? 'UNAVAILABLE'
            : p.variants?.length > 0 ? 'SELECT SIZE' : 'ADD TO BAG'}
        </button>
      </div>
    </div>
  );
};

/* ─── Section wrapper with carousel ─── */
const ProductSection = ({ title, products, loading, ratings, addToCart, navigate, bgColor = '#f0f0f0', viewAllLink }) => {
  const { ref, scrollLeft, scrollRight } = useCarousel();

  return (
    <section style={{ backgroundColor: bgColor }} className="py-10 px-2 md:px-[5%]">
      {/* Outer rounded box with legend title */}
      <div className="relative bg-white rounded-3xl p-3 pt-7" style={{ border: '1px solid #e0e0e0' }}>

        {/* Legend title on the border */}
        <div className="absolute -top-[14px] left-6">
          <span className="bg-[#e74c3c] text-white text-[14px] font-bold px-5 py-2 rounded-full shadow-sm">
            {title}
          </span>
        </div>

        {/* Cards row with side arrows */}
        <div className="relative mt-2">
          {/* Left arrow */}
          <button onClick={scrollLeft} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-9 h-9 rounded-full border border-[#ddd] flex items-center justify-center bg-white hover:bg-[#f5f5f5] transition-colors cursor-pointer shadow-sm z-10">
            <ChevronLeft size={18} className="text-[#444]" />
          </button>

          <div
            ref={ref}
            className="flex gap-4 overflow-x-auto py-1 scroll-smooth px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="shrink-0 w-[220px] h-[340px] bg-[#f0f0f0] rounded-2xl animate-pulse" />
                ))
              : products.map(p => (
                  <ProductCard
                    key={p._id}
                    p={p}
                    ratings={ratings}
                    addToCart={addToCart}
                    navigate={navigate}
                  />
                ))
            }
          </div>

          {/* Right arrow */}
          <button onClick={scrollRight} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-9 h-9 rounded-full border border-[#ddd] flex items-center justify-center bg-white hover:bg-[#f5f5f5] transition-colors cursor-pointer shadow-sm z-10">
            <ChevronRight size={18} className="text-[#444]" />
          </button>
        </div>

        {/* See all — bottom right */}
        {viewAllLink && (
          <div className="flex justify-end mt-5">
            <Link
              to={viewAllLink}
              className="bg-black text-white text-[12px] font-bold tracking-wider px-5 py-2.5 rounded-full no-underline hover:bg-[#333] transition-colors"
            >
              See all products →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

/* ─── Flash Deals carousel ─── */
const FlashCarousel = ({ products, getCountdown, addToCart, navigate }) => {
  const { ref, scrollLeft, scrollRight } = useCarousel();
  return (
    <>
      <button onClick={scrollLeft} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-9 h-9 rounded-full border border-[#444] flex items-center justify-center bg-[#222] hover:bg-[#333] transition-colors cursor-pointer shadow-sm z-10">
        <ChevronLeft size={18} className="text-white" />
      </button>
      <div ref={ref} className="flex gap-4 overflow-x-auto py-1 scroll-smooth px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {products.map(p => {
          const cd = getCountdown(p.flashSale.endsAt);
          const discount = Math.round(((p.price - p.flashSale.salePrice) / p.price) * 100);
          return (
            <div key={p._id} className="shrink-0 w-[160px] sm:w-[220px] bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
              <div className="relative">
                <div className="absolute top-3 left-3 bg-[#dc2626] text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-10">
                  🔥 -{discount}%
                </div>
                <Link to={`/product/${p.slug || p._id}`} className="block">
                  <div className="w-full h-[150px] sm:h-[200px] bg-[#222] flex items-center justify-center overflow-hidden rounded-t-2xl">
                    <img src={optimizeImage(p.image || p.variants?.[0]?.image, 400)} alt={p.name}
                      className="w-full h-full object-contain p-3 hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                </Link>
              </div>
              <div className="p-4 border-t border-[#222]">
                <p className="text-[13px] font-semibold text-white leading-tight line-clamp-2 mb-2">{p.name}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[14px] font-bold text-[#e74c3c]">{p.flashSale.salePrice.toLocaleString()} TK</span>
                  <span className="text-[12px] text-[#555] line-through">{p.price.toLocaleString()} TK</span>
                </div>
                {cd && (
                  <div className="flex gap-1.5 mb-3">
                    {[['h','HRS'],['m','MIN'],['s','SEC']].map(([k,l]) => (
                      <div key={k} className="bg-[#111] rounded-lg px-2 py-1 text-center flex-1">
                        <span className="text-white text-[13px] font-bold block">{cd[k]}</span>
                        <span className="text-[#555] text-[8px] tracking-wider">{l}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => addToCart({ ...p, price: p.flashSale.salePrice })}
                  disabled={p.stock === 0}
                  className="w-full py-2.5 text-[11px] font-bold tracking-widest rounded-xl border-none cursor-pointer"
                  style={{ backgroundColor: p.stock === 0 ? '#333' : '#dc2626', color: '#fff' }}
                >
                  {p.stock === 0 ? 'UNAVAILABLE' : 'GRAB DEAL'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={scrollRight} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-9 h-9 rounded-full border border-[#444] flex items-center justify-center bg-[#222] hover:bg-[#333] transition-colors cursor-pointer shadow-sm z-10">
        <ChevronRight size={18} className="text-white" />
      </button>
    </>
  );
};

/* ══════════════════════════════════════ */
const Home = () => {
  const [perfumes, setPerfumes]       = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [bsLoading, setBsLoading]     = useState(true);
  const [now, setNow]                 = useState(new Date());
  const [ratings, setRatings]         = useState({});
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const brandLogos = [
    "logos/chanel.png","logos/dior.png","logos/gucci.png",
    "logos/creed.png","logos/dunhill.png","logos/oneelixir.png",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [perfumesRes, bsRes] = await Promise.all([
          axios.get(`${API_URL}/api/perfumes`),
          axios.get(`${API_URL}/api/perfumes/best-sellers?limit=12`),
        ]);
        setPerfumes(perfumesRes.data);
        // If best sellers < 8, supplement with other products
        const bs = bsRes.data;
        if (bs.length < 8) {
          const bsIds = new Set(bs.map(p => p._id));
          const extra = perfumesRes.data.filter(p => !bsIds.has(p._id)).slice(0, 8 - bs.length);
          setBestSellers([...bs, ...extra]);
        } else {
          setBestSellers(bs);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); setBsLoading(false); }
    };
    fetchData();
  }, [API_URL]);

  useEffect(() => {
    axios.get(`${API_URL}/api/perfumes/ratings`)
      .then(res => setRatings(res.data))
      .catch(() => {});
  }, [API_URL]);

  const featuredProducts = perfumes.filter(p => p.featured).slice(0, 8);
  const displayProducts  = featuredProducts.length >= 2 ? featuredProducts : perfumes.slice(0, 8);

  const newArrivals = [...perfumes]
    .sort((a, b) => (a._id > b._id ? -1 : 1))
    .slice(0, 8);

  const flashSaleProducts = perfumes.filter(p =>
    p.flashSale?.active && p.flashSale?.salePrice && new Date(p.flashSale.endsAt) > now
  );

  useEffect(() => {
    if (flashSaleProducts.length === 0) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [flashSaleProducts.length > 0]);

  const getCountdown = (endsAt) => {
    const diff = new Date(endsAt) - now;
    if (diff <= 0) return null;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    return { h, m, s };
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>

      {/* 1. BANNER */}
      <section><BannerManagement /></section>

      {/* 2. BRAND LOGOS */}
      <section style={{ width: '100%', overflow: 'hidden', padding: '20px 0', backgroundColor: '#fff' }}>
        <div className="carousel-track">
          {[...brandLogos, ...brandLogos, ...brandLogos].map((logo, i) => (
            <img key={i} src={logo} alt="brand" style={{ height: '60px', margin: '0 60px', opacity: 0.85, filter: 'grayscale(100%)', objectFit: 'contain' }} />
          ))}
        </div>
      </section>

      {/* 3. NEW ARRIVALS */}
      {!loading && newArrivals.length > 0 && (
        <ProductSection
          title="New Arrivals"
          products={newArrivals}
          loading={loading}
          ratings={ratings}
          addToCart={addToCart}
          navigate={navigate}
          bgColor="#fff"
          viewAllLink="/collection"
        />
      )}

      {/* 4. FLASH DEALS */}
      {flashSaleProducts.length > 0 && (
        <section className="py-10 px-2 md:px-[5%] bg-white">
          <div className="bg-[#111] rounded-3xl p-6 pt-8 relative" style={{ border: '2px solid #dc2626' }}>
            {/* Legend title */}
            <div className="absolute -top-[14px] left-6">
              <span className="bg-[#dc2626] text-white text-[14px] font-bold px-5 py-2 rounded-full shadow-sm">
                ⚡ Flash Deals
              </span>
            </div>

            {/* Cards with side arrows */}
            <div className="relative mt-2">
              <FlashCarousel products={flashSaleProducts} getCountdown={getCountdown} addToCart={addToCart} navigate={navigate} />
            </div>
          </div>
        </section>
      )}

      {/* 5. EXCLUSIVE */}
      <ProductSection
        title="Exclusive"
        products={displayProducts}
        loading={loading}
        ratings={ratings}
        addToCart={addToCart}
        navigate={navigate}
        bgColor="#f8f8f8"
        viewAllLink="/collection"
      />

      {/* 6. BEST SELLERS */}
      {(bsLoading || bestSellers.length > 0) && (
        <ProductSection
          title="Best Sellers"
          products={bestSellers}
          loading={bsLoading}
          ratings={ratings}
          addToCart={addToCart}
          navigate={navigate}
          bgColor="#fff"
          viewAllLink="/collection"
        />
      )}

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
        .product-card-new::-webkit-scrollbar { display: none; }
        div::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .product-card-new { width: 160px !important; }
        }
      `}</style>
    </div>
  );
};

export default Home;