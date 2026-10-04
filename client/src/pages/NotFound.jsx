import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, ShoppingBag } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

const NotFound = () => {
  usePageMeta('Page Not Found | OneElixir', 'The page you requested could not be found.');

  return (
    <main className="min-h-[75vh] flex flex-col items-center justify-center text-center px-6 py-20 bg-white">
      <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-8 text-black">
        <Compass size={30} strokeWidth={1.25} />
      </div>

      <p className="text-[11px] font-bold tracking-[4px] text-gray-400 mb-2 uppercase">
        Error 404
      </p>

      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extralight tracking-[8px] text-black mb-4">
        PAGE NOT FOUND
      </h1>

      <div className="w-12 h-px bg-black my-4" />

      <p className="max-w-md text-xs sm:text-sm text-gray-500 tracking-wide leading-relaxed mb-10">
        The fragrance, collection, or page you are looking for has been moved, renamed, or is currently unavailable.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 px-8 py-3.5 border border-black bg-black text-white text-xs font-bold tracking-[2px] hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={14} />
          BACK TO HOME
        </Link>
        <Link
          to="/collection"
          className="flex items-center justify-center gap-2 px-8 py-3.5 border border-black text-black bg-transparent text-xs font-bold tracking-[2px] hover:bg-black hover:text-white transition-colors"
        >
          <ShoppingBag size={14} />
          EXPLORE COLLECTION
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
