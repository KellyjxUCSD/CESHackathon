const browserHeaders = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/json',
};

const moneyNumber = value => {
  const number = Number(String(value ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
};

const plan = (fields) => ({
  name: String(fields.name || 'Apartment').slice(0, 80),
  beds: Number.isFinite(fields.beds) ? fields.beds : 1,
  baths: Number.isFinite(fields.baths) ? fields.baths : null,
  sqft: Number.isFinite(fields.sqft) && fields.sqft > 0 ? Math.round(fields.sqft) : null,
  low: moneyNumber(fields.low),
  high: moneyNumber(fields.high) || moneyNumber(fields.low),
  available: Number.isFinite(fields.available) ? fields.available : null,
  deposit: moneyNumber(fields.deposit),
});

export function parseJonah(html) {
  const match = String(html).match(/<script type="application\/json" id="jd-fp-data-script-app">([\s\S]*?)<\/script>/);
  if (!match) return null;
  const data = JSON.parse(match[1]);
  return (data.floorplans || []).map(item => {
    const price = item.price_entity || {};
    return plan({
      name: item.title,
      beds: item.bedrooms === 'Studio' ? 0 : Number(item.bedrooms),
      baths: Number(item.bathrooms),
      sqft: Number(String(item.square_feet || '').replace(/,/g, '')),
      low: price.priceLow || item.rent_min,
      high: price.priceHigh || item.rent_max,
      available: Number(item.availability_count),
    });
  });
}

export function parseRealpage(data) {
  const list = data?.response?.floorplans;
  if (!Array.isArray(list)) return null;
  return list.map(item => plan({
    name: item.name,
    beds: Number(item.bedRooms),
    baths: Number(item.bathRooms),
    sqft: Number(item.minimumSquareFeet),
    low: item.minimumMarketRent,
    high: item.maximumMarketRent,
    deposit: item.depositAmount,
  }));
}

export function parseSchemaOffers(html) {
  const offers = [];
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node['@type'] === 'Offer' && node.itemOffered) offers.push(node);
    Object.values(node).forEach(walk);
  };
  for (const match of String(html).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { walk(JSON.parse(match[1])); } catch { /* A page can contain other JSON blocks. */ }
  }
  if (!offers.length) return null;
  return offers.map(offer => {
    const item = offer.itemOffered;
    return plan({
      name: item.name,
      beds: Number(item.numberOfBedrooms),
      baths: Number(item.numberOfBathroomsTotal),
      sqft: Number(item.accommodationFloorPlan?.floorSize?.value),
      low: offer.price,
      high: offer.price,
    });
  });
}

export function parseFloorplanCards(html) {
  const seen = new Set();
  const plans = [];
  for (const match of String(html).matchAll(/<h2>([^<]+)<\/h2>\s*<p>((?:(?!<\/p>|<h2)[\s\S])*)<\/p>\s*<p>\s*Starting at:\s*\$([0-9,]+)\s*<\/p>/g)) {
    const name = match[1].replace(/\s+/g, ' ').trim();
    if (seen.has(name)) continue;
    seen.add(name);
    const facts = match[2].replace(/<[^>]+>/g, ' ');
    if (!/\d+\s*Bed|Studio/i.test(facts)) continue;
    const beds = /studio/i.test(facts) ? 0 : Number((facts.match(/(\d+)\s*Bed/i) || [])[1]);
    const baths = Number((facts.match(/(\d+(?:\.\d+)?)\s*Bath/i) || [])[1]);
    const sqft = Number((facts.match(/([\d,]+)\s*sq\s?ft/i) || [])[1]?.replace(/,/g, ''));
    plans.push(plan({ name, beds, baths, sqft, low: match[3], high: match[3] }));
  }
  return plans.length ? plans : null;
}

export function parseG5(data) {
  const list = data?.data?.apartmentComplex?.floorplans;
  if (!Array.isArray(list)) return null;
  return list.map(item => plan({
    name: item.name,
    beds: Number(item.beds),
    baths: Number(item.baths),
    sqft: Number(item.sqft),
    low: item.startingRate,
    high: item.endingRate,
    available: Number(item.totalAvailableUnits),
  }));
}

async function readText(url, headers = {}) {
  const response = await fetch(url, { headers: { ...browserHeaders, ...headers }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
  if (!response.ok) throw new Error(`Could not open the page (${response.status})`);
  return response.text();
}

async function readJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: { ...browserHeaders, accept: 'application/json', ...options.headers },
    body: options.body,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Could not read prices (${response.status})`);
  return response.json();
}

const floorplanQuery = `query ApartmentComplex($locationUrn: String!, $moveInDate: String!) {
  apartmentComplex(locationUrn: $locationUrn) {
    floorplans(moveInDate: $moveInDate, dateFlexibility: 45) {
      name beds baths sqft startingRate endingRate totalAvailableUnits
    }
  }
}`;

export async function scrapeRents(place) {
  const page = await readText(place.website);
  if (/Just a moment|cf-browser-verification|Attention Required/i.test(page.slice(0, 2500))) {
    throw new Error('Their website asked for a browser check.');
  }
  let plans = null;
  if (place.kind === 'jonah') plans = parseJonah(page);
  if (place.kind === 'realpage') {
    const propertyId = page.match(/propertyId\s*=\s*'(\d+)'/)?.[1];
    const apiKey = page.match(/apiKey:\s*'([0-9a-f-]{36})'/i)?.[1];
    if (!propertyId || !apiKey) throw new Error('The price list was not on the page.');
    const data = await readJson(`https://api.ws.realpage.com/v2/property/${propertyId}/floorplans`, { headers: { 'x-ws-authkey': apiKey } });
    plans = parseRealpage(data);
  }
  if (place.kind === 'schema') plans = parseSchemaOffers(page);
  if (place.kind === 'cards') plans = parseFloorplanCards(page);
  if (place.kind === 'g5') {
    const locationUrn = page.match(/"locationUrn":\s*"(g5-cl-[a-z0-9-]+)"/)?.[1];
    if (!locationUrn) throw new Error('The price list was not on the page.');
    const today = new Date().toISOString().slice(0, 10);
    const data = await readJson('https://inventory.g5marketingcloud.com/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: new URL(place.website).origin, referer: place.website },
      body: JSON.stringify({ query: floorplanQuery, variables: { locationUrn, moveInDate: today } }),
    });
    plans = parseG5(data);
  }
  if (!plans?.length) throw new Error('No prices were listed.');
  return { plans };
}
