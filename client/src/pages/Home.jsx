import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
// Lazy-load BannerManagement so it doesn't inflate the customer-facing bundle
import BannerManagement from './admin/BannerManagement';
import { optimizeImage } from '../utils/optimizeImage';
import { usePageMeta } from '../hooks/usePageMeta';
import { getCountdown } from '../utils/countdown';

/* --- Horizontal scroll carousel hook --- */
const useCarousel = () => {
  const ref = useRef(null);
  const scroll = (dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };
  return { ref, scrollLeft: () => scroll(-1), scrollRight: () => scroll(1) };
};

/* --- Single product card --- */
const ProductCard = ({ p, ratings, addToCart, navigate }) => {
  const price = p.variants?.length > 0 ? Math.min(...p.variants.map(v => v.price)) : p.price;
  const originalPrice = p.originalPrice || p.compareAtPrice || null;
  const discount = originalPrice && originalPrice > price
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

      {/* Image */}
      <Link to={`/product/${p.slug || p._id}`} className="no-underline block">
        <div className="w-full h-[160px] sm:h-[190px] bg-white flex items-center justify-center overflow-hidden">
          <img
            src={optimizeImage(p.images?.[0] || p.image || p.variants?.[0]?.image, 400)}
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
              {[1, 2, 3, 4, 5].map(i => (
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

/* --- Section wrapper with carousel --- */
const ProductSection = ({ title, products, loading, ratings, addToCart, navigate, bgColor = '#f0f0f0', viewAllLink }) => {
  const { ref, scrollLeft, scrollRight } = useCarousel();

  return (
    <section style={{ backgroundColor: bgColor, padding: '48px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
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

          {/* See all  -  bottom right */}
          {viewAllLink && (
            <div className="flex justify-end mt-5">
              <Link
                to={viewAllLink}
                className="bg-black text-white text-[12px] font-bold tracking-wider px-5 py-2.5 rounded-full no-underline hover:bg-[#333] transition-colors"
              >
                See all products &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* --- Flash Deals carousel --- */
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
                  &#x1F525; -{discount}%
                </div>
                <Link to={`/product/${p.slug || p._id}`} className="block">
                  <div className="w-full h-[150px] sm:h-[200px] bg-[#222] flex items-center justify-center overflow-hidden rounded-t-2xl">
                    <img src={optimizeImage(p.images?.[0] || p.image || p.variants?.[0]?.image, 400)} alt={p.name}
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
                    {[['h', 'HRS'], ['m', 'MIN'], ['s', 'SEC']].map(([k, l]) => (
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

/* ======================================================
   Core Principles of OneElixir
====================================================== */
const PRINCIPLES = [
  {
    title: 'Craftsmanship',
    desc: 'Every scent oil is formulated and poured in small batches, ensuring exceptional concentration, skin-friendly composition, and impressive longevity.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6" /><path d="M12 3v4" />
        <path d="M6.5 19a6 6 0 0 1 0-10" /><path d="M17.5 9a6 6 0 0 1 0 10" />
        <path d="M8 10l-2 9h12l-2-9" />
      </svg>
    ),
  },
  {
    title: 'Accessibility',
    desc: 'Providing high-tier luxury fragrances in convenient 3.5ml, 30ml, and bespoke sizes so opulent scents remain within reach for everyday wear.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8l5-5h10l5 5-10 13L2 8z" />
        <path d="M2 8h20" />
        <path d="M7 3l3 5M17 3l-3 5M12 21V8" />
      </svg>
    ),
  },
  {
    title: 'Personalization',
    desc: 'A diverse array of scent notes curated for lifestyle versatility - allowing you to select and pair fragrances tailored to your personal identity.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.7 2 6 4.7 6 8c0 4 3 7 6 10 3-3 6-6 6-10 0-3.3-2.7-6-6-6z" />
        <path d="M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        <path d="M8.5 18.5C6 17 4 14.5 4 12" />
        <path d="M15.5 18.5C18 17 20 14.5 20 12" />
      </svg>
    ),
  },
];

const CorePrinciples = () => (
  <section id="values" style={{ backgroundColor: '#000000', padding: '72px 24px 64px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p style={{
          color: '#e74c3c', fontSize: '0.68rem', letterSpacing: '0.26em',
          fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase',
        }}>
          Our Foundation
        </p>
        <h2 style={{
          color: '#fff',
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(1.7rem, 4vw, 2.6rem)',
          fontWeight: 700, margin: 0,
        }}>
          Core Principles of OneElixir
        </h2>
      </div>

      {/* Cards */}
      <style>{`
      .cp-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }
      @media (max-width: 900px)  { .cp-grid { grid-template-columns: 1fr; } }
      @media (max-width: 1199px) and (min-width: 601px) { .cp-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (max-width: 600px)  { .cp-grid { grid-template-columns: 1fr; } }
      .cp-card {
        background: #111319;
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px;
        padding: 36px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: border-color 250ms, transform 250ms;
      }
      .cp-card:hover {
        border-color: rgba(212,175,55,0.4);
        transform: translateY(-3px);
      }
      .cp-icon {
        width: 64px; height: 64px;
        border-radius: 50%;
        background: rgba(231,76,60,0.1);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 22px;
        flex-shrink: 0;
      }
      .cp-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.1rem; font-weight: 700;
        color: #fff; margin: 0 0 14px;
      }
      .cp-desc {
        font-family: 'Inter', 'Jost', sans-serif;
        font-size: 15.5px; line-height: 24px;
        color: rgba(255,255,255,0.5);
        margin: 0;
      }
    `}</style>

      <div className="cp-grid">
        {PRINCIPLES.map(({ title, desc, icon }) => (
          <div key={title} className="cp-card">
            <div className="cp-icon">{icon}</div>
            <h3 className="cp-title">{title}</h3>
            <p className="cp-desc">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ======================================================
   Explore The Collection  -  premium dark card grid
====================================================== */
const formatDescription = (rawDesc, name) => {
  if (!rawDesc) return `${name} - a signature perfume oil by OneElixir.`;
  return rawDesc
    .replace(/<[^>]+>/g, '')
    .replace(/â€”|â€“|â€"|—|–/g, ' - ')
    .replace(/&mdash;|&ndash;/g, ' - ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
};

const ExploreCollection = ({ products, loading, navigate }) => {
  const skeletons = Array(8).fill(0);

  return (
    <section id="collections" style={{ backgroundColor: '#0c0d14', padding: '72px 24px 64px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{
            color: '#e74c3c', fontSize: '0.68rem', letterSpacing: '0.26em',
            fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase',
          }}>
            Hand-Poured Oils
          </p>
          <h2 style={{
            color: '#fff',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 700, margin: 0, letterSpacing: '-0.01em',
          }}>
            Explore The Collection
          </h2>
        </div>

        {/* Responsive grid + card styles */}
        <style>{`
        .oe-collection-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 30px;
        }
        @media (max-width: 1199px) {
          .oe-collection-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
        }
        @media (max-width: 767px) {
          .oe-collection-grid { grid-template-columns: 1fr; gap: 16px; }
        }
        .oe-card {
          background: #111219;
          border: 1px solid #2B2D35;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 488px;
          cursor: pointer;
          transition: transform 250ms ease, border-color 250ms ease, box-shadow 250ms ease;
        }
        .oe-card:hover {
          transform: translateY(-4px);
          border-color: #D8B778;
          box-shadow: 0 16px 48px rgba(0,0,0,0.6);
        }
        .oe-card:hover .oe-card-img { transform: scale(1.04); }
        .oe-card:hover .oe-arrow    { transform: translateX(4px); }
        .oe-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 8px 8px 0 0;
          flex-shrink: 0;
        }
        .oe-card-img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 250ms ease;
        }
        .oe-badge {
          position: absolute; top: 10px; left: 10px;
          background: #111111; color: #fff;
          font-size: 10px; font-weight: 600;
          padding: 5px 10px; border-radius: 3px;
          letter-spacing: 0.05em; text-transform: uppercase;
          z-index: 2; white-space: nowrap;
          max-width: 70%; overflow: hidden; text-overflow: ellipsis;
        }
        .oe-card-body {
          padding: 22px 24px 0;
          flex: 1; display: flex; flex-direction: column;
        }
        .oe-card-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 19px; font-weight: 600;
          color: #ffffff; margin: 0 0 10px; line-height: 1.3;
        }
        .oe-card-desc {
          font-family: 'Inter', 'Jost', sans-serif;
          font-size: 15px; line-height: 23px; color: #C5C5D0;
          margin: 0; flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .oe-card-footer {
          padding: 0 24px 22px; margin-top: 18px;
        }
        .oe-divider {
          width: 100%; height: 1px;
          background: rgba(255,255,255,0.08);
          margin-bottom: 16px;
        }
        .oe-view-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none;
          color: #F04A3A; font-size: 12px; font-weight: 700;
          letter-spacing: 1px; cursor: pointer; padding: 0;
          text-transform: uppercase;
          transition: color 250ms ease;
        }
        .oe-view-btn:hover { color: #ff6b5b; }
        .oe-arrow {
          display: inline-block;
          transition: transform 250ms ease;
        }
        .oe-skeleton {
          background: linear-gradient(90deg,#1a1c24 25%,#22252f 50%,#1a1c24 75%);
          background-size: 200% 100%;
          animation: oe-shimmer 1.4s infinite;
          border-radius: 8px; min-height: 488px;
        }
        @keyframes oe-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

        <div className="oe-collection-grid">
          {loading
            ? skeletons.map((_, i) => <div key={i} className="oe-skeleton" />)
            : products.map(p => {
              const img = p.images?.[0] || p.image || p.variants?.[0]?.image;
              const badge = p.scentProfile?.[0] || null;
              const desc = formatDescription(p.description, p.name);

              return (
                <div
                  key={p._id}
                  className="oe-card"
                  onClick={() => navigate(`/product/${p.slug || p._id}`)}
                >
                  {/* Image */}
                  <div className="oe-img-wrap">
                    {img && <img src={img} alt={p.name} loading="lazy" className="oe-card-img" />}
                    {badge && <span className="oe-badge">{badge}</span>}
                  </div>

                  {/* Body */}
                  <div className="oe-card-body">
                    <h3 className="oe-card-name">{p.name}</h3>
                    <p className="oe-card-desc">{desc}</p>
                  </div>

                  {/* Footer */}
                  <div className="oe-card-footer">
                    <div className="oe-divider" />
                    <button
                      className="oe-view-btn"
                      onClick={e => { e.stopPropagation(); navigate(`/product/${p.slug || p._id}`); }}
                    >
                      View Details <span className="oe-arrow">&rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* See Full Collection  -  bottom right */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <Link
              to="/collection"
              style={{
                color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 600,
                letterSpacing: '0.1em', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.18)', paddingBottom: '2px',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
            >
              See Full Collection &rarr;
            </Link>
          </div>
        )}
      </div>{/* /site-container */}
    </section>
  );
};

/* ======================================================
   New Arrivals  -  same dark card grid as ExploreCollection
====================================================== */
const NewArrivalsSection = ({ products, loading, navigate }) => {
  const skeletons = Array(8).fill(0);

  return (
    <section id="new-arrivals" style={{ backgroundColor: '#111219', padding: '64px 24px 56px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{
            color: '#e74c3c', fontSize: '0.68rem', letterSpacing: '0.26em',
            fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase',
          }}>
            Fresh Releases
          </p>
          <h2 style={{
            color: '#fff',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 700, margin: 0, letterSpacing: '-0.01em',
          }}>
            New Arrivals
          </h2>
        </div>

        {/* Reuse .oe-collection-grid and .oe-card styles from ExploreCollection */}
        <div className="oe-collection-grid">
          {loading
            ? skeletons.map((_, i) => <div key={i} className="oe-skeleton" />)
            : products.map(p => {
              const img = p.images?.[0] || p.image || p.variants?.[0]?.image;
              const badge = p.scentProfile?.[0] || null;
              const desc = formatDescription(p.description, p.name);

              return (
                <div
                  key={p._id}
                  className="oe-card"
                  onClick={() => navigate(`/product/${p.slug || p._id}`)}
                >
                  <div className="oe-img-wrap">
                    {img && <img src={img} alt={p.name} loading="lazy" className="oe-card-img" />}
                    {badge && <span className="oe-badge">{badge}</span>}
                  </div>
                  <div className="oe-card-body">
                    <h3 className="oe-card-name">{p.name}</h3>
                    <p className="oe-card-desc">{desc}</p>
                  </div>
                  <div className="oe-card-footer">
                    <div className="oe-divider" />
                    <button
                      className="oe-view-btn"
                      onClick={e => { e.stopPropagation(); navigate(`/product/${p.slug || p._id}`); }}
                    >
                      View Details <span className="oe-arrow">&rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* See Full Collection */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <a
              href="/collection"
              style={{
                color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 600,
                letterSpacing: '0.1em', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.18)', paddingBottom: '2px',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
            >
              See Full Collection &rarr;
            </a>
          </div>
        )}

      </div>
    </section>
  );
};

/*Contact / Connect With Us Section */
const ContactSection = ({ settings }) => {
  const s = settings || {};
  const label = s.contactLabel || 'CONNECT WITH US';
  const heading = s.contactHeading || 'Experience OneElixir';
  const desc = s.contactDesc || 'Have questions about finding your bespoke scent profile or placing a custom fragrance order? Our team is welcoming, helpful, and ready to guide your olfactory journey.';
  // Placeholder display text: strictly controlled from admin panel
  const pagePlaceholder = (s.contactStoreText && s.contactStoreText.trim()) ||
    (typeof window !== 'undefined' ? localStorage.getItem('oneelixir_contact_placeholder') || '' : '');

  // Destination URL: strictly controlled from admin panel
  const rawUrl = (s.contactStoreUrl && s.contactStoreUrl.trim()) ||
    (typeof window !== 'undefined' ? localStorage.getItem('oneelixir_contact_url') || '' : '');
  const pageHref = rawUrl
    ? (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : 'https://' + rawUrl.replace(/^https?:\/\//i, '').trim())
    : '';
  const location = s.contactLocation || 'Crafted & Based in Bangladesh';
  const bullet = s.contactBullet || 'Bespoke 3.5 ml & 30 ml Roller Editions Available';
  const image = s.contactImage || '';
  const inquiryHeading = s.contactInquiryHeading || 'Direct Inquiries';
  const inquiryDesc = s.contactInquiryDesc || 'Connect directly via WhatsApp for personalized scent recommendations.';
  const whatsApp = s.contactWhatsApp || 'https://wa.me/8801636400363';

  return (
    <>
      <style>{`
        .contact-section {
          width: 100%;
          background: #000;
          padding: 48px 24px;
        }
        .contact-card {
          max-width: 1280px;
          margin: 0 auto;
          background: #111219;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
          min-height: 340px;
        }
        .contact-left {
          padding: 48px 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .contact-right {
          padding: 40px 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          background: #0d0f16;
        }
        .contact-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 3px;
          color: #F04A3A;
          text-transform: uppercase;
          font-family: Inter, sans-serif;
          margin: 0 0 14px;
        }
        .contact-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.5rem, 2.5vw, 2rem);
          font-weight: 600;
          color: #fff;
          margin: 0 0 18px;
          line-height: 1.25;
        }
        .contact-desc {
          font-family: Inter, sans-serif;
          font-size: 16px;
          line-height: 1.75;
          color: #8C8C9E;
          margin: 0 0 28px;
        }
        .contact-info-list {
          list-style: none;
          padding: 0; margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .contact-info-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-family: Inter, sans-serif;
          font-size: 13.5px;
          color: #C5C5D0;
          line-height: 1.5;
        }
        .contact-info-list li .icon { flex-shrink: 0; margin-top: 2px; }
        .contact-store-link {
          color: #C5C5D0;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.2s ease;
          cursor: pointer;
        }
        .contact-store-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }
        .contact-right-img {
          width: 160px;
          height: 160px;
          object-fit: cover;
          border-radius: 10px;
          display: block;
        }
        .contact-inquiry-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
          margin: 0;
          text-align: center;
        }
        .contact-inquiry-desc {
          font-family: Inter, sans-serif;
          font-size: 15px;
          color: #8C8C9E;
          text-align: center;
          margin: 0;
          line-height: 1.6;
          max-width: 280px;
        }
        .contact-wa-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #25D366;
          color: #fff;
          font-family: Inter, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 12px 28px;
          border-radius: 6px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .contact-wa-btn:hover { background: #1ebe5d; transform: translateY(-1px); }
        @media (max-width: 767px) {
          .contact-card {
            grid-template-columns: 1fr;
          }
          .contact-left {
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            padding: 36px 24px;
          }
          .contact-right { padding: 32px 24px; }
        }
      `}</style>

      <section id="contact" className="contact-section">
        <div className="contact-card">

          {/* LEFT  -  info */}
          <div className="contact-left">
            <p className="contact-label">{label}</p>
            <h2 className="contact-heading">{heading}</h2>
            <p className="contact-desc">{desc}</p>

            <ul className="contact-info-list">
              <li>
                <span className="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F04A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg></span>
                <span>Official Page:&nbsp;
                  {pageHref ? (
                    <a
                      href={pageHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-store-link"
                    >
                      {pagePlaceholder}
                    </a>
                  ) : (
                    <span className="contact-store-link">{pagePlaceholder}</span>
                  )}
                </span>
              </li>
              <li>
                <span className="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F04A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg></span>
                <span>{location}</span>
              </li>
              <li>
                <span className="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="#F04A3A"><polygon points="12 2 22 12 12 22 2 12" /></svg></span>
                <span>{bullet}</span>
              </li>
            </ul>
          </div>

          {/* RIGHT  -  image + WhatsApp */}
          <div className="contact-right">
            {image && (
              <img src={image} alt="OneElixir product" className="contact-right-img" />
            )}
            <p className="contact-inquiry-heading">{inquiryHeading}</p>
            <p className="contact-inquiry-desc">{inquiryDesc}</p>
            <a href={whatsApp} target="_blank" rel="noopener noreferrer" className="contact-wa-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.553 4.105 1.523 5.827L0 24l6.335-1.502A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-5.017-1.381l-.36-.214-3.732.979.997-3.646-.234-.374A9.818 9.818 0 012.182 12C2.182 6.579 6.579 2.182 12 2.182S21.818 6.579 21.818 12 17.421 21.818 12 21.818z" /></svg>
              Order via WhatsApp
            </a>
          </div>

        </div>
      </section>
    </>
  );
};

/* StorySection  -  Crafted with Purpose & Resinous Depth  */
const StorySection = ({ settings }) => {
  const s = settings || {};
  const label = s.storyLabel || 'SMALL BATCH ARTISANSHIP';
  const heading = s.storyHeading || 'Crafted with Purpose & Resinous Depth';
  const para1 = s.storyPara1 || 'OneElixir is a Bangladesh-based fragrance brand offering bespoke perfumes and scent oils crafted in small batches. The brand provides a diverse array of olfactory profiles  -  ranging from fresh and floral to gourmand and woody  -  in convenient, accessible sizes.';
  const para2 = s.storyPara2 || 'Designed with modern lifestyle trends and practical utility in mind, our concentrated formulas rest seamlessly against the skin, delivering long-lasting personal scent projection wherever your day leads.';
  const imgRight = s.storyImageRight || '';
  const imgLeft = s.storyImageLeft || '';
  const imgBot = s.storyImageBot || '';

  /* Don't render the section if no images have been set yet */
  if (!imgRight && !imgLeft && !imgBot) return null;

  return (
    <>
      <style>{`
        .craftsmanship-section {
          width: 100%;
          background: #000;
          padding: 35px 24px 40px;
          box-sizing: border-box;
        }
        .craftsmanship-container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }
        .craftsmanship-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .craftsmanship-content {
          min-width: 0;
        }
        .craftsmanship-label {
          display: block;
          margin: 0 0 16px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 3px;
          color: #F04A3A;
          text-transform: uppercase;
          font-family: Inter, sans-serif;
        }
        .craftsmanship-heading {
          margin: 0 0 24px;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 48px;
          font-weight: 600;
          line-height: 1.2;
          color: #fff;
          max-width: 600px;
        }
        .craftsmanship-para {
          margin: 0 0 20px;
          font-family: Inter, sans-serif;
          font-size: 18px;
          line-height: 30px;
          color: #B8B8C8;
        }
        .craftsmanship-img-frame {
          overflow: hidden;
          position: relative;
          background: #0d0f16;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: border-color 0.4s ease, box-shadow 0.4s ease;
          cursor: pointer;
        }
        .craftsmanship-img-frame:hover {
          border-color: rgba(240, 74, 58, 0.55);
          box-shadow: 0 14px 35px rgba(0, 0, 0, 0.8), 0 0 25px rgba(240, 74, 58, 0.22);
        }
        .craftsmanship-img-frame img {
          display: block;
          width: 100%;
          object-fit: cover;
          border-radius: 0;
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s ease;
        }
        .craftsmanship-img-frame:hover img {
          transform: scale(1.06);
          filter: brightness(1.08) contrast(1.04);
        }
        .craftsmanship-product {
          width: 100%;
          padding-top: 80px;
          min-width: 0;
        }
        .craftsmanship-product .craftsmanship-img-frame img {
          aspect-ratio: 2.75 / 1;
        }
        .craftsmanship-gallery {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          margin-top: 60px;
        }
        .craftsmanship-gallery .craftsmanship-img-frame img {
          aspect-ratio: 1.65 / 1;
        }
        @media (max-width: 1199px) and (min-width: 768px) {
          .craftsmanship-heading { font-size: 38px; }
          .craftsmanship-top { gap: 18px; }
          .craftsmanship-gallery { gap: 18px; }
        }
        @media (max-width: 767px) {
          .craftsmanship-top {
            grid-template-columns: 1fr;
          }
          .craftsmanship-heading { font-size: 32px; }
          .craftsmanship-product { padding-top: 0; }
          .craftsmanship-gallery {
            grid-template-columns: 1fr;
            margin-top: 24px;
          }
        }
      `}</style>

      <section id="craftsmanship" className="craftsmanship-section">
        <div className="craftsmanship-container">

          {/* ROW 1  -  Text (left) + Product image (right) */}
          <div className="craftsmanship-top">

            <div className="craftsmanship-content">
              <span className="craftsmanship-label">{label}</span>
              <h2 className="craftsmanship-heading">{heading}</h2>
              <p className="craftsmanship-para">{para1}</p>
              <p className="craftsmanship-para" style={{ marginBottom: 0 }}>{para2}</p>
            </div>

            {imgRight && (
              <div className="craftsmanship-product">
                <div className="craftsmanship-img-frame">
                  <img src={imgRight} alt="OneElixir product packaging" />
                </div>
              </div>
            )}
          </div>

          {/* ROW 2  -  Two large ingredient images spanning full width */}
          {(imgLeft || imgBot) && (
            <div className="craftsmanship-gallery">
              {imgLeft && (
                <div className="craftsmanship-img-frame">
                  <img src={imgLeft} alt="Fragrance ingredient" />
                </div>
              )}
              {imgBot && (
                <div className="craftsmanship-img-frame">
                  <img src={imgBot} alt="Fragrance ingredients" />
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </>
  );
};

/* ====================================== */
const Home = () => {
  usePageMeta('OneElixir | Luxury Artisanal Fragrances & Scents', 'Discover luxury bespoke fragrances and artisanal scents crafted for excellence at OneElixir.');

  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [ratings, setRatings] = useState({});
  const [heroSettings, setHeroSettings] = useState(null);
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 150);
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    axios.get(`${API_URL}/api/hero-settings`)
      .then(res => setHeroSettings(res.data))
      .catch(() => { });
  }, [API_URL]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const perfumesRes = await axios.get(`${API_URL}/api/perfumes`);
        setPerfumes(perfumesRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [API_URL]);

  useEffect(() => {
    axios.get(`${API_URL}/api/perfumes/ratings`)
      .then(res => setRatings(res.data))
      .catch(() => { });
  }, [API_URL]);

  const featuredProducts = perfumes.filter(p => p.featured).slice(0, 8);
  const displayProducts = featuredProducts.length >= 2 ? featuredProducts : perfumes.slice(0, 8);

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

  const calcCountdown = (endsAt) => getCountdown(endsAt, now);

  return (
    <div style={{ backgroundColor: '#fff' }}>

      {/* 1. HERO  -  banner section */}
      <section><BannerManagement /></section>

      {/* 2. CORE PRINCIPLES */}
      <CorePrinciples />

      {/* 3. EXPLORE THE COLLECTION  -  featured items, premium dark card grid */}
      <ExploreCollection products={displayProducts} loading={loading} navigate={navigate} />

      {/* 4. STORY SECTION  -  Crafted with Purpose & Resinous Depth */}
      <StorySection settings={heroSettings} />

      {/* 5. NEW ARRIVALS  -  dark card grid, same style as Explore Collection */}
      <NewArrivalsSection products={newArrivals} loading={loading} navigate={navigate} />

      {/* 6. CONNECT WITH US */}
      <ContactSection settings={heroSettings} />

      {/* 7. FLASH DEALS */}
      {flashSaleProducts.length > 0 && (
        <section style={{ backgroundColor: '#fff', padding: '48px 24px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div className="bg-[#111] rounded-3xl p-6 pt-8 relative" style={{ border: '2px solid #dc2626' }}>
              <div className="absolute -top-[14px] left-6">
                <span className="bg-[#dc2626] text-white text-[14px] font-bold px-5 py-2 rounded-full shadow-sm">
                  &#x26A1; Flash Deals
                </span>
              </div>
              <div className="relative mt-2">
                <FlashCarousel products={flashSaleProducts} getCountdown={calcCountdown} addToCart={addToCart} navigate={navigate} />
              </div>
            </div>
          </div>
        </section>
      )}

      <style>{`
        /* -- Global site container -- */
        .site-container {
          width: min(1280px, calc(100% - 48px));
          margin-inline: auto;
          box-sizing: border-box;
        }
        @keyframes infiniteScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
        .carousel-track {
          display: flex;
          width: max-content;
          animation: infiniteScroll 40s linear infinite;
        }
        div::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .product-card-new { width: 160px !important; }
          .site-container { width: calc(100% - 32px); }
        }
      `}</style>
    </div>
  );
};

export default Home;
