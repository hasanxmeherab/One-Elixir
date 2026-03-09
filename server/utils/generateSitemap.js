const fs   = require('fs');
const path = require('path');

const generateSitemap = async (Perfume) => {
  try {
    const perfumes  = await Perfume.find({}, 'slug updatedAt');
    const base      = 'https://www.oneelixir.live';
    const staticPages = [
      { url: '/',        priority: '1.0', freq: 'daily'   },
      { url: '/shop',    priority: '0.9', freq: 'daily'   },
      { url: '/about',   priority: '0.5', freq: 'monthly' },
      { url: '/contact', priority: '0.5', freq: 'monthly' },
    ];

    const productUrls = perfumes.map(p => ({
      url:      `/product/${p.slug || p._id}`,
      priority: '0.8',
      freq:     'weekly',
      lastmod:  p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    }));

    const allUrls = [...staticPages, ...productUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${base}${u.url}</loc>
    <lastmod>${u.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    // Write to public folder (Vite frontend) and server root
    const serverPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    const serverRoot = path.join(__dirname, 'sitemap.xml');

    // Try writing to both locations
    try {
      if (!fs.existsSync(path.dirname(serverPath))) fs.mkdirSync(path.dirname(serverPath), { recursive: true });
      fs.writeFileSync(serverPath, xml);
    } catch {}
    fs.writeFileSync(serverRoot, xml);

    console.log(`✓ Sitemap updated — ${perfumes.length} products`);
  } catch (err) {
    console.error('Sitemap generation failed:', err.message);
  }
};

module.exports = generateSitemap;