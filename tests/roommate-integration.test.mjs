import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, newPlan, normalizePlan, encodePlan, decodePlan, breakdownRows } from '../calculator.js';
import { planRooms } from '../roommate-split/floor-plan.js';
import { presentedShares, calculatorView } from '../calculator-view.js';

test('new calculations use Roommate Split weights and resident-level cent rounding', () => {
  const plan = newPlan();
  plan.rent = 2700.01;
  Object.assign(plan.roommates[0], {area:100, bath:'private'});
  Object.assign(plan.roommates[1], {area:200, kind:'open', occupants:2});
  plan.roommates.push({...structuredClone(plan.roommates[0]), name:'Living room', kind:'living', area:500, occupants:0});
  const result = calculate(plan);
  assert.equal(result.error, '');
  assert.deepEqual(result.people.flatMap(room => room.residents.map(person=>person.rent)), [110001,80000,80000]);
  assert.equal(result.people[2].rent, 0);
  assert.equal(result.headcount, 3);
  plan.roommates[0].windows = 'none';
  plan.roommates[0].closet = 'large';
  assert.deepEqual(calculate(plan).people.map(room=>room.rent), result.people.map(room=>room.rent));
});

test('living-room privacy, preferences, and sharing match the standalone algorithm', () => {
  const plan = newPlan();
  plan.rent = 2400;
  Object.assign(plan.roommates[0], {area:100, preference:1.4});
  Object.assign(plan.roommates[1], {area:200, kind:'living', occupants:2});
  const result = calculate(plan);
  assert.deepEqual(result.people.map(room=>room.rent), [120000,120000]);
  assert.deepEqual(result.people[1].residents.map(person=>person.rent), [60000,60000]);
});

test('per-bill allocations and move-in amounts preserve the exact household totals', () => {
  const plan = newPlan();
  Object.assign(plan, {rent:3000.01, utilities:100, internet:60, deposit:1200.01, fee:50.03, includeFirst:true});
  plan.billSplits = {utilities:{split:'custom',percentages:[25,75]}, internet:{split:'person1',percentages:[]}};
  plan.extraFees = [{id:'extra0', label:'Pet fee', amount:25.01, split:'person0', percentages:[]}];
  const result = calculate(plan);
  assert.equal(result.error, '');
  assert.deepEqual(result.people.map(room=>room.bills), [5001,13500]);
  assert.equal(result.monthly, 318502);
  assert.equal(result.moveIn, 443506);
  assert.equal(result.people.reduce((sum, room)=>sum+room.monthly,0), result.monthly);
  assert.equal(result.people.reduce((sum, room)=>sum+room.moveIn,0), result.moveIn);
  assert.deepEqual(calculate(decodePlan(encodePlan(plan))), result);
  const csv = breakdownRows(plan).map(row=>row.join(' ')).join('\n');
  assert.match(csv, /Utilities custom \$25\.00 \$75\.00/);
  assert.match(csv, /Pet fee person0 \$25\.01 \$0\.00/);
});

test('missing dimensions, empty households, and incomplete bill percentages require review', () => {
  const plan = newPlan();
  plan.rent = 2000;
  plan.roommates[0].area = 0;
  assert.match(calculate(plan).error, /Enter a size/);
  assert.doesNotMatch(calculatorView(plan,3), /data-share/);
  plan.roommates.forEach(room=>{room.occupants=0;});
  assert.match(calculate(plan).error, /at least one person/);
  plan.roommates.forEach(room=>{room.occupants=1;room.area=100;});
  plan.utilities = 100;
  plan.billSplits.utilities = {split:'custom',percentages:[25,25]};
  assert.match(calculate(plan).error, /percentages must add up to 100%/);
});

test('dimensions, budgets, and extended occupancy survive sharing without changing rent', () => {
  const plan = newPlan();
  plan.rent = 2000;
  Object.assign(plan.roommates[0], {length:10, width:10, occupants:3, names:['Alex','Sam','Jo'], budgets:[100,500,500]});
  plan.dimensionUnit = 'm';
  const restored = decodePlan(encodePlan(plan));
  assert.deepEqual(restored.roommates[0].budgets,[100,500,500]);
  assert.equal(restored.roommates[0].length,10);
  assert.equal(calculate(restored).monthly,200000);
  assert.match(presentedShares(restored).people[0].budgetMessage,/over budget/);
  assert.match(calculatorView(restored,2), /3\.048/);
});

test('pre-integration share links retain their original calculation', () => {
  const old = {rent:4000,method:'rooms',commonSpace:'average',roommates:[{name:'A',area:100},{name:'B',area:300}]};
  const restored = normalizePlan(old);
  assert.equal(restored.splitVersion,1);
  assert.deepEqual(calculate(restored).people.map(room=>room.rent),[150000,250000]);
});

test('floor-plan parsing keeps printed measurements and rejects implausible sizes', () => {
  const lines = [
    {text:'Bedroom 1',page:1,x:.25,y:.20}, {text:'12′ 6″ × 10′ 0″',page:1,x:.25,y:.23},
    {text:'Living Room',page:1,x:.65,y:.50}, {text:'15 ft × 10 ft',page:1,x:.65,y:.53},
    {text:'Bedroom 2',page:2,x:.25,y:.20}, {text:'1 ft × 2 ft',page:2,x:.25,y:.23},
  ];
  const rooms = planRooms(lines);
  assert.equal(rooms[0].length,12.5);
  assert.equal(rooms[0].width,10);
  assert.equal(rooms[1].kind,'living');
  assert.ok(!rooms[2].length);
});
