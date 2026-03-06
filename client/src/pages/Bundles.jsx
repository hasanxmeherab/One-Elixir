import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Bundles = () => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    axios.get(`${API_URL}/api/bundles`)
      .then(r => setBundles(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAddBundle = (bundle) => {
    const minStock = bundle.products.reduce((min, p) => Math.min(min, p.stock || 99), 99);
    addToCart({
      _id: `bundle_${bundle._id}`,
      name: bundle.name,
      price: bundle.bundlePrice,
      image: bundle.image || bundle.products[0]?.image,
      stock: minStock,
      isBundle: true,
      bundleId: bundle._id,
      bundleProducts: bundle.products,
    }, 1);
  };

  return (
    <div className="px-[8%] pt-28 pb-20 max-w-[1300px] mx-auto min-h-screen">

      {/* Header */}
      <div className="text-center mb-16">
        <p className="text-[10px] tracking-[4px] text-[#888] mb-3">CURATED SETS</p>
        <h1 className="text-4xl font-light tracking-[10px] mb-4">BUNDLE DEALS</h1>
        <div className="w-10 h-px bg-black mx-auto mb-6"></div>
        <p className="text-[12px] text-[#888] tracking-wider max-w-md mx-auto">
          Handpicked combinations at exclusive prices — save more when you shop together.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[1,2].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-shimmer h-[300px] mb-6 rounded-sm"></div>
              <div className="h-4 bg-shimmer w-2/3 mb-3 rounded-sm"></div>
              <div className="h-3 bg-shimmer w-1/2 rounded-sm"></div>
            </div>
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-[#ccc] tracking-[4px] text-sm mb-4">NO BUNDLES AVAILABLE</p>
          <p className="text-[#aaa] text-xs">Check back soon for curated fragrance sets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {bundles.map(bundle => {
            const originalTotal = bundle.products.reduce((s, p) => s + (p.price || 0), 0);
            const savings       = originalTotal - bundle.bundlePrice;
            const savingsPct    = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

            return (
              <div key={bundle._id} className="group border border-[#eee] hover:border-black transition-colors duration-300">

                {/* Bundle image or product grid */}
                {bundle.image ? (
                  <div className="w-full h-[320px] overflow-hidden bg-[#f9f9f9]">
                    <img src={bundle.image} alt={bundle.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                ) : (
                  <div className={`grid h-[320px] bg-[#f9f9f9] overflow-hidden ${
                    bundle.products.length === 2 ? 'grid-cols-2' :
                    bundle.products.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                  }`}>
                    {bundle.products.slice(0, 4).map((p, i) => (
                      <div key={p._id || i} className="overflow-hidden">
                        <img src={p.image} alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Info */}
                <div className="p-6">
                  {savings > 0 && (
                    <div className="inline-block bg-black text-white text-[9px] font-bold tracking-[2px] px-3 py-1 mb-3">
                      SAVE {savingsPct}%
                    </div>
                  )}
                  <h3 className="text-lg font-bold tracking-[3px] mb-2">{bundle.name.toUpperCase()}</h3>
                  {bundle.description && (
                    <p className="text-[12px] text-[#888] mb-4 leading-relaxed">{bundle.description}</p>
                  )}

                  {/* Products list */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {bundle.products.map(p => (
                      <span key={p._id}
                        onClick={() => navigate(`/product/${p.slug || p._id}`)}
                        className="text-[10px] border border-[#ddd] px-2 py-1 text-[#555] cursor-pointer hover:border-black transition-colors">
                        {p.name}
                      </span>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="flex items-end justify-between border-t border-[#eee] pt-4">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold">{bundle.bundlePrice.toLocaleString()} TK</span>
                        {originalTotal > 0 && originalTotal !== bundle.bundlePrice && (
                          <span className="text-sm text-[#aaa] line-through">{originalTotal.toLocaleString()} TK</span>
                        )}
                      </div>
                      {savings > 0 && (
                        <p className="text-[11px] text-emerald-600 font-bold mt-0.5">You save {savings.toLocaleString()} TK</p>
                      )}
                    </div>
                    <button onClick={() => handleAddBundle(bundle)}
                      className="px-6 py-3 bg-black text-white text-[10px] font-bold tracking-[2px] hover:bg-gray-800 transition-colors cursor-pointer border-none">
                      ADD TO CART
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Bundles;