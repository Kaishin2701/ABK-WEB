const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");

assert.doesNotMatch(html, /id="tool-menu"/);
assert.doesNotMatch(html, /id="tool-menu-toggle"/);
assert.match(html, /onclick="switchTab\('tab-tool-library'\)"/);
assert.match(html, /id="tool-back-button"[\s\S]*?onclick="returnToToolLibrary\(\)"/);
assert.match(html, /id="tab-tool-library"/);

const toolTargets = [...html.matchAll(/data-tab-target="([^"]+)"/g)].map((match) => match[1]);
assert.equal(toolTargets.length, 6);
assert.equal(new Set(toolTargets).size, 6);
assert.ok(toolTargets.includes("tab-create-description"));
assert.match(script, /function openTool\(tabId\)/);
assert.match(script, /function returnToToolLibrary\(\)/);
assert.match(script, /navigation\.classList\.toggle\('tool-open', showBackButton\)/);

const logArrayMatch = script.match(/const UPDATE_LOG_ENTRIES = (\[[\s\S]*?\n\]);/);
assert.ok(logArrayMatch, "Update log array is missing");
const logs = vm.runInNewContext(logArrayMatch[1]);
assert.equal(logs.length, 5);
assert.equal(logs[0].version, "6.1.1");
assert.match(script, /UPDATE_LOG_ENTRIES\.slice\(0, 5\)/);
assert.match(script, /function initialiseUpdateLogCarousel\(\)/);
assert.match(script, /function circularUpdateOffset\(/);
assert.match(script, /activeUpdateIndex = \(activeUpdateIndex \+ direction \+ total\) % total/);
assert.match(script, /addEventListener\('wheel', handleUpdateCarouselWheel, \{ passive: false \}\)/);

assert.match(html, /Ver 6\.1\.1 Web/);
assert.match(html, /<title>ABK<\/title>/);
assert.match(html, /<link rel="icon" type="image\/png" href="assets\/logo\.png\?v=6\.1\.1">/);
assert.doesNotMatch(html, /<img[^>]+assets\/logo\.png/i);
assert.match(html, /class="brand-wordmark"[\s\S]*?>ABK<\/span>/);
assert.match(html, /style\.css\?v=6\.1\.1/);
assert.match(html, /script\.js\?v=6\.1\.1/);
assert.doesNotMatch(html, /class="header-title">INFORMATION<\/div>/);
assert.match(html, /<h1 class="update-log-title">UPDATE LOG<\/h1>/);
assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
assert.match(css, /\.tool-library-grid \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /\.top-nav\.tool-open \.nav-back/);
assert.match(css, /@media \(max-width: 768px\)[\s\S]*?grid-template-columns: 1fr/);
assert.match(css, /\.update-log-list \{[\s\S]*?perspective: clamp\(900px, 90vw, 1600px\)/);
assert.match(css, /\.update-entry \{[\s\S]*?position: absolute/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /@keyframes brandFloat/);
assert.match(css, /@keyframes brandShimmer/);
assert.match(css, /@keyframes updateTitleGlow/);
assert.match(css, /\.update-log \{[\s\S]*?width: min\(100%, 1280px\)[\s\S]*?margin:[^;]*auto/);
assert.match(css, /\.update-entry \{[\s\S]*?width: 92%[\s\S]*?min-height: 240px/);

console.log("ABK navigation regression tests passed.");
