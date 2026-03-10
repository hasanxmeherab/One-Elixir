import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { Menu, Search, ShoppingCart, Heart, User, X, Phone, Mail, Truck } from 'lucide-react';
import axios from 'axios';
import { optimizeImage } from '../utils/optimizeImage';

const Navbar = () => {
  const { user, logout } = useUser();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);
  const sidebarRef = useRef(null);
  const searchOverlayRef = useRef(null);
  const inlineSearchRef = useRef(null);

  // Close inline search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inlineSearchRef.current && !inlineSearchRef.current.contains(e.target)) {
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

  // Close sidebar/search on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) { setIsSearchOpen(false); setSearchQuery(''); }
        if (isSidebarOpen) setIsSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isSearchOpen, isSidebarOpen]);

  // Focus trap for sidebar
  useEffect(() => {
    if (!isSidebarOpen || !sidebarRef.current) return;
    const container = sidebarRef.current;
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
  }, [isSidebarOpen]);

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
      if (searchQuery.trim().length > 1) {
        try {
          setSearchLoading(true);
          const res = await axios.get(`${API_URL}/api/perfumes/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, API_URL]);

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
        <div className="hidden md:flex items-center justify-between px-[5%] py-2 bg-white border-b border-[#eee]">

          {/* LEFT — Colored circular social icons */}
          <div className="flex items-center gap-2">
            {/* Facebook */}
            <a href="https://www.facebook.com/people/OneElixir/61586827432727/"
              target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center hover:opacity-80 transition-opacity">
              <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
            </a>

            {/* Instagram */}
            <a href="https://www.instagram.com/oneelixir/"
              target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="w-7 h-7 rounded-full bg-[#833AB4] flex items-center justify-center hover:opacity-80 transition-opacity">
              <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>

            {/* WhatsApp */}
            <a href="https://wa.me/8801636400363"
              target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
              className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center hover:opacity-80 transition-opacity">
              <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>

          {/* RIGHT — Phone, Email, Track Order with dividers */}
          <div className="flex items-center text-[13px] text-[#444]">
            <a href="tel:+8801636400363"
              className="flex items-center gap-2 text-[#444] hover:text-black transition-colors no-underline px-4">
              <Phone size={14} />
              <span className="tracking-wider">+880 1636-400363</span>
            </a>

            <span className="w-px h-4 bg-[#ddd]" />

            <a href="mailto:oneelixir26@gmail.com"
              className="flex items-center gap-2 text-[#444] hover:text-black transition-colors no-underline px-4">
              <Mail size={14} />
              <span className="tracking-wider">oneelixir26@gmail.com</span>
            </a>

            <span className="w-px h-4 bg-[#ddd]" />

            <Link to="/track"
              className="flex items-center gap-2 text-[#444] hover:text-black transition-colors no-underline font-bold px-4">
              <Truck size={15} />
              <span className="tracking-wider">TRACK ORDER</span>
            </Link>
          </div>
        </div>

        {/* ── MAIN NAVBAR ── */}
        <nav className="flex items-center gap-4 px-[5%] h-[70px] bg-black">

          {/* MENU ICON */}
          <button
            aria-label="Open menu"
            className="bg-transparent border-none cursor-pointer text-white p-0 shrink-0"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          {/* LOGO */}
          <Link to="/" className="text-[22px] font-bold tracking-[3px] no-underline text-white shrink-0 mr-2">
            ONEELIXIR
          </Link>

          {/* INLINE SEARCH BAR WITH DROPDOWN */}
          <div ref={inlineSearchRef} className="flex-1 hidden md:flex flex-col relative max-w-[600px]">
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
                  <div className="px-4 py-4 text-[13px] text-[#888] text-center tracking-wider">
                    SEARCHING...
                  </div>
                )}
                {!searchLoading && suggestions.length === 0 && (
                  <div className="px-4 py-4 text-[13px] text-[#888] text-center tracking-wider">
                    NO RESULTS FOUND
                  </div>
                )}
                {!searchLoading && suggestions.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 px-4 py-3 border-b border-[#f5f5f5] cursor-pointer hover:bg-[#f9f9f9] transition-colors"
                    onClick={() => {
                      navigate(`/product/${item.slug || item._id}`);
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                  >
                    <img
                      src={optimizeImage(item.image || item.variants?.[0]?.image, 80)}
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
          <div className="flex items-center gap-5 ml-auto">

            {/* Mobile search button */}
            <button
              aria-label="Search products"
              className="bg-transparent border-none cursor-pointer text-white p-0 md:hidden"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search size={22} />
            </button>

            {/* Cart */}
            <button
              aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className="relative cursor-pointer bg-transparent border-none p-0 text-white"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart size={26} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </button>

            {/* Divider */}
            <span className="hidden md:block w-px h-8 bg-[#333]" />

            {/* Account */}
            <button
              aria-label={user ? 'My account' : 'Register or Login'}
              className="hidden md:flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-white"
              onClick={() => user ? navigate('/account') : navigate('/signin')}
            >
              <User size={28} className="text-red-500" strokeWidth={1.5} />
              <div className="text-left">
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
      </div>

      {/* ── SIDEBAR DRAWER ── */}
      {isSidebarOpen && (
        <div className="fixed top-0 left-0 w-full h-screen z-[2000] flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          {/* Sidebar Content */}
          <div ref={sidebarRef} className="w-[300px] bg-[#111] h-full px-10 py-10 flex flex-col z-[2001]">
            <div className="mb-12">
              <button aria-label="Close menu" className="bg-transparent border-none cursor-pointer p-0 text-white" onClick={() => setIsSidebarOpen(false)}>
                <X size={28} />
              </button>
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-1">
              {/* Mobile Search */}
              <li className="md:hidden">
                <div
                  className="flex items-center text-white text-sm font-bold tracking-sm py-4 border-b-2 border-[#333] cursor-pointer"
                  onClick={() => { setIsSearchOpen(true); setIsSidebarOpen(false); }}
                >
                  <Search size={18} className="mr-3" /> SEARCH
                </div>
              </li>

              <li>
                <Link
                  to="/collection"
                  className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  THE COLLECTION
                </Link>
              </li>

              <li>
                <Link
                  to="/bundles"
                  className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  BUNDLES
                </Link>
              </li>

              {/* Mobile Wishlist */}
              <li className="md:hidden">
                <Link
                  to="/wishlist"
                  className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  WISHLIST
                </Link>
              </li>

              {/* Mobile Track Order */}
              <li className="md:hidden">
                <Link
                  to="/track"
                  className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  TRACK ORDER
                </Link>
              </li>

              {!user ? (
                <>
                  <li className="md:hidden">
                    <Link
                      to="/signin"
                      className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      SIGN IN
                    </Link>
                  </li>
                  <li className="md:hidden">
                    <Link
                      to="/signup"
                      className="block no-underline bg-red-500 text-white text-sm font-bold tracking-sm py-4 text-center mt-2"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      REGISTER
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="md:hidden">
                    <Link
                      to="/account"
                      className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      MY PROFILE
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left bg-transparent border-none text-white text-sm font-bold tracking-sm py-4 border-b border-[#222] cursor-pointer"
                    >
                      LOGOUT
                    </button>
                  </li>
                </>
              )}
            </ul>

            {/* Mobile Social Links in Sidebar */}
            <div className="mt-auto pt-8 flex items-center gap-5 md:hidden">
              <a href="https://www.facebook.com/people/OneElixir/61586827432727/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="text-[#888] hover:text-[#1877F2] transition-colors">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/oneelixir/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="text-[#888] hover:text-[#E1306C] transition-colors">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
              <a href="https://wa.me/8801636400363" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                className="text-[#888] hover:text-[#25D366] transition-colors">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>
      )}

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
                  onClick={() => { navigate(`/product/${item.slug || item._id}`); setIsSearchOpen(false); setSearchQuery(''); }}
                >
                  {item.image && <img src={optimizeImage(item.image, 120)} alt={item.name} className="w-16 h-16 object-cover" />}
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
};

export default Navbar;