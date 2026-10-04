import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const NavSidebar = ({ isOpen, onClose, user, onLogout }) => {
  const sidebarRef = useRef(null);

  // Close sidebar on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Focus trap for sidebar
  useEffect(() => {
    if (!isOpen || !sidebarRef.current) return;
    const container = sidebarRef.current;
    const focusable = container.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();

    const trap = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    container.addEventListener('keydown', trap);
    return () => container.removeEventListener('keydown', trap);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full h-screen z-[2000] flex"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Sidebar Content */}
      <div ref={sidebarRef} className="w-[300px] bg-[#111] h-full px-10 py-10 flex flex-col z-[2001]">
        <div className="mb-12">
          <button
            aria-label="Close menu"
            className="bg-transparent border-none cursor-pointer p-0 text-white"
            onClick={onClose}
          >
            <X size={28} />
          </button>
        </div>

        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          <li>
            <Link
              to="/collection"
              className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
              onClick={onClose}
            >
              THE COLLECTION
            </Link>
          </li>

          <li>
            <Link
              to="/bundles"
              className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
              onClick={onClose}
            >
              BUNDLES
            </Link>
          </li>

          {/* Mobile Wishlist */}
          <li className="md:hidden">
            <Link
              to="/wishlist"
              className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
              onClick={onClose}
            >
              WISHLIST
            </Link>
          </li>

          {/* Mobile Track Order */}
          <li className="md:hidden">
            <Link
              to="/track"
              className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
              onClick={onClose}
            >
              TRACK ORDER
            </Link>
          </li>

          {!user ? (
            <>
              <li className="md:hidden">
                <Link
                  to="/signin"
                  className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
                  onClick={onClose}
                >
                  SIGN IN
                </Link>
              </li>
              <li className="md:hidden">
                <Link
                  to="/signup"
                  className="block no-underline bg-red-500 text-white text-sm font-bold tracking-sm py-4 text-center mt-2"
                  onClick={onClose}
                >
                  REGISTER
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className="md:hidden">
                <Link
                  to="/account"
                  className="block no-underline text-white text-sm font-bold tracking-sm py-4 border-b border-[#222]"
                  onClick={onClose}
                >
                  MY PROFILE
                </Link>
              </li>
              <li>
                <button
                  onClick={onLogout}
                  className="w-full text-left bg-transparent border-none text-white text-sm font-bold tracking-sm py-4 border-b border-[#222] cursor-pointer"
                >
                  LOGOUT
                </button>
              </li>
            </>
          )}
        </ul>

        {/* Mobile Social Links in Sidebar */}
        <div className="mt-auto pt-8 flex items-center gap-5 md:hidden">
          <a
            href="https://www.facebook.com/people/OneElixir/61586827432727/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-[#888] hover:text-[#1877F2] transition-colors"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
          </a>
          <a
            href="https://www.instagram.com/one_elixir/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-[#888] hover:text-[#E1306C] transition-colors"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>
          <a
            href="https://wa.me/8801636400363"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="text-[#888] hover:text-[#25D366] transition-colors"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
    </div>
  );
};

export default NavSidebar;
