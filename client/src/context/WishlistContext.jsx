import React, { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext();

const getKey = () => {
  const userId = localStorage.getItem('userId');
  return userId ? `oneElixirWishlist_${userId}` : 'oneElixirWishlist_guest';
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);

  // Load wishlist for current user on mount and when userId changes
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const key = getKey();
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        setWishlist(saved);
      } catch {
        setWishlist([]);
      }
    };
    loadWishlist();

    // Re-load when storage changes (login/logout in another tab)
    window.addEventListener('storage', loadWishlist);
    return () => window.removeEventListener('storage', loadWishlist);
  }, []);

  // Persist to correct key whenever wishlist changes
  useEffect(() => {
    const key = getKey();
    localStorage.setItem(key, JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = (product) => {
    setWishlist(prev => {
      if (prev.find(item => item._id === product._id)) return prev;
      return [...prev, product];
    });
  };

  const removeFromWishlist = (productId) => {
    setWishlist(prev => prev.filter(item => item._id !== productId));
  };

  const isWishlisted = (productId) => wishlist.some(item => item._id === productId);

  const toggleWishlist = (product) => {
    if (isWishlisted(product._id)) removeFromWishlist(product._id);
    else addToWishlist(product);
  };

  // Call this after login to reload wishlist for the newly logged-in user
  const reloadWishlist = () => {
    try {
      const key = getKey();
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      setWishlist(saved);
    } catch {
      setWishlist([]);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isWishlisted, toggleWishlist, reloadWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);