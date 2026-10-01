const form = document.querySelector("#factForm");
const bundleForm = document.querySelector("#bundleForm");
const generateBtn = document.querySelector("#generateBtn");
const loadSampleBtn = document.querySelector("#loadSampleBtn");
const clearAllBtn = document.querySelector("#clearAllBtn");
const copyBtn = document.querySelector("#copyBtn");
const branchBadge = document.querySelector("#branchBadge");
const qaBadge = document.querySelector("#qaBadge");
const preview = document.querySelector("#descriptionPreview");
const htmlOutput = document.querySelector("#htmlOutput");
const auditOutput = document.querySelector("#auditOutput");
const productNameInput = form.elements.product_name;
const mainColourShirtInput = form.elements.main_colour_shirt;
const mainColourShortsInput = form.elements.main_colour_shorts;
const mainColourSocksInput = form.elements.main_colour_socks;
const badgeStatusSelect = form.elements.badge_status;
const badgeLeagueField = document.querySelector("#badgeLeagueField");
const badgeLeagueInput = form.elements.badge_league;
const badgeChampionInput = form.elements.badge_champion_status;
const badgeChampionToggle = document.querySelector("#badgeChampionToggle");
const badgeLeagueSuggestions = document.querySelector("#badgeLeagueSuggestions");
const mainColourShortsField = document.querySelector("#mainColourShortsField");
const mainColourSocksField = document.querySelector("#mainColourSocksField");
const imageColourFileInput = document.querySelector("#imageColourFile");
const useImageTitleBtn = document.querySelector("#useImageTitleBtn");
const clearImageColourBtn = document.querySelector("#clearImageColourBtn");
const imageColourWorkspace = document.querySelector("#imageColourWorkspace");
const imageColourCanvas = document.querySelector("#imageColourCanvas");
const imageColourInstruction = document.querySelector("#imageColourInstruction");
const imageColourStatus = document.querySelector("#imageColourStatus");
const imageColourPalette = document.querySelector("#imageColourPalette");
const imageColourPaletteButtons = document.querySelector("#imageColourPaletteButtons");
const viewMoreImageColoursBtn = document.querySelector("#viewMoreImageColoursBtn");
const productAudienceSelect = document.querySelector("#productAudienceSelect");
const adultAudienceOption = productAudienceSelect.querySelector('option[value="adult"]');
const productKindSelect = document.querySelector("#productKindSelect");
const productKitTypeSelect = document.querySelector("#productKitTypeSelect");
const productOtherKitType = document.querySelector("#productOtherKitType");
const productSocksSelect = document.querySelector("#productSocksSelect");
const productPrintSelect = document.querySelector("#productPrintSelect");
const productPrintFields = document.querySelector("#productPrintFields");
const productPrintName = document.querySelector("#productPrintName");
const productPrintNumber = document.querySelector("#productPrintNumber");
const bundleTypeSelect = document.querySelector("#bundleTypeSelect");
const bundleTypeChoices = document.querySelector("#bundleTypeChoices");
const bundleRecipientSelect = document.querySelector("#bundleRecipientSelect");
const bundleRecipientLabelField = document.querySelector("#bundleRecipientLabelField");
const bundleRecipientLabel = document.querySelector("#bundleRecipientLabel");
const bundleAudienceSelect = document.querySelector("#bundleAudienceSelect");
const bundleProductName = document.querySelector("#bundleProductName");
const bundleItemTheme = document.querySelector("#bundleItemTheme");
const bundleItemSeason = document.querySelector("#bundleItemSeason");
const bundleBadgeStatusSelect = document.querySelector("#bundleBadgeStatusSelect");
const bundleBadgeLeagueField = document.querySelector("#bundleBadgeLeagueField");
const bundleBadgeLeague = document.querySelector("#bundleBadgeLeague");
const bundleBadgeLeagueOptionsList = document.querySelector("#bundleBadgeLeagueOptions");
const bundleBadgeChampionToggle = document.querySelector("#bundleBadgeChampionToggle");
const bundleProductSelect = document.querySelector("#bundleProductSelect");
const bundleKitTypeSelect = document.querySelector("#bundleKitTypeSelect");
const bundleSocksSelect = document.querySelector("#bundleSocksSelect");
const bundlePrintSelect = document.querySelector("#bundlePrintSelect");
const bundlePersonalisationSelect = document.querySelector("#bundlePersonalisationSelect");
const bundlePrintFields = document.querySelector("#bundlePrintFields");
const bundlePrintName = document.querySelector("#bundlePrintName");
const bundlePrintNumber = document.querySelector("#bundlePrintNumber");
const bundleSizeRangeModeSelect = document.querySelector("#bundleSizeRangeModeSelect");
const bundleCustomSizeRangeToggle = document.querySelector("#bundleCustomSizeRangeToggle");
const bundleCustomSizeRangeField = document.querySelector("#bundleCustomSizeRangeField");
const bundleVisibleSizeRange = document.querySelector("#bundleVisibleSizeRange");
const bundleStandardSizeSummary = document.querySelector("#bundleStandardSizeSummary");
const bundleAdvancedOptions = document.querySelector("#bundleAdvancedOptions");
const bundleItemAnother = document.querySelector("#bundleItemAnother");
const addBundleItemBtn = document.querySelector("#addBundleItemBtn");
const cancelBundlePieceEditBtn = document.querySelector("#cancelBundlePieceEditBtn");
const bundlePieceEditorBadge = document.querySelector("#bundlePieceEditorBadge");
const bundlePieceValidation = document.querySelector("#bundlePieceValidation");
const bundleItemsSummaryEl = document.querySelector("#bundleItemsSummary");
const bundleItemsList = document.querySelector("#bundleItemsList");
const bundleMainColourShirtInput = document.querySelector("#bundleMainColourShirt");
const bundleMainColourShortsInput = document.querySelector("#bundleMainColourShorts");
const bundleMainColourSocksInput = document.querySelector("#bundleMainColourSocks");
const bundleMainColourShortsField = document.querySelector("#bundleMainColourShortsField");
const bundleMainColourSocksField = document.querySelector("#bundleMainColourSocksField");
const bundleImageColourFileInput = document.querySelector("#bundleImageColourFile");
const bundleUseImageTitleBtn = document.querySelector("#bundleUseImageTitleBtn");
const bundleClearImageColourBtn = document.querySelector("#bundleClearImageColourBtn");
const bundleImageColourWorkspace = document.querySelector("#bundleImageColourWorkspace");
const bundleImageColourCanvas = document.querySelector("#bundleImageColourCanvas");
const bundleImageColourInstruction = document.querySelector("#bundleImageColourInstruction");
const bundleImageColourStatus = document.querySelector("#bundleImageColourStatus");
const bundleImageColourPalette = document.querySelector("#bundleImageColourPalette");
const bundleImageColourPaletteButtons = document.querySelector("#bundleImageColourPaletteButtons");
const bundleViewMoreImageColoursBtn = document.querySelector("#bundleViewMoreImageColoursBtn");
const templateLibrary = window.DESCRIPTION_TEMPLATE_LIBRARY;
const nationalTeams = window.NATIONAL_TEAMS || [];
const footballClubs = window.FOOTBALL_CLUBS || [];

let variantOffset = 0;
let generateTimer = null;
let activeMode = "product";
let bundleItems = [];
let editingBundlePieceId = null;
let nextBundlePieceId = 1;
let bundleDescriptionSessionHistory = [];
let isPrintInferredFromProductName = false;
let isBadgeLeagueSuggestionsOpen = false;
let activeEnhancedSelect = null;
let tabSuggestionContext = null;
let isApplyingTabSuggestion = false;
const imageColourPreviewLimit = 4;
const maxBundlePieces = 4;
const imageColourState = {
  objectUrl: "",
  fileName: "",
  imageLoaded: false,
  activeTarget: "shirt",
  palette: [],
  paletteExpanded: false
};
const bundleImageColourState = {
  objectUrl: "",
  fileName: "",
  imageLoaded: false,
  activeTarget: "shirt",
  palette: [],
  paletteExpanded: false
};

const fixedKfkFacts = Object.freeze({
  version_style: "fan_version",
  material: "polyester",
  badge_price_gbp: 3.99
});

const defaultFacts = {
  site: "KFK",
  ...fixedKfkFacts,
  size_guide_tab_status: "confirmed_present",
  size_guide_location: "product_tab",
  verification_status: "verified",
  fact_status: "ready_for_generation",
  source_notes: "Generated from simplified KFK description form."
};

const allowedTags = new Set(["P", "H3", "UL", "LI", "STRONG", "A"]);
const forbiddenTerms = [
  "official",
  "authentic",
  "genuine",
  "licensed",
  "premium",
  "same as players wear",
  "supporter style",
  "true to size",
  "breathable",
  "moisture-wicking",
  "guaranteed fit"
];
const badgeLeagueOptions = [
  "Premier League",
  "LaLiga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Eredivisie",
  "Primeira Liga",
  "Scottish Premiership",
  "UEFA Champions League",
  "UEFA Europa League",
  "UEFA Conference League",
  "FIFA World Cup",
  "Saudi Pro League",
  "MLS",
  "FIFA Club World Cup"
];

function renderBundleBadgeLeagueOptions() {
  bundleBadgeLeagueOptionsList.replaceChildren(...badgeLeagueOptions.map((league) => {
    const option = document.createElement("option");
    option.value = league;
    return option;
  }));
}

function getFacts() {
  syncProductSelectionFields();
  const data = new FormData(form);
  const facts = { ...defaultFacts };
  for (const [key, value] of data.entries()) {
    facts[key] = typeof value === "string" ? value.trim() : value;
  }

  Object.assign(facts, fixedKfkFacts);
  facts.badge_status = facts.badge_status === "available" ? "available" : "unavailable";
  facts.badge_league = facts.badge_status === "available" ? String(facts.badge_league || "").trim() : "";
  facts.badge_champion_status = facts.badge_status === "available" && facts.badge_champion_status === "champion"
    ? "champion"
    : "not_champion";

  applyAnotherValue(facts, "kit_type");
  applyAnotherValue(facts, "sleeve_length");
  applyAnotherValue(facts, "included_items");
  applyAnotherValue(facts, "socks_status");
  applyAnotherValue(facts, "audience");
  applyAnotherValue(facts, "product_type");
  normaliseAudience(facts);
  normaliseProductType(facts);
  applyProductTypeRules(facts);
  applyDerivedSizeFacts(facts);

  if (facts.listing_configuration === "plain_customisable") {
    facts.personalisation_status = "available";
    facts.pre_applied_name = "";
    facts.pre_applied_number = "";
    facts.print_price_included = "not_applicable";
  } else {
    facts.personalisation_status = "unavailable";
    facts.print_price_included = "yes";
  }

  return facts;
}

