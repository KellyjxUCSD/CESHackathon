const listings = {
  palisade: { website: 'https://palisadeutc.com/floorplans/', sourceName: 'palisadeutc.com', kind: 'jonah' },
  terrace: { website: 'https://www.lajollaterrace.com/Floor-Plans.aspx', sourceName: 'lajollaterrace.com', kind: 'realpage' },
  veranda: { website: 'https://www.verandalajolla.com/apartments/ca/san-diego/floor-plans', sourceName: 'verandalajolla.com', kind: 'g5' },
  allina: { website: 'https://www.allinalajolla.com/apartments/ca/san-diego/floor-plans', sourceName: 'allinalajolla.com', kind: 'g5' },
  nobel: { website: 'https://www.lajollanobel.com/floorplans/', sourceName: 'lajollanobel.com', kind: 'schema' },
  court: { website: 'https://www.nobelcourt.com/floor-plans/', sourceName: 'nobelcourt.com', kind: 'cards' },
  axiom: { website: 'https://www.axiomlajolla.com/floor-plans', sourceName: 'axiomlajolla.com', kind: 'realpage' },
  village: { website: 'https://www.villageviewlajolla.com/floor-plans', sourceName: 'villageviewlajolla.com', kind: 'realpage' },
};

const cache = new Map();
const staticOrigin = 'https://rentwise-ces-hackathon.russetpistachio8.chatgpt.site';
const cors = {
  'access-control-allow-origin': staticOrigin,
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  vary: 'Origin',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const money = value => {
  const number = Number(String(value ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
};
const plan = fields => ({
  name: String(fields.name || 'Apartment').slice(0, 80),
  beds: Number.isFinite(fields.beds) ? fields.beds : 1,
  baths: Number.isFinite(fields.baths) ? fields.baths : null,
  sqft: Number.isFinite(fields.sqft) && fields.sqft > 0 ? Math.round(fields.sqft) : null,
  low: money(fields.low),
  high: money(fields.high) || money(fields.low),
  available: Number.isFinite(fields.available) ? fields.available : null,
  deposit: money(fields.deposit),
  image: typeof fields.image === 'string' ? fields.image : null,
  url: typeof fields.url === 'string' ? fields.url : null,
});
const headers = { accept: 'text/html,application/json', 'user-agent': 'Mozilla/5.0 (compatible; Rentwise/1.0; +https://rentwise-ces-hackathon.russetpistachio8.chatgpt.site)' };

async function readText(url, moreHeaders = {}) {
  const response = await fetch(url, { headers: { ...headers, ...moreHeaders }, redirect: 'follow' });
  if (!response.ok) throw new Error(`Property site returned ${response.status}`);
  return response.text();
}
async function readJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: { ...headers, accept: 'application/json', ...options.headers },
    body: options.body,
  });
  if (!response.ok) throw new Error(`Price source returned ${response.status}`);
  return response.json();
}
function parseJonah(html, pageUrl) {
  const match = html.match(/<script type="application\/json" id="jd-fp-data-script-app">([\s\S]*?)<\/script>/);
  if (!match) return null;
  const data = JSON.parse(match[1]);
  return (data.floorplans || []).map(item => {
    const price = item.price_entity || {};
    return plan({ name: item.title, beds: item.bedrooms === 'Studio' ? 0 : Number(item.bedrooms), baths: Number(item.bathrooms), sqft: Number(String(item.square_feet || '').replace(/,/g, '')), low: price.priceLow || item.rent_min, high: price.priceHigh || item.rent_max, available: Number(item.availability_count), url: item.slug ? new URL(`${item.slug}/`, pageUrl).href : null });
  });
}
async function addJonahImages(plans = []) {
  await Promise.all(plans.map(async item => {
    if (!item.url) return;
    try {
      const page = await readText(item.url);
      const image = page.match(/https?:\\?\/\\?\/[^"]+?(?:Listing|Detail)[^"]+?\.jpg/i)?.[0];
      if (image) item.image = image.replaceAll('\\/', '/');
    } catch { /* A plan remains usable when its image is unavailable. */ }
  }));
  return plans;
}
function parseRealpage(data) {
  const list = data?.response?.floorplans;
  return Array.isArray(list) ? list.map(item => plan({ name: item.name, beds: Number(item.bedRooms), baths: Number(item.bathRooms), sqft: Number(item.minimumSquareFeet), low: item.minimumMarketRent, high: item.maximumMarketRent, deposit: item.depositAmount })) : null;
}
function parseSchema(html) {
  const offers = [];
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node['@type'] === 'Offer' && node.itemOffered) offers.push(node);
    Object.values(node).forEach(walk);
  };
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { walk(JSON.parse(match[1])); } catch {} }
  return offers.length ? offers.map(offer => plan({ name: offer.itemOffered.name, beds: Number(offer.itemOffered.numberOfBedrooms), baths: Number(offer.itemOffered.numberOfBathroomsTotal), sqft: Number(offer.itemOffered.accommodationFloorPlan?.floorSize?.value), low: offer.price, high: offer.price })) : null;
}
function parseCards(html) {
  const plans = [];
  for (const match of html.matchAll(/<h2>([^<]+)<\/h2>\s*<p>((?:(?!<\/p>|<h2)[\s\S])*)<\/p>\s*<p>\s*Starting at:\s*\$([0-9,]+)\s*<\/p>/g)) {
    const facts = match[2].replace(/<[^>]+>/g, ' ');
    if (!/\d+\s*Bed|Studio/i.test(facts)) continue;
    plans.push(plan({ name: match[1].replace(/\s+/g, ' ').trim(), beds: /studio/i.test(facts) ? 0 : Number((facts.match(/(\d+)\s*Bed/i) || [])[1]), baths: Number((facts.match(/(\d+(?:\.\d+)?)\s*Bath/i) || [])[1]), sqft: Number((facts.match(/([\d,]+)\s*sq\s?ft/i) || [])[1]?.replace(/,/g, '')), low: match[3] }));
  }
  return plans.length ? plans : null;
}
function parseG5(data) {
  const list = data?.data?.apartmentComplex?.floorplans;
  return Array.isArray(list) ? list.map(item => plan({ name: item.name, beds: Number(item.beds), baths: Number(item.baths), sqft: Number(item.sqft), low: item.startingRate, high: item.endingRate, available: Number(item.totalAvailableUnits) })) : null;
}
const g5Query = `query ApartmentComplex($locationUrn: String!, $moveInDate: String!) { apartmentComplex(locationUrn: $locationUrn) { floorplans(moveInDate: $moveInDate, dateFlexibility: 45) { name beds baths sqft startingRate endingRate totalAvailableUnits } } }`;
async function scrape(place) {
  const page = await readText(place.website);
  if (/Just a moment|cf-browser-verification|Attention Required/i.test(page.slice(0, 2500))) throw new Error('The property site requires a browser check.');
  let plans = null;
  if (place.kind === 'jonah') plans = await addJonahImages(parseJonah(page, place.website));
  if (place.kind === 'realpage') {
    const propertyId = page.match(/propertyId\s*=\s*'(\d+)'/)?.[1];
    const apiKey = page.match(/apiKey:\s*'([0-9a-f-]{36})'/i)?.[1];
    if (!propertyId || !apiKey) throw new Error('The property does not expose a readable price feed.');
    plans = parseRealpage(await readJson(`https://api.ws.realpage.com/v2/property/${propertyId}/floorplans`, { headers: { 'x-ws-authkey': apiKey } }));
  }
  if (place.kind === 'schema') plans = parseSchema(page);
  if (place.kind === 'cards') plans = parseCards(page);
  if (place.kind === 'g5') {
    const locationUrn = page.match(/"locationUrn":\s*"(g5-cl-[a-z0-9-]+)"/)?.[1];
    if (!locationUrn) throw new Error('The property does not expose a readable price feed.');
    const data = await readJson('https://inventory.g5marketingcloud.com/graphql', { method: 'POST', headers: { 'content-type': 'application/json', origin: new URL(place.website).origin, referer: place.website }, body: JSON.stringify({ query: g5Query, variables: { locationUrn, moveInDate: new Date().toISOString().slice(0, 10) } }) });
    plans = parseG5(data);
  }
  const priced = (plans || []).filter(item => item.low);
  if (!priced.length) throw new Error('No current prices were published.');
  return priced;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET' || url.pathname !== '/api/rents') return json({ error: 'Not found.' }, 404);
    const id = url.searchParams.get('id') || '';
    const place = listings[id];
    if (!place) return json({ id, error: 'This listing has no live price feed. Visit the property website for current availability.' });
    const previous = cache.get(id);
    if (previous && Date.now() - previous.at < 5 * 60 * 1000) return json(previous.body);
    try {
      const body = { id, source: place.website, sourceName: place.sourceName, fetchedAt: new Date().toISOString(), plans: await scrape(place) };
      cache.set(id, { at: Date.now(), body });
      return json(body);
    } catch (error) {
      return json({ id, source: place.website, sourceName: place.sourceName, error: error instanceof Error ? error.message : 'Could not read the property website.' });
    }
  },
};
