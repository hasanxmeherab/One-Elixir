const express = require('express');
const router  = express.Router();
const HeroSettings = require('../models/HeroSettings');
const { verifyAdmin } = require('../middleware/authMiddleware');

/* Defaults mirrored here so the GET always returns a complete object
   even if the stored document predates a schema addition. */
const SCHEMA_DEFAULTS = {
  brandLine:   'ONEELIXIR',
  headline1:   'Premium',
  headline2:   'Perfume Oils',
  tagline:     'Inspired Scents. Lasting Impressions.',
  description: 'OneElixir is a Bangladesh-based fragrance brand offering bespoke perfumes and scent oils crafted with artistic precision.',
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
  storyPara1:      'OneElixir is a Bangladesh-based fragrance brand offering bespoke perfumes and scent oils crafted in small batches.',
  storyPara2:      'Designed with modern lifestyle trends and practical utility in mind, our concentrated formulas rest seamlessly against the skin.',
  storyImageRight: '',
  storyImageLeft:  '',
  storyImageBot:   '',
  contactLabel:          'CONNECT WITH US',
  contactHeading:        'Experience OneElixir',
  contactDesc:           'Have questions about finding your bespoke scent profile or placing a custom fragrance order? Our team is welcoming, helpful, and ready to guide your olfactory journey.',
  contactStoreText:       'OneElixir',
  contactStoreUrl:        '',
  contactLocation:       'Crafted & Based in Bangladesh',
  contactBullet:         'Bespoke 3.5 ml & 30 ml Roller Editions Available',
  contactImage:          '',
  contactInquiryHeading: 'Direct Inquiries',
  contactInquiryDesc:    'Connect directly via WhatsApp for personalized scent recommendations.',
  contactWhatsApp:       'https://wa.me/8801636400363',
  footerLogoImage: '',
  footerTagline:   'Bespoke fragrances, crafted in small batches in Bangladesh. Offering accessible luxury and differentiated olfactory craftsmanship.',
  footerCopyright: '© OneElixir. All rights reserved.',
};

// ── GET — public (homepage fetches this) ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let settings = await HeroSettings.findOne();
    if (!settings) {
      settings = await HeroSettings.create({});
    }

    // Convert Mongoose doc to plain object and merge with defaults
    // so any field added after the document was first created
    // still returns a value (the default) rather than undefined.
    const doc = settings.toObject({ versionKey: false });
    const merged = { ...SCHEMA_DEFAULTS, ...doc };

    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT — admin only (save / update) ─────────────────────────────────────
router.put('/', verifyAdmin, async (req, res) => {
  try {
    const allowed = [
      'brandLine', 'headline1', 'headline2', 'tagline', 'description',
      'ctaText', 'ctaLink', 'features',
      'storyLabel', 'storyHeading', 'storyPara1', 'storyPara2',
      'storyImageRight', 'storyImageLeft', 'storyImageBot',
      'contactLabel', 'contactHeading', 'contactDesc', 'contactStoreText', 'contactStoreUrl',
      'contactLocation', 'contactBullet', 'contactImage',
      'contactInquiryHeading', 'contactInquiryDesc', 'contactWhatsApp',
      'footerLogoImage', 'footerTagline', 'footerCopyright',
    ];

    // Build $set object from only the fields that were sent
    const updates = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    // findOneAndUpdate with upsert so it works whether doc exists or not
    const settings = await HeroSettings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    // Return merged with defaults (same as GET)
    const doc = settings.toObject({ versionKey: false });
    res.json({ ...SCHEMA_DEFAULTS, ...doc });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
