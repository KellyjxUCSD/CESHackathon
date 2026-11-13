import { billItems, residentList } from './roommate-logic.js';
import { allocateCents, calculate } from './calculator.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
const arrow = '<span aria-hidden="true">→</span>';
const FACTORS = {
  bath: { label: 'Bathroom', baseline: 'shared', phrase: { half: 'Private half bath', private: 'Private bath' }, options: [['shared', 'Shared'], ['half', 'Private half bath'], ['private', 'Private full bath']] },
  windows: { label: 'Windows', baseline: 'normal', phrase: { none: 'No windows', large: 'Large windows' }, options: [['none', 'None'], ['normal', 'Normal'], ['large', 'Large']] },
  closet: { label: 'Closet', baseline: 'normal', phrase: { none: 'No closet', large: 'Large closet' }, options: [['none', 'None'], ['normal', 'Normal'], ['large', 'Large']] },
};

export const rentIsSet = plan => plan.rent !== '' && plan.rent != null && Number.isFinite(Number(plan.rent));
export const METHOD_HINT = {
  rooms: 'Rent follows each occupied space’s size, privacy, and bathroom. People sharing a space split its share equally.',
  equal: 'Everyone pays the same. Room size is ignored.',
};
export const COMMON_HINT = {
  small: 'About a third of the rent is shared equally. Room size changes the rest.',
  average: 'Half the rent is shared equally. Room size changes the rest.',
  large: 'About two thirds of the rent is shared equally. Room size changes the rest.',
};

const currency = (plan, key, label, { required = false, placeholder = '0', blankZero = true } = {}) => {
  const raw = plan[key];
  const value = blankZero && !raw ? '' : raw;
  return `<label class="field"><span>${label}</span><div class="currency-input"><span aria-hidden="true">$</span><input type="number" data-money="${key}" min="0" max="1000000" step="0.01" ${required ? 'required' : ''} inputmode="decimal" placeholder="${placeholder}" value="${value}" aria-label="${label}" /></div></label>`;
};
const choice = (name, value, label, checked) => `<label class="choice ${checked ? 'selected' : ''}"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} /><span>${label}</span></label>`;

function dollarShares(centsList) {
  const totalCents = centsList.reduce((sum, cents) => sum + cents, 0);
  if (!totalCents) return centsList.map(() => 0);
  return allocateCents(Math.round(totalCents / 100), centsList);
}

function joinParts(parts) {
  const [first, ...rest] = parts;
  const head = first.charAt(0).toUpperCase() + first.slice(1);
  if (!rest.length) return `${head}.`;
  if (rest.length === 1) return `${head} and ${rest[0]}.`;
  return `${head}, ${rest.slice(0, -1).join(', ')}, and ${rest.at(-1)}.`;
}

function shareReason(plan, roomIndex) {
  const room = plan.roommates[roomIndex];
  if (!room) return '';
  if (plan.method === 'equal') return 'Everyone pays the same.';
  if (plan.method === 'size') return 'Half the rent is shared equally between rooms. Half follows room size.';
  if (plan.roommates.length === 1) return room.occupants === 2 ? 'Two people split this rent.' : 'This person pays the rent.';
  const areas = plan.roommates.map(item => item.area);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  let size = '';
  if (max !== min) {
    const largest = areas.filter(area => area === max).length;
    const smallest = areas.filter(area => area === min).length;
    if (room.area === max) size = largest === 1 ? 'larger room' : 'one of the larger rooms';
    else if (room.area === min) size = smallest === 1 ? 'smaller room' : 'one of the smaller rooms';
  }
  let bath = '';
  if (room.bath === 'private') bath = 'a private bath';
  else if (room.bath === 'half') bath = 'a private half bath';
  else if (plan.roommates.some(item => item.bath !== 'shared')) bath = 'a shared bathroom';
  if (plan.method === 'weighted') {
    const privacy = room.kind === 'living' ? 'a living-room sleeping space' : room.kind === 'open' ? 'an open den or loft' : '';
    const preference = room.preference !== 1 ? `a ${room.preference}× preference adjustment` : '';
    const parts = [size, bath, privacy, preference].filter(Boolean);
    return (parts.length ? joinParts(parts) : 'Same size and features as the other spaces.') + (room.occupants > 1 ? ` ${room.occupants} people split this space’s share.` : '');
  }
  const windows = room.windows === 'large' ? 'large windows' : room.windows === 'none' ? 'no windows' : '';
  const closet = room.closet === 'large' ? 'a large closet' : room.closet === 'none' ? 'no closet' : '';
  const parts = [size, bath, windows, closet].filter(Boolean).slice(0, 3);
  const shared = room.occupants === 2 ? 'Two people share the common area.' : '';
  if (!parts.length) return shared || 'Same size and features as the other rooms.';
  return shared ? `${joinParts(parts)} ${shared}` : joinParts(parts);
}

