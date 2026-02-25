import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './UserContext'; // Added this to track user state changes

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { user } = useUser();

  // Helper to determine the key based on current state
  const getKey = () => {
    const userId = user?._id || localStorage.getItem('userId');
    return userId ? `oneElixirWishlist_${userId}` : 'oneElixirWishlist_guest';
  };

  // 1. INITIAL LOAD: Use a lazy initializer function
  // This runs synchronously on the very first render (Fixes refresh issue)
  const [wishlist, setWishlist] = useState(() => {
    try {
      const key = getKey();
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Wishlist initialization error:", error);
      return [];
    }
  });

  // 2. USER SYNC: Reload wishlist when the user object changes (login/logout)
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

    // Listen for storage changes in other tabs
    window.addEventListener('storage', loadWishlist);
    return () => window.removeEventListener('storage', loadWishlist);
  }, [user?._id]); // Re-run when user ID changes

  // 3. PERSISTENCE: Save to localStorage whenever the wishlist array changes
  useEffect(() => {
    const key = getKey();
    localStorage.setItem(key, JSON.stringify(wishlist));
  }, [wishlist, user?._id]);

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
    <WishlistContext.Provider 
      value={{ 
        wishlist, 
        addToWishlist, 
        removeFromWishlist, 
        isWishlisted, 
        toggleWishlist, 
        reloadWishlist 
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);