import React, { useState, useEffect, useRef, memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import axios from 'axios';
import { optimizeImage } from '../utils/optimizeImage';
import { useDebounce } from '../hooks/useDebounce';
import NavTopBar from './navbar/NavTopBar';
import NavSidebar from './navbar/NavSidebar';

const Navbar = memo(() => {
  const { user, logout } = useUser();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300); // ⚡ debounce API calls
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);
  const searchOverlayRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  // Close desktop search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        desktopSearchRef.current && !desktopSearchRef.current.contains(e.target) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(e.target)
      ) {
        setSuggestions([]);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  // Lock body scroll when sidebar or search is open
  useEffect(() => {
    document.body.style.overflow = (isSidebarOpen || isSearchOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarOpen, isSearchOpen]);

  // Close search on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isSearchOpen]);

  // Focus trap for search overlay
  useEffect(() => {
    if (!isSearchOpen || !searchOverlayRef.current) return;
    const container = searchOverlayRef.current;
    const focusable = container.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    const trap = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    container.addEventListener('keydown', trap);
    return () => container.removeEventListener('keydown', trap);
  }, [isSearchOpen]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.trim().length > 1) {
        try {
          setSearchLoading(true);
          const res = await axios.get(`${API_URL}/api/perfumes/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
          setSuggestions(res.data);
        } catch (err) {
          console.error('Search Error:', err);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [debouncedQuery, API_URL]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    setIsSidebarOpen(false);
    navigate('/');
  };

  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <>
      {/* ── STICKY WRAPPER (top bar + main navbar together) ── */}
      <div className="sticky top-0 z-[1000] bg-white">

        {/* ── TOP INFO BAR (desktop only) ── */}
        <NavTopBar />

        {/* ── MAIN NAVBAR ── */}
        <nav className="flex items-center px-[5%] h-[60px] md:h-[70px] bg-black gap-4">

          {/* MENU ICON — always visible */}
          <button
            aria-label="Open menu"
            className="bg-transparent border-none cursor-pointer text-white p-0 shrink-0"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          {/* LOGO — centered on mobile, left-aligned on desktop */}
          <Link to="/" className="shrink-0 md:mr-2 absolute left-1/2 -translate-x-1/2 md:static md:left-auto md:translate-x-0">
            <img src="/logos/OneElixir Name(Sg).png" alt="OneElixir Logo" className="h-10 md:h-12" />
          </Link>

          {/* DESKTOP: INLINE SEARCH BAR WITH DROPDOWN */}
          <div ref={desktopSearchRef} className="flex-1 hidden md:flex flex-col relative max-w-[600px]">
            <div className="flex items-center bg-[#f0f0f0] rounded-md overflow-hidden pr-1.5">
              <input
                type="text"
                placeholder="Search for products"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery('');
                    setSuggestions([]);
                  }
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setSuggestions([]);
                  }
                }}
                className="flex-1 px-5 py-3 bg-transparent border-none outline-none text-[14px] text-black placeholder-[#999]"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                  className="bg-transparent border-none cursor-pointer p-1 text-[#999] hover:text-black transition-colors mr-1"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => {
                  if (searchQuery.trim()) {
                    navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery('');
                    setSuggestions([]);
                  }
                }}
                className="px-3 py-2 bg-[#222] hover:bg-[#000] transition-colors border-none cursor-pointer rounded-md my-1.5"
              >
                <Search size={18} className="text-white" />
              </button>
            </div>

            {/* DROPDOWN SUGGESTIONS */}
            {searchQuery.trim().length > 1 && (
              <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-[#eee] rounded-b-md z-[3000] max-h-[400px] overflow-y-auto">
                {searchLoading && (
                  <div className="px-4 py-4 text-[13px] text-[#888] text-center tracking-wider">SEARCHING...</div>
                )}
                {!searchLoading && suggestions.length === 0 && (
                  <div className="px-4 py-4 text-[13px] text-[#888] text-center tracking-wider">NO RESULTS FOUND</div>
                )}
                {!searchLoading && suggestions.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 px-4 py-3 border-b border-[#f5f5f5] cursor-pointer hover:bg-[#f9f9f9] transition-colors"
                    onClick={e => {
                      e.preventDefault();
                      navigate(`/product/${item.slug || item._id}`);
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                  >
                    <img
                      src={optimizeImage(item.images?.[0] || item.image || item.variants?.[0]?.image, 80)}
                      alt={item.name}
                      className="w-14 h-14 object-contain bg-[#f5f5f5] shrink-0 rounded-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-black truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-[12px] text-[#aaa] line-through">{item.originalPrice.toLocaleString()} TK</span>
                        )}
                        <span className="text-[13px] font-bold text-black">{item.price?.toLocaleString()} TK</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!searchLoading && suggestions.length > 0 && (
                  <div
                    className="px-4 py-3 text-center text-[12px] font-bold tracking-[2px] text-[#555] hover:bg-[#f5f5f5] cursor-pointer transition-colors"
                    onClick={() => {
                      navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                  >
                    VIEW ALL RESULTS →
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT ICONS */}
          <div className="flex items-center gap-4 ml-auto">

            {/* Cart — desktop only */}
            <button
              aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className="relative cursor-pointer bg-transparent border-none p-0 text-white hidden md:block"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart size={26} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </button>

            {/* Divider — desktop only */}
            <span className="hidden md:block w-px h-8 bg-[#333]" />

            {/* Account — desktop: full button with text | mobile: icon only */}
            <button
              aria-label={user ? 'My account' : 'Register or Login'}
              className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-white"
              onClick={() => user ? navigate('/account') : navigate('/signin')}
            >
              <User size={26} className="text-red-500 md:text-red-500" strokeWidth={1.5} />
              <div className="text-left hidden md:block">
                <p className="text-[13px] font-semibold tracking-wider leading-tight text-white">
                  {user ? user.name?.split(' ')[0]?.toUpperCase() || 'ACCOUNT' : 'Account'}
                </p>
                <p className="text-[11px] text-[#aaa] leading-tight">
                  {user ? 'My Profile' : 'Register or Login'}
                </p>
              </div>
            </button>
          </div>
        </nav>

        {/* ── MOBILE SEARCH BAR (below black navbar) ── */}
        <div ref={mobileSearchRef} className="md:hidden bg-white px-3 py-2 relative">
          <div className="flex items-center bg-[#f0f0f0] border border-black rounded-md overflow-hidden pr-1">
            <input
              type="text"
              placeholder="Search for products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                  setSuggestions([]);
                }
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  setSuggestions([]);
                }
              }}
              className="flex-1 px-4 py-2.5 bg-transparent border-none outline-none text-[14px] text-black placeholder-[#999]"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                className="bg-transparent border-none cursor-pointer p-1 text-[#999] hover:text-black transition-colors"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <button
              onClick={() => {
                if (searchQuery.trim()) {
                  navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                  setSuggestions([]);
                }
              }}
              className="px-3 py-2 bg-black hover:bg-[#333] transition-colors border-none cursor-pointer rounded-full my-1"
            >
              <Search size={16} className="text-white" />
            </button>
          </div>

          {/* MOBILE DROPDOWN SUGGESTIONS */}
          {searchQuery.trim().length > 1 && (
            <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-[#eee] z-[3000] max-h-[400px] overflow-y-auto">
              {searchLoading && (
                <div className="px-4 py-4 text-[13px] text-[#888] text-center tracking-wider">SEARCHING...</div>
              )}
              {!searchLoading && suggestions.length === 0 && (
                <div className="px-4 py-4 text-[13px] text-[#888] text-center tracking-wider">NO RESULTS FOUND</div>
              )}
              {!searchLoading && suggestions.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-4 px-4 py-3 border-b border-[#f5f5f5] cursor-pointer hover:bg-[#f9f9f9] transition-colors"
                  onMouseDown={e => {
                    e.preventDefault();
                    navigate(`/product/${item.slug || item._id}`);
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                >
                  <img
                    src={optimizeImage(item.images?.[0] || item.image || item.variants?.[0]?.image, 80)}
                    alt={item.name}
                    className="w-12 h-12 object-contain bg-[#f5f5f5] shrink-0 rounded-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-black truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-[12px] text-[#aaa] line-through">{item.originalPrice.toLocaleString()} TK</span>
                      )}
                      <span className="text-[13px] font-bold text-black">{item.price?.toLocaleString()} TK</span>
                    </div>
                  </div>
                </div>
              ))}
              {!searchLoading && suggestions.length > 0 && (
                <div
                  className="px-4 py-3 text-center text-[12px] font-bold tracking-[2px] text-[#555] hover:bg-[#f5f5f5] cursor-pointer transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                >
                  VIEW ALL RESULTS →
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── SIDEBAR DRAWER ── */}
      <NavSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      {/* ── SEARCH OVERLAY ── */}
      {isSearchOpen && (
        <div ref={searchOverlayRef} className="fixed top-0 left-0 w-full h-screen bg-white z-[5000] flex flex-col" role="dialog" aria-modal="true" aria-label="Search products">
          <div className="flex justify-end px-[5%] py-8">
            <button
              aria-label="Close search"
              className="bg-transparent border-none cursor-pointer p-0"
              onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
            >
              <X size={32} />
            </button>
          </div>
          <div className="flex flex-col items-center px-[10%] pt-8 flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="START TYPING..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full max-w-3xl border-none border-b-2 border-black py-5 text-3xl md:text-4xl text-center outline-none tracking-sm uppercase"
            />
            <div className="w-full max-w-3xl mt-10">
              {searchLoading && (
                <div className="text-center py-8 text-muted-light text-caption tracking-sm">SEARCHING...</div>
              )}
              {!searchLoading && searchQuery.trim().length > 1 && suggestions.length === 0 && (
                <div className="text-center py-8 text-muted-lighter text-caption tracking-sm">NO RESULTS FOUND</div>
              )}
              {!searchLoading && suggestions.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-5 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={e => { e.preventDefault(); navigate(`/product/${item.slug || item._id}`); setIsSearchOpen(false); setSearchQuery(''); }}
                >
                  <img src={optimizeImage(item.images?.[0] || item.image || item.variants?.[0]?.image, 120)} alt={item.name} className="w-16 h-16 object-cover" />
                  <div>
                    <div className="font-bold text-sm tracking-wider">{item.name.toUpperCase()}</div>
                    <div className="text-gray-500 text-xs mt-1">{item.price?.toLocaleString()} TK</div>
                  </div>
                </div>
              ))}
              {!searchLoading && suggestions.length > 0 && searchQuery.trim() && (
                <div
                  className="text-center py-6 cursor-pointer group"
                  onClick={() => { navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`); setIsSearchOpen(false); setSearchQuery(''); }}
                >
                  <span className="text-caption font-bold tracking-sm text-muted group-hover:text-black transition-colors border-b border-muted-lightest group-hover:border-black pb-1">
                    VIEW ALL RESULTS →
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default Navbar;