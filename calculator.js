const blankNames = () => ['', ''];

export const DEFAULT_PLAN = {
  property: '', rent: '', utilities: 0, internet: 0, parking: 0,
  insurance: 0, deposit: 0, fee: 0, includeFirst: false, lease: 12,
  method: 'rooms', commonSpace: 'average',
  roommates: [{ name: 'Room 1', area: 100, occupants: 1, windows: 'normal', closet: 'normal', bath: 'shared', names: blankNames() },
    { name: 'Room 2', area: 100, occupants: 1, windows: 'normal', closet: 'normal', bath: 'shared', names: blankNames() }],
};

export const newPlan = () => structuredClone(DEFAULT_PLAN);

export function normalizePlan(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return newPlan();
  const plan = newPlan();
  for (const key of ['utilities', 'internet', 'parking', 'insurance', 'deposit', 'fee']) {
    if (typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 1000000) {
      plan[key] = Math.round(value[key] * 100) / 100;
    }
  }
  if (value.rent === '' || value.rent === null) plan.rent = '';
  else if (typeof value.rent === 'number' && Number.isFinite(value.rent) && value.rent >= 0 && value.rent <= 1000000) {
    plan.rent = Math.round(value.rent * 100) / 100;
  }
  if (typeof value.property === 'string') plan.property = value.property.slice(0, 100);
  if (typeof value.includeFirst === 'boolean') plan.includeFirst = value.includeFirst;
  if ([9, 12].includes(value.lease)) plan.lease = value.lease;
  if (['equal', 'size', 'rooms'].includes(value.method)) plan.method = value.method;
  if (['small', 'average', 'large'].includes(value.commonSpace)) plan.commonSpace = value.commonSpace;
  if (typeof value.floorPlan === 'string') plan.floorPlan = value.floorPlan.slice(0, 80);
  if (Array.isArray(value.roommates) && value.roommates.length >= 1 && value.roommates.length <= 6) {
    plan.roommates = value.roommates.map((person, index) => ({
      name: typeof person?.name === 'string' ? person.name.slice(0, 40) : `Roommate ${index + 1}`,
      area: typeof person?.area === 'number' && Number.isFinite(person.area) && person.area >= 1 && person.area <= 10000 ? person.area : 100,
      occupants: person?.occupants === 2 ? 2 : 1,
      windows: ['none', 'normal', 'large'].includes(person?.windows) ? person.windows : 'normal',
      closet: ['none', 'normal', 'large'].includes(person?.closet) ? person.closet : 'normal',
      bath: ['shared', 'half', 'private'].includes(person?.bath) ? person.bath : 'shared',
      names: [0, 1].map(slot => typeof person?.names?.[slot] === 'string' ? person.names[slot].slice(0, 40) : ''),
    }));
  }
  if (Number.isInteger(value.lockedBedrooms) && value.lockedBedrooms >= 1 && value.lockedBedrooms <= 6 && plan.roommates.length === value.lockedBedrooms) {
    plan.lockedBedrooms = value.lockedBedrooms;
  }
  return plan;
}

const WINDOW_FACTOR = { none: 0.9, normal: 1, large: 1.05 };
const CLOSET_FACTOR = { none: 0.95, normal: 1, large: 1.08 };
const BATH_FACTOR = { shared: 1, half: 1.06, private: 1.12 };
const COMMON_SHARE = { small: 0.35, average: 0.5, large: 0.65 };

