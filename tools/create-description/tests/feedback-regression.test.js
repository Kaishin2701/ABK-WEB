const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const toolRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(toolRoot, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(toolRoot, "index.html"), "utf8");
const shellRoot = path.resolve(toolRoot, "..", "..");
const shellHtmlSource = fs.readFileSync(path.join(shellRoot, "index.html"), "utf8");
const shellAppSource = fs.readFileSync(path.join(shellRoot, "script.js"), "utf8");

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
    { name: "Inter Miami", aliases: ["Inter Miami"] },
    { name: "Nottingham Forest", aliases: ["Nottingham Forest"] },
    { name: "Arsenal", aliases: ["Arsenal"] }
  ],
  openingAudienceLabel: (audience) => audience,
  bundlePieceKindLabel: (piece) => piece.product_type === "full_kit" ? "kit" : "shirt",
  bundlePieceAudienceLabel: (audience) => ({ kids: "kids", men: "men's", women: "women's", adult: "adult", baby: "baby" }[audience] || audience),
  titleCaseToken: (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
  uniqueTextValues: (values) => [...new Set(values)],
  humanList: (values) => values.length < 2 ? (values[0] || "") : values.length === 2 ? `${values[0]} and ${values[1]}` : `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`,
  esc: (value) => String(value),
  bundleBadgeDisplay: (piece) => piece.badge_league,
  sleeveLengthLabel: (piece) => piece.sleeve_length === "short_sleeve" ? "Short sleeve" : "Long sleeve",
  displayName: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  allowedTags: new Set(["P", "H3", "UL", "LI", "STRONG", "A"]),
  forbiddenTerms: [],
  descriptionDashPattern: /[-\u2013\u2014]/g,
  descriptionDashCheckPattern: /[-\u2013\u2014]/g,
  recommendedActions: () => [],
  standardBundleSizeFacts: (audience) => ({
    kids: { visible_size_range: "Kids sizes 16-28, suggested ages 3-13", size_profile: "kids_16_28" },
    men: { visible_size_range: "Men sizes S-XXL", size_profile: "adult_s_2xl" },
    women: { visible_size_range: "Women sizes Sâ€“XXL", size_profile: "women_s_2xl" },
    adult: { visible_size_range: "Adult sizes S-XXL", size_profile: "adult_s_2xl" },
    baby: { visible_size_range: "Baby sizes 9 and 12 (3â€“24 months)", size_profile: "baby_9_12" }
  }[audience] || { visible_size_range: "", size_profile: "unknown" }),
  maxBundlePieces: 4
});

vm.runInContext(sourceBetween("function hasStandaloneKeyword", "function selectProductKitType"), context);
vm.runInContext(sourceBetween("function findFootballTeam", "function inferProductSelectionFromName"), context);
vm.runInContext(sourceBetween("function bundleRecipientLabelForPiece", "function isBundlePieceKit"), context);
vm.runInContext(sourceBetween("function productTitleFromImageName", "function useImageTitle"), context);
vm.runInContext(sourceBetween("function inferBundleAudienceFromName", "function inferBundlePieceFromName"), context);
vm.runInContext(sourceBetween("function expectedAudienceForRecipient", "function showBundlePieceErrors"), context);
vm.runInContext(sourceBetween("function detectBranch", "function productNameConflict"), context);
vm.runInContext(sourceBetween("function badgeLine", "function sizingWarningLine"), context);
vm.runInContext(sourceBetween("function cfsPossessive", "function renderDescription"), context);
vm.runInContext(sourceBetween("function removeDashesFromText", "function removeDescriptionDashes"), context);
vm.runInContext(sourceBetween("function assignBundlePieceReferences", "function bundleCompositionSummary"), context);
vm.runInContext(sourceBetween("function bundlePieceIdentity", "function isBirthdayGiftPack"), context);
vm.runInContext(sourceBetween("function isBirthdayGiftPack", "function auditPieceBasedBundleDescription"), context);

const leagueArrayMatch = appSource.match(/const badgeLeagueOptions = (\[[\s\S]*?\]);/);
assert.ok(leagueArrayMatch, "Badge league source list is missing");
vm.runInContext(`globalThis.badgeLeagueOptions = ${leagueArrayMatch[1]};`, context);