function hasStandaloneKeyword(value, keyword) {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escapedKeyword}($|[^a-z0-9])`, "i").test(value);
}

function selectProductKitType(value) {
  const hasOption = [...productKitTypeSelect.options].some((option) => option.value === value);
  if (hasOption) productKitTypeSelect.value = value;
}

function findFootballTeam(productName) {
  const teamSources = [
    { teams: nationalTeams, team_type: "national" },
    { teams: footballClubs, team_type: "club" }
  ];
  const matches = teamSources.flatMap(({ teams, team_type }) => teams.flatMap((team) => team.aliases
    .filter((alias) => hasStandaloneKeyword(productName, alias))
    .map((alias) => ({ name: team.name, alias, team_type }))));

  matches.sort((left, right) => right.alias.length - left.alias.length);
  return matches[0] || null;
}

function inferSeasonFromProductName(productName, matchedTeam = findFootballTeam(productName)) {
  const standardSeason = productName.match(/\b(20\d{2}|2\d)\s*[\/._-]\s*(\d{2})\b/);
  if (standardSeason) {
    return standardSeason[1].length === 2
      ? `20${standardSeason[1]}/${standardSeason[2]}`
      : `${standardSeason[1]}/${standardSeason[2]}`;
  }

  if (matchedTeam?.team_type !== "national") return "";
  const tournamentYears = [...productName.matchAll(/\b(20\d{2})\b/g)];
  return tournamentYears.at(-1)?.[1] || "";
}

function inferProductSelectionFromName() {
  const productName = productNameInput.value.trim();
  if (!productName) return;

  const matchedTeam = findFootballTeam(productName);
  if (matchedTeam) form.elements.team.value = matchedTeam.name;
  const season = inferSeasonFromProductName(productName, matchedTeam);
  if (season) form.elements.season.value = season;

  const audienceMatch = [
    ["baby", "baby"],
    ["women's", "women"],
    ["womens", "women"],
    ["women", "women"],
    ["men's", "men"],
    ["mens", "men"],
    ["men", "men"],
    ["male", "men"],
    ["man", "men"],
    ["kids", "kids"],
    ["kid", "kids"],
    ["adult", "adult"]
  ].find(([keyword]) => hasStandaloneKeyword(productName, keyword));
  if (audienceMatch) productAudienceSelect.value = audienceMatch[1];

  const kitTypeMatch = [
    ["special edition", "special_edition"],
    ["pre match", "pre_match"],
    ["pre-match", "pre_match"],
    ["goalkeeper", "goalkeeper"],
    ["training", "training"],
    ["fourth", "fourth"],
    ["fifth", "fifth"],
    ["third", "third"],
    ["away", "away"],
    ["home", "home"],
    ["retro", "retro"]
  ].find(([keyword]) => hasStandaloneKeyword(productName, keyword));
  if (kitTypeMatch) selectProductKitType(kitTypeMatch[1]);

  const hasLongSleeve = hasStandaloneKeyword(productName, "long sleeve") || hasStandaloneKeyword(productName, "long-sleeve");
  const hasKit = hasStandaloneKeyword(productName, "football kit") || hasStandaloneKeyword(productName, "kit");
  const hasShirt = hasStandaloneKeyword(productName, "football shirt") || hasStandaloneKeyword(productName, "shirt");
  const hasSuit = hasStandaloneKeyword(productName, "suit");

  if (hasSuit) productKindSelect.value = "Suit";
  else if (hasLongSleeve && hasKit) productKindSelect.value = "Long Sleeve Kit";
  else if (hasLongSleeve && hasShirt) productKindSelect.value = "Long Sleeve Shirt";
  else if (hasKit) productKindSelect.value = "Kit";
  else if (hasShirt) productKindSelect.value = "Shirt";

  if (hasStandaloneKeyword(productName, "with socks")) productSocksSelect.value = "included";
  if (hasStandaloneKeyword(productName, "no socks") || hasStandaloneKeyword(productName, "without socks")) productSocksSelect.value = "unavailable";

  const playerPrintMatch = productName.match(/(?:^|[^a-z])([A-Z]{2,}(?:\s+[A-Z]{2,})*)\s+(\d{1,2})(?=$|[^a-z0-9])/);
  if (playerPrintMatch) {
    productPrintSelect.value = "pre_applied_player";
    productPrintName.value = playerPrintMatch[1];
    productPrintNumber.value = playerPrintMatch[2];
    isPrintInferredFromProductName = true;
  } else if (isPrintInferredFromProductName) {
    productPrintSelect.value = "plain_customisable";
    productPrintName.value = "";
    productPrintNumber.value = "";
    isPrintInferredFromProductName = false;
  }

  syncProductSelectionFields();
}

function syncProductSelectionFields() {
  let isKit = productKindSelect.value === "Kit" || productKindSelect.value === "Long Sleeve Kit";
  let isLongSleeve = productKindSelect.value === "Long Sleeve Shirt" || productKindSelect.value === "Long Sleeve Kit";
  let isSuit = productKindSelect.value === "Suit";
  const isPrinted = productPrintSelect.value === "pre_applied_player";
  const usesOtherKitType = productKitTypeSelect.value === "other";

  if (productAudienceSelect.value === "baby" && !isSuit) {
    productKindSelect.value = "Suit";
    isKit = false;
    isLongSleeve = false;
    isSuit = true;
  }

  if (isSuit) {
    productAudienceSelect.value = "baby";
  }

  adultAudienceOption.disabled = !isKit;
  adultAudienceOption.textContent = isKit ? "Adult" : "Adult (kits only)";

  form.elements.audience.value = productAudienceSelect.value;
  form.elements.product_type.value = isKit ? "full_kit" : "shirt_only";
  form.elements.kit_type.value = usesOtherKitType ? productOtherKitType.value.trim() || "unknown" : productKitTypeSelect.value;
  form.elements.sleeve_length.value = isSuit ? "baby_suit" : isLongSleeve ? "long_sleeve" : "short_sleeve";
  form.elements.listing_configuration.value = productPrintSelect.value;

  if (isKit) {
    form.elements.socks_status.value = productSocksSelect.value;
    form.elements.included_items.value = productSocksSelect.value === "included" ? "shirt_shorts_and_socks" : "shirt_and_shorts";
  } else {
    form.elements.socks_status.value = "not_applicable";
    form.elements.included_items.value = "shirt_only";
  }

  productSocksSelect.classList.toggle("hidden", !isKit);
  productOtherKitType.classList.toggle("visible", usesOtherKitType);
  productOtherKitType.required = usesOtherKitType;
  productPrintFields.classList.toggle("visible", isPrinted);
  productPrintName.required = isPrinted;
  productPrintNumber.required = isPrinted;

  if (!isPrinted) {
    productPrintName.value = "";
    productPrintNumber.value = "";
  }

  const usesShortsColour = isKit;
  mainColourShortsInput.disabled = !usesShortsColour;
  mainColourShortsField.classList.toggle("disabled", !usesShortsColour);
  mainColourShortsField.title = usesShortsColour ? "" : "Shorts colour applies to kits only.";
  if (!usesShortsColour) mainColourShortsInput.value = "";

  const usesSocksColour = isKit && productSocksSelect.value === "included";
  mainColourSocksInput.disabled = !usesSocksColour;
  mainColourSocksField.classList.toggle("disabled", !usesSocksColour);
  mainColourSocksField.title = usesSocksColour ? "" : "Socks colour applies to kits with socks only.";
  if (!usesSocksColour) mainColourSocksInput.value = "";

  syncBadgeField();
  updateImageColourAssistantUi();
  refreshEnhancedSelects();
}

function syncBadgeField() {
  const isAvailable = badgeStatusSelect.value === "available";
  badgeLeagueField.classList.toggle("hidden", !isAvailable);
  badgeLeagueInput.required = isAvailable;
  badgeChampionToggle.disabled = !isAvailable;
  if (!isAvailable) {
    badgeLeagueInput.value = "";
    setBadgeChampionStatus(false);
    setBadgeLeagueSuggestionsOpen(false);
  } else {
    setBadgeChampionStatus(badgeChampionInput.value === "champion");
  }
}

function setBadgeLeagueSuggestionsOpen(isOpen) {
  isBadgeLeagueSuggestionsOpen = isOpen;
  badgeLeagueInput.setAttribute("aria-expanded", String(isOpen));
  renderBadgeLeagueSuggestions();
}

function renderBadgeLeagueSuggestions() {
  badgeLeagueSuggestions.replaceChildren();
  const query = String(badgeLeagueInput.dataset.tabSuggestionQuery ?? badgeLeagueInput.value).trim().toLowerCase();
  const matches = badgeLeagueOptions.filter((league) => league.toLowerCase().includes(query));
  const shouldShow = isBadgeLeagueSuggestionsOpen && matches.length > 0;
  badgeLeagueSuggestions.classList.toggle("hidden", !shouldShow);

  if (!shouldShow) return;

  matches.forEach((league) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "badge-league-suggestion";
    option.setAttribute("role", "option");
    option.textContent = league;
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => {
      badgeLeagueInput.value = league;
      badgeLeagueInput.dispatchEvent(new Event("input", { bubbles: true }));
      setBadgeLeagueSuggestionsOpen(false);
    });
    badgeLeagueSuggestions.append(option);
  });
}

function suggestionDirection(event) {
  const key = event.key.toLowerCase();
  if (["arrowup", "w", "a"].includes(key)) return -1;
  if (["arrowdown", "s", "d"].includes(key)) return 1;
  return 0;
}

function selectBadgeLeagueSuggestion(direction, startsAtFirst = false) {
  setBadgeLeagueSuggestionsOpen(true);
  const choices = [...badgeLeagueSuggestions.querySelectorAll(".badge-league-suggestion")];
  if (!choices.length) return;
  const selectedIndex = choices.findIndex((choice) => choice.textContent === badgeLeagueInput.value);
  const nextIndex = startsAtFirst
    ? 0
    : (selectedIndex + direction + choices.length) % choices.length;
  isApplyingTabSuggestion = true;
  choices[nextIndex].click();
  isApplyingTabSuggestion = false;
  badgeLeagueInput.focus();
  setBadgeLeagueSuggestionsOpen(true);
}

function setBadgeChampionStatus(isChampion) {
  badgeChampionInput.value = isChampion ? "champion" : "not_champion";
  badgeChampionToggle.classList.toggle("active", isChampion);
  badgeChampionToggle.setAttribute("aria-pressed", String(isChampion));
  badgeChampionToggle.setAttribute("aria-label", `Champion badge: ${isChampion ? "on" : "off"}`);
  badgeChampionToggle.title = isChampion ? "Champions badge selected" : "Mark this as a champions badge";
}

function enhanceSelects() {
  document.querySelectorAll('#factForm select:not([data-enhance="false"]), #bundleForm select:not([data-enhance="false"])').forEach((select) => {
    if (select.dataset.enhanced === "true") return;

    const wrapper = document.createElement("div");
    wrapper.className = "enhanced-select";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "enhanced-select-input";
    input.autocomplete = "off";
    input.placeholder = "Type or choose…";
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-label", select.getAttribute("aria-label") || "Choose an option");
    const options = document.createElement("div");
    options.className = "enhanced-select-options hidden";
    options.setAttribute("role", "listbox");

    select.before(wrapper);
    wrapper.append(select, input, options);
    select.classList.add("enhanced-select-source");
    select.dataset.enhanced = "true";
    select.addEventListener("change", () => refreshEnhancedSelects());
    input.addEventListener("focus", () => openEnhancedSelect(wrapper));
    input.addEventListener("input", () => {
      delete input.dataset.tabSuggestionQuery;
      setEnhancedSelectValue(select, input.value);
      renderEnhancedSelectOptions(wrapper);
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (activeEnhancedSelect === wrapper) closeEnhancedSelects();
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }, 150);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        tabSuggestionContext = { type: "enhanced", wrapper };
        input.dataset.tabSuggestionQuery = input.value;
        selectEnhancedSuggestion(wrapper, 0, true);
        return;
      }
      if (tabSuggestionContext?.type === "enhanced" && tabSuggestionContext.wrapper === wrapper) {
        const direction = suggestionDirection(event);
        if (direction) {
          event.preventDefault();
          selectEnhancedSuggestion(wrapper, direction);
          return;
        }
      }
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      if (event.key === "Enter") select.dispatchEvent(new Event("change", { bubbles: true }));
      closeEnhancedSelects();
    });
  });

  refreshEnhancedSelects();
}

function refreshEnhancedSelects() {
  document.querySelectorAll(".enhanced-select").forEach((wrapper) => {
    const select = wrapper.querySelector("select");
    const input = wrapper.querySelector(".enhanced-select-input");
    const selected = select.selectedOptions[0];

    wrapper.classList.toggle("hidden", select.classList.contains("hidden"));
    input.disabled = select.disabled;
    if (document.activeElement !== input) input.value = selected?.textContent.trim() || "";
    renderEnhancedSelectOptions(wrapper);
  });
}

function setEnhancedSelectValue(select, text) {
  const value = String(text || "").trim();
  const matched = [...select.options].find((option) => (
    option.dataset.customOption !== "true"
    && (option.textContent.trim().toLowerCase() === value.toLowerCase()
      || option.value.toLowerCase() === value.toLowerCase())
  ));
  const customOption = [...select.options].find((option) => option.dataset.customOption === "true");

  if (matched) {
    select.value = matched.value;
    if (customOption) customOption.remove();
    return;
  }

  const nextCustomOption = customOption || document.createElement("option");
  nextCustomOption.dataset.customOption = "true";
  nextCustomOption.value = value;
  nextCustomOption.textContent = value;
  if (!customOption) select.append(nextCustomOption);
  select.value = value;
}

function renderEnhancedSelectOptions(wrapper) {
  const select = wrapper.querySelector("select");
  const input = wrapper.querySelector(".enhanced-select-input");
  const options = wrapper.querySelector(".enhanced-select-options");
  const matches = [...select.options].filter((option) => (
    option.dataset.customOption !== "true" && !option.hidden
  ));

  options.replaceChildren();
  if (!matches.length) {
    options.classList.add("hidden");
    return;
  }

  matches.forEach((option) => {
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = "enhanced-select-option";
    choice.setAttribute("role", "option");
    choice.textContent = option.textContent.trim();
    choice.disabled = option.disabled;
    choice.classList.toggle("selected", option.selected);
    choice.setAttribute("aria-selected", String(option.selected));
    choice.addEventListener("mousedown", (event) => event.preventDefault());
    choice.addEventListener("click", () => {
      if (option.disabled) return;
      select.value = option.value;
      input.value = option.textContent.trim();
      select.dispatchEvent(new Event("change", { bubbles: true }));
      closeEnhancedSelects();
    });
    options.append(choice);
  });

  options.classList.toggle("hidden", activeEnhancedSelect !== wrapper);
}

function selectEnhancedSuggestion(wrapper, direction, startsAtFirst = false) {
  openEnhancedSelect(wrapper);
  const input = wrapper.querySelector(".enhanced-select-input");
  const choices = [...wrapper.querySelectorAll(".enhanced-select-option:not(:disabled)")];
  if (!choices.length) return;
  const selectedIndex = choices.findIndex((choice) => choice.classList.contains("selected"));
  const nextIndex = startsAtFirst
    ? 0
    : (selectedIndex + direction + choices.length) % choices.length;
  isApplyingTabSuggestion = true;
  choices[nextIndex].click();
  isApplyingTabSuggestion = false;
  input.focus();
  openEnhancedSelect(wrapper);
}

function openEnhancedSelect(wrapper) {
  closeEnhancedSelects();
  activeEnhancedSelect = wrapper;
  renderEnhancedSelectOptions(wrapper);
}

function closeEnhancedSelects() {
  document.querySelectorAll(".enhanced-select-options").forEach((options) => options.classList.add("hidden"));
  activeEnhancedSelect = null;
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".enhanced-select")) closeEnhancedSelects();
});

function visibleTextFields() {
  return [...document.querySelectorAll("#factForm input, #factForm textarea, #bundleForm input, #bundleForm textarea")]
    .filter((field) => field.type !== "hidden" && field.type !== "file" && !field.disabled)
    .filter((field) => !field.classList.contains("enhanced-select-source"))
    .filter((field) => !field.closest(".hidden") && field.getClientRects().length > 0);
}

function moveTextFieldFocus(step) {
  const fields = visibleTextFields();
  const index = fields.indexOf(document.activeElement);
  if (index < 0 || !fields.length) return;
  const nextIndex = (index + step + fields.length) % fields.length;
  fields[nextIndex].focus();
  if (typeof fields[nextIndex].select === "function") fields[nextIndex].select();
}

document.addEventListener("keydown", (event) => {
  const isTextField = event.target.matches("input:not([type=hidden]):not([type=file]), textarea");
  if (!isTextField) return;

  if (event.key === "Tab") {
    event.preventDefault();
    return;
  }

  if (tabSuggestionContext) return;

  const directions = {
    ArrowLeft: -1,
    ArrowUp: -1,
    ArrowRight: 1,
    ArrowDown: 1,
    a: -1,
    w: -1,
    d: 1,
    s: 1
  };
  const key = event.ctrlKey ? event.key.toLowerCase() : event.key;
  const usesArrow = key.startsWith("Arrow");
  const usesCtrlWASD = event.ctrlKey && ["a", "w", "s", "d"].includes(key);
  if (!usesArrow && !usesCtrlWASD) return;

  event.preventDefault();
  moveTextFieldFocus(directions[key]);
});

document.addEventListener("keyup", (event) => {
  if (event.key !== "Tab") return;
  if (tabSuggestionContext?.type === "enhanced") {
    delete tabSuggestionContext.wrapper.querySelector(".enhanced-select-input").dataset.tabSuggestionQuery;
    renderEnhancedSelectOptions(tabSuggestionContext.wrapper);
  }
  if (tabSuggestionContext?.type === "badge") {
    delete badgeLeagueInput.dataset.tabSuggestionQuery;
    renderBadgeLeagueSuggestions();
  }
  tabSuggestionContext = null;
});

const imageColourReference = [
  { label: "White", rgb: [255, 255, 255] },
  { label: "Black", rgb: [20, 20, 20] },
  { label: "Red", rgb: [205, 35, 45] },
  { label: "Blue", rgb: [35, 85, 180] },
  { label: "Light blue", rgb: [120, 190, 225] },
  { label: "Navy", rgb: [25, 45, 100] },
  { label: "Green", rgb: [40, 145, 75] },
  { label: "Yellow", rgb: [235, 195, 35] },
  { label: "Orange", rgb: [230, 115, 35] },
  { label: "Pink", rgb: [225, 95, 145] },
  { label: "Purple", rgb: [125, 65, 160] },
  { label: "Grey", rgb: [135, 140, 145] },
  { label: "Brown", rgb: [125, 75, 45] },
  { label: "Beige", rgb: [215, 185, 135] },
  { label: "Claret", rgb: [115, 25, 45] },
  { label: "Multi-colour", rgb: [120, 120, 120] }
];

function currentImageColourTargets() {
  const isKit = productKindSelect.value === "Kit" || productKindSelect.value === "Long Sleeve Kit";
  const targets = [
    { key: "shirt", label: "shirt", input: mainColourShirtInput }
  ];

  if (isKit) {
    targets.push({ key: "shorts", label: "shorts", input: mainColourShortsInput });
    if (productSocksSelect.value === "included") {
      targets.push({ key: "socks", label: "socks", input: mainColourSocksInput });
    }
  }

  return targets;
}

function imageColourTarget(key) {
  return currentImageColourTargets().find((target) => target.key === key) || null;
}

function imageColourRow(key) {
  return document.querySelector(`[data-colour-target="${key}"]`);
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function mapRgbToImageColour(rgb) {
  const [red, green, blue] = rgb;
  let best = imageColourReference[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  imageColourReference.forEach((reference) => {
    const distance = ((red - reference.rgb[0]) ** 2)
      + ((green - reference.rgb[1]) ** 2)
      + ((blue - reference.rgb[2]) ** 2);
    if (distance < bestDistance) {
      best = reference;
      bestDistance = distance;
    }
  });

  return {
    label: best.label,
    rgb: [red, green, blue]
  };
}

function averageCanvasColour(x, y, radius = 10) {
  const context = imageColourCanvas.getContext("2d");
  if (!context || !imageColourCanvas.width || !imageColourCanvas.height) return null;

  const left = Math.max(0, Math.floor(x - radius));
  const top = Math.max(0, Math.floor(y - radius));
  const right = Math.min(imageColourCanvas.width, Math.ceil(x + radius));
  const bottom = Math.min(imageColourCanvas.height, Math.ceil(y + radius));
  const pixels = context.getImageData(left, top, Math.max(1, right - left), Math.max(1, bottom - top)).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 120) continue;
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    count += 1;
  }

  if (!count) return null;
  return mapRgbToImageColour([
    Math.round(red / count),
    Math.round(green / count),
    Math.round(blue / count)
  ]);
}

function buildImageColourPalette() {
  const context = imageColourCanvas.getContext("2d");
  if (!context || !imageColourCanvas.width || !imageColourCanvas.height) return [];

  const pixels = context.getImageData(0, 0, imageColourCanvas.width, imageColourCanvas.height).data;
  const step = Math.max(1, Math.ceil(Math.sqrt((imageColourCanvas.width * imageColourCanvas.height) / 12000)));
  const buckets = new Map();

  for (let y = 0; y < imageColourCanvas.height; y += step) {
    for (let x = 0; x < imageColourCanvas.width; x += step) {
      const index = ((y * imageColourCanvas.width) + x) * 4;
      if (pixels[index + 3] < 120) continue;

      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      if (red > 248 && green > 248 && blue > 248) continue;

      const bucketRgb = [
        Math.min(255, Math.round(red / 32) * 32),
        Math.min(255, Math.round(green / 32) * 32),
        Math.min(255, Math.round(blue / 32) * 32)
      ];
      const key = bucketRgb.join(",");
      const bucket = buckets.get(key) || { count: 0, red: 0, green: 0, blue: 0 };
      bucket.count += 1;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      buckets.set(key, bucket);
    }
  }

  const grouped = new Map();
  [...buckets.values()].forEach((bucket) => {
    const rgb = [
      Math.round(bucket.red / bucket.count),
      Math.round(bucket.green / bucket.count),
      Math.round(bucket.blue / bucket.count)
    ];
    const mapped = mapRgbToImageColour(rgb);
    const existing = grouped.get(mapped.label) || { label: mapped.label, count: 0, red: 0, green: 0, blue: 0 };
    existing.count += bucket.count;
    existing.red += mapped.rgb[0] * bucket.count;
    existing.green += mapped.rgb[1] * bucket.count;
    existing.blue += mapped.rgb[2] * bucket.count;
    grouped.set(mapped.label, existing);
  });

  return [...grouped.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)
    .map((item) => ({
      label: item.label,
      rgb: [
        Math.round(item.red / item.count),
        Math.round(item.green / item.count),
        Math.round(item.blue / item.count)
      ]
    }));
}

function setActiveImageColourTarget(key) {
  if (!imageColourTarget(key)) return;
  imageColourState.activeTarget = key;
  imageColourInstruction.textContent = `Click the main ${key} colour in the image to apply it to the selected field.`;
  updateImageColourAssistantUi();
}

function setImageColourSuggestion(key, suggestion) {
  const target = imageColourTarget(key);
  if (!target || !suggestion) return;
  target.input.value = appendImageColour(target.input.value, suggestion.label);
  target.input.dispatchEvent(new Event("input", { bubbles: true }));
  updateImageColourAssistantUi();
}

function appendImageColour(currentValue, nextColour) {
  const current = String(currentValue || "").trim();
  const colour = String(nextColour || "").trim();
  if (!colour) return current;

  const escapedColour = colour.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alreadyIncluded = new RegExp(`(?:^|\\s)${escapedColour}(?=$|\\s)`, "i").test(current);
  return alreadyIncluded ? current : [current, colour].filter(Boolean).join(" ");
}

function renderImageColourPalette() {
  imageColourPaletteButtons.replaceChildren();
  imageColourPalette.classList.toggle("hidden", !imageColourState.palette.length);
  const hasAdditionalColours = imageColourState.palette.length > imageColourPreviewLimit;
  const visibleColours = imageColourState.palette.slice(
    0,
    imageColourState.paletteExpanded ? imageColourState.palette.length : imageColourPreviewLimit
  );

  visibleColours.forEach((colour) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-button";
    button.title = `Apply ${colour.label} to the selected garment colour`;

    const swatch = document.createElement("span");
    swatch.className = "palette-swatch";
    swatch.style.backgroundColor = rgbToHex(colour.rgb);

    const label = document.createElement("span");
    label.textContent = colour.label;
    button.append(swatch, label);
    button.addEventListener("click", () => setImageColourSuggestion(imageColourState.activeTarget, colour));
    imageColourPaletteButtons.append(button);
  });

  viewMoreImageColoursBtn.classList.toggle("hidden", !hasAdditionalColours);
  viewMoreImageColoursBtn.setAttribute("aria-expanded", String(imageColourState.paletteExpanded));
  viewMoreImageColoursBtn.textContent = imageColourState.paletteExpanded
    ? "Show less"
    : `View more (${imageColourState.palette.length - imageColourPreviewLimit})`;
}

function updateImageColourAssistantUi() {
  const hasImage = imageColourState.imageLoaded;
  imageColourWorkspace.classList.toggle("hidden", !hasImage);
  useImageTitleBtn.disabled = !imageColourState.fileName;
  clearImageColourBtn.disabled = !hasImage;

  const targets = currentImageColourTargets();
  if (!targets.some((target) => target.key === imageColourState.activeTarget)) {
    imageColourState.activeTarget = targets[0]?.key || "shirt";
  }

  ["shirt", "shorts", "socks"].forEach((key) => {
    const row = imageColourRow(key);
    const visible = targets.some((target) => target.key === key);
    row.classList.toggle("hidden", !visible);
    row.classList.toggle("active", visible && imageColourState.activeTarget === key);
  });

  if (!hasImage) {
    setBadge(imageColourStatus, "Not used", "neutral");
    return;
  }

  setBadge(imageColourStatus, "Ready", "pass");

  renderImageColourPalette();
}

function resetImageColourAssistant({ clearFile = false } = {}) {
  if (imageColourState.objectUrl) URL.revokeObjectURL(imageColourState.objectUrl);
  imageColourState.objectUrl = "";
  imageColourState.fileName = "";
  imageColourState.imageLoaded = false;
  imageColourState.activeTarget = "shirt";
  imageColourState.palette = [];
  imageColourState.paletteExpanded = false;
  imageColourCanvas.width = 1;
  imageColourCanvas.height = 1;
  imageColourCanvas.getContext("2d")?.clearRect(0, 0, 1, 1);
  if (clearFile) imageColourFileInput.value = "";
  updateImageColourAssistantUi();
}

function drawImageForColourAssistant(image) {
  const maxWidth = 720;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  imageColourCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  imageColourCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = imageColourCanvas.getContext("2d");
  if (!context) return false;
  context.clearRect(0, 0, imageColourCanvas.width, imageColourCanvas.height);
  context.drawImage(image, 0, 0, imageColourCanvas.width, imageColourCanvas.height);
  return true;
}

function handleImageColourFileChange() {
  const file = imageColourFileInput.files?.[0];
  resetImageColourAssistant();
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  imageColourState.objectUrl = objectUrl;
  imageColourState.fileName = file.name;
  updateImageColourAssistantUi();
  const image = new Image();
  image.onload = () => {
    if (!drawImageForColourAssistant(image)) {
      resetImageColourAssistant({ clearFile: true });
      return;
    }

    imageColourState.imageLoaded = true;
    imageColourState.activeTarget = currentImageColourTargets()[0]?.key || "shirt";
    imageColourState.palette = buildImageColourPalette();
    imageColourState.paletteExpanded = false;
    imageColourInstruction.textContent = `Click the main ${imageColourState.activeTarget} colour in the image to apply it to the selected field.`;
    updateImageColourAssistantUi();
  };
  image.onerror = () => {
    resetImageColourAssistant({ clearFile: true });
  };
  image.src = objectUrl;
}

function handleImageColourCanvasClick(event) {
  if (!imageColourState.imageLoaded) return;
  const bounds = imageColourCanvas.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * imageColourCanvas.width;
  const y = ((event.clientY - bounds.top) / bounds.height) * imageColourCanvas.height;
  const suggestion = averageCanvasColour(x, y);
  if (suggestion) setImageColourSuggestion(imageColourState.activeTarget, suggestion);
}

function setBundleBadgeChampionStatus(isChampion) {
  bundleBadgeChampionToggle.classList.toggle("active", isChampion);
  bundleBadgeChampionToggle.setAttribute("aria-pressed", String(isChampion));
  bundleBadgeChampionToggle.setAttribute("aria-label", `Champion badge: ${isChampion ? "on" : "off"}`);
  bundleBadgeChampionToggle.title = isChampion ? "Champions badge selected" : "Mark this as a champions badge";
}

function currentBundleImageColourTargets() {
  const targets = [{ key: "shirt", label: "shirt", input: bundleMainColourShirtInput }];
  if (isBundlePieceKit()) {
    targets.push({ key: "shorts", label: "shorts", input: bundleMainColourShortsInput });
    if (bundleSocksSelect.value === "included") {
      targets.push({ key: "socks", label: "socks", input: bundleMainColourSocksInput });
    }
  }
  return targets;
}

function averageColourFromCanvas(canvas, x, y, radius = 10) {
  const context = canvas.getContext("2d");
  if (!context || !canvas.width || !canvas.height) return null;
  const left = Math.max(0, Math.floor(x - radius));
  const top = Math.max(0, Math.floor(y - radius));
  const right = Math.min(canvas.width, Math.ceil(x + radius));
  const bottom = Math.min(canvas.height, Math.ceil(y + radius));
  const pixels = context.getImageData(left, top, Math.max(1, right - left), Math.max(1, bottom - top)).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 120) continue;
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    count += 1;
  }
  return count ? mapRgbToImageColour([Math.round(red / count), Math.round(green / count), Math.round(blue / count)]) : null;
}

function buildPaletteFromCanvas(canvas) {
  const context = canvas.getContext("2d");
  if (!context || !canvas.width || !canvas.height) return [];
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const step = Math.max(1, Math.ceil(Math.sqrt((canvas.width * canvas.height) / 12000)));
  const buckets = new Map();
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const index = ((y * canvas.width) + x) * 4;
      if (pixels[index + 3] < 120) continue;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      if (red > 248 && green > 248 && blue > 248) continue;
      const key = [red, green, blue].map((value) => Math.min(255, Math.round(value / 32) * 32)).join(",");
      const bucket = buckets.get(key) || { count: 0, red: 0, green: 0, blue: 0 };
      bucket.count += 1;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      buckets.set(key, bucket);
    }
  }
  const grouped = new Map();
  [...buckets.values()].forEach((bucket) => {
    const rgb = [Math.round(bucket.red / bucket.count), Math.round(bucket.green / bucket.count), Math.round(bucket.blue / bucket.count)];
    const mapped = mapRgbToImageColour(rgb);
    const item = grouped.get(mapped.label) || { label: mapped.label, count: 0, red: 0, green: 0, blue: 0 };
    item.count += bucket.count;
    item.red += mapped.rgb[0] * bucket.count;
    item.green += mapped.rgb[1] * bucket.count;
    item.blue += mapped.rgb[2] * bucket.count;
    grouped.set(mapped.label, item);
  });
  return [...grouped.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)
    .map((item) => ({
      label: item.label,
      rgb: [Math.round(item.red / item.count), Math.round(item.green / item.count), Math.round(item.blue / item.count)]
    }));
}

function setActiveBundleImageColourTarget(key) {
  if (!currentBundleImageColourTargets().some((target) => target.key === key)) return;
  bundleImageColourState.activeTarget = key;
  bundleImageColourInstruction.textContent = `Click the main ${key} colour in the image to apply it to the selected field.`;
  updateBundleImageColourAssistantUi();
}

function setBundleImageColourSuggestion(key, suggestion) {
  const target = currentBundleImageColourTargets().find((item) => item.key === key);
  if (!target || !suggestion) return;
  target.input.value = appendImageColour(target.input.value, suggestion.label);
  updateBundleImageColourAssistantUi();
}

function renderBundleImageColourPalette() {
  bundleImageColourPaletteButtons.replaceChildren();
  bundleImageColourPalette.classList.toggle("hidden", !bundleImageColourState.palette.length);
  const hasMore = bundleImageColourState.palette.length > imageColourPreviewLimit;
  const colours = bundleImageColourState.palette.slice(0, bundleImageColourState.paletteExpanded ? bundleImageColourState.palette.length : imageColourPreviewLimit);
  colours.forEach((colour) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-button";
    const swatch = document.createElement("span");
    swatch.className = "palette-swatch";
    swatch.style.backgroundColor = rgbToHex(colour.rgb);
    const label = document.createElement("span");
    label.textContent = colour.label;
    button.append(swatch, label);
    button.addEventListener("click", () => setBundleImageColourSuggestion(bundleImageColourState.activeTarget, colour));
    bundleImageColourPaletteButtons.append(button);
  });
  bundleViewMoreImageColoursBtn.classList.toggle("hidden", !hasMore);
  bundleViewMoreImageColoursBtn.setAttribute("aria-expanded", String(bundleImageColourState.paletteExpanded));
  bundleViewMoreImageColoursBtn.textContent = bundleImageColourState.paletteExpanded ? "Show less" : `View more (${bundleImageColourState.palette.length - imageColourPreviewLimit})`;
}

function updateBundleImageColourAssistantUi() {
  const hasImage = bundleImageColourState.imageLoaded;
  bundleImageColourWorkspace.classList.toggle("hidden", !hasImage);
  bundleUseImageTitleBtn.disabled = !bundleImageColourState.fileName;
  bundleClearImageColourBtn.disabled = !hasImage;
  const targets = currentBundleImageColourTargets();
  if (!targets.some((target) => target.key === bundleImageColourState.activeTarget)) {
    bundleImageColourState.activeTarget = targets[0]?.key || "shirt";
  }
  ["shirt", "shorts", "socks"].forEach((key) => {
    const row = document.querySelector(`[data-bundle-colour-target="${key}"]`);
    const visible = targets.some((target) => target.key === key);
    row.classList.toggle("hidden", !visible);
    row.classList.toggle("active", visible && bundleImageColourState.activeTarget === key);
  });
  setBadge(bundleImageColourStatus, hasImage ? "Ready" : "Not used", hasImage ? "pass" : "neutral");
  if (hasImage) renderBundleImageColourPalette();
}

function resetBundleImageColourAssistant({ clearFile = false } = {}) {
  if (bundleImageColourState.objectUrl) URL.revokeObjectURL(bundleImageColourState.objectUrl);
  Object.assign(bundleImageColourState, { objectUrl: "", fileName: "", imageLoaded: false, activeTarget: "shirt", palette: [], paletteExpanded: false });
  bundleImageColourCanvas.width = 1;
  bundleImageColourCanvas.height = 1;
  bundleImageColourCanvas.getContext("2d")?.clearRect(0, 0, 1, 1);
  if (clearFile) bundleImageColourFileInput.value = "";
  updateBundleImageColourAssistantUi();
}

function handleBundleImageColourFileChange() {
  const file = bundleImageColourFileInput.files?.[0];
  resetBundleImageColourAssistant();
  if (!file || !file.type.startsWith("image/")) return;
  const objectUrl = URL.createObjectURL(file);
  bundleImageColourState.objectUrl = objectUrl;
  bundleImageColourState.fileName = file.name;
  updateBundleImageColourAssistantUi();
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, 720 / image.naturalWidth);
    bundleImageColourCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    bundleImageColourCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = bundleImageColourCanvas.getContext("2d");
    context.clearRect(0, 0, bundleImageColourCanvas.width, bundleImageColourCanvas.height);
    context.drawImage(image, 0, 0, bundleImageColourCanvas.width, bundleImageColourCanvas.height);
    bundleImageColourState.imageLoaded = true;
    bundleImageColourState.palette = buildPaletteFromCanvas(bundleImageColourCanvas);
    updateBundleImageColourAssistantUi();
  };
  image.onerror = () => resetBundleImageColourAssistant({ clearFile: true });
  image.src = objectUrl;
}

function handleBundleImageColourCanvasClick(event) {
  if (!bundleImageColourState.imageLoaded) return;
  const bounds = bundleImageColourCanvas.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * bundleImageColourCanvas.width;
  const y = ((event.clientY - bounds.top) / bounds.height) * bundleImageColourCanvas.height;
  const suggestion = averageColourFromCanvas(bundleImageColourCanvas, x, y);
  if (suggestion) setBundleImageColourSuggestion(bundleImageColourState.activeTarget, suggestion);
}

function useBundleImageTitle() {
  const title = productTitleFromImageName(bundleImageColourState.fileName || bundleImageColourFileInput.files?.[0]?.name);
  if (!title) return;
  bundleProductName.value = title;
  inferBundlePieceFromName();
}

function inferBundleAudienceFromName(name) {
  return [
    ["baby", "baby"], ["women's", "women"], ["womens", "women"], ["women", "women"],
    ["men's", "men"], ["mens", "men"], ["men", "men"], ["kids", "kids"], ["kid", "kids"], ["adult", "adult"]
  ].find(([keyword]) => hasStandaloneKeyword(name, keyword))?.[1] || "";
}

function inferBundleProductKindFromName(name) {
  const isLongSleeve = hasStandaloneKeyword(name, "long sleeve") || hasStandaloneKeyword(name, "long-sleeve");
  if (isLongSleeve) return hasStandaloneKeyword(name, "kit") ? "Long Sleeve Kit" : "Long Sleeve Shirt";
  if (hasStandaloneKeyword(name, "kit")) return "Kit";
  if (hasStandaloneKeyword(name, "shirt")) return "Shirt";
  return "";
}

function inferBundleKitTypeFromName(name) {
  return [
    ["special edition", "special_edition"], ["pre match", "pre_match"], ["goalkeeper", "goalkeeper"],
    ["training", "training"], ["fifth", "fifth"], ["fourth", "fourth"], ["third", "third"],
    ["away", "away"], ["home", "home"], ["retro", "retro"]
  ].find(([keyword]) => hasStandaloneKeyword(name, keyword))?.[1] || "";
}

function inferBundlePlayerPrintFromName(name) {
  const match = name.match(/(?:^|[^a-z])([A-Z]{2,}(?:\s+[A-Z]{2,})*)\s+(\d{1,2})(?=$|[^a-z0-9])/);
  return match ? { name: match[1].trim(), number: match[2] } : null;
}

function normalizedFactValue(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizedSizeRange(value) {
  return normalizedFactValue(value).replace(/[–—]/g, "-");
}

function inferBundlePieceFromName() {
  const name = bundleProductName.value.trim();
  if (!name) return;
  const team = findFootballTeam(name);
  if (team) bundleItemTheme.value = team.name;
  const season = inferSeasonFromProductName(name, team);
  if (season) bundleItemSeason.value = season;
  const audience = inferBundleAudienceFromName(name);
  if (audience) setEnhancedSelectValue(bundleAudienceSelect, audience);
  const kind = inferBundleProductKindFromName(name);
  if (kind) setEnhancedSelectValue(bundleProductSelect, kind);
  const kitType = inferBundleKitTypeFromName(name);
  if (kitType) setEnhancedSelectValue(bundleKitTypeSelect, kitType);
  if (hasStandaloneKeyword(name, "with socks")) setEnhancedSelectValue(bundleSocksSelect, "included");
  if (hasStandaloneKeyword(name, "no socks") || hasStandaloneKeyword(name, "without socks")) setEnhancedSelectValue(bundleSocksSelect, "unavailable");
  const print = inferBundlePlayerPrintFromName(name);
  if (print) {
    setEnhancedSelectValue(bundlePrintSelect, "pre_applied_player");
    bundlePrintName.value = print.name;
    bundlePrintNumber.value = print.number;
  }
  syncBundleItemControls();
}

function syncProductControlsFromFacts(facts) {
  productAudienceSelect.value = facts.audience || "kids";
  productKindSelect.value = facts.product_type === "full_kit" ? facts.sleeve_length === "long_sleeve" ? "Long Sleeve Kit" : "Kit" : facts.sleeve_length === "baby_suit" ? "Suit" : facts.sleeve_length === "long_sleeve" ? "Long Sleeve Shirt" : "Shirt";
  const supportedKitType = [...productKitTypeSelect.options].some((option) => option.value === facts.kit_type);
  productKitTypeSelect.value = supportedKitType ? facts.kit_type : "other";
  productOtherKitType.value = supportedKitType ? "" : facts.kit_type || "";
  productSocksSelect.value = facts.socks_status === "included" ? "included" : "unavailable";
  productPrintSelect.value = facts.listing_configuration || "plain_customisable";
  productPrintName.value = facts.pre_applied_name || "";
  productPrintNumber.value = facts.pre_applied_number || "";
  mainColourShirtInput.value = facts.main_colour_shirt || "";
  mainColourShortsInput.value = facts.main_colour_shorts || "";
  mainColourSocksInput.value = facts.main_colour_socks || "";
  badgeStatusSelect.value = facts.badge_status === "available" ? "available" : "unavailable";
  badgeLeagueInput.value = facts.badge_league || "";
  setBadgeChampionStatus(facts.badge_champion_status === "champion");
  syncProductSelectionFields();
}

function getBundleFacts() {
  const isGiftPack = bundleTypeSelect.value === "birthday_gift_pack_home_away_kids";
  return {
    ...defaultFacts,
    product_type: "bundle",
    bundle_type: bundleTypeSelect.value || "piece_bundle",
    bundle_name: bundleForm.elements.bundle_name.value.trim(),
    bundle_label: isGiftPack ? "KFK Birthday Gift Pack" : "Standard Bundle",
    gift_pack_returns_policy: isGiftPack ? "approved" : "",
    gift_pack_promotion_policy: isGiftPack ? "approved" : "",
    gift_pack_packaging_policy: isGiftPack ? "approved" : "",
    bundle_items_list: bundleItems.map((piece) => ({ ...piece })),
    visible_size_range: "Varies by Piece",
    size_profile: "bundle_mixed"
  };
}

function syncBundleTypeControls() {
  const isGiftPack = bundleTypeSelect.value === "birthday_gift_pack_home_away_kids";
  bundleForm.elements.bundle_label.value = isGiftPack ? "KFK Birthday Gift Pack" : "Standard Bundle";
  bundleTypeChoices.querySelectorAll("[data-bundle-type]").forEach((button) => {
    const active = button.dataset.bundleType === bundleTypeSelect.value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  syncBundleItemControls();
  refreshEnhancedSelects();
}

function applyDerivedSizeFacts(facts) {
  if (facts.audience === "women") {
    facts.visible_size_range = "Women sizes S–2XL";
    facts.size_profile = "women_s_2xl";
    return;
  }

  if (facts.audience === "baby") {
    facts.visible_size_range = "Baby sizes 9 and 12 (3–24 months)";
    facts.size_profile = "baby_9_12";
    return;
  }

  if (facts.audience === "adult") {
    facts.visible_size_range = "Adult sizes S-XXL";
    facts.size_profile = "adult_s_2xl";
    return;
  }

  if (facts.audience === "men") {
    facts.visible_size_range = "Men sizes S-XXL";
    facts.size_profile = "adult_s_2xl";
    return;
  }

  if (facts.audience === "kids") {
    facts.visible_size_range = "Kids sizes 16-28, suggested ages 3-13";
    facts.size_profile = "kids_16_28";
    return;
  }

  facts.visible_size_range = "";
  facts.size_profile = "unknown";
}

function applyAnotherValue(facts, fieldName) {
  if (facts[fieldName] !== "another") return;
  const customValue = facts[`${fieldName}_another`];
  facts[fieldName] = customValue || "unknown";
}

function splitBundleItems(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function syncBundleItemsInput() {
  bundleForm.elements.bundle_items.value = JSON.stringify(bundleItems);
}

function bundleRecipientLabelForPiece(piece) {
  const labels = {
    dad: "Dad",
    mum: "Mum",
    son: "Son",
    daughter: "Daughter",
    child: "Child",
    partner: "Partner",
    adult: "Adult",
    kid: "Kid",
    men: "Men",
    women: "Women"
  };
  if (piece.recipient_role === "none") return openingAudienceLabel(piece.audience) || "No recipient";
  if (piece.recipient_role === "other") return piece.recipient_label || "Other";
  return piece.recipient_label || labels[piece.recipient_role] || "Unassigned";
}

function isBundlePieceKit() {
  return bundleProductSelect.value === "Kit" || bundleProductSelect.value === "Long Sleeve Kit";
}

function bundlePieceFactsFromEditor() {
  const isKit = isBundlePieceKit();
  const isLongSleeve = bundleProductSelect.value === "Long Sleeve Kit" || bundleProductSelect.value === "Long Sleeve Shirt";
  const isSuit = bundleProductSelect.value === "Suit";
  const withSocks = isKit && bundleSocksSelect.value === "included";
  const kitType = bundleKitTypeSelect.value === "other"
    ? bundleItemAnother.value.trim()
    : bundleKitTypeSelect.value;
  const facts = {
    piece_id: editingBundlePieceId || `piece-${nextBundlePieceId}`,
    recipient_role: bundleRecipientSelect.value,
    recipient_label: bundleRecipientLabel.value.trim(),
    audience: bundleAudienceSelect.value,
    product_name: bundleProductName.value.trim(),
    team: bundleItemTheme.value.trim(),
    season: bundleItemSeason.value.trim(),
    badge_status: bundleBadgeStatusSelect.value,
    badge_league: bundleBadgeStatusSelect.value === "available" ? bundleBadgeLeague.value.trim() : "",
    badge_champion_status: bundleBadgeStatusSelect.value === "available" && bundleBadgeChampionToggle.classList.contains("active") ? "champion" : "not_champion",
    product_kind: bundleProductSelect.value,
    product_type: isKit ? "full_kit" : "shirt_only",
    kit_type: kitType,
    sleeve_length: isSuit ? "baby_suit" : isLongSleeve ? "long_sleeve" : "short_sleeve",
    socks_status: isKit ? bundleSocksSelect.value : "not_applicable",
    included_items: !isKit ? "shirt_only" : withSocks ? "shirt_shorts_and_socks" : "shirt_and_shorts",
    listing_configuration: bundlePrintSelect.value,
    personalisation_status: bundlePersonalisationSelect.value,
    print_price_included: bundlePrintSelect.value === "pre_applied_player" ? "yes" : "not_applicable",
    pre_applied_name: bundlePrintSelect.value === "pre_applied_player" ? bundlePrintName.value.trim() : "",
    pre_applied_number: bundlePrintSelect.value === "pre_applied_player" ? bundlePrintNumber.value.trim() : "",
    size_range_mode: bundleSizeRangeModeSelect.value,
    main_colour_shirt: bundleMainColourShirtInput.value.trim(),
    main_colour_shorts: isKit ? bundleMainColourShortsInput.value.trim() : "",
    main_colour_socks: withSocks ? bundleMainColourSocksInput.value.trim() : "",
    ...fixedKfkFacts
  };
  applyDerivedSizeFacts(facts);
  if (facts.size_range_mode === "custom") {
    facts.visible_size_range = bundleVisibleSizeRange.value.trim();
    facts.size_profile = "custom_pending_review";
  }
  return facts;
}

function expectedAudienceForRecipient(recipientRole) {
  return {
    dad: "men",
    mum: "women",
    men: "men",
    women: "women",
    son: "kids",
    daughter: "kids",
    child: "kids",
    kid: "kids",
    adult: "adult"
  }[recipientRole] || "";
}

function validateBirthdayGiftPackPiece(piece, otherPieces = []) {
  const errors = [];
  if (piece.audience !== "kids") errors.push("KFK Birthday Gift Pack Pieces must use the Kids audience.");
  if (piece.product_type !== "full_kit") errors.push("KFK Birthday Gift Pack Pieces must be short-sleeve Kits.");
  if (piece.sleeve_length !== "short_sleeve") errors.push("KFK Birthday Gift Pack Pieces cannot use long sleeves or baby suits.");
  if (piece.size_profile !== "kids_16_28" || piece.size_range_mode !== "standard") {
    errors.push("KFK Birthday Gift Pack Pieces must use the standard Kids 16–28 size range.");
  }
  if (otherPieces.some((item) => item.kit_type === piece.kit_type)) {
    errors.push("Choose a different kit type for each Birthday Gift Pack Piece.");
  }
  if (otherPieces.some((item) => item.team.trim().toLowerCase() !== piece.team.trim().toLowerCase())) {
    errors.push("All Birthday Gift Pack Pieces must use the same team.");
  }
  if (otherPieces.some((item) => item.season.trim().toLowerCase() !== piece.season.trim().toLowerCase())) {
    errors.push("All Birthday Gift Pack Pieces must use the same season.");
  }
  return errors;
}

function validateBundlePiece(piece) {
  const errors = [];
  if (!piece.recipient_role) errors.push("Choose who this Piece is for. Use None when no recipient applies.");
  if (piece.recipient_role === "other" && !piece.recipient_label) errors.push("Enter a recipient label for Other.");
  if (!piece.audience) errors.push("Choose an audience.");
  const expectedAudience = expectedAudienceForRecipient(piece.recipient_role);
  if (expectedAudience && piece.audience && piece.audience !== expectedAudience) {
    errors.push(`${bundleRecipientLabelForPiece(piece)} must use the ${titleCaseToken(expectedAudience)} audience.`);
  }
  if (!piece.product_name) errors.push("Product name is required.");
  const titleAudience = inferBundleAudienceFromName(piece.product_name);
  if (titleAudience && piece.audience && titleAudience !== piece.audience) {
    errors.push(`Product name indicates ${titleCaseToken(titleAudience)}, but the Piece audience is ${titleCaseToken(piece.audience)}.`);
  }
  const titleProductKind = inferBundleProductKindFromName(piece.product_name);
  const titleIsKit = ["Kit", "Long Sleeve Kit"].includes(titleProductKind);
  const titleIsShirt = ["Shirt", "Long Sleeve Shirt"].includes(titleProductKind);
  if (titleIsKit && piece.product_type !== "full_kit") errors.push("Product name indicates a Kit, but the Piece is configured as a Shirt.");
  if (titleIsShirt && piece.product_type !== "shirt_only") errors.push("Product name indicates a Shirt, but the Piece is configured as a Kit.");
  if (titleProductKind && piece.product_kind && titleProductKind !== piece.product_kind) {
    errors.push(`Product name indicates ${titleProductKind}, but the Piece is configured as ${piece.product_kind}.`);
  }
  if (!piece.team) errors.push("Team is required.");
  if (!piece.season) errors.push("Season is required.");
  if (!piece.kit_type) errors.push("Enter the other kit type.");
  const titleTeam = findFootballTeam(piece.product_name);
  const selectedTeam = findFootballTeam(piece.team);
  const selectedTeamName = selectedTeam?.name || piece.team;
  if (titleTeam && piece.team && normalizedFactValue(titleTeam.name) !== normalizedFactValue(selectedTeamName)) {
    errors.push(`Product name indicates ${titleTeam.name}, but the Team field is ${piece.team}.`);
  }
  const titleSeason = inferSeasonFromProductName(piece.product_name, titleTeam);
  if (titleSeason && piece.season && normalizedFactValue(titleSeason) !== normalizedFactValue(piece.season)) {
    errors.push(`Product name indicates season ${titleSeason}, but the Season field is ${piece.season}.`);
  }
  const titleKitType = inferBundleKitTypeFromName(piece.product_name);
  if (titleKitType && piece.kit_type && titleKitType !== piece.kit_type) {
    errors.push(`Product name indicates ${titleCaseToken(titleKitType)} kit type, but the Piece uses ${titleCaseToken(piece.kit_type)}.`);
  }
  if (piece.badge_status === "available" && !piece.badge_league) errors.push("Badge league is required when the badge is available.");
  const titlePlayerPrint = inferBundlePlayerPrintFromName(piece.product_name);
  if (titlePlayerPrint && piece.listing_configuration !== "pre_applied_player") {
    errors.push(`Product name includes ${titlePlayerPrint.name} ${titlePlayerPrint.number}, but the Piece is configured as No Printed.`);
  }
  if (titlePlayerPrint && piece.listing_configuration === "pre_applied_player" && (
    normalizedFactValue(titlePlayerPrint.name) !== normalizedFactValue(piece.pre_applied_name)
    || String(titlePlayerPrint.number) !== String(piece.pre_applied_number)
  )) {
    errors.push(`Product name includes ${titlePlayerPrint.name} ${titlePlayerPrint.number}, but the configured player print is ${piece.pre_applied_name || "missing"} ${piece.pre_applied_number || "missing"}.`);
  }
  if (piece.listing_configuration === "pre_applied_player" && !piece.pre_applied_name) errors.push("Player name is required for a Printed Piece.");
  if (piece.listing_configuration === "pre_applied_player" && !piece.pre_applied_number) errors.push("Player number is required for a Printed Piece.");
  if (piece.listing_configuration === "pre_applied_player" && piece.personalisation_status !== "unavailable") errors.push("A fixed-player Piece cannot offer additional personalisation.");
  if (piece.listing_configuration === "pre_applied_player" && piece.print_price_included !== "yes") errors.push("A fixed-player Piece must include the player print in its configured price.");
  if (piece.listing_configuration === "plain_customisable" && piece.personalisation_status !== "available") errors.push("A No Printed Piece must offer name-and-number personalisation.");
  if (piece.listing_configuration === "plain_customisable" && (piece.pre_applied_name || piece.pre_applied_number)) errors.push("A No Printed Piece cannot contain a fixed player name or number.");
  if (piece.listing_configuration === "plain_customisable" && piece.print_price_included !== "not_applicable") errors.push("A No Printed Piece cannot include a fixed-player print price.");
  if (!piece.personalisation_status) errors.push("Choose whether personalisation is available for this Piece.");
  if (!piece.visible_size_range) errors.push("Visible size range is required.");
  if (piece.size_range_mode === "custom" && piece.size_profile !== "custom_pending_review") errors.push("Custom size range must use the custom review profile.");
  if (piece.size_range_mode === "standard" && piece.audience) {
    const expectedSizeFacts = standardBundleSizeFacts(piece.audience);
    if (piece.size_profile !== expectedSizeFacts.size_profile || normalizedSizeRange(piece.visible_size_range) !== normalizedSizeRange(expectedSizeFacts.visible_size_range)) {
      errors.push(`Standard size range does not match the ${titleCaseToken(piece.audience)} audience.`);
    }
  }
  if (piece.product_type === "shirt_only" && piece.socks_status !== "not_applicable") errors.push("A Shirt cannot include socks.");
  if (piece.product_type === "full_kit" && !["included", "unavailable"].includes(piece.socks_status)) errors.push("A Kit must use With Socks or No Socks.");
  const expectedIncludedItems = piece.product_type === "shirt_only"
    ? "shirt_only"
    : piece.socks_status === "included" ? "shirt_shorts_and_socks" : "shirt_and_shorts";
  if (piece.included_items !== expectedIncludedItems) errors.push("Piece contents do not match the selected product and socks options.");
  if (!piece.main_colour_shirt) errors.push("Main shirt colour is required.");
  if (piece.product_type === "full_kit" && !piece.main_colour_shorts) errors.push("Main shorts colour is required for a Kit.");
  if (piece.socks_status === "included" && !piece.main_colour_socks) errors.push("Main socks colour is required when socks are included.");
  return errors;
}

function bundlePieceValidationErrors(piece, otherPieces = []) {
  const errors = validateBundlePiece(piece);
  if (bundleTypeSelect.value === "birthday_gift_pack_home_away_kids") {
    errors.push(...validateBirthdayGiftPackPiece(piece, otherPieces));
  }
  return [...new Set(errors)];
}

function showBundlePieceErrors(errors) {
  bundlePieceValidation.classList.toggle("hidden", !errors.length);
  bundlePieceValidation.innerHTML = errors.length
    ? `<strong>Complete this Piece:</strong><ul>${errors.map((error) => `<li>${esc(error)}</li>`).join("")}</ul>`
    : "";
}

function renderBundleItemsList() {
  syncBundleItemsInput();
  bundleItemsSummaryEl.textContent = `Pieces added: ${bundleItems.length} / ${maxBundlePieces}`;
  bundleItemsList.innerHTML = "";

  if (!bundleItems.length) {
    const emptyState = document.createElement("span");
    emptyState.className = "bundle-items-empty";
    emptyState.textContent = "No Pieces added yet. Complete the Piece editor above and select Add Piece.";
    bundleItemsList.append(emptyState);
    return;
  }

  bundleItems.forEach((piece, index) => {
    const card = document.createElement("article");
    card.className = "bundle-piece-card";
    const pieceErrors = bundlePieceValidationErrors(piece, bundleItems.filter((item) => item.piece_id !== piece.piece_id));
    card.classList.toggle("invalid", pieceErrors.length > 0);
    const recipient = bundleRecipientLabelForPiece(piece);
    const socksLabel = piece.product_type === "full_kit"
      ? piece.socks_status === "included" ? "With Socks" : "No Socks"
      : "Shirt only";
    const printLabel = piece.listing_configuration === "pre_applied_player"
      ? `${displayName(piece.pre_applied_name)} ${piece.pre_applied_number}`
      : "No Printed";
    const personalisationLabel = piece.personalisation_status === "available"
      ? "Personalisation available"
      : "Personalisation unavailable";
    const sizeLabel = piece.size_range_mode === "custom"
      ? `${piece.visible_size_range} (custom)`
      : piece.visible_size_range;
    const pieceStatus = pieceErrors.length
      ? '<span class="badge block">Needs fix</span>'
      : piece.size_range_mode === "custom"
      ? '<span class="badge review">Size review</span>'
      : '<span class="badge pass">Ready</span>';
    const pieceErrorSummary = pieceErrors.length
      ? `<div class="bundle-piece-card-errors"><strong>Fix this Piece:</strong><ul>${pieceErrors.map((error) => `<li>${esc(error)}</li>`).join("")}</ul></div>`
      : "";
    const colours = [
      `Shirt: ${piece.main_colour_shirt}`,
      piece.main_colour_shorts ? `Shorts: ${piece.main_colour_shorts}` : "",
      piece.main_colour_socks ? `Socks: ${piece.main_colour_socks}` : ""
    ].filter(Boolean).join(" · ");

    card.innerHTML = [
      `<div class="bundle-piece-card-header"><h3 class="bundle-piece-card-title">Piece ${index + 1} — ${esc(recipient)}</h3>${pieceStatus}</div>`,
      `<p class="bundle-piece-card-product">${esc(piece.product_name)}</p>`,
      `<p class="bundle-piece-card-meta">${esc(openingAudienceLabel(piece.audience) || piece.audience)} · ${esc(piece.product_kind)} · ${esc(titleCaseToken(piece.kit_type))} · ${esc(socksLabel)} · ${esc(printLabel)}</p>`,
      `<p class="bundle-piece-card-meta">${esc(personalisationLabel)} · Sizes: ${esc(sizeLabel)}</p>`,
      `<p class="bundle-piece-card-colours">${esc(colours)}</p>`,
      pieceErrorSummary
    ].join("");

    const actions = document.createElement("div");
    actions.className = "bundle-piece-card-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => loadBundlePieceIntoEditor(piece.piece_id));
    const duplicateButton = document.createElement("button");
    duplicateButton.type = "button";
    duplicateButton.textContent = "Duplicate";
    duplicateButton.disabled = bundleItems.length >= maxBundlePieces;
    duplicateButton.addEventListener("click", () => {
      if (bundleItems.length >= maxBundlePieces) {
        showBundlePieceErrors([`A Bundle can contain up to ${maxBundlePieces} Pieces.`]);
        return;
      }
      const duplicatePiece = { ...piece, piece_id: `piece-${nextBundlePieceId}` };
      const duplicateErrors = bundlePieceValidationErrors(duplicatePiece, bundleItems);
      if (duplicateErrors.length) {
        showBundlePieceErrors(duplicateErrors);
        bundlePieceValidation.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      bundleItems.push(duplicatePiece);
      nextBundlePieceId += 1;
      variantOffset = 0;
      renderBundleItemsList();
      syncBundleItemControls();
    });
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger-action";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      bundleItems = bundleItems.filter((item) => item.piece_id !== piece.piece_id);
      if (editingBundlePieceId === piece.piece_id) resetBundlePieceEditor();
      variantOffset = 0;
      renderBundleItemsList();
    });
    actions.append(editButton, duplicateButton, removeButton);
    card.append(actions);
    bundleItemsList.append(card);
  });
}

function addSelectedBundleItem() {
  const piece = bundlePieceFactsFromEditor();
  const existingIndex = bundleItems.findIndex((item) => item.piece_id === piece.piece_id);
  const otherPieces = bundleItems.filter((item) => item.piece_id !== piece.piece_id);
  const errors = bundlePieceValidationErrors(piece, otherPieces);
  if (existingIndex < 0 && bundleItems.length >= maxBundlePieces) {
    errors.push(`A Bundle can contain up to ${maxBundlePieces} Pieces.`);
  }
  showBundlePieceErrors(errors);
  if (errors.length) return;

  if (existingIndex >= 0) bundleItems[existingIndex] = piece;
  else {
    bundleItems.push(piece);
    nextBundlePieceId += 1;
  }
  variantOffset = 0;
  renderBundleItemsList();
  resetBundlePieceEditor();
}

function standardBundleSizeFacts(audience) {
  const facts = { audience };
  applyDerivedSizeFacts(facts);
  return facts;
}

function syncBundleSizeControls() {
  const usesCustomRange = bundleCustomSizeRangeToggle.checked;
  bundleSizeRangeModeSelect.value = usesCustomRange ? "custom" : "standard";
  bundleCustomSizeRangeField.classList.toggle("hidden", !usesCustomRange);
  const standardRange = standardBundleSizeFacts(bundleAudienceSelect.value).visible_size_range || "";
  bundleStandardSizeSummary.textContent = usesCustomRange
    ? "Custom size range enabled"
    : standardRange ? `Auto size: ${standardRange}` : "Choose an audience to derive the standard range.";
  if (!usesCustomRange) {
    bundleVisibleSizeRange.value = standardRange;
  }
}

function setBundleSelectOptions(select, allowedValues = null) {
  [...select.options].forEach((option) => {
    if (option.dataset.customOption === "true") return;
    const allowed = !allowedValues || allowedValues.has(option.value);
    option.hidden = !allowed;
    option.disabled = !allowed;
  });
}

function syncBirthdayGiftPackEditorConstraints() {
  const isGiftPack = bundleTypeSelect.value === "birthday_gift_pack_home_away_kids";
  const childRecipients = new Set(["son", "daughter", "child", "kid", "none", "other"]);

  setBundleSelectOptions(bundleRecipientSelect, isGiftPack ? childRecipients : null);
  setBundleSelectOptions(bundleAudienceSelect, isGiftPack ? new Set(["kids"]) : null);
  setBundleSelectOptions(bundleProductSelect, isGiftPack ? new Set(["Kit"]) : null);

  bundleAdvancedOptions.classList.toggle("hidden", isGiftPack);
  bundleCustomSizeRangeToggle.disabled = isGiftPack;
  if (isGiftPack) {
    if (!childRecipients.has(bundleRecipientSelect.value)) setEnhancedSelectValue(bundleRecipientSelect, "none");
    setEnhancedSelectValue(bundleAudienceSelect, "kids");
    setEnhancedSelectValue(bundleProductSelect, "Kit");
    bundleCustomSizeRangeToggle.checked = false;
    bundleAdvancedOptions.removeAttribute("open");
  }

  const usedKitTypes = new Set(bundleItems
    .filter((item) => item.piece_id !== editingBundlePieceId)
    .map((item) => item.kit_type));
  [...bundleKitTypeSelect.options].forEach((option) => {
    if (option.dataset.customOption === "true") return;
    const unavailable = isGiftPack && usedKitTypes.has(option.value);
    option.hidden = unavailable;
    option.disabled = unavailable;
  });
  const selectedKitType = bundleKitTypeSelect.selectedOptions[0];
  if (selectedKitType?.disabled) {
    const firstAvailable = [...bundleKitTypeSelect.options].find((option) => !option.disabled && option.dataset.customOption !== "true");
    if (firstAvailable) setEnhancedSelectValue(bundleKitTypeSelect, firstAvailable.value);
  }
}

function syncBundleItemControls() {
  syncBirthdayGiftPackEditorConstraints();
  let isKit = isBundlePieceKit();
  let isSuit = bundleProductSelect.value === "Suit";
  if (bundleAudienceSelect.value === "baby" && !isSuit) {
    setEnhancedSelectValue(bundleProductSelect, "Suit");
    isKit = false;
    isSuit = true;
  }
  const usesSocks = isKit;
  const usesPrint = bundlePrintSelect.value === "pre_applied_player";
  const usesOtherKitType = bundleKitTypeSelect.value === "other";

  if (isSuit) {
    setEnhancedSelectValue(bundleAudienceSelect, "baby");
  }
  const bundleAdultOption = bundleAudienceSelect.querySelector('option[value="adult"]');
  if (!bundleAdultOption.hidden) bundleAdultOption.disabled = !isKit;
  bundleAdultOption.textContent = isKit ? "Adult" : "Adult (kits only)";
  bundleSocksSelect.classList.toggle("hidden", !usesSocks);
  bundlePrintFields.classList.toggle("visible", usesPrint);
  bundlePrintName.required = usesPrint;
  bundlePrintNumber.required = usesPrint;
  bundleItemAnother.classList.toggle("visible", usesOtherKitType);
  bundleItemAnother.required = usesOtherKitType;
  if (!usesOtherKitType) bundleItemAnother.value = "";
  if (!usesPrint) {
    bundlePrintName.value = "";
    bundlePrintNumber.value = "";
  }
  setEnhancedSelectValue(bundlePersonalisationSelect, usesPrint ? "unavailable" : "available");
  bundlePersonalisationSelect.disabled = true;

  bundleMainColourShortsInput.disabled = !isKit;
  bundleMainColourShortsField.classList.toggle("hidden", !isKit);
  if (!isKit) bundleMainColourShortsInput.value = "";
  const usesSocksColour = isKit && bundleSocksSelect.value === "included";
  bundleMainColourSocksInput.disabled = !usesSocksColour;
  bundleMainColourSocksField.classList.toggle("hidden", !usesSocksColour);
  if (!usesSocksColour) bundleMainColourSocksInput.value = "";

  const badgeAvailable = bundleBadgeStatusSelect.value === "available";
  bundleBadgeLeagueField.classList.toggle("hidden", !badgeAvailable);
  if (!badgeAvailable) {
    bundleBadgeLeague.value = "";
    setBundleBadgeChampionStatus(false);
  }

  const customRecipient = bundleRecipientSelect.value === "other";
  bundleRecipientLabel.required = customRecipient;
  bundleRecipientLabelField.classList.toggle("hidden", !customRecipient);
  bundleRecipientLabelField.classList.toggle("required-field", customRecipient);
  if (!customRecipient) bundleRecipientLabel.value = "";

  syncBundleSizeControls();
  updateBundleImageColourAssistantUi();
  refreshEnhancedSelects();
}

function resetBundlePieceEditor() {
  editingBundlePieceId = null;
  [bundleRecipientLabel, bundleProductName, bundleItemTheme, bundleItemSeason, bundleBadgeLeague, bundleItemAnother, bundlePrintName, bundlePrintNumber, bundleVisibleSizeRange, bundleMainColourShirtInput, bundleMainColourShortsInput, bundleMainColourSocksInput]
    .forEach((field) => { field.value = ""; });
  setEnhancedSelectValue(bundleRecipientSelect, "");
  setEnhancedSelectValue(bundleAudienceSelect, "");
  setEnhancedSelectValue(bundleBadgeStatusSelect, "unavailable");
  setEnhancedSelectValue(bundleProductSelect, "Kit");
  setEnhancedSelectValue(bundleKitTypeSelect, "home");
  setEnhancedSelectValue(bundleSocksSelect, "unavailable");
  setEnhancedSelectValue(bundlePrintSelect, "plain_customisable");
  setEnhancedSelectValue(bundlePersonalisationSelect, "available");
  bundleCustomSizeRangeToggle.checked = false;
  bundleSizeRangeModeSelect.value = "standard";
  setBundleBadgeChampionStatus(false);
  resetBundleImageColourAssistant({ clearFile: true });
  showBundlePieceErrors([]);
  setBadge(bundlePieceEditorBadge, "New piece", "neutral");
  addBundleItemBtn.textContent = "Add Piece";
  cancelBundlePieceEditBtn.classList.add("hidden");
  syncBundleItemControls();
}

function loadBundlePieceIntoEditor(pieceId) {
  const piece = bundleItems.find((item) => item.piece_id === pieceId);
  if (!piece) return;
  editingBundlePieceId = piece.piece_id;
  setEnhancedSelectValue(bundleRecipientSelect, piece.recipient_role);
  bundleRecipientLabel.value = piece.recipient_label || "";
  setEnhancedSelectValue(bundleAudienceSelect, piece.audience);
  bundleProductName.value = piece.product_name;
  bundleItemTheme.value = piece.team;
  bundleItemSeason.value = piece.season;
  setEnhancedSelectValue(bundleBadgeStatusSelect, piece.badge_status);
  bundleBadgeLeague.value = piece.badge_league || "";
  setBundleBadgeChampionStatus(piece.badge_champion_status === "champion");
  setEnhancedSelectValue(bundleProductSelect, piece.product_kind);
  const knownKitType = [...bundleKitTypeSelect.options].some((option) => option.value === piece.kit_type);
  setEnhancedSelectValue(bundleKitTypeSelect, knownKitType ? piece.kit_type : "other");
  bundleItemAnother.value = knownKitType ? "" : piece.kit_type;
  setEnhancedSelectValue(bundleSocksSelect, piece.socks_status === "included" ? "included" : "unavailable");
  setEnhancedSelectValue(bundlePrintSelect, piece.listing_configuration);
  setEnhancedSelectValue(bundlePersonalisationSelect, piece.personalisation_status || (piece.listing_configuration === "pre_applied_player" ? "unavailable" : "available"));
  bundlePrintName.value = piece.pre_applied_name || "";
  bundlePrintNumber.value = piece.pre_applied_number || "";
  bundleCustomSizeRangeToggle.checked = piece.size_range_mode === "custom";
  bundleSizeRangeModeSelect.value = piece.size_range_mode || "standard";
  bundleVisibleSizeRange.value = piece.visible_size_range || "";
  bundleMainColourShirtInput.value = piece.main_colour_shirt || "";
  bundleMainColourShortsInput.value = piece.main_colour_shorts || "";
  bundleMainColourSocksInput.value = piece.main_colour_socks || "";
  resetBundleImageColourAssistant({ clearFile: true });
  showBundlePieceErrors([]);
  setBadge(bundlePieceEditorBadge, `Editing ${bundleRecipientLabelForPiece(piece)}`, "review");
  addBundleItemBtn.textContent = "Save Piece";
  cancelBundlePieceEditBtn.classList.remove("hidden");
  syncBundleItemControls();
  bundlePieceEditorBadge.scrollIntoView({ behavior: "smooth", block: "center" });
}

function productTitleFromImageName(fileName) {
  const stem = String(fileName || "").replace(/\.[^.]+$/, "");
  const cleaned = stem
    .replace(/(^|[^a-z0-9])(20\d{2}|2\d)[_-](\d{2})(?=$|[^a-z0-9])/gi, "$1$2/$3")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^kfk\b\s*/i, "")
    .trim();
  const matchedTeam = findFootballTeam(cleaned);
  const standardSeasonMatch = cleaned.match(/\b(20\d{2}|2\d)\/(\d{2})\b/);
  const nationalYearMatches = matchedTeam?.team_type === "national"
    ? [...cleaned.matchAll(/\b(20\d{2})\b/g)]
    : [];
  const seasonMatch = standardSeasonMatch || nationalYearMatches.at(-1) || null;
  const socksMatch = cleaned.match(/\bwith\s+socks\b/i);

  if (!seasonMatch || seasonMatch.index === undefined) {
    const titleWithoutSeason = socksMatch
      ? cleaned.slice(0, socksMatch.index).trim()
      : cleaned;
    return socksMatch ? `${titleWithoutSeason} (With Socks)` : titleWithoutSeason;
  }

  const seasonEnd = seasonMatch.index + seasonMatch[0].length;
  const season = standardSeasonMatch
    ? standardSeasonMatch[1].length === 2
      ? `20${standardSeasonMatch[1]}/${standardSeasonMatch[2]}`
      : `${standardSeasonMatch[1]}/${standardSeasonMatch[2]}`
    : seasonMatch[1];
  const title = `${cleaned.slice(0, seasonMatch.index)}${season}`.trim();
  const afterSeason = cleaned.slice(seasonEnd);
  const playerPrintMatch = afterSeason.match(/\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\s+(\d{1,2})\b/);
  const playerPrint = playerPrintMatch ? ` ${playerPrintMatch[1]} ${playerPrintMatch[2]}` : "";
  return /\bwith\s+socks\b/i.test(afterSeason)
    ? `${title}${playerPrint} (With Socks)`
    : `${title}${playerPrint}`;
}

function useImageTitle() {
  const title = productTitleFromImageName(imageColourState.fileName || imageColourFileInput.files?.[0]?.name);
  if (!title) return;
  productNameInput.value = title;
  productNameInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function usesBundleSocks() {
  return isBundlePieceKit();
}

function normaliseAudience(facts) {
  const value = String(facts.audience || "").trim().toLowerCase();
  const menAliases = new Set(["men", "mens", "men's", "man", "male"]);
  const adultAliases = new Set(["adult", "adults"]);
  const womenAliases = new Set(["women", "womens", "women's", "woman", "female", "ladies"]);
  const babyAliases = new Set(["baby", "infant", "toddler"]);
  const kidsAliases = new Set(["kids", "kid", "children", "child", "youth", "junior", "boys", "girls"]);

  if (womenAliases.has(value)) {
    facts.audience = "women";
    return;
  }

  if (babyAliases.has(value)) {
    facts.audience = "baby";
    return;
  }

  if (menAliases.has(value)) {
    facts.audience = "men";
    return;
  }

  if (adultAliases.has(value)) {
    facts.audience = "adult";
    return;
  }

  if (kidsAliases.has(value)) {
    facts.audience = "kids";
  }
}

function normaliseProductType(facts) {
  const value = String(facts.product_type || "").trim().toLowerCase();
  if (["shirt", "shirt only", "shirt-only", "football shirt"].includes(value)) {
    facts.product_type = "shirt_only";
  }
}

function applyProductTypeRules(facts) {
  if (facts.product_type !== "shirt_only") return;
  facts.included_items = "shirt_only";
  facts.socks_status = "not_applicable";
}

function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const descriptionDashPattern = /[-‐‑‒–—―−]/g;
const descriptionDashCheckPattern = /[-‐‑‒–—―−]/;

function removeDashesFromText(value) {
  return String(value || "")
    .replace(descriptionDashPattern, " ")
    .replace(/[ \t]{2,}/g, " ");
}

function removeDescriptionDashes(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="description-dash-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#description-dash-root");
  const walker = doc.createTreeWalker(root, 4);
  const textNodes = [];

  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    node.textContent = removeDashesFromText(node.textContent);
  });

  return root.innerHTML;
}

function titleCaseToken(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shirtLabel(facts) {
  if (facts.sleeve_length === "baby_suit") return "baby suit";
  if (facts.sleeve_length === "long_sleeve") return "long-sleeve";
  if (facts.sleeve_length === "short_sleeve") return "short-sleeve";
  if (facts.sleeve_length && facts.sleeve_length !== "unknown") {
    return facts.sleeve_length.replaceAll("_", "-").toLowerCase();
  }
  return "football";
}

function sleeveLengthLabel(facts) {
  if (facts.sleeve_length === "short_sleeve") return "Short sleeve";
  if (facts.sleeve_length === "long_sleeve") return "Long sleeve";
  return "";
}

function productItemLabel(facts) {
  if (facts.sleeve_length === "baby_suit") return "baby suit";
  if (facts.sleeve_length === "long_sleeve") return "long-sleeve shirt";
  return "football shirt";
}

function sentenceStart(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function displayName(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text === text.toUpperCase()) {
    return text.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }
  return text;
}

function displayDesignDetail(value) {
  return String(value || "")
    .replace(/\s*(shown|seen|confirmed)\s+in\s+the\s+(approved|verified|checked)?\s*product\s+image\.?/i, "")
    .replace(/\s*based\s+on\s+the\s+(approved|verified|checked)?\s*product\s+image\.?/i, "")
    .trim();
}

function descriptionProductName(value) {
  return String(value || "")
    .replace(/\s*\(\s*with\s+socks?\s*\)/gi, "")
    .replace(/\s+with\s+socks?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(list, facts, salt = 0) {
  const seed = [
    facts.product_name,
    facts.team,
    facts.season,
    facts.kit_type,
    facts.included_items,
    facts.socks_status,
    facts.listing_configuration
  ].join("|");
  const base = stableHash(seed || "kfk");
  return list[(base + variantOffset + salt) % list.length];
}

function pickBranchVariant(branch, facts) {
  const branchConfig = templateLibrary.branches[branch];
  if (!branchConfig) return null;
  return pick(branchConfig.variants, facts, 1);
}

function stableHash(text) {
  return String(text).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function titleCasePhrase(value) {
  return String(value || "").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function openingAudienceLabel(value) {
  const labels = {
    kids: "Kids",
    men: "Men",
    adult: "Adult",
    women: "Women",
    baby: "Baby"
  };
  return labels[value] || "";
}

function interpolate(template, facts, { titleCaseProductLabels = false } = {}) {
  const sleeveLabel = titleCaseProductLabels ? titleCasePhrase(shirtLabel(facts)) : shirtLabel(facts);
  const productItem = titleCaseProductLabels ? titleCasePhrase(productItemLabel(facts)) : productItemLabel(facts);

  return template
    .replaceAll("{product_name}", esc(descriptionProductName(facts.product_name)))
    .replaceAll("{team}", esc(facts.team))
    .replaceAll("{season}", esc(facts.season))
    .replaceAll("{kit_type_label}", esc(titleCaseToken(facts.kit_type)))
    .replaceAll("{sleeve_label}", esc(sleeveLabel))
    .replaceAll("{product_item_label}", esc(productItem))
    .replaceAll("{sock_phrase}", facts.socks_status === "included" ? " and socks" : "")
    .replaceAll("{player_name}", esc(displayName(facts.pre_applied_name)))
    .replaceAll("{player_number}", esc(facts.pre_applied_number))
    .replaceAll("{bundle_name}", esc(facts.bundle_name))
    .replaceAll("{bundle_theme}", esc(facts.bundle_theme))
    .replaceAll("{audience_label}", esc(audienceLabel(facts.audience)))
    .replaceAll("{audience_opening_label}", esc(openingAudienceLabel(facts.audience)))
    .replaceAll("{bundle_items_summary}", esc(bundleItemsSummary(facts.bundle_items_list)))
    .replaceAll("{bundle_personalisation_line}", bundlePersonalisationLine(facts));
}

function audienceLabel(value) {
  if (value === "kids") return "kids";
  if (value === "men") return "men";
  if (value === "adult") return "adult buyers";
  if (value === "women") return "women";
  if (value === "baby") return "babies";
  if (value === "family") return "families";
  return value || "buyers";
}

function bundleItemsSummary(items) {
  if (!items || !items.length) return "";
  const formattedItems = items.map(formatBundleItemForOutput);
  if (formattedItems.length === 1) return formattedItems[0];
  if (formattedItems.length === 2) return `${formattedItems[0]} and ${formattedItems[1]}`;
  return `${formattedItems.slice(0, -1).join(", ")} and ${formattedItems[formattedItems.length - 1]}`;
}

function bundleThemeSummary(items) {
  const themes = uniqueItemParts(items, "theme");
  if (!themes.length) return "selected-team";
  if (themes.length === 1) return themes[0];
  return "multi-team";
}

function bundleSeasonSummary(items) {
  const seasons = uniqueItemParts(items, "season");
  if (!seasons.length) return "selected-season";
  if (seasons.length === 1) return seasons[0];
  return "mixed-season";
}

function uniqueItemParts(items, part) {
  const values = [];
  items.forEach((item) => {
    const match = parseBundleItemParts(item);
    if (!match) return;
    const value = part === "theme" ? match.theme : match.season;
    if (value && !values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      values.push(value);
    }
  });
  return values;
}

function parseBundleItemParts(item) {
  const raw = String(item || "").trim();
  const match = raw.match(/^(.+?)\s+(\d{2,4}\/\d{2})\s+(Home|Away|Third|Goalkeeper)\s+(.+)$/i);
  if (!match) return null;
  return {
    theme: match[1],
    season: match[2],
    kitType: match[3],
    detail: match[4]
  };
}

function formatBundleItemForChip(item) {
  const raw = String(item || "").trim();
  const parts = parseBundleItemParts(raw);
  if (!parts) return raw;
  return `${parts.theme} ${parts.kitType} ${parts.detail}`.replace(/\s+/g, " ").trim();
}

function formatBundleItemForOutput(item) {
  const raw = String(item || "").trim();
  const parts = parseBundleItemParts(raw);
  const outputRaw = parts ? `${parts.theme} ${parts.kitType} ${parts.detail}` : raw;
  const printMatch = outputRaw.match(/^(.*?)(?:\s+([A-Z][A-Z.'-]*(?:\s+[A-Z][A-Z.'-]*)*)\s+(\d{1,2}))$/);
  const hasPrint = Boolean(printMatch && /\b(Kit|Shirt)\b/i.test(printMatch[1]));
  const base = hasPrint ? printMatch[1].trim() : outputRaw;
  const print = hasPrint ? `${printMatch[2]} ${printMatch[3]}` : "";
  const readableBase = base
    .replace(/\bWith Socks\b/g, "with socks")
    .replace(/\bNo Socks\b/g, "without socks")
    .replace(/\b(Home|Away|Third|Goalkeeper) Adult Kit\b/g, "$1 adult kit")
    .replace(/\b(Home|Away|Third|Goalkeeper) Long Sleeve Shirt\b/g, "$1 long sleeve shirt")
    .replace(/\b(Home|Away|Third|Goalkeeper) Kit\b/g, "$1 kit")
    .replace(/\b(Home|Away|Third|Goalkeeper) Shirt\b/g, "$1 shirt");

  return print ? `${readableBase} - ${print}` : readableBase;
}

function bundlePersonalisationLine(facts) {
  if (bundleHasPrintedItem(facts)) {
    return "<li>Any player names and numbers shown in the included-item list are already part of the selected bundle items.</li>";
  }
  if (facts.personalisation_status === "available") {
    return "<li>Personalisation can be selected where the bundle options allow it; check all entered names and numbers before checkout.</li>";
  }
  if (facts.personalisation_status === "varies") {
    return "<li>Personalisation may vary by item, so check the available bundle options before ordering.</li>";
  }
  return "<li>This bundle is supplied according to the selected item list shown above.</li>";
}

function bundleHasPrintedItem(facts) {
  return Array.isArray(facts.bundle_items_list) && facts.bundle_items_list.some((item) => /\b[A-Z]{2,}\s+\d{1,2}\b/.test(item));
}

function detectBundleBranch(facts) {
  if (!Array.isArray(facts.bundle_items_list)) return "mixed_bundle";
  const items = facts.bundle_items_list.map((item) => item.toLowerCase());
  const hasPrinted = bundleHasPrintedItem(facts);
  const hasKit = items.some((item) => item.includes(" kit"));
  const hasShirt = items.some((item) => item.includes("shirt"));
  const hasWithSocks = items.some((item) => item.includes("with socks"));
  const hasNoSocks = items.some((item) => item.includes("no socks"));

  if (hasPrinted) return "printed_bundle";
  if (hasKit && hasShirt) return "mixed_bundle";
  if (hasKit && hasWithSocks) return "kit_bundle_with_socks";
  if (hasKit && hasNoSocks) return "kit_bundle_no_socks";
  if (hasShirt) return "shirt_bundle";
  return "mixed_bundle";
}

function detectBranch(facts) {
  if (facts.site !== "KFK") return null;

  if (facts.product_type === "shirt_only" && facts.included_items === "shirt_only" && facts.socks_status === "not_applicable") {
    return `${facts.listing_configuration}_${facts.audience}_shirt_only`;
  }

  if (facts.product_type === "full_kit" && ["kids", "men", "adult", "women", "baby"].includes(facts.audience)) {
    if (facts.included_items === "shirt_and_shorts" && facts.socks_status === "unavailable") {
      if (facts.listing_configuration === "plain_customisable") {
        return `plain_customisable_${facts.audience}_full_kit_without_socks`;
      }
      if (facts.listing_configuration === "pre_applied_player") {
        return `pre_applied_player_${facts.audience}_full_kit_without_socks`;
      }
    }

    if (facts.included_items === "shirt_shorts_and_socks" && facts.socks_status === "included") {
      if (facts.listing_configuration === "plain_customisable") {
        return `plain_customisable_${facts.audience}_full_kit_with_socks`;
      }
      if (facts.listing_configuration === "pre_applied_player") {
        return `pre_applied_player_${facts.audience}_full_kit_with_socks`;
      }
    }
  }

  return null;
}

function productNameConflict(facts) {
  const productName = String(facts.product_name || "").toLowerCase();
  const saysFootballKit = /\bfootball\s+kit\b/.test(productName);
  const saysShirt = /\b(?:football\s+)?shirt\b/.test(productName);

  if (saysFootballKit && facts.product_type !== "full_kit") {
    return "Product name says Football Kit, but Product selection is a single item. Confirm whether this should be Kit or Shirt.";
  }

  if (saysShirt && facts.product_type === "full_kit") {
    return "Product name says Shirt, but Product selection is Kit. Confirm whether the listing includes shorts and socks.";
  }

  return "";
}

function validateFacts(facts, branch) {
  const blockers = [];
  const reviewFlags = [];

  const required = [
    "product_name",
    "team",
    "season",
    "audience",
    "product_type",
    "kit_type",
    "sleeve_length",
    "included_items",
    "socks_status",
    "visible_size_range",
    "size_profile",
    "listing_configuration",
    "personalisation_status",
    "badge_status",
    "verification_status",
    "fact_status"
  ];

  required.forEach((field) => {
    if (!facts[field] || facts[field] === "unknown") {
      blockers.push(`${field} is required and cannot be unknown.`);
    }
  });

  if (!["available", "unavailable"].includes(facts.badge_status)) {
    blockers.push("badge_status must be available or unavailable.");
  }

  if (facts.badge_status === "available" && !facts.badge_league) {
    blockers.push("badge_league is required when badge_status is available.");
  }

  if (facts.version_style !== "fan_version") {
    blockers.push("KFK products must use the fixed fan version.");
  }

  if (facts.material !== "polyester") {
    blockers.push("KFK products must use the fixed polyester material value.");
  }

  if (Number(facts.badge_price_gbp) !== 3.99) {
    blockers.push("The fixed sleeve badge price must be £3.99.");
  }

  if (facts.verification_status === "conflict" || facts.verification_status === "unverified") {
    blockers.push(`verification_status is ${facts.verification_status}.`);
  }

  if (facts.fact_status !== "ready_for_generation") {
    blockers.push("fact_status must be ready_for_generation.");
  }

  const identityConflict = productNameConflict(facts);
  if (identityConflict) {
    blockers.push(identityConflict);
  }

  if (facts.product_type === "full_kit" && facts.included_items === "unknown") {
    blockers.push("Full-kit inclusions cannot be unknown.");
  }

  if (facts.product_type === "full_kit" && facts.socks_status === "unknown") {
    blockers.push("Socks status cannot be unknown for a full kit.");
  }

  if (facts.product_type === "shirt_only") {
    if (facts.included_items !== "shirt_only") {
      blockers.push("Shirt-only products must use included_items shirt_only.");
    }
    if (facts.socks_status !== "not_applicable") {
      blockers.push("Shirt-only products must use socks_status not_applicable.");
    }
    if (facts.audience === "adult") {
      blockers.push("Adult is reserved for generic adult kits. Choose Men or Women for a shirt-only product.");
    }
  }

  if (facts.audience === "kids" && facts.size_profile !== "kids_16_28") {
    blockers.push("Kids listings must use size_profile kids_16_28.");
  }

  if (facts.audience === "adult" && facts.size_profile !== "adult_s_2xl") {
    blockers.push("Adult listings must use size_profile adult_s_2xl.");
  }

  if (facts.audience === "men" && facts.size_profile !== "adult_s_2xl") {
    blockers.push("Men listings must use size_profile adult_s_2xl.");
  }

  if (facts.audience === "women" && facts.size_profile !== "women_s_2xl") {
    blockers.push("Women listings must use size_profile women_s_2xl.");
  }

  if (facts.audience === "baby" && facts.size_profile !== "baby_9_12") {
    blockers.push("Baby listings must use size_profile baby_9_12.");
  }

  if (facts.size_profile === "kids_16_28" && !facts.visible_size_range.toLowerCase().includes("kids sizes 16-28")) {
    blockers.push("visible_size_range must match Kids sizes 16-28 for size_profile kids_16_28.");
  }

  if (facts.size_profile === "adult_s_2xl" && !["adult sizes s-xxl", "men sizes s-xxl"].some((label) => facts.visible_size_range.toLowerCase().includes(label))) {
    blockers.push("visible_size_range must match Adult sizes S-XXL or Men sizes S-XXL for size_profile adult_s_2xl.");
  }

  if (facts.size_profile === "women_s_2xl" && !facts.visible_size_range.toLowerCase().includes("women sizes s–2xl")) {
    blockers.push("visible_size_range must match Women sizes S–2XL for size_profile women_s_2xl.");
  }

  if (facts.size_profile === "baby_9_12" && !facts.visible_size_range.toLowerCase().includes("baby sizes 9 and 12 (3–24 months)")) {
    blockers.push("visible_size_range must match Baby sizes 9 and 12 (3–24 months) for size_profile baby_9_12.");
  }

  if (facts.listing_configuration === "plain_customisable") {
    if (facts.personalisation_status !== "available") {
      blockers.push("Plain customisable listings must have personalisation_status available.");
    }
    if (facts.pre_applied_name || facts.pre_applied_number) {
      blockers.push("Plain customisable listings must not include a pre-applied player name or number.");
    }
    if (facts.print_price_included !== "not_applicable") {
      blockers.push("Plain customisable listings must use print_price_included not_applicable.");
    }
  }

  if (facts.listing_configuration === "pre_applied_player") {
    if (facts.personalisation_status !== "unavailable") {
      blockers.push("Pre-applied player listings must have personalisation_status unavailable.");
    }
    if (!facts.pre_applied_name || !facts.pre_applied_number) {
      blockers.push("Pre-applied player listings require pre_applied_name and pre_applied_number.");
    }
    if (facts.print_price_included !== "yes") {
      blockers.push("Pre-applied player listings must use print_price_included yes.");
    }
  }

  if (!branch) {
    blockers.push("No approved description branch matches these facts.");
  }

  if (facts.size_guide_tab_status !== "confirmed_present") {
    reviewFlags.push("Size guide is not confirmed; output can only be draft/review.");
  }

  if (facts.size_guide_location === "site_page" && !facts.size_guide_url) {
    reviewFlags.push("Size guide location is site_page but size_guide_url is blank.");
  }

  if (!facts.source_notes) {
    reviewFlags.push("source_notes is blank; add the human validation/evidence note before approval.");
  }

  if (facts.product_type === "full_kit" && facts.socks_status === "included" && !String(facts.main_colour_socks || "").trim()) {
    reviewFlags.push("Socks are included but the socks colour is blank; confirm it or leave it omitted if it cannot be verified.");
  }

  return { blockers, reviewFlags };
}

function sizeGuideSentence(facts) {
  if (facts.size_guide_tab_status !== "confirmed_present") return "";
  if (facts.size_guide_location === "product_tab") {
    return " Check the Size Guide tab for measurements.";
  }
  if (facts.size_guide_location === "site_page") {
    return " Check our Size Chart for measurements.";
  }
  return "";
}

function includedItemsHtml(facts) {
  const itemLabel = sentenceStart(productItemLabel(facts));
  const shirtText = facts.listing_configuration === "pre_applied_player"
    ? `${esc(itemLabel)} with ${esc(displayName(facts.pre_applied_name))} name and number ${esc(facts.pre_applied_number)} already applied to the back`
    : esc(itemLabel);

  if (facts.product_type === "shirt_only") {
    return `<li>${shirtText}</li>`;
  }

  const items = [
    `<li>${shirtText}</li>`,
    "<li>Matching shorts</li>"
  ];

  if (facts.socks_status === "included") {
    items.push("<li>Matching socks</li>");
  }

  return items.join("\n");
}

function mainColoursLine(facts) {
  const colours = [];
  const shirtColour = String(facts.main_colour_shirt || "").trim();
  const shortsColour = facts.product_type === "full_kit"
    ? String(facts.main_colour_shorts || "").trim()
    : "";
  const socksColour = facts.product_type === "full_kit" && facts.socks_status === "included"
    ? String(facts.main_colour_socks || "").trim()
    : "";

  if (shirtColour) colours.push(`${sentenceStart(shirtColour)} shirt`);
  if (shortsColour) colours.push(`${sentenceStart(shortsColour)} shorts`);
  if (socksColour) colours.push(`${sentenceStart(socksColour)} socks`);
  if (!colours.length) return "";

  return `<li><strong>Main colours:</strong> ${esc(colours.join("; "))}. Exact shades may vary slightly between screens and production batches. Please use the product photos as your guide.</li>`;
}

function materialLine(facts) {
  const notes = templateLibrary.copyRules?.materialNotes || [];
  const note = notes.length
    ? pick(notes, facts, 4)
    : "The fabric is designed to be lightweight and quick-drying. Exact fibre composition and fabric feel may vary slightly between production batches.";

  return `<li><strong>Material:</strong> Polyester. ${esc(note)}</li>`;
}

function badgeLine(facts) {
  if (facts.badge_status !== "available") return "";

  const price = Number(facts.badge_price_gbp || fixedKfkFacts.badge_price_gbp).toFixed(2);
  const badgeLabel = `${facts.badge_league}${facts.badge_champion_status === "champion" ? " Champions" : ""}`;
  return `<li><strong>Sleeve badge:</strong> An optional ${esc(badgeLabel)} sleeve badge can be added for &pound;${price}. Select it in the product options if required. It is not included in the base kit.</li>`;
}

function sizingWarningLine(facts) {
  const warningGroups = templateLibrary.copyRules?.sizingWarnings || {};
  const pool = warningGroups[facts.audience] || warningGroups.generic || [];
  if (!pool.length) return "";
  return `<li>${esc(pick(pool, facts, 7))}</li>`;
}

function insertSizingWarning(lines, facts) {
  const sizingLine = sizingWarningLine(facts);
  if (!sizingLine) return lines;
  if (!lines.length) return [sizingLine];
  return [lines[0], sizingLine, ...lines.slice(1)];
}

function renderDescription(facts, branch) {
  const template = pickBranchVariant(branch, facts);
  const opening = interpolate(template.opening, facts, { titleCaseProductLabels: true });

  const sizeLine = `<li><strong>Sizes:</strong> ${esc(facts.visible_size_range)}.${sizeGuideSentence(facts)}</li>`;
  const kitLine = facts.product_type === "full_kit"
    ? `<li><strong>Kit type:</strong> ${esc(titleCaseToken(facts.kit_type))} kit.</li>`
    : `<li><strong>Product type:</strong> ${esc(titleCaseToken(facts.kit_type))} ${esc(productItemLabel(facts))}.</li>`;
  const sleeveLabel = sleeveLengthLabel(facts);
  const sleeveLine = sleeveLabel ? `<li><strong>Sleeve length:</strong> ${esc(sleeveLabel)}.</li>` : "";
  const optionLines = [
    interpolate(template.keyDetail, facts),
    badgeLine(facts)
  ].filter(Boolean);
  const beforeOrderLines = template.beforeOrder
    .map((line) => interpolate(line, facts))
    .filter(Boolean);
  const beforeOrder = insertSizingWarning(beforeOrderLines, facts).join("\n");
  const productDetails = [
    "<li><strong>Version:</strong> Fan version.</li>",
    kitLine,
    mainColoursLine(facts),
    sizeLine,
    sleeveLine,
    materialLine(facts)
  ].filter(Boolean);

  const html = [
    `<p>${opening}</p>`,
    "",
    "<h3>What's Included</h3>",
    "<ul>",
    includedItemsHtml(facts),
    "</ul>",
    "",
    "<h3>Product Details</h3>",
    "<ul>",
    productDetails.join("\n"),
    "</ul>",
    "",
    "<h3>Options You Can Add</h3>",
    "<ul>",
    optionLines.join("\n"),
    "</ul>",
    "",
    "<h3>Before You Order</h3>",
    "<ul>",
    beforeOrder,
    "</ul>"
  ].join("\n");

  return removeDescriptionDashes(html);
}

function renderBundleDescription(facts) {
  const bundleBranch = detectBundleBranch(facts);
  const branchConfig = templateLibrary.bundle.branches[bundleBranch] || templateLibrary.bundle.branches.mixed_bundle;
  const template = pick(branchConfig.variants, facts, 1);
  let opening = interpolate(template.opening, facts);

  const itemsHtml = facts.bundle_items_list.map((item) => `<li>${esc(formatBundleItemForOutput(item))}</li>`).join("\n");
  const keyDetail = interpolate(template.keyDetail, facts);
  const beforeOrder = template.beforeOrder.map((line) => interpolate(line, facts)).join("\n");

  const html = [
    `<p>${opening}</p>`,
    "",
    "<h3>What's Included</h3>",
    "<ul>",
    itemsHtml,
    "</ul>",
    "",
    "<h3>Key Buying Details</h3>",
    "<ul>",
    `<li><strong>Sizes:</strong> ${esc(facts.visible_size_range)}.${sizeGuideSentence(facts)}</li>`,
    keyDetail,
    "</ul>",
    "",
    "<h3>Before You Order</h3>",
    "<ul>",
    beforeOrder,
    "</ul>"
  ].join("\n");

  return removeDescriptionDashes(html);
}

function validateBundleFacts(facts) {
  const blockers = [];
  const reviewFlags = [];
  const required = ["bundle_name"];

  required.forEach((field) => {
    if (!facts[field] || facts[field] === "unknown") {
      blockers.push(`${field} is required and cannot be unknown.`);
    }
  });

  if (facts.bundle_items_list.length < 2) {
    blockers.push("Bundle descriptions need at least two included items.");
  }

  if (!facts.source_notes) {
    reviewFlags.push("source_notes is blank; add the human validation/evidence note before approval.");
  }

  return { blockers, reviewFlags };
}

function auditDescription(html, facts, blockers, reviewFlags, resolvedBranch = null) {
  if (!html) {
    const qaStatus = blockers.length ? "block" : reviewFlags.length ? "review" : "pass";
    return {
      qa_status: qaStatus,
      product_ref: facts.product_name,
      site: facts.site,
      branch: detectBranch(facts),
      checks_run: [
        "fact_consistency",
        "configuration_logic"
      ],
      blockers,
      review_flags: reviewFlags,
      recommended_actions: recommendedActions(qaStatus, blockers, reviewFlags),
      generated_at: new Date().toISOString(),
      generator_version: "test_project_rule_builder_0.2.0"
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
  const tags = [...doc.querySelectorAll("#root *")].map((node) => node.tagName);
  const badTags = tags.filter((tag) => !allowedTags.has(tag));
  const rootText = doc.querySelector("#root").textContent;
  const text = rootText.toLowerCase();
  const sectionText = (headingText) => {
    const heading = [...doc.querySelectorAll("#root h3")]
      .find((node) => node.textContent.trim().toLowerCase() === headingText);
    return heading?.nextElementSibling?.textContent.toLowerCase() || "";
  };
  const openingText = doc.querySelector("#root > p")?.textContent.toLowerCase() || "";
  const includedText = sectionText("what's included");
  const beforeOrderText = sectionText("before you order");
  const unsupported = forbiddenTerms.filter((term) => text.includes(term));

  if (badTags.length) {
    blockers.push(`HTML contains prohibited tag(s): ${[...new Set(badTags)].join(", ")}.`);
  }

  if (descriptionDashCheckPattern.test(rootText)) {
    blockers.push("Description text must not contain dash characters.");
  }

  if (unsupported.length) {
    blockers.push(`Description contains unsupported claim term(s): ${unsupported.join(", ")}.`);
  }

  if (facts.product_type !== "bundle") {
    if (!text.includes("version: fan version")) {
      blockers.push("Product descriptions must identify the fixed fan version.");
    }
    if (!text.includes("material: polyester")) {
      blockers.push("Product descriptions must identify the fixed polyester material.");
    }
    if (facts.badge_status === "available" && (!facts.badge_league || !text.includes(removeDashesFromText(facts.badge_league).toLowerCase()) || !text.includes("sleeve badge") || !text.includes("3.99"))) {
      blockers.push("Available badge products must show the entered league badge option and £3.99 price.");
    }
    if (facts.badge_champion_status === "champion" && !text.includes("champions sleeve badge")) {
      blockers.push("Champion badge products must identify the Champions sleeve badge option.");
    }
    if (facts.badge_status === "unavailable" && text.includes("sleeve badge")) {
      blockers.push("Unavailable badge products must not show the badge option.");
    }
    if (facts.product_type === "shirt_only" && sectionText("product details").includes("shorts")) {
      blockers.push("Shirt-only products must not show a shorts colour in Product Details.");
    }
  }

  if (facts.socks_status === "unavailable") {
    if (facts.site === "KFK") {
      if (includedText.includes("socks")) {
        blockers.push("KFK no-socks products must list only received items under What's Included.");
      }
      if (!openingText.includes("socks are not included") || !beforeOrderText.includes("socks are not included")) {
        blockers.push("KFK no-socks products must state that socks are not included in the opening and Before You Order.");
      }
    } else if (!text.includes("socks are not included")) {
      blockers.push("No-socks product must state that socks are not included.");
    }
  }

  if (facts.product_type === "shirt_only" && !text.includes("shorts and socks are not included")) {
    blockers.push("Shirt-only product must state that shorts and socks are not included.");
  }

  if (facts.listing_configuration === "pre_applied_player" && text.includes("add a custom name")) {
    blockers.push("Pre-applied player product must not invite customer-entered name/number personalisation.");
  }

  const qaStatus = blockers.length ? "block" : reviewFlags.length ? "review" : "pass";

  return {
    qa_status: qaStatus,
    product_ref: facts.product_name,
    site: facts.site,
    branch: resolvedBranch || detectBranch(facts),
    checks_run: [
      "fact_consistency",
      "html_structure",
      "configuration_logic",
      "global_component_duplication",
      "unsupported_claims",
      "dash_free_text"
    ],
    blockers,
    review_flags: reviewFlags,
    recommended_actions: recommendedActions(qaStatus, blockers, reviewFlags),
    generated_at: new Date().toISOString(),
    generator_version: "test_project_rule_builder_0.2.0"
  };
}

function recommendedActions(status, blockers, reviewFlags) {
  if (status === "pass") return ["Send HTML for human approval before WooCommerce update."];
  if (status === "review") return reviewFlags.map((flag) => `Review: ${flag}`);
  return blockers.map((blocker) => `Fix before generation: ${blocker}`);
}

function toYamlish(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value.map((item) => `${pad}- ${item}`).join("\n");
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => {
      if (Array.isArray(item)) {
        return `${pad}${key}:\n${toYamlish(item, indent + 2)}`;
      }
      return `${pad}${key}: ${item}`;
    }).join("\n");
  }
  return String(value);
}

function formatAuditOutput(audit) {
  if (audit.qa_status !== "block") return toYamlish(audit);

  const errors = audit.error ? [audit.error] : (audit.blockers || []);
  const visibleErrors = errors.slice(0, 4);
  const remainingCount = Math.max(0, errors.length - visibleErrors.length);
  const lines = ["qa_status: block"];

  if (visibleErrors.length) {
    lines.push("errors:", ...visibleErrors.map((error) => `- ${shortAuditError(error)}`));
  }
  if (remainingCount) lines.push(`- +${remainingCount} more issue${remainingCount === 1 ? "" : "s"}`);

  return lines.join("\n");
}

function shortAuditError(error) {
  const requiredField = String(error).match(/^([a-z_]+) is required and cannot be unknown\.$/i);
  if (requiredField) {
    const labels = {
      product_name: "Product name",
      bundle_name: "Bundle name",
      team: "Team",
      season: "Season"
    };
    return `${labels[requiredField[1]] || requiredField[1].replaceAll("_", " ")} is required.`;
  }

  if (error === "No approved description branch matches these facts.") {
    return "Choose a valid product configuration.";
  }
  if (error === "Bundle descriptions need at least two included items.") {
    return "Add at least two bundle items.";
  }

  return String(error);
}

function setBadge(element, text, status) {
  element.textContent = text;
  element.className = `badge ${status}`;
}

function generate() {
  if (activeMode === "bundle") {
    generateBundle();
    return;
  }

  const facts = getFacts();

  const branch = detectBranch(facts);
  const validation = validateFacts(facts, branch);
  let html = "";
  let audit;

  if (validation.blockers.length) {
    audit = auditDescription("", facts, [...validation.blockers], [...validation.reviewFlags]);
    preview.className = "description-preview empty";
    preview.textContent = "BLOCK: fix the audit issues before generating customer-facing HTML.";
    htmlOutput.value = "";
  } else {
    html = renderDescription(facts, branch);
    audit = auditDescription(html, facts, [...validation.blockers], [...validation.reviewFlags]);
    preview.className = "description-preview";
    preview.innerHTML = html;
    htmlOutput.value = html;
  }

  setBadge(branchBadge, branch ? templateLibrary.branchLabels[branch] : "No approved branch", branch ? "pass" : "block");
  setBadge(qaBadge, audit.qa_status, audit.qa_status);
  auditOutput.textContent = formatAuditOutput(audit);
}

function bundleHash(text) {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function bundleFactsSignature(facts) {
  const pieces = facts.bundle_items_list.map((piece) => ({
    recipient_role: piece.recipient_role,
    recipient_label: piece.recipient_label,
    audience: piece.audience,
    product_name: piece.product_name,
    team: piece.team,
    season: piece.season,
    product_kind: piece.product_kind,
    product_type: piece.product_type,
    kit_type: piece.kit_type,
    sleeve_length: piece.sleeve_length,
    included_items: piece.included_items,
    socks_status: piece.socks_status,
    listing_configuration: piece.listing_configuration,
    personalisation_status: piece.personalisation_status,
    pre_applied_name: piece.pre_applied_name,
    pre_applied_number: piece.pre_applied_number,
    badge_status: piece.badge_status,
    badge_league: piece.badge_league,
    badge_champion_status: piece.badge_champion_status,
    main_colour_shirt: piece.main_colour_shirt,
    main_colour_shorts: piece.main_colour_shorts,
    main_colour_socks: piece.main_colour_socks,
    size_range_mode: piece.size_range_mode,
    visible_size_range: piece.visible_size_range
  }));
  return bundleHash(JSON.stringify({
    bundle_type: facts.bundle_type,
    bundle_name: facts.bundle_name,
    bundle_label: facts.bundle_label,
    gift_pack_returns_policy: facts.gift_pack_returns_policy,
    gift_pack_promotion_policy: facts.gift_pack_promotion_policy,
    gift_pack_packaging_policy: facts.gift_pack_packaging_policy,
    pieces
  }));
}

function readBundleDescriptionHistory() {
  try {
    const value = JSON.parse(window.localStorage.getItem("kfk_bundle_description_history_v1") || "[]");
    const stored = Array.isArray(value) ? value : [];
    const combined = [...stored, ...bundleDescriptionSessionHistory];
    return combined.filter((entry, index) => combined.findIndex((candidate) => candidate.description_fingerprint === entry.description_fingerprint) === index);
  } catch (_error) {
    return [...bundleDescriptionSessionHistory];
  }
}

function writeBundleDescriptionHistory(history) {
  bundleDescriptionSessionHistory = history.slice(-250);
  try {
    window.localStorage.setItem("kfk_bundle_description_history_v1", JSON.stringify(history.slice(-250)));
  } catch (_error) {
    // The generator still works when storage is unavailable; uniqueness remains session-scoped.
  }
}

function humanList(values) {
  const items = values.filter(Boolean);
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function uniqueTextValues(values) {
  return values.reduce((result, value) => {
    const text = String(value || "").trim();
    if (text && !result.some((item) => item.toLowerCase() === text.toLowerCase())) result.push(text);
    return result;
  }, []);
}

function numberWord(value) {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return words[value] || String(value);
}

function bundlePieceKindLabel(piece) {
  if (piece.sleeve_length === "baby_suit") return "baby suit";
  return piece.product_type === "full_kit" ? "kit" : "shirt";
}

function bundlePieceAudienceLabel(audience) {
  const labels = {
    kids: "kids",
    men: "men's",
    adult: "adult",
    women: "women's",
    baby: "baby"
  };
  return labels[audience] || audience;
}

function assignBundlePieceReferences(pieces) {
  const prepared = pieces.map((piece) => {
    const owner = bundleRecipientLabelForPiece(piece);
    const kind = bundlePieceKindLabel(piece);
    const genericOwner = piece.recipient_role === "none";
    const base = genericOwner
      ? `${titleCaseToken(piece.kit_type)} ${kind}`
      : owner;
    return { ...piece, reference: base, reference_owner: owner };
  });

  const baseCounts = prepared.reduce((counts, piece) => {
    const key = piece.reference.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  prepared.forEach((piece) => {
    if (baseCounts[piece.reference.toLowerCase()] < 2) return;
    const kind = `${titleCaseToken(piece.kit_type)} ${bundlePieceKindLabel(piece)}`;
    piece.reference = piece.recipient_role === "none"
      ? kind
      : `${piece.reference_owner}'s ${kind}`;
  });

  const finalCounts = {};
  prepared.forEach((piece) => {
    const key = piece.reference.toLowerCase();
    finalCounts[key] = (finalCounts[key] || 0) + 1;
    if (finalCounts[key] > 1) piece.reference = `${piece.reference} ${finalCounts[key]}`;
  });
  return prepared;
}

