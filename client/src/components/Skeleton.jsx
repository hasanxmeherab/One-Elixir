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

// Account page skeleton — avatar, tabs, content area
export const AccountSkeleton = () => (
  <div className="px-[5%] md:px-[10%] py-20 min-h-[80vh]">
    <div className="flex flex-col items-center mb-10">
      <Shimmer className="w-20 h-20 rounded-full mb-4" />
      <Shimmer className="w-40 h-4 mb-2" />
      <Shimmer className="w-28 h-3" />
    </div>
    <div className="flex justify-center gap-6 mb-10">
      {[1, 2, 3].map(i => <Shimmer key={i} className="w-28 h-8" />)}
    </div>
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 p-5 border border-[#f0f0f0] rounded-sm">
          <Shimmer className="w-16 h-16 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Shimmer className="w-3/4 h-3" />
            <Shimmer className="w-1/2 h-3" />
          </div>
          <Shimmer className="w-16 h-3" />
        </div>
      ))}
    </div>
  </div>
);

// Admin dashboard skeleton — KPI cards, charts
export const DashboardSkeleton = () => (
  <div className="p-6 md:p-10">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="border border-[#f0f0f0] p-5 flex flex-col gap-3">
          <Shimmer className="w-20 h-3" />
          <Shimmer className="w-28 h-6" />
          <Shimmer className="w-16 h-3" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Shimmer className="w-full h-[250px]" />
      <Shimmer className="w-full h-[250px]" />
    </div>
  </div>
);

// Table rows skeleton — for admin lists
export const TableSkeleton = ({ rows = 6, cols = 4 }) => (
  <div className="flex flex-col gap-0">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 py-4 border-b border-[#f5f5f5]">
        {Array.from({ length: cols }).map((_, c) => (
          <Shimmer key={c} className="flex-1 h-3" />
        ))}
      </div>
    ))}
  </div>
);

// Order tracking skeleton
export const TrackingSkeleton = () => (
  <div className="flex flex-col items-center gap-6 py-10">
    <Shimmer className="w-48 h-4" />
    <div className="flex items-center gap-3 w-full max-w-xl">
      {[1, 2, 3, 4].map(i => (
        <React.Fragment key={i}>
          <Shimmer className="w-10 h-10 rounded-full shrink-0" />
          {i < 4 && <Shimmer className="flex-1 h-1" />}
        </React.Fragment>
      ))}
    </div>
    <Shimmer className="w-64 h-3 mt-4" />
    <Shimmer className="w-40 h-3" />
  </div>
);

// Reviews list skeleton
export const ReviewsSkeleton = ({ count = 3 }) => (
  <div className="flex flex-col gap-8">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border-b border-[#f0f0f0] pb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Shimmer className="w-24 h-3" />
          <Shimmer className="w-16 h-3" />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(s => <Shimmer key={s} className="w-3 h-3" />)}
        </div>
        <Shimmer className="w-full h-3" />
        <Shimmer className="w-2/3 h-3" />
      </div>
    ))}
  </div>
);

export default Shimmer;