import { useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

// ✅ FEATURE #5: Hook to track cart abandonment
export const useCartAbandonment = () => {
  const { cart, cartTotal } = useCart();
  const { user } = useUser();

  // Track cart abandonment when user leaves
  const trackAbandonedCart = useCallback(async () => {
    if (!user?.email || cart.length === 0) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('userToken');

      // Transform cart items for backend
      const cartItems = cart.map(item => ({
        perfumeId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        variantLabel: item.variantLabel || null
      }));

      await fetch(`${API_URL}/api/cart-abandonment/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userEmail: user.email,
          userName: user.name,
          cartItems,
          cartTotal
        })
      });

      console.log('[CartAbandonment] Cart abandonment tracked');
    } catch (error) {
      console.error('[CartAbandonment] Tracking error:', error);
    }
  }, [user, cart, cartTotal]);

  // Hook: Track abandonment when page unloads or user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cart.length > 0 && user?.email) {
        trackAbandonedCart();
      }
    };

    const handleVisibilityChange = () => {
      // Track when user closes tab/window
      if (document.hidden && cart.length > 0 && user?.email) {
        trackAbandonedCart();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cart, user, trackAbandonedCart]);

  return { trackAbandonedCart };
};
