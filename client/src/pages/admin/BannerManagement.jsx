import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { ImagePlus, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────
   Default hero content (mirrors the server-side defaults)
───────────────────────────────────────────────────────── */
const DEFAULT_HERO = {
  brandLine:   'ONEELIXIR',
  headline1:   'Premium',
  headline2:   'Perfume Oils',
  tagline:     'Inspired Scents. Lasting Impressions.',
  description: 'OneElixir is a Bangladesh-based fragrance brand offering bespoke perfumes and scent oils crafted with artistic precision. Explore olfactory profiles ranging from fresh and floral to gourmand and resinous woody in convenient, accessible sizes.',
  ctaText:     'EXPLORE COLLECTION',
  ctaLink:     '/collection',
  features: [
    { title: 'Small Batch',        subtitle: 'Formulated in limited, curated runs' },
    { title: 'Concentrated Oil',   subtitle: 'Long-lasting & skin friendly' },
    { title: 'Diverse Profiles',   subtitle: 'From fresh citrus to rich dark oud' },
    { title: 'Accessible Formats', subtitle: '3.5 ml vials & 30 ml rollers' },
  ],
  storyLabel:      'SMALL BATCH ARTISANSHIP',
  storyHeading:    'Crafted with Purpose & Resinous Depth',
  storyPara1:      'OneElixir is a Bangladesh-based fragrance brand offering bespoke perfumes and scent oils crafted in small batches. The brand provides a diverse array of olfactory profiles—ranging from fresh and floral to gourmand and woody—in convenient, accessible sizes.',
  storyPara2:      'Designed with modern lifestyle trends and practical utility in mind, our concentrated formulas rest seamlessly against the skin, delivering long-lasting personal scent projection wherever your day leads.',
  storyImageRight: '',
  storyImageLeft:  '',
  storyImageBot:   '',
  // Contact / Connect With Us
  contactLabel:          'CONNECT WITH US',
  contactHeading:        'Experience OneElixir',
  contactDesc:           'Have questions about finding your bespoke scent profile or placing a custom fragrance order? Our team is welcoming, helpful, and ready to guide your olfactory journey.',
  contactStoreText:       '',
  contactStoreUrl:       '',
  contactLocation:       'Crafted & Based in Bangladesh',
  contactBullet:         'Bespoke 3.5 ml & 30 ml Roller Editions Available',
  contactImage:          '',
  contactInquiryHeading: 'Direct Inquiries',
  contactInquiryDesc:    'Connect directly via WhatsApp for personalized scent recommendations.',
  contactWhatsApp:       'https://wa.me/8801XXXXXXXXX',
  // Footer
  footerLogoImage: '',
  footerTagline:   'Bespoke fragrances, crafted in small batches in Bangladesh. Offering accessible luxury and differentiated olfactory craftsmanship.',
  footerCopyright: '\u00a9 OneElixir. All rights reserved.',
};

/* ─────────────────────────────────────────────────────────
   Shared field styles
───────────────────────────────────────────────────────── */
const inputCls = 'w-full p-3 border border-[#ddd] outline-none text-sm rounded bg-white';
const labelCls = 'text-xs font-bold tracking-wider text-[#555] mb-1 block';

const BannerManagement = ({ isAdmin }) => {
  const toast = useToast();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  /* ── Banner slides ── */
  const [banners,   setBanners]   = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [uploading, setUploading] = useState(false);
  const [bannerForm, setBannerForm] = useState({ imageUrl: '' });
  const timerRef = useRef(null);

  /* ── Hero settings ── */
  const [hero, setHero]         = useState(DEFAULT_HERO);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroOpen,   setHeroOpen]   = useState(true);   // accordion open by default

  /* ── Story section ── */
  const [storyOpen,       setStoryOpen]       = useState(false);
  const [uploadingRight,  setUploadingRight]  = useState(false);
  const [uploadingLeft,   setUploadingLeft]   = useState(false);
  const [uploadingBot,    setUploadingBot]    = useState(false);

  /* ── Contact / Connect With Us section ── */
  const [contactOpen,    setContactOpen]    = useState(false);
  const [uploadingContact, setUploadingContact] = useState(false);

  /* ── Footer section ── */
  const [footerOpen,        setFooterOpen]        = useState(false);
  const [uploadingFooterLogo, setUploadingFooterLogo] = useState(false);

  /* ─── Cloudinary helper ─── */
  const optimizeCloudinaryUrl = (url, w = 1920) =>
    url?.includes('cloudinary.com')
      ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`)
      : url;

  /* ─── Fetch banners ─── */
  const fetchBanners = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/banners`);
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch { setBanners([]); }
  };

  /* ─── Fetch hero settings ─── */
  const fetchHero = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/hero-settings`);
      const localPlaceholder = localStorage.getItem('oneelixir_contact_placeholder') || '';
      const localUrl = localStorage.getItem('oneelixir_contact_url') || '';
      setHero({
        ...DEFAULT_HERO,
        ...res.data,
        contactStoreText: res.data.contactStoreText || localPlaceholder,
        contactStoreUrl: res.data.contactStoreUrl || localUrl,
      });
    } catch { /* keep defaults */ }
  };

  useEffect(() => { fetchBanners(); fetchHero(); }, []);

  /* ─── Auto-slide timer ─── */
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (banners.length > 0 ? (c + 1) % banners.length : 0));
    }, 5000);
  };

  useEffect(() => {
    if (!isAdmin && banners.length > 0) startTimer();
    return () => clearInterval(timerRef.current);
  }, [isAdmin, banners.length]);

  const nextSlide = () => { setCurrent(c => (c === banners.length - 1 ? 0 : c + 1)); if (!isAdmin) startTimer(); };
  const prevSlide = () => { setCurrent(c => (c === 0 ? banners.length - 1 : c - 1)); if (!isAdmin) startTimer(); };

  /* ─── Upload banner image ─── */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    setUploading(true);
    try {
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, fd);
      setBannerForm({ imageUrl: optimizeCloudinaryUrl(res.data.secure_url, 1920) });
      toast.success('Image uploaded!');
    } catch { toast.error('Upload failed.'); }
    finally { setUploading(false); }
  };

  /* ─── Publish banner ─── */
  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    if (!bannerForm.imageUrl) return toast.warning('Please upload an image first.');
    try {
      await adminAxios.post(`${API_URL}/api/banners`, bannerForm);
      setBannerForm({ imageUrl: '' });
      fetchBanners();
      toast.success('Banner published!');
    } catch { toast.error('Failed to save banner.'); }
  };

  /* ─── Delete banner ─── */
  const deleteBanner = async (id) => {
    if (!window.confirm('Remove this banner?')) return;
    await adminAxios.delete(`${API_URL}/api/banners/${id}`);
    fetchBanners();
  };

  /* ─── Save hero settings ─── */
  const saveHero = async () => {
    setHeroSaving(true);
    try {
      if (hero.contactStoreText) {
        localStorage.setItem('oneelixir_contact_placeholder', hero.contactStoreText);
      } else {
        localStorage.removeItem('oneelixir_contact_placeholder');
      }
      if (hero.contactStoreUrl) {
        localStorage.setItem('oneelixir_contact_url', hero.contactStoreUrl);
      } else {
        localStorage.removeItem('oneelixir_contact_url');
      }
      await adminAxios.put(`${API_URL}/api/hero-settings`, hero);
      toast.success('Hero content saved!');
    } catch { toast.error('Failed to save hero settings.'); }
    finally { setHeroSaving(false); }
  };

  /* ─── Feature box helpers ─── */
  const updateFeature = (i, field, val) => {
    const updated = hero.features.map((f, idx) => idx === i ? { ...f, [field]: val } : f);
    setHero({ ...hero, features: updated });
  };

  /* ─── Story image upload helper ─── */
  const handleStoryUpload = async (e, slot) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    const setLoading = slot === 'storyImageRight' ? setUploadingRight
                     : slot === 'storyImageLeft'  ? setUploadingLeft
                     : setUploadingBot;
    setLoading(true);
    try {
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, fd);
      const url = optimizeCloudinaryUrl(res.data.secure_url, 1200);
      setHero(prev => ({ ...prev, [slot]: url }));
      toast.success('Image uploaded!');
    } catch { toast.error('Upload failed.'); }
    finally { setLoading(false); }
  };

  /* ─── Contact image upload helper ─── */
  const handleContactUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    setUploadingContact(true);
    try {
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, fd);
      const url = optimizeCloudinaryUrl(res.data.secure_url, 800);
      setHero(prev => ({ ...prev, contactImage: url }));
      toast.success('Image uploaded!');
    } catch { toast.error('Upload failed.'); }
    finally { setUploadingContact(false); }
  };

  /* ─── Footer logo upload helper ─── */
  const handleFooterLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    setUploadingFooterLogo(true);
    try {
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, fd);
      const url = optimizeCloudinaryUrl(res.data.secure_url, 400);
      setHero(prev => ({ ...prev, footerLogoImage: url }));
      toast.success('Logo uploaded!');
    } catch { toast.error('Upload failed.'); }
    finally { setUploadingFooterLogo(false); }
  };

  /* ══════════════════════════════════════════════════════
     ADMIN VIEW
  ══════════════════════════════════════════════════════ */
  if (isAdmin) {
    return (
      <div className="p-4 md:p-10 max-w-4xl">
        <h3 className="tracking-[2px] font-bold mb-8 text-xl">HERO / BANNER MANAGEMENT</h3>

        {/* ── Section 1: Background Banner Images ── */}
        <div className="mb-10">
          <h4 className="font-bold tracking-widest text-sm mb-4 text-[#555]">① BACKGROUND IMAGES</h4>

          <form onSubmit={handleBannerSubmit} className="flex flex-col gap-4 bg-[#f9f9f9] p-6 border border-[#eee] rounded-lg mb-6">
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded cursor-pointer p-6 transition-colors ${bannerForm.imageUrl ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black hover:bg-gray-50'}`}>
              <ImagePlus size={22} className="text-[#888]" />
              <span className="text-xs font-bold tracking-wider text-black">
                {uploading ? 'UPLOADING…' : bannerForm.imageUrl ? 'IMAGE READY' : 'CLICK TO UPLOAD HERO IMAGE'}
              </span>
              <span className="text-[10px] text-[#aaa] text-center">
                {uploading ? 'Please wait…' : bannerForm.imageUrl ? '✓ Uploaded' : 'JPG, PNG, WEBP — recommended 1920×900px (full-screen hero)'}
              </span>
              <input type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
            </label>

            <button
              type="submit" disabled={uploading || !bannerForm.imageUrl}
              className="p-3 bg-black text-white font-bold rounded cursor-pointer hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              PUBLISH IMAGE
            </button>
          </form>

          {/* Existing banners */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {banners.map(b => (
              <div key={b._id} className="border border-[#eee] bg-white rounded overflow-hidden">
                <img src={b.imageUrl} alt="preview" className="w-full h-[80px] object-cover" />
                <button onClick={() => deleteBanner(b._id)}
                  className="w-full text-red-500 border-none bg-transparent cursor-pointer py-1.5 text-xs hover:opacity-70 transition-opacity">
                  REMOVE
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 2: Hero Text Content ── */}
        <div className="bg-[#f9f9f9] border border-[#eee] rounded-lg overflow-hidden mb-4">
          {/* Accordion header */}
          <button
            onClick={() => setHeroOpen(o => !o)}
            className="w-full flex items-center justify-between p-5 bg-white border-none cursor-pointer text-left"
          >
            <span className="font-bold tracking-widest text-sm text-[#555]">② HERO TEXT CONTENT</span>
            {heroOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {heroOpen && (
            <div className="p-6 flex flex-col gap-5 border-t border-[#eee]">

              {/* Brand line */}
              <div>
                <label className={labelCls}>BRAND LINE (e.g. ONEELIXIR)</label>
                <input className={inputCls} value={hero.brandLine}
                  onChange={e => setHero({ ...hero, brandLine: e.target.value })} />
              </div>

              {/* Headlines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>HEADLINE LINE 1 (white)</label>
                  <input className={inputCls} value={hero.headline1}
                    onChange={e => setHero({ ...hero, headline1: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>HEADLINE LINE 2 (crimson-amber gradient)</label>
                  <input className={inputCls} value={hero.headline2}
                    onChange={e => setHero({ ...hero, headline2: e.target.value })} />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className={labelCls}>TAGLINE (italic, under headline)</label>
                <input className={inputCls} value={hero.tagline}
                  onChange={e => setHero({ ...hero, tagline: e.target.value })} />
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>DESCRIPTION PARAGRAPH</label>
                <textarea
                  className={`${inputCls} min-h-[100px] resize-y`}
                  value={hero.description}
                  onChange={e => setHero({ ...hero, description: e.target.value })}
                />
              </div>

              {/* CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>BUTTON TEXT</label>
                  <input className={inputCls} value={hero.ctaText}
                    onChange={e => setHero({ ...hero, ctaText: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>BUTTON LINK</label>
                  <input className={inputCls} value={hero.ctaLink}
                    onChange={e => setHero({ ...hero, ctaLink: e.target.value })} />
                </div>
              </div>

              {/* Feature boxes */}
              <div>
                <label className={labelCls}>FEATURE BOXES (4 boxes at the bottom)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {hero.features.map((f, i) => (
                    <div key={i} className="bg-white border border-[#e5e5e5] rounded p-3 flex flex-col gap-2">
                      <span className="text-[10px] text-[#aaa] font-bold tracking-wider">BOX {i + 1}</span>
                      <input
                        placeholder="Title"
                        className={inputCls}
                        value={f.title}
                        onChange={e => updateFeature(i, 'title', e.target.value)}
                      />
                      <input
                        placeholder="Subtitle"
                        className={inputCls}
                        value={f.subtitle}
                        onChange={e => updateFeature(i, 'subtitle', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={saveHero}
                disabled={heroSaving}
                className="flex items-center justify-center gap-2 p-4 bg-black text-white font-bold rounded cursor-pointer hover:bg-gray-800 transition-colors disabled:opacity-50 mt-2"
              >
                <Save size={16} />
                {heroSaving ? 'SAVING…' : 'SAVE HERO CONTENT'}
              </button>
            </div>
          )}
        </div>

        {/* ── Section 3: Story Section ── */}
        <div className="bg-[#f9f9f9] border border-[#eee] rounded-lg overflow-hidden mb-4">
          {/* Accordion header */}
          <button
            onClick={() => setStoryOpen(o => !o)}
            className="w-full flex items-center justify-between p-5 bg-white border-none cursor-pointer text-left"
          >
            <span className="font-bold tracking-widest text-sm text-[#555]">📸 STORY SECTION — "Crafted with Purpose"</span>
            {storyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {storyOpen && (
            <div className="p-6 flex flex-col gap-5 border-t border-[#eee]">

              {/* Label */}
              <div>
                <label className={labelCls}>SECTION LABEL (e.g. SMALL BATCH ARTISANSHIP)</label>
                <input className={inputCls} value={hero.storyLabel || ''}
                  onChange={e => setHero({ ...hero, storyLabel: e.target.value })} />
              </div>

              {/* Heading */}
              <div>
                <label className={labelCls}>SECTION HEADING</label>
                <input className={inputCls} value={hero.storyHeading || ''}
                  onChange={e => setHero({ ...hero, storyHeading: e.target.value })} />
              </div>

              {/* Paragraphs */}
              <div>
                <label className={labelCls}>PARAGRAPH 1</label>
                <textarea
                  className={`${inputCls} min-h-[90px] resize-y`}
                  value={hero.storyPara1 || ''}
                  onChange={e => setHero({ ...hero, storyPara1: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>PARAGRAPH 2</label>
                <textarea
                  className={`${inputCls} min-h-[90px] resize-y`}
                  value={hero.storyPara2 || ''}
                  onChange={e => setHero({ ...hero, storyPara2: e.target.value })}
                />
              </div>

              {/* Image uploads */}
              <div>
                <label className={labelCls}>STORY IMAGES</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">

                  {/* Right large image */}
                  {[
                    { slot: 'storyImageRight', label: 'TOP RIGHT IMAGE (product)', uploading: uploadingRight },
                    { slot: 'storyImageLeft',  label: 'BOTTOM LEFT IMAGE (ingredient)', uploading: uploadingLeft },
                    { slot: 'storyImageBot',   label: 'BOTTOM RIGHT IMAGE (florals)', uploading: uploadingBot },
                  ].map(({ slot, label: imgLabel, uploading: upl }) => (
                    <div key={slot} className="flex flex-col gap-2">
                      <span className="text-[10px] text-[#aaa] font-bold tracking-wider">{imgLabel}</span>
                      {hero[slot] && (
                        <img src={hero[slot]} alt={imgLabel} className="w-full h-[100px] object-cover rounded border border-[#eee]" />
                      )}
                      <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded cursor-pointer p-4 transition-colors ${hero[slot] ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black hover:bg-gray-50'}`}>
                        <ImagePlus size={18} className="text-[#888]" />
                        <span className="text-[10px] font-bold tracking-wider text-black text-center">
                          {upl ? 'UPLOADING…' : hero[slot] ? 'REPLACE IMAGE' : 'CLICK TO UPLOAD'}
                        </span>
                        <input type="file" onChange={e => handleStoryUpload(e, slot)} accept="image/*" className="hidden" />
                      </label>
                      {hero[slot] && (
                        <button
                          onClick={() => setHero(prev => ({ ...prev, [slot]: '' }))}
                          className="text-xs text-red-500 border-none bg-transparent cursor-pointer hover:opacity-70"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={saveHero}
                disabled={heroSaving}
                className="flex items-center justify-center gap-2 p-4 bg-black text-white font-bold rounded cursor-pointer hover:bg-gray-800 transition-colors disabled:opacity-50 mt-2"
              >
                <Save size={16} />
                {heroSaving ? 'SAVING…' : 'SAVE STORY SECTION'}
              </button>
            </div>
          )}
        </div>

        {/* ── Section 4: Connect With Us ── */}
        <div className="bg-[#f9f9f9] border border-[#eee] rounded-lg overflow-hidden mb-4">
          <button
            onClick={() => setContactOpen(o => !o)}
            className="w-full flex items-center justify-between p-5 bg-white border-none cursor-pointer text-left"
          >
            <span className="font-bold tracking-widest text-sm text-[#555]">📞 CONNECT WITH US SECTION</span>
            {contactOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {contactOpen && (
            <div className="p-6 flex flex-col gap-5 border-t border-[#eee]">

              {/* Label */}
              <div>
                <label className={labelCls}>SECTION LABEL (e.g. CONNECT WITH US)</label>
                <input className={inputCls} value={hero.contactLabel || ''}
                  onChange={e => setHero({ ...hero, contactLabel: e.target.value })} />
              </div>

              {/* Heading */}
              <div>
                <label className={labelCls}>MAIN HEADING</label>
                <input className={inputCls} value={hero.contactHeading || ''}
                  onChange={e => setHero({ ...hero, contactHeading: e.target.value })} />
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>DESCRIPTION PARAGRAPH</label>
                <textarea className={`${inputCls} min-h-[90px] resize-y`}
                  value={hero.contactDesc || ''}
                  onChange={e => setHero({ ...hero, contactDesc: e.target.value })} />
              </div>

              {/* Info bullets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>🌐 OFFICIAL PAGE DISPLAY TEXT (PLACEHOLDER)</label>
                    <input className={inputCls} placeholder="OneElixir"
                      value={hero.contactStoreText || ''}
                      onChange={e => setHero({ ...hero, contactStoreText: e.target.value })} />
                    <p className="text-[11px] text-gray-400 mt-1">Placeholder text displayed on the site</p>
                  </div>
                  <div>
                    <label className={labelCls}>🔗 OFFICIAL PAGE REDIRECT LINK (URL)</label>
                    <input className={inputCls} placeholder="https://example.com/your-page"
                      value={hero.contactStoreUrl || ''}
                      onChange={e => setHero({ ...hero, contactStoreUrl: e.target.value })} />
                    <p className="text-[11px] text-gray-400 mt-1">Full URL opened when clicking the placeholder</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>📍 LOCATION TEXT</label>
                    <input className={inputCls} placeholder="Crafted & Based in Bangladesh"
                      value={hero.contactLocation || ''}
                      onChange={e => setHero({ ...hero, contactLocation: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>✦ BULLET POINT</label>
                    <input className={inputCls} placeholder="Bespoke 3.5 ml & 30 ml Roller Editions"
                      value={hero.contactBullet || ''}
                      onChange={e => setHero({ ...hero, contactBullet: e.target.value })} />
                  </div>
                </div>

              {/* Right panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>INQUIRY HEADING</label>
                  <input className={inputCls} placeholder="Direct Inquiries"
                    value={hero.contactInquiryHeading || ''}
                    onChange={e => setHero({ ...hero, contactInquiryHeading: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>WHATSAPP LINK</label>
                  <input className={inputCls} placeholder="https://wa.me/8801XXXXXXXXX"
                    value={hero.contactWhatsApp || ''}
                    onChange={e => setHero({ ...hero, contactWhatsApp: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelCls}>INQUIRY DESCRIPTION</label>
                <input className={inputCls} placeholder="Connect directly via WhatsApp..."
                  value={hero.contactInquiryDesc || ''}
                  onChange={e => setHero({ ...hero, contactInquiryDesc: e.target.value })} />
              </div>

              {/* Product image upload */}
              <div>
                <label className={labelCls}>RIGHT PANEL IMAGE (product photo)</label>
                {hero.contactImage && (
                  <img src={hero.contactImage} alt="contact preview" className="w-[120px] h-[120px] object-cover rounded border border-[#eee] mb-2" />
                )}
                <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded cursor-pointer p-4 transition-colors ${hero.contactImage ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black hover:bg-gray-50'}`}>
                  <ImagePlus size={18} className="text-[#888]" />
                  <span className="text-[10px] font-bold tracking-wider text-black text-center">
                    {uploadingContact ? 'UPLOADING…' : hero.contactImage ? 'REPLACE IMAGE' : 'CLICK TO UPLOAD'}
                  </span>
                  <input type="file" onChange={handleContactUpload} accept="image/*" className="hidden" />
                </label>
                {hero.contactImage && (
                  <button onClick={() => setHero(prev => ({ ...prev, contactImage: '' }))}
                    className="text-xs text-red-500 border-none bg-transparent cursor-pointer hover:opacity-70 mt-1">
                    Remove image
                  </button>
                )}
              </div>

              {/* Save */}
              <button
                onClick={saveHero}
                disabled={heroSaving}
                className="flex items-center justify-center gap-2 p-4 bg-black text-white font-bold rounded cursor-pointer hover:bg-gray-800 transition-colors disabled:opacity-50 mt-2"
              >
                <Save size={16} />
                {heroSaving ? 'SAVING…' : 'SAVE CONNECT SECTION'}
              </button>
            </div>
          )}
        </div>

        {/* ── Section 5: Footer ── */}
        <div className="bg-[#f9f9f9] border border-[#eee] rounded-lg overflow-hidden mb-4">
          <button
            onClick={() => setFooterOpen(o => !o)}
            className="w-full flex items-center justify-between p-5 bg-white border-none cursor-pointer text-left"
          >
            <span className="font-bold tracking-widest text-sm text-[#555]">⑤ FOOTER SECTION</span>
            {footerOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {footerOpen && (
            <div className="p-6 flex flex-col gap-5 border-t border-[#eee]">

              {/* Logo image upload */}
              <div>
                <label className={labelCls}>FOOTER LOGO IMAGE (the "ONE-ELIXIR" wordmark image)</label>
                <p className="text-[10px] text-[#aaa] mb-3">Upload the branded logo/wordmark PNG with transparent background. Recommended: 400×80px or similar wide format.</p>
                {hero.footerLogoImage && (
                  <div className="mb-3 p-3 bg-black rounded flex items-center justify-center" style={{ minHeight: '60px' }}>
                    <img src={hero.footerLogoImage} alt="Footer logo preview" className="max-h-[50px] max-w-[200px] object-contain" />
                  </div>
                )}
                <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded cursor-pointer p-4 transition-colors ${hero.footerLogoImage ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black hover:bg-gray-50'}`}>
                  <ImagePlus size={18} className="text-[#888]" />
                  <span className="text-[10px] font-bold tracking-wider text-black text-center">
                    {uploadingFooterLogo ? 'UPLOADING…' : hero.footerLogoImage ? 'REPLACE LOGO' : 'CLICK TO UPLOAD LOGO'}
                  </span>
                  <input type="file" onChange={handleFooterLogoUpload} accept="image/*" className="hidden" />
                </label>
                {hero.footerLogoImage && (
                  <button
                    onClick={() => setHero(prev => ({ ...prev, footerLogoImage: '' }))}
                    className="text-xs text-red-500 border-none bg-transparent cursor-pointer hover:opacity-70 mt-1"
                  >
                    Remove logo
                  </button>
                )}
              </div>

              {/* Tagline */}
              <div>
                <label className={labelCls}>FOOTER TAGLINE</label>
                <textarea className={`${inputCls} min-h-[80px] resize-y`}
                  value={hero.footerTagline || ''}
                  onChange={e => setHero({ ...hero, footerTagline: e.target.value })} />
              </div>

              {/* Copyright */}
              <div>
                <label className={labelCls}>COPYRIGHT TEXT</label>
                <input className={inputCls}
                  value={hero.footerCopyright || ''}
                  onChange={e => setHero({ ...hero, footerCopyright: e.target.value })} />
              </div>

              {/* Save */}
              <button
                onClick={saveHero}
                disabled={heroSaving}
                className="flex items-center justify-center gap-2 p-4 bg-black text-white font-bold rounded cursor-pointer hover:bg-gray-800 transition-colors disabled:opacity-50 mt-2"
              >
                <Save size={16} />
                {heroSaving ? 'SAVING…' : 'SAVE FOOTER SECTION'}
              </button>
            </div>
          )}
        </div>

      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     CUSTOMER HERO VIEW
  ══════════════════════════════════════════════════════ */
  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{ minHeight: 'calc(100vh - 64px)' }}
    >
      {/* ── Background images ── */}
      {banners.length > 0
        ? banners.map((slide, i) => (
            <div key={slide._id}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                opacity: i === current ? 1 : 0,
                backgroundImage: `url(${slide.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))
        : (
          <div className="absolute inset-0"
            style={{ backgroundImage: 'url(/hero-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
        )
      }

      {/* ── Gradient overlay ── */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.72) 100%)' }}
      />

      {/* ── Main content + feature boxes — shifted slightly below center ── */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full text-center text-white px-4 sm:px-8 select-none"
        style={{ minHeight: 'calc(100vh - 64px)', paddingTop: 'clamp(20px, 4vh, 50px)' }}>

        {/* Brand line */}
        <div className="flex items-center gap-3 mb-3">
          <span style={{ display:'block', width:'clamp(24px,5vw,52px)', height:'1px', backgroundColor:'rgba(240,74,58,0.75)' }} />
          <span style={{ fontSize:'clamp(0.55rem,1.2vw,0.8rem)', letterSpacing:'0.28em', color:'rgba(255,200,190,0.95)', fontWeight:600 }}>
            {hero.brandLine}
          </span>
          <span style={{ display:'block', width:'clamp(24px,5vw,52px)', height:'1px', backgroundColor:'rgba(240,74,58,0.75)' }} />
        </div>

        {/* Headline 1 — white with ambient glow */}
        <h1 className="m-0 leading-tight"
          style={{
            fontFamily: "'Georgia','Times New Roman',serif",
            fontSize: 'clamp(2.2rem,7vw,5.5rem)', fontWeight:700, lineHeight:1.05,
            color: '#ffffff',
            textShadow: '0 2px 20px rgba(0,0,0,0.95), 0 0 35px rgba(240,74,58,0.35)',
          }}>
          {hero.headline1}
        </h1>

        {/* Headline 2 — glowing crimson to warm amber-gold gradient matching the smoky hall & red reflections */}
        <h1 className="m-0 leading-tight"
          style={{
            fontFamily: "'Georgia','Times New Roman',serif",
            fontSize: 'clamp(2.2rem,7vw,5.5rem)', fontWeight:700, lineHeight:1.1,
            marginBottom: 'clamp(8px,1.5vw,16px)',
            background: 'linear-gradient(90deg, #FFFFFF 0%, #FFA896 20%, #F04A3A 50%, #FF784E 76%, #FBBF24 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 4px 25px rgba(240,74,58,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.95))',
          }}>
          {hero.headline2}
        </h1>

        {/* Tagline */}
        <p className="mt-1 mb-0 drop-shadow"
          style={{ fontSize:'clamp(0.75rem,1.8vw,1.1rem)', letterSpacing:'0.06em', color:'rgba(255,255,255,0.88)', fontStyle:'italic' }}>
          {hero.tagline}
        </p>
        <span style={{ display:'block', width:'40px', height:'1.5px', backgroundColor:'rgba(240,74,58,0.75)', margin:'10px auto 16px' }} />

        {/* Description */}
        {hero.description && (
          <p style={{
            fontSize: 'clamp(0.85rem,1.65vw,1.125rem)',
            color: 'rgba(255,255,255,0.82)',
            maxWidth: '640px',
            lineHeight: 1.7,
            margin: '0 0 22px',
            textAlign: 'center',
          }}>
            {hero.description}
          </p>
        )}

        {/* CTA Button */}
        <Link
          to={hero.ctaLink}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            backgroundColor: 'transparent',
            color: '#fff',
            fontWeight: 700,
            fontSize: 'clamp(0.65rem,1.4vw,0.82rem)',
            letterSpacing: '0.2em',
            padding: 'clamp(10px,2vw,13px) clamp(28px,4vw,44px)',
            borderRadius: '4px',
            textDecoration: 'none',
            border: '1.5px solid rgba(255,255,255,0.75)',
            cursor: 'pointer',
            transition: 'background 0.2s, border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor='rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor='#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor='transparent'; e.currentTarget.style.borderColor='rgba(255,255,255,0.75)'; }}
        >
          {hero.ctaText} <span style={{ fontSize:'1.1em' }}>→</span>
        </Link>

        {/* ── Equal spacer between CTA and boxes ── */}
        <div style={{ height: 'clamp(20px, 4vh, 40px)' }} />

        {/* ── Feature boxes — individual floating cards ── */}
        <style>{`
          .hero-feature-card {
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, background-color 0.3s ease, box-shadow 0.35s ease !important;
            cursor: pointer;
          }
          .hero-feature-card:hover {
            transform: translateY(-7px) scale(1.02);
            border-color: rgba(240, 74, 58, 0.65) !important;
            background-color: rgba(28, 14, 10, 0.72) !important;
            box-shadow: 0 14px 30px -4px rgba(240, 74, 58, 0.35), 0 0 20px rgba(240, 74, 58, 0.2) !important;
          }
        `}</style>
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {hero.features.map((f, i) => (
              <div key={i}
                className="hero-feature-card flex flex-col items-center justify-center text-center text-white py-8 px-4"
                style={{
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(15,10,5,0.50)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  minHeight: 'clamp(120px, 15vh, 145px)',
                }}>
                <p className="m-0 font-bold" style={{ fontSize:'clamp(0.78rem,1.35vw,0.95rem)', letterSpacing:'0.02em', marginBottom:'8px' }}>
                  {f.title}
                </p>
                <p className="m-0" style={{ fontSize:'clamp(0.78rem,1.25vw,0.9rem)', color:'rgba(255,255,255,0.68)', lineHeight:1.55 }}>
                  {f.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Nav arrows ── */}
      {banners.length > 1 && (
        <>
          <button onClick={prevSlide}
            className="hidden sm:flex absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white text-lg cursor-pointer z-20 hover:bg-black/50 transition-colors"
            style={{ lineHeight:1 }}>❮</button>
          <button onClick={nextSlide}
            className="hidden sm:flex absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white text-lg cursor-pointer z-20 hover:bg-black/50 transition-colors"
            style={{ lineHeight:1 }}>❯</button>
        </>
      )}

      {/* ── Pagination dots ── */}
      {banners.length > 1 && (
        <div className="absolute bottom-[calc(clamp(20px,4vh,40px)+80px)] w-full flex justify-center gap-2 z-20">
          {banners.map((_, i) => (
            <button key={i}
              onClick={() => { setCurrent(i); startTimer(); }}
              className="rounded-full border-none cursor-pointer transition-all duration-300"
              style={{ width: i===current?'24px':'8px', height:'8px', backgroundColor: i===current?'#fff':'rgba(255,255,255,0.45)', padding:0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
