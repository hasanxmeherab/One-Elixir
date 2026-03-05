import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { Menu, Search, ShoppingBag, Heart, User, X } from 'lucide-react';
import axios from 'axios';

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

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const res = await axios.get(`${API_URL}/api/perfumes?search=${searchQuery}`);
          setSuggestions(res.data.slice(0, 6));
        } catch (err) {
          console.error('Search Error:', err);
        }
      } else {
        setSuggestions([]);
      }
    };
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, API_URL]);

  const handleLogout = () => {
    logout();
    setIsSidebarOpen(false);
    navigate('/');
  };

  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <>
      {/* NAVBAR */}
      <nav className="grid grid-cols-3 items-center px-[5%] h-20 bg-white border-b border-gray-200 sticky top-0 z-[1000]">
        
        {/* LEFT: MENU ICON */}
        <div className="flex justify-start">
          <Menu
            size={22}
            className="cursor-pointer text-black"
            onClick={() => setIsSidebarOpen(true)}
          />
        </div>

        {/* MIDDLE: LOGO */}
        <div className="flex justify-center">
          <Link to="/" className="text-2xl font-bold tracking-[6px] no-underline text-black">
            ONEELIXIR
          </Link>
        </div>

        {/* RIGHT: ICONS */}
        <div className="flex justify-end gap-5 items-center">
          <Search
            size={20}
            className="cursor-pointer text-black hidden md:block"
            onClick={() => setIsSearchOpen(true)}
          />
          <Heart
            size={20}
            className="cursor-pointer text-black hidden md:block"
            onClick={() => navigate('/wishlist')}
          />

          {/* Desktop Auth */}
          {!user && (
            <div className="hidden md:flex gap-4 items-center mr-2">
              <Link to="/signin" className="no-underline text-black text-[11px] font-bold tracking-wider">
                SIGN IN
              </Link>
              <Link to="/signup" className="no-underline text-white bg-black text-[11px] font-bold tracking-wider px-4 py-2 rounded-sm">
                REGISTER
              </Link>
            </div>
          )}

          {/* Cart */}
          <div className="relative cursor-pointer" onClick={() => navigate('/cart')}>
            <ShoppingBag size={20} className="text-black" />
            {cartCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 bg-black text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </div>

          <User
            size={20}
            className="cursor-pointer text-black hidden md:block"
            onClick={() => user ? navigate('/account') : navigate('/signin')}
          />
        </div>
      </nav>

      {/* SIDEBAR DRAWER */}
      {isSidebarOpen && (
        <div className="fixed top-0 left-0 w-full h-screen z-[2000] flex">
          {/* Sidebar Content */}
          <div className="w-[300px] bg-white h-full px-10 py-10 flex flex-col z-[2001]">
            <div className="mb-12">
              <X size={28} className="cursor-pointer" onClick={() => setIsSidebarOpen(false)} />
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-1">
              {/* Mobile Search */}
              <li className="md:hidden">
                <div
                  className="flex items-center text-black text-sm font-bold tracking-[2px] py-4 border-b-2 border-gray-100 cursor-pointer"
                  onClick={() => { setIsSearchOpen(true); setIsSidebarOpen(false); }}
                >
                  <Search size={18} className="mr-3" /> SEARCH
                </div>
              </li>

              <li>
                <Link
                  to="/collection"
                  className="block no-underline text-black text-sm font-bold tracking-[2px] py-4 border-b border-gray-50"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  THE COLLECTION
                </Link>
              </li>

              <li>
                <Link
                  to="/bundles"
                  className="block no-underline text-black text-sm font-bold tracking-[2px] py-4 border-b border-gray-50"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  BUNDLES
                </Link>
              </li>

              {/* Mobile Wishlist */}
              <li className="md:hidden">
                <Link
                  to="/wishlist"
                  className="block no-underline text-black text-sm font-bold tracking-[2px] py-4 border-b border-gray-50"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  WISHLIST
                </Link>
              </li>

              {!user ? (
                <>
                  <li className="md:hidden">
                    <Link
                      to="/signin"
                      className="block no-underline text-black text-sm font-bold tracking-[2px] py-4 border-b border-gray-50"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      SIGN IN
                    </Link>
                  </li>
                  <li className="md:hidden">
                    <Link
                      to="/signup"
                      className="block no-underline bg-black text-white text-sm font-bold tracking-[2px] py-4 text-center mt-2"
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
                      className="block no-underline text-black text-sm font-bold tracking-[2px] py-4 border-b border-gray-50"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      MY PROFILE
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left bg-transparent border-none text-black text-sm font-bold tracking-[2px] py-4 border-b border-gray-50 cursor-pointer"
                    >
                      LOGOUT
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>
      )}

      {/* SEARCH OVERLAY */}
      {isSearchOpen && (
        <div className="fixed top-0 left-0 w-full h-screen bg-white z-[5000] flex flex-col">
          <div className="flex justify-end px-[5%] py-8">
            <X
              size={32}
              className="cursor-pointer"
              onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
            />
          </div>
          <div className="flex flex-col items-center px-[10%] pt-8 flex-1">
            <input
              type="text"
              placeholder="START TYPING..."
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-3xl border-none border-b-2 border-black py-5 text-3xl md:text-4xl text-center outline-none tracking-[2px] uppercase"
            />
            <div className="w-full max-w-3xl mt-10">
              {searchQuery.length > 0 && suggestions.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-5 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => { navigate(`/product/${item._id}`); setIsSearchOpen(false); setSearchQuery(''); }}
                >
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover" />
                  <div>
                    <div className="font-bold text-[13px] tracking-wider">{item.name.toUpperCase()}</div>
                    <div className="text-gray-500 text-xs mt-1">{item.price.toLocaleString()} TK</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;