function bundleCompositionSummary(pieces) {
  const allKits = pieces.every((piece) => piece.product_type === "full_kit");
  const audiences = uniqueTextValues(pieces.map((piece) => piece.audience));
  const itemPhrases = pieces.map((piece) => `one ${titleCaseToken(piece.kit_type)} ${bundlePieceKindLabel(piece)}`);
  if (allKits && audiences.length === 1) {
    return `${numberWord(pieces.length)} ${bundlePieceAudienceLabel(audiences[0])} kits: ${humanList(itemPhrases)}`;
  }
  return humanList(pieces.map((piece) => `one ${titleCaseToken(piece.kit_type)} ${bundlePieceAudienceLabel(piece.audience)} ${bundlePieceKindLabel(piece)}`));
}

function buildBundleSummary(facts) {
  const pieces = assignBundlePieceReferences(facts.bundle_items_list);
  const sharedValue = (field) => {
    const values = uniqueTextValues(pieces.map((piece) => piece[field]));
    return values.length === 1 ? values[0] : "";
  };
  return {
    facts,
    pieces,
    signature: bundleFactsSignature(facts),
    bundleLabel: facts.bundle_label || "bundle",
    composition: bundleCompositionSummary(pieces),
    sharedTeam: sharedValue("team"),
    sharedSeason: sharedValue("season"),
    sharedAudience: sharedValue("audience"),
    sharedSleeve: sharedValue("sleeve_length"),
    sharedSizeRange: sharedValue("visible_size_range"),
    kitTypes: uniqueTextValues(pieces.map((piece) => titleCaseToken(piece.kit_type))),
    personalisable: pieces.filter((piece) => piece.personalisation_status === "available"),
    fixedPrint: pieces.filter((piece) => piece.listing_configuration === "pre_applied_player"),
    badgeEligible: pieces.filter((piece) => piece.badge_status === "available"),
    customSizes: pieces.filter((piece) => piece.size_range_mode === "custom")
  };
}

