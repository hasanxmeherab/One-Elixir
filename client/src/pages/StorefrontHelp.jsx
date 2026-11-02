import { Link } from 'react-router-dom';
import { Truck, PackageCheck, Plus } from 'lucide-react';
import { DiscoveryLayout, SupportCard } from '../components/storefront/DiscoveryUi';
import { SUPPORT_URL } from '../utils/fragranceDiscovery';
import { usePageMeta } from '../hooks/usePageMeta';

export function DeliveryReturns() {
  usePageMeta('Delivery & Returns | OneElixir', 'Delivery charges, order tracking and support for your OneElixir fragrance order.');
  return <DiscoveryLayout eyebrow="CUSTOMER CARE / 03" title="From our hands" emphasis="to your doorstep." description="The practical details, thoughtfully laid out. Here’s how delivery works and where to turn if something needs our attention.">
    <div className="atelier-info-grid">
      <section className="atelier-info-card"><Truck size={28} strokeWidth={1.3} /><span className="atelier-eyebrow">THE JOURNEY</span><h2>Delivery, <em>made clear.</em></h2><p>Your delivery charge is calculated from the district you select at checkout. The final checkout quote confirms your total before you place the order.</p><dl className="atelier-rates"><div><dt>Dhaka</dt><dd>80 TK</dd></div><div><dt>Outside Dhaka</dt><dd>120 TK</dd></div><div><dt>Ashulia (Daffodil Area)</dt><dd>Free</dd></div><div><dt>Ashulia (Other)</dt><dd>80 TK</dd></div></dl><p>Delivery timing depends on your location and courier availability. Contact us for an estimate for your address.</p><Link to="/track">Track an existing order ↗</Link></section>
      <section className="atelier-info-card"><PackageCheck size={28} strokeWidth={1.3} /><span className="atelier-eyebrow">WE’RE HERE TO HELP</span><h2>Something <em>not quite right?</em></h2><p>If your parcel arrives damaged, has a missing item or contains the wrong fragrance, get in touch with your order ID and a description of the issue. Photos of the parcel and product can help us understand what happened.</p><p>For a return or exchange request, please contact us before sending anything back. Our team will confirm eligibility and the next steps for your order.</p><p>Keep the product and packaging while your request is being reviewed.</p><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Talk to our team ↗</a></section>
    </div><SupportCard />
  </DiscoveryLayout>;
}

const questions = [
  { question: 'Where do I begin if I’m new to fragrance?', answer: <>Start with the <Link to="/scent-guide">scent guide</Link> to explore fresh, floral, woody and warm notes. Or take our <Link to="/fragrance-quiz">two-step fragrance quiz</Link> for suggestions from the available collection.</> },
  { question: 'How does the fragrance quiz choose my suggestions?', answer: <>It looks for in-stock fragrances with notes from your selected scent family and a starting price within your budget. Suggestions reflect catalog notes, rather than a prediction of how a scent will wear on your skin.</> },
  { question: 'Which bottle sizes are available?', answer: <>Available sizes vary by fragrance. Open a product page to see its current sizes, prices and stock, then select the size you’d like before adding it to your cart.</> },
  { question: 'How much does delivery cost?', answer: <>The current delivery charge is 80 TK for Dhaka and Ashulia (Other), 120 TK outside Dhaka, and free for Ashulia (Daffodil Area). Your checkout quote confirms the final amount. See <Link to="/delivery-returns">Delivery & Returns</Link> for details.</> },
  { question: 'Can I pay cash on delivery?', answer: <>Cash on Delivery is available in checkout. When there is a delivery charge, checkout asks you to pay that charge in advance and pay the rest on delivery. If delivery is free, no advance delivery payment is needed. Follow the payment instructions shown for your order.</> },
  { question: 'How can I track my order?', answer: <>Visit <Link to="/track">Track Order</Link> and use your order details. You can also open your account to review your orders or contact us if you need assistance.</> },
  { question: 'Can I return or exchange a fragrance?', answer: <>Please contact our team with your order ID before sending a product back. We’ll review your request and confirm eligibility and the next steps. More guidance is on our <Link to="/delivery-returns">Delivery & Returns</Link> page.</> },
  { question: 'How can I keep a fragrance for later?', answer: <>Tap the heart on a collection card to save it. Visit <Link to="/wishlist">Saved scents</Link> to find your wishlist. Guest saves are stored in your current browser; signing in uses your account’s wishlist.</> },
  { question: 'Can you help me choose a gift?', answer: <>Absolutely—tell us about the recipient’s favorite notes and your budget through <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">WhatsApp support</a>. You can also explore our <Link to="/bundles">bundles</Link> for more possibilities.</> },
];

export function StorefrontFaq() {
  usePageMeta('Frequently Asked Questions | OneElixir', 'Answers about choosing fragrances, bottle sizes, payments, delivery and order support at OneElixir.');
  return <DiscoveryLayout eyebrow="A LITTLE CLARITY / 04" title="Good questions." emphasis="Thoughtful answers." description="From your first scent to your next delivery. Find a little clarity here, or talk to us for a personal answer.">
    <section aria-label="Frequently asked questions">{questions.map(item => <details key={item.question} className="atelier-faq"><summary>{item.question}<Plus size={18} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</section><SupportCard />
  </DiscoveryLayout>;
}
