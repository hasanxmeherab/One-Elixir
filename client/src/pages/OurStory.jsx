import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { DiscoveryLayout, SupportCard } from '../components/storefront/DiscoveryUi';
import { usePageMeta } from '../hooks/usePageMeta';
import { optimizeImage } from '../utils/optimizeImage';

export default function OurStory() {
  usePageMeta('Our Story | OneElixir', 'Meet OneElixir, a Bangladesh-based fragrance brand with a love for small-batch perfumes and personal scent discovery.');
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/hero-settings`, { signal: controller.signal }).then(res => setSettings(res.data)).catch(() => {});
    return () => controller.abort();
  }, []);
  return <DiscoveryLayout eyebrow="THE WORLD OF ONEELIXIR / 05" title="Small batches." emphasis="Personal stories." description="A fragrance is a small detail that becomes part of your day. We believe finding yours should feel personal, curious and within reach." art>
    {settings?.storyImageRight && <img className="atelier-story-image" src={optimizeImage(settings.storyImageRight, 1200)} alt="The world of OneElixir fragrances" loading="lazy" />}
    <section className="atelier-story-intro"><div><span className="atelier-eyebrow">{settings?.storyLabel || 'ROOTED IN BANGLADESH'}</span><h2>{settings?.storyHeading || <>A love for scent.<br /><em>A sense of self.</em></>}</h2></div><div><p>{settings?.storyPara1 || 'OneElixir is a Bangladesh-based fragrance brand offering perfumes and scent oils crafted in small batches. Our collection brings together fresh, floral, gourmand and woody profiles in accessible sizes.'}</p><p>{settings?.storyPara2 || 'We’re interested in the little ritual of choosing a fragrance: a familiar note, a new mood, a scent that becomes yours. Explore at your own pace, follow what you love, and let us help when you need a little guidance.'}</p><Link to="/collection" className="atelier-button">Explore our fragrances <ArrowUpRight size={17} /></Link></div></section>
    <section className="atelier-values" aria-label="What matters to us">{[
      ['01', 'Craftsmanship', 'A considered collection of perfumes and scent oils, crafted in small batches.'],
      ['02', 'Accessibility', 'Different sizes and price points make room for discovery in your everyday routine.'],
      ['03', 'Individuality', 'Fresh or warm, delicate or woody. There’s room to follow your own preferences.'],
    ].map(([number, title, copy]) => <article key={number}><span className="atelier-eyebrow">{number} / OUR VALUES</span><h3>{title}</h3><p>{copy}</p></article>)}</section><SupportCard />
  </DiscoveryLayout>;
}
