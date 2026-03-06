import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, Heart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const TABS = [
  { path: '/',           icon: Home,        label: 'HOME' },
  { path: '/collection', icon: Search,      label: 'SHOP' },
  { path: '/cart',       icon: ShoppingBag, label: 'CART' },
  { path: '/wishlist',   icon: Heart,       label: 'SAVED' },
  { path: '/account',    icon: User,        label: 'YOU' },
];

const MobileTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useCart();
  const { user } = useUser();
  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[999] bg-white border-t border-[#eee] flex md:hidden safe-bottom">
      {TABS.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
        const target = path === '/account' && !user ? '/signin' : path;

        return (
          <button
            key={path}
            onClick={() => navigate(target)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 bg-transparent border-none cursor-pointer transition-colors ${
              active ? 'text-black' : 'text-[#aaa]'
            }`}
          >
            <div className="relative">
              <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
              {path === '/cart' && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-black text-white text-[8px] font-bold rounded-full w-[16px] h-[16px] flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </div>
            <span className={`text-[9px] tracking-[1px] ${active ? 'font-bold' : ''}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
