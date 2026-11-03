(function (root) {
  'use strict';
  // Direction vectors use w=0, so translations in the transform do not affect lighting.
  function brightness(matrix, x, y, z) {
    const nx = matrix.m11 * x + matrix.m21 * y + matrix.m31 * z;
    const ny = matrix.m12 * x + matrix.m22 * y + matrix.m32 * z;
    const nz = matrix.m13 * x + matrix.m23 * y + matrix.m33 * z;
    const length = Math.hypot(nx, ny, nz) || 1;
    const light = Math.max(0, (nx * -0.3 + ny * -0.8 + nz * 0.52) / (length * Math.hypot(0.3, 0.8, 0.52)));
    return Math.round((0.68 + light * 0.42) * 100) / 100;
  }
  root.RubikLighting = { brightness };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RubikLighting;
})(typeof globalThis !== 'undefined' ? globalThis : window);
