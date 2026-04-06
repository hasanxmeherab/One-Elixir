import React from 'react';
import { BarChart3, Plus, Check } from 'lucide-react';
import { useComparison } from '../context/ComparisonContext';

const CompareButton = ({ product, showCount = true }) => {
  const { addToComparison, removeFromComparison, isInComparison, comparisonCount } = useComparison();
  const inComparison = isInComparison(product._id);

  const handleToggleComparison = () => {
    if (inComparison) {
      removeFromComparison(product._id);
    } else {
      const added = addToComparison(product);
      if (!added) {
        // Optional: Show toast notification that max 4 products reached
        console.log('Max 4 products in comparison');
      }
    }
  };

  return (
    <button
      onClick={handleToggleComparison}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        inComparison
          ? 'bg-purple-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={inComparison ? 'Remove from comparison' : 'Add to comparison'}
    >
      {inComparison ? (
        <>
          <Check size={16} />
          <span>In Comparison</span>
        </>
      ) : (
        <>
          <BarChart3 size={16} />
          <span>Compare</span>
        </>
      )}
      {showCount && comparisonCount > 0 && (
        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold background-purple-200 rounded-full">
          {comparisonCount}
        </span>
      )}
    </button>
  );
};

export default CompareButton;
