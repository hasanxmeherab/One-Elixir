import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { optimizeImage } from '../utils/optimizeImage';

const PAGE_SIZE = 12;

const Collection = () => {
  const [perfumes, setPerfumes]     = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy]         = useState('default');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [maxPrice, setMaxPrice]     = useState(10000);
  const [page, setPage]             = useState(1);
  // ── Scent filter ─────────────────────────────────────────
  const [selectedScents, setSelectedScents] = useState([]);
  const [now, setNow] = useState(new Date());
  const [ratings, setRatings] = useState({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Pre-fill search from URL query param (?search=...)
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes`);
        const data = res.data;
        setPerfumes(data);
        if (data.length > 0) {
          const max = Math.ceil(Math.max(...data.map(p => p.price)) / 100) * 100;
          setMaxPrice(max);
          setPriceRange([0, max]);
        }
      } catch (err) { console.error('Collection unavailable', err); }
    };
    fetchProducts();
  }, []);

  // ── Fetch aggregated ratings ──────────────────────────────
  useEffect(() => {
    axios.get(`${API_URL}/api/perfumes/ratings`)
      .then(res => setRatings(res.data))
      .catch(() => {});
  }, [API_URL]);

  // ── All unique scent notes across all products ────────────
  const allScents = useMemo(() => {
    const set = new Set();
    perfumes.forEach(p => p.scentProfile?.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [perfumes]);

  const toggleScent = (scent) => {
    setSelectedScents(prev =>
      prev.includes(scent) ? prev.filter(s => s !== scent) : [...prev, scent]
    );
  };

  // ── Filter + Sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = perfumes.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      p.price >= priceRange[0] && p.price <= priceRange[1] &&
      (selectedScents.length === 0 || selectedScents.every(s => p.scentProfile?.includes(s)))
    );
    if (sortBy === 'price-asc')  result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') result = [...result].sort((a, b) => b.price - a.price);
    if (sortBy === 'newest')     result = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sortBy === 'rating')     result = [...result].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    return result;
  }, [perfumes, searchTerm, priceRange, sortBy, selectedScents]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [searchTerm, priceRange, sortBy, selectedScents]);

  // ── Live clock for flash sale countdowns (only if sales exist) ─
  const hasFlashSales = perfumes.some(p => p.flashSale?.active && p.flashSale?.endsAt);
  useEffect(() => {
    if (!hasFlashSales) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [hasFlashSales]);

  // ── Pagination ────────────────────────────────────────────
  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Flash sale helpers ────────────────────────────────────
  const getActivePrice = (p) => {
    if (p.flashSale?.active && p.flashSale?.salePrice && new Date(p.flashSale.endsAt) > now)
      return p.flashSale.salePrice;
    return null;
  };

  const getCountdown = (endsAt) => {
    const diff = new Date(endsAt) - now;
    if (diff <= 0) return null;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    return { h, m, s };
  };

  return (
    <div className="px-[5%] pt-24 pb-20 max-w-[1300px] mx-auto min-h-screen">

      {/* ── JSON-LD BreadcrumbList ──────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.oneelixir.live/" },
          { "@type": "ListItem", "position": 2, "name": "Collection", "item": "https://www.oneelixir.live/collection" },
        ],
      }) }} />

      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl font-light tracking-[10px] mb-4">OUR ELIXIRS</h1>
        <p className="text-[11px] text-[#888] tracking-[2px] uppercase mb-8">Bespoke fragrances, crafted in small batches.</p>
        <input type="text" placeholder="Search for a scent..."
          className="px-5 py-3 border border-[#eee] w-full max-w-[400px] text-center outline-none text-[13px] tracking-wider"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap gap-4 items-end justify-between mb-6 pb-6 border-b border-[#eee]">

        {/* Price Range */}
        <div className="flex flex-col gap-2 min-w-[220px] flex-1">
          <div className="flex justify-between text-[10px] text-[#888] font-bold tracking-wider">
            <span>PRICE RANGE</span>
            <span>{priceRange[0].toLocaleString()} — {priceRange[1].toLocaleString()} TK</span>
          </div>
          <div className="relative h-5 flex items-center">
            {/* Track */}
            <div className="absolute left-0 right-0 h-0.5 bg-[#eee]" />
            {/* Filled track */}
            <div className="absolute h-0.5 bg-black"
              style={{
                left:  `${(priceRange[0] / maxPrice) * 100}%`,
                right: `${100 - (priceRange[1] / maxPrice) * 100}%`,
              }} />
            {/* Min thumb */}
            <input type="range" min={0} max={maxPrice} step={100}
              value={priceRange[0]}
              onChange={e => { const v = Number(e.target.value); if (v < priceRange[1]) setPriceRange([v, priceRange[1]]); }}
              className="absolute w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
              style={{ zIndex: priceRange[0] > maxPrice * 0.8 ? 5 : 3 }}
            />
            {/* Max thumb */}
            <input type="range" min={0} max={maxPrice} step={100}
              value={priceRange[1]}
              onChange={e => { const v = Number(e.target.value); if (v > priceRange[0]) setPriceRange([priceRange[0], v]); }}
              className="absolute w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
              style={{ zIndex: 4 }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[#888] font-bold tracking-wider">SORT BY</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 border border-[#eee] text-xs outline-none tracking-wider cursor-pointer bg-white">
              <option value="default">DEFAULT</option>
              <option value="newest">NEWEST</option>
              <option value="price-asc">PRICE: LOW → HIGH</option>
              <option value="price-desc">PRICE: HIGH → LOW</option>
              <option value="rating">BEST RATED</option>
            </select>
          </div>

          {/* Result count */}
          <div className="text-[10px] text-[#aaa] tracking-wider self-end pb-2">
            {filtered.length} PRODUCT{filtered.length !== 1 ? 'S' : ''}
          </div>
        </div>
      </div>

      {/* ── Scent Profile Filter ── */}
      {allScents.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-[#888] font-bold tracking-wider shrink-0">SCENT:</span>
            {allScents.map(scent => (
              <button key={scent} onClick={() => toggleScent(scent)}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-wider border transition-colors cursor-pointer ${
                  selectedScents.includes(scent)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-[#555] border-[#ddd] hover:border-black'
                }`}>
                {scent}
              </button>
            ))}
            {selectedScents.length > 0 && (
              <button onClick={() => setSelectedScents([])}
                className="text-[10px] text-[#aaa] hover:text-black transition-colors cursor-pointer bg-transparent border-none underline">
                CLEAR
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Product Grid ── */}
      {paginated.length === 0 ? (
        <div className="text-center py-24 text-[#bbb] tracking-[3px] text-sm">NO PRODUCTS FOUND.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {paginated.map(p => {
            const salePrice = getActivePrice(p);
            return (
              <div key={p._id} className="cursor-pointer group text-center transition-shadow duration-300 hover:shadow-lg"
                onClick={() => navigate(`/product/${p.slug || p._id}`)}>
                <div className="relative w-full h-[380px] bg-[#fcfcfc] mb-5 overflow-hidden">
                  {(p.images?.[0] || p.image || p.variants?.[0]?.image) && <img src={optimizeImage(p.images?.[0] || p.image || p.variants?.[0]?.image, 400)} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />}
                  {p.stock === 0 && (
                    <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 text-[9px] font-bold tracking-[2px]">SOLD OUT</div>
                  )}
                  {p.stock > 0 && p.stock <= 5 && !salePrice && (
                    <div className="absolute top-4 right-4 bg-[#f39c12] text-white px-3 py-1 text-[9px] font-bold tracking-[2px]">LIMITED</div>
                  )}
                  {salePrice && (
                    <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 text-[9px] font-bold tracking-[2px]">🔥 SALE</div>
                  )}
                  {salePrice && getCountdown(p.flashSale?.endsAt) && (() => {
                    const cd = getCountdown(p.flashSale.endsAt);
                    return (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2.5 flex items-center justify-center gap-1.5">
                        <span className="text-[9px] text-white/70 font-bold tracking-wider">ENDS IN</span>
                        {[cd.h, cd.m, cd.s].map((v, i) => (
                          <span key={i} className="bg-white/20 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-sm min-w-[24px] text-center">{v}</span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="px-2">
                  <h3 className="text-[15px] tracking-[3px] mb-2 font-bold">{p.name.toUpperCase()}</h3>
                  {ratings[p._id] && (
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={12}
                            fill={i <= Math.round(ratings[p._id].avgRating) ? '#000' : 'none'}
                            className="text-black" />
                        ))}
                      </div>
                      <span className="text-[10px] text-[#999] tracking-wider">
                        {ratings[p._id].avgRating} ({ratings[p._id].count})
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {salePrice ? (
                      <>
                        <span className="text-red-600 font-bold text-base">{salePrice.toLocaleString()} TK</span>
                        <span className="text-[#aaa] line-through text-sm">{p.price.toLocaleString()} TK</span>
                      </>
                    ) : p.variants?.length > 0 ? (
                      <span className="text-[14px] text-[#333]">
                        From {Math.min(...p.variants.map(v => v.price)).toLocaleString()} TK
                      </span>
                    ) : (
                      <span className="text-[14px] text-[#333]">{p.price.toLocaleString()} TK</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#999] mb-5 italic tracking-wider">{p.scentProfile?.join(' • ')}</p>
                  {p.variants?.length > 0 && (
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      {p.variants.map((v, vi) => (
                        <span key={vi} className="text-[9px] font-bold tracking-wider border border-[#ddd] px-2 py-0.5 text-[#666]">{v.label}</span>
                      ))}
                    </div>
                  )}
                  <button className="btn-press w-full border border-black py-3 text-[10px] font-bold tracking-[2px] bg-white hover:bg-black hover:text-white transition-colors">
                    {p.stock > 0 ? 'VIEW ELIXIR' : 'OUT OF STOCK'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-16">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 border border-[#ddd] text-xs font-bold tracking-wider disabled:opacity-30 hover:border-black transition-colors cursor-pointer bg-white">
            ← PREV
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)}
              className={`w-9 h-9 text-xs font-bold tracking-wider border transition-colors cursor-pointer ${
                n === page ? 'bg-black text-white border-black' : 'bg-white border-[#ddd] hover:border-black'
              }`}>
              {n}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 border border-[#ddd] text-xs font-bold tracking-wider disabled:opacity-30 hover:border-black transition-colors cursor-pointer bg-white">
            NEXT →
          </button>
        </div>
      )}
    </div>
  );
};

export default Collection;