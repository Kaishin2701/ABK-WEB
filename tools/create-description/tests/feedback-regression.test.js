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
  bundlePieceKindLabel: (piece) => piece.product_type === "full_kit" ? "kit" : "shirt",
  bundlePieceAudienceLabel: (audience) => ({ kids: "kids", men: "men's", women: "women's", adult: "adult", baby: "baby" }[audience] || audience),
  titleCaseToken: (value) => value.charAt(0).toUpperCase() + value.slice(1),
  uniqueTextValues: (values) => [...new Set(values)],
  humanList: (values) => values.length < 2 ? (values[0] || "") : values.length === 2 ? `${values[0]} and ${values[1]}` : `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`,
  esc: (value) => String(value),
  bundleBadgeDisplay: (piece) => piece.badge_league,
  sleeveLengthLabel: (piece) => piece.sleeve_length === "short_sleeve" ? "Short sleeve" : "Long sleeve",
  displayName: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  allowedTags: new Set(["P", "H3", "UL", "LI", "STRONG", "A"]),
  forbiddenTerms: [],
  recommendedActions: () => [],
  maxBundlePieces: 4
});

vm.runInContext(sourceBetween("function hasStandaloneKeyword", "function selectProductKitType"), context);
vm.runInContext(sourceBetween("function findFootballTeam", "function inferProductSelectionFromName"), context);
vm.runInContext(sourceBetween("function bundleRecipientLabelForPiece", "function isBundlePieceKit"), context);
vm.runInContext(sourceBetween("function productTitleFromImageName", "function useImageTitle"), context);
vm.runInContext(sourceBetween("function assignBundlePieceReferences", "function bundleCompositionSummary"), context);
vm.runInContext(sourceBetween("function bundlePieceIdentity", "function isBirthdayGiftPack"), context);
vm.runInContext(sourceBetween("function isBirthdayGiftPack", "function auditPieceBasedBundleDescription"), context);

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
assert.deepEqual(Array.from(references, (piece) => piece.reference), ["Men's Home shirt", "Men's Away shirt"]);
assert.ok(references.every((piece) => !piece.reference.includes("Unassigned")));

