import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { ShoppingBag } from 'lucide-react';

const Cart = () => {
  const toast = useToast();
  const { cart, removeFromCart, addToCart, cartTotal } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckout = () => {
    setLoading(true);
    if (!user) {
      toast.warning("Please sign in to complete your order.");
      setLoading(false);
      navigate('/signin');
    } else {
      setTimeout(() => {
        setLoading(false);
        navigate('/checkout');
      }, 800);
    }
  };

  return (
    <div className="min-h-[80vh] bg-white pt-10">
      <div className="max-w-[1200px] mx-auto px-5">

        {/* Header */}
        <h2 className="tracking-[5px] text-left mb-10 border-b border-[#eee] pb-5">
          YOUR SELECTION ({cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)})
        </h2>

        {cart.length === 0 ? (
          <div className="text-center mt-20">
            <ShoppingBag size={48} className="mx-auto mb-6 text-[#ddd]" />
            <p className="tracking-[2px] text-[#888] text-xs mb-2">YOUR CART IS CURRENTLY EMPTY</p>
            <p className="text-xs text-[#aaa] mb-10">Add fragrances you love and check out when you're ready.</p>
            <Link
              to="/collection"
              className="inline-block px-12 py-5 bg-black text-white no-underline text-[11px] font-bold tracking-[3px] hover:bg-gray-800 transition-colors"
            >
              EXPLORE COLLECTION
            </Link>
          </div>
        ) : (
          <div className="flex gap-16 items-start flex-wrap">

            {/* LEFT: PRODUCT LIST */}
            <div className="flex-[2] min-w-[300px] md:min-w-[350px]">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between items-center py-6 border-b border-[#f1f1f1] flex-wrap gap-4">
                  
                  {/* Item Info */}
                  <div className="flex gap-5 items-center flex-1">
                    <img src={item.image} alt={item.name} className="w-[100px] h-[130px] object-cover bg-[#f9f9f9]" />
                    <div>
                      {item.isBundle && (
                        <span className="inline-block bg-black text-white text-[8px] font-bold tracking-[1px] px-2 py-0.5 mb-1">BUNDLE</span>
                      )}
                      <h4 className="m-0 mb-1 text-sm tracking-wider font-bold">{item.name?.toUpperCase()}</h4>
                      <p className="m-0 mb-1 text-[#666] text-[13px]">{item.price} TK</p>
                      {item.isBundle && item.bundleProducts && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {item.bundleProducts.map(p => (
                            <span key={p._id} className="text-[9px] text-[#888] border border-[#eee] px-1.5 py-0.5">{p.name}</span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="bg-transparent border-none text-[#999] text-[10px] underline cursor-pointer p-0"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center border border-[#ddd] p-1">
                    <button
                      onClick={() => addToCart(item, -1)}
                      disabled={item.quantity <= 1}
                      className="stepper-btn border-none bg-transparent px-4 cursor-pointer text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    >−</button>
                    <span className="text-sm min-w-[20px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item, 1)}
                      className="stepper-btn border-none bg-transparent px-4 cursor-pointer text-lg"
                    >+</button>
                  </div>

                  {/* Item Total */}
                  <div className="w-[120px] text-right font-bold text-[15px]">
                    {(Number(item.price) * (Number(item.quantity) || 0)).toFixed(2)} TK
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: ORDER SUMMARY */}
            <div className="flex-1 min-w-[280px] bg-[#fbfbfb] p-10 border border-[#eee]">
              <h3 className="text-base tracking-[2px] mb-8">ORDER SUMMARY</h3>

              <div className="flex justify-between font-bold mb-4 border-b border-[#ddd] pb-4">
                <span>SUBTOTAL</span>
                <span>{cartTotal.toFixed(2)} TK</span>
              </div>

              <div className="flex justify-between text-[11px] text-[#888] mb-8">
                <span>SHIPPING</span>
                <span>CALCULATED AT CHECKOUT</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className={`btn-press w-full bg-black text-white py-5 border-none font-bold tracking-[2px] cursor-pointer mb-5 transition-opacity ${loading ? 'opacity-70' : 'opacity-100 hover:bg-gray-800'}`}
              >
                {loading ? "PROCESSING..." : "PROCEED TO CHECKOUT"}
              </button>

              <Link
                to="/"
                className="block text-center text-[11px] text-black no-underline font-bold opacity-60 hover:opacity-100 transition-opacity"
              >
                ← CONTINUE SHOPPING
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;