import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ArrowUpRight, ChevronDown, Heart, UserRound, MessageCircle, LogOut } from 'lucide-react';
import { SUPPORT_URL } from '../../utils/fragranceDiscovery';
import '../../styles/storefront.css';

const groups = [
  { name: 'Shop', number: '01', links: [
    ['All fragrances', '/collection'], ['New arrivals', '/collection?sort=newest'], ['Best rated', '/collection?sort=rating'], ['Bundles', '/bundles'],
  ] },
  { name: 'Discover', number: '02', links: [
    ['Shop by scent', '/scent-guide'], ['Find your fragrance', '/fragrance-quiz', 'THE SCENT EDIT'],
  ] },
  { name: 'Help', number: '03', links: [
    ['Track your order', '/track'], ['Delivery & returns', '/delivery-returns'], ['Frequently asked', '/faq'],
  ] },
  { name: 'About', number: '04', links: [['Our story', '/our-story']] },
];

const NavSidebar = ({ isOpen, onClose, user, onLogout }) => {
  const dialogRef = useRef(null);
  const location = useLocation();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);
  return (
    <dialog ref={dialogRef} id="storefront-menu" className="atelier-menu" aria-labelledby="atelier-menu-title"
      onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="atelier-menu-shell">
        <div className="atelier-menu-main">
          <header className="atelier-menu-header">
            <Link to="/" onClick={onClose} className="atelier-wordmark">ONE<span>ELIXIR</span><small>The Air You Choose to Wear</small></Link>
            <button type="button" onClick={onClose} className="atelier-icon-button" aria-label="Close menu" autoFocus><X size={20} /></button>
          </header>
          <div className="atelier-menu-intro"><span className="atelier-eyebrow">A WORLD OF SCENT</span><h2 id="atelier-menu-title">Follow your<br /><em>instinct.</em></h2></div>
          <nav aria-label="Storefront navigation" className="atelier-menu-groups">
            {groups.map((group, index) => <details key={group.name} className="atelier-menu-group" open={index < 2 || undefined}>
              <summary><span className="atelier-menu-number">{group.number}</span><span>{group.name}</span><ChevronDown size={16} /></summary>
              <div className="atelier-menu-links">{group.links.map(([label, to, badge]) => <Link key={to} to={to} onClick={onClose}
                aria-current={`${location.pathname}${location.search}` === to ? 'page' : undefined}>
                <span>{label}{badge && <small>{badge}</small>}</span><ArrowUpRight size={15} aria-hidden="true" />
              </Link>)}</div>
            </details>)}
          </nav>
          <div className="atelier-menu-account">
            <Link to="/wishlist" onClick={onClose}><Heart size={15} /> Saved scents</Link>
            <Link to={user ? '/account' : '/signin'} onClick={onClose}><UserRound size={15} />{user ? 'My account' : 'Sign in'}</Link>
            {!user && <Link to="/signup" onClick={onClose}>Join OneElixir <ArrowUpRight size={14} /></Link>}
            {user && <button type="button" onClick={onLogout}><LogOut size={14} /> Sign out</button>}
          </div>
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" onClick={onClose} className="atelier-menu-support"><MessageCircle size={17} /><span>Need a little guidance?<strong>Talk to us on WhatsApp</strong></span><ArrowUpRight size={17} /></a>
          <div className="atelier-menu-social"><span>BANGLADESH · ONEELIXIR</span><a href="https://www.instagram.com/one_elixir/" target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href="https://www.facebook.com/people/OneElixir/61586827432727/" target="_blank" rel="noopener noreferrer">Facebook ↗</a></div>
        </div>
      </div>
    </dialog>
  );
};

export default NavSidebar;
