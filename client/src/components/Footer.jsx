import { memo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const NAV_LINKS = [
  { label: 'OVERVIEW', action: 'top' },
  { label: 'CORE VALUES', hash: 'values' },
  { label: 'COLLECTIONS', hash: 'collections' },
  { label: 'CRAFTSMANSHIP', hash: 'craftsmanship' },
  { label: 'NEW ARRIVALS', hash: 'new-arrivals' },
  { label: 'CONTACT', hash: 'contact' },
  { label: 'OFFICIAL PAGE', href: 'https://www.facebook.com/profile.php?id=61586827432727' },
];

const Footer = memo(function Footer() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [settings, setSettings] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/api/hero-settings`)
      .then(res => setSettings(res.data))
      .catch(() => { });
  }, [API_URL]);

  const logoImage = settings?.footerLogoImage || '';
  const tagline = settings?.footerTagline || 'Bespoke fragrances, crafted in small batches in Bangladesh. Offering accessible luxury and differentiated olfactory craftsmanship.';
  const copyright = settings?.footerCopyright || '\u00a9 OneElixir. All rights reserved.';

  return (
    <>
      <style>{`
        .oe-footer {
          width: 100%;
          background: #000;
          padding: 56px 24px 28px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .oe-footer-logo {
          display: block;
          max-height: 44px;
          width: auto;
          max-width: 220px;
          object-fit: contain;
          margin-bottom: 28px;
        }
        .oe-footer-tagline {
          font-family: Inter, sans-serif;
          font-size: 15px;
          color: rgba(255,255,255,0.55);
          text-align: center;
          max-width: 540px;
          line-height: 1.8;
          margin: 0 0 36px;
        }
        .oe-footer-nav {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px 28px;
          list-style: none;
          padding: 0;
          margin: 0 0 36px;
        }
        .oe-footer-nav a {
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2.5px;
          color: rgba(255,255,255,0.60);
          text-decoration: none;
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .oe-footer-nav a:hover { color: #fff; }
        .oe-footer-divider {
          width: 100%;
          max-width: 860px;
          height: 1px;
          background: rgba(255,255,255,0.10);
          margin: 0 0 22px;
        }
        .oe-footer-copy {
          font-family: Inter, sans-serif;
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          text-align: center;
          letter-spacing: 0.5px;
          margin: 0;
        }
        @media (max-width: 600px) {
          .oe-footer { padding: 44px 20px 24px; }
          .oe-footer-nav { gap: 10px 20px; }
        }
      `}</style>

      <footer className="oe-footer">

        {/* Logo image — uploaded via admin panel */}
        {logoImage ? (
          <img src={logoImage} alt="OneElixir" className="oe-footer-logo" />
        ) : (
          /* Fallback text logo if no image uploaded yet */
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '6px',
            color: '#fff',
            textTransform: 'uppercase',
            marginBottom: '28px',
            display: 'block',
          }}>
            ONE-ELIXIR
          </span>
        )}

        {/* Tagline */}
        <p className="oe-footer-tagline">{tagline}</p>

        {/* Navigation links */}
        <ul className="oe-footer-nav">
          {NAV_LINKS.map(({ label, to, href, action, hash }) => (
            <li key={label}>
              {action === 'top' ? (
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {label}
                </a>
              ) : href ? (
                <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>
              ) : hash ? (
                <a
                  href={`#${hash}`}
                  onClick={e => {
                    e.preventDefault();
                    const el = document.getElementById(hash);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else navigate(`/#${hash}`);
                  }}
                >
                  {label}
                </a>
              ) : (
                <Link to={to}>{label}</Link>
              )}
            </li>
          ))}
        </ul>

        <div className="oe-footer-divider" />

        {/* Copyright */}
        <p className="oe-footer-copy">{copyright}</p>

      </footer>
    </>
  );
});

export default Footer;
