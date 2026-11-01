import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvText } from './adminExport.js';
test('CSV escapes spreadsheet formulas, quotes and multiline user text while preserving numeric losses', () => {
  const csv = csvText(['Name', 'Amount'], [['=SUM(1)', -50], [' a,"b"\nnext', 20], [' @evil', 0]]);
  assert.ok(csv.includes('"\'=SUM(1)"'));
  assert.ok(csv.includes('"-50"'));
  assert.ok(csv.includes('" a,""b""\nnext"'));
  assert.ok(csv.includes('"\' @evil"'));
});
