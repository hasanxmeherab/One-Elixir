import React, { createContext, useState, useContext, useEffect } from 'react';
import { useUser } from './UserContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useUser();
  const [cart, setCart] = useState([]);

  // Use _id from user object, fall back to localStorage in case context hasn't hydrated yet
  const getUserId = () => user?._id || localStorage.getItem('userId') || null;

  const guestKey    = 'oneElixirCart_guest';
  const getUserKey  = () => getUserId() ? `oneElixirCart_${getUserId()}` : null;
  const currentKey  = () => getUserKey() || guestKey;

  // LOAD & MERGE when login state changes
  useEffect(() => {
    const userKey     = getUserKey();
    const savedUserCart  = userKey ? JSON.parse(localStorage.getItem(userKey)  || '[]') : [];
    const savedGuestCart =           JSON.parse(localStorage.getItem(guestKey) || '[]');

    if (userKey && savedGuestCart.length > 0) {
      // Merge guest cart into user cart on login
      const mergedCart = [...savedUserCart];
      savedGuestCart.forEach(guestItem => {
        const existingIndex = mergedCart.findIndex(item => item._id === guestItem._id);
        if (existingIndex > -1) {
          mergedCart[existingIndex].quantity = Math.min(
            mergedCart[existingIndex].quantity + guestItem.quantity,
            guestItem.stock
          );
        } else {
          mergedCart.push(guestItem);
        }
      });
      setCart(mergedCart);
      localStorage.setItem(userKey, JSON.stringify(mergedCart));
      localStorage.removeItem(guestKey);
    } else {
      const saved = localStorage.getItem(currentKey());
      setCart(saved ? JSON.parse(saved) : []);
    }
  }, [user?._id]); // Re-run whenever the logged-in user changes

  // SAVE on every cart change
  useEffect(() => {
    localStorage.setItem(currentKey(), JSON.stringify(cart));
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
      return [...prev, { ...product, quantity: Number(quantity) || 1, price: Number(product.price) || 0 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item._id !== id));

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(currentKey());
  };

  const cartTotal = cart.reduce((total, item) =>
    total + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);

  const cartCount = cart.reduce((count, item) =>
    count + (Number(item.quantity) || 0), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);