const assert = require('node:assert/strict');
const { brightness } = require('../modules/rubik-lighting.js');

const identity = { m11: 1, m12: 0, m13: 0, m21: 0, m22: 1, m23: 0, m31: 0, m32: 0, m33: 1 };
const rotateY90 = { m11: 0, m12: 0, m13: -1, m21: 0, m22: 1, m23: 0, m31: 1, m32: 0, m33: 0 };
assert.ok(brightness(identity, 0, -1, 0) > brightness(identity, 0, 1, 0), 'Top faces should receive more light than bottom faces');
assert.equal(brightness(rotateY90, 0, 0, 1), brightness(identity, 1, 0, 0), 'A rotated sticker should match the brightness of its new face');
assert.equal(brightness(rotateY90, 0, 1, 0), brightness(identity, 0, 1, 0), 'Faces not affected by the turn should retain their lighting');
for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
  const value = brightness(identity, x, y, z);
  assert.ok(value >= 0.68 && value <= 1.1, 'Brightness should stay within the intended range');
}
console.log('Rubik lighting orientation tests passed.');
