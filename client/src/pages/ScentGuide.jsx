import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { DiscoveryLayout, ScentArt, SupportCard } from '../components/storefront/DiscoveryUi';
import { SCENT_FAMILIES, matchesFamily } from '../utils/fragranceDiscovery';
import { useFragranceCatalog } from '../hooks/useFragranceCatalog';
import { usePageMeta } from '../hooks/usePageMeta';

export default function ScentGuide() {
  usePageMeta('Shop by Scent | OneElixir', 'Explore fresh, floral, woody and warm fragrance notes. Discover your fragrance family at OneElixir.');
  const { products, status, retry } = useFragranceCatalog();
  const notes = [...new Set(products.flatMap(product => product.scentProfile || []))].sort();
  return <DiscoveryLayout eyebrow="THE OLFACTORY LIBRARY / 01" title="A feeling." emphasis="A fragrance." description="Some scents feel like sunlight. Others, like a late night. Begin with a feeling and find the notes that make it yours.">
    <section aria-labelledby="family-heading">
      <div className="atelier-section-heading"><div><span className="atelier-eyebrow">FOUR WORLDS TO EXPLORE</span><h2 id="family-heading">Where will your <em>senses go?</em></h2></div><p>A fragrance can belong to more than one family. Let curiosity lead the way.</p></div>
      <div className="atelier-family-grid">{SCENT_FAMILIES.map((family, index) => <Link key={family.id} to={`/collection?family=${family.id}`} className="atelier-family-card">
        <span>0{index + 1} / {status === 'ready' ? `${products.filter(p => matchesFamily(p, family.id)).length} FRAGRANCES` : 'SCENT FAMILY'}</span><ScentArt variant={family.symbol} color={family.color} /><h3>{family.name}</h3><p>{family.description}</p><ArrowUpRight size={19} aria-hidden="true" />
      </Link>)}</div>
    </section>
    <section className="atelier-notes" aria-labelledby="notes-heading">
      <div className="atelier-section-heading"><div><span className="atelier-eyebrow">FOLLOW A FAMILIAR NOTE</span><h2 id="notes-heading">The little things <em>you love.</em></h2></div><Link to="/fragrance-quiz" className="atelier-note">Help me choose <ArrowUpRight size={15} /></Link></div>
      {status === 'loading' ? <p role="status" className="atelier-state">Opening the scent library…</p> : status === 'error' ? <div role="alert" className="atelier-state"><p>We couldn’t load the scent notes.</p><button className="atelier-button secondary" onClick={retry}>Try again</button></div> : notes.length ? <div className="atelier-note-list">{notes.map(note => <Link key={note} to={`/collection?scent=${encodeURIComponent(note)}`} className="atelier-note">{note}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}</div> : <p className="atelier-state">New notes are on their way. Explore our collection or ask us for a suggestion.</p>}
    </section>
    <SupportCard />
  </DiscoveryLayout>;
}