function pickBundleModule(poolName, summary, revision, salt = 0) {
  const pool = templateLibrary.bundle.modulePools?.[poolName] || [];
  if (!pool.length) return "";
  const start = parseInt(bundleHash(`${summary.signature}|${poolName}`), 16) || 0;
  return pool[(start + revision + (Math.floor(revision / pool.length) * salt) + salt) % pool.length];
}

function interpolateBundleModule(template, values) {
  return Object.entries(values).reduce((result, [key, value]) => (
    result.replaceAll(`{${key}}`, esc(value))
  ), String(template || ""));
}

function renderBundleOpening(summary, revision) {
  const template = pickBundleModule("openings", summary, revision, 1);
  const bundleIdentity = summary.facts.bundle_label
    && !summary.facts.bundle_name.toLowerCase().includes(summary.facts.bundle_label.toLowerCase())
    ? `${summary.facts.bundle_name} — ${summary.facts.bundle_label}`
    : summary.facts.bundle_name;
  return interpolateBundleModule(template, {
    bundle_name: summary.facts.bundle_name,
    bundle_identity: bundleIdentity,
    bundle_label: summary.bundleLabel,
    composition: summary.composition
  });
}

function bundlePieceIdentity(piece) {
  const sleeve = piece.sleeve_length === "long_sleeve" ? "long-sleeve " : piece.sleeve_length === "short_sleeve" ? "short-sleeve " : "";
  return `${piece.team} ${piece.season} ${titleCaseToken(piece.kit_type)} ${bundlePieceAudienceLabel(piece.audience)} ${sleeve}${bundlePieceKindLabel(piece)}`
    .replace(/\s+/g, " ")
    .trim();
}

