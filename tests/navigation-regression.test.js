const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");

const toolToggle = html.match(/<button id="tool-menu-toggle"[\s\S]*?<\/button>/)?.[0] || "";
assert.match(toolToggle, />Tools<\/button>$/);
assert.doesNotMatch(toolToggle, /⌄|<span/);

const toolTargets = [...html.matchAll(/data-tab-target="([^"]+)"/g)].map((match) => match[1]);
assert.equal(toolTargets.length, 6);
assert.equal(new Set(toolTargets).size, 6);
assert.ok(toolTargets.includes("tab-create-description"));

const logArrayMatch = script.match(/const UPDATE_LOG_ENTRIES = (\[[\s\S]*?\n\]);/);
assert.ok(logArrayMatch, "Update log array is missing");
const logs = vm.runInNewContext(logArrayMatch[1]);
assert.equal(logs.length, 5);
assert.equal(logs[0].version, "6.0.4");
assert.match(script, /UPDATE_LOG_ENTRIES\.slice\(0, 5\)/);
assert.match(script, /function initialiseUpdateLogCarousel\(\)/);
assert.match(script, /function circularUpdateOffset\(/);
assert.match(script, /activeUpdateIndex = \(activeUpdateIndex \+ direction \+ total\) % total/);
assert.match(script, /addEventListener\('wheel', handleUpdateCarouselWheel, \{ passive: false \}\)/);

assert.match(html, /Ver 6\.0\.4 Web/);
assert.match(html, /style\.css\?v=3\.5/);
assert.match(html, /script\.js\?v=3\.6/);
assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
assert.match(css, /grid-template-columns: repeat\(2, minmax\(160px, 1fr\)\)/);
assert.match(css, /@media \(max-width: 768px\)[\s\S]*?grid-template-columns: 1fr/);
assert.match(css, /\.update-log-list \{[\s\S]*?perspective: 1400px/);
assert.match(css, /\.update-entry \{[\s\S]*?position: absolute/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

console.log("ABK navigation regression tests passed.");
