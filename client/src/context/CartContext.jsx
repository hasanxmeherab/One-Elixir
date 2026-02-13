import React, { createContext, useState, useContext, useEffect } from 'react';
import { useUser } from './UserContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useUser();
  const [cart, setCart] = useState([]);

  // Dynamic storage keys
  const guestKey = 'oneElixirCart_guest';
  const userKey = user ? `oneElixirCart_${user._id}` : null;
  const currentKey = user ? userKey : guestKey;

  // MERGE & LOAD LOGIC
  useEffect(() => {
    const savedUserCart = userKey ? JSON.parse(localStorage.getItem(userKey) || '[]') : [];
    const savedGuestCart = JSON.parse(localStorage.getItem(guestKey) || '[]');

    if (user && savedGuestCart.length > 0) {
      // Merge guest items into user cart, avoiding duplicates by ID
      const mergedCart = [...savedUserCart];
      
      savedGuestCart.forEach(guestItem => {
        const existingIndex = mergedCart.findIndex(item => item._id === guestItem._id);
        if (existingIndex > -1) {
          // If item exists in both, sum the quantities (respecting stock)
          mergedCart[existingIndex].quantity = Math.min(
            mergedCart[existingIndex].quantity + guestItem.quantity, 
            guestItem.stock
          );
        } else {
          mergedCart.push(guestItem);
        }
      });

      setCart(mergedCart);
      localStorage.setItem(userKey, JSON.stringify(mergedCart)); // Save merged to user
      localStorage.removeItem(guestKey); // Wipe guest cart after successful merge
    } else {
      // Standard load if no merge is needed
      const savedCart = localStorage.getItem(currentKey);
      setCart(savedCart ? JSON.parse(savedCart) : []);
    }
  }, [user, userKey]); // Runs whenever login state changes

  // SAVE LOGIC
  useEffect(() => {
    localStorage.setItem(currentKey, JSON.stringify(cart));
  }, [cart, currentKey]);

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      if (existingItem) {
        return prevCart.map(item =>
          item._id === product._id 
            ? { ...item, quantity: Math.min((Number(item.quantity) || 0) + (Number(quantity) || 1), product.stock) } 
            : item
        );
      }
      return [...prevCart, { ...product, quantity: Number(quantity) || 1, price: Number(product.price) || 0 }];
    });
  };

  const removeFromCart = (id) => setCart(prevCart => prevCart.filter(item => item._id !== id));

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(currentKey);
  };

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