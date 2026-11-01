import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postCustomerJson } from './postCustomerJson.js';
test('checkout and reviews submit through the authenticated request function', async () => {
  let options;
  const response = await postCustomerJson(async (url, config) => { assert.equal(url, '/orders'); options = config; return { ok: true, json: async () => ({ _id: 'order' }) }; }, '/orders', { items: [] });
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(options.body), { items: [] });
  assert.equal(response.data._id, 'order');
});
test('server quote conflicts retain status and replacement quote for checkout recovery', async () => {
  const data = { message: 'Price changed', quote: { total: 500 } };
  await assert.rejects(postCustomerJson(async () => ({ ok: false, status: 409, json: async () => data }), '/orders', {}), error => error.response.status === 409 && error.response.data.quote.total === 500);
});
