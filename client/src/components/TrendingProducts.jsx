import React from 'react';
import { useTrendingProducts } from '../hooks/useRecommendations';
import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingCart } from 'lucide-react';

// ✅ FEATURE #6: Display trending products (top 30-day sellers)
const TrendingProducts = ({ limit = 10, showTitle = true }) => {
  const { products, loading, error } = useTrendingProducts(limit);

  if (loading) {
    return (
      <section className="my-16">
        {showTitle && <h2 className="text-3xl font-bold mb-6">Trending Now</h2>}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  return (
    <section className="my-16">
      {showTitle && (
        <div className="mb-8 flex items-center gap-2">
          <TrendingUp className="text-red-500" size={32} />
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Trending Now</h2>
            <p className="text-gray-600 text-sm">Most loved in the last 30 days</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {products.map((rec, idx) => (
          <Link
            key={rec.productId}
            to={`/product/${rec.product?.slug || '#'}`}
            className="group relative"
          >
            {/* Rank Badge */}
            <div className="absolute top-0 left-0 z-10 bg-red-500 text-white rounded-br-lg px-3 py-1 font-bold text-lg">
              #{idx + 1}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* Image */}
              <div className="relative bg-gray-50 aspect-square overflow-hidden">
                {rec.product?.image ? (
                  <img
                    src={rec.product.image}
                    alt={rec.product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <span className="text-xs">No image</span>
                  </div>
                )}

                {/* Sale Badge */}
                {rec.product?.flashSale?.active && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded font-bold text-xs">
                    SALE
                  </div>
                )}

                {/* Sales Count */}
                {rec.details && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {rec.details}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-red-600 transition-colors mb-2">
                  {rec.product?.name}
                </h3>

                {/* Scent Tags */}
                {rec.product?.scentProfile && rec.product.scentProfile.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {rec.product.scentProfile.slice(0, 2).map((scent, i) => (
                      <span key={i} className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                        {scent}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    {rec.product?.flashSale?.active ? (
                      <>
                        <p className="font-bold text-red-600">
                          ৳ {rec.product.flashSale.salePrice.toLocaleString()}
                        </p>
                        <p className="text-xs line-through text-gray-400">
                          ৳ {rec.product?.price.toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="font-bold text-gray-900">
                        ৳ {rec.product?.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <ShoppingCart size={16} className="text-gray-400 group-hover:text-red-500 transition" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default TrendingProducts;
