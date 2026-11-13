import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateCents, breakdownRows, calculate, decodePlan, encodePlan, newPlan, normalizePlan } from '../calculator.js';
import { featureHint, presentedShares } from '../calculator-view.js';

const withSampleCosts = plan => Object.assign(plan, {
  rent: 3600, utilities: 150, internet: 60, parking: 100, insurance: 20, deposit: 3600, fee: 50, includeFirst: true,
});

test('a new plan starts blank and entered costs are counted once', () => {
  const fresh = newPlan();
  assert.equal(fresh.rent, '');
  assert.equal(fresh.utilities, 0);
  assert.equal(fresh.deposit, 0);
  assert.equal(fresh.includeFirst, false);
  assert.equal(calculate(fresh).monthly, 0);
  assert.equal(calculate(fresh).moveIn, 0);
  const result = calculate(withSampleCosts(newPlan()));
  assert.equal(result.extras, 33000);
  assert.equal(result.monthly, 393000);
  assert.equal(result.moveIn, 758000);
  assert.equal(result.people[0].monthly, 196500);
  assert.equal(result.people[0].moveIn, 379000);
  assert.equal(result.leaseTotal, 4716000);
});

test('uneven divisions preserve every cent across monthly and move-in totals', () => {
  for (let count = 1; count <= 6; count++) {
    for (const method of ['equal', 'size']) {
      const plan = newPlan();
      Object.assign(plan, { rent: 3200.01, utilities: 150.17, internet: 60.04, deposit: 1000.03, fee: 50.01, method, includeFirst: true });
      plan.roommates = Array.from({ length: count }, (_, i) => ({ name: `Person ${i}`, area: 91 + i * 31 }));
      const result = calculate(plan);
      assert.equal(result.people.reduce((sum, person) => sum + person.rent, 0), result.rent);
      assert.equal(result.people.reduce((sum, person) => sum + person.bills, 0), result.extras);
      assert.equal(result.people.reduce((sum, person) => sum + person.monthly, 0), result.monthly);
      assert.equal(result.moveIn, 100003 + 5001 + result.monthly);
      assert.ok(result.people.every(person => Number.isInteger(person.monthly) && Number.isInteger(person.moveIn)));
    }
  }
});

test('room-size method assigns half equally and half by private area', () => {
  const plan = newPlan();
  Object.assign(plan, { rent: 4000, method: 'size', deposit: 3600 });
  plan.roommates = [{ name: 'Small room', area: 100 }, { name: 'Large room', area: 300 }];
  const result = calculate(plan);
  assert.equal(result.people[0].rent, 150000);
  assert.equal(result.people[1].rent, 250000);
  assert.equal(result.people[0].bills, result.people[1].bills);
  assert.equal(result.people[0].deposit, 135000);
  assert.equal(result.people[1].deposit, 225000);
});

test('first month can be excluded without changing monthly costs', () => {
  const plan = withSampleCosts(newPlan());
  plan.includeFirst = false;
  const result = calculate(plan);
  assert.equal(result.moveIn, 365000);
  assert.equal(result.monthly, 393000);
  assert.equal(result.people[0].moveIn, 182500);
});

test('zero costs are supported', () => {
  const plan = newPlan();
  for (const key of ['rent', 'utilities', 'internet', 'parking', 'insurance', 'deposit', 'fee']) plan[key] = 0;
  const result = calculate(plan);
  assert.equal(result.monthly, 0);
  assert.equal(result.moveIn, 0);
});

