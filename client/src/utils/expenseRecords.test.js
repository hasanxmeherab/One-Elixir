import test from 'node:test';
import assert from 'node:assert/strict';
import { expenseDay, expenseAmount, filterExpenses, sumExpenses, expensesCsv } from './expenseRecords.js';

test('Bangladesh dates are consistent across UTC midnight and month boundaries', () => {
  assert.equal(expenseDay('2026-10-31T20:00:00Z'), '2026-11-01');
  assert.equal(expenseDay('2026-11-01'), '2026-11-01');
  assert.equal(expenseDay('invalid'), '');
});
test('search, category, and inclusive dates combine before sorting and totals', () => {
  const expenses = [
    { title: 'Bottles', category: 'Packaging', amount: 300, date: '2026-11-01' },
    { title: 'Bottle boxes', category: 'Packaging', amount: 200, date: '2026-11-02' },
    { title: 'Oil', category: 'Ingredients', amount: 500, date: '2026-11-01' },
  ];
  const result = filterExpenses(expenses, { search: ' bottle ', category: 'Packaging', from: '2026-11-01', to: '2026-11-02' });
  assert.deepEqual(result.map(expense => expense.amount), [200, 300]);
  assert.equal(sumExpenses(result), 500);
  assert.equal(expenses[0].amount, 300);
});
test('quantity calculations and totals round to currency precision', () => {
  assert.equal(expenseAmount(3, 0.1), 0.3);
  assert.equal(sumExpenses([{ amount: 0.1 }, { amount: 0.2 }]), 0.3);
});
test('CSV quotes commas and quotes, and neutralizes spreadsheet formulas', () => {
  const csv = expensesCsv([{ date: '2026-11-01', title: '=HYPERLINK("bad","name")', category: 'Other', amount: 20 }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"",""name"")"'));
  assert.ok(csv.includes('"Amount (TK)"'));
});