for (const league of ["FIFA World Cup", "Saudi Pro League", "MLS", "FIFA Club World Cup"]) {
  assert.ok(context.badgeLeagueOptions.includes(league), `${league} is missing from the shared badge list`);
}

const productSleeveAndChestBadge = context.badgeLine({
  badge_status: "available",
  badge_league: "Premier League",
  badge_champion_status: "not_champion",
  chest_badge_status: "available",
  chest_badge_league: "FIFA Club World Cup",
  chest_badge_champion_status: "champion"
});
assert.match(productSleeveAndChestBadge, /Premier League sleeve badge and FIFA Club World Cup Champions chest badge can be added\./);
assert.doesNotMatch(productSleeveAndChestBadge, /3\.99|&pound;|£/);
assert.match(context.badgeLine({
  badge_status: "unavailable",
  chest_badge_status: "available",
  chest_badge_league: "FIFA Club World Cup",
  chest_badge_champion_status: "not_champion"
}), /FIFA Club World Cup chest badge can be added\./);
assert.equal(context.badgeLine({ badge_status: "unavailable", chest_badge_status: "unavailable" }), "");
assert.equal(context.removeDashesFromText("Men sizes S–XXL"), "Men sizes S-XXL");
assert.equal(context.removeDashesFromText("Kids sizes 16—28, suggested ages 3–13"), "Kids sizes 16-28, suggested ages 3-13");
assert.equal(context.containsForbiddenDescriptionDash("Men sizes S-XXL; kids sizes 16-28"), false);

assert.match(htmlSource, /<option value="men">Men<\/option>/);
assert.match(htmlSource, /<option value="women">Women<\/option>/);
assert.match(htmlSource, /id="factForm" class="fact-grid product-single-editor"/);
assert.match(htmlSource, /id="productPersonalisationDisplay"/);
assert.match(htmlSource, /id="productSizeRangeSelect"/);
assert.match(htmlSource, /id="productStandardSizeSummary"/);
assert.match(htmlSource, /id="productBadgeGrid" class="span-2 product-badge-grid"/);
assert.match(htmlSource, /id="productSleeveBadgeNameField"/);
assert.match(htmlSource, /id="productChestBadgeNameField"/);
assert.match(htmlSource, /Product image &amp; colour assistant/);
assert.match(htmlSource, /Create Description \(KFK\)/);
assert.match(htmlSource, /id="cdfWebsiteBackBtn"/);
assert.match(htmlSource, /id="cfsProductFacts"/);
assert.match(htmlSource, /name="cfs_opening_visual"/);
assert.match(htmlSource, /name="cfs_colour_details"/);
assert.match(htmlSource, /name="cfs_back_details"/);
assert.doesNotMatch(htmlSource, /id="cdfSiteChooser"/);
assert.match(shellHtmlSource, /id="tab-create-description" class="tab-content cdf-site-page"/);
assert.match(shellHtmlSource, /id="tab-create-description-kfk"/);
assert.match(shellHtmlSource, /id="tab-create-description-cfs"/);
assert.match(shellHtmlSource, /openTool\('tab-create-description-kfk'\)/);
assert.match(shellHtmlSource, /openTool\('tab-create-description-cfs'\)/);
assert.match(shellHtmlSource, /<strong>CFS<\/strong><span>Open builder<\/span>/);
for (const site of ["RFK", "RFS"]) {
  assert.match(shellHtmlSource, new RegExp(`<strong>${site}<\\/strong><span>Coming soon<\\/span>`));
}
assert.match(shellAppSource, /cdf:return-to-site-chooser/);
assert.match(shellAppSource, /cdf:open-kfk-builder/);
assert.match(shellAppSource, /cdf:open-cfs-builder/);
assert.doesNotMatch(sourceBetween("function getFacts", "function hasStandaloneKeyword"), /badge_price_gbp/);
assert.equal(context.bundleRecipientLabelForPiece({ recipient_role: "men", recipient_label: "", audience: "men" }), "Men");
assert.equal(context.bundleRecipientLabelForPiece({ recipient_role: "women", recipient_label: "", audience: "women" }), "Women");
assert.equal(context.bundleRecipientLabelForPiece({ recipient_role: "mum", recipient_label: "", audience: "women" }), "Mum");

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

