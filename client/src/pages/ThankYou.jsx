import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const ThankYou = () => {
  const { setCart } = useCart();

  useEffect(() => {
    if (setCart) {
      setCart([]);
    }
  }, [setCart]);

  return (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="tracking-[10px] text-4xl md:text-5xl font-light mb-4">
        Thank You for Your Order
      </h1>
      <p className="text-[#888] tracking-[2px] text-sm">YOUR ORDER IS BEING PREPARED</p>
      <div className="h-px w-12 bg-black my-8 mx-auto"></div>
      <p className="mb-10 leading-relaxed text-sm">
        Confirmation has been sent to your email. <br />
        We hope you enjoy your new Elixir.
      </p>
      <Link
        to="/"
        className="bg-black text-white px-9 py-4 no-underline font-bold tracking-[2px] hover:bg-gray-800 transition-colors"
      >
        RETURN TO SHOP
      </Link>
    </div>
  );
};

export default ThankYou;