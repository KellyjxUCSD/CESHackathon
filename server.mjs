import http from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apartments } from './apartments.js';
import { scrapeRents } from './rents.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
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
        json(res, 200, { error: 'We could not read their website just now.' });
      }
      return;
    }
    if (pathname === '/roommate-split') {
      res.writeHead(308, { Location: '/roommate-split/' }).end();
      return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname === '/roommate-split/' ? 'roommate-split/index.html' : pathname.slice(1);
    const roommateAsset = /^roommate-split\/(?:index\.html|app\.js|floor-plan\.js|style\.css|vendor\/(?:heic2any\.min\.js|(?:ocr|pdf)\/[\w.-]+\.(?:m?js|wasm|gz)))$/.test(relative);
    // Serve only public app files; never expose repository metadata or source documents.
    if (!roommateAsset && !['index.html', 'app.js', 'calculator.js', 'calculator-view.js', 'apartments.js', 'explore-view.js', 'welcome.js', 'styles.css', 'calculator.css', 'explore.css', 'welcome.css'].includes(relative) && !/^assets\/[a-zA-Z0-9._-]+$/.test(relative)) {
      res.writeHead(404).end('Not found'); return;
    }
    const file = path.join(root, relative);
    const content = await readFileAsync(file);
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Rentwise is ready at http://localhost:${port}`));
