import { UTC, milesBetween } from './apartments.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount);

export function bedLabel(beds) {
  if (beds === 0) return 'Studio';
  if (beds === 1) return '1 bedroom';
  return `${beds} bedrooms`;
}

export function startingRent(result) {
  const prices = (result?.plans || []).map(item => item.low).filter(price => price > 0);
  return prices.length ? Math.min(...prices) : null;
}

function priceText(low, high) {
  if (!low) return '';
  if (!high || high === low) return money(low);
  return `${money(low)}–${money(high)}`;
}

function readWhen(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const age = Date.now() - then.getTime();
  if (age >= 0 && age < 90 * 1000) return 'read just now';
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(then);
  return `read at ${time}`;
}

function milesLabel(miles, fromYou) {
  const distance = miles < 10 ? miles.toFixed(1) : String(Math.round(miles));
  return fromYou ? `${distance} miles from you` : `${distance} miles away`;
}

function siteLink(place) {
  const label = place.home.includes('google.com/maps') ? 'Open in Google Maps' : `Visit ${place.sourceName}`;
  return `<a class="place-website" href="${escape(place.home)}" target="_blank" rel="noreferrer">${escape(label)}</a>`;
}

export function exploreShell() {
  return `<section class="page-intro"><h1>Apartments near La Jolla</h1><p>Drag the map to look around. Tap the map to drop a pin, and the 10 closest apartments show up.</p></section>
    <section class="map-section" aria-label="Map of apartments">
      <div id="apartment-map" class="apartment-map"><p class="map-fallback">Loading the map…</p></div>
      <div class="map-bar"><p id="map-status">Drag the map. Tap it to set your spot.</p><button type="button" class="button button-outline" data-near>Use my location</button></div>
    </section>
    <section class="browse-section" aria-label="Find an apartment">
      <label class="search-bar"><svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><span class="sr-only">Search apartments</span><input id="search" type="search" placeholder="Search any apartment in La Jolla…" autocomplete="off" /></label>
      <div class="filter-row"><div class="filters">
        <button class="filter-chip" id="bed-filter" type="button" aria-pressed="false">1 bedroom</button>
        <button class="filter-chip" id="two-bed-filter" type="button" aria-pressed="false">2 bedrooms</button>
        <button class="filter-chip" id="budget-filter" type="button" aria-pressed="false">Under $4,000</button>
        <button class="filter-chip" id="all-filters" type="button">All filters</button>
      </div><p id="results-count" aria-live="polite"></p></div>
      <div id="property-grid" class="place-list"></div>
    </section>
    <aside class="custom-banner"><div><h2>Have another apartment in mind?</h2><p>Work out a split for any rent.</p></div><a class="button button-outline" href="#/calculator">Open calculator</a></aside>
    <p class="listing-note">Search looks through every apartment in this area, even if it is off the screen. A price is shown when that apartment’s website can be read. Prices can change.</p>`;
}

export function placeCards(list, rentById, here, origin) {
  if (!list.length) return `<div class="empty-state"><h2>No apartments found</h2><p>Try another search or remove a filter.</p><button class="button button-outline" type="button" data-clear>Clear filters</button></div>`;
  const from = origin || here || UTC;
  return list.map((place, index) => {
    const originPoint = from;
    const miles = milesBetween(originPoint, place);
    const start = startingRent(rentById.get(place.id));
    const estimate = rentById.get(place.id)?.sample;
    const price = start ? `${estimate ? 'Est. from' : 'From'} ${money(start)}` : (place.kind ? 'See prices' : 'Ask them');
    const photo = place.photo
      ? `<img class="place-photo" src="${escape(place.photo)}" alt="${escape(place.photoAlt || place.name)}" />`
      : `<span class="place-photo place-photo-fallback" aria-hidden="true">${escape(place.name.slice(0, 1))}</span>`;
    return `<article class="place-card">
      <button class="place-open" type="button" data-place="${escape(place.id)}">
        <span class="place-photo-wrap">
          ${photo}
          <span class="place-index">${index + 1}</span>
        </span>
        <span class="place-copy"><strong>${escape(place.name)}</strong><span class="place-meta">${escape(place.near)} · ${milesLabel(miles, Boolean(here))}</span></span>
        <span class="place-price"><strong data-price-for="${escape(place.id)}">${price}</strong><span>${start || place.kind ? 'a month' : ''}</span></span>
      </button>
      ${siteLink(place)}
    </article>`;
  }).join('');
}

function planFacts(item) {
  const bits = [];
  if (item.baths) bits.push(`${item.baths} bath${item.baths === 1 ? '' : 's'}`);
  if (item.sqft) bits.push(`${item.sqft.toLocaleString()} sq ft`);
  if (item.available > 0) bits.push(`${item.available} available`);
  return bits.join(' · ');
}

export function placePage(place, result, here) {
  const miles = milesBetween(here || UTC, place);
  const when = readWhen(result?.fetchedAt);
  let body = place.kind ? '<p class="place-loading">Reading their website…</p>' : '<p class="place-loading">This website does not share a price list we can read. Ask them for the rent.</p>';
  if (result?.error) {
    body = `<p class="place-loading">${escape(result.error)}</p><button class="button button-outline" type="button" data-retry="${escape(place.id)}">Try again</button>`;
  } else if (result?.plans) {
    const groups = new Map();
    for (const item of result.plans) {
      if (!groups.has(item.beds)) groups.set(item.beds, []);
      groups.get(item.beds).push(item);
    }
    body = [...groups.keys()].sort((a, b) => a - b).map(beds => {
      const items = groups.get(beds).slice().sort((a, b) => (a.low || Infinity) - (b.low || Infinity));
      const priced = items.map(item => item.low).filter(Boolean);
    const from = priced.length ? (result.sample ? `Budget estimate: ${money(Math.min(...priced))}–${money(Math.max(...priced))} a month` : `Starts at ${money(Math.min(...priced))} a month`) : 'Ask them for the price';
      const rows = items.map(item => {
        const shown = priceText(item.low, item.high);
        const action = item.low
          ? `<button class="button button-outline split-button" type="button" data-split="${escape(place.id)}" data-rent="${item.low}" data-beds="${item.beds || 1}" data-plan="${escape(item.name)}">Split ${money(item.low)}</button>`
          : '<span class="place-meta">No price listed</span>';
        return `<li class="rent-row"><div><strong>${escape(item.name)}</strong><span class="place-meta">${escape(planFacts(item))}</span></div><div class="rent-action"><strong>${shown || 'Ask them'}</strong>${action}</div></li>`;
      }).join('');
      return `<section class="rent-group"><h2>${bedLabel(beds)}</h2><p class="rent-from">${from}</p><ul>${rows}</ul></section>`;
    }).join('');
  }
  return `<a class="back-link" href="#/explore"><span aria-hidden="true">←</span> All apartments</a>
    <section class="place-detail">
      ${place.photo ? `<img class="place-hero" src="${escape(place.photo)}" alt="${escape(place.photoAlt || place.name)}" />` : ''}
      <p class="place-kicker">${milesLabel(miles, Boolean(here))}</p><h1>${escape(place.name)}</h1><p class="place-address">${escape(place.address)}</p>
      <p class="place-source">${result?.sample ? 'Budget estimates are for comparison only. Check the property website for a current quote.' : result?.plans ? `Prices from ${escape(place.sourceName)}${when ? `, ${when}` : ''}. They can change.` : 'Open their website to ask about rent.'}</p>
      <p class="place-site">${siteLink(place)}</p>
      ${body}
    </section>`;
}
