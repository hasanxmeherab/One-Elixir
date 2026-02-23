import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';

const Shop = () => {
  const [perfumes, setPerfumes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes`);
        setPerfumes(res.data);
      } catch (err) {
        console.error("Collection unavailable", err);
      }
    };
    fetchProducts();
  }, []);

  const filteredPerfumes = perfumes.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="px-[5%] pt-24 pb-20 max-w-[1300px] mx-auto min-h-screen">
      {/* Header Section */}
      <div className="text-center mb-20">
        <h1 className="text-4xl md:text-5xl font-light tracking-[10px] mb-4">OUR ELIXIRS</h1>
        <p className="text-[11px] text-[#888] tracking-[2px] uppercase mb-8">
          Bespoke fragrances, crafted in small batches.
        </p>
        <input
          type="text"
          placeholder="Search for a scent..."
          className="px-5 py-3 border border-[#eee] w-full max-w-[400px] text-center outline-none text-[13px] tracking-wider"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 md:gap-6">
        {filteredPerfumes.map(p => (
          <div
            key={p._id}
            className="cursor-pointer transition-transform duration-400 ease-in-out text-center hover:-translate-y-2"
            onClick={() => navigate(`/product/${p._id}`)}
          >
            {/* Image Box */}
            <div className="relative w-full h-[380px] sm:h-[280px] md:h-[380px] bg-[#fcfcfc] mb-5 overflow-hidden">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              {p.stock === 0 && (
                <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 text-[9px] font-bold tracking-[2px]">
                  SOLD OUT
                </div>
              )}
              {p.stock > 0 && p.stock <= 5 && (
                <div className="absolute top-4 left-4 bg-[#f39c12] text-white px-3 py-1 text-[9px] font-bold tracking-[2px]">
                  LIMITED
                </div>
              )}
              {/* Wishlist Heart */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
                className="absolute top-3 right-3 p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
                title={isWishlisted(p._id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  size={16}
                  className={isWishlisted(p._id) ? 'text-red-500 fill-red-500' : 'text-[#888]'}
                />
              </button>
            </div>

            {/* Details */}
            <div className="px-2.5">
              <h3 className="text-[15px] tracking-[3px] mb-2 font-bold">{p.name.toUpperCase()}</h3>
              <p className="text-sm mb-3 text-[#333]">{p.price.toLocaleString()} TK</p>
              <p className="text-[10px] text-[#999] mb-5 italic tracking-wider">
                {p.scentProfile.join(' • ')}
              </p>
              <button className="bg-transparent border border-black px-8 py-3 text-[10px] font-bold tracking-[2px] cursor-pointer w-full hover:bg-black hover:text-white transition-colors duration-300">
                {p.stock > 0 ? 'VIEW ELIXIR' : 'OUT OF STOCK'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;