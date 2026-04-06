import React, { createContext, useContext, useState } from 'react';

const ComparisonContext = createContext();

export const ComparisonProvider = ({ children }) => {
  // ✅ FEATURE #3: Store up to 4 products for comparison
  const [comparisonProducts, setComparisonProducts] = useState([]);

  const addToComparison = (product) => {
    // Check if product already in comparison
    if (comparisonProducts.some(p => p._id === product._id)) {
      return false; // Already added
    }
    // Limit to 4 products max
    if (comparisonProducts.length >= 4) {
      return false; // Max reached
    }
    setComparisonProducts(prev => [...prev, product]);
    return true; // Added successfully
  };

  const removeFromComparison = (productId) => {
    setComparisonProducts(prev => prev.filter(p => p._id !== productId));
  };

  const clearComparison = () => {
    setComparisonProducts([]);
  };

  const isInComparison = (productId) => {
    return comparisonProducts.some(p => p._id === productId);
  };

  return (
    <ComparisonContext.Provider value={{
      comparisonProducts,
      addToComparison,
      removeFromComparison,
      clearComparison,
      isInComparison,
      comparisonCount: comparisonProducts.length
    }}>
      {children}
    </ComparisonContext.Provider>
  );
};

export const useComparison = () => useContext(ComparisonContext);
