import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowLeft, MessageCircle } from 'lucide-react';
import { SUPPORT_URL } from '../../utils/fragranceDiscovery';

export function ScentArt({ variant = 'bottle', color = '#c5ad80' }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`atelier-art atelier-art-${variant}`} viewBox="0 0 360 380" fill="none" aria-hidden="true">
    <defs><radialGradient id={`${id}-glow`}><stop stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient><linearGradient id={`${id}-glass`} x1="100" y1="120" x2="270" y2="310" gradientUnits="userSpaceOnUse"><stop stopColor="#fbf5dd" stopOpacity=".55" /><stop offset=".3" stopColor={color} stopOpacity=".1" /><stop offset="1" stopColor={color} stopOpacity=".65" /></linearGradient></defs>
    <circle cx="180" cy="190" r="175" fill={`url(#${id}-glow)`} /><circle cx="180" cy="190" r="140" stroke={color} strokeOpacity=".25" /><circle cx="180" cy="190" r="112" stroke={color} strokeOpacity=".14" />
    {variant === 'bottle' ? <g transform="rotate(-12 180 200)"><ellipse cx="183" cy="324" rx="82" ry="10" fill="#000" opacity=".16" /><rect x="139" y="68" width="80" height="53" rx="7" fill="#292b26" stroke={color} /><path d="M150 78h58M150 85h58M150 92h58" stroke={color} opacity=".5" /><rect x="153" y="120" width="51" height="18" fill={color} /><rect x="115" y="137" width="128" height="176" rx="23" fill={`url(#${id}-glass)`} stroke={color} /><path d="M127 159v124" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" /><rect x="133" y="182" width="92" height="82" rx="1" fill="#f2ead5" /><text x="179" y="208" textAnchor="middle" fill="#28271f" fontFamily="Georgia,serif" fontSize="10" letterSpacing="2">ONEELIXIR</text><path d="M158 220h42" stroke="#a79268" /><text x="179" y="239" textAnchor="middle" fill="#71654e" fontFamily="sans-serif" fontSize="6" letterSpacing="2">YOUR SIGNATURE</text></g> : variant === 'flower' ? <g stroke={color} strokeWidth="1.5">{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="180" cy="142" rx="32" ry="62" transform={`rotate(${i * 45} 180 190)`} fill={color} fillOpacity=".08" />)}<circle cx="180" cy="190" r="17" fill={color} fillOpacity=".5" /></g> : variant === 'wood' ? <g stroke={color} strokeWidth="1.4">{Array.from({ length: 7 }, (_, i) => <ellipse key={i} cx="180" cy="190" rx={22 + i * 13} ry={35 + i * 15} transform={`rotate(${i * 8} 180 190)`} />)}</g> : variant === 'sun' ? <g stroke={color} strokeWidth="1.5"><circle cx="180" cy="190" r="64" fill={color} fillOpacity=".13" />{Array.from({ length: 16 }, (_, i) => <path key={i} d="M180 107V86" transform={`rotate(${i * 22.5} 180 190)`} />)}<circle cx="180" cy="190" r="43" /></g> : <g stroke={color} strokeWidth="1.5"><path d="M180 74C180 156 156 190 78 190c78 0 102 34 102 116 0-82 24-116 102-116-78 0-102-34-102-116Z" fill={color} fillOpacity=".12" /><path d="m258 83 7 23 23 7-23 7-7 23-7-23-23-7 23-7Z" /></g>}
  </svg>;
}

export function DiscoveryLayout({ eyebrow, title, emphasis, description, children, art = false }) {
  return <main className="atelier-page">
    <header className={`atelier-page-hero ${art ? 'with-art' : ''}`}>
      <div className="atelier-page-hero-inner"><div><Link to="/collection" className="atelier-back"><ArrowLeft size={14} /> Back to the collection</Link><p className="atelier-eyebrow">{eyebrow}</p><h1>{title}<br /><em>{emphasis}</em></h1><p className="atelier-lead">{description}</p></div>{art && <ScentArt />}</div>
      <div className="atelier-hero-foot"><span>ONEELIXIR / THE ART OF FINDING YOUR SCENT</span><span>EXPLORE ↓</span></div>
    </header>
    <div className="atelier-page-content">{children}</div>
  </main>;
}

export function SupportCard() {
  return <aside className="atelier-support-card"><div><span className="atelier-eyebrow">A HUMAN TOUCH</span><h2>Let’s talk <em>fragrance.</em></h2><p>Choosing a scent or checking an order? We’re here to help.</p></div><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="atelier-button"><MessageCircle size={17} /> WhatsApp support <ArrowUpRight size={16} /></a></aside>;
}
