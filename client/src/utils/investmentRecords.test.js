import test from 'node:test';
import assert from 'node:assert/strict';
import { investmentHistory, investmentType, filterInvestments, investmentSum, investmentCsv } from './investmentRecords.js';
const investors = [{ _id: 'a', investorName: 'Amina', transactions: [{ _id: '1', amount: 1000, date: '2026-11-01', note: 'Opening capital' }, { _id: '2', amount: -200, date: '2026-11-02', note: 'Withdrawal' }] }, { _id: 'b', investorName: 'Rafi', transactions: [] }];
test('history preserves signed amounts, investor IDs, and newest-first ordering', () => {
  const history = investmentHistory(investors);
  assert.deepEqual(history.map(entry => entry.amount), [-200, 1000]);
  assert.equal(history[0].investorId, 'a');
  assert.equal(investmentSum(history), 800);
  assert.equal(investors[0].transactions[0]._id, '1');
});
test('transaction types distinguish withdrawals and legacy account openings', () => {
  assert.equal(investmentType(-1), 'Withdrawal');
  assert.equal(investmentType(0), 'Account opened');
  assert.equal(investmentType(1), 'Contribution');
});
test('investor, note, type, and inclusive date filters work together', () => {
  const result = filterInvestments(investmentHistory(investors), { investor: 'a', type: 'Contribution', search: ' opening ', from: '2026-11-01', to: '2026-11-01' });
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 1000);
  assert.equal(filterInvestments(investmentHistory(investors), { investor: 'b' }).length, 0);
});
test('CSV preserves notes and neutralizes spreadsheet formulas', () => {
  const csv = investmentCsv([{ investorName: '=SUM(A1)', note: 'A "quoted", note', amount: -200, date: '2026-11-01' }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=SUM(A1)"'));
  assert.ok(csv.includes('"A ""quoted"", note"'));
  assert.ok(csv.includes('"Withdrawal"'));
  assert.ok(csv.includes('"-200"'));
});
test('net calculations avoid fractional currency drift', () => {
  assert.equal(investmentSum([{ amount: 0.1 }, { amount: 0.2 }]), 0.3);
});