function bundleFixedPrintSentence(piece) {
  if (piece.listing_configuration !== "pre_applied_player") return "";
  return `${displayName(piece.pre_applied_name)} name and number ${piece.pre_applied_number} are already applied to the back.`;
}

function renderBundlePieceIncluded(piece) {
  let contents;
  if (piece.product_type === "full_kit" && piece.socks_status === "included") {
    contents = "shirt, matching shorts and socks";
  } else if (piece.product_type === "full_kit") {
    contents = "shirt and matching shorts; socks are not included";
  } else if (piece.sleeve_length === "baby_suit") {
    contents = "one baby suit";
  } else {
    contents = `${piece.sleeve_length === "long_sleeve" ? "one long-sleeve" : "one short-sleeve"} football shirt; shorts and socks are not included`;
  }
  const fixedPrint = bundleFixedPrintSentence(piece);
  const playerPrint = fixedPrint ? ` ${fixedPrint}` : "";
  const recipient = piece.recipient_role === "none" ? "" : `<strong>${esc(piece.reference)}:</strong> `;
  const identity = `${piece.team} ${titleCaseToken(piece.kit_type)} ${bundlePieceAudienceLabel(piece.audience)} ${bundlePieceKindLabel(piece)}`
    .replace(/\s+/g, " ")
    .trim();
  return `<li>${recipient}1 &times; ${esc(identity)}: ${esc(contents)}.${esc(playerPrint)}</li>`;
}

