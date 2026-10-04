
/**
 * Reusable Pagination component
 * @param {{ page: number, totalPages: number, onPageChange: (nextPage: number) => void }} props
 */
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-4 py-2 border border-[#ddd] text-xs font-bold tracking-wider disabled:opacity-30 hover:border-black transition-colors cursor-pointer bg-white"
      >
        ← PREV
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onClick={() => onPageChange(n)}
          className={`w-9 h-9 text-xs font-bold border transition-colors cursor-pointer ${
            n === page
              ? 'bg-black text-white border-black'
              : 'bg-white border-[#ddd] hover:border-black'
          }`}
        >
          {n}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-4 py-2 border border-[#ddd] text-xs font-bold tracking-wider disabled:opacity-30 hover:border-black transition-colors cursor-pointer bg-white"
      >
        NEXT →
      </button>
    </div>
  );
};

export default Pagination;