// Allocate whole cents using the largest remainder method. Every share adds up.
export function centSplit(cents, weights) {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map(weight => weightTotal ? cents * weight / weightTotal : 0);
  const floors = raw.map(amount => Math.floor(amount));
  const remaining = cents - floors.reduce((sum, amount) => sum + amount, 0);
  const order = raw.map((amount, index) => ({ index, fraction: amount - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const extra = floors.map(() => 0);
  for (let i = 0; i < remaining && i < order.length; i++) extra[order[i].index]++;
  return { raw, floors, extra, amounts: floors.map((amount, index) => amount + extra[index]) };
}

export function allocateCents(cents, weights) {
  return centSplit(cents, weights).amounts;
}

export function calculate(value) {
  const plan = normalizePlan(value);
  const count = plan.roommates.length;
  const headcount = plan.roommates.reduce((sum, room) => sum + room.occupants, 0);
  const rent = Math.round(plan.rent * 100);
  const extras = ['utilities', 'internet', 'parking', 'insurance'].reduce((sum, key) => sum + Math.round(plan[key] * 100), 0);
  const totalArea = plan.roommates.reduce((sum, person) => sum + person.area, 0);
  // Room-based estimates are our own transparent model, not Splitwise's formula.
  const commonShare = COMMON_SHARE[plan.commonSpace];
  const qualityAreas = plan.roommates.map(room => room.area * WINDOW_FACTOR[room.windows] * CLOSET_FACTOR[room.closet] * BATH_FACTOR[room.bath]);
  const totalQualityArea = qualityAreas.reduce((sum, area) => sum + area, 0);
  const weights = plan.roommates.map((room, i) => {
    if (plan.method === 'rooms') return commonShare * room.occupants / headcount + (1 - commonShare) * qualityAreas[i] / totalQualityArea;
    if (plan.method === 'size') return 0.5 / count + 0.5 * room.area / totalArea;
    return room.occupants / headcount;
  });
  const rents = allocateCents(rent, weights);
  const bills = allocateCents(extras, plan.roommates.map(room => room.occupants));
  const deposits = allocateCents(Math.round(plan.deposit * 100), weights);
  const fees = allocateCents(Math.round(plan.fee * 100), plan.roommates.map(room => room.occupants));
  const people = plan.roommates.map((room, i) => {
    const equal = Array(room.occupants).fill(1);
    const perRent = allocateCents(rents[i], equal);
    const perBills = allocateCents(bills[i], equal);
    const perDeposit = allocateCents(deposits[i], equal);
    const perFee = allocateCents(fees[i], equal);
    const residents = equal.map((_, j) => ({ rent: perRent[j], bills: perBills[j],
      monthly: perRent[j] + perBills[j],
      moveIn: perDeposit[j] + perFee[j] + (plan.includeFirst ? perRent[j] + perBills[j] : 0),
    }));
    return {
      name: room.name.trim() || `Room ${i + 1}`, occupants: room.occupants, residents,
      rent: rents[i], bills: bills[i], monthly: rents[i] + bills[i], deposit: deposits[i], fee: fees[i],
      moveIn: deposits[i] + fees[i] + (plan.includeFirst ? rents[i] + bills[i] : 0),
    };
  });
  const rooms = plan.roommates.map((room, index) => ({
    name: room.name.trim() || `Room ${index + 1}`,
    area: room.area,
    occupants: room.occupants,
    windows: room.windows,
    windowFactor: WINDOW_FACTOR[room.windows],
    closet: room.closet,
    closetFactor: CLOSET_FACTOR[room.closet],
    bath: room.bath,
    bathFactor: BATH_FACTOR[room.bath],
    qualityArea: qualityAreas[index],
    weight: weights[index],
  }));
  return { rent, extras, monthly: rent + extras, people, headcount,
    moveIn: people.reduce((sum, person) => sum + person.moveIn, 0),
    leaseTotal: (rent + extras) * plan.lease,
    trace: {
      method: plan.method, commonSpace: plan.commonSpace, commonShare, headcount, count, totalArea, totalQualityArea, rooms,
      rentCents: rent, extrasCents: extras, depositCents: Math.round(plan.deposit * 100), feeCents: Math.round(plan.fee * 100),
      includeFirst: plan.includeFirst, weights,
    },
  };
}

const dollars = cents => (cents / 100).toFixed(2);
const figure = value => String(Math.round(value * 1000000) / 1000000);

function weightLine(trace, room) {
  if (trace.method === 'equal') return `${room.occupants} ÷ ${trace.headcount} = ${figure(room.weight)}`;
  if (trace.method === 'size') return `0.5 ÷ ${trace.count} + 0.5 × (${room.area} ÷ ${trace.totalArea}) = ${figure(room.weight)}`;
  const commonPart = trace.commonShare * room.occupants / trace.headcount;
  const roomPart = (1 - trace.commonShare) * room.qualityArea / trace.totalQualityArea;
  return `${figure(trace.commonShare)} × (${room.occupants} ÷ ${trace.headcount}) + ${figure(1 - trace.commonShare)} × (${figure(room.qualityArea)} ÷ ${figure(trace.totalQualityArea)}) = ${figure(commonPart)} + ${figure(roomPart)} = ${figure(room.weight)}`;
}

function centLines(title, cents, weights, labels) {
  const split = centSplit(cents, weights);
  const rows = [[title], ['Total cents', cents, `${dollars(cents)} dollars`]];
  labels.forEach((label, index) => {
    rows.push([label, 'unrounded cents', figure(split.raw[index])]);
    rows.push([label, 'cents before leftovers', split.floors[index]]);
    rows.push([label, 'leftover cents received', split.extra[index]]);
    rows.push([label, 'final cents', split.amounts[index], `${dollars(split.amounts[index])} dollars`]);
  });
  rows.push(['Check', 'final cents add up to', split.amounts.reduce((sum, amount) => sum + amount, 0)]);
  return rows;
}

export function breakdownRows(value) {
  const plan = normalizePlan(value);
  const result = calculate(plan);
  const trace = result.trace;
  const methodName = trace.method === 'equal' ? 'Equal per person' : trace.method === 'size' ? 'Half equal, half by room size' : 'Room size and features';
  const rows = [
    ['Rentwise — how this split is calculated'],
    ['Apartment', plan.property || 'Custom apartment'],
    ...(plan.floorPlan ? [['Floor plan', plan.floorPlan]] : []),
    ['Monthly rent ($)', dollars(trace.rentCents)],
    ['Monthly bills ($)', dollars(trace.extrasCents)],
    ['Utilities ($)', plan.utilities],
    ['Internet ($)', plan.internet],
    ['Parking ($)', plan.parking],
    ['Insurance and other ($)', plan.insurance],
    ['Security deposit ($)', dollars(trace.depositCents)],
    ['Application fees ($)', dollars(trace.feeCents)],
    ['Include first month at move-in', plan.includeFirst ? 'Yes' : 'No'],
    ['Split method', methodName],
    [],
    ['Step 1. Each room gets a weight. Weights add up to 1. Rent cents are total rent cents times that weight.'],
  ];
  if (trace.method === 'rooms') {
    rows.push(['Common spaces', plan.commonSpace]);
    rows.push(['Common-space share', figure(trace.commonShare), 'This part of the rent is split by person.']);
    rows.push(['Room share', figure(1 - trace.commonShare), 'This part follows each room’s quality area.']);
    rows.push(['Quality area', 'square feet × windows × closet × bathroom']);
    rows.push(['Windows', 'none × 0.9, normal × 1, large × 1.05']);
    rows.push(['Closet', 'none × 0.95, normal × 1, large × 1.08']);
    rows.push(['Bathroom', 'shared × 1, half × 1.06, private × 1.12']);
    rows.push(['Total quality area', figure(trace.totalQualityArea)]);
  } else if (trace.method === 'size') {
    rows.push(['Weight', '0.5 ÷ number of rooms + 0.5 × (this room’s square feet ÷ all square feet)']);
    rows.push(['Total square feet', trace.totalArea]);
  } else {
    rows.push(['Weight', 'people in this room ÷ people in the apartment']);
  }
  rows.push(['People', trace.headcount]);
  trace.rooms.forEach(room => {
    rows.push([]);
    rows.push(['Room', room.name]);
    rows.push(['People in this room', room.occupants]);
    if (trace.method === 'rooms') {
      rows.push(['Square feet', room.area]);
      rows.push(['Windows', `${room.windows} × ${room.windowFactor}`]);
      rows.push(['Closet', `${room.closet} × ${room.closetFactor}`]);
      rows.push(['Bathroom', `${room.bath} × ${room.bathFactor}`]);
      rows.push(['Quality area', `${room.area} × ${room.windowFactor} × ${room.closetFactor} × ${room.bathFactor} = ${figure(room.qualityArea)}`]);
    } else if (trace.method === 'size') rows.push(['Square feet', room.area]);
    rows.push(['Weight', weightLine(trace, room)]);
    rows.push(['Unrounded rent ($)', dollars(trace.rentCents * room.weight)]);
  });
  rows.push([]);
  rows.push(['Step 2. Turn the unrounded rent into whole cents.']);
  rows.push(['Rule', 'Start with the cents before the fraction. Give each leftover cent to the room with the largest fraction. If two fractions match, the earlier room gets the cent.']);
  rows.push(...centLines('Rent split', trace.rentCents, trace.weights, trace.rooms.map(room => room.name)));
  rows.push([]);
  rows.push(['Step 3. Monthly bills are split by person, not by room size.']);
  rows.push(...centLines('Bills split', trace.extrasCents, trace.rooms.map(room => room.occupants), trace.rooms.map(room => room.name)));
  rows.push([]);
  rows.push(['Step 4. The deposit follows the rent weights. Application fees follow the people.']);
  rows.push(...centLines('Deposit split', trace.depositCents, trace.weights, trace.rooms.map(room => room.name)));
  rows.push(...centLines('Application fees', trace.feeCents, trace.rooms.map(room => room.occupants), trace.rooms.map(room => room.name)));
  rows.push([]);
  rows.push(['Step 5. If two people share a room, that room’s cents are split the same way, one cent at a time.']);
  result.people.forEach((room, index) => {
    room.residents.forEach((person, slot) => {
      const named = plan.roommates[index]?.names?.[slot]?.trim();
      const label = named || (room.occupants === 1 ? room.name : `${room.name} person ${slot + 1}`);
      rows.push([label, 'rent ($)', dollars(person.rent), 'bills ($)', dollars(person.bills), 'monthly ($)', dollars(person.monthly)]);
      rows.push([label, 'move-in ($)', dollars(person.moveIn), plan.includeFirst ? 'deposit share + fee share + this person’s first month' : 'deposit share + fee share']);
    });
    if (room.occupants > 1) {
      const split = centSplit(room.rent, [1, 1]);
      rows.push([room.name, 'room rent cents', room.rent, 'person 1 cents', split.amounts[0], 'person 2 cents', split.amounts[1]]);
    }
  });
  const monthlyCents = result.people.flatMap(room => room.residents.map(person => person.monthly));
  const shown = allocateCents(Math.round(result.monthly / 100), monthlyCents);
  rows.push([]);
  rows.push(['Step 6. The summary page shows whole dollars.']);
  rows.push(['Rule', 'Round the household monthly total to the nearest dollar, then hand out those dollars with the same weights, so the dollars still add up.']);
  rows.push(['Household monthly cents', result.monthly, 'nearest dollar', Math.round(result.monthly / 100)]);
  let personIndex = 0;
  result.people.forEach((room, index) => {
    room.residents.forEach((person, slot) => {
      const named = plan.roommates[index]?.names?.[slot]?.trim();
      const label = named || (room.occupants === 1 ? room.name : `${room.name} person ${slot + 1}`);
      rows.push([label, 'exact monthly ($)', dollars(person.monthly), 'shown on the page ($)', shown[personIndex]]);
      personIndex += 1;
    });
  });
  rows.push(['Shown dollars add up to', shown.reduce((sum, amount) => sum + amount, 0)]);
  return rows;
}

export function encodePlan(plan) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizePlan(plan)));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodePlan(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 10000) throw new Error('Invalid plan');
  const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return normalizePlan(JSON.parse(new TextDecoder().decode(bytes)));
}
