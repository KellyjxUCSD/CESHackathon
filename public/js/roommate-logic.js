import { allocateCents } from './calculator.js';

export const BILL_LABELS = { utilities: 'Utilities', internet: 'Internet', parking: 'Parking', insurance: 'Insurance & other' };
export const billItems = plan => [
  ...Object.entries(BILL_LABELS).map(([id, label]) => ({ id, label, amount: plan[id], ...(plan.billSplits?.[id] || {}) })),
  ...(plan.extraFees || []),
];
export const spaceWeight = room => room.area * ({bedroom:1, open:.8, living:.7}[room.kind] || 1) * (room.bath === 'shared' ? 1 : 1.1) * room.preference;
export const residentList = plan => plan.roommates.flatMap((room, roomIndex) => Array.from({length:room.occupants}, (_, slot) => ({
  roomIndex, slot, label: room.names?.[slot]?.trim() || (room.occupants === 1 ? room.name : `${room.name}, person ${slot + 1}`),
})));

export function splitError(plan, checkBills = true) {
  const people = residentList(plan);
  if (!people.length) return 'Add at least one person to an occupied room or sleeping space.';
  if (plan.method !== 'equal' && plan.roommates.some(room => room.occupants > 0 && (!(room.area > 0) || !(room.preference > 0)))) {
    return 'Enter a size and a preference multiplier above zero for every occupied space.';
  }
  if (checkBills) for (const bill of billItems(plan).filter(bill => bill.amount > 0)) {
    if (bill.split === 'custom' && (bill.percentages?.length !== people.length || bill.percentages.some(value => !Number.isFinite(Number(value)) || value === '' || value < 0 || value > 100) || Math.round(bill.percentages.reduce((sum, value) => sum + Number(value), 0) * 100) !== 10000)) {
      return `${bill.label} percentages must add up to 100%.`;
    }
    if (bill.split?.startsWith('person') && !people[Number(bill.split.slice(6))]) return `Choose who pays ${bill.label.toLowerCase()} again after changing the roommates.`;
  }
  return '';
}

// Same resident weights and largest-remainder cent allocation as Roommate Split.
export function calculateRoommateSplit(plan) {
  const residents = residentList(plan);
  const headcount = residents.length;
  const error = splitError(plan);
  const rent = Math.round(Number(plan.rent) * 100);
  const equal = residents.map(() => 1);
  const weights = residents.map(({roomIndex}) => plan.method === 'equal' ? 1 : spaceWeight(plan.roommates[roomIndex]) / plan.roommates[roomIndex].occupants);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const safeWeights = totalWeight > 0 ? weights : equal;
  const rentParts = allocateCents(rent, safeWeights);
  const deposit = Math.round(plan.deposit * 100), fee = Math.round(plan.fee * 100);
  const depositParts = allocateCents(deposit, safeWeights), feeParts = allocateCents(fee, equal);
  const bills = billItems(plan).map(bill => {
    let shares = equal;
    if (bill.split === 'custom') shares = residents.map((_, index) => Math.max(0, Math.round(Number(bill.percentages?.[index] || 0) * 100)));
    else if (bill.split?.startsWith('person')) shares = residents.map((_, index) => index === Number(bill.split.slice(6)) ? 1 : 0);
    if (!shares.some(value => value > 0)) shares = equal;
    return {...bill, cents:Math.round(bill.amount * 100), parts:allocateCents(Math.round(bill.amount * 100), shares)};
  });
  const extras = bills.reduce((sum, bill) => sum + bill.cents, 0);
  let cursor = 0;
  const people = plan.roommates.map((room, roomIndex) => {
    const members = Array.from({length:room.occupants}, () => {
      const index = cursor++;
      const rent = rentParts[index], billsTotal = bills.reduce((sum, bill) => sum + bill.parts[index], 0);
      return {rent, bills:billsTotal, monthly:rent + billsTotal, moveIn:depositParts[index] + feeParts[index] + (plan.includeFirst ? rent + billsTotal : 0)};
    });
    const sum = field => members.reduce((total, person) => total + person[field], 0);
    const roomWeight = plan.method === 'equal' ? room.occupants : room.occupants ? spaceWeight(room) : 0;
    return {name:room.name.trim() || `Room ${roomIndex + 1}`, occupants:room.occupants, residents:members,
      rent:sum('rent'), bills:sum('bills'), monthly:sum('monthly'), moveIn:sum('moveIn'),
      deposit:depositParts.slice(cursor-room.occupants,cursor).reduce((a,b)=>a+b,0),
      fee:feeParts.slice(cursor-room.occupants,cursor).reduce((a,b)=>a+b,0), weight:totalWeight ? roomWeight / totalWeight : 0};
  });
  const rooms = plan.roommates.map((room,index) => ({...room, name:people[index].name, qualityArea:room.occupants ? spaceWeight(room) : 0, weight:people[index].weight}));
  return {rent, extras, monthly:rent + extras, people, headcount, error,
    moveIn:people.reduce((sum, room) => sum + room.moveIn, 0), leaseTotal:(rent + extras) * plan.lease,
    trace:{method:plan.method, count:plan.roommates.length, headcount, rooms,
      totalArea:plan.roommates.reduce((sum,room)=>sum+room.area,0), totalQualityArea:rooms.reduce((sum,room)=>sum+room.qualityArea,0),
      weights:people.map(room=>room.weight), rentCents:rent, extrasCents:extras, depositCents:deposit, feeCents:fee, includeFirst:plan.includeFirst,
      bills, residents, residentRentWeights:safeWeights, perResident:true}};
}
