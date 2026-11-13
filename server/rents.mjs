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
  image: typeof fields.image === 'string' ? fields.image : null,
  url: typeof fields.url === 'string' ? fields.url : null,
  roomDimensions: Array.isArray(fields.roomDimensions) ? fields.roomDimensions : null,
});

export function parseJonah(html, pageUrl) {
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
      url: item.slug ? new URL(`${item.slug}/`, pageUrl).href : null,
    });
  });
}

async function addJonahImages(plans = []) {
  await Promise.all(plans.map(async item => {
    if (!item.url) return;
    try {
      const page = await readText(item.url);
      const image = page.match(/https?:\\?\/\\?\/[^"']+?(?:Listing|Detail)[^"']+?\.(?:jpe?g|png|webp)/i)?.[0];
      if (image) item.image = image.replaceAll('\\/', '/');
    } catch { /* Keep the plan usable when an individual image is unavailable. */ }
  }));
  return plans;
}

function publishedPlanImages(html, baseUrl) {
  const images = [];
  for (const tag of String(html).matchAll(/<img\b[^>]*>/gi)) {
    const source = tag[0].match(/\b(?:src|data-src|data-lazy-src)\s*=\s*["']([^"']+)/i)?.[1];
    const label = `${tag[0].match(/\balt\s*=\s*["']([^"']*)/i)?.[1] || ''} ${tag[0].match(/\btitle\s*=\s*["']([^"']*)/i)?.[1] || ''}`.replace(/\s+/g, ' ').trim();
    if (!source || !/floor\s*plan|floorplan|(?:studio|\d+)\s*(?:bed|bedroom)/i.test(`${label} ${source}`)) continue;
    try { images.push({ url: new URL(source.replaceAll('\\/', '/'), baseUrl).href, label: label.toLowerCase() }); } catch { /* Skip invalid published URLs. */ }
  }
  return [...new Map(images.map(image => [image.url, image])).values()];
}

function addPublishedPlanImages(plans, html, baseUrl) {
  if (!plans?.length) return plans;
  const images = publishedPlanImages(html, baseUrl);
  if (!images.length) return plans;
  return plans.map((item, index) => {
    if (item.image) return item;
    const name = item.name.toLowerCase();
    const direct = images.find(image => image.label.includes(name));
    // Positional pairing is used only when the official page exposes exactly one
    // floor-plan image per parsed plan; otherwise we avoid showing a wrong plan.
    const paired = images.length === plans.length ? images[index] : null;
    return { ...item, image: (direct || paired)?.url || null, url: item.url || baseUrl };
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

export function parseCatalog(html, baseUrl) {
  const plans = [], seen = new Set();
  const headings = [...String(html).matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const name = heading[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    const section = String(html).slice(heading.index, headings[index + 1]?.index || heading.index + 12000);
    const facts = section.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ');
    const bedMatch = facts.match(/(?:^|\s)(Studio|\d+)\s*(?:Bed|Bedroom)s?\b/i);
    const bathMatch = facts.match(/(\d+(?:\.\d+)?)\s*(?:Bath|Bathroom)s?\b/i);
    if (!bedMatch || !bathMatch) continue;
    const source = section.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)/i)?.[1];
    let image = null;
    try { if (source) image = new URL(source.replaceAll('\\/', '/'), baseUrl).href; } catch { /* A plan can still be used without an image. */ }
    const sqft = Number((facts.match(/([\d,]+)(?:\s*[-–to]+\s*[\d,]+)?\s*Sq\.?\s*(?:Ft)?/i) || [])[1]?.replace(/,/g, ''));
    const price = facts.match(/(?:Starting at|Rent)\s*\$?\s*([\d,]+(?:\.\d{2})?)/i)?.[1]
      || facts.match(/\$\s*([\d,]+(?:\.\d{2})?)(?:\s*(?:to|-)\s*\$?\s*[\d,]+)?\s*\/?\s*month/i)?.[1];
    seen.add(name.toLowerCase());
    plans.push(plan({ name, beds: /^studio$/i.test(bedMatch[1]) ? 0 : Number(bedMatch[1]), baths: Number(bathMatch[1]), sqft, low: price, image, url: baseUrl }));
  }
  return plans.length ? plans : null;
}

const exactRoomDimensions = {
  palisade: {
    '2 Bedroom C': [
      { name: 'Primary bedroom', length: 13.25, width: 18 + 1 / 12 },
      { name: 'Bedroom 2', length: 11 + 2 / 12, width: 11 + 5 / 12 },
    ],
  },
};

// These are official plan images used only when a property blocks the live feed.
// No price is fabricated: the client explicitly says to contact the property.
const publishedFallbackPlans = {
  regencia: [
    { name: 'Pinnacle', beds: 1, baths: 1, sqft: 880, image: 'https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_576,h_260/s3/2/93425/p1915702_la_regencia_pinnacle_2_floorplan.jpg' },
    { name: 'Belmont I', beds: 2, baths: 2, sqft: 1270, image: 'https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_576,h_260/s3/2/93425/p1915702_la_regencia_belmont_i_2_floorplan.jpg' },
    { name: 'Belmont II', beds: 2, baths: 2, sqft: 1200, image: 'https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_576,h_260/s3/2/93425/p1915702_la_regencia_belmont_ii_2_floorplan.jpg' },
    { name: 'Newport', beds: 2, baths: 2, sqft: 1300, image: 'https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_576,h_260/s3/2/93425/p1915702_la_regencia_newport_2_floorplan.jpg' },
    { name: 'Ventura I', beds: 3, baths: 2, sqft: 1450, image: 'https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_576,h_260/s3/2/93425/p1915702_la_regencia_ventura_i_2_floorplan.jpg' },
  ],
  blue: [
    { name: '1Bed 1 Bath 687sf', beds: 1, baths: 1, sqft: 687, image: 'https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_576,h_260/s3/2/206706/p1703223_la%20jolla%20blue_one%20bed_one%20bath_687sq_floorplan.png' },
    { name: '1Bed 1Bath 694sf', beds: 1, baths: 1, sqft: 694, image: 'https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_576,h_260/s3/2/206706/p1703223_la%20jolla%20blue_one%20bed_one%20bath_694sq_floorplan.png' },
    { name: '2Bed 2Bath 961sf', beds: 2, baths: 2, sqft: 961, image: 'https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_576,h_260/s3/2/206706/p1703223_la%20jolla%20blue_two%20bed_two%20bath_961sq_floorplan.png' },
  ],
};

function annotatePlans(id, plans) {
  const known = exactRoomDimensions[id] || {};
  return plans.map(item => {
    const roomDimensions = known[item.name] || item.roomDimensions || null;
    return { ...item, roomDimensions, areaStatus: roomDimensions ? 'official' : 'editable' };
  });
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
    image: item.imageUrl || item.imageUrls?.[0] || item.virtualImageUrl,
    url: item.brochurePdf || null,
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

async function addRealPageImages(place, plans) {
  if (!plans?.length) return plans;
  try {
    const galleryUrl = new URL('CmsSiteManager/callback.aspx?act=Proxy/GetFloorPlans', place.website).href;
    const gallery = await readJson(galleryUrl);
    const imagesByName = new Map((gallery.floorplans || []).map(item => {
      const image = item.floorPlanImages?.find(candidate => candidate.httpsSrc || candidate.src);
      const source = image?.httpsSrc || image?.src;
      return [String(item.name || '').trim().toLowerCase(), source ? source.replace('%s', '576x576') : null];
    }));
    return plans.map(item => ({ ...item, image: item.image || imagesByName.get(item.name.trim().toLowerCase()) || null, url: item.url || place.website }));
  } catch { return plans; }
}

const floorplanQuery = `query ApartmentComplex($locationUrn: String!, $moveInDate: String!) {
  apartmentComplex(locationUrn: $locationUrn) {
    floorplans(moveInDate: $moveInDate, dateFlexibility: 45) {
      name beds baths sqft startingRate endingRate totalAvailableUnits imageUrl imageUrls virtualImageUrl brochurePdf
    }
  }
}`;

export async function scrapeRents(place) {
  const page = await readText(place.website);
  if (/Just a moment|cf-browser-verification|Attention Required/i.test(page.slice(0, 2500))) {
    throw new Error('Their website asked for a browser check.');
  }
  let plans = null;
  if (place.kind === 'jonah') plans = await addJonahImages(parseJonah(page, place.website));
  if (place.kind === 'realpage') {
    const propertyId = page.match(/propertyId\s*=\s*'(\d+)'/)?.[1];
    const apiKey = page.match(/apiKey:\s*'([0-9a-f-]{36})'/i)?.[1];
    if (!propertyId || !apiKey) throw new Error('The price list was not on the page.');
    const data = await readJson(`https://api.ws.realpage.com/v2/property/${propertyId}/floorplans`, { headers: { 'x-ws-authkey': apiKey } });
    plans = await addRealPageImages(place, parseRealpage(data));
  }
  if (place.kind === 'schema') plans = parseSchemaOffers(page);
  if (place.kind === 'cards') plans = parseFloorplanCards(page);
  if (place.kind === 'catalog') plans = parseCatalog(page, place.website);
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
  return { plans: annotatePlans(place.id, addPublishedPlanImages(plans, page, place.website)) };
}

export function fallbackPlans(place) {
  const fallback = publishedFallbackPlans[place.id];
  if (!fallback) return null;
  return annotatePlans(place.id, fallback.map(item => plan({ ...item, url: item.url || place.website })));
}
