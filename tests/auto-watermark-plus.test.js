const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mainHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const plusRoot = path.join(root, 'tools', 'auto-watermark-plus');
const plusHtml = fs.readFileSync(path.join(plusRoot, 'index.html'), 'utf8');
const plusScript = fs.readFileSync(path.join(plusRoot, 'app.js'), 'utf8');

assert.match(mainHtml, /id="tab-auto-watermark"/);
assert.match(mainHtml, /openTool\('tab-watermark'\)[\s\S]*?<strong>Standard<\/strong>/);
assert.match(mainHtml, /openTool\('tab-watermark-plus'\)[\s\S]*?<strong>Plus<\/strong>/);
assert.match(mainHtml, /id="auto-watermark-plus-frame"[\s\S]*?tools\/auto-watermark-plus\/index\.html/);
assert.match(mainHtml, /data-tab-target="tab-auto-watermark"/);
assert.match(mainScript, /\['tab-watermark', 'tab-watermark-plus'\]\.includes\(activeTabId\)/);

assert.match(plusHtml, /id="openWatermarkLibrary"/);
assert.match(plusHtml, /id="watermarkLibraryDialog"/);
assert.match(plusHtml, /id="otherWatermark"/);
assert.match(plusHtml, /<option value="cover" selected>Full image<\/option>/);
assert.doesNotMatch(plusScript, /inferFromFilename|inferPlayer|inferType/);
assert.match(plusScript, /configured: false/);
assert.match(plusScript, /Enter the content for every image before exporting/);

const libraryEntries = [...plusScript.matchAll(/src: '\.\.\/\.\.\/watermark\/([^']+)'/g)].map(match => match[1]);
assert.equal(libraryEntries.length, 13);
assert.ok(!libraryEntries.includes('KFK.png'));
assert.ok(libraryEntries.includes('New KFK WTM.png'));
assert.ok(libraryEntries.includes('KFK WTM NO LOGO.png'));
libraryEntries.forEach(file => assert.ok(fs.existsSync(path.join(root, 'watermark', file)), `Missing watermark: ${file}`));

console.log('Auto Watermark Standard/Plus integration tests passed.');
