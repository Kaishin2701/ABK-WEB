const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const toolRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(toolRoot, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(toolRoot, "index.html"), "utf8");

function sourceBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return appSource.slice(start, end);
}

const context = vm.createContext({
  nationalTeams: [{ name: "Spain", aliases: ["Spain"] }],
  footballClubs: [
    { name: "Barcelona", aliases: ["Barcelona"] },
    { name: "Inter Miami", aliases: ["Inter Miami"] }
  ],
  openingAudienceLabel: (audience) => audience,
  bundlePieceKindLabel: () => "Shirt",
  titleCaseToken: (value) => value.charAt(0).toUpperCase() + value.slice(1)
});

vm.runInContext(sourceBetween("function hasStandaloneKeyword", "function selectProductKitType"), context);
vm.runInContext(sourceBetween("function findFootballTeam", "function inferProductSelectionFromName"), context);
vm.runInContext(sourceBetween("function bundleRecipientLabelForPiece", "function isBundlePieceKit"), context);
vm.runInContext(sourceBetween("function productTitleFromImageName", "function useImageTitle"), context);
vm.runInContext(sourceBetween("function assignBundlePieceReferences", "function bundleCompositionSummary"), context);

const leagueArrayMatch = appSource.match(/const badgeLeagueOptions = (\[[\s\S]*?\]);/);
assert.ok(leagueArrayMatch, "Badge league source list is missing");
vm.runInContext(`globalThis.badgeLeagueOptions = ${leagueArrayMatch[1]};`, context);

for (const league of ["FIFA World Cup", "Saudi Pro League", "MLS", "FIFA Club World Cup"]) {
  assert.ok(context.badgeLeagueOptions.includes(league), `${league} is missing from the shared badge list`);
}

assert.match(htmlSource, /<option value="men">Men<\/option>/);
assert.match(htmlSource, /<option value="women">Women<\/option>/);
assert.equal(context.bundleRecipientLabelForPiece({ recipient_role: "men", recipient_label: "", audience: "men" }), "Men");
assert.equal(context.bundleRecipientLabelForPiece({ recipient_role: "women", recipient_label: "", audience: "women" }), "Women");

const nationalTeam = context.findFootballTeam("Spain World Cup Champions 2026");
assert.equal(nationalTeam.name, "Spain");
assert.equal(nationalTeam.team_type, "national");
assert.equal(context.inferSeasonFromProductName("Spain World Cup Champions 2026", nationalTeam), "2026");
assert.equal(context.inferSeasonFromProductName("Spain Home Women Shirt 2026-27", nationalTeam), "2026/27");

const club = context.findFootballTeam("Barcelona Home Men Shirt 2026/27");
assert.equal(club.team_type, "club");
assert.equal(context.inferSeasonFromProductName("Barcelona Home Men Shirt 2026/27", club), "2026/27");
assert.equal(context.inferSeasonFromProductName("Barcelona Home Men Shirt 2026", club), "");

assert.equal(context.productTitleFromImageName("Spain_World_Cup_Champions_2026.webp"), "Spain World Cup Champions 2026");
assert.equal(context.productTitleFromImageName("Barcelona_Home_Men_Shirt_2026-27.webp"), "Barcelona Home Men Shirt 2026/27");

const references = context.assignBundlePieceReferences([
  { recipient_role: "men", recipient_label: "", audience: "men", kit_type: "home" },
  { recipient_role: "men", recipient_label: "", audience: "men", kit_type: "away" }
]);
assert.deepEqual(Array.from(references, (piece) => piece.reference), ["Men's Home Shirt", "Men's Away Shirt"]);
assert.ok(references.every((piece) => !piece.reference.includes("Unassigned")));

console.log("Create Description feedback regression tests passed.");