function renderBundleColours(summary) {
  const entries = summary.pieces.map((piece) => {
    const colours = [`${String(piece.main_colour_shirt).toLowerCase()} shirt`];
    if (piece.main_colour_shorts) colours.push(`${String(piece.main_colour_shorts).toLowerCase()} shorts`);
    if (piece.main_colour_socks) colours.push(`${String(piece.main_colour_socks).toLowerCase()} socks`);
    return `${piece.reference}: ${colours.join(", ")}`;
  });
  return `<li><strong>Main colours:</strong> ${esc(entries.join("; "))}.</li>`;
}

function bundleRangeHtml(value) {
  return esc(value)
    .replace(/(\d)\s*-\s*(\d)/g, "$1&ndash;$2")
    .replace(/\bS\s*-\s*XXL\b/gi, "S&ndash;XXL");
}

function renderBundleSizes(summary) {
  const rangeText = summary.sharedSizeRange
    ? `${bundleRangeHtml(summary.sharedSizeRange)} for each Piece.`
    : summary.pieces.map((piece) => `${esc(piece.reference)}: ${bundleRangeHtml(piece.visible_size_range)}`).join("; ") + ".";
  const sizeGuideDirection = summary.customSizes.length ? "" : " Check the Size Guide tab for measurements.";
  return `<li><strong>Sizes:</strong> ${rangeText} Choose a size separately for every Piece.${sizeGuideDirection}</li>`;
}

