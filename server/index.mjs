import http from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apartments } from '../public/js/apartments.js';
import { scrapeRents, fallbackPlans } from './rents.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
try {
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
} catch { /* The map key is optional until .env is present. */ }
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' };
types['.mjs'] = 'text/javascript';
types['.wasm'] = 'application/wasm';
const rentCache = new Map();
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
};
const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/api/maps-key') {
      json(res, 200, { key: process.env.GOOGLE_MAPS_API_KEY || '' });
      return;
    }
    if (pathname === '/api/rents') {
      const place = apartments.find(item => item.id === requestUrl.searchParams.get('id'));
      if (!place) { json(res, 404, { error: 'That apartment is not on this map.' }); return; }
      const cached = rentCache.get(place.id);
      if (cached && Date.now() - cached.at < 15 * 1000) { json(res, 200, cached.body); return; }
      try {
        const scraped = await scrapeRents(place);
        const body = { id: place.id, source: place.website, sourceName: place.sourceName, fetchedAt: new Date().toISOString(), plans: scraped.plans };
        rentCache.set(place.id, { at: Date.now(), body });
        json(res, 200, body);
      } catch {
        const plans = fallbackPlans(place);
        if (plans) {
          const body = { id: place.id, source: place.website, sourceName: place.sourceName, fetchedAt: new Date().toISOString(), plans, priceUnavailable: true };
          rentCache.set(place.id, { at: Date.now(), body });
          json(res, 200, body);
        } else json(res, 200, { error: 'Live floor-plan pricing could not be loaded. Please try again or visit the property website.' });
      }
      return;
    }
    if (['/roommate-split', '/roommate-split/', '/roommate-split/index.html'].includes(pathname)) {
      res.writeHead(308, { Location: '/#/calculator' }).end();
      return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const roommateAsset = /^roommate-split\/(?:index\.html|app\.js|floor-plan\.js|style\.css|vendor\/(?:heic2any\.min\.js|(?:ocr|pdf)\/[\w.-]+\.(?:m?js|wasm|gz)))$/.test(relative);
    // Serve only public app files; never expose repository metadata or source documents.
    if (!roommateAsset && relative !== 'index.html' && !/^(?:js\/[a-zA-Z0-9_-]+\.js|css\/[a-zA-Z0-9_-]+\.css|assets\/[a-zA-Z0-9._-]+)$/.test(relative)) {
      res.writeHead(404).end('Not found'); return;
    }
    const file = path.join(roommateAsset ? root : publicRoot, relative);
    const content = await readFileAsync(file);
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`TritonRent is ready at http://localhost:${port}`));
