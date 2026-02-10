import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  // 1. INITIALIZE directly from localStorage
  // This function runs only once during the very first render.
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('oneElixirCart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // 2. SAVE to local storage whenever cart changes
  useEffect(() => {
    localStorage.setItem('oneElixirCart', JSON.stringify(cart));
  }, [cart]);

  // FIX: Default quantity to 1 so math doesn't result in NaN
  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item._id === product._id 
            ? { 
                ...item, 
                // Ensure we are adding numbers, not undefined
                quantity: Math.min((Number(item.quantity) || 0) + (Number(quantity) || 1), product.stock) 
              } 
            : item
        );
      }
      
      // Ensure the new item has a numeric quantity and price
      return [...prevCart, { 
        ...product, 
        quantity: Number(quantity) || 1,
        price: Number(product.price) || 0 
      }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item._id !== id));
  };

  const clearCart = () => setCart([]);

  // Safety: Add fallback || 0 so the total never breaks
  const cartTotal = (cart || []).reduce((total, item) => 
    total + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0
  );

  const cartCount = (cart || []).reduce((count, item) => 
    count + (Number(item.quantity) || 0), 0
  );

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);