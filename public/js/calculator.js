import { calculateRoommateSplit } from './roommate-logic.js';
export { splitError } from './roommate-logic.js';

const blankNames = () => ['', ''];
const roomOccupants = room => Number.isInteger(room?.occupants) && room.occupants >= 0 && room.occupants <= 12 ? room.occupants : 1;

export const DEFAULT_PLAN = {
  property: '', rent: '', utilities: 0, internet: 0, parking: 0,
  insurance: 0, deposit: 0, fee: 0, includeFirst: false, lease: 12,
  method: 'weighted', splitVersion: 2, commonSpace: 'average', dimensionUnit: 'ft', extraFees: [], billSplits: {},
  roommates: [{ name: 'Room 1', area: 100, occupants: 1, windows: 'normal', closet: 'normal', bath: 'shared', names: blankNames(), budgets: ['', ''], length: '', width: '', kind: 'bedroom', preference: 1 },
    { name: 'Room 2', area: 100, occupants: 1, windows: 'normal', closet: 'normal', bath: 'shared', names: blankNames(), budgets: ['', ''], length: '', width: '', kind: 'bedroom', preference: 1 }],
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
  if (['equal', 'size', 'rooms', 'weighted'].includes(value.method)) plan.method = value.method;
  if (value.splitVersion === 1 || (['rooms','size','equal'].includes(value.method) && value.splitVersion !== 2)) plan.splitVersion = 1;
  if (value.dimensionUnit === 'm') plan.dimensionUnit = 'm';
  if (['small', 'average', 'large'].includes(value.commonSpace)) plan.commonSpace = value.commonSpace;
  if (typeof value.floorPlan === 'string') plan.floorPlan = value.floorPlan.slice(0, 80);
  if (Array.isArray(value.roommates) && value.roommates.length >= 1 && value.roommates.length <= 12) {
    plan.roommates = value.roommates.map((person, index) => ({
      name: typeof person?.name === 'string' ? person.name.slice(0, 40) : `Roommate ${index + 1}`,
      area: typeof person?.area === 'number' && Number.isFinite(person.area) && person.area >= (value.method === 'weighted' || value.splitVersion === 2 ? 0 : 1) && person.area <= 10000 ? person.area : 100,
      occupants: value.splitVersion !== 2 && ['rooms','size','equal'].includes(value.method) ? (person?.occupants === 2 ? 2 : 1) : roomOccupants(person),
      windows: ['none', 'normal', 'large'].includes(person?.windows) ? person.windows : 'normal',
      closet: ['none', 'normal', 'large'].includes(person?.closet) ? person.closet : 'normal',
      bath: ['shared', 'half', 'private'].includes(person?.bath) ? person.bath : 'shared',
      length: Number.isFinite(Number(person?.length)) && person?.length !== '' && Number(person?.length) > 0 ? Number(person.length) : '',
      width: Number.isFinite(Number(person?.width)) && person?.width !== '' && Number(person?.width) > 0 ? Number(person.width) : '',
      kind: ['bedroom', 'open', 'living'].includes(person?.kind) ? person.kind : 'bedroom',
      preference: typeof person?.preference === 'number' && Number.isFinite(person.preference) && person.preference >= 0 && person.preference <= 100 ? person.preference : 1,
      budgets: Array.from({length:Math.max(2, roomOccupants(person))}, (_, slot) => typeof person?.budgets?.[slot] === 'number' && Number.isFinite(person.budgets[slot]) && person.budgets[slot] >= 0 && person.budgets[slot] <= 1000000 ? person.budgets[slot] : ''),
      names: Array.from({length:Math.max(2, roomOccupants(person))}, (_, slot) => typeof person?.names?.[slot] === 'string' ? person.names[slot].slice(0, 40) : ''),
    }));
  }
  if (Number.isInteger(value.lockedBedrooms) && value.lockedBedrooms >= 1 && value.lockedBedrooms <= 6 && plan.roommates.length === value.lockedBedrooms) {
    plan.lockedBedrooms = value.lockedBedrooms;
  }
  const split = raw => ({
    split: raw?.split === 'custom' || /^person\d{1,3}$/.test(raw?.split) ? raw.split : 'equal',
    percentages: Array.isArray(raw?.percentages) ? raw.percentages.slice(0,144).map(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : '') : [],
  });
  for (const key of ['utilities','internet','parking','insurance']) if (value.billSplits?.[key]) plan.billSplits[key] = split(value.billSplits[key]);
  if (Array.isArray(value.extraFees)) plan.extraFees = value.extraFees.slice(0,12).map((item,index) => ({id:`extra${index}`, label:typeof item?.label === 'string' ? item.label.slice(0,60) : 'Monthly fee', amount:typeof item?.amount === 'number' && Number.isFinite(item.amount) && item.amount >= 0 && item.amount <= 1000000 ? Math.round(item.amount*100)/100 : 0, ...split(item)}));
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
  if (plan.method === 'weighted' || (plan.method === 'equal' && plan.splitVersion === 2)) return calculateRoommateSplit(plan);
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

const figure = value => String(Math.round(value * 1000000) / 1000000);
const money = cents => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const SIZE_NAME = { 50: 'Tiny', 65: 'Small', 80: 'A bit small', 100: 'Normal', 125: 'Generous', 160: 'Large', 200: 'Enormous' };
const sizeLabel = area => SIZE_NAME[area] ? `${SIZE_NAME[area]} (${area})` : String(area);

function weightLine(trace, room) {
  if (trace.method === 'equal') return `${room.occupants} ÷ ${trace.headcount} = ${figure(room.weight)}`;
  if (trace.method === 'weighted') return `${figure(room.qualityArea)} ÷ ${figure(trace.totalQualityArea)} = ${figure(room.weight)}`;
  if (trace.method === 'size') return `0.5 ÷ ${trace.count} + 0.5 × (${room.area} ÷ ${trace.totalArea}) = ${figure(room.weight)}`;
  const commonPart = trace.commonShare * room.occupants / trace.headcount;
  const roomPart = (1 - trace.commonShare) * room.qualityArea / trace.totalQualityArea;
  return `${figure(trace.commonShare)} × (${room.occupants} ÷ ${trace.headcount}) + ${figure(1 - trace.commonShare)} × (${figure(room.qualityArea)} ÷ ${figure(trace.totalQualityArea)}) = ${figure(commonPart)} + ${figure(roomPart)} = ${figure(room.weight)}`;
}

function personLabel(plan, room, index, slot) {
  const named = plan.roommates[index]?.names?.[slot]?.trim();
  return named || (room.occupants === 1 ? room.name : `${room.name}, person ${slot + 1}`);
}

function addSplitTable(rows, cents, weights, labels) {
  if (!cents) {
    rows.push(['Nothing to split', money(0)]);
    return;
  }
  const split = centSplit(cents, weights);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const alreadyShares = Math.abs(weightTotal - 1) < 0.000001;
  rows.push(['Total', money(cents), `${cents} cents`]);
  rows.push(['Room', 'How the cents were worked out', 'Cents before rounding', 'Whole cents kept', 'Extra cents', 'Final cents', 'Dollars']);
  labels.forEach((label, index) => {
    const share = weightTotal ? weights[index] / weightTotal : 0;
    const workedOut = alreadyShares
      ? `${figure(share)} × ${cents} cents = ${figure(split.raw[index])}`
      : `${figure(weights[index])} of ${figure(weightTotal)} × ${cents} cents = ${figure(split.raw[index])}`;
    rows.push([label, workedOut, figure(split.raw[index]), split.floors[index], split.extra[index], split.amounts[index], money(split.amounts[index])]);
  });
  rows.push(['Check', 'These amounts add up to', money(split.amounts.reduce((sum, amount) => sum + amount, 0))]);
}

export function breakdownRows(value) {
  const plan = normalizePlan(value);
  const result = calculate(plan);
  if (result.error) return [['Rentwise rent split'], ['Complete your plan', result.error]];
  const trace = result.trace;
  const people = [];
  result.people.forEach((room, index) => {
    room.residents.forEach((person, slot) => people.push({ label: personLabel(plan, room, index, slot), room, person }));
  });
  const shownMonthly = allocateCents(Math.round(result.monthly / 100), people.map(item => item.person.monthly));
  const shownMoveIn = allocateCents(Math.round(result.moveIn / 100), people.map(item => item.person.moveIn));
  const methodName = trace.method === 'equal' ? 'Everyone pays the same' : trace.method === 'size' ? 'Half equal, half by room size' : 'By room size and features';
  const rows = [];

  rows.push(['Rentwise rent split']);
  rows.push(['Start here', 'The first table is the answer. The steps under it show the math.']);
  rows.push([]);
  rows.push(['The answer']);
  rows.push(['Person', 'Each month', 'At move-in']);
  people.forEach((item, index) => rows.push([item.label, money(shownMonthly[index] * 100), money(shownMoveIn[index] * 100)]));
  rows.push(['Everyone together', money(shownMonthly.reduce((sum, amount) => sum + amount, 0) * 100), money(shownMoveIn.reduce((sum, amount) => sum + amount, 0) * 100)]);
  rows.push(['These are the same whole dollars shown on the page.']);
  rows.push([]);

  rows.push(['What we started with']);
  rows.push(['Item', 'Amount']);
  rows.push(['Apartment', plan.property || 'Custom apartment']);
  if (plan.floorPlan) rows.push(['Floor plan', plan.floorPlan]);
  rows.push(['Monthly rent', money(trace.rentCents)]);
  rows.push(['Utilities', money(Math.round(plan.utilities * 100))]);
  rows.push(['Internet', money(Math.round(plan.internet * 100))]);
  rows.push(['Parking', money(Math.round(plan.parking * 100))]);
  rows.push(['Insurance and other', money(Math.round(plan.insurance * 100))]);
  rows.push(['Monthly bills together', money(trace.extrasCents)]);
  rows.push(['Security deposit', money(trace.depositCents)]);
  rows.push(['Application fees', money(trace.feeCents)]);
  rows.push(['First month included at move-in', plan.includeFirst ? 'Yes' : 'No']);
  rows.push(['How the rent is split', methodName]);
  rows.push(['Rooms', trace.count]);
  rows.push(['People', trace.headcount]);
  rows.push([]);

  rows.push(['Step 1', 'Find each room’s share of the rent']);
  if (trace.method === 'equal') {
    rows.push(['In plain words', 'Every person pays the same share of the rent.']);
    rows.push(['The formula', 'Share = people in this room ÷ people in the apartment']);
  } else if (trace.method === 'size') {
    rows.push(['In plain words', 'Half of the rent is shared equally by the rooms. The other half follows room size.']);
    rows.push(['The formula', 'Share = 0.5 ÷ number of rooms + 0.5 × (this room’s size ÷ all sizes)']);
    rows.push(['All room sizes added together', trace.totalArea]);
  } else if (trace.method === 'weighted') {
    rows.push(['In plain words', 'Rent follows the size and privacy of occupied sleeping spaces. People sharing a space divide its weight equally.']);
    rows.push(['A room’s score', 'Area × privacy factor × bathroom factor × preference multiplier']);
    rows.push(['Privacy', 'Enclosed room × 1; open den or loft × 0.8; living-room sleeping space × 0.7']);
    rows.push(['Bathroom', 'Shared × 1; private × 1.1']);
    rows.push(['All occupied room scores', trace.totalQualityArea]);
  } else {
    const sharedWords = { small: 'Small shared spaces. 35% of the rent is split by person.', average: 'Average shared spaces. 50% of the rent is split by person.', large: 'Large shared spaces. 65% of the rent is split by person.' };
    rows.push(['In plain words', 'Part of the rent pays for the living room, kitchen, and shared bathrooms, so that part is split by person. The rest follows each room.']);
    rows.push(['Shared spaces', sharedWords[plan.commonSpace]]);
    rows.push(['Shared-space share', figure(trace.commonShare)]);
    rows.push(['Room share', figure(1 - trace.commonShare)]);
    rows.push(['A room’s score', 'size × windows × closet × bathroom']);
    rows.push(['Windows', 'No windows × 0.9. Normal windows × 1. Large windows × 1.05.']);
    rows.push(['Closet', 'No closet × 0.95. Normal closet × 1. Large closet × 1.08.']);
    rows.push(['Bathroom', 'Shared bathroom × 1. Half bathroom × 1.06. Private bathroom × 1.12.']);
    rows.push(['All room scores added together', figure(trace.totalQualityArea)]);
    rows.push(['The formula', 'Share = shared-space share × (people in this room ÷ all people) + room share × (this room’s score ÷ all scores)']);
  }
  rows.push(['Room', 'People', 'Size', 'How this share was calculated', 'Share', 'Rent before rounding']);
  trace.rooms.forEach(room => {
    const score = trace.method === 'rooms'
      ? `${room.area} × ${room.windowFactor} × ${room.closetFactor} × ${room.bathFactor} = ${figure(room.qualityArea)}. ${weightLine(trace, room)}`
      : weightLine(trace, room);
    rows.push([room.name, room.occupants, sizeLabel(room.area), score, figure(room.weight), money(trace.rentCents * room.weight)]);
  });
  rows.push(['The shares add up to', figure(trace.weights.reduce((sum, weight) => sum + weight, 0))]);
  rows.push([]);

  rows.push(['Step 2', 'Turn the rent shares into exact cents']);
  rows.push(['In plain words', 'Rent is counted in cents so no money is lost. Keep the whole cents. Give each leftover cent to the room with the biggest fraction. If two fractions match, the earlier room gets that cent.']);
  addSplitTable(rows, trace.rentCents, trace.perResident ? trace.residentRentWeights : trace.weights, trace.perResident ? trace.residents.map(person => person.label) : trace.rooms.map(room => room.name));
  rows.push([]);

  rows.push(['Step 3', 'Split the monthly bills by person']);
  rows.push(['In plain words', trace.perResident ? 'Each recurring bill follows its selected split: equal, custom percentages, or one person.' : 'Bills do not follow room size. A room with two people pays for two people.']);
  if (trace.perResident) {
    rows.push(['Bill', 'Split', ...trace.residents.map(person => person.label)]);
    trace.bills.filter(bill => bill.cents).forEach(bill => rows.push([bill.label, bill.split || 'equal', ...bill.parts.map(money)]));
  } else addSplitTable(rows, trace.extrasCents, trace.rooms.map(room => room.occupants), trace.rooms.map(room => room.name));
  rows.push([]);

  rows.push(['Step 4', 'Split the deposit and the fees']);
  rows.push(['In plain words', 'The deposit uses the same shares as the rent. Fees are split by person.']);
  rows.push(['Deposit']);
  addSplitTable(rows, trace.depositCents, trace.perResident ? trace.residentRentWeights : trace.weights, trace.perResident ? trace.residents.map(person => person.label) : trace.rooms.map(room => room.name));
  rows.push(['Application fees']);
  addSplitTable(rows, trace.feeCents, trace.perResident ? trace.residents.map(() => 1) : trace.rooms.map(room => room.occupants), trace.perResident ? trace.residents.map(person => person.label) : trace.rooms.map(room => room.name));
  rows.push([]);

  rows.push(['Step 5', 'Split a shared room between the people in it']);
  const shared = result.people.filter(room => room.occupants > 1);
  if (trace.perResident) rows.push(['In plain words', 'Shared-room resident weights are divided equally before cent allocation. The exact resident amounts appear below.']);
  else if (!shared.length) rows.push(['In plain words', 'Every room has one person, so the room’s amount is already that person’s amount.']);
  else {
    rows.push(['In plain words', 'Two people in one room split that room’s cents evenly. An odd leftover cent goes to the first person.']);
    rows.push(['Room', 'What is being split', 'Cents', 'Person 1', 'Person 2']);
    result.people.forEach((room, index) => {
      if (room.occupants < 2) return;
      [['Room rent', room.rent], ['Room bills', room.bills], ['Room deposit', room.deposit], ['Room fees', room.fee]].forEach(([name, cents]) => {
        if (!cents && name !== 'rent') return;
        const split = centSplit(cents, [1, 1]);
        const first = personLabel(plan, room, index, 0);
        const second = personLabel(plan, room, index, 1);
        rows.push([room.name, name, cents, `${first}: ${split.amounts[0]} cents (${money(split.amounts[0])})`, `${second}: ${split.amounts[1]} cents (${money(split.amounts[1])})`]);
      });
    });
  }
  rows.push([]);
  rows.push(['Each person, exact amount']);
  rows.push(['Person', 'Rent', 'Bills', 'Each month', 'At move-in', 'Move-in includes']);
  people.forEach(item => rows.push([
    item.label,
    money(item.person.rent),
    money(item.person.bills),
    money(item.person.monthly),
    money(item.person.moveIn),
    plan.includeFirst ? 'Deposit share + fee share + this person’s first month' : 'Deposit share + fee share',
  ]));
  rows.push([]);

  rows.push(['Step 6', 'Why the page shows whole dollars']);
  rows.push(['In plain words', 'The page rounds the household total to the nearest dollar, then hands out those dollars using the same shares. The dollars still add up.']);
  rows.push(['Exact monthly total', money(result.monthly), 'Nearest dollar', `$${Math.round(result.monthly / 100).toLocaleString('en-US')}`]);
  rows.push(['Person', 'Exact monthly amount', 'Shown on the page']);
  people.forEach((item, index) => rows.push([item.label, money(item.person.monthly), money(shownMonthly[index] * 100)]));
  rows.push(['Shown dollars add up to', `$${shownMonthly.reduce((sum, amount) => sum + amount, 0).toLocaleString('en-US')}`]);
  return rows;
}

export function encodePlan(plan) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizePlan(plan)));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodePlan(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 100000) throw new Error('Invalid plan');
  const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return normalizePlan(JSON.parse(new TextDecoder().decode(bytes)));
}
