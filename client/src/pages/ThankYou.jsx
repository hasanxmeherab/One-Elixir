import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const ThankYou = () => {
  const { state } = useLocation();
  const order = state?.order || null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-20">

      {/* Icon */}
      <CheckCircle size={48} className="text-black mb-6" strokeWidth={1.2} />

      <h1 className="tracking-[8px] text-3xl md:text-4xl font-light mb-3">
        THANK YOU
      </h1>
      <p className="text-[#888] tracking-[2px] text-xs mb-2">YOUR ORDER HAS BEEN PLACED</p>
      <div className="h-px w-10 bg-black my-6 mx-auto" />
      <p className="text-sm text-[#666] leading-relaxed mb-10">
        A confirmation has been sent to your email.<br />
        We'll notify you once your order is shipped.
      </p>

      {/* ── Order Summary Card ── */}
      {order && (
        <div className="w-full max-w-[520px] border border-[#eee] bg-[#fcfcfc] text-left mb-10">

          {/* Header */}
          <div className="px-6 py-4 border-b border-[#eee] flex justify-between items-center flex-wrap gap-2">
            <div>
              <p className="text-[9px] text-[#aaa] tracking-[2px] mb-0.5">ORDER ID</p>
              <p className="text-xs font-bold tracking-wider">{order._id || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[#aaa] tracking-[2px] mb-0.5">PAYMENT</p>
              <p className="text-xs font-bold">{order.paymentMethod}</p>
            </div>
          </div>

          {/* Items */}
          <div className="px-6 py-4 flex flex-col gap-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[#444]">{item.name} <span className="text-[#aaa]">× {item.quantity}</span></span>
                <span className="font-bold">{(item.price * item.quantity).toLocaleString()} TK</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-[#eee] flex flex-col gap-2">
            {order.shippingCost > 0 && (
              <div className="flex justify-between text-sm text-[#666]">
                <span>Shipping</span>
                <span>{order.shippingCost.toLocaleString()} TK</span>
              </div>
            )}
            {order.discountApplied > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span>
                <span>−{order.discountApplied.toLocaleString()} TK</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-[#f0f0f0]">
              <span>TOTAL</span>
              <span>{order.totalAmount?.toLocaleString()} TK</span>
            </div>
          </div>

          {/* Address */}
          <div className="px-6 py-4 border-t border-[#eee]">
            <p className="text-[9px] text-[#aaa] tracking-[2px] mb-1">DELIVERING TO</p>
            <p className="text-sm text-[#444]">{order.address}</p>
          </div>
        </div>
      )}

      {/* Track + Shop buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {order?._id && (
          <Link
            to={`/track/${order._id}`}
            className="px-8 py-4 border border-black text-black no-underline font-bold text-xs tracking-[2px] hover:bg-black hover:text-white transition-colors"
          >
            TRACK ORDER
          </Link>
        )}
        <Link
          to="/shop"
          className="px-8 py-4 bg-black text-white no-underline font-bold text-xs tracking-[2px] hover:bg-gray-800 transition-colors"
        >
          CONTINUE SHOPPING
        </Link>
      </div>
    </div>
  );
};

export default ThankYou;