import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ShoppingBag, Check, AlertCircle } from 'lucide-react';

// ✅ FEATURE #5: Handle cart recovery from abandoned cart email
const CartRecovery = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, clearCart } = useCart();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [recovered, setRecovered] = useState(false);
  const [error, setError] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [cartItems, setCartItems] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;
  const recoveryToken = searchParams.get('recovery');

  useEffect(() => {
    if (!recoveryToken) {
      setError('Invalid recovery link');
      setLoading(false);
      setTimeout(() => navigate('/cart'), 2000);
      return;
    }

    // ✅ FEATURE #5: Fetch abandoned cart by recovery token
    const fetchAbandonedCart = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/cart-abandonment/recover/${recoveryToken}`
        );

        const { cartItems, couponCode, discount } = response.data;
        
        // ✅ Restore cart items
        if (cartItems && Array.isArray(cartItems)) {
          clearCart();
          cartItems.forEach(item => {
            addToCart(item);
          });
          setCartItems(cartItems);
        }

        setDiscount(discount || 10);
        setCouponCode(couponCode || 'COMEBACK10');
        setRecovered(true);
        toast.success('🎉 Your cart has been recovered with ' + (discount || 10) + '% discount!', 5000);
      } catch (err) {
        console.error('Cart recovery error:', err);
        setError(err.response?.data?.message || 'Failed to recover cart');
      } finally {
        setLoading(false);
      }
    };

    fetchAbandonedCart();
  }, [recoveryToken, navigate, toast, addToCart, clearCart]);

  if (!recoveryToken) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
        {loading ? (
          // Loading State
          <div className="py-12 px-6 text-center">
            <div className="inline-block">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
            </div>
            <p className="text-gray-600 font-medium">Recovering your cart...</p>
          </div>
        ) : error ? (
          // Error State
          <div className="py-8 px-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Recover Cart</h2>
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <p className="text-sm text-gray-500 mb-6">
              The recovery link may be expired or invalid. Please try again.
            </p>
            <button
              onClick={() => navigate('/cart')}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 rounded-lg transition"
            >
              Return to Cart
            </button>
          </div>
        ) : recovered ? (
          // Success State
          <div className="py-8 px-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back!</h2>
            <p className="text-gray-600 mb-4">Your cart has been restored</p>

            {/* Items Count */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
              <p className="text-sm text-gray-600">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} restored to your cart
              </p>
            </div>

            {/* Discount Badge */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Exclusive Discount</p>
              <p className="text-3xl font-bold text-green-600 mb-1">{discount}% OFF</p>
              <p className="text-xs text-gray-500">Use code: <span className="font-mono font-semibold text-green-700">{couponCode}</span></p>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Your discount has been added to checkout
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigate('/cart');
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                <ShoppingBag size={20} />
                Back to Cart
              </button>
              <button
                onClick={() => {
                  navigate('/checkout');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
              >
                Checkout
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CartRecovery;
