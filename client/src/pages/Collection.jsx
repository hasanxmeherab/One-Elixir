import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart, Star, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { ProductGridSkeleton } from '../components/Skeleton';
import { optimizeImage } from '../utils/optimizeImage';
import { useDebounce } from '../hooks/useDebounce';
import { usePageMeta } from '../hooks/usePageMeta';
import { getCountdown } from '../utils/countdown';
import { filterCollection, getCollectionPrice } from '../utils/collectionProducts';
import { SCENT_FAMILIES } from '../utils/fragranceDiscovery';

const PAGE_SIZE = 12;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const focusStyle = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black';

const Collection = () => {
  usePageMeta('The Collection | OneElixir Perfumes', 'Browse our complete catalog of luxury perfumes, signature scents, and handcrafted elixirs.');
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [request, setRequest] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const debouncedSearch = useDebounce(searchTerm, 350);
  const sortBy = ['newest', 'price-asc', 'price-desc', 'rating'].includes(searchParams.get('sort')) ? searchParams.get('sort') : 'default';
  const [priceSelection, setPriceSelection] = useState(null);
  const selectedScents = useMemo(() => searchParams.getAll('scent'), [searchParams]);
  const family = SCENT_FAMILIES.find(item => item.id === searchParams.get('family'));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState({ key: '', page: 1 });
  const filterKey = `${searchParams.toString()}|${JSON.stringify(priceSelection)}`;
  const page = pagination.key === filterKey ? pagination.page : 1;
  const setPage = value => setPagination({ key: filterKey, page: value });
  const [now, setNow] = useState(() => new Date());
  const [ratings, setRatings] = useState({});
  const [ratingsStatus, setRatingsStatus] = useState('loading');
  const { isWishlisted, toggleWishlist } = useWishlist();

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API_URL}/api/perfumes`, { signal: controller.signal })
      .then(res => { setPerfumes(res.data); setLoading(false); })
      .catch(() => {
        if (!controller.signal.aborted) { setError(true); setLoading(false); }
      });
    return () => controller.abort();
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API_URL}/api/perfumes/ratings`, { signal: controller.signal })
      .then(res => { setRatings(res.data); setRatingsStatus('ready'); })
      .catch(() => { if (!controller.signal.aborted) setRatingsStatus('error'); });
    return () => controller.abort();
  }, [request]);

  const maxPrice = useMemo(() => Math.max(100, ...perfumes.map(p => {
    const { basePrice } = getCollectionPrice(p);
    return Math.ceil(Math.max(basePrice, Number(p.flashSale?.salePrice) || 0) / 100) * 100;
  })), [perfumes]);
  const priceRange = useMemo(() => priceSelection || [0, maxPrice], [priceSelection, maxPrice]);
  const allScents = useMemo(() => [...new Set(perfumes.flatMap(p => p.scentProfile || []))].sort(), [perfumes]);
  const filtered = useMemo(() => filterCollection(perfumes, {
    search: debouncedSearch, priceRange, scents: selectedScents, family: family?.id, sortBy, ratings, now,
  }), [perfumes, debouncedSearch, priceRange, selectedScents, family, sortBy, ratings, now]);

  const hasFlashSales = perfumes.some(p => p.flashSale?.active && p.flashSale?.endsAt);
  useEffect(() => {
    if (!hasFlashSales) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [hasFlashSales]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeFilterCount = selectedScents.length + (priceSelection ? 1 : 0) + (family ? 1 : 0);
  const hasFilters = Boolean(searchTerm || activeFilterCount);
  const updateSearch = value => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('search', value); else next.delete('search');
    setSearchParams(next, { replace: true });
    setPage(1);
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ['search', 'scent', 'family'].forEach(key => next.delete(key));
    setSearchParams(next, { replace: true }); setPriceSelection(null); setPage(1);
  };
  const toggleScent = scent => {
    const scents = selectedScents.includes(scent) ? selectedScents.filter(s => s !== scent) : [...selectedScents, scent];
    const next = new URLSearchParams(searchParams);
    next.delete('scent'); scents.forEach(note => next.append('scent', note));
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  return (
    <div className="px-[5%] pt-24 pb-20 max-w-[1300px] mx-auto min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.oneelixir.live/' },
          { '@type': 'ListItem', position: 2, name: 'Collection', item: 'https://www.oneelixir.live/collection' },
        ],
      }) }} />
      <header className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-light tracking-[5px] sm:tracking-[10px] mb-4">{family ? family.name : sortBy === 'newest' ? 'NEW ARRIVALS' : sortBy === 'rating' ? 'BEST RATED' : 'OUR ELIXIRS'}</h1>
        <p className="text-[11px] text-[#666] tracking-[2px] uppercase mb-6">Bespoke fragrances, crafted in small batches.</p>
        <input type="search" aria-label="Search fragrances" placeholder="Search for a scent..."
          className={`px-5 py-3 border border-[#ddd] w-full max-w-[400px] text-center text-[13px] tracking-wider ${focusStyle}`}
          value={searchTerm} onChange={e => updateSearch(e.target.value)} />
      </header>
      <div className="flex flex-wrap gap-4 items-center justify-between border-b border-[#eee] pb-5 mb-5">
        <div className="flex items-center gap-3">
          <button type="button" aria-expanded={filtersOpen} aria-controls="collection-filters" onClick={() => setFiltersOpen(open => !open)}
            className={`md:hidden flex items-center gap-2 border border-[#ddd] px-3 min-h-11 text-xs ${focusStyle}`}>
            <SlidersHorizontal size={14} aria-hidden="true" /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            <ChevronDown size={14} className={filtersOpen ? 'rotate-180' : ''} aria-hidden="true" />
          </button>
          <span role="status" className="text-[11px] text-[#666] tracking-wider">
            {loading ? 'Loading fragrances…' : error ? 'Collection unavailable' : `${filtered.length} PRODUCT${filtered.length !== 1 ? 'S' : ''}`}
          </span>
        </div>
        <label className="flex items-center gap-2 text-[10px] text-[#666] font-bold tracking-wider">
          SORT BY
          <select value={sortBy} onChange={e => { const next = new URLSearchParams(searchParams); next.set('sort', e.target.value); setSearchParams(next, { replace: true }); setPage(1); }}
            className={`px-2 py-3 border border-[#ddd] text-[11px] text-black cursor-pointer bg-white max-w-[180px] ${focusStyle}`}>
            <option value="default">DEFAULT</option>
            <option value="newest">NEWEST</option>
            <option value="price-asc">PRICE: LOW TO HIGH</option>
            <option value="price-desc">PRICE: HIGH TO LOW</option>
            <option value="rating" disabled={ratingsStatus !== 'ready'}>BEST RATED{ratingsStatus === 'loading' ? ' (LOADING)' : ratingsStatus === 'error' ? ' (UNAVAILABLE)' : ''}</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        {family && <span className="text-[11px] text-[#555]">Scent family: {family.name}</span>}
        {selectedScents.map(scent => <button type="button" key={scent} onClick={() => toggleScent(scent)} aria-label={`Remove ${scent} filter`}
          className={`border border-[#ddd] px-3 min-h-10 text-[11px] ${focusStyle}`}>{scent} ×</button>)}
        {priceSelection && <span className="text-[11px] text-[#555]">{priceRange[0].toLocaleString()} – {priceRange[1].toLocaleString()} TK</span>}
        {hasFilters && <button type="button" onClick={clearFilters} className={`text-[11px] underline underline-offset-4 min-h-11 ml-auto ${focusStyle}`}>Clear all filters</button>}
      </div>
      <div id="collection-filters" className={`${filtersOpen ? 'block' : 'hidden'} md:block mb-8 border-b border-[#eee] pb-6`}>
        <fieldset className="w-full max-w-[400px] mb-5" disabled={loading || error}>
          <legend className="text-[10px] text-[#666] font-bold tracking-wider mb-3">PRICE RANGE · {priceRange[0].toLocaleString()} – {priceRange[1].toLocaleString()} TK</legend>
          <div className="grid grid-cols-2 gap-5">
            {['Minimum', 'Maximum'].map((label, index) => (
              <label key={label} className="text-[11px] text-[#666]">
                {label} price
                <input type="range" min={0} max={maxPrice} step={100} value={priceRange[index]}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setPriceSelection(index === 0 ? [Math.min(value, priceRange[1]), priceRange[1]] : [priceRange[0], Math.max(value, priceRange[0])]);
                    setPage(1);
                  }} className={`block w-full h-8 accent-black cursor-pointer ${focusStyle}`} />
              </label>
            ))}
          </div>
        </fieldset>
        {allScents.length > 0 && <fieldset>
          <legend className="text-[10px] text-[#666] font-bold tracking-wider mb-3">SCENT NOTES</legend>
          <div className="flex flex-wrap gap-2">
            {allScents.map(scent => <button type="button" key={scent} onClick={() => toggleScent(scent)} aria-pressed={selectedScents.includes(scent)}
              className={`px-3 min-h-10 text-[10px] font-bold tracking-wider border transition-colors cursor-pointer ${focusStyle} ${selectedScents.includes(scent) ? 'bg-black text-white border-black' : 'bg-white text-[#555] border-[#ddd] hover:border-black'}`}>{scent}</button>)}
          </div>
          {selectedScents.length > 1 && <p className="text-[11px] text-[#666] mt-3">Showing fragrances with all selected notes.</p>}
        </fieldset>}
      </div>
      {loading ? <div aria-busy="true" aria-label="Loading collection"><ProductGridSkeleton count={8} /></div> : error ? (
        <div role="alert" className="text-center py-20">
          <h2 className="text-xl mb-3">We couldn’t load the collection.</h2>
          <p className="text-sm text-[#666] mb-6">Please try again in a moment.</p>
          <button type="button" onClick={() => { setError(false); setLoading(true); setRatingsStatus('loading'); setRequest(n => n + 1); }}
            className={`border border-black px-8 py-3 text-xs hover:bg-black hover:text-white ${focusStyle}`}>Try again</button>
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-xl mb-3">{hasFilters ? 'No fragrances match your filters.' : 'Our collection is coming soon.'}</h2>
          {hasFilters && <><p className="text-sm text-[#666] mb-6">Try another scent or widen your price range.</p><button type="button" onClick={clearFilters} className={`border border-black px-8 py-3 text-xs ${focusStyle}`}>Clear all filters</button></>}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12">
          {paginated.map(p => {
            const { price, salePrice, basePrice } = getCollectionPrice(p, now);
            const countdown = salePrice !== null ? getCountdown(p.flashSale.endsAt, now) : null;
            const image = p.images?.[0] || p.image || p.variants?.[0]?.image;
            const url = `/product/${p.slug || p._id}`;
            const saved = isWishlisted(p._id);
            const rating = ratings[p._id];
            return (
              <article key={p._id} className="group min-w-0 flex flex-col text-center">
                <div className="relative aspect-[3/4] bg-[#fcfcfc] mb-4 overflow-hidden">
                  <Link to={url} aria-label={`View ${p.name}`} className={`block w-full h-full ${focusStyle} focus-visible:-outline-offset-4`}>
                    {image ? <img src={optimizeImage(image, 400)} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105" loading="lazy" /> : <span className="flex h-full items-center justify-center text-xs text-[#666]">{p.name}</span>}
                  </Link>
                  <button type="button" onClick={() => toggleWishlist({ ...p, image })} aria-pressed={saved}
                    aria-label={`${saved ? 'Remove' : 'Save'} ${p.name} ${saved ? 'from' : 'to'} wishlist`}
                    className={`absolute top-2 right-2 w-11 h-11 flex items-center justify-center bg-white/95 rounded-full cursor-pointer ${focusStyle}`}>
                    <Heart size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
                  </button>
                  {(p.stock === 0 || salePrice !== null || (p.stock > 0 && p.stock <= 5)) && <span className={`absolute top-3 left-2 px-2 py-1 text-[8px] sm:text-[9px] font-bold tracking-wider text-white ${p.stock === 0 ? 'bg-black' : salePrice !== null ? 'bg-red-600' : 'bg-[#805b18]'}`}>
                    {p.stock === 0 ? 'SOLD OUT' : salePrice !== null ? 'SALE' : 'LIMITED'}
                  </span>}
                  {countdown && <div className="pointer-events-none absolute bottom-0 inset-x-0 bg-black/75 text-white px-2 py-2 text-[9px] sm:text-[10px] tracking-wider">ENDS IN {countdown.h}:{countdown.m}:{countdown.s}</div>}
                </div>
                <div className="flex flex-col flex-1 px-1 sm:px-2">
                  <h2 className="text-[12px] sm:text-[15px] tracking-[1px] sm:tracking-[3px] mb-2 font-bold break-words"><Link to={url} className={`hover:underline ${focusStyle}`}>{p.name.toUpperCase()}</Link></h2>
                  <div className="min-h-5 mb-2">
                    {rating && <div className="flex flex-wrap items-center justify-center gap-1" aria-label={`${rating.avgRating} out of 5 stars, ${rating.count} reviews`}>
                      <div className="flex gap-0.5" aria-hidden="true">{[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} fill={i <= Math.round(rating.avgRating) ? '#000' : 'none'} />)}</div>
                      <span className="text-[10px] text-[#666]">{rating.avgRating} ({rating.count})</span>
                    </div>}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-3 text-[12px] sm:text-sm">
                    <span className={salePrice !== null ? 'text-red-600 font-bold' : 'text-[#333]'}>{salePrice === null && p.variants?.length > 0 ? 'From ' : ''}{price.toLocaleString()} TK</span>
                    {salePrice !== null && basePrice > price && <span className="text-[#666] line-through text-xs">{basePrice.toLocaleString()} TK</span>}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-[#666] mb-3 italic tracking-wide">{p.scentProfile?.join(' · ')}</p>
                  {p.variants?.length > 0 && <div className="flex flex-wrap justify-center gap-1 mb-4">{p.variants.map((v, i) => <span key={i} className="text-[9px] tracking-wide border border-[#ddd] px-1.5 py-1 text-[#666]">{v.label}</span>)}</div>}
                  <Link to={url} className={`btn-press mt-auto block w-full border border-black py-3 text-[9px] sm:text-[10px] font-bold tracking-[1px] sm:tracking-[2px] bg-white hover:bg-black hover:text-white transition-colors ${focusStyle}`}>
                    {p.stock === 0 ? 'VIEW DETAILS' : 'VIEW ELIXIR'}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!loading && !error && totalPages > 1 && <nav aria-label="Collection pages" className="flex flex-wrap justify-center items-center gap-2 mt-12">
        <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className={`px-3 h-11 border border-[#ddd] text-xs disabled:opacity-30 ${focusStyle}`}>Previous</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1).map((n, index, pages) => <span key={n} className="flex items-center gap-2">
          {index > 0 && n - pages[index - 1] > 1 && <span aria-hidden="true">…</span>}
          <button type="button" aria-label={`Page ${n}`} aria-current={n === currentPage ? 'page' : undefined} onClick={() => setPage(n)} className={`w-11 h-11 text-xs border ${focusStyle} ${n === currentPage ? 'bg-black text-white border-black' : 'bg-white border-[#ddd] hover:border-black'}`}>{n}</button>
        </span>)}
        <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} className={`px-3 h-11 border border-[#ddd] text-xs disabled:opacity-30 ${focusStyle}`}>Next</button>
      </nav>}
    </div>
  );
};

export default Collection;