function renderBundleProductDetails(summary) {
  const lines = [];
  if (summary.sharedTeam) lines.push(`<li><strong>Team:</strong> ${esc(summary.sharedTeam)}.</li>`);
  else lines.push(`<li><strong>Teams:</strong> ${esc(humanList(uniqueTextValues(summary.pieces.map((piece) => piece.team))))}.</li>`);
  if (summary.sharedSeason) lines.push(`<li><strong>Season:</strong> ${esc(summary.sharedSeason)}.</li>`);
  else lines.push(`<li><strong>Seasons:</strong> ${esc(summary.pieces.map((piece) => `${piece.reference} — ${piece.season}`).join("; "))}.</li>`);
  if (summary.pieces.every((piece) => piece.product_type === "full_kit")) {
    lines.push(`<li><strong>Kit types:</strong> ${esc(humanList(summary.kitTypes))}.</li>`);
  } else {
    const products = summary.pieces.map((piece) => `${titleCaseToken(piece.kit_type)} ${bundlePieceKindLabel(piece)}`);
    lines.push(`<li><strong>Products:</strong> ${esc(humanList(products))}.</li>`);
  }
  if (summary.sharedSleeve) lines.push(`<li><strong>Sleeve length:</strong> ${esc(sleeveLengthLabel({ sleeve_length: summary.sharedSleeve }) || titleCaseToken(summary.sharedSleeve))}.</li>`);
  else lines.push(`<li><strong>Sleeve lengths:</strong> ${esc(summary.pieces.map((piece) => `${piece.reference} — ${sleeveLengthLabel(piece) || titleCaseToken(piece.sleeve_length)}`).join("; "))}.</li>`);
  lines.push("<li><strong>Version:</strong> Fan version.</li>");
  summary.fixedPrint.forEach((piece) => {
    lines.push(`<li><strong>${esc(piece.reference)} player print:</strong> ${esc(displayName(piece.pre_applied_name))} name and number ${esc(piece.pre_applied_number)} are already applied and included.</li>`);
  });
  lines.push(renderBundleColours(summary));
  lines.push(renderBundleSizes(summary));
  lines.push("<li><strong>Material:</strong> Made from lightweight polyester fabric</li>");
  lines.push("<li>Exact shades may vary slightly between screens and production batches. Please use the product photos as your guide.</li>");
  return lines;
}

function refsForPieces(pieces) {
  return humanList(pieces.map((piece) => piece.reference));
}

function renderBundlePersonalisationOptions(summary) {
  const lines = [];
  const available = summary.personalisable;
  if (available.length === summary.pieces.length) {
    lines.push("<li><strong>Name and number:</strong> optional on any eligible Piece. Select it separately for each Piece and enter the details in the matching fields. Names up to 13 letters, numbers up to 2 digits.</li>");
  } else if (available.length) {
    lines.push(`<li><strong>Name and number:</strong> optional on ${esc(refsForPieces(available))}. Select it separately using the matching product options. Names up to 13 letters, numbers up to 2 digits.</li>`);
  }

  const unavailablePlain = summary.pieces.filter((piece) => (
    piece.personalisation_status === "unavailable" && piece.listing_configuration !== "pre_applied_player"
  ));
  if (unavailablePlain.length) {
    lines.push(`<li><strong>Personalisation unavailable:</strong> A name and number cannot be added to ${esc(refsForPieces(unavailablePlain))}.</li>`);
  }
  return lines;
}

function bundleBadgeDisplay(piece) {
  return `${piece.badge_league}${piece.badge_champion_status === "champion" ? " Champions" : ""}`;
}

function renderBundleBadgeOptions(summary) {
  if (!summary.badgeEligible.length) return [];
  const groups = new Map();
  summary.badgeEligible.forEach((piece) => {
    const label = bundleBadgeDisplay(piece);
    const group = groups.get(label) || [];
    group.push(piece);
    groups.set(label, group);
  });
  if (groups.size === 1 && summary.badgeEligible.length === summary.pieces.length) {
    const [label] = groups.keys();
    return [`<li><strong>Sleeve badges:</strong> optional ${esc(label)} sleeve badges can be added separately to every Piece using the matching product options.</li>`];
  }
  return [...groups.entries()].map(([label, pieces]) => (
    `<li><strong>${esc(label)} sleeve badge:</strong> Available for ${esc(refsForPieces(pieces))} using the matching product option.</li>`
  ));
}

function renderBundleBeforeOrder(summary) {
  const lines = ["<li>Check that a size has been selected separately for each Piece before ordering.</li>"];
  if (summary.personalisable.length) {
    lines.push("<li>Double-check the spelling of each name and number in the personalisation fields.</li>");
  }
  summary.fixedPrint.forEach((piece) => {
    lines.push(`<li>${esc(piece.reference)} includes the fixed ${esc(displayName(piece.pre_applied_name))} ${esc(piece.pre_applied_number)} print; another name or number cannot be selected for this Piece.</li>`);
  });
  summary.pieces.filter((piece) => piece.product_type === "shirt_only" && piece.sleeve_length !== "baby_suit").forEach((piece) => {
    lines.push(`<li>${esc(piece.reference)} is a shirt-only product. Shorts and socks are not included.</li>`);
  });
  summary.pieces.filter((piece) => piece.product_type === "full_kit" && piece.socks_status === "unavailable").forEach((piece) => {
    lines.push(`<li>${esc(piece.reference)} includes the shirt and matching shorts. Socks are not included.</li>`);
  });
  return lines;
}

function renderPieceBasedBundleDescription(summary) {
  const options = [
    ...renderBundlePersonalisationOptions(summary),
    ...renderBundleBadgeOptions(summary)
  ];
  if (!options.length) options.push("<li>No additional name-and-number personalisation or sleeve-badge option is available for the listed Pieces.</li>");

  const html = [
    "<h3>What's Included</h3>",
    "<ul>",
    summary.pieces.map(renderBundlePieceIncluded).join("\n"),
    "</ul>",
    "",
    "<h3>Product Details</h3>",
    "<ul>",
    renderBundleProductDetails(summary).join("\n"),
    "</ul>",
    "",
    "<h3>Options You Can Add</h3>",
    "<ul>",
    options.join("\n"),
    "</ul>",
    "",
    "<h3>Before You Order</h3>",
    "<ul>",
    renderBundleBeforeOrder(summary).join("\n"),
    "</ul>"
  ].join("\n");

  return html;
}

function isBirthdayGiftPack(facts) {
  return facts.bundle_type === "birthday_gift_pack_home_away_kids";
}

function validateBirthdayGiftPackFacts(facts) {
  const blockers = [];
  const pieces = facts.bundle_items_list;
  if (facts.site !== "KFK") blockers.push("Birthday Gift Pack branch is approved only for KFK.");
  if (pieces.length < 2 || pieces.length > maxBundlePieces) blockers.push(`Birthday Gift Pack requires between 2 and ${maxBundlePieces} Pieces.`);
  const kitTypes = pieces.map((piece) => piece.kit_type);
  if (uniqueTextValues(kitTypes).length !== kitTypes.length) blockers.push("Birthday Gift Pack Pieces must use different kit types so each kit remains identifiable.");
  if (pieces.some((piece) => piece.audience !== "kids")) blockers.push("Birthday Gift Pack Pieces must use the Kids audience.");
  if (pieces.some((piece) => piece.product_type !== "full_kit")) {
    blockers.push("Each Birthday Gift Pack Piece must be a full kids kit.");
  }
  if (pieces.some((piece) => !["included", "unavailable"].includes(piece.socks_status))) {
    blockers.push("Choose With Socks or No Socks for every Birthday Gift Pack Piece.");
  }
  if (pieces.some((piece) => (
    piece.socks_status === "included"
      ? piece.included_items !== "shirt_shorts_and_socks"
      : piece.included_items !== "shirt_and_shorts"
  ))) {
    blockers.push("Each Birthday Gift Pack Piece must keep its contents consistent with the selected socks option.");
  }
  if (pieces.some((piece) => piece.sleeve_length !== "short_sleeve")) blockers.push("Birthday Gift Pack Pieces must be short sleeve.");
  if (pieces.some((piece) => piece.size_profile !== "kids_16_28")) blockers.push("Birthday Gift Pack Pieces must use the kids 16 to 28 size profile.");
  if (uniqueTextValues(pieces.map((piece) => piece.team)).length !== 1) blockers.push("Birthday Gift Pack Pieces must use the same team.");
  if (uniqueTextValues(pieces.map((piece) => piece.season)).length !== 1) blockers.push("Birthday Gift Pack Pieces must use the same season.");
  const policiesApproved = [
    facts.gift_pack_returns_policy,
    facts.gift_pack_promotion_policy,
    facts.gift_pack_packaging_policy
  ].every((policy) => policy === "approved");
  if (!policiesApproved) blockers.push("Confirm all Birthday Gift Pack policies.");
  return blockers;
}

function birthdayGiftPackPieces(summary) {
  const order = ["home", "away", "third", "fourth", "fifth", "goalkeeper", "training", "pre_match", "special_edition", "retro"];
  return [...summary.pieces].sort((left, right) => {
    const leftIndex = order.indexOf(left.kit_type);
    const rightIndex = order.indexOf(right.kit_type);
    return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex);
  });
}

function birthdayGiftPackColours(piece) {
  const colours = [
    `${String(piece.main_colour_shirt).toLowerCase()} shirt`,
    `${String(piece.main_colour_shorts).toLowerCase()} shorts`
  ];
  if (piece.socks_status === "included" && piece.main_colour_socks) {
    colours.push(`${String(piece.main_colour_socks).toLowerCase()} socks`);
  }
  return colours.join(", ");
}

function birthdayGiftPackIncludedLine(piece) {
  const fixedPrint = bundleFixedPrintSentence(piece);
  const contents = piece.socks_status === "included"
    ? "shirt, matching shorts and socks"
    : "shirt and matching shorts; socks are not included";
  return `<li>1 &times; ${esc(piece.team)} ${esc(titleCaseToken(piece.kit_type))} kids kit: ${contents}.${fixedPrint ? ` ${esc(fixedPrint)}` : ""}</li>`;
}

function renderBirthdayGiftPackOptions(summary) {
  const lines = [];
  const available = summary.personalisable;
  if (available.length === summary.pieces.length) {
    const kitNames = birthdayGiftPackPieces(summary).map((piece) => `${titleCaseToken(piece.kit_type)} kit`);
    const availability = kitNames.length === 2 ? `the ${kitNames[0]}, the ${kitNames[1]} or both` : "any eligible kit";
    lines.push(`<li><strong>Name and number:</strong> optional on ${esc(availability)}. Select it separately for each kit and enter the details in the matching fields. Names up to 13 letters, numbers up to 2 digits.</li>`);
  } else if (available.length) {
    const kitNames = available.map((piece) => `${titleCaseToken(piece.kit_type)} kit`);
    lines.push(`<li><strong>Name and number:</strong> optional on the ${esc(humanList(kitNames))}. Select it in the matching fields. Names up to 13 letters, numbers up to 2 digits.</li>`);
  }

  const badges = summary.badgeEligible;
  if (badges.length === summary.pieces.length && badges.every((piece) => piece.badge_league === "Premier League")) {
    const shirtCount = badges.length === 2 ? "both shirts" : `all ${badges.length} shirts`;
    lines.push(`<li><strong>EPL badges:</strong> Premier League sleeve badges added to ${shirtCount}.</li>`);
  } else if (badges.length === summary.pieces.length && uniqueTextValues(badges.map(bundleBadgeDisplay)).length === 1) {
    const shirtCount = badges.length === 2 ? "both shirts" : `all ${badges.length} shirts`;
    lines.push(`<li><strong>Sleeve badges:</strong> ${esc(bundleBadgeDisplay(badges[0]))} sleeve badges added to ${shirtCount}.</li>`);
  } else {
    badges.forEach((piece) => {
      lines.push(`<li><strong>${esc(titleCaseToken(piece.kit_type))} kit sleeve badge:</strong> ${esc(bundleBadgeDisplay(piece))} sleeve badge available for this shirt.</li>`);
    });
  }
  return lines;
}

function renderBirthdayGiftPackDescription(summary) {
  const pieces = birthdayGiftPackPieces(summary);
  const options = renderBirthdayGiftPackOptions(summary);
  const printDetails = (summary.fixedPrint || []).map((piece) => (
    `<li><strong>${esc(titleCaseToken(piece.kit_type))} kit player print:</strong> ${esc(displayName(piece.pre_applied_name))} name and number ${esc(piece.pre_applied_number)} are already applied and included.</li>`
  ));
  const beforeOrder = [];
  if (summary.personalisable.length) {
    beforeOrder.push("<li>Double-check the spelling of each name and number in the personalisation fields.</li>");
    beforeOrder.push("<li>Personalised shirts can&rsquo;t be returned for a change of mind or wrong size, unless we made an error.</li>");
  }
  (summary.fixedPrint || []).forEach((piece) => {
    beforeOrder.push(`<li>The ${esc(titleCaseToken(piece.kit_type))} kit includes the fixed ${esc(displayName(piece.pre_applied_name))} ${esc(piece.pre_applied_number)} print; another name or number cannot be selected for this kit.</li>`);
  });
  pieces.filter((piece) => piece.socks_status === "unavailable").forEach((piece) => {
    beforeOrder.push(`<li>The ${esc(titleCaseToken(piece.kit_type))} kit includes the shirt and matching shorts. Socks are not included.</li>`);
  });
  beforeOrder.push("<li>Gift packs are already discounted, so promo codes can&rsquo;t be applied.</li>");
  beforeOrder.push("<li><strong>Packaging:</strong> sent in standard packaging, not gift-wrapped.</li>");
  const kitTypes = pieces.map((piece) => titleCaseToken(piece.kit_type));
  const sizeSelection = pieces.length === 2 && pieces[0].kit_type === "home" && pieces[1].kit_type === "away"
    ? "Choose the Home and Away sizes separately."
    : "Choose each kit size separately.";

  return [
    "<h3>What's Included</h3>",
    "<ul>",
    ...pieces.map(birthdayGiftPackIncludedLine),
    "</ul>",
    "",
    "<h3>Product Details</h3>",
    "<ul>",
    `<li><strong>Season:</strong> ${esc(summary.sharedSeason)}.</li>`,
    `<li><strong>Kit types:</strong> ${esc(humanList(kitTypes))}.</li>`,
    "<li><strong>Version:</strong> Fan version.</li>",
    "<li><strong>Sleeve length:</strong> Short sleeve.</li>",
    ...printDetails,
    ...pieces.map((piece) => `<li><strong>${esc(titleCaseToken(piece.kit_type))} kit colours:</strong> ${esc(birthdayGiftPackColours(piece))}.</li>`),
    `<li><strong>Sizes:</strong> kids sizes 16&ndash;28 (ages 3&ndash;13) for each kit. ${sizeSelection} See the Size Guide tab for measurements.</li>`,
    "<li><strong>Material:</strong> Made from lightweight polyester fabric.</li>",
    "<li>Exact shades may vary slightly between screens and production batches. Please use the product photos as your guide.</li>",
    "</ul>",
    "",
    "<h3>Options You Can Add</h3>",
    "<ul>",
    options.join("\n"),
    "</ul>",
    "",
    "<h3>Before You Order</h3>",
    "<ul>",
    beforeOrder.join("\n"),
    "</ul>"
  ].join("\n");
}

function auditBirthdayGiftPackDescription(html, summary, fingerprint) {
  const blockers = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="gift-pack-audit-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#gift-pack-audit-root");
  const textValue = root.textContent.toLowerCase();
  const headings = [...root.querySelectorAll("h3")].map((node) => node.textContent.trim());
  const expectedHeadings = ["What's Included", "Product Details", "Options You Can Add", "Before You Order"];
  const sectionText = (heading) => [...root.querySelectorAll("h3")]
    .find((node) => node.textContent.trim() === heading)?.nextElementSibling?.textContent.toLowerCase() || "";
  const includedText = sectionText("What's Included");
  const productDetailsText = sectionText("Product Details");
  const optionsText = sectionText("Options You Can Add");
  const beforeOrderText = sectionText("Before You Order");
  const badTags = [...root.querySelectorAll("*")].map((node) => node.tagName).filter((tag) => !allowedTags.has(tag));
  if (badTags.length) blockers.push(`HTML contains prohibited tag(s): ${[...new Set(badTags)].join(", ")}.`);
  if (headings.join("|") !== expectedHeadings.join("|")) blockers.push("Birthday Gift Pack must use the four approved sections in order.");
  if (root.querySelector("p")) blockers.push("Birthday Gift Pack must not add an opening paragraph before What's Included.");
  if (textValue.includes("key buying details")) blockers.push("Birthday Gift Pack must not use the legacy Key Buying Details section.");
  ["lightweight polyester fabric", "standard packaging, not gift-wrapped"].forEach((phrase) => {
    if (!textValue.includes(phrase)) blockers.push(`Birthday Gift Pack is missing required copy: ${phrase}.`);
  });
  summary.pieces.forEach((piece) => {
    const kitLabel = `${piece.kit_type} kit`;
    if (!includedText.includes(`${piece.kit_type} kids kit`)) blockers.push(`${titleCaseToken(piece.kit_type)} kit is missing from What's Included.`);
    if (!productDetailsText.includes(`${kitLabel} colours:`)) blockers.push(`${titleCaseToken(piece.kit_type)} kit colours are missing from Product Details.`);
    const expectedContents = piece.socks_status === "included"
      ? "shirt, matching shorts and socks"
      : "shirt and matching shorts; socks are not included";
    if (!includedText.includes(expectedContents)) blockers.push(`${titleCaseToken(piece.kit_type)} kit contents or socks status is missing from What's Included.`);
    [piece.main_colour_shirt, piece.main_colour_shorts, piece.socks_status === "included" ? piece.main_colour_socks : ""].filter(Boolean).forEach((colour) => {
      if (!textValue.includes(String(colour).toLowerCase())) blockers.push(`${titleCaseToken(piece.kit_type)} kit colour ${colour} is missing.`);
    });
    if (piece.socks_status === "unavailable" && !beforeOrderText.includes(`the ${piece.kit_type} kit includes the shirt and matching shorts. socks are not included`)) {
      blockers.push(`${titleCaseToken(piece.kit_type)} kit no-socks warning is missing from Before You Order.`);
    }
    if (piece.listing_configuration === "pre_applied_player") {
      const playerName = displayName(piece.pre_applied_name).toLowerCase();
      const playerNumber = String(piece.pre_applied_number).toLowerCase();
      if (!textValue.includes(`${playerName} name and number ${playerNumber} are already applied to the back`)) {
        blockers.push(`${titleCaseToken(piece.kit_type)} kit fixed player print is missing from What's Included.`);
      }
      if (!textValue.includes(`fixed ${playerName} ${playerNumber} print`) || !textValue.includes("another name or number cannot be selected")) {
        blockers.push(`${titleCaseToken(piece.kit_type)} kit fixed player print warning is missing from Before You Order.`);
      }
      if (!productDetailsText.includes(`${piece.kit_type} kit player print:`) || !productDetailsText.includes(`${playerName} name and number ${playerNumber} are already applied and included`)) {
        blockers.push(`${titleCaseToken(piece.kit_type)} kit fixed player print is missing from Product Details.`);
      }
      if (optionsText.includes(`${piece.kit_type} kit player print:`)) {
        blockers.push(`${titleCaseToken(piece.kit_type)} kit fixed player print must not appear under Options You Can Add.`);
      }
    }
  });
  if (summary.personalisable.length && (!textValue.includes("13 letters") || !textValue.includes("2 digits") || !textValue.includes("double-check"))) {
    blockers.push("Birthday Gift Pack personalisation limits or spelling check are missing.");
  }
  const unsupported = forbiddenTerms.filter((term) => textValue.includes(term));
  if (unsupported.length) blockers.push(`Description contains unsupported claim term(s): ${unsupported.join(", ")}.`);
  const qaStatus = blockers.length ? "block" : "pass";
  return {
    qa_status: qaStatus,
    bundle_ref: summary.facts.bundle_name,
    site: summary.facts.site,
    piece_count: summary.pieces.length,
    facts_signature: summary.signature,
    description_fingerprint: fingerprint,
    branch_profile: "kfk_birthday_gift_pack_home_away_kids",
    checks_run: ["fact_consistency", "gift_pack_piece_coverage", "html_structure", "configuration_logic", "policy_confirmation", "unsupported_claims"],
    blockers,
    review_flags: [],
    recommended_actions: recommendedActions(qaStatus, blockers, []),
    generated_at: new Date().toISOString(),
    generator_version: "kfk_birthday_gift_pack_0.1.0"
  };
}