const invalidDadKidsPiece = {
  piece_id: "piece-invalid", recipient_role: "dad", recipient_label: "", audience: "men",
  product_name: "Nottingham Forest Home Kids Football Kit 2026/27", team: "Nottingham Forest", season: "2026/27",
  product_kind: "Kit", product_type: "full_kit", kit_type: "home", sleeve_length: "short_sleeve",
  socks_status: "unavailable", included_items: "shirt_and_shorts", listing_configuration: "plain_customisable",
  personalisation_status: "available", print_price_included: "not_applicable", pre_applied_name: "", pre_applied_number: "", size_range_mode: "standard",
  visible_size_range: "Men sizes S-XXL", size_profile: "adult_s_2xl", main_colour_shirt: "Red",
  main_colour_shorts: "White", main_colour_socks: "", badge_status: "unavailable"
};
assert.match(Array.from(context.validateBundlePiece(invalidDadKidsPiece)).join(" "), /Product name indicates Kids/);

const validGiftPackPiece = {
  ...invalidDadKidsPiece,
  recipient_role: "kid",
  audience: "kids",
  visible_size_range: "Kids sizes 16-28, suggested ages 3-13",
  size_profile: "kids_16_28"
};
assert.deepEqual(Array.from(context.validateBundlePiece(validGiftPackPiece)), []);

function validationErrors(mutation) {
  return Array.from(context.validateBundlePiece({ ...validGiftPackPiece, ...mutation })).join(" ");
}

