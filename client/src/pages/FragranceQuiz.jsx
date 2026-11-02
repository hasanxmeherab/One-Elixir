import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { DiscoveryLayout, ScentArt, SupportCard } from '../components/storefront/DiscoveryUi';
import { SCENT_FAMILIES, recommendFragrances } from '../utils/fragranceDiscovery';
import { getCollectionPrice } from '../utils/collectionProducts';
import { optimizeImage } from '../utils/optimizeImage';
import { useFragranceCatalog } from '../hooks/useFragranceCatalog';
import { usePageMeta } from '../hooks/usePageMeta';

const budgets = [{ id: '1000', name: 'Up to 1,000 TK', detail: 'A little everyday discovery.' }, { id: '2000', name: 'Up to 2,000 TK', detail: 'Room for a new signature.' }, { id: '5000', name: 'Up to 5,000 TK', detail: 'Something to make your own.' }, { id: 'any', name: 'Let me explore', detail: 'Keep the possibilities open.' }];
export default function FragranceQuiz() {
  usePageMeta('Find Your Fragrance | OneElixir', 'Find a fragrance from the OneElixir collection based on your favorite scent family and budget.');
  const [step, setStep] = useState(0);
  const [family, setFamily] = useState('');
  const [budget, setBudget] = useState('any');
  const headingRef = useRef(null);
  const { products, status, retry } = useFragranceCatalog();
  const familyInfo = SCENT_FAMILIES.find(item => item.id === family);
  const results = step === 2 ? recommendFragrances(products, { family, budget }, product => getCollectionPrice(product).price) : [];
  const changeStep = next => {
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const reset = () => { setFamily(''); setBudget('any'); changeStep(0); };
  return <DiscoveryLayout eyebrow="THE SCENT EDIT / 02" title="Your next" emphasis="signature starts here." description="Two little choices. A few new possibilities. Tell us what draws you in, and we’ll explore the collection together.">
    <section className="atelier-quiz" aria-labelledby="quiz-heading">
      <div className="atelier-quiz-progress"><span>{step < 2 ? `QUESTION 0${step + 1} / 02` : 'YOUR SCENT EDIT'}</span><div><i style={{ width: `${(step + 1) / 3 * 100}%` }} /></div><span>ONEELIXIR</span></div>
      <h2 id="quiz-heading" ref={headingRef} tabIndex={-1}>{step === 0 ? <>What feels like <em>you?</em></> : step === 1 ? <>A little luxury, <em>within reach.</em></> : <>Meet your <em>possibilities.</em></>}</h2>
      <p>{step === 0 ? 'Choose the scent family you’re most drawn to.' : step === 1 ? 'What budget would you like us to explore? We use the starting price for each fragrance.' : `Selected for ${familyInfo?.name.toLowerCase()} notes${budget !== 'any' ? `, up to ${Number(budget).toLocaleString()} TK` : ''}. Suggestions are based on catalog scent notes; your experience of a fragrance is personal.`}</p>
      {step === 0 && <div className="atelier-quiz-options" role="group" aria-label="Choose a scent family">{SCENT_FAMILIES.map(item => <button type="button" key={item.id} className="atelier-quiz-option" aria-pressed={family === item.id} onClick={() => setFamily(item.id)}><ScentArt variant={item.symbol} color="#6e805c" /><span><strong>{item.name}</strong><small>{item.mood}</small></span><span className="atelier-choice-circle" aria-hidden="true" /></button>)}</div>}
      {step === 1 && <div className="atelier-quiz-options" role="group" aria-label="Choose your budget">{budgets.map(item => <button type="button" key={item.id} className="atelier-quiz-option" aria-pressed={budget === item.id} onClick={() => setBudget(item.id)}><span><strong>{item.name}</strong><small>{item.detail}</small></span><span className="atelier-choice-circle" aria-hidden="true" /></button>)}</div>}
      {step === 2 && (status === 'loading' ? <p role="status" className="atelier-state">Finding your scent edit…</p> : status === 'error' ? <div role="alert" className="atelier-state"><p>We couldn’t reach the collection. Your choices are saved here.</p><button type="button" className="atelier-button" onClick={retry}>Try again</button></div> : results.length ? <div className="atelier-result-grid">{results.map(product => {
        const image = product.images?.[0] || product.image || product.variants?.[0]?.image;
        const price = getCollectionPrice(product);
        return <Link key={product._id} to={`/product/${product.slug || product._id}`} className="atelier-result"><div className="atelier-result-image">{image ? <img src={optimizeImage(image, 450)} alt={product.name} loading="lazy" /> : <ScentArt />}</div><h3>{product.name}</h3><p>{product.scentProfile?.join(' · ')}</p><span>{price.salePrice === null && product.variants?.length ? 'From ' : ''}{price.price.toLocaleString()} TK<ArrowUpRight size={16} /></span></Link>;
      })}</div> : <div className="atelier-state"><p>No in-stock fragrances match this combination just now. Try another budget or explore the full scent family.</p><Link to={`/collection?family=${family}`} className="atelier-button secondary">Explore this family <ArrowUpRight size={16} /></Link></div>)}
      <div className="atelier-quiz-actions">{step > 0 ? <button type="button" className="atelier-button secondary" onClick={() => changeStep(step - 1)}><ArrowLeft size={15} /> Back</button> : <Link to="/scent-guide" className="atelier-button secondary">Scent guide</Link>}{step < 2 ? <button type="button" className="atelier-button" disabled={!family} onClick={() => changeStep(step + 1)}>{step === 0 ? 'Continue' : 'Find my fragrances'}<ArrowRight size={16} /></button> : <button type="button" className="atelier-button secondary" onClick={reset}><RotateCcw size={14} /> Start again</button>}</div>
    </section>
    <SupportCard />
  </DiscoveryLayout>;
}
