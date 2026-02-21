import React from 'react';
import { Link } from 'react-router-dom';

const Wishlist = () => {
  return (
    <div className="px-[5%] pt-24 pb-20 text-center min-h-[70vh]">
      <h2 className="tracking-[10px] text-2xl font-bold">WISHLIST</h2>
      <div className="w-10 h-0.5 bg-black mx-auto mt-5 mb-16"></div>

      <div className="mt-20">
        <p className="tracking-[2px] text-[#888] text-xs">YOUR WISHLIST IS CURRENTLY EMPTY</p>
        <Link
          to="/shop"
          className="inline-block mt-10 px-12 py-5 bg-black text-white no-underline text-[11px] font-bold tracking-[3px] hover:bg-gray-800 transition-colors"
        >
          EXPLORE COLLECTION
        </Link>
      </div>
    </div>
  );
};

export default Wishlist;