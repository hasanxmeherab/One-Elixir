import test from 'node:test';
import assert from 'node:assert/strict';
import { isPageSelected, togglePageSelection } from './orderSelection.js';
const page = [{ _id: 'a' }, { _id: 'b' }];
test('equal selection counts on another page do not select the current page', () => {
  const selected = new Set(['c', 'd']);
  assert.equal(isPageSelected(selected, page), false);
  assert.deepEqual([...togglePageSelection(selected, page)], ['c', 'd', 'a', 'b']);
});
test('deselecting a page preserves selection on other pages', () => {
  const selected = new Set(['a', 'b', 'c']);
  assert.equal(isPageSelected(selected, page), true);
  assert.deepEqual([...togglePageSelection(selected, page)], ['c']);
  assert.equal(selected.size, 3);
});
test('partial and empty pages are handled correctly', () => {
  assert.equal(isPageSelected(new Set(), []), false);
  assert.deepEqual([...togglePageSelection(new Set(['a']), page)], ['a', 'b']);
  assert.deepEqual([...togglePageSelection(new Set(['a']), [])], ['a']);
});