test('largest remainder distribution handles ties predictably', () => {
  assert.deepEqual(allocateCents(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocateCents(101, [1, 1, 1]), [34, 34, 33]);
  assert.deepEqual(allocateCents(0, [1, 2]), [0, 0]);
});

test('untrusted saved and shared data cannot introduce invalid costs or people', () => {
  const plan = normalizePlan({ rent: -1, utilities: '123', internet: Infinity, deposit: 1000001, roommates: [], method: 'unknown', includeFirst: 'false' });
  assert.deepEqual(plan, newPlan());
  const withPeople = normalizePlan({ roommates: [null, { name: 'A'.repeat(100), area: 0 }] });
  assert.equal(withPeople.roommates[0].area, 100);
  assert.equal(withPeople.roommates[1].name.length, 40);
  assert.equal(withPeople.roommates[1].area, 100);
  assert.ok(Number.isFinite(calculate(withPeople).monthly));
});

test('share links preserve Unicode names, costs, and split method', () => {
  const plan = newPlan();
  plan.roommates = [{ name: 'Émilie 🌱', area: 125, names: ['Émilie', ''] }, { name: '小林', area: 160, names: ['小林', 'Sam'] }];
  plan.method = 'size';
  plan.rent = 3333.33;
  const encoded = encodePlan(plan);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodePlan(encoded), normalizePlan(plan));
  assert.deepEqual(decodePlan(encoded).roommates.map(room => room.names), [['Émilie', ''], ['小林', 'Sam']]);
  assert.deepEqual(calculate(decodePlan(encoded)), calculate(plan));
  assert.throws(() => decodePlan('bad!'));
  assert.throws(() => decodePlan('x'.repeat(10001)));
});

test('equal rooms produce equal rent and a private bathroom increases that room’s share', () => {
  const plan = newPlan();
  plan.rent = 3600;
  const equal = calculate(plan);
  assert.equal(equal.people[0].rent, equal.people[1].rent);
  plan.roommates[0].bath = 'private';
  const privateBath = calculate(plan);
  assert.ok(privateBath.people[0].rent > privateBath.people[1].rent);
  assert.equal(privateBath.people[0].rent + privateBath.people[1].rent, privateBath.rent);
});

test('larger shared spaces reduce the rent gap between small and large bedrooms', () => {
  const plan = newPlan();
  plan.rent = 3600;
  plan.roommates[0].area = 80;
  plan.roommates[1].area = 180;
  plan.commonSpace = 'small';
  const small = calculate(plan);
  plan.commonSpace = 'large';
  const large = calculate(plan);
  assert.ok(small.people[1].rent - small.people[0].rent > large.people[1].rent - large.people[0].rent);
});

test('shared rooms allocate common costs and bills per person and preserve every cent', () => {
  for (let count = 1; count <= 6; count++) {
    for (const method of ['rooms', 'equal', 'size']) {
      const plan = newPlan();
      plan.includeFirst = true;
      plan.rent = 3333.37;
      plan.deposit = 1200.01;
      plan.fee = 50.07;
      plan.method = method;
      plan.roommates = Array.from({ length: count }, (_, i) => ({
        ...newPlan().roommates[0], name: `Room ${i}`, area: 80 + i * 20, occupants: i % 2 ? 2 : 1,
      }));
      const result = calculate(plan);
      assert.equal(result.headcount, plan.roommates.reduce((sum, room) => sum + room.occupants, 0));
      assert.equal(result.people.reduce((sum, room) => sum + room.rent, 0), result.rent);
      assert.equal(result.people.reduce((sum, room) => sum + room.monthly, 0), result.monthly);
      assert.equal(result.people.reduce((sum, room) => sum + room.moveIn, 0), result.moveIn);
      assert.equal(result.moveIn, 120001 + 5007 + result.monthly);
      for (const room of result.people) {
        assert.equal(room.residents.length, room.occupants);
        assert.equal(room.residents.reduce((sum, person) => sum + person.rent, 0), room.rent);
        assert.equal(room.residents.reduce((sum, person) => sum + person.monthly, 0), room.monthly);
        assert.equal(room.residents.reduce((sum, person) => sum + person.moveIn, 0), room.moveIn);
      }
    }
  }
});

test('equal per-person rent gives a two-person room twice a single-person room', () => {
  const plan = newPlan();
  plan.method = 'equal';
  plan.rent = 3000;
  Object.assign(plan, { utilities: 150, internet: 60, parking: 100, insurance: 20 });
  plan.roommates[1].occupants = 2;
  const result = calculate(plan);
  assert.equal(result.people[0].rent, 100000);
  assert.equal(result.people[1].rent, 200000);
  assert.equal(result.people[0].bills, 11000);
  assert.equal(result.people[1].bills, 22000);
});

