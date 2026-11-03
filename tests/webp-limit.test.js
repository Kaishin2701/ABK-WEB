const assert = require('node:assert/strict');
const { limitBytes, applyLimit, encode } = require('../modules/webp-limit.js');

(async () => {
  assert.equal(limitBytes('200'), 200000);
  for (const value of ['', '0', '-1', '1.5', 'abc']) assert.throws(() => limitBytes(value));
  const files = [{ name: 'small.webp', blob: { size: 100000 } }, { name: 'large.webp', blob: { size: 400000 } }];
  const unchanged = await applyLimit([files[0]], 200000, { confirm: () => { throw Error('Unexpected confirmation'); } });
  assert.equal(unchanged.files[0].blob.size, 100000);
  const calls = [];
  const compressed = await applyLimit(files, 200000, { confirm: () => { throw Error('Unexpected confirmation'); }, canvasFromBlob: async () => ({}), encode: async (_, q) => { calls.push(q); return { size: q > 0.7 ? 250000 : 190000 }; } });
  assert.deepEqual(calls, [0.9, 0.8, 0.7]); assert.equal(compressed.files[1].blob.size, 190000); assert.equal(compressed.failed.length, 0);
  const failed = await applyLimit(files, 200000, { canvasFromBlob: async () => ({}), encode: async () => ({ size: 200000 }) });
  assert.equal(failed.files.length, 1); assert.equal(failed.failed[0].name, 'large.webp');
  await assert.rejects(encode({ toBlob: callback => callback({ type: 'image/png', size: 100 }) }, 1), /WebP encoding/);
  console.log('WebP limit workflow tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
