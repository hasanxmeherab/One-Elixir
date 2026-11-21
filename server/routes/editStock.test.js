const { test } = require('node:test');
const assert = require('node:assert/strict');
const router = require('./perfumeRoutes');
const Perfume = require('../models/Perfume');
const { verifyAdmin } = require('../middleware/authMiddleware');

test('edit stock requires admin access and reads fresh inventory without caching', async t => {
  const route = router.stack.find(layer => layer.route?.path === '/edit-stock').route;
  assert.equal(route.stack[0].handle, verifyAdmin);
  let stock = 3;
  const find = t.mock.method(Perfume, 'find', query => {
    assert.deepEqual(query, { isDeleted: { $ne: true } });
    return { select(fields) {
      assert.equal(fields, 'name price stock');
      return { lean: async () => [{ _id: 'p', name: 'Fragrance', price: 100, stock }] };
    } };
  });
  const invoke = async () => {
    const res = { headers: {}, set(key, value) { this.headers[key] = value; }, json(data) { this.data = data; } };
    await route.stack.at(-1).handle({}, res);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    return res.data;
  };
  assert.equal((await invoke())[0].stock, 3);
  stock = 1;
  assert.equal((await invoke())[0].stock, 1);
  assert.equal(find.mock.callCount(), 2);
});

test('edit stock returns an error when inventory cannot be loaded', async t => {
  t.mock.method(Perfume, 'find', () => { throw new Error('Database unavailable'); });
  const route = router.stack.find(layer => layer.route?.path === '/edit-stock').route;
  const res = { set() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
  await route.stack.at(-1).handle({}, res);
  assert.equal(res.code, 500);
  assert.match(res.data.message, /Failed to fetch current stock/);
});