test('room settings validate and round-trip in share links', () => {
  const plan = newPlan();
  plan.commonSpace = 'large';
  Object.assign(plan.roommates[0], { occupants: 2, bath: 'private', windows: 'large', closet: 'none' });
  assert.deepEqual(decodePlan(encodePlan(plan)), plan);
  const bad = normalizePlan({ commonSpace: 'wrong', roommates: [{ occupants: 100, windows: 'wrong', closet: null, bath: 'wrong', area: NaN }] });
  assert.equal(bad.commonSpace, 'average');
  assert.equal(bad.roommates[0].occupants, 1);
  assert.equal(bad.roommates[0].windows, 'normal');
  assert.equal(bad.roommates[0].closet, 'normal');
  assert.equal(bad.roommates[0].bath, 'shared');
  assert.deepEqual(bad.roommates[0].names, ['', '']);
  assert.ok(Number.isFinite(calculate(bad).monthly));
});

test('displayed dollars add up and each amount says why', () => {
  const plan = newPlan();
  plan.rent = 3600;
  plan.roommates[0].area = 180;
  plan.roommates[0].bath = 'private';
  plan.roommates[0].names = ['Alex', ''];
  plan.roommates[1].area = 80;
  plan.roommates[1].occupants = 2;
  const shares = presentedShares(plan);
  assert.equal(shares.people.length, 3);
  assert.equal(shares.people[0].label, 'Alex');
  assert.match(shares.people[0].reason, /Larger room/);
  assert.match(shares.people[0].reason, /private bath/);
  assert.match(shares.people[1].reason, /Smaller room/);
  assert.match(shares.people[1].reason, /Two people share the common area/);
  assert.equal(shares.people.reduce((sum, person) => sum + person.monthlyDollars, 0), shares.totalMonthly);
  assert.equal(shares.totalMonthly, Math.round(calculate(plan).monthly / 100));
  assert.equal(shares.people.reduce((sum, person) => sum + person.moveInDollars, 0), shares.totalMoveIn);
  assert.match(featureHint(plan, 0, 'bath'), /Private bath · about \+\$/);
  assert.equal(featureHint(plan, 1, 'bath'), '');
  plan.method = 'equal';
  assert.equal(presentedShares(plan).people[0].reason, 'Everyone pays the same.');
});

test('a floor plan keeps its bedroom count, and the csv shows the weight math', () => {
  const locked = normalizePlan({ rent: 4000, lockedBedrooms: 2, floorPlan: '2 Bedroom C', roommates: [{ name: 'Room 1', area: 100 }, { name: 'Room 2', area: 300 }] });
  assert.equal(locked.lockedBedrooms, 2);
  assert.equal(normalizePlan({ lockedBedrooms: 2, roommates: [{ area: 100 }] }).lockedBedrooms, undefined);
  const plan = newPlan();
  Object.assign(plan, { rent: 4000, method: 'size', floorPlan: 'Large and small' });
  plan.roommates = [{ name: 'Small room', area: 100, occupants: 1, windows: 'normal', closet: 'normal', bath: 'shared', names: ['', ''] }, { name: 'Large room', area: 300, occupants: 1, windows: 'normal', closet: 'normal', bath: 'shared', names: ['', ''] }];
  const text = breakdownRows(plan).map(row => row.join(' ')).join('\n');
  assert.match(text, /The answer/);
  assert.match(text, /Small room \$1,500\.00/);
  assert.match(text, /Large room \$2,500\.00/);
  assert.match(text, /0\.5 ÷ 2 \+ 0\.5 × \(100 ÷ 400\)/);
  assert.match(text, /0\.5 ÷ 2 \+ 0\.5 × \(300 ÷ 400\)/);
  assert.match(text, /Final cents/);
  assert.match(text, /150000/);
  assert.match(text, /250000/);
  assert.match(text, /Shown dollars add up to \$4,000/);
  const result = calculate(plan);
  assert.equal(result.people[0].rent + result.people[1].rent, result.rent);
});