assert.match(validationErrors({ personalisation_status: "unavailable" }), /must offer name-and-number personalisation/);
assert.match(validationErrors({
  listing_configuration: "pre_applied_player", personalisation_status: "unavailable", print_price_included: "no",
  pre_applied_name: "MESSI", pre_applied_number: "10"
}), /must include the player print/);
assert.match(validationErrors({ size_profile: "adult_s_2xl" }), /Standard size range does not match/);
assert.match(validationErrors({ product_name: "Nottingham Forest Home Kids Long Sleeve Football Kit 2026\/27" }), /Long Sleeve Kit/);
assert.match(validationErrors({ kit_type: "away" }), /indicates Home kit type/);
assert.deepEqual(Array.from(context.validateBundlePiece({
  ...validGiftPackPiece,
  product_name: "Nottingham Forest Special Edition Kids Football Kit 2026/27",
  kit_type: "special_edition"
})), []);
assert.equal(context.detectBranch({
  site: "KFK",
  audience: "kids",
  product_type: "full_kit",
  included_items: "shirt_shorts_and_socks",
  socks_status: "included",
  listing_configuration: "plain_customisable",
  kit_type: "special_edition"
}), "plain_customisable_kids_full_kit_with_socks");
assert.equal(context.detectBranch({
  site: "CFS",
  audience: "men",
  product_type: "shirt_only",
  included_items: "shirt_only",
  socks_status: "not_applicable",
  listing_configuration: "plain_customisable"
}), "cfs_plain_customisable_men_shirt_only");
const cfsHtml = context.renderCfsDescription({
  team: "Olympique Marseille",
  season: "2026/27",
  audience: "men",
  kit_type: "away",
  sleeve_length: "short_sleeve",
  badge_status: "available",
  cfs_opening_visual: "Navy away shirt with an aqua camouflage-style pattern",
  cfs_colour_details: "navy with aqua pattern, aqua collar, cuffs and side panels, white front graphics",
  cfs_back_details: "plain navy"
});
assert.match(cfsHtml, /Navy away shirt with an aqua camouflage-style pattern, from Olympique Marseille’s 2026\/27 season\./);
assert.match(cfsHtml, /<h3>Shirt Facts<\/h3>/);
assert.match(cfsHtml, /<strong>Colours:<\/strong> navy with aqua pattern, aqua collar, cuffs and side panels, white front graphics/);
assert.match(cfsHtml, /<strong>In the parcel:<\/strong> 1 shirt\. No shorts or socks\./);
assert.match(cfsHtml, /<strong>Sleeve badge:<\/strong> optional, chosen in the product options\./);
assert.match(cfsHtml, /<h3>Good to Know<\/h3>/);
assert.match(validationErrors({ season: "2025/26" }), /indicates season 2026\/27/);
assert.match(validationErrors({ team: "Arsenal" }), /Team field is Arsenal/);
assert.match(validationErrors({ product_name: "Nottingham Forest MESSI 10 Home Kids Football Kit 2026\/27" }), /configured as No Printed/);
const mctominayTitleWithHiddenCharacter = "Scotland World Cup 2026 Home Kids Football Kit - MC\u200BTOMINAY 4 (With socks)";
const inferredMctominayPrint = context.inferBundlePlayerPrintFromName(mctominayTitleWithHiddenCharacter);
assert.equal(inferredMctominayPrint.name, "MCTOMINAY");
assert.equal(inferredMctominayPrint.number, "4");
assert.equal(context.normalizedFactValue("MC\u200BTOMINAY"), context.normalizedFactValue("MCTOMINAY"));
assert.doesNotMatch(validationErrors({
  product_name: mctominayTitleWithHiddenCharacter,
  team: "Scotland",
  season: "2026",
  listing_configuration: "pre_applied_player",
  personalisation_status: "unavailable",
  print_price_included: "yes",
  pre_applied_name: "MCTOMINAY",
  pre_applied_number: "4"
}), /configured player print/);
assert.match(validationErrors({
  product_name: "Nottingham Forest MESSI 10 Home Kids Football Kit 2026\/27",
  listing_configuration: "pre_applied_player", personalisation_status: "unavailable", print_price_included: "yes",
  pre_applied_name: "RONALDO", pre_applied_number: "7"
}), /configured player print is RONALDO 7/);

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
assert.match(standardHtml, /<strong>Dad:<\/strong> 1 &times; Inter Miami Home men's shirt: one short-sleeve football shirt\./);
assert.doesNotMatch(standardHtml, /Home men's shirt: one short-sleeve football shirt; shorts and socks are not included/);
assert.match(standardHtml, /Dad's shirt is shirt-only\. Shorts and socks are not included\./);
const longSleeveShirtIncluded = context.renderBundlePieceIncluded({
  ...standardPieces[0],
  sleeve_length: "long_sleeve"
});
assert.match(longSleeveShirtIncluded, /one long-sleeve football shirt\.<\/li>/);
assert.doesNotMatch(longSleeveShirtIncluded, /shorts and socks are not included/);
assert.match(standardHtml, /<strong>Son:<\/strong> 1 &times; Inter Miami Away kids kit: shirt, matching shorts and socks\. Messi name and number 10 are already applied to the back\./);
assert.match(standardHtml, /<strong>Material:<\/strong> Made from lightweight polyester fabric/);
assert.match(standardHtml, /Dad: Men sizes S-XXL; Son: Kids sizes 16-28, suggested ages 3-13/);
assert.doesNotMatch(standardHtml, /\bPiece\b/);
assert.match(standardHtml, /<strong>Son kit:<\/strong> Messi name and number 10 are already applied and included; black shirt, black shorts, pink socks\./);
assert.match(standardHtml, /<strong>Dad shirt colours:<\/strong> pink shirt\./);
assert.doesNotMatch(standardHtml, /Son kit colours|Son player print/);

const swedenDadAndSonPieces = [
  {
    ...standardPieces[0],
    team: "Sweden",
    season: "2026",
    reference: "Dad",
    kit_type: "home"
  },
  {
    ...standardPieces[1],
    team: "Sweden",
    season: "2026",
    reference: "Son",
    kit_type: "home",
    socks_status: "unavailable",
    included_items: "shirt_and_shorts",
    main_colour_socks: ""
  }
];
const swedenDadAndSonHtml = context.renderPieceBasedBundleDescription({
  ...standardSummary,
  pieces: swedenDadAndSonPieces,
  sharedTeam: "Sweden",
  sharedSeason: "2026",
  personalisable: [swedenDadAndSonPieces[0]],
  fixedPrint: [swedenDadAndSonPieces[1]],
  badgeEligible: []
});
assert.match(swedenDadAndSonHtml, /Son includes the shirt and matching shorts\. Socks are not included\./);
const pieceAuditSource = sourceBetween("function auditPieceBasedBundleDescription", "function generateBundle");
const beforeOrderDeclarationIndex = pieceAuditSource.indexOf('const beforeOrderText = sectionText("Before You Order");');
const noSocksAuditIndex = pieceAuditSource.indexOf('piece.socks_status === "unavailable"');
assert.ok(beforeOrderDeclarationIndex >= 0 && beforeOrderDeclarationIndex < noSocksAuditIndex, "Piece-based audit must define Before You Order text before checking no-socks items");
assert.doesNotMatch(standardHtml, /<strong>Main colours:<\/strong>/);
const standardProductDetails = standardHtml.slice(standardHtml.indexOf("<h3>Product Details</h3>"), standardHtml.indexOf("<h3>Options You Can Add</h3>"));
const standardOptions = standardHtml.slice(standardHtml.indexOf("<h3>Options You Can Add</h3>"), standardHtml.indexOf("<h3>Before You Order</h3>"));
assert.match(standardProductDetails, /Son kit:<\/strong> Messi name and number 10/);
assert.doesNotMatch(standardOptions, /Son kit:<\/strong> Messi name and number 10/);
assert.doesNotMatch(standardHtml, /promo codes|gift-wrapped|change of mind/);

const comboBadgeHtml = context.renderPieceBasedBundleDescription({
  ...standardSummary,
  badgeEligible: standardPieces.map((piece) => ({
    ...piece,
    badge_status: "available",
    badge_league: "Premier League"
  }))
});
assert.match(comboBadgeHtml, /Dad badge options:<\/strong> Premier League sleeve badge can be added\./);
assert.match(comboBadgeHtml, /Son badge options:<\/strong> Premier League sleeve badge can be added\./);
assert.doesNotMatch(comboBadgeHtml, /one bundle option|separate buy-box option/);

const positionedBadgePiece = {
  ...standardPieces[0],
  reference: "Chelsea Home shirt",
  team: "Chelsea",
  badge_status: "available",
  badge_league: "FIFA Club World Cup",
  badge_champion_status: "champion",
  chest_badge_status: "available",
  chest_badge_league: "Premier League",
  chest_badge_champion_status: "not_champion",
};
const positionedBadgeHtml = context.renderPieceBasedBundleDescription({
  ...standardSummary,
  pieces: [positionedBadgePiece, standardPieces[1]],
  badgeEligible: [positionedBadgePiece]
});
assert.match(positionedBadgeHtml, /FIFA Club World Cup Champions sleeve badge and Premier League chest badge can be added\./);
assert.equal((positionedBadgeHtml.match(/Chelsea Home shirt badge options:/g) || []).length, 1);

const sameBadgeBothPositions = context.renderPositionedBadgeOption({
  ...positionedBadgePiece,
  chest_badge_league: "FIFA World Cup",
  chest_badge_champion_status: "champion"
}, "Argentina Home kit");
assert.match(sameBadgeBothPositions, /FIFA Club World Cup Champions sleeve badge and FIFA World Cup Champions chest badge can be added\./);

const chestOnlyBadge = context.renderPositionedBadgeOption({
  ...positionedBadgePiece,
  badge_status: "unavailable",
  badge_league: "",
  chest_badge_league: "FIFA Club World Cup"
}, "Chelsea Home shirt");
assert.match(chestOnlyBadge, /FIFA Club World Cup chest badge can be added\./);

const coupleHtml = context.renderPieceBasedBundleDescription({
  ...standardSummary,
  pieces: [
    { ...standardPieces[0], reference: "Men's shirt", recipient_role: "men", team: "Spain", kit_type: "away" },
    { ...standardPieces[0], reference: "Women's shirt", recipient_role: "women", audience: "women", team: "Spain", kit_type: "away" }
  ],
  sharedTeam: "Spain",
  personalisable: [],
  fixedPrint: [],
  badgeEligible: []
});
assert.match(coupleHtml, /Products:<\/strong> Away men's shirt and Away women's shirt\./);

assert.match(htmlSource, /id="bundleTypeSelect"/);
assert.match(htmlSource, /value="birthday_gift_pack_home_away_kids"/);
assert.doesNotMatch(htmlSource, /Birthday Gift Pack policy confirmations/);
assert.doesNotMatch(htmlSource, /giftPackPolicyConfirmation/);
assert.match(htmlSource, /id="bundleSizeRangeSelect"/);
assert.doesNotMatch(htmlSource, /id="bundleCustomSizeRangeToggle"/);
assert.match(htmlSource, /id="bundleChestBadgeStatusSelect"/);
assert.match(htmlSource, /id="bundleChestBadgeLeague"/);
assert.match(htmlSource, /id="chestBadgeStatusSelect"/);
assert.match(htmlSource, /id="chestBadgeLeagueInput"/);
assert.match(htmlSource, /id="chestBadgeChampionToggle"/);
assert.doesNotMatch(appSource, /badge_price_gbp|for &pound;3\.99|fixed sleeve badge price/i);
assert.doesNotMatch(htmlSource, /£3\.99|&pound;3\.99|GBP 3\.99/i);
assert.doesNotMatch(appSource, /S&ndash;XXL|\$1&ndash;\$2/);
assert.doesNotMatch(appSource, /(?:sizes|ages)[^"\n]*&ndash;/i);
assert.doesNotMatch(htmlSource, /id="bundleBadgePositionApplicationSelect"/);
assert.doesNotMatch(htmlSource, /id="bundleBadgeApplicationSelect"/);
assert.doesNotMatch(htmlSource, /id="bundleAddBadgeBtn"/);
assert.doesNotMatch(htmlSource, /id="bundleBadgeList"/);
assert.match(htmlSource, /id="bundleStandardSizeSummary"/);
assert.doesNotMatch(htmlSource, /id="bundleAdvancedOptions"/);
assert.doesNotMatch(htmlSource, /Custom range/);
assert.match(htmlSource, /id="bundleRecipientLabelField" class="hidden"/);
assert.doesNotMatch(htmlSource, />\s*Bundle label\s*</);
assert.match(appSource, /bundle_label: isGiftPack \? "KFK Birthday Gift Pack" : "Standard Bundle"/);
assert.match(appSource, /gift_pack_returns_policy: isGiftPack \? "approved" : ""/);
assert.match(appSource, /syncBirthdayGiftPackEditorConstraints/);
assert.doesNotMatch(appSource, /isGiftPack \? new Set\(\["kids"\]\)/);
assert.doesNotMatch(appSource, /isGiftPack \? new Set\(\["Kit"\]\)/);
assert.match(appSource, /value: "extended_3xl"/);
assert.match(appSource, /value: "extended_4xl"/);
assert.match(appSource, /Suggested\)/);
assert.doesNotMatch(appSource, /value: "custom"/);
assert.match(htmlSource, />Standard Bundle<\/button>/);
assert.match(htmlSource, />KFK Birthday Gift Pack<\/button>/);
assert.doesNotMatch(htmlSource, />Standard Bundle: 2–4 Pieces<\/option>/);
assert.doesNotMatch(htmlSource, />KFK Birthday Gift Pack: 2–4 Kids Kits<\/option>/);
assert.match(htmlSource, /Items added: 0 \/ 4/);
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

const independentGiftPackPieces = [
  giftPackPieces[0],
  { ...giftPackPieces[1], team: "Arsenal", season: "2025/26", kit_type: "home" }
];
assert.deepEqual(Array.from(context.validateBirthdayGiftPackFacts({
  ...giftPackFacts,
  bundle_items_list: independentGiftPackPieces
})), []);

const mixedBirthdayFacts = {
  ...giftPackFacts,
  bundle_items_list: standardPieces
};
assert.deepEqual(Array.from(context.validateBirthdayGiftPackFacts(mixedBirthdayFacts)), []);
const mixedBirthdayHtml = context.renderBirthdayGiftPackDescription({
  ...standardSummary,
  facts: mixedBirthdayFacts
});
assert.match(mixedBirthdayHtml, /Inter Miami Home men's shirt/);
assert.match(mixedBirthdayHtml, /Inter Miami Away kids kit/);
assert.match(mixedBirthdayHtml, /<strong>Dad shirt colours:<\/strong> pink shirt\./);
assert.match(mixedBirthdayHtml, /<strong>Son kit:<\/strong> Messi name and number 10 are already applied and included; black shirt, black shorts, pink socks\./);
assert.doesNotMatch(mixedBirthdayHtml, /<strong>Main colours:<\/strong>/);
assert.match(mixedBirthdayHtml, /Promo codes can&rsquo;t be applied to this gift pack/);
assert.match(mixedBirthdayHtml, /standard packaging, not gift-wrapped/);

const giftPackSummary = {
  pieces: giftPackPieces,
  sharedTeam: "Nottingham Forest",
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
assert.match(giftPackHtml, /kids sizes 16-28 \(ages 3-13\)/);
assert.match(giftPackHtml, /Home kit badge options:<\/strong> Premier League sleeve badge can be added\./);
assert.match(giftPackHtml, /Away kit badge options:<\/strong> Premier League sleeve badge can be added\./);
assert.match(giftPackHtml, /Promo codes can&rsquo;t be applied to this gift pack/);
assert.match(giftPackHtml, /standard packaging, not gift-wrapped/);

const duplicateHomePieces = [
  { ...giftPackPieces[0], piece_id: "duplicate-home-1", recipient_role: "kid" },
  { ...giftPackPieces[0], piece_id: "duplicate-home-2", recipient_role: "kid", main_colour_shirt: "Blue" }
];
const duplicateHomeHtml = context.renderBirthdayGiftPackDescription({
  ...giftPackSummary,
  pieces: duplicateHomePieces,
  personalisable: duplicateHomePieces,
  fixedPrint: [],
  badgeEligible: duplicateHomePieces
});
assert.match(duplicateHomeHtml, /<strong>Home kit 1:<\/strong> 1 &times; Nottingham Forest Home kids kit/);
assert.match(duplicateHomeHtml, /<strong>Home kit 2:<\/strong> 1 &times; Nottingham Forest Home kids kit/);
assert.match(duplicateHomeHtml, /Kit types:<\/strong> Home \(×2\)\./);
assert.match(duplicateHomeHtml, /Home kit 1 colours:<\/strong> red shirt/);
assert.match(duplicateHomeHtml, /Home kit 2 colours:<\/strong> blue shirt/);
assert.match(duplicateHomeHtml, /optional on the Home kit 1, the Home kit 2 or both/);
assert.doesNotMatch(duplicateHomeHtml, /Kit types:<\/strong> Home and Home|the Home kit, the Home kit or both/);

const duplicatePrintedHomePieces = [
  {
    ...duplicateHomePieces[0], listing_configuration: "pre_applied_player", personalisation_status: "unavailable",
    pre_applied_name: "BELLINGHAM", pre_applied_number: "10"
  },
  {
    ...duplicateHomePieces[1], listing_configuration: "pre_applied_player", personalisation_status: "unavailable",
    pre_applied_name: "KANE", pre_applied_number: "9"
  }
];
const duplicatePrintedHomeHtml = context.renderBirthdayGiftPackDescription({
  ...giftPackSummary,
  pieces: duplicatePrintedHomePieces,
  personalisable: [],
  fixedPrint: duplicatePrintedHomePieces,
  badgeEligible: duplicatePrintedHomePieces
});
const duplicatePrintedHomeDetails = duplicatePrintedHomeHtml.slice(duplicatePrintedHomeHtml.indexOf("<h3>Product Details</h3>"), duplicatePrintedHomeHtml.indexOf("<h3>Options You Can Add</h3>"));
assert.match(duplicatePrintedHomeDetails, /<strong>Home kit 1:<\/strong> Bellingham name and number 10 are already applied and included; red shirt/);
assert.match(duplicatePrintedHomeDetails, /<strong>Home kit 2:<\/strong> Kane name and number 9 are already applied and included; blue shirt/);
assert.doesNotMatch(duplicatePrintedHomeDetails, /Home kit [12] colours|Home kit [12] player print/);

const independentGiftPackHtml = context.renderBirthdayGiftPackDescription({
  ...giftPackSummary,
  pieces: [
    { ...independentGiftPackPieces[0], reference: "Home kit" },
    { ...independentGiftPackPieces[1], reference: "Home kit 2" }
  ],
  sharedTeam: "",
  sharedSeason: "",
  personalisable: independentGiftPackPieces,
  fixedPrint: [],
  badgeEligible: independentGiftPackPieces
});
assert.match(independentGiftPackHtml, /Teams:<\/strong> Home kit 1 — Nottingham Forest; Home kit 2 — Arsenal\./);
assert.match(independentGiftPackHtml, /Home kit 1 season:<\/strong> 2026\/27\./);
assert.match(independentGiftPackHtml, /Home kit 2 season:<\/strong> 2025\/26\./);
assert.doesNotMatch(independentGiftPackHtml, /<strong>Season:<\/strong> \./);

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
assert.match(printedGiftPackHtml, /<strong>Away kit:<\/strong> Messi name and number 10 are already applied and included; green shirt, green shorts, green socks\./);
assert.doesNotMatch(printedGiftPackHtml, /Away kit colours|Away kit player print/);
assert.match(printedGiftPackHtml, /The Away kit includes the fixed Messi 10 print; another name or number cannot be selected for this kit\./);
assert.doesNotMatch(printedGiftPackHtml, /Away kit or both/);
const printedProductDetails = printedGiftPackHtml.slice(printedGiftPackHtml.indexOf("<h3>Product Details</h3>"), printedGiftPackHtml.indexOf("<h3>Options You Can Add</h3>"));
const printedOptions = printedGiftPackHtml.slice(printedGiftPackHtml.indexOf("<h3>Options You Can Add</h3>"), printedGiftPackHtml.indexOf("<h3>Before You Order</h3>"));
assert.match(printedProductDetails, /Away kit:<\/strong> Messi name and number 10/);
assert.doesNotMatch(printedOptions, /Away kit:<\/strong> Messi name and number 10/);

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
assert.equal((fourPieceHtml.match(/Premier League sleeve badge can be added\./g) || []).length, 4);

const specialEditionPiece = {
  ...giftPackPieces[0],
  product_name: "Nottingham Forest Special Edition Kids Football Kit 2026/27",
  kit_type: "special_edition"
};
const specialEditionGiftPackHtml = context.renderBirthdayGiftPackDescription({
  ...giftPackSummary,
  pieces: [specialEditionPiece, giftPackPieces[1]],
  personalisable: [specialEditionPiece, giftPackPieces[1]],
  fixedPrint: [],
  badgeEligible: [specialEditionPiece, giftPackPieces[1]]
});
assert.match(specialEditionGiftPackHtml, /Nottingham Forest Special Edition kids kit/);
assert.match(specialEditionGiftPackHtml, /Kit types:<\/strong> Away and Special Edition\./);
assert.doesNotMatch(appSource, /includedText\.includes\(`\$\{piece\.kit_type\} kids kit`\)/);

const noSocksHome = {
  ...giftPackPieces[0],
  socks_status: "unavailable",
  included_items: "shirt_and_shorts",
  main_colour_socks: ""
};
const mixedSocksPieces = [noSocksHome, giftPackPieces[1]];
assert.deepEqual(Array.from(context.validateBirthdayGiftPackFacts({ ...giftPackFacts, bundle_items_list: mixedSocksPieces })), []);
assert.deepEqual(Array.from(context.validateBirthdayGiftPackFacts({
  ...giftPackFacts,
  bundle_items_list: [{ ...noSocksHome, included_items: "shirt_shorts_and_socks" }, giftPackPieces[1]]
})), []);
assert.match(Array.from(context.validateBundlePiece({
  ...validGiftPackPiece,
  included_items: "shirt_shorts_and_socks",
  socks_status: "unavailable"
})).join(" "), /contents do not match the selected product and socks options/i);
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

const allNoSocksHtml = context.renderBirthdayGiftPackDescription({
  ...giftPackSummary,
  pieces: [noSocksHome, { ...giftPackPieces[1], socks_status: "unavailable", included_items: "shirt_and_shorts", main_colour_socks: "" }],
  personalisable: giftPackPieces,
  fixedPrint: [],
  badgeEligible: giftPackPieces
});
assert.match(allNoSocksHtml, /The Home kit and Away kit include shirts and matching shorts\. Socks are not included\./);
assert.equal((allNoSocksHtml.match(/socks are not included/gi) || []).length, 3);

console.log("Create Description feedback regression tests passed.");
