const mongoose = require('mongoose');

const featureBoxSchema = new mongoose.Schema({
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
}, { _id: false });

// Singleton document — only one hero-settings record exists at a time.
const heroSettingsSchema = new mongoose.Schema({
  heroBannerOpacity: { type: Number, min: 0, max: 100, default: 55 },
  brandLine:   { type: String, default: 'ONEELIXIR' },
  headline1:   { type: String, default: 'Premium' },
  headline2:   { type: String, default: 'Perfume Oils' },
  tagline:     { type: String, default: 'Inspired Scents. Lasting Impressions.' },
  description: {
    type: String,
    default: 'OneElixir is a Bangladesh-based fragrance brand offering bespoke perfumes and scent oils crafted with artistic precision. Explore olfactory profiles ranging from fresh and floral to gourmand and resinous woody in convenient, accessible sizes.',
  },
  ctaText: { type: String, default: 'EXPLORE COLLECTION' },
  ctaLink: { type: String, default: '/collection' },
  features: {
    type: [featureBoxSchema],
    default: [
      { title: 'Small Batch',        subtitle: 'Formulated in limited, curated runs' },
      { title: 'Concentrated Oil',   subtitle: 'Long-lasting & skin friendly' },
      { title: 'Diverse Profiles',   subtitle: 'From fresh citrus to rich dark oud' },
      { title: 'Accessible Formats', subtitle: '3.5 ml vials & 30 ml rollers' },
    ],
  },

  // ── Story / About Section ──────────────────────────────────
  storyLabel:  { type: String, default: 'SMALL BATCH ARTISANSHIP' },
  storyHeading:{ type: String, default: 'Crafted with Purpose & Resinous Depth' },
  storyPara1:  {
    type: String,
    default: 'OneElixir is a Bangladesh-based fragrance brand offering bespoke perfumes and scent oils crafted in small batches. The brand provides a diverse array of olfactory profiles—ranging from fresh and floral to gourmand and woody—in convenient, accessible sizes.',
  },
  storyPara2:  {
    type: String,
    default: 'Designed with modern lifestyle trends and practical utility in mind, our concentrated formulas rest seamlessly against the skin, delivering long-lasting personal scent projection wherever your day leads.',
  },
  storyImageRight: { type: String, default: '' }, // top-right large image
  storyImageLeft:  { type: String, default: '' }, // bottom-left image
  storyImageBot:   { type: String, default: '' }, // bottom-right image

  // ── Contact / Connect With Us Section ──────────────────────────────
  contactLabel:          { type: String, default: 'CONNECT WITH US' },
  contactHeading:        { type: String, default: 'Experience OneElixir' },
  contactDesc:           { type: String, default: 'Have questions about finding your bespoke scent profile or placing a custom fragrance order? Our team is welcoming, helpful, and ready to guide your olfactory journey.' },
  contactStoreText:      { type: String, default: 'OneElixir' },
  contactStoreUrl:       { type: String, default: '' },
  contactLocation:       { type: String, default: 'Crafted & Based in Bangladesh' },
  contactBullet:         { type: String, default: 'Bespoke 3.5 ml & 30 ml Roller Editions Available' },
  contactImage:          { type: String, default: '' },
  contactInquiryHeading: { type: String, default: 'Direct Inquiries' },
  contactInquiryDesc:    { type: String, default: 'Connect directly via WhatsApp for personalized scent recommendations.' },
  contactWhatsApp:       { type: String, default: 'https://wa.me/8801XXXXXXXXX' },

  // ── Footer Section ───────────────────────────────────────────────
  footerLogoImage: { type: String, default: '' },
  footerTagline:   { type: String, default: 'Bespoke fragrances, crafted in small batches in Bangladesh. Offering accessible luxury and differentiated olfactory craftsmanship.' },
  footerCopyright: { type: String, default: '© OneElixir. All rights reserved.' },

}, { timestamps: true });

module.exports = mongoose.model('HeroSettings', heroSettingsSchema);