const standardPieces = [
  {
    reference: "Dad", recipient_role: "dad", audience: "men", product_type: "shirt_only", kit_type: "home",
    sleeve_length: "short_sleeve", team: "Inter Miami", season: "2026/27", main_colour_shirt: "Pink",
    main_colour_shorts: "", main_colour_socks: "", visible_size_range: "Men sizes S-XXL", size_range_mode: "standard",
    personalisation_status: "available", listing_configuration: "plain_customisable", badge_status: "unavailable"
  },
  {
    reference: "Son", recipient_role: "son", audience: "kids", product_type: "full_kit", kit_type: "away",
    sleeve_length: "short_sleeve", team: "Inter Miami", season: "2026/27", main_colour_shirt: "Black",
    main_colour_shorts: "Black", main_colour_socks: "Pink", visible_size_range: "Kids sizes 16-28, suggested ages 3-13", size_range_mode: "standard",
    personalisation_status: "unavailable", listing_configuration: "pre_applied_player", pre_applied_name: "MESSI",
    pre_applied_number: "10", badge_status: "unavailable", socks_status: "included"
  }
];
const standardSummary = {
  pieces: standardPieces,
  sharedTeam: "Inter Miami",
  sharedSeason: "2026/27",
  sharedSleeve: "short_sleeve",
  sharedSizeRange: "",
  kitTypes: ["Home", "Away"],
  personalisable: [standardPieces[0]],
  fixedPrint: [standardPieces[1]],
  badgeEligible: [],
  customSizes: []
};
const standardHtml = context.renderPieceBasedBundleDescription(standardSummary);
assert.ok(standardHtml.startsWith("<h3>What's Included</h3>"));
assert.doesNotMatch(standardHtml, /<p>|Inter Miami Dad & Son Bundle 2026\/27 brings together/);
assert.match(standardHtml, /<strong>Dad:<\/strong> 1 &times; Inter Miami Home men's shirt: one short-sleeve football shirt; shorts and socks are not included\./);
assert.match(standardHtml, /<strong>Son:<\/strong> 1 &times; Inter Miami Away kids kit: shirt, matching shorts and socks\. Messi name and number 10 are already applied to the back\./);
assert.match(standardHtml, /<strong>Material:<\/strong> Made from lightweight polyester fabric/);
assert.match(standardHtml, /Dad: Men sizes S&ndash;XXL; Son: Kids sizes 16&ndash;28, suggested ages 3&ndash;13/);
assert.match(standardHtml, /<strong>Son player print:<\/strong> Messi name and number 10 are already applied and included\./);
const standardProductDetails = standardHtml.slice(standardHtml.indexOf("<h3>Product Details</h3>"), standardHtml.indexOf("<h3>Options You Can Add</h3>"));
const standardOptions = standardHtml.slice(standardHtml.indexOf("<h3>Options You Can Add</h3>"), standardHtml.indexOf("<h3>Before You Order</h3>"));
assert.match(standardProductDetails, /Son player print/);
assert.doesNotMatch(standardOptions, /Son player print/);
assert.doesNotMatch(standardHtml, /promo codes|gift-wrapped|change of mind/);

assert.match(htmlSource, /id="bundleTypeSelect"/);
assert.match(htmlSource, /value="birthday_gift_pack_home_away_kids"/);
assert.doesNotMatch(htmlSource, /Birthday Gift Pack policy confirmations/);
assert.doesNotMatch(htmlSource, /giftPackPolicyConfirmation/);
assert.match(htmlSource, /id="bundleCustomSizeRangeToggle"/);
assert.match(htmlSource, /id="bundleStandardSizeSummary"/);
assert.match(htmlSource, /id="bundleRecipientLabelField" class="hidden"/);
assert.doesNotMatch(htmlSource, />\s*Bundle label\s*</);
assert.match(appSource, /bundle_label: isGiftPack \? "KFK Birthday Gift Pack" : "Standard Bundle"/);
assert.match(appSource, /gift_pack_returns_policy: isGiftPack \? "approved" : ""/);
assert.match(htmlSource, />Standard Bundle<\/button>/);
assert.match(htmlSource, />KFK Birthday Gift Pack<\/button>/);
assert.doesNotMatch(htmlSource, />Standard Bundle: 2–4 Pieces<\/option>/);
assert.doesNotMatch(htmlSource, />KFK Birthday Gift Pack: 2–4 Kids Kits<\/option>/);
assert.match(htmlSource, /Pieces added: 0 \/ 4/);
assert.match(appSource, /const maxBundlePieces = 4;/);

const giftPackPieces = [
  {
    audience: "kids", product_type: "full_kit", included_items: "shirt_shorts_and_socks", socks_status: "included",
    kit_type: "home", sleeve_length: "short_sleeve", size_profile: "kids_16_28", team: "Nottingham Forest", season: "2026/27",
    main_colour_shirt: "Red", main_colour_shorts: "White", main_colour_socks: "Red", personalisation_status: "available",
    badge_status: "available", badge_league: "Premier League"
  },
  {
    audience: "kids", product_type: "full_kit", included_items: "shirt_shorts_and_socks", socks_status: "included",
    kit_type: "away", sleeve_length: "short_sleeve", size_profile: "kids_16_28", team: "Nottingham Forest", season: "2026/27",
    main_colour_shirt: "Green", main_colour_shorts: "Green", main_colour_socks: "Green", personalisation_status: "available",
    badge_status: "available", badge_league: "Premier League"
  }
];
const giftPackFacts = {
  site: "KFK",
  bundle_type: "birthday_gift_pack_home_away_kids",
  bundle_items_list: giftPackPieces,
  gift_pack_returns_policy: "approved",
  gift_pack_promotion_policy: "approved",
  gift_pack_packaging_policy: "approved"
};
assert.equal(context.isBirthdayGiftPack(giftPackFacts), true);
assert.deepEqual(Array.from(context.validateBirthdayGiftPackFacts(giftPackFacts)), []);
assert.match(Array.from(context.validateBirthdayGiftPackFacts({ ...giftPackFacts, gift_pack_packaging_policy: "" }))[0], /all Birthday Gift Pack policies/i);

const giftPackSummary = {
  pieces: giftPackPieces,
  sharedSeason: "2026/27",
  personalisable: giftPackPieces,
  fixedPrint: [],
  badgeEligible: giftPackPieces
};
const giftPackHtml = context.renderBirthdayGiftPackDescription(giftPackSummary);
assert.ok(giftPackHtml.startsWith("<h3>What's Included</h3>"));
assert.doesNotMatch(giftPackHtml, /<p>|Key Buying Details/);
assert.match(giftPackHtml, /1 &times; Nottingham Forest Home kids kit: shirt, matching shorts and socks\./);
assert.match(giftPackHtml, /Home kit colours:<\/strong> red shirt, white shorts, red socks\./);
assert.match(giftPackHtml, /Away kit colours:<\/strong> green shirt, green shorts, green socks\./);
assert.match(giftPackHtml, /kids sizes 16&ndash;28 \(ages 3&ndash;13\)/);
assert.match(giftPackHtml, /EPL badges:<\/strong> Premier League sleeve badges added to both shirts\./);
assert.match(giftPackHtml, /promo codes can&rsquo;t be applied/);
assert.match(giftPackHtml, /standard packaging, not gift-wrapped/);

const printedAway = {
  ...giftPackPieces[1],
  listing_configuration: "pre_applied_player",
  personalisation_status: "unavailable",
  pre_applied_name: "MESSI",
  pre_applied_number: "10"
};
const printedGiftPackHtml = context.renderBirthdayGiftPackDescription({
  ...giftPackSummary,
  pieces: [giftPackPieces[0], printedAway],
  personalisable: [giftPackPieces[0]],
  fixedPrint: [printedAway],
  badgeEligible: [giftPackPieces[0], printedAway]
});
assert.match(printedGiftPackHtml, /Away kids kit: shirt, matching shorts and socks\. Messi name and number 10 are already applied to the back\./);
assert.match(printedGiftPackHtml, /<strong>Away kit player print:<\/strong> Messi name and number 10 are already applied and included\./);
assert.match(printedGiftPackHtml, /The Away kit includes the fixed Messi 10 print; another name or number cannot be selected for this kit\./);
assert.doesNotMatch(printedGiftPackHtml, /Away kit or both/);
const printedProductDetails = printedGiftPackHtml.slice(printedGiftPackHtml.indexOf("<h3>Product Details</h3>"), printedGiftPackHtml.indexOf("<h3>Options You Can Add</h3>"));
const printedOptions = printedGiftPackHtml.slice(printedGiftPackHtml.indexOf("<h3>Options You Can Add</h3>"), printedGiftPackHtml.indexOf("<h3>Before You Order</h3>"));
assert.match(printedProductDetails, /Away kit player print/);
assert.doesNotMatch(printedOptions, /Away kit player print/);

const fourPieceGiftPack = [
  giftPackPieces[0],
  giftPackPieces[1],
  { ...giftPackPieces[0], kit_type: "third", main_colour_shirt: "White", main_colour_shorts: "Black", main_colour_socks: "White" },
  { ...giftPackPieces[1], kit_type: "fourth", main_colour_shirt: "Yellow", main_colour_shorts: "Yellow", main_colour_socks: "Black" }
];
const fourPieceFacts = { ...giftPackFacts, bundle_items_list: fourPieceGiftPack };
assert.deepEqual(Array.from(context.validateBirthdayGiftPackFacts(fourPieceFacts)), []);
assert.match(Array.from(context.validateBirthdayGiftPackFacts({ ...giftPackFacts, bundle_items_list: [...fourPieceGiftPack, { ...giftPackPieces[0], kit_type: "fifth" }] }))[0], /between 2 and 4 Pieces/i);
const fourPieceHtml = context.renderBirthdayGiftPackDescription({
  ...giftPackSummary,
  pieces: fourPieceGiftPack,
  personalisable: fourPieceGiftPack,
  fixedPrint: [],
  badgeEligible: fourPieceGiftPack
});
assert.match(fourPieceHtml, /1 &times; Nottingham Forest Third kids kit/);
assert.match(fourPieceHtml, /1 &times; Nottingham Forest Fourth kids kit/);
assert.match(fourPieceHtml, /Kit types:<\/strong> Home, Away, Third and Fourth\./);
assert.match(fourPieceHtml, /Third kit colours:<\/strong> white shirt, black shorts, white socks\./);
assert.match(fourPieceHtml, /Choose each kit size separately\./);
assert.match(fourPieceHtml, /Name and number:<\/strong> optional on any eligible kit\./);
assert.match(fourPieceHtml, /Premier League sleeve badges added to all 4 shirts\./);

const noSocksHome = {
  ...giftPackPieces[0],
  socks_status: "unavailable",
  included_items: "shirt_and_shorts",
  main_colour_socks: ""
};
const mixedSocksPieces = [noSocksHome, giftPackPieces[1]];
assert.deepEqual(Array.from(context.validateBirthdayGiftPackFacts({ ...giftPackFacts, bundle_items_list: mixedSocksPieces })), []);
assert.match(Array.from(context.validateBirthdayGiftPackFacts({
  ...giftPackFacts,
  bundle_items_list: [{ ...noSocksHome, included_items: "shirt_shorts_and_socks" }, giftPackPieces[1]]
}))[0], /contents consistent with the selected socks option/i);
const mixedSocksHtml = context.renderBirthdayGiftPackDescription({
  ...giftPackSummary,
  pieces: mixedSocksPieces,
  personalisable: mixedSocksPieces,
  fixedPrint: [],
  badgeEligible: mixedSocksPieces
});
assert.match(mixedSocksHtml, /Home kids kit: shirt and matching shorts; socks are not included\./);
assert.match(mixedSocksHtml, /Home kit colours:<\/strong> red shirt, white shorts\./);
assert.doesNotMatch(mixedSocksHtml, /Home kit colours:<\/strong>[^<]*socks/);
assert.match(mixedSocksHtml, /The Home kit includes the shirt and matching shorts\. Socks are not included\./);

console.log("Create Description feedback regression tests passed.");
