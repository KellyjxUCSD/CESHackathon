import { newPlan, normalizePlan, breakdownRows, encodePlan, decodePlan, splitError } from './calculator.js';
import { calculatorView, liveSplitHTML, featureHint, costLabels, summaryText, rentIsSet, roomAreaText } from './calculator-view.js';
import { apartments, UTC, UCSD, milesBetween } from './apartments.js';
import { exploreShell, placeCards, placePage, startingRent } from './explore-view.js';
import { welcomeView } from './welcome.js';
import { createFloorPlanUpload } from './floor-plan-upload.js';

const paths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
};
const icon = name => `<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const store = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The app also works without browser storage. */ } };

let saved = read('rentwise-saved', []);
saved = new Set(Array.isArray(saved) ? saved.filter(id => apartments.some(place => place.id === id)) : []);
let here = null;
let lookMode = 'map';
let suppressMove = false;
let searchTimer = 0;
const rentById = new Map();
const rentLoads = new Map();
let map = null;
let markers = [];
let youMarker = null;
let mapsPromise = null;
let plan = normalizePlan(read('rentwise-plan', null));
let step = 1;
let currentPage = 'explore';
let revertBedrooms = false;
const filters = { search: '', beds: '', max: '', trolley: false, saved: false, sort: 'recommended' };
const main = document.querySelector('#main');
const modal = document.querySelector('#modal');
let toastTimeout;
const floorPlanUpload = createFloorPlanUpload({
  getPlan: () => plan,
  applyRooms: detected => {
    const previous = plan.roommates;
    plan.roommates = detected.map((info, index) => {
      const existing = previous.find(room => room.name.trim().toLowerCase() === info.name.toLowerCase());
      const room = existing ? structuredClone(existing) : blankRoom(index);
      Object.assign(room, { name: info.name, kind: info.kind, length: info.length || '', width: info.width || '', area: info.length && info.width ? info.length * info.width : 0 });
      if (info.kind === 'living' && !existing) room.occupants = 0;
      return room;
    });
    delete plan.lockedBedrooms;
    plan.method = 'weighted'; plan.splitVersion = 2;
    persist();
    if (currentPage === 'calculator' && step === 2) rerender();
  },
});

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => element.classList.remove('visible'), 2400);
}
const persist = () => store('rentwise-plan', plan);
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault(); main.focus(); main.scrollIntoView({ block: 'start' });
});
const closeButton = () => `<button class="modal-close" data-close aria-label="Close dialog">${icon('close')}</button>`;
function openModal(content) {
  document.querySelector('#modal-content').innerHTML = content;
  if (!modal.open) modal.showModal();
}
function mapStatus(text) {
  const note = document.querySelector('#map-status');
  if (note) note.textContent = text;
}
function mapCenter() {
  if (!map) return UTC;
  const center = map.getCenter();
  return center ? { lat: center.lat(), lng: center.lng() } : UTC;
}
function orderedApartments() {
  const query = filters.search.toLowerCase().trim();
  const origin = lookMode === 'nearest' && here ? here : mapCenter();
  const list = apartments.filter(place => {
    const rent = startingRent(rentById.get(place.id));
    const bedsOk = !filters.beds || !place.bedsOffered?.length || (filters.beds === '3' ? place.bedsOffered.some(count => count >= 3) : place.bedsOffered.includes(Number(filters.beds)));
    const priceOk = !filters.max || rent == null || rent < Number(filters.max);
    const text = !query || `${place.name} ${place.address} ${place.near}`.toLowerCase().includes(query);
    return text && bedsOk && priceOk && (!filters.saved || saved.has(place.id));
  });
  if (filters.sort === 'low' || filters.sort === 'high') {
    list.sort((a, b) => {
      const left = startingRent(rentById.get(a.id));
      const right = startingRent(rentById.get(b.id));
      if (left == null) return 1;
      if (right == null) return -1;
      return filters.sort === 'low' ? left - right : right - left;
    });
  } else list.sort((a, b) => milesBetween(origin, a) - milesBetween(origin, b));
  if (query) return list;
  if (lookMode === 'nearest' && here) return list.slice(0, 10);
  if (lookMode === 'map' && map?.getBounds()) return list.filter(place => map.getBounds().contains(place));
  return list;
}
function focusMatches(list) {
  if (!map || !list.length) return;
  const bounds = new google.maps.LatLngBounds();
  list.forEach(place => bounds.extend(place));
  suppressMove = true;
  map.fitBounds(bounds, 64);
  google.maps.event.addListenerOnce(map, 'idle', () => {
    if (map && map.getZoom() > 15) map.setZoom(15);
    suppressMove = false;
  });
}
let moveTimer = 0;
function showViewport() {
  if (suppressMove || filters.search.trim()) return;
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    if (suppressMove || filters.search.trim()) return;
    lookMode = 'map';
    mapStatus('Apartments in this part of the map.');
    renderListings();
  }, 180);
}
function paintChips() {
  const one = document.querySelector('#bed-filter');
  const two = document.querySelector('#two-bed-filter');
  const budget = document.querySelector('#budget-filter');
  const more = document.querySelector('#all-filters');
  if (!one) return;
  one.classList.toggle('selected', filters.beds === '1');
  one.setAttribute('aria-pressed', filters.beds === '1');
  two.classList.toggle('selected', filters.beds === '2');
  two.setAttribute('aria-pressed', filters.beds === '2');
  budget.classList.toggle('selected', filters.max === '4000');
  budget.setAttribute('aria-pressed', filters.max === '4000');
  more.classList.toggle('selected', filters.sort !== 'recommended' || filters.beds === '3' || (filters.max && filters.max !== '4000'));
}
function renderExplore() {
  map = null;
  markers = [];
  youMarker = null;
  main.className = 'explore-page page-container';
  main.innerHTML = exploreShell();
  document.querySelector('#search').value = filters.search;
  document.querySelector('#search').addEventListener('input', event => {
    filters.search = event.target.value;
    lookMode = filters.search.trim() ? 'search' : (here ? 'nearest' : 'map');
    mapStatus(filters.search.trim() ? 'Search looks through every apartment, even ones off the map.' : (here ? 'These are the 10 closest apartments.' : 'Apartments in this part of the map.'));
    renderListings();
    clearTimeout(searchTimer);
    if (filters.search.trim()) searchTimer = setTimeout(() => focusMatches(orderedApartments()), 300);
  });
  document.querySelector('#bed-filter').addEventListener('click', () => { filters.beds = filters.beds === '1' ? '' : '1'; renderListings(); });
  document.querySelector('#two-bed-filter').addEventListener('click', () => { filters.beds = filters.beds === '2' ? '' : '2'; renderListings(); });
  document.querySelector('#budget-filter').addEventListener('click', () => { filters.max = filters.max === '4000' ? '' : '4000'; renderListings(); });
  document.querySelector('#all-filters').addEventListener('click', showFilters);
  renderListings();
  ensureMap();
  prefetchRents();
}
function renderListings() {
  const list = orderedApartments();
  const count = document.querySelector('#results-count');
  const grid = document.querySelector('#property-grid');
  if (!count || !grid) return;
  count.textContent = `${list.length} ${list.length === 1 ? 'apartment' : 'apartments'}`;
  const pinned = lookMode === 'nearest' && here ? here : null;
  grid.innerHTML = placeCards(list, rentById, pinned, pinned || mapCenter());
  paintChips();
  drawMarkers();
}
function prefetchRents() {
  apartments.forEach(place => { if (place.kind) loadRents(place.id).then(() => { if (currentPage === 'explore') renderListings(); }); });
}
function loadRents(id) {
  if (rentById.has(id)) return Promise.resolve(rentById.get(id));
  if (!rentLoads.has(id)) {
    const request = fetch(`/api/rents?id=${encodeURIComponent(id)}`).then(response => response.json()).then(data => {
      const result = data.plans ? { plans: data.plans, fetchedAt: data.fetchedAt } : { error: data.error || 'We could not read their website just now.' };
      rentById.set(id, result);
      return result;
    }).catch(() => {
      const result = { error: 'We could not read their website just now.' };
      rentById.set(id, result);
      return result;
    }).finally(() => rentLoads.delete(id));
    rentLoads.set(id, request);
  }
  return rentLoads.get(id);
}
function ensureMap() {
  const frame = document.querySelector('#apartment-map');
  if (!frame) return;
  if (!mapsPromise) {
    window.gm_authFailure = () => {
      const box = document.querySelector('#apartment-map');
      if (box) box.innerHTML = '<p class="map-fallback">The map did not open. The apartments are still listed below.</p>';
    };
    mapsPromise = fetch('/api/maps-key').then(response => response.json()).then(data => {
      if (!data.key) return false;
      return new Promise(resolve => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(data.key)}&v=weekly`;
        script.async = true;
        script.onload = () => resolve(Boolean(window.google?.maps));
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    }).catch(() => false);
  }
  mapsPromise.then(ready => {
    const box = document.querySelector('#apartment-map');
    if (!box || map) return;
    if (!ready) { box.innerHTML = '<p class="map-fallback">The map did not open. The apartments are still listed below.</p>'; return; }
    map = new google.maps.Map(box, {
      center: { lat: 32.864, lng: -117.22 }, zoom: 13, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false, gestureHandling: 'cooperative',
    });
    const bounds = new google.maps.LatLngBounds();
    apartments.forEach(place => bounds.extend(place));
    suppressMove = true;
    map.fitBounds(bounds, 48);
    let dragged = false;
    map.addListener('dragstart', () => { dragged = true; });
    map.addListener('click', event => {
      if (dragged) return;
      if (!event.latLng) return;
      here = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      filters.search = '';
      const search = document.querySelector('#search');
      if (search) search.value = '';
      lookMode = 'nearest';
      mapStatus('Pin dropped. These are the 10 closest apartments.');
      suppressMove = true;
      renderListings();
      setTimeout(() => { suppressMove = false; }, 500);
    });
    map.addListener('dragend', () => {
      showViewport();
      setTimeout(() => { dragged = false; }, 300);
    });
    map.addListener('zoom_changed', showViewport);
    google.maps.event.addListenerOnce(map, 'idle', () => {
      if (map && map.getZoom() > 14) map.setZoom(13);
      suppressMove = false;
      if (lookMode === 'map') renderListings();
    });
    drawMarkers();
  });
}
function drawMarkers() {
  if (!map) return;
  markers.forEach(marker => marker.setMap(null));
  markers = orderedApartments().map((place, index) => {
    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng }, map, title: place.name,
      label: { text: String(index + 1), color: '#111827', fontSize: '12px', fontWeight: '600' },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#ffffff', fillOpacity: 1, strokeColor: '#111827', strokeWeight: 1.5 },
    });
    marker.addListener('click', () => { location.hash = `/place/${place.id}`; });
    return marker;
  });
  if (youMarker) youMarker.setMap(null);
  youMarker = here ? new google.maps.Marker({
    position: here, map, title: 'You', zIndex: 10,
    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#111827', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
  }) : null;
}
function useMyLocation() {
  const status = document.querySelector('#map-status');
  if (!navigator.geolocation) { if (status) status.textContent = 'This browser cannot share your location. Tap the map to drop a pin instead.'; return; }
  if (status) status.textContent = 'Finding you…';
  navigator.geolocation.getCurrentPosition(position => {
    here = { lat: position.coords.latitude, lng: position.coords.longitude };
    filters.search = '';
    const search = document.querySelector('#search');
    if (search) search.value = '';
    lookMode = 'nearest';
    const miles = milesBetween(here, UCSD);
    mapStatus(miles > 30 ? `You are about ${Math.round(miles)} miles from UCSD. The 10 closest apartments there are listed.` : 'These are the 10 closest apartments.');
    if (map && miles <= 30) {
      suppressMove = true;
      map.panTo(here);
      google.maps.event.addListenerOnce(map, 'idle', () => { suppressMove = false; });
    }
    renderListings();
  }, () => { mapStatus('Location stayed off. Tap the map to drop a pin instead.'); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
}
function renderPlace(id) {
  const place = apartments.find(item => item.id === id);
  main.className = 'explore-page page-container';
  if (!place) {
    main.innerHTML = `<a class="back-link" href="#/explore"><span aria-hidden="true">←</span> All apartments</a><section class="place-missing"><h1>That apartment is not on this map.</h1></section>`;
    return;
  }
  main.innerHTML = placePage(place, rentById.get(id) || null, here);
  if (!place.kind || rentById.has(id)) return;
  loadRents(id).then(result => { if (location.hash === `#/place/${id}`) main.innerHTML = placePage(place, result, here); });
}
function showFilters() {
  openModal(`${closeButton()}<form id="filters-form" class="text-modal"><h2 id="modal-title">Filter apartments</h2>
    <label class="field"><span>Bedrooms</span><select name="beds"><option value="">Any</option><option value="1">1 bedroom</option><option value="2">2 bedrooms</option><option value="3">3+ bedrooms</option></select></label>
    <label class="field"><span>Monthly rent for the apartment</span><select name="max"><option value="">Any price</option><option value="3500">Under $3,500</option><option value="4000">Under $4,000</option><option value="5000">Under $5,000</option></select></label>
    <label class="field"><span>Sort by</span><select name="sort"><option value="recommended">Closest</option><option value="low">Lowest rent</option><option value="high">Highest rent</option></select></label>
    <div class="modal-actions"><button class="text-button" type="button" data-clear>Clear filters</button><button class="button button-primary" type="submit">Show apartments</button></div></form>`);
  const form = document.querySelector('#filters-form');
  form.elements.beds.value = filters.beds; form.elements.max.value = filters.max; form.elements.sort.value = filters.sort;
  form.addEventListener('submit', event => {
    event.preventDefault();
    Object.assign(filters, { beds: form.elements.beds.value, max: form.elements.max.value, sort: form.elements.sort.value });
    modal.close(); renderExplore(); document.querySelector('#all-filters').focus();
  });
}

function blankRoom(index) {
  const room = structuredClone(newPlan().roommates[0]);
  room.name = `Room ${index + 1}`;
  return room;
}
function roomWasEdited(room, index) {
  const named = room.name.trim() && room.name.trim() !== `Room ${index + 1}`;
  const namedPeople = (room.names || []).some(name => name.trim());
  return named || namedPeople || room.length || room.width || room.kind !== 'bedroom' || room.preference !== 1 || room.budgets.some(value => value !== '') || room.area !== 100 || room.occupants !== 1 || room.windows !== 'normal' || room.closet !== 'normal' || room.bath !== 'shared';
}
function applyBedroomCount(count) {
  while (plan.roommates.length < count) plan.roommates.push(blankRoom(plan.roommates.length));
  plan.roommates.length = count;
  persist();
}
function startFromRent(id, rent, beds, floorPlan) {
  const place = apartments.find(item => item.id === id);
  if (!place || !Number(rent)) return;
  floorPlanUpload.reset();
  plan = newPlan();
  plan.property = place.name;
  plan.floorPlan = String(floorPlan || '').slice(0, 80);
  plan.rent = Math.round(Number(rent) * 100) / 100;
  const count = Math.min(6, Math.max(1, Number(beds) || 1));
  plan.lockedBedrooms = count;
  plan.roommates = Array.from({ length: count }, (_, index) => blankRoom(index));
  persist(); step = 1;
  if (currentPage === 'calculator') renderCalculator(); else location.hash = '/calculator';
}
function renderCalculator(focus = false) {
  if (step === 2 && ['size','rooms'].includes(plan.method)) { plan.method = 'weighted'; plan.splitVersion = 2; persist(); }
  main.className = 'calculator-page page-container calculator-wizard';
  main.innerHTML = calculatorView(plan, step);
  floorPlanUpload.mount(main.querySelector('#floor-plan-upload'));
  const form = document.querySelector('#calculator-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm() || step === 3) return;
    if (step === 1 && plan.method === 'size') { plan.method = 'weighted'; plan.splitVersion = 2; }
    step = step === 1 ? 2 : 3;
    persist(); renderCalculator(true);
    window.scrollTo({ top: 0 });
  });
  form.addEventListener('input', onCalculatorInput);
  form.addEventListener('change', onCalculatorChange);
  if (focus) {
    const heading = main.querySelector(step === 2 ? '#live-split' : step === 3 ? '.common-question, .result-heading h2' : 'h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
}
function refreshPreview() {
  const live = main.querySelector('#live-split');
  if (live) live.innerHTML = liveSplitHTML(plan);
  main.querySelectorAll('[data-factor-hint]').forEach(node => { node.textContent = featureHint(plan, Number(node.dataset.roomIndex), node.dataset.factorHint); });
  const labels = costLabels(plan);
  const bills = main.querySelector('#bill-summary');
  if (bills) bills.textContent = labels.bills;
  const moveIn = main.querySelector('#move-in-summary');
  if (moveIn) moveIn.textContent = labels.moveIn;
  const ready = rentIsSet(plan);
  main.querySelectorAll('.wizard-progress [data-step]').forEach(button => {
    if (Number(button.dataset.step) === 1) return;
    button.disabled = !ready;
  });
}
function rerender(focusSelector) {
  const open = [...main.querySelectorAll('details[open]')].map(details => details.dataset.details).filter(Boolean);
  const y = window.scrollY;
  renderCalculator(false);
  open.forEach(id => { const details = main.querySelector(`details[data-details="${id}"]`); if (details) details.open = true; });
  window.scrollTo({ top: y });
  if (focusSelector) main.querySelector(focusSelector)?.focus();
}
function billSetting(id) {
  if (id.startsWith('extra')) return plan.extraFees[Number(id.slice(5))];
  return plan.billSplits[id] ||= { split: 'equal', percentages: [] };
}
function onCalculatorInput(event) {
  const input = event.target;
  if (input.dataset.extraLabel !== undefined || input.dataset.extraAmount !== undefined) {
    const index = Number(input.dataset.extraLabel ?? input.dataset.extraAmount);
    if (input.dataset.extraLabel !== undefined) plan.extraFees[index].label = input.value;
    else if (input.validity.valid) plan.extraFees[index].amount = input.value === '' ? 0 : input.valueAsNumber;
    persist(); refreshPreview(); return;
  }
  if (input.dataset.billPercent !== undefined) {
    const setting = billSetting(input.dataset.billPercent);
    setting.percentages[Number(input.dataset.resident)] = input.value === '' ? '' : input.valueAsNumber;
    persist(); rerender(`[data-bill-percent="${input.dataset.billPercent}"][data-resident="${input.dataset.resident}"]`); return;
  }
  if (input.dataset.money) {
    const key = input.dataset.money;
    if (key === 'rent') plan.rent = input.value === '' ? '' : input.validity.valid ? input.valueAsNumber : plan.rent;
    else if (input.value === '') plan[key] = 0;
    else if (input.validity.valid) plan[key] = input.valueAsNumber;
    else return;
    persist(); refreshPreview();
    return;
  }
  const index = Number(input.dataset.roomIndex);
  const room = plan.roommates[index];
  if (!room) return;
  if (input.dataset.dimension || input.hasAttribute('data-preference') || input.dataset.personBudget !== undefined) {
    if (input.dataset.personBudget !== undefined) {
      if (input.validity.valid) room.budgets[Number(input.dataset.personBudget)] = input.value === '' ? '' : input.valueAsNumber;
    } else if (input.hasAttribute('data-preference')) room.preference = input.value === '' ? 0 : input.validity.valid ? input.valueAsNumber : room.preference;
    else {
      input.closest('[data-room-card]').querySelectorAll('[data-dimension]').forEach(field => field.setCustomValidity(''));
      room[input.dataset.dimension] = input.value === '' ? '' : input.validity.valid ? input.valueAsNumber / (plan.dimensionUnit === 'm' ? .3048 : 1) : room[input.dataset.dimension];
      room.area = room.length && room.width ? room.length * room.width : 0;
      const card = input.closest('[data-room-card]');
      card.querySelector('[data-calculated-area]').textContent = roomAreaText(room, plan.dimensionUnit);
      card.querySelectorAll('[data-dimension]').forEach(field => field.setCustomValidity(room.area > 10000 ? 'Floor area must be 10,000 ft² or less. Check your measurements and units.' : ''));
    }
    persist(); refreshPreview(); return;
  }
  if (input.hasAttribute('data-room-name')) {
    room.name = input.value;
    const heading = main.querySelector(`#room-heading-${index}`);
    if (heading) heading.textContent = input.value.trim() || `Room ${index + 1}`;
    persist(); refreshPreview();
  } else if (input.dataset.personName !== undefined) {
    room.names[Number(input.dataset.personName)] = input.value;
    persist(); refreshPreview();

  }
}
function onCalculatorChange(event) {
  const input = event.target;
  if (input.hasAttribute('data-units')) { plan.dimensionUnit = input.value; persist(); rerender('[data-units]'); return; }
  if (input.dataset.billSplit !== undefined) { billSetting(input.dataset.billSplit).split = input.value; persist(); rerender(`[data-bill-split="${input.dataset.billSplit}"]`); return; }
  const space = plan.roommates[Number(input.dataset.roomIndex)];
  if (input.hasAttribute('data-space-kind') || input.hasAttribute('data-occupants')) {
    if (input.hasAttribute('data-space-kind')) space.kind = input.value;
    else {
      space.occupants = Number(input.value);
      while (space.names.length < space.occupants) { space.names.push(''); space.budgets.push(''); }
      plan.billSplits = {}; plan.extraFees.forEach(fee => { fee.split = 'equal'; fee.percentages = []; });
    }
    persist(); rerender(input.hasAttribute('data-space-kind') ? `[data-space-kind][data-room-index="${input.dataset.roomIndex}"]` : `[data-occupants][data-room-index="${input.dataset.roomIndex}"]`); return;
  }
  if (input.name === 'method') {
    plan.method = input.value; plan.splitVersion = 2;
    persist();
    rerender(`input[name="method"][value="${plan.method}"]`);
    return;
  }
  if (input.name === 'common-space') {
    plan.commonSpace = input.value;
    persist();
    rerender(`input[name="common-space"][value="${input.value}"]`);
    return;
  }
  if (input.hasAttribute('data-bedrooms')) {
    if (plan.lockedBedrooms) return;
    const count = Number(input.value);
    const removed = plan.roommates.slice(count);
    if (count < plan.roommates.length && removed.some((room, offset) => roomWasEdited(room, count + offset))) {
      const names = removed.map((room, offset) => room.name.trim() || `Room ${count + offset + 1}`);
      revertBedrooms = true;
      openModal(`${closeButton()}<div class="text-modal"><h2 id="modal-title">Remove ${removed.length === 1 ? 'a bedroom' : `${removed.length} bedrooms`}?</h2><p>${escape(names.join(', '))} will be dropped from this split.</p><div class="modal-actions"><button class="text-button" type="button" data-close>Keep bedrooms</button><button class="button button-primary" type="button" data-confirm-bedrooms="${count}">Remove</button></div></div>`);
      return;
    }
    applyBedroomCount(count);
    return;
  }
  if (input.hasAttribute('data-first')) { plan.includeFirst = input.checked; persist(); refreshPreview(); return; }
  const index = Number(input.dataset.roomIndex);
  const room = plan.roommates[index];
  if (!room) return;
  if (input.hasAttribute('data-shared')) {
    room.occupants = input.checked ? 2 : 1;
    persist();
    rerender(`[data-shared][data-room-index="${index}"]`);
  } else if (input.dataset.bathOption) {
    room.bath = input.checked ? input.dataset.bathOption : 'shared';
    plan.method = 'weighted'; plan.splitVersion = 2;
    input.closest('[data-room-card]')?.querySelectorAll('[data-bath-option]').forEach(box => { box.checked = box.dataset.bathOption === room.bath; });
    persist(); refreshPreview();
  } else if (input.dataset.roomFactor) {
    room[input.dataset.roomFactor] = input.value;
    plan.method = 'weighted'; plan.splitVersion = 2;
    input.closest('fieldset')?.querySelectorAll('.choice').forEach(option => option.classList.toggle('selected', option.querySelector('input').checked));
    persist(); refreshPreview();
  }
}
function validateForm() {
  const form = document.querySelector('#calculator-form');
  const invalid = form.querySelector(':invalid');
  if (invalid) { const details = invalid.closest('details'); if (details) details.open = true; }
  if (!form.reportValidity()) return false;
  if (step === 2 && plan.roommates.some(room => room.length * room.width > 10000)) { toast('Check room dimensions. Floor area must be 10,000 ft² or less.'); return false; }
  if (step === 2) { const error = splitError(plan, false); if (error) { toast(error); return false; } }
  return true;
}

async function copyText(text, title, success) {
  try { await navigator.clipboard.writeText(text); toast(success); }
  catch {
    openModal(`${closeButton()}<div class="text-modal"><h2 id="modal-title">${title}</h2><p>Copy this text.</p><label class="field"><span>${title}</span><textarea id="share-link" readonly rows="8">${escape(text)}</textarea></label><button class="button button-primary" data-close>Done</button></div>`);
    document.querySelector('#share-link').select();
  }
}
function sharePlan() {
  const url = `${location.origin}${location.pathname}#/calculator?plan=${encodePlan(plan)}&step=${step}`;
  copyText(url, 'Share this plan', 'Share link copied.');
}
function copySummary() {
  copyText(summaryText(plan), 'Copy summary', 'Summary copied.');
}
function downloadBreakdown() {
  const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const safe = value => /^[=+\-@\t\r\n]/.test(String(value ?? '')) ? `'${value}` : value;
  const rows = breakdownRows(plan).map(row => row.map(cell => safe(cell)));
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csv).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
  Object.assign(document.createElement('a'), { href: url, download: 'rentwise-breakdown.csv' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Breakdown downloaded.');
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-add-space') && plan.roommates.length < 12) { plan.roommates.push(blankRoom(plan.roommates.length)); persist(); rerender(); }
  if (button.dataset.removeSpace !== undefined && plan.roommates.length > 1) { plan.roommates.splice(Number(button.dataset.removeSpace), 1); plan.billSplits = {}; plan.extraFees.forEach(fee => { fee.split = 'equal'; fee.percentages = []; }); persist(); rerender(); }
  if (button.hasAttribute('data-add-extra') && plan.extraFees.length < 12) { plan.extraFees.push({id:`extra${plan.extraFees.length}`, label:'Monthly fee', amount:0, split:'equal', percentages:[]}); persist(); rerender(); main.querySelector('[data-details="extra-fees"]').open = true; }
  if (button.dataset.removeExtra !== undefined) { plan.extraFees.splice(Number(button.dataset.removeExtra),1); plan.extraFees.forEach((fee,index)=>{fee.id=`extra${index}`;}); persist(); rerender(); }
  if (button.dataset.place) location.hash = `/place/${button.dataset.place}`;
  if (button.dataset.split) startFromRent(button.dataset.split, button.dataset.rent, button.dataset.beds, button.dataset.plan);
  if (button.dataset.retry) { rentById.delete(button.dataset.retry); renderPlace(button.dataset.retry); }
  if (button.hasAttribute('data-near')) useMyLocation();
  if (button.hasAttribute('data-close')) modal.close();
  if (button.hasAttribute('data-clear')) { Object.assign(filters, { search: '', beds: '', max: '', trolley: false, saved: false, sort: 'recommended' }); modal.close(); renderExplore(); document.querySelector('#search').focus(); }
  if (button.dataset.step) {
    const target = Number(button.dataset.step);
    if (target === step || button.disabled) return;
    if (target > 1 && !rentIsSet(plan)) return;
    if (target > step && !validateForm()) return;
    if (step === 1 && target > 1 && plan.method === 'size') { plan.method = 'weighted'; plan.splitVersion = 2; }
    step = target; persist(); renderCalculator(true); window.scrollTo({ top: 0 });
  }
  if (button.hasAttribute('data-back')) { step = Math.max(1, step - 1); renderCalculator(true); window.scrollTo({ top: 0 }); }
  if (button.hasAttribute('data-reset')) openModal(`${closeButton()}<div class="text-modal"><h2 id="modal-title">Start over?</h2><p>This clears the rent, the rooms, and the split saved on this device.</p><div class="modal-actions"><button class="text-button" type="button" data-close>Keep this split</button><button class="button button-primary" type="button" data-confirm-reset>Start over</button></div></div>`);
  if (button.hasAttribute('data-confirm-reset')) { floorPlanUpload.reset(); plan = newPlan(); step = 1; persist(); modal.close(); renderCalculator(true); toast('Calculation reset.'); }
  if (button.dataset.confirmBedrooms) { applyBedroomCount(Number(button.dataset.confirmBedrooms)); modal.close(); }
  if (button.hasAttribute('data-custom')) { plan.property = ''; delete plan.floorPlan; delete plan.lockedBedrooms; step = 1; persist(); renderCalculator(); document.querySelector('[data-money="rent"]').focus(); }
  if (button.hasAttribute('data-share')) sharePlan();
  if (button.hasAttribute('data-summary')) copySummary();
  if (button.hasAttribute('data-download')) downloadBreakdown();
});
modal.addEventListener('click', event => {
  if (event.target !== modal) return;
  const rect = modal.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
});
modal.addEventListener('close', () => {
  if (!revertBedrooms) return;
  revertBedrooms = false;
  const select = document.querySelector('[data-bedrooms]');
  if (select) select.value = String(plan.roommates.length);
});
document.querySelector('#about-button').addEventListener('click', () => openModal(`${closeButton()}<div class="text-modal"><h2 id="modal-title">About Rentwise</h2><p>See apartments around San Diego, then work out what each person pays.</p><p>The price is read from that apartment’s website when you open it. Some sites do not share a price list. Prices can change.</p><button class="button button-primary" data-close>Close</button></div>`));
document.querySelector('#privacy-button').addEventListener('click', () => openModal(`${closeButton()}<div class="text-modal"><h2 id="modal-title">Your privacy</h2><p>Your calculation stays in this browser. No account is needed.</p><p>Use my location asks the browser where you are. Tapping the map also sets a spot. That location is not saved.</p><p>The map is Google Maps. Share links include the names and amounts in your plan.</p><button class="button button-primary" data-close>Close</button></div>`));

function route() {
  const [path, query = ''] = location.hash.slice(1).split('?');
  const placeId = path.startsWith('/place/') ? decodeURIComponent(path.slice('/place/'.length)) : '';
  currentPage = path === '/calculator' ? 'calculator' : placeId ? 'place' : (path === '/welcome' || !path || path === '/') ? 'welcome' : 'explore';
  const params = new URLSearchParams(query);
  if (currentPage === 'calculator' && params.has('plan')) {
    try { floorPlanUpload.reset(); plan = decodePlan(params.get('plan')); const sharedStep = Number(params.get('step')); step = [1, 2, 3].includes(sharedStep) ? sharedStep : 3; persist(); toast('Shared plan opened.'); }
    catch { step = 1; toast('This link could not be opened.'); }
    history.replaceState(null, '', `${location.pathname}${location.search}#/calculator`);
  } else if (currentPage === 'calculator' && params.has('new')) {
    floorPlanUpload.reset();
    plan = newPlan();
    step = 1;
    persist();
    history.replaceState(null, '', `${location.pathname}${location.search}#/calculator`);
  }
  const section = currentPage === 'calculator' ? 'calculator' : currentPage === 'welcome' ? '' : 'explore';
  document.querySelectorAll('[data-nav]').forEach(link => { if (link.dataset.nav === section) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  const place = apartments.find(item => item.id === placeId);
  document.title = `${currentPage === 'calculator' ? 'Rent Calculator' : currentPage === 'welcome' ? 'Welcome' : place ? place.name : 'Apartments near UCSD'} — Rentwise`;
  if (currentPage === 'calculator') renderCalculator();
  else if (currentPage === 'welcome') {
    main.className = 'welcome-page'; main.innerHTML = welcomeView();
    main.querySelectorAll('.art-room').forEach(room => {
      const select = () => { main.querySelectorAll('.art-room').forEach(item => item.setAttribute('aria-pressed', String(item === room))); };
      room.addEventListener('click', select);
      room.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
    });
  }
  else if (placeId) renderPlace(placeId);
  else renderExplore();
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', route);
route();