function auditPieceBasedBundleDescription(html, summary, fingerprint, revision) {
  const blockers = [];
  const reviewFlags = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="bundle-audit-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#bundle-audit-root");
  const rootText = root.textContent;
  const textValue = rootText.toLowerCase();
  const headings = [...root.querySelectorAll("h3")].map((node) => node.textContent.trim());
  const expectedHeadings = ["What's Included", "Product Details", "Options You Can Add", "Before You Order"];
  const sectionText = (heading) => [...root.querySelectorAll("h3")]
    .find((node) => node.textContent.trim() === heading)?.nextElementSibling?.textContent.toLowerCase() || "";
  const productDetailsText = sectionText("Product Details");
  const optionsText = sectionText("Options You Can Add");
  const badTags = [...root.querySelectorAll("*")].map((node) => node.tagName).filter((tag) => !allowedTags.has(tag));
  if (badTags.length) blockers.push(`HTML contains prohibited tag(s): ${[...new Set(badTags)].join(", ")}.`);
  if (headings.join("|") !== expectedHeadings.join("|")) blockers.push("Bundle descriptions must use the four approved sections in order.");
  if (root.querySelector("p")) blockers.push("The approved Bundle format starts directly with What's Included.");
  const unsupported = forbiddenTerms.filter((term) => textValue.includes(term));
  if (unsupported.length) blockers.push(`Description contains unsupported claim term(s): ${unsupported.join(", ")}.`);
  if (!textValue.includes("material: made from lightweight polyester fabric")) blockers.push("Bundle Product Details must include the approved polyester material wording.");
  if (!textValue.includes("exact shades may vary slightly between screens and production batches")) blockers.push("Bundle Product Details must include the approved shade note.");

  summary.pieces.forEach((piece, index) => {
    const prefix = `Piece ${index + 1} — ${piece.reference}`;
    const comparableReference = removeDashesFromText(piece.reference).toLowerCase();
    if (!textValue.includes(comparableReference)) blockers.push(`${prefix}: reference is missing from the description.`);
    if (!textValue.includes(removeDashesFromText(piece.team).toLowerCase())) blockers.push(`${prefix}: team is missing from the description.`);
    if (!textValue.includes(removeDashesFromText(piece.season).toLowerCase())) blockers.push(`${prefix}: season is missing from the description.`);
    [piece.main_colour_shirt, piece.main_colour_shorts, piece.main_colour_socks].filter(Boolean).forEach((colour) => {
      if (!textValue.includes(removeDashesFromText(colour).toLowerCase())) blockers.push(`${prefix}: colour ${colour} is missing.`);
    });
    if (piece.socks_status === "unavailable" && !textValue.includes(`${comparableReference} includes the shirt and matching shorts. socks are not included`)) {
      blockers.push(`${prefix}: no-socks warning is missing from Before You Order.`);
    }
    if (piece.product_type === "shirt_only" && !textValue.includes(`${comparableReference} is a shirt-only product. shorts and socks are not included`)) {
      blockers.push(`${prefix}: shirt-only warning is missing from Before You Order.`);
    }
    if (piece.listing_configuration === "pre_applied_player") {
      if (!textValue.includes(removeDashesFromText(piece.pre_applied_name).toLowerCase()) || !textValue.includes(String(piece.pre_applied_number).toLowerCase())) {
        blockers.push(`${prefix}: fixed player print is missing.`);
      }
      if (!productDetailsText.includes(`${comparableReference} player print:`)) {
        blockers.push(`${prefix}: fixed player print is missing from Product Details.`);
      }
      if (optionsText.includes(`${comparableReference} player print:`)) {
        blockers.push(`${prefix}: fixed player print must not appear under Options You Can Add.`);
      }
    }
  });

  if (summary.customSizes.length) {
    reviewFlags.push(`Custom size range needs human validation for: ${refsForPieces(summary.customSizes)}.`);
  }
  const readableBlocks = [...root.querySelectorAll("p, li")].map((node) => node.textContent.trim().toLowerCase()).filter(Boolean);
  const duplicates = readableBlocks.filter((value, index) => readableBlocks.indexOf(value) !== index);
  if (duplicates.length) reviewFlags.push("Description contains an exact repeated sentence or bullet; review for unnecessary duplication.");
  const qaStatus = blockers.length ? "block" : reviewFlags.length ? "review" : "pass";
  return {
    qa_status: qaStatus,
    bundle_ref: summary.facts.bundle_name,
    site: summary.facts.site,
    piece_count: summary.pieces.length,
    facts_signature: summary.signature,
    generation_revision: revision,
    description_fingerprint: fingerprint,
    branch_profile: `piece_based_${summary.pieces.every((piece) => piece.product_type === "full_kit") ? "all_kits" : "mixed"}`,
    checks_run: ["fact_consistency", "piece_coverage", "html_structure", "configuration_logic", "unsupported_claims", "duplicate_copy"],
    blockers,
    review_flags: reviewFlags,
    recommended_actions: recommendedActions(qaStatus, blockers, reviewFlags),
    generated_at: new Date().toISOString(),
    generator_version: "kfk_piece_bundle_0.2.0"
  };
}

function generateBundle() {
  const facts = getBundleFacts();
  const blockers = [];
  if (!facts.bundle_name) blockers.push("Bundle name is required.");
  if (facts.bundle_items_list.length < 2) blockers.push("Add at least two complete Pieces.");
  if (facts.bundle_items_list.length > maxBundlePieces) blockers.push(`A Bundle can contain up to ${maxBundlePieces} Pieces.`);
  facts.bundle_items_list.forEach((piece, index) => {
    validateBundlePiece(piece).forEach((error) => blockers.push(`Piece ${index + 1} — ${bundleRecipientLabelForPiece(piece)}: ${error}`));
  });

  if (isBirthdayGiftPack(facts)) blockers.push(...validateBirthdayGiftPackFacts(facts));

  if (blockers.length) {
    preview.className = "description-preview empty";
    preview.textContent = "BLOCK: complete the Bundle and all Piece cards before generating customer-facing HTML.";
    htmlOutput.value = "";
    setBadge(branchBadge, `${facts.bundle_items_list.length} Pieces`, "block");
    setBadge(qaBadge, "block", "block");
    auditOutput.textContent = formatAuditOutput({ qa_status: "block", blockers });
    return;
  }

  const summary = buildBundleSummary(facts);
  if (isBirthdayGiftPack(facts)) {
    const html = renderBirthdayGiftPackDescription(summary);
    const fingerprint = bundleHash(html.replace(/\s+/g, " ").trim().toLowerCase());
    const audit = auditBirthdayGiftPackDescription(html, summary, fingerprint);
    if (audit.qa_status === "block") {
      preview.className = "description-preview empty";
      preview.textContent = "BLOCK: generated Birthday Gift Pack HTML failed its branch audit.";
      htmlOutput.value = "";
    } else {
      preview.className = "description-preview";
      preview.innerHTML = html;
      htmlOutput.value = html;
    }
    setBadge(branchBadge, "KFK Birthday Gift Pack", audit.qa_status === "block" ? "block" : "pass");
    setBadge(qaBadge, audit.qa_status, audit.qa_status);
    auditOutput.textContent = formatAuditOutput(audit);
    return;
  }

  const html = renderPieceBasedBundleDescription(summary);
  const fingerprint = bundleHash(html.replace(/\s+/g, " ").trim().toLowerCase());
  const audit = auditPieceBasedBundleDescription(html, summary, fingerprint, 0);

  if (audit.qa_status === "block") {
    preview.className = "description-preview empty";
    preview.textContent = "BLOCK: generated HTML failed the Bundle audit.";
    htmlOutput.value = "";
  } else {
    preview.className = "description-preview";
    preview.innerHTML = html;
    htmlOutput.value = html;
  }

  setBadge(branchBadge, `Piece Bundle · ${summary.pieces.length}`, audit.qa_status === "block" ? "block" : "pass");
  setBadge(qaBadge, audit.qa_status, audit.qa_status);
  auditOutput.textContent = formatAuditOutput(audit);
}

function scheduleGenerate({ advanceVariant = false } = {}) {
  if (generateTimer) window.clearTimeout(generateTimer);
  if (advanceVariant) variantOffset += 1;
  syncProductTypeDefaults();
  syncAnotherInputs();

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  preview.className = "description-preview empty";
  preview.textContent = "Generating description...";

  generateTimer = window.setTimeout(() => {
    try {
      generate();
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      preview.className = "description-preview empty";
      preview.textContent = `ERROR: ${message}`;
      htmlOutput.value = "";
      auditOutput.textContent = formatAuditOutput({
        qa_status: "block",
        error: message,
        generated_at: new Date().toISOString()
      });
      setBadge(qaBadge, "block", "block");
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate";
      generateTimer = null;
    }
  }, 500);
}

function loadSample() {
  if (activeMode === "bundle") {
    loadBundleSample();
    return;
  }

  const sample = {
    product_name: "Inter Miami Home Kids Football Kit 2026/27",
    team: "Inter Miami",
    season: "2026/27",
    main_colour_shirt: "Pink",
    main_colour_shorts: "Black",
    main_colour_socks: "",
    badge_status: "unavailable",
    badge_league: "",
    audience: "kids",
    product_type: "full_kit",
    kit_type: "home",
    sleeve_length: "short_sleeve",
    included_items: "shirt_and_shorts",
    socks_status: "unavailable",
    listing_configuration: "plain_customisable",
    pre_applied_name: "",
    pre_applied_number: ""
  };

  Object.entries(sample).forEach(([name, value]) => {
    const field = form.elements[name];
    if (field) field.value = value;
  });
  syncProductControlsFromFacts(sample);
  variantOffset = 0;
  generate();
}

function loadBundleSample() {
  variantOffset = 0;
  setEnhancedSelectValue(bundleTypeSelect, "birthday_gift_pack_home_away_kids");
  bundleForm.elements.bundle_name.value = "Nottingham Forest Birthday Gift Pack Home and Away Kids Football Kit 2026/27";
  bundleItems = [
    {
      piece_id: "piece-1", recipient_role: "none", recipient_label: "", audience: "kids",
      product_name: "Nottingham Forest Home Kids Football Kit 2026/27", team: "Nottingham Forest", season: "2026/27",
      badge_status: "available", badge_league: "Premier League", badge_champion_status: "not_champion",
      product_kind: "Kit", product_type: "full_kit", kit_type: "home", sleeve_length: "short_sleeve",
      socks_status: "included", included_items: "shirt_shorts_and_socks", listing_configuration: "plain_customisable",
      personalisation_status: "available", print_price_included: "not_applicable", size_range_mode: "standard",
      pre_applied_name: "", pre_applied_number: "", main_colour_shirt: "Red", main_colour_shorts: "White", main_colour_socks: "Red",
      visible_size_range: "Kids sizes 16-28, suggested ages 3-13", size_profile: "kids_16_28", ...fixedKfkFacts
    },
    {
      piece_id: "piece-2", recipient_role: "none", recipient_label: "", audience: "kids",
      product_name: "Nottingham Forest Away Kids Football Kit 2026/27", team: "Nottingham Forest", season: "2026/27",
      badge_status: "available", badge_league: "Premier League", badge_champion_status: "not_champion",
      product_kind: "Kit", product_type: "full_kit", kit_type: "away", sleeve_length: "short_sleeve",
      socks_status: "included", included_items: "shirt_shorts_and_socks", listing_configuration: "plain_customisable",
      personalisation_status: "available", print_price_included: "not_applicable", size_range_mode: "standard",
      pre_applied_name: "", pre_applied_number: "", main_colour_shirt: "Green", main_colour_shorts: "Green", main_colour_socks: "Green",
      visible_size_range: "Kids sizes 16-28, suggested ages 3-13", size_profile: "kids_16_28", ...fixedKfkFacts
    }
  ];
  nextBundlePieceId = 3;
  syncBundleTypeControls();
  renderBundleItemsList();
  resetBundlePieceEditor();
  generateBundle();
}

function clearAll() {
  if (generateTimer) {
    window.clearTimeout(generateTimer);
    generateTimer = null;
  }

  [form, bundleForm].forEach((currentForm) => {
    currentForm.querySelectorAll('input[type="text"], textarea').forEach((field) => {
      field.value = "";
    });
    currentForm.querySelectorAll("select").forEach((select) => setEnhancedSelectValue(select, ""));
    currentForm.querySelectorAll('input[type="hidden"]').forEach((field) => {
      field.value = "";
    });
    currentForm.querySelectorAll('input[type="checkbox"]').forEach((field) => {
      field.checked = false;
    });
  });
  setEnhancedSelectValue(bundleTypeSelect, "piece_bundle");

  bundleItems = [];
  editingBundlePieceId = null;
  nextBundlePieceId = 1;
  isPrintInferredFromProductName = false;
  variantOffset = 0;
  tabSuggestionContext = null;
  closeEnhancedSelects();
  setBadgeLeagueSuggestionsOpen(false);
  setBadgeChampionStatus(false);
  resetImageColourAssistant({ clearFile: true });
  resetBundleImageColourAssistant({ clearFile: true });
  renderBundleItemsList();
  syncProductSelectionFields();
  resetBundlePieceEditor();
  syncBundleTypeControls();
  refreshEnhancedSelects();

  generateBtn.disabled = false;
  generateBtn.textContent = "Generate";
  setBadge(branchBadge, activeMode === "bundle" ? "Bundle mode" : "No branch yet", "neutral");
  setBadge(qaBadge, "not run", "neutral");
  preview.className = "description-preview empty";
  preview.textContent = "Generate a description to preview it here.";
  htmlOutput.value = "";
  auditOutput.textContent = "qa_status: not_run";
}

function syncAnotherInputs() {
  document.querySelectorAll("#factForm select, #bundleForm select").forEach((select) => {
    const input = select.form.elements[`${select.name}_another`];
    if (!input) return;
    const isAnother = select.value === "another";
    input.classList.toggle("visible", isAnother);
    input.required = isAnother;
    if (!isAnother) input.value = "";
  });
}

function setMode(mode) {
  activeMode = mode;
  form.classList.toggle("hidden", mode !== "product");
  bundleForm.classList.toggle("hidden", mode !== "bundle");
  document.querySelectorAll(".mode-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  variantOffset = 0;
  setBadge(branchBadge, mode === "bundle" ? "Bundle mode" : "No branch yet", "neutral");
  setBadge(qaBadge, "not run", "neutral");
  preview.className = "description-preview empty";
  preview.textContent = mode === "bundle"
    ? "Add at least two complete Pieces. Description generation is intentionally deferred for this UI phase."
    : "Generate a description to preview it here.";
  htmlOutput.value = "";
  auditOutput.textContent = "qa_status: not_run";
  syncAnotherInputs();
  syncProductSelectionFields();
  syncBundleTypeControls();
}

function syncProductTypeDefaults() {
  syncProductSelectionFields();
  const productType = form.elements.product_type.value;
  if (productType === "shirt_only") {
    form.elements.included_items.value = "shirt_only";
    form.elements.socks_status.value = "not_applicable";
  }
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}View`).classList.add("active");
  });
});

document.querySelectorAll(".mode-tab").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

generateBtn.addEventListener("click", () => scheduleGenerate({ advanceVariant: true }));
loadSampleBtn.addEventListener("click", loadSample);
clearAllBtn.addEventListener("click", clearAll);
imageColourFileInput.addEventListener("change", handleImageColourFileChange);
useImageTitleBtn.addEventListener("click", useImageTitle);
clearImageColourBtn.addEventListener("click", () => resetImageColourAssistant({ clearFile: true }));
imageColourCanvas.addEventListener("click", handleImageColourCanvasClick);
document.querySelectorAll("[data-colour-target-select]").forEach((input) => {
  const selectTarget = () => setActiveImageColourTarget(input.dataset.colourTargetSelect);
  input.addEventListener("click", selectTarget);
  input.addEventListener("focus", selectTarget);
});
viewMoreImageColoursBtn.addEventListener("click", () => {
  imageColourState.paletteExpanded = !imageColourState.paletteExpanded;
  renderImageColourPalette();
});
productNameInput.addEventListener("input", () => {
  inferProductSelectionFromName();
  variantOffset = 0;
  scheduleGenerate();
});
[mainColourShirtInput, mainColourShortsInput, mainColourSocksInput, badgeLeagueInput].forEach((field) => {
  field.addEventListener("input", () => {
    if (field === badgeLeagueInput) {
      if (tabSuggestionContext?.type !== "badge") delete badgeLeagueInput.dataset.tabSuggestionQuery;
      renderBadgeLeagueSuggestions();
    }
    if (isApplyingTabSuggestion) return;
    variantOffset = 0;
    scheduleGenerate();
  });
});
badgeLeagueInput.addEventListener("focus", () => setBadgeLeagueSuggestionsOpen(true));
badgeLeagueInput.addEventListener("blur", () => {
  window.setTimeout(() => setBadgeLeagueSuggestionsOpen(false), 150);
});
badgeLeagueInput.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    tabSuggestionContext = { type: "badge" };
    badgeLeagueInput.dataset.tabSuggestionQuery = badgeLeagueInput.value;
    selectBadgeLeagueSuggestion(0, true);
    return;
  }
  if (tabSuggestionContext?.type === "badge") {
    const direction = suggestionDirection(event);
    if (direction) {
      event.preventDefault();
      selectBadgeLeagueSuggestion(direction);
      return;
    }
  }
  if (event.key === "Escape") setBadgeLeagueSuggestionsOpen(false);
});
productOtherKitType.addEventListener("input", () => {
  syncProductSelectionFields();
  variantOffset = 0;
  scheduleGenerate();
});
[productPrintName, productPrintNumber].forEach((field) => {
  field.addEventListener("input", () => {
    isPrintInferredFromProductName = false;
  });
});
[
  productAudienceSelect,
  productKindSelect,
  productKitTypeSelect,
  productSocksSelect,
  productPrintSelect,
  badgeStatusSelect
].forEach((field) => {
  field.addEventListener("change", () => {
    if (field === productPrintSelect) isPrintInferredFromProductName = false;
    syncProductSelectionFields();
    if (isApplyingTabSuggestion) return;
    variantOffset = 0;
    scheduleGenerate();
  });
});
badgeChampionToggle.addEventListener("click", () => {
  if (badgeChampionToggle.disabled) return;
  setBadgeChampionStatus(badgeChampionInput.value !== "champion");
  variantOffset = 0;
  scheduleGenerate();
});
form.querySelectorAll("select").forEach((select) => {
  select.addEventListener("change", () => {
    syncProductTypeDefaults();
    syncAnotherInputs();
  });
});
copyBtn.addEventListener("click", async () => {
  if (!htmlOutput.value) return;
  await navigator.clipboard.writeText(htmlOutput.value);
  copyBtn.textContent = "Copied";
  window.setTimeout(() => {
    copyBtn.textContent = "Copy HTML";
  }, 1200);
});
bundleRecipientSelect.addEventListener("change", () => {
  const suggestedAudience = {
    dad: "men",
    mum: "women",
    men: "men",
    women: "women",
    son: "kids",
    daughter: "kids",
    child: "kids",
    adult: "adult",
    kid: "kids"
  }[bundleRecipientSelect.value];
  if (suggestedAudience) setEnhancedSelectValue(bundleAudienceSelect, suggestedAudience);
  syncBundleItemControls();
});
bundleForm.elements.bundle_name.addEventListener("input", () => { variantOffset = 0; });
bundleTypeChoices.querySelectorAll("[data-bundle-type]").forEach((button) => {
  button.addEventListener("click", () => {
    bundleTypeSelect.value = button.dataset.bundleType;
    bundleTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
});
bundleTypeSelect.addEventListener("change", () => {
  variantOffset = 0;
  syncBundleTypeControls();
  renderBundleItemsList();
});
bundleProductName.addEventListener("input", inferBundlePieceFromName);
[bundleAudienceSelect, bundleProductSelect, bundleKitTypeSelect, bundleSocksSelect, bundlePrintSelect, bundlePersonalisationSelect, bundleBadgeStatusSelect]
  .forEach((field) => field.addEventListener("change", syncBundleItemControls));
bundleCustomSizeRangeToggle.addEventListener("change", syncBundleItemControls);
bundleBadgeChampionToggle.addEventListener("click", () => {
  if (bundleBadgeStatusSelect.value !== "available") return;
  setBundleBadgeChampionStatus(!bundleBadgeChampionToggle.classList.contains("active"));
});
addBundleItemBtn.addEventListener("click", addSelectedBundleItem);
cancelBundlePieceEditBtn.addEventListener("click", resetBundlePieceEditor);
bundleItemAnother.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addSelectedBundleItem();
});
bundleImageColourFileInput.addEventListener("change", handleBundleImageColourFileChange);
bundleUseImageTitleBtn.addEventListener("click", useBundleImageTitle);
bundleClearImageColourBtn.addEventListener("click", () => resetBundleImageColourAssistant({ clearFile: true }));
bundleImageColourCanvas.addEventListener("click", handleBundleImageColourCanvasClick);
document.querySelectorAll("[data-bundle-colour-target-select]").forEach((input) => {
  const selectTarget = () => setActiveBundleImageColourTarget(input.dataset.bundleColourTargetSelect);
  input.addEventListener("click", selectTarget);
  input.addEventListener("focus", selectTarget);
});
bundleViewMoreImageColoursBtn.addEventListener("click", () => {
  bundleImageColourState.paletteExpanded = !bundleImageColourState.paletteExpanded;
  renderBundleImageColourPalette();
});

renderBundleBadgeLeagueOptions();
enhanceSelects();
loadSample();
syncProductTypeDefaults();
syncAnotherInputs();
syncBundleItemControls();
syncBundleTypeControls();
renderBundleItemsList();
