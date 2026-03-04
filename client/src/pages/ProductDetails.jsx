import React, { useState, useEffect } from 'react';
import { ProductDetailsSkeleton } from '../components/Skeleton';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Heart, Star } from 'lucide-react';

// ── Flash Sale Countdown Hook ─────────────────────────────────
const useCountdown = (endsAt) => {
  const calc = () => {
    const diff = new Date(endsAt) - new Date();
    if (diff <= 0) return null;
    return {
      h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
      m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
      s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return time;
};

const FlashSaleBanner = ({ salePrice, originalPrice, endsAt }) => {
  const time = useCountdown(endsAt);
  if (!time) return null;
  const savings = originalPrice - salePrice;
  return (
    <div className="bg-red-600 text-white px-5 py-4 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[9px] tracking-[2px] opacity-80 mb-1">🔥 FLASH SALE — LIMITED TIME</p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-bold">{salePrice.toLocaleString()} TK</span>
            <span className="text-sm line-through opacity-60">{originalPrice.toLocaleString()} TK</span>
            <span className="text-[10px] font-bold bg-white text-red-600 px-2 py-0.5">
              SAVE {savings.toLocaleString()} TK
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {[['h','HRS'],['m','MIN'],['s','SEC']].map(([key, label]) => (
            <div key={key} className="flex flex-col items-center bg-white/20 px-3 py-2 min-w-[48px]">
              <span className="text-xl font-bold leading-none">{time[key]}</span>
              <span className="text-[8px] tracking-wider opacity-70 mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Recently Viewed helpers (localStorage) ───────────────────
const RECENTLY_VIEWED_KEY = 'oe_recently_viewed';
const MAX_RECENT = 4;

const getRecentlyViewed = () => {
  try { return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]'); }
  catch { return []; }
};

const addToRecentlyViewed = (product) => {
  try {
    const existing = getRecentlyViewed().filter(p => p._id !== product._id);
    const updated = [
      { _id: product._id, name: product.name, price: product.price,
        image: product.image, slug: product.slug, stock: product.stock,
        scentProfile: product.scentProfile },
      ...existing
    ].slice(0, MAX_RECENT + 1); // +1 so we can exclude current product when rendering
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch {}
};

const ProductDetails = ({ openCart }) => { 
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  // --- IMAGE GALLERY ---
  const [selectedImage, setSelectedImage] = useState(null);

  // --- RELATED PRODUCTS ---
  const [related, setRelated] = useState([]);

  // --- RECENTLY VIEWED ---
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const fetchRelated = async (currentProduct) => {
    try {
      const res = await axios.get(`${API_URL}/api/perfumes`);
      const all = res.data.filter(p => p._id !== currentProduct._id);
      // Score by matching scent notes
      const scored = all.map(p => {
        const matches = p.scentProfile.filter(note =>
          currentProduct.scentProfile.includes(note)
        ).length;
        return { ...p, score: matches };
      });
      const sorted = scored.sort((a, b) => b.score - a.score).slice(0, 4);
      setRelated(sorted);
    } catch (err) {
      console.error('Could not fetch related products');
    }
  };

  // --- REVIEWS ---
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ userName: '', rating: 0, comment: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewImages, setReviewImages] = useState([]);
  const [uploadingReview, setUploadingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const fetchReviews = async (productId) => {
    try {
      setReviewsLoading(true);
      const res = await axios.get(`${API_URL}/api/reviews/${productId}`);
      setReviews(res.data);
    } catch (err) {
      console.error('Could not fetch reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0
  }));

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    if (!reviewForm.rating) { setReviewError('Please select a star rating.'); return; }
    if (!reviewForm.comment.trim()) { setReviewError('Please write a review.'); return; }
    if (!reviewForm.userName.trim()) { setReviewError('Please enter your name.'); return; }
    try {
      setSubmitLoading(true);
      setUploadingReview(reviewImages.length > 0);
      // Upload photos to Cloudinary
      const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dluvmed0b';
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'one_elixir_uploads';
      const imageUrls = await Promise.all(
        reviewImages.map(async (file) => {
          const data = new FormData();
          data.append('file', file);
          data.append('upload_preset', UPLOAD_PRESET);
          data.append('cloud_name', CLOUD_NAME);
          const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
          return res.data.secure_url;
        })
      );
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      await axios.post(`${API_URL}/api/reviews`, {
        perfumeId: product._id,
        userId: userData._id || null,
        userName: reviewForm.userName,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        images: imageUrls,
      });
      setReviewForm({ userName: '', rating: 0, comment: '' });
      setReviewImages([]);
      setReviewSuccess(true);
      fetchReviews(product._id);
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitLoading(false);
      setUploadingReview(false);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes/slug/${slug}`);
        setProduct(res.data);
        setSelectedImage(res.data.images?.[0] || res.data.image);
        fetchRelated(res.data);
        fetchReviews(res.data._id);
        // ── Save to recently viewed ──────────────────────────
        addToRecentlyViewed(res.data);
        setRecentlyViewed(getRecentlyViewed().filter(p => p._id !== res.data._id).slice(0, MAX_RECENT));
      } catch (err) {
        console.error("Product not found");
      }
    };
    fetchProduct();
  }, [slug]);

  if (!product) return <ProductDetailsSkeleton />;

  // ── Flash sale active? ──────────────────────────────────────
  const flashActive = product.flashSale?.active && product.flashSale?.salePrice && new Date(product.flashSale.endsAt) > new Date();
  const displayPrice = flashActive ? product.flashSale.salePrice : product.price;

  const handleAddToCart = () => {
    addToCart({ ...product, price: displayPrice }, quantity);
    if (openCart) openCart(); 
  };

  return (
    <>
      {/* ── Meta Tags ─────────────────────────────────────────── */}
      {typeof document !== 'undefined' && (() => {
        document.title = `${product.name} — OneElixir`;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; document.head.appendChild(metaDesc); }
        metaDesc.content = product.description
          ? `${product.description.slice(0, 150)}...`
          : `${product.name} — ${product.scentProfile?.join(', ')}. Shop premium fragrances at OneElixir.`;
        let metaOGTitle = document.querySelector('meta[property="og:title"]');
        if (!metaOGTitle) { metaOGTitle = document.createElement('meta'); metaOGTitle.setAttribute('property', 'og:title'); document.head.appendChild(metaOGTitle); }
        metaOGTitle.content = `${product.name} — OneElixir`;
        let metaOGDesc = document.querySelector('meta[property="og:description"]');
        if (!metaOGDesc) { metaOGDesc = document.createElement('meta'); metaOGDesc.setAttribute('property', 'og:description'); document.head.appendChild(metaOGDesc); }
        metaOGDesc.content = metaDesc.content;
        let metaOGImg = document.querySelector('meta[property="og:image"]');
        if (!metaOGImg) { metaOGImg = document.createElement('meta'); metaOGImg.setAttribute('property', 'og:image'); document.head.appendChild(metaOGImg); }
        metaOGImg.content = product.image || '';
        return null;
      })()}

      <div className="flex min-h-screen px-[8%] pt-28 pb-20 gap-20 flex-wrap">      
        {/* Left: Product Image Gallery */}
        <div className="flex-1 min-w-[300px] md:min-w-[400px] bg-[#fcfcfc]">
          {/* Main image */}
          <div className="w-full overflow-hidden bg-[#f8f8f8] mb-3">
            <img
              src={selectedImage || product.image}
              alt={product.name}
              className="w-full h-[480px] object-cover transition-opacity duration-300"
            />
          </div>
          {/* Thumbnails — only when multiple images */}
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 shrink-0 overflow-hidden border-2 transition-colors cursor-pointer bg-transparent p-0 ${
                    selectedImage === img ? 'border-black' : 'border-transparent hover:border-[#ccc]'
                  }`}
                >
                  <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="flex-1 min-w-[300px] md:min-w-[400px] flex flex-col justify-center">
          <button
            onClick={() => navigate('/shop')}
            className="bg-transparent border-none text-[10px] tracking-[2px] cursor-pointer mb-8 text-left p-0 hover:opacity-50 transition-opacity"
          >
            ← BACK TO COLLECTION
          </button>

          <h1 className="text-4xl md:text-5xl font-light tracking-[12px] mb-2">
            {product.name.toUpperCase()}
          </h1>

          {/* ── Price: flash sale banner OR normal price ── */}
          {flashActive ? (
            <FlashSaleBanner
              salePrice={product.flashSale.salePrice}
              originalPrice={product.price}
              endsAt={product.flashSale.endsAt}
            />
          ) : (
            <p className="text-xl text-[#555] mb-8">{product.price.toLocaleString()} TK</p>
          )}

          <div className="h-px bg-[#eee] w-16 mb-8"></div>

          <p className="text-[15px] leading-relaxed text-[#444] mb-10">{product.description}</p>

          {/* Scent Architecture */}
          <div className="mb-12">
            <p className="text-[10px] tracking-[3px] font-bold mb-4 text-[#888]">SCENT ARCHITECTURE</p>
            <div className="flex gap-2.5 flex-wrap mb-12">
              {product.scentProfile.map((note, index) => (
                <span
                  key={index}
                  className="px-4 py-2 border border-[#ddd] text-xs tracking-wider hover:border-black transition-colors"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          {/* Purchase Actions */}
          <div className="flex gap-5 mb-5 flex-wrap">
            {product.stock > 0 ? (
              <>
                {/* Quantity Selector */}
                <div className="flex items-center border border-black">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2.5 bg-transparent border-none cursor-pointer text-lg hover:bg-gray-50 transition-colors"
                  >-</button>
                  <span className="px-5 font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-4 py-2.5 bg-transparent border-none cursor-pointer text-lg hover:bg-gray-50 transition-colors"
                  >+</button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-black text-white border-none font-bold tracking-[2px] cursor-pointer text-xs hover:bg-gray-800 transition-colors px-6 py-3"
                >
                  ADD TO COLLECTION
                </button>

                {/* Wishlist Button */}
                <button
                  onClick={() => toggleWishlist(product)}
                  className={`flex items-center gap-2 px-5 py-3 border font-bold text-xs tracking-wider transition-colors ${
                    isWishlisted(product._id)
                      ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100'
                      : 'border-black text-black hover:bg-gray-50'
                  }`}
                >
                  <Heart size={14} className={isWishlisted(product._id) ? 'fill-red-500' : ''} />
                  {isWishlisted(product._id) ? 'WISHLISTED' : 'WISHLIST'}
                </button>
              </>
            ) : (
              <div className="flex gap-3 flex-wrap w-full">
                <button
                  disabled
                  className="flex-1 bg-[#eee] text-[#888] border-none cursor-not-allowed tracking-[2px] py-3 text-xs"
                >
                  CURRENTLY UNAVAILABLE
                </button>
                <button
                  onClick={() => toggleWishlist(product)}
                  className={`flex items-center gap-2 px-5 py-3 border font-bold text-xs tracking-wider transition-colors ${
                    isWishlisted(product._id)
                      ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100'
                      : 'border-black text-black hover:bg-gray-50'
                  }`}
                >
                  <Heart size={14} className={isWishlisted(product._id) ? 'fill-red-500' : ''} />
                  {isWishlisted(product._id) ? 'WISHLISTED' : 'NOTIFY ME'}
                </button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#aaa] italic">
            {product.stock > 0 ? `Inventory: ${product.stock} units available` : 'Restocking soon.'}
          </p>
        </div>

        {/* ========== RECENTLY VIEWED ========== */}
        {recentlyViewed.length > 0 && (
          <div className="w-full px-[8%] pb-12">
            <div className="h-px bg-[#eee] mb-12"></div>
            <p className="text-[10px] tracking-[3px] font-bold text-[#888] mb-8">RECENTLY VIEWED</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {recentlyViewed.map(p => (
                <div key={p._id}
                  onClick={() => { navigate(`/product/${p.slug || p._id}`); window.scrollTo(0, 0); }}
                  className="cursor-pointer group">
                  <div className="relative w-full h-[220px] bg-[#fcfcfc] overflow-hidden mb-4">
                    <img src={p.image} alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {p.stock === 0 && (
                      <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 text-[9px] font-bold tracking-wider">SOLD OUT</div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold tracking-wider mb-1 group-hover:underline">{p.name.toUpperCase()}</h4>
                  <p className="text-xs text-[#555] mb-1">{p.price.toLocaleString()} TK</p>
                  <p className="text-[10px] text-[#aaa] italic">{p.scentProfile?.slice(0, 2).join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== RELATED PRODUCTS ========== */}
        {related.length > 0 && (
          <div className="w-full px-[8%] pb-12">
            <div className="h-px bg-[#eee] mb-12"></div>
            <p className="text-[10px] tracking-[3px] font-bold text-[#888] mb-8">YOU MAY ALSO LIKE</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map(p => (
                <div
                  key={p._id}
                  onClick={() => { navigate(`/product/${p.slug || p._id}`); window.scrollTo(0,0); }}
                  className="cursor-pointer group"
                >
                  <div className="relative w-full h-[220px] bg-[#fcfcfc] overflow-hidden mb-4">
                    <img
                      src={p.image} alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {p.stock === 0 && (
                      <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 text-[9px] font-bold tracking-wider">
                        SOLD OUT
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold tracking-wider mb-1 group-hover:underline">
                    {p.name.toUpperCase()}
                  </h4>
                  <p className="text-xs text-[#555] mb-1">{p.price.toLocaleString()} TK</p>
                  <p className="text-[10px] text-[#aaa] italic">
                    {p.scentProfile.slice(0, 2).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== REVIEWS SECTION ========== */}
        <div className="w-full px-[8%] pb-20">
          <div className="h-px bg-[#eee] mb-16"></div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16">

            {/* LEFT: Rating Summary */}
            <div>
              <p className="text-[10px] tracking-[3px] font-bold text-[#888] mb-8">CUSTOMER REVIEWS</p>

              {reviews.length > 0 ? (
                <>
                  {/* Average */}
                  <div className="flex items-end gap-4 mb-6">
                    <span className="text-6xl font-light">{avgRating}</span>
                    <div className="pb-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={16}
                            className={s <= Math.round(avgRating) ? 'fill-black text-black' : 'text-[#ddd]'}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[#888]">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
                    </div>
                  </div>

                  {/* Bar breakdown */}
                  <div className="flex flex-col gap-2 mb-10">
                    {ratingCounts.map(({ star, count, pct }) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs w-4 text-right text-[#888]">{star}</span>
                        <Star size={11} className="fill-black text-black shrink-0" />
                        <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded">
                          <div className="h-full bg-black rounded transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-[#888] w-6">{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mb-10">
                  <p className="text-3xl font-light text-[#ccc] mb-2">—</p>
                  <p className="text-xs text-[#aaa] tracking-wider">No reviews yet. Be the first.</p>
                </div>
              )}

              {/* Review list */}
              <div className="flex flex-col gap-8">
                {reviewsLoading ? (
                  <p className="text-xs text-[#aaa] tracking-wider">LOADING REVIEWS...</p>
                ) : reviews.map(review => (
                  <div key={review._id} className="border-b border-[#f0f0f0] pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold tracking-wider">{review.userName.toUpperCase()}</span>
                      <span className="text-[10px] text-[#aaa]">
                        {new Date(review.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex gap-0.5 mb-3">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={12}
                          className={s <= review.rating ? 'fill-black text-black' : 'text-[#ddd]'}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-[#444] leading-relaxed">{review.comment}</p>
                    {review.images?.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {review.images.map((img, i) => (
                          <a key={i} href={img} target="_blank" rel="noreferrer">
                            <img src={img} alt={`review photo ${i+1}`}
                              className="w-16 h-16 object-cover border border-[#eee] cursor-zoom-in hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Submit Review Form */}
            <div>
              <p className="text-[10px] tracking-[3px] font-bold text-[#888] mb-8">WRITE A REVIEW</p>
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-5">

                <input
                  type="text" placeholder="Your Name" required
                  value={reviewForm.userName}
                  onChange={e => setReviewForm({ ...reviewForm, userName: e.target.value })}
                  className="p-3 border border-[#ddd] outline-none text-sm"
                />

                {/* Star Rating Picker */}
                <div>
                  <p className="text-[10px] tracking-wider text-[#888] mb-3">YOUR RATING</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="bg-transparent border-none cursor-pointer p-0"
                      >
                        <Star
                          size={28}
                          className={`transition-colors ${
                            s <= (hoverRating || reviewForm.rating)
                              ? 'fill-black text-black'
                              : 'text-[#ddd]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {reviewForm.rating > 0 && (
                    <p className="text-[10px] text-[#888] mt-1">
                      {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewForm.rating]}
                    </p>
                  )}
                </div>

                <textarea
                  placeholder="Share your experience with this fragrance..."
                  required rows={5}
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="p-3 border border-[#ddd] outline-none text-sm resize-none leading-relaxed"
                />

                {/* Photo upload */}
                <div>
                  <p className="text-[10px] tracking-wider text-[#888] mb-2">ADD PHOTOS <span className="font-normal text-[#bbb]">(optional, up to 3)</span></p>
                  <label className={`flex items-center gap-3 p-3 border-2 border-dashed cursor-pointer transition-colors ${reviewImages.length > 0 ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black'}`}>
                    <span className="text-lg">📷</span>
                    <span className="text-[11px] font-bold tracking-wider">
                      {reviewImages.length > 0 ? `${reviewImages.length} PHOTO${reviewImages.length > 1 ? 'S' : ''} SELECTED` : 'CLICK TO ADD PHOTOS'}
                    </span>
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={e => setReviewImages(Array.from(e.target.files).slice(0, 3))} />
                  </label>
                  {reviewImages.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {reviewImages.map((f, i) => (
                        <div key={i} className="relative w-16 h-16 border border-[#ddd] overflow-hidden">
                          <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setReviewImages(reviewImages.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer border-none p-0 text-[10px]">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {reviewError && (
                  <p className="text-xs text-red-500 tracking-wider">{reviewError}</p>
                )}
                {reviewSuccess && (
                  <p className="text-xs text-green-600 tracking-wider">✓ YOUR REVIEW HAS BEEN SUBMITTED</p>
                )}

                <button
                  type="submit" disabled={submitLoading}
                  className="py-4 bg-black text-white text-xs font-bold tracking-[3px] hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer border-none"
                >
                  {uploadingReview ? 'UPLOADING PHOTOS...' : submitLoading ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;