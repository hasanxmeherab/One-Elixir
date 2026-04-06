import React from 'react';
import { useRecommendations } from '../hooks/useRecommendations';
import { ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// ✅ FEATURE #6: Display recommended products in a grid
const RecommendedProducts = ({ 
  perfumeId, 
  title = 'Recommended For You',
  type = 'hybrid',
  limit = 5,
  showReason = true 
}) => {
  const { recommendations, loading, error } = useRecommendations(perfumeId, null, type, limit);

  if (loading) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  // Map reason types to display text
  const reasonText = {
    similar_scent: '🌹 Similar Scent',
    frequently_bought: '🛍️ Often Bought Together',
    user_preference: '💝 Based on Your Profile',
    trending: '📈 Trending Now'
  };

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-gray-600 text-sm mb-6">
        {type === 'content' && 'Products with similar scent profiles'}
        {type === 'collaborative' && 'Frequently purchased together'}
        {type === 'user_preference' && 'Based on your purchase history'}
        {type === 'trending' && 'Popular this month'}
        {type === 'hybrid' && 'Personalized selection for you'}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {recommendations.map((rec, idx) => (
          <Link
            key={rec.productId}
            to={`/product/${rec.product?.slug || '#'}`}
            className="group cursor-pointer"
          >
            <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* Image Container */}
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

                {/* Reason Badge */}
                {showReason && (
                  <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    {rec.reason === 'similar_scent' && '🌹'}
                    {rec.reason === 'frequently_bought' && '🛍️'}
                    {rec.reason === 'user_preference' && '💝'}
                    {rec.reason === 'trending' && '📈'}
                  </div>
                )}

                {/* Flash Sale Badge */}
                {rec.product?.flashSale?.active && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                    SALE
                  </div>
                )}

                {/* Similarity Score */}
                {rec.score && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {Math.round(rec.score * 100)}% match
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-purple-600 transition-colors">
                  {rec.product?.name || 'Product'}
                </p>

                {/* Price */}
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    {rec.product?.flashSale?.active ? (
                      <>
                        <p className="text-sm font-bold text-red-600">
                          ৳ {rec.product.flashSale.salePrice.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 line-through">
                          ৳ {rec.product?.price.toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-gray-900">
                        ৳ {rec.product?.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reason Tooltip */}
                {showReason && rec.details && (
                  <p className="mt-2 text-xs text-gray-500 italic line-clamp-2">
                    {rec.details}
                  </p>
                )}

                {/* Scent Tags */}
                {rec.product?.scentProfile && rec.product.scentProfile.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rec.product.scentProfile.slice(0, 2).map((scent, i) => (
                      <span
                        key={i}
                        className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded"
                      >
                        {scent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecommendedProducts;
