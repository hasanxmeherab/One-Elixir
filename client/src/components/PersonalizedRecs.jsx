import React from 'react';
import { useRecommendations } from '../hooks/useRecommendations';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';

// ✅ FEATURE #6: Personalized recommendations for logged-in users
const PersonalizedRecs = ({ limit = 6, showTitle = true }) => {
  const { user } = useUser();
  const { recommendations, loading, error } = useRecommendations(null, user?.email, 'user_personalized', limit);

  // Don't show if user not logged in or no recommendations
  if (!user?.email) return null;
  if (loading) return null;
  if (error || recommendations.length === 0) return null;

  return (
    <section className="my-16">
      {showTitle && (
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Crafted Just For You</h2>
          <p className="text-gray-600">
            Based on your purchase history and preferences
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {recommendations.map((rec) => (
          <Link
            key={rec.productId}
            to={`/product/${rec.product?.slug || '#'}`}
            className="group"
          >
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
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
                    <span>No image</span>
                  </div>
                )}

                {/* Heart Icon */}
                <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow hover:bg-gray-100 transition">
                  <Heart size={18} className="text-gray-400 hover:text-red-500" />
                </button>

                {/* Match Score */}
                {rec.score && (
                  <div className="absolute bottom-3 left-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {Math.round(rec.score * 100)}% Match
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors mb-2">
                  {rec.product?.name}
                </h3>

                {/* Scent Tags */}
                {rec.product?.scentProfile && rec.product.scentProfile.length > 0 && (
                  <p className="text-xs text-gray-500 mb-3">
                    {rec.product.scentProfile.slice(0, 2).join(', ')}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-gray-900">
                    ৳ {rec.product?.price.toLocaleString()}
                  </span>
                  <button className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition">
                    <ShoppingCart size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <Link
          to="/collection"
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition"
        >
          Explore More
        </Link>
      </div>
    </section>
  );
};

export default PersonalizedRecs;
