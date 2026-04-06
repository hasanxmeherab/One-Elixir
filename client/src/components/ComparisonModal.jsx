import React from 'react';
import { X, BarChart3 } from 'lucide-react';
import { useComparison } from '../context/ComparisonContext';

const ComparisonModal = ({ isOpen, onClose }) => {
  const { comparisonProducts, removeFromComparison, clearComparison } = useComparison();

  if (!isOpen) return null;

  return (
    <>
      {/* ✅ FEATURE #3: Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ✅ FEATURE #3: Modal */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end md:justify-center">
        <div className="bg-white w-full h-[90vh] md:h-auto md:max-w-6xl md:max-h-[90vh] rounded-t-2xl md:rounded-lg shadow-2xl overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-2">
              <BarChart3 size={24} className="text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">
                Compare Products {comparisonProducts.length > 0 && `(${comparisonProducts.length})`}
              </h2>
            </div>
            <div className="flex gap-2">
              {comparisonProducts.length > 0 && (
                <button
                  onClick={clearComparison}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Empty State */}
          {comparisonProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
              <BarChart3 size={48} className="opacity-20 mb-4" />
              <p className="text-lg font-medium">No products to compare</p>
              <p className="text-sm text-gray-400 mt-1">Add up to 4 products for comparison</p>
            </div>
          ) : (
            /* Comparison Table */
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[150px]">
                      Specification
                    </th>
                    {comparisonProducts.map(product => (
                      <th key={product._id} className="px-4 py-3 text-center min-w-[180px]">
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            {product.image && (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-24 w-full object-cover rounded"
                              />
                            )}
                          </div>
                          <button
                            onClick={() => removeFromComparison(product._id)}
                            className="text-red-600 hover:text-red-700 text-xs font-medium flex items-center justify-center gap-1"
                          >
                            <X size={14} /> Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Product Name */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-700">Product Name</td>
                    {comparisonProducts.map(product => (
                      <td key={product._id} className="px-4 py-3 text-center">
                        <p className="font-medium text-gray-900">{product.name}</p>
                      </td>
                    ))}
                  </tr>

                  {/* Price */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-700">Price</td>
                    {comparisonProducts.map(product => (
                      <td key={product._id} className="px-4 py-3 text-center">
                        <div className="flex flex-col gap-1">
                          <span className="text-lg font-bold text-purple-600">
                            ৳ {product.price}
                          </span>
                          {product.flashSale?.active && (
                            <span className="text-sm font-semibold text-green-600">
                              Sale: ৳ {product.flashSale.salePrice}
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Stock */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-700">Stock</td>
                    {comparisonProducts.map(product => (
                      <td key={product._id} className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            product.stock > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Scent Profile */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-700">Scent Profile</td>
                    {comparisonProducts.map(product => (
                      <td key={product._id} className="px-4 py-3 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {product.scentProfile && product.scentProfile.length > 0 ? (
                            product.scentProfile.map(scent => (
                              <span
                                key={scent}
                                className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                              >
                                {scent}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Variants Available */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-700">Variants</td>
                    {comparisonProducts.map(product => (
                      <td key={product._id} className="px-4 py-3 text-center">
                        {product.variants && product.variants.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {product.variants.map(v => (
                              <span
                                key={v.label}
                                className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {v.label} - ৳{v.price}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No variants</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Featured */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-700">Featured</td>
                    {comparisonProducts.map(product => (
                      <td key={product._id} className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                            product.featured
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {product.featured ? '⭐ Featured' : 'Standard'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Description */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-700">Description</td>
                    {comparisonProducts.map(product => (
                      <td key={product._id} className="px-4 py-3 text-center text-sm text-gray-600">
                        <p className="line-clamp-3">
                          {product.description || 'No description available'}
                        </p>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>
            {comparisonProducts.length > 0 && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700"
              >
                Continue Shopping
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ComparisonModal;
