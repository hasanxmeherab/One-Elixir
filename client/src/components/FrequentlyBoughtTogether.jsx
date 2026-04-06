import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingBag, TrendingUp } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const FrequentlyBoughtTogether = ({ productId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const { addToCart } = useCart();
  const toast = useToast();

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchFrequentlyBought();
  }, [productId]);

  const fetchFrequentlyBought = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/perfumes/frequently-bought/${productId}`);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching frequently bought products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!products || products.length === 0) return null;

  const handleToggleSelect = (productId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    let addedCount = 0;
    selectedItems.forEach(id => {
      const product = products.find(p => p._id === id);
      if (product) {
        addToCart(product);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      toast.success(`Added ${addedCount} item${addedCount > 1 ? 's' : ''} to cart`);
      setSelectedItems(new Set());
    }
  };

  return (
    <div className="py-8 px-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-purple-600" size={24} />
          <h3 className="text-2xl font-bold text-gray-800">Frequently Bought Together</h3>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading recommendations...</div>
        ) : (
          <>
            {/* ✅ FEATURE #4: Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {products.map(product => (
                <div
                  key={product._id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedItems.has(product._id)
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-400'
                  }`}
                  onClick={() => handleToggleSelect(product._id)}
                >
                  {/* Product Image */}
                  <div className="mb-3 h-32 rounded overflow-hidden bg-gray-100">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Product Info */}
                  <h4 className="font-semibold text-sm text-gray-800 line-clamp-2 mb-2">
                    {product.name}
                  </h4>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-purple-600">৳{product.price}</span>
                    {product.flashSale?.active && (
                      <span className="text-sm text-green-600 font-semibold">
                        Sale: ৳{product.flashSale.salePrice}
                      </span>
                    )}
                  </div>

                  {/* Stock */}
                  <p className={`text-xs font-medium ${
                    product.stock > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </p>

                  {/* Checkbox */}
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(product._id)}
                      onChange={() => {}}
                      className="w-4 h-4 rounded"
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-600">Select</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ FEATURE #4: Action Buttons */}
            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                <span className="font-semibold text-gray-700">
                  {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={handleAddSelected}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                >
                  <ShoppingBag size={18} />
                  Add to Cart
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;
