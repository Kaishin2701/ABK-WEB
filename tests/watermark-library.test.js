const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const script = fs.readFileSync(path.join(root, "modules", "watermark.js"), "utf8");

assert.match(html, /id="open-watermark-library"/);
assert.match(html, /id="open-watermark-library"[^>]*>Add<\/button>/);
assert.match(html, /id="btn-select-output"[^>]*>Select<\/button>/);
assert.match(html, /<dialog id="watermark-library-dialog"/);
assert.match(html, /id="watermark-library-grid"/);
assert.match(html, /id="choose-other-watermark"/);
assert.match(html, /id="clear-watermark"[^>]*disabled/);
assert.match(html, /id="selected-watermark-preview"[^>]*hidden/);
assert.match(html, /modules\/watermark\.js\?v=1\.2/);
assert.doesNotMatch(html, /id="rng-quality"|id="rng-opacity"|Quality:|Opacity:/);

const libraryPaths = [...script.matchAll(/src: '(watermark\/[^']+)'/g)].map((match) => match[1]);
assert.equal(libraryPaths.length, 12);
assert.equal(new Set(libraryPaths).size, 12);
for (const relativePath of libraryPaths) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} is missing`);
}

assert.match(script, /function openWatermarkLibrary\(\)/);
assert.match(script, /function loadBuiltInWatermark\(watermark\)/);
assert.match(script, /function applyWatermarkSelection\(image, label, previewSource, libraryKey\)/);
assert.match(script, /function clearWatermarkSelection\(\)/);
assert.match(script, /watermarkFileInput\.click\(\)/);
assert.match(script, /wmImg = image/);
assert.match(script, /wmImg = null/);
assert.match(script, /const opacity = 1;/);
assert.match(script, /const quality = 1;/);
assert.doesNotMatch(script, /rng-quality|rng-opacity|lbl-quality|lbl-opacity/);

assert.match(css, /\.watermark-library-dialog::backdrop/);
assert.match(css, /\.watermark-library-grid \{[^}]*grid-template-columns: repeat\(4/);
assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.watermark-library-grid \{ grid-template-columns: repeat\(2/);
assert.match(css, /\.selected-watermark-preview\[hidden\]/);
assert.match(css, /\.watermark-action-row \{[^}]*align-items: stretch/);
assert.match(css, /\.watermark-compact-button \{[^}]*flex: 0 0 80px[^}]*width: 80px[^}]*height: auto[^}]*white-space: nowrap/);

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.listeners = {};
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.value = "";
    this.hidden = false;
    this.disabled = false;
    this.open = false;
    this._innerHTML = "";
    this.textContent = "";
    this.alt = "";
    this.src = "";
    this.clickCount = 0;
  }
  set innerHTML(value) { this._innerHTML = value; if (value === "") this.children = []; }
  get innerHTML() { return this._innerHTML; }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  appendChild(child) { this.children.push(child); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) {
    delete this.attributes[name];
    if (name === "src") this.src = "";
    if (name === "open") this.open = false;
  }
  showModal() { this.open = true; }
  close() { this.open = false; }
  click() { this.clickCount += 1; this.listeners.click?.({ target: this }); }
  trigger(type, event = {}) { this.listeners[type]?.({ target: this, ...event }); }
}

const requiredIds = [
  "inp-files", "inp-wm", "btn-start-wm", "btn-select-output", "open-watermark-library", "close-watermark-library",
  "cancel-watermark-library", "choose-other-watermark", "clear-watermark", "watermark-library-dialog",
  "watermark-library-grid", "selected-watermark-preview", "selected-watermark-image",
  "selected-watermark-name", "wm-path-display", "log-box"
];
const elements = Object.fromEntries(requiredIds.map((id) => [id, new FakeElement(id)]));
elements["selected-watermark-preview"].hidden = true;
elements["clear-watermark"].disabled = true;
const runtimeContext = vm.createContext({
  document: {
    getElementById: (id) => elements[id] || (elements[id] = new FakeElement(id)),
    createElement: () => new FakeElement()
  },
  Image: class {
    set src(value) { this._src = value; this.onload?.(); }
    get src() { return this._src; }
  },
  FileReader: class {},
  alert: () => {},
  console,
  Date,
  setTimeout,
  clearTimeout
});
vm.runInContext(script, runtimeContext);

elements["open-watermark-library"].click();
assert.equal(elements["watermark-library-dialog"].open, true);
assert.equal(elements["watermark-library-grid"].children.length, 12);
elements["watermark-library-grid"].children[0].click();
assert.equal(elements["wm-path-display"].value, "KFK");
assert.equal(elements["selected-watermark-preview"].hidden, false);
assert.equal(elements["clear-watermark"].disabled, false);
assert.equal(elements["watermark-library-dialog"].open, false);
assert.equal(vm.runInContext("wmImg !== null", runtimeContext), true);

elements["clear-watermark"].click();
assert.equal(elements["wm-path-display"].value, "");
assert.equal(elements["selected-watermark-preview"].hidden, true);
assert.equal(elements["clear-watermark"].disabled, true);
assert.equal(vm.runInContext("wmImg === null", runtimeContext), true);

elements["open-watermark-library"].click();
elements["choose-other-watermark"].click();
assert.equal(elements["watermark-library-dialog"].open, false);
assert.equal(elements["inp-wm"].clickCount, 1);

console.log("Watermark library regression tests passed.");
