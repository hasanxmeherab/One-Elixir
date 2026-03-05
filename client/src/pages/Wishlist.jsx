import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';

const Wishlist = ({ openCart }) => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    if (openCart) openCart();
  };

  return (
    <div className="px-[5%] pt-24 pb-20 min-h-[70vh] max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="text-center mb-16">
        <h2 className="tracking-[10px] text-2xl font-bold">WISHLIST</h2>
        <div className="w-10 h-0.5 bg-black mx-auto mt-5"></div>
        {wishlist.length > 0 && (
          <p className="text-xs text-[#888] tracking-[2px] mt-4">
            {wishlist.length} SAVED {wishlist.length === 1 ? 'ITEM' : 'ITEMS'}
          </p>
        )}
      </div>

      {/* Empty State */}
      {wishlist.length === 0 ? (
        <div className="text-center mt-20">
          <Heart size={48} className="mx-auto mb-6 text-[#ddd]" />
          <p className="tracking-[2px] text-[#888] text-xs mb-2">YOUR WISHLIST IS CURRENTLY EMPTY</p>
          <p className="text-xs text-[#aaa] mb-10">Save items you love and come back to them anytime.</p>
          <Link
            to="/collection"
            className="inline-block px-12 py-5 bg-black text-white no-underline text-[11px] font-bold tracking-[3px] hover:bg-gray-800 transition-colors"
          >
            EXPLORE COLLECTION
          </Link>
        </div>
      ) : (
        <>
          {/* Wishlist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {wishlist.map(product => (
              <div key={product._id} className="group relative border border-[#eee] bg-white">

                {/* Image */}
                <div
                  className="relative w-full h-[280px] bg-[#fcfcfc] overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/product/${product._id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {product.stock === 0 && (
                    <div className="absolute top-3 left-3 bg-black text-white px-2 py-1 text-[9px] font-bold tracking-[2px]">
                      SOLD OUT
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3
                    className="text-sm font-bold tracking-wider mb-1 cursor-pointer hover:underline"
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    {product.name.toUpperCase()}
                  </h3>
                  <p className="text-sm text-[#555] mb-4">{product.price} TK</p>

                  <div className="flex gap-2">
                    {/* Add to Cart */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-black text-white text-[10px] font-bold tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ShoppingBag size={13} />
                      {product.stock === 0 ? 'SOLD OUT' : 'ADD TO CART'}
                    </button>

                    {/* Remove from Wishlist */}
                    <button
                      onClick={() => removeFromWishlist(product._id)}
                      className="p-2.5 border border-[#eee] text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="text-center mt-16 pt-10 border-t border-[#eee]">
            <Link
              to="/collection"
              className="inline-block px-12 py-4 border border-black text-black no-underline text-[11px] font-bold tracking-[3px] hover:bg-black hover:text-white transition-colors"
            >
              CONTINUE SHOPPING
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Wishlist;