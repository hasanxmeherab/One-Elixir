import React, { createContext, useState, useContext, useEffect } from 'react';
import { useUser } from './UserContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useUser();
  
  const guestKey = 'oneElixirCart_guest';
  const getActiveKey = () => (user?._id ? `oneElixirCart_${user._id}` : guestKey);

  // Initial State Load
  const [cart, setCart] = useState(() => {
    const initialKey = getActiveKey();
    const saved = localStorage.getItem(initialKey);
    return saved ? JSON.parse(saved) : [];
  });

  // Handle Login/Refresh & Guest Merging
  useEffect(() => {
    const currentKey = getActiveKey();
    const savedGuestCart = JSON.parse(localStorage.getItem(guestKey) || '[]');

    if (user?._id && savedGuestCart.length > 0) {
      // Merge guest cart into user cart
      const savedUserCart = JSON.parse(localStorage.getItem(currentKey) || '[]');
      const mergedCart = [...savedUserCart];

      savedGuestCart.forEach(guestItem => {
        const existingIndex = mergedCart.findIndex(item => item._id === guestItem._id);
        if (existingIndex > -1) {
          mergedCart[existingIndex].quantity = Math.min(
            mergedCart[existingIndex].quantity + guestItem.quantity,
            guestItem.stock || 99
          );
        } else {
          mergedCart.push(guestItem);
        }
      });

      setCart(mergedCart);
      localStorage.setItem(currentKey, JSON.stringify(mergedCart));
      localStorage.removeItem(guestKey); // Clean up guest cart
    } else {
      // Just load existing cart for current key
      const saved = localStorage.getItem(currentKey);
      setCart(saved ? JSON.parse(saved) : []);
    }
  }, [user?._id]); 

  // Auto-save whenever cart changes
  useEffect(() => {
    localStorage.setItem(getActiveKey(), JSON.stringify(cart));
  }, [cart, user?._id]);

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item =>
          item._id === product._id
            ? { ...item, quantity: Math.min((Number(item.quantity) || 0) + (Number(quantity) || 1), product.stock) }
            : item
        );
      }
      return [...prev, { ...product, quantity: Number(quantity) || 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item._id !== id));

  const clearCart = () => {
  setCart([]);
  localStorage.removeItem(getActiveKey());
};

  const cartTotal = cart.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
  const cartCount = cart.reduce((count, item) => count + Number(item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);