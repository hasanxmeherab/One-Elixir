import React from 'react';

// Base shimmer block — uses Tailwind's built-in animate-pulse (no extra CSS needed)
const Shimmer = ({ className = '' }) => (
  <div className={`bg-shimmer animate-pulse rounded-sm ${className}`} />
);

// Single product card skeleton
export const ProductCardSkeleton = () => (
  <div className="flex flex-col gap-3">
    <Shimmer className="w-full h-[280px]" />
    <Shimmer className="w-3/4 h-3" />
    <Shimmer className="w-1/2 h-3" />
    <Shimmer className="w-1/3 h-3" />
  </div>
);

// Grid of product card skeletons — used in Shop page
export const ProductGridSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

// ProductDetails page skeleton
export const ProductDetailsSkeleton = () => (
  <div className="flex min-h-screen px-[8%] pt-28 pb-20 gap-20 flex-wrap">
    <div className="flex-1 min-w-[300px] flex flex-col gap-3">
      <Shimmer className="w-full h-[480px]" />
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => <Shimmer key={i} className="w-16 h-16" />)}
      </div>
    </div>
    <div className="flex-1 min-w-[300px] flex flex-col gap-5 pt-10">
      <Shimmer className="w-24 h-3" />
      <Shimmer className="w-3/4 h-10" />
      <Shimmer className="w-1/3 h-6" />
      <div className="flex flex-col gap-2 mt-4">
        <Shimmer className="w-full h-3" />
        <Shimmer className="w-full h-3" />
        <Shimmer className="w-2/3 h-3" />
      </div>
      <div className="flex gap-3 mt-4">
        {[...Array(3)].map((_, i) => <Shimmer key={i} className="w-16 h-10" />)}
      </div>
      <div className="flex gap-3 mt-2">
        <Shimmer className="flex-1 h-14" />
        <Shimmer className="w-32 h-14" />
      </div>
    </div>
  </div>
);

export const HomeSkeleton = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </>
);

export default Shimmer;