export function presentedShares(plan) {
  const result = calculate(plan);
  const monthlyCents = [];
  const moveCents = [];
  const meta = [];
  result.people.forEach((room, roomIndex) => {
    const source = plan.roommates[roomIndex] || {};
    room.residents.forEach((resident, personIndex) => {
      monthlyCents.push(resident.monthly);
      moveCents.push(resident.moveIn);
      const named = typeof source.names?.[personIndex] === 'string' ? source.names[personIndex].trim() : '';
      meta.push({
        budgetMessage: source.budgets?.[personIndex] !== '' && source.budgets?.[personIndex] != null ? (() => { const delta = resident.monthly - Math.round(source.budgets[personIndex] * 100); return delta > 0 ? `${money(delta)} over budget` : delta < 0 ? `${money(-delta)} under budget` : 'At budget'; })() : '',
        label: named || (room.occupants > 1 ? `Person ${personIndex + 1}` : room.name),
        roomName: room.name,
        occupants: room.occupants,
        showRoom: Boolean(named) || room.occupants > 1,
        reason: shareReason(plan, roomIndex),
      });
    });
  });
  const monthlyDollars = dollarShares(monthlyCents);
  const moveInDollars = dollarShares(moveCents);
  const people = meta.map((person, index) => ({ ...person, monthlyDollars: monthlyDollars[index], moveInDollars: moveInDollars[index] }));
  let cursor = 0;
  const groups = result.people.map(room => {
    const members = people.slice(cursor, cursor + room.occupants);
    cursor += room.occupants;
    return { roomName: room.name, occupants: room.occupants, people: members, roomMonthly: members.reduce((sum, person) => sum + person.monthlyDollars, 0) };
  });
  return {
    groups, people, extras: result.extras, rooms: result.people.length, headcount: result.headcount,
    totalMonthly: people.reduce((sum, person) => sum + person.monthlyDollars, 0),
    totalMoveIn: people.reduce((sum, person) => sum + person.moveInDollars, 0),
  };
}

export function summaryText(plan) {
  const shares = presentedShares(plan);
  const line = value => String(value).replace(/[\r\n]+/g, ' ');
  const title = plan.property ? `Rent split for ${line(plan.property)}` : 'Rent split';
  const rows = shares.people.map(person => {
    const place = person.showRoom ? ` (${line(person.roomName)})` : '';
    return `${line(person.label)}${place} — ${money(person.monthlyDollars * 100)} / month · ${money(person.moveInDollars * 100)} at move-in`;
  });
  return [title, '', ...rows, '', `Move-in total: ${money(shares.totalMoveIn * 100)}`].join('\n');
}

export function liveSplitHTML(plan) {
  if (!rentIsSet(plan)) return '<p>Enter the monthly rent to see who pays what.</p>';
  if (plan.method === 'weighted' && plan.roommates.some(room => room.occupants > 0 && !(room.length > 0 && room.width > 0))) return '<p>Enter length and width for each occupied space to see who pays what.</p>';
  if (plan.roommates.some(room => room.area > 10000)) return '<p>Check room dimensions. Each floor area must be 10,000 ft² or less.</p>';
  const error = calculate(plan).error;
  if (error) return `<p role="status">${escape(error)}</p>`;
  const shares = presentedShares(plan);
  const bills = shares.extras ? ', including bills' : '';
  return `<p>Who pays what <span>per month${bills}</span></p><ul>${shares.people.map(person => `<li><span>${escape(person.label)}</span><strong>${money(person.monthlyDollars * 100)}</strong></li>`).join('')}</ul>`;
}

export function costLabels(plan) {
  const result = calculate(plan);
  return {
    bills: result.extras ? `+${money(result.extras)} / mo` : 'Optional',
    moveIn: plan.deposit || plan.fee || plan.includeFirst ? money(result.moveIn) : 'Optional',
  };
}

function aboutMonthly(cents) {
  const dollars = Math.round(cents / 100);
  if (!dollars) return 'about the same / month';
  const formatted = money(Math.abs(dollars) * 100);
  return `about ${dollars > 0 ? '+' : '−'}${formatted} / month`;
}

export function featureHint(plan, roomIndex, factor) {
  const meta = FACTORS[factor];
  const room = plan.roommates[roomIndex];
  if (!meta || !room || room[factor] === meta.baseline) return '';
  const phrase = meta.phrase[room[factor]];
  if (!phrase) return '';
  if (!rentIsSet(plan) || !Number(plan.rent)) return phrase;
  const alt = structuredClone(plan);
  alt.roommates[roomIndex][factor] = meta.baseline;
  const delta = calculate(plan).people[roomIndex].rent - calculate(alt).people[roomIndex].rent;
  const scope = room.occupants > 1 ? ' for this room' : '';
  return `${phrase} · ${aboutMonthly(delta)}${scope}`;
}

function bedroomField(plan) {
  const count = plan.roommates.length;
  const label = `${count} ${count === 1 ? 'bedroom' : 'bedrooms'}`;
  if (!plan.lockedBedrooms) {
    return `<label class="field bedroom-field"><span>How many bedrooms?</span><select data-bedrooms>${[...new Set([1, 2, 3, 4, 5, 6, count])].sort((a,b)=>a-b).map(option => `<option value="${option}" ${count === option ? 'selected' : ''}>${option} ${option === 1 ? 'bedroom' : 'bedrooms'}</option>`).join('')}</select></label>`;
  }
  const kind = count === 1 ? '1-bedroom' : `${count}-bedroom`;
  const named = plan.floorPlan ? `${escape(plan.floorPlan)} is a ${kind} plan` : `This is a ${kind} plan`;
  return `<div class="field bedroom-field"><span>How many bedrooms?</span><p class="locked-bedrooms">${label}</p><p class="bedroom-lock-note">${named}, so that number stays.</p></div>`;
}

function rentStep(plan) {
  const labels = costLabels(plan);
  return `<section class="wizard-card"><h2>Tell us about the apartment</h2>
    <div class="rent-questions">${currency(plan, 'rent', 'How much is the monthly rent?', { required: true, placeholder: '2800', blankZero: false })}
      ${bedroomField(plan)}
    </div>
    <details class="optional-costs" data-details="bills"><summary>Monthly bills <span id="bill-summary">${labels.bills}</span></summary>
      <p class="group-note">Bills are split equally per person.</p>
      <div class="wizard-field-grid">${currency(plan, 'utilities', 'Utilities')}${currency(plan, 'internet', 'Internet')}${currency(plan, 'parking', 'Parking')}${currency(plan, 'insurance', 'Insurance & other')}</div>
    </details>
    <details class="optional-costs" data-details="move-in"><summary>Move-in costs <span id="move-in-summary">${labels.moveIn}</span></summary>
      <div class="wizard-field-grid">${currency(plan, 'deposit', 'Security deposit')}${currency(plan, 'fee', 'Total application fees')}</div>
      <label class="checkbox-label"><input type="checkbox" data-first ${plan.includeFirst ? 'checked' : ''} />Include first month’s rent and bills at move-in</label>
    </details>
    <details class="optional-costs" data-details="extra-fees"><summary>Other monthly fees <span>Optional</span></summary><div id="extra-fees">${(plan.extraFees || []).map((fee,index) => `<div class="extra-fee-row"><label class="field"><span>Fee name</span><input data-extra-label="${index}" value="${escape(fee.label)}" maxlength="60" /></label><label class="field"><span>Monthly amount ($)</span><input type="number" min="0" max="1000000" step="0.01" data-extra-amount="${index}" value="${fee.amount || ''}" /></label><button type="button" class="text-button" data-remove-extra="${index}" aria-label="Remove ${escape(fee.label)}">Remove</button></div>`).join('')}</div><button type="button" class="button button-outline" data-add-extra ${plan.extraFees?.length >= 12 ? 'disabled' : ''}>+ Add monthly fee</button></details>
    <div class="wizard-actions"><span class="wizard-autosave">Saved on this device</span><button class="button button-primary" type="submit">Next: rooms ${arrow}</button></div>
  </section>`;
}

export function roomAreaText(room, unit = 'ft') {
  if (!(room.length > 0 && room.width > 0)) return 'Enter length and width to calculate the floor area.';
  const area = room.length * room.width;
  const format = value => new Intl.NumberFormat('en-US', {maximumFractionDigits:2}).format(value);
  const feet = `${format(area)} ft²`, meters = `${format(area * .3048 ** 2)} m²`;
  return unit === 'm' ? `${meters} · ${feet}` : `${feet} · ${meters}`;
}

function sizeField(room, index, unit = 'ft') {
  const factor = unit === 'm' ? .3048 : 1;
  return `<fieldset class="room-dimensions"><legend>Room dimensions</legend><p class="group-note">Floor area = length × width.</p>
    <div class="dimension-inputs">${['length','width'].map(field => `<label class="field"><span>${field === 'length' ? 'Length' : 'Width'} (${unit})</span><input type="number" min="0.001" max="1000" step="any" inputmode="decimal" data-dimension="${field}" data-room-index="${index}" ${room.occupants > 0 ? 'required' : ''} placeholder="${field === 'length' ? (unit === 'm' ? '3.66' : '12') : (unit === 'm' ? '3.05' : '10')}" value="${room[field] ? Number((room[field] * factor).toFixed(4)) : ''}" /></label>`).join('<span class="dimension-times" aria-hidden="true">×</span>')}</div>
    <div class="calculated-area"><span>Floor area</span><output data-calculated-area="${index}" aria-live="polite">${roomAreaText(room, unit)}</output></div>
  </fieldset>`;
}

function factorChoices(plan, index, factor) {
  const meta = FACTORS[factor];
  const room = plan.roommates[index];
  const options = meta.options.map(([key, text]) => `<label class="choice ${room[factor] === key ? 'selected' : ''}"><input type="radio" name="${factor}-${index}" data-room-factor="${factor}" data-room-index="${index}" value="${key}" ${room[factor] === key ? 'checked' : ''} /><span>${text}</span></label>`).join('');
  return `<fieldset class="factor-choice"><legend>${meta.label}</legend><div class="factor-options">${options}</div><p class="factor-hint" data-factor-hint="${factor}" data-room-index="${index}">${escape(featureHint(plan, index, factor))}</p></fieldset>`;
}

function otherFactors(plan, index) {
  const room = plan.roommates[index];
  const byRoom = plan.method !== 'equal';
  return `<fieldset class="other-factors"><legend>${byRoom ? 'Other factors' : 'People'}</legend>
    <label class="checkbox-label"><input type="checkbox" data-shared data-room-index="${index}" ${room.occupants === 2 ? 'checked' : ''} />Room shared by two people</label>
    ${byRoom ? `<label class="checkbox-label"><input type="checkbox" data-bath-option="private" data-room-index="${index}" ${room.bath === 'private' ? 'checked' : ''} />Private full bath</label><label class="checkbox-label"><input type="checkbox" data-bath-option="half" data-room-index="${index}" ${room.bath === 'half' ? 'checked' : ''} />Private half bath</label><p class="factor-hint" data-factor-hint="bath" data-room-index="${index}">${escape(featureHint(plan, index, 'bath'))}</p>` : ''}
  </fieldset>`;
}

function roomCard(plan, index) {
  const room = plan.roommates[index];
  const byRoom = plan.method !== 'equal';
  const names = Array.from({length:room.occupants}, (_, slot) => slot).map(slot => `<label class="field"><span>${room.occupants === 1 ? 'Person name' : `Person ${slot + 1}`} <span class="optional-tag">Optional</span></span><input data-person-name="${slot}" data-room-index="${index}" type="text" maxlength="40" value="${escape(room.names?.[slot] || '')}" placeholder="${slot === 0 ? 'Alex' : 'Jordan'}" /></label><label class="field"><span>Monthly budget <span class="optional-tag">Optional</span></span><div class="currency-input"><span aria-hidden="true">$</span><input data-person-budget="${slot}" data-room-index="${index}" type="number" min="0" max="1000000" step="0.01" value="${room.budgets?.[slot] ?? ''}" /></div></label>`).join('');
  return `<section class="wizard-card room-card" data-room-card="${index}"><div class="room-card-heading"><h2 id="room-heading-${index}">${escape(room.name.trim() || `Room ${index + 1}`)}</h2><span>${index + 1} of ${plan.roommates.length}</span></div>
    <label class="field room-name-field"><span>Room name</span><input data-room-name data-room-index="${index}" type="text" maxlength="40" value="${escape(room.name)}" placeholder="Room ${index + 1}" /></label>
    ${plan.method === 'weighted' ? `<label class="field space-type"><span>Sleeping space</span><select data-space-kind data-room-index="${index}">${[['bedroom','Bedroom / enclosed room'],['open','Open den or loft'],['living','Living room']].map(([value,label]) => `<option value="${value}" ${room.kind === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}
    ${byRoom ? sizeField(room, index, plan.dimensionUnit) : ''}
    ${plan.method === 'weighted' ? `<details class="room-measurements" data-details="measurements-${index}"><summary>Room adjustments</summary><div class="wizard-field-grid"><label class="field"><span>Preference multiplier</span><input data-preference data-room-index="${index}" type="number" min="0.01" max="100" step="any" value="${room.preference}" required /></label></div><p class="choice-hint">Start at 1. Adjust together to reflect your preferences. A private bathroom adds 10% to the room’s weight.</p></details><label class="checkbox-label private-bath"><input type="checkbox" data-bath-option="private" data-room-index="${index}" ${room.bath !== 'shared' ? 'checked' : ''} />Private bathroom</label>` : byRoom ? `${factorChoices(plan,index,'windows')}${factorChoices(plan,index,'closet')}${otherFactors(plan,index)}` : ''}
    <label class="field occupancy-field"><span>How many people sleep here?</span><select data-occupants data-room-index="${index}">${Array.from({length:13}, (_,count) => `<option value="${count}" ${room.occupants === count ? 'selected' : ''}>${count === 0 ? '0 — empty / shared common space' : count}</option>`).join('')}</select></label>
    <div class="person-names">${names}</div>${plan.roommates.length > 1 && !plan.lockedBedrooms ? `<button type="button" class="text-button remove-space" data-remove-space="${index}">Remove space</button>` : ''}
  </section>`;
}

function roomsStep(plan) {
  const byRoom = plan.method !== 'equal';
  const method = plan.method === 'equal' ? 'equal' : 'rooms';
  const rent = rentIsSet(plan) ? `${money(Math.round(Number(plan.rent) * 100))} rent / month` : 'Rent not entered';
  return `<div class="room-step-heading"><p>${rent} <span>·</span> ${plan.roommates.length} ${plan.roommates.length === 1 ? 'bedroom' : 'bedrooms'}</p>
    <fieldset class="split-choice" aria-describedby="method-hint"><legend class="sr-only">Split method</legend>${choice('method', 'weighted', 'By room', byRoom)}${choice('method', 'equal', 'Equally per person', !byRoom)}</fieldset></div>
    <p class="method-hint" id="method-hint">${METHOD_HINT[method]}</p>
    <section class="wizard-card floor-plan-card"><h2>Have a floor plan? <span class="optional-tag">Optional</span></h2><p class="group-note">Upload an image or PDF to find room names and dimensions. Review the sizes below before continuing.</p><div id="floor-plan-upload"></div></section>
    <div class="measurement-toolbar"><span>Room measurements</span><label class="field"><span class="sr-only">Measurement units</span><select data-units aria-label="Measurement units"><option value="ft" ${plan.dimensionUnit !== 'm' ? 'selected' : ''}>Feet (ft)</option><option value="m" ${plan.dimensionUnit === 'm' ? 'selected' : ''}>Meters (m)</option></select></label></div>
    <p class="unit-conversion-note">1 ft = 0.3048 m. Switching units converts your measurements and keeps the rent split the same.</p>
    <div class="live-split" id="live-split">${liveSplitHTML(plan)}</div>
    <div class="room-cards">${plan.roommates.map((_, index) => roomCard(plan, index)).join('')}</div>
    ${!plan.lockedBedrooms ? `<button type="button" class="button button-outline add-space" data-add-space ${plan.roommates.length >= 12 ? 'disabled' : ''}>+ Add a room or sleeping area</button>` : ''}
    <div class="wizard-actions room-step-actions"><button type="button" class="text-button" data-back>Back to rent</button><button type="submit" class="button button-primary">Next: your split ${arrow}</button></div>`;
}

function commonQuestion(plan) {
  if (plan.method !== 'rooms') return '';
  const options = [['small', 'Small'], ['average', 'Average'], ['large', 'Large']].map(([value, label]) => `<label class="common-option ${plan.commonSpace === value ? 'selected' : ''}"><input type="radio" name="common-space" value="${value}" ${plan.commonSpace === value ? 'checked' : ''} /><span class="size-block" data-size="${value}"></span><span>${label}</span></label>`).join('');
  return `<fieldset class="common-question"><legend>How big are the common spaces?</legend><p>Living room, kitchen, and shared bathrooms.</p><div class="common-options">${options}</div><p class="choice-hint" id="common-hint">${COMMON_HINT[plan.commonSpace]}</p></fieldset>`;
}

export function billAllocationView(plan) {
  if (plan.splitVersion !== 2 && plan.method !== 'weighted') return '';
  const people = residentList(plan);
  const bills = billItems(plan).filter(bill => bill.amount > 0);
  if (!bills.length) return '';
  return `<details class="optional-costs bill-allocation" data-details="allocation"><summary>How should we split the bills? <span>Equal by default</span></summary><p class="group-note">Choose equal shares, custom percentages, or one person for each recurring charge.</p>${bills.map(bill => `<label class="field"><span>${escape(bill.label)} · ${money(Math.round(bill.amount*100))}</span><select data-bill-split="${bill.id}">${[['equal','Split equally'],['custom','Custom percentages'],...people.map((person,index) => ['person'+index,person.label])].map(([value,label]) => `<option value="${value}" ${(bill.split || 'equal') === value ? 'selected' : ''}>${escape(label)}</option>`).join('')}</select></label>${bill.split === 'custom' ? `<div class="wizard-field-grid">${people.map((person,index) => `<label class="field"><span>${escape(person.label)} (%)</span><input data-bill-percent="${bill.id}" data-resident="${index}" type="number" min="0" max="100" step="0.01" value="${bill.percentages?.[index] ?? ''}" /></label>`).join('')}</div>` : ''}`).join('')}</details>`;
}

function resultStep(plan) {
  const error = calculate(plan).error;
  if (error) return `<section class="wizard-card split-result">${billAllocationView(plan)}<p class="group-note" role="status">${escape(error)}</p><div class="wizard-actions"><button type="button" class="text-button" data-step="2">Edit rooms</button><button type="button" class="text-button" data-step="1">Edit rent & bills</button></div></section>`;
  const shares = presentedShares(plan);
  const commonPercent = { small: 35, average: 50, large: 65 }[plan.commonSpace];
  const moveNote = plan.includeFirst ? 'Deposit, application fees, and the first month’s rent and bills.' : 'Deposit and application fees.';
  return `<section class="wizard-card split-result">${commonQuestion(plan)}<div class="result-heading"><h2>Here’s who pays what</h2><p>${shares.rooms} ${shares.rooms === 1 ? 'room' : 'rooms'} <span>·</span> ${shares.headcount} ${shares.headcount === 1 ? 'person' : 'people'}</p></div>
    <div class="person-shares">${shares.groups.map(group => `<section class="room-share">${group.people.map(person => `<article class="person-share"><div class="person-share-copy"><h3>${escape(person.label)}</h3>${person.showRoom ? `<p class="person-room">${escape(person.roomName)}</p>` : ''}</div><p class="person-amount"><strong>${money(person.monthlyDollars * 100)}</strong><small>/ month</small></p><p class="person-reason">${escape(person.reason)}</p>${person.budgetMessage ? `<p class="person-budget">${escape(person.budgetMessage)}</p>` : ''}</article>`).join('')}${group.occupants > 1 ? `<p class="room-total"><span>${escape(group.roomName)} total</span><strong>${money(group.roomMonthly * 100)} / month</strong></p>` : ''}</section>`).join('')}</div>
    <p class="result-total"><span>Total / month</span><strong>${money(shares.totalMonthly * 100)}</strong></p>
    ${shares.extras ? `<p class="result-bills-note">Includes ${money(shares.extras)} in monthly bills. Review each bill’s split below.</p>` : ''}
    ${billAllocationView(plan)}
    <section class="move-in-block"><div class="move-in-heading"><h3>Move-in costs</h3><strong>${money(shares.totalMoveIn * 100)}</strong></div>${shares.totalMoveIn ? `<div class="move-in-results">${shares.people.map(person => `<div><span>${escape(person.label)}${person.showRoom ? `<small>${escape(person.roomName)}</small>` : ''}</span><strong>${money(person.moveInDollars * 100)}</strong></div>`).join('')}</div><p>${moveNote}</p>` : '<p>No deposit or fees yet. Add them with rent and bills if you want a move-in total.</p>'}</section>
    <details class="math-details"><summary>How is this split calculated? <span aria-hidden="true">⌄</span></summary><p>${plan.method === 'equal' ? 'Rent is divided equally per person.' : plan.method === 'weighted' ? 'Rent follows occupied space area × privacy × bathroom × preference. Enclosed rooms count 100%, open dens 80%, and living-room sleeping spaces 70%. A private bathroom adds 10%. People sharing a space divide its weight equally.' : plan.method === 'size' ? 'Half the rent is split equally between rooms; half follows room size.' : `${commonPercent}% of the rent is shared equally per person for common spaces. The rest follows room size, with small adjustments for the bathroom, windows, and closet.`} Monthly bills follow their selected split; application fees are divided equally per person. The deposit follows the rent split.</p>${plan.method === 'rooms' ? '<p>Room adjustments: no windows −10%, large windows +5%; no closet −5%, large closet +8%; private half bath +6%, private full bath +12%. These multiply the room’s size before the split.</p>' : ''}<p>The amounts above are rounded to the nearest dollar and adjusted so they still add up. This is a starting point. Agree on the final amounts together.</p></details>
    <div class="share-actions"><button class="button button-primary" type="button" data-summary>Copy summary</button><button class="button button-outline" type="button" data-share>Copy share link</button><button class="button button-outline" type="button" data-download>Download breakdown</button></div><p class="fine-print">Anyone with the link can view this plan. The summary is the message for your group chat.</p>
    <div class="wizard-actions"><button class="text-button" type="button" data-step="2">Edit rooms</button><button class="text-button" type="button" data-step="1">Edit rent & bills</button></div>
  </section>`;
}

export function calculatorView(plan, step) {
  const ready = rentIsSet(plan);
  return `<a class="back-link" href="#/explore"><span aria-hidden="true">←</span> Back to Explore</a>
    <section class="calculator-intro"><h1>Rent Calculator</h1><p>See what each person pays.</p>${plan.property ? `<div class="selected-property">${escape(plan.property)} <button type="button" class="text-button" data-custom>Change</button></div>` : ''}</section>
    <nav class="wizard-progress" aria-label="Calculator steps">${['Rent', 'Rooms', 'Your split'].map((label, index) => {
      const number = index + 1;
      const available = number === 1 || ready;
      return `<button type="button" data-step="${number}" class="${step === number ? 'current' : ''} ${step > number ? 'done' : ''}" ${step === number ? 'aria-current="step"' : ''} ${available ? '' : 'disabled'}><span>${number}</span>${label}</button>`;
    }).join('')}</nav>
    <form id="calculator-form" class="calculator-form wizard-form" novalidate>${step === 1 ? rentStep(plan) : step === 2 ? roomsStep(plan) : resultStep(plan)}</form>
    <div class="wizard-bottom"><button type="button" class="text-button" data-reset>Start over</button><span>Step ${step} of 3</span></div>`;
}
