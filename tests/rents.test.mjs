import test from 'node:test';
import assert from 'node:assert/strict';
import { apartments, UTC, milesBetween } from '../apartments.js';
import { parseJonah, parseRealpage, parseG5, parseSchemaOffers, parseFloorplanCards } from '../rents.mjs';
import { startingRent } from '../explore-view.js';

test('distance from UTC to Palisade is a short trip', () => {
  const miles = milesBetween({ lat: 32.8704, lng: -117.2118 }, { lat: 32.8675832, lng: -117.212176 });
  assert.ok(miles > 0.1 && miles < 0.4);
});

test('Jonah floor-plan pages keep the listed price and bedroom count', () => {
  const html = `<script type="application/json" id="jd-fp-data-script-app">${JSON.stringify({
    floorplans: [
      { title: 'Studio A', bedrooms: 'Studio', bathrooms: '1', square_feet: '607', availability_count: 0, price_entity: { priceLow: 0, priceHigh: 0 } },
      { title: '1 Bedroom A', bedrooms: '1', bathrooms: '1', square_feet: '762', availability_count: 1, rent_min: '4675.50', price_entity: { priceLow: 4675.5, priceHigh: 4675.5 } },
    ],
  })}</script>`;
  const plans = parseJonah(html);
  assert.equal(plans[0].beds, 0);
  assert.equal(plans[0].low, null);
  assert.equal(plans[1].low, 4675.5);
  assert.equal(plans[1].available, 1);
  assert.equal(startingRent({ plans }), 4675.5);
});

test('RealPage and G5 responses become the same price shape', () => {
  const realpage = parseRealpage({ response: { floorplans: [{ name: '1 Bedroom', bedRooms: '1', bathRooms: '1', minimumSquareFeet: '700', minimumMarketRent: 2425, maximumMarketRent: 2425, depositAmount: 750 }] } });
  assert.deepEqual(realpage[0], { name: '1 Bedroom', beds: 1, baths: 1, sqft: 700, low: 2425, high: 2425, available: null, deposit: 750 });
  const g5 = parseG5({ data: { apartmentComplex: { floorplans: [{ name: '1X1', beds: 1, baths: '1.0', sqft: 640, startingRate: 2563, endingRate: 2823, totalAvailableUnits: 7 }] } } });
  assert.equal(g5[0].low, 2563);
  assert.equal(g5[0].high, 2823);
  assert.equal(g5[0].available, 7);
});

test('every listed apartment is a real community in the La Jolla area', () => {
  assert.ok(apartments.length >= 15);
  assert.ok(apartments.some(place => place.name === 'Costa Verde Village'));
  assert.ok(apartments.some(place => place.name === 'Towers at Costa Verde'));
  for (const place of apartments) {
    assert.ok(milesBetween(UTC, place) < 6, place.name);
    assert.ok(place.lat > 32.84 && place.lat < 32.90, place.name);
    assert.ok(place.lng > -117.28 && place.lng < -117.17, place.name);
    assert.ok(place.home.startsWith('https://'));
    if (place.photo) assert.ok(place.photo.startsWith('assets/'));
  }
});

test('schema.org and card pages keep the price printed on the site', () => {
  const schema = parseSchemaOffers(`<script type="application/ld+json">${JSON.stringify({
    '@type': 'Offer', itemOffered: { '@type': 'Apartment', name: '1 Bed 1 Bath A', numberOfBedrooms: 1, numberOfBathroomsTotal: 1, accommodationFloorPlan: { floorSize: { value: 650 } } }, price: 2498,
  })}</script>`);
  assert.equal(schema[0].low, 2498);
  assert.equal(schema[0].beds, 1);
  assert.equal(schema[0].sqft, 650);
  const cards = parseFloorplanCards('<h2>1 Bedroom 1 Bath Reno</h2><p><span>1 Bed</span><span>1 Bath</span><span>575 sqft</span></p><p>Starting at: $2,733</p><h2>1 Bedroom 1 Bath Reno</h2><p><span>1 Bed</span><span>1 Bath</span><span>575 sqft</span></p><p>Starting at: $2,733</p>');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].low, 2733);
  assert.equal(cards[0].sqft, 575);
});
