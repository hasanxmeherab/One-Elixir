import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const ProductDetails = ({ openCart }) => { 
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/perfumes/${id}`);
        setProduct(res.data);
      } catch (err) {
        console.error("Product not found");
      }
    };
    fetchProduct();
  }, [id]);

  if (!product) return (
    <div className="h-screen flex justify-center items-center tracking-[5px]">
      AWAKENING THE SCENT...
    </div>
  );

  const handleAddToCart = () => {
    addToCart(product, quantity);
    if (openCart) openCart(); 
  };

  return (
    <div className="flex min-h-screen px-[8%] pt-28 pb-20 gap-20 flex-wrap">
      
      {/* Left: Product Image */}
      <div className="flex-1 min-w-[300px] md:min-w-[400px] bg-[#fcfcfc]">
        <img src={product.image} alt={product.name} className="w-full h-auto object-cover" />
      </div>

      {/* Right: Product Info */}
      <div className="flex-1 min-w-[300px] md:min-w-[400px] flex flex-col justify-center">
        <button
          onClick={() => navigate('/shop')}
          className="bg-transparent border-none text-[10px] tracking-[2px] cursor-pointer mb-8 text-left p-0 hover:opacity-50 transition-opacity"
        >
          ← BACK TO COLLECTION
        </button>

        <h1 className="text-4xl md:text-5xl font-light tracking-[12px] mb-2">
          {product.name.toUpperCase()}
        </h1>
        <p className="text-xl text-[#555] mb-8">{product.price.toLocaleString()} TK</p>

        <div className="h-px bg-[#eee] w-16 mb-8"></div>

        <p className="text-[15px] leading-relaxed text-[#444] mb-10">{product.description}</p>

        {/* Scent Architecture */}
        <div className="mb-12">
          <p className="text-[10px] tracking-[3px] font-bold mb-4 text-[#888]">SCENT ARCHITECTURE</p>
          <div className="flex gap-2.5 flex-wrap mb-12">
            {product.scentProfile.map((note, index) => (
              <span
                key={index}
                className="px-4 py-2 border border-[#ddd] text-xs tracking-wider hover:border-black transition-colors"
              >
                {note}
              </span>
            ))}
          </div>
        </div>

        {/* Purchase Actions */}
        <div className="flex gap-5 mb-5 flex-wrap">
          {product.stock > 0 ? (
            <>
              {/* Quantity Selector */}
              <div className="flex items-center border border-black">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2.5 bg-transparent border-none cursor-pointer text-lg hover:bg-gray-50 transition-colors"
                >-</button>
                <span className="px-5 font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-2.5 bg-transparent border-none cursor-pointer text-lg hover:bg-gray-50 transition-colors"
                >+</button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-black text-white border-none font-bold tracking-[2px] cursor-pointer text-xs hover:bg-gray-800 transition-colors px-6 py-3"
              >
                ADD TO COLLECTION
              </button>
            </>
          ) : (
            <button
              disabled
              className="flex-1 bg-[#eee] text-[#888] border-none cursor-not-allowed tracking-[2px] py-3"
            >
              CURRENTLY UNAVAILABLE
            </button>
          )}
        </div>

        <p className="text-[11px] text-[#aaa] italic">
          {product.stock > 0 ? `Inventory: ${product.stock} units available` : 'Restocking soon.'}
        </p>
      </div>
    </div>
  );
};

export default ProductDetails;