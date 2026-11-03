(function (root) {
  'use strict';
  const qualities = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
  function limitBytes(value) {
    const kb = Number(value);
    if (!Number.isFinite(kb) || kb <= 0 || kb > 100000 || !Number.isInteger(kb)) throw new Error('Enter a whole number between 1 and 100000 KB.');
    return kb * 1000;
  }
  function encode(canvas, quality) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => {
      if (!blob || blob.type !== 'image/webp') reject(new Error('WebP encoding is not supported by this browser.'));
      else resolve(blob);
    }, 'image/webp', quality));
  }
  async function canvasFromBlob(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Unable to read image for compression.')); img.src = url;
      });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      return canvas;
    } finally { URL.revokeObjectURL(url); }
  }
  async function applyLimit(files, maxBytes, options = {}) {
    const over = files.filter(file => file.blob.size >= maxBytes);
    if (!over.length) return { files, failed: [], cancelled: false };
    const lines = over.map(file => `${file.name}: ${(file.blob.size / 1000).toFixed(1)} KB`).join('\n');
    const confirmAction = options.confirm || (message => window.confirm(message));
    if (!await confirmAction(`The following images are at or above ${(maxBytes / 1000)} KB:\n\n${lines}\n\nReduce their image quality to fit the limit?`)) return { files: [], failed: [], cancelled: true };
    const output = [], failed = [];
    for (const file of files) {
      if (file.blob.size < maxBytes) { output.push(file); continue; }
      try {
        const canvas = await (options.canvasFromBlob || canvasFromBlob)(file.blob);
        let best = null;
        for (const quality of qualities) {
          const blob = await (options.encode || encode)(canvas, quality);
          if (blob.size < maxBytes) { best = blob; break; }
        }
        if (best) output.push({ ...file, blob: best });
        else failed.push({ name: file.name, reason: 'Could not reach the limit at the minimum quality.' });
      } catch (error) { failed.push({ name: file.name, reason: error.message }); }
    }
    return { files: output, failed, cancelled: false };
  }
  root.WebpLimit = { limitBytes, encode, applyLimit };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WebpLimit;
})(typeof globalThis !== 'undefined' ? globalThis : window);
