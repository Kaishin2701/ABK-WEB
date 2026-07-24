const productChecker = (() => {
  const proxyProviders = [
    {
      name: 'Jina Reader Text',
      type: 'text',
      buildUrl: (url) => `https://r.jina.ai/${url}`
    },
    {
      name: 'AllOrigins HTML',
      type: 'html',
      buildUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    },
    {
      name: 'CorsProxy HTML',
      type: 'html',
      buildUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
    },
    {
      name: 'Direct HTML',
      type: 'html',
      buildUrl: (url) => url
    }
  ];

  let checkedProducts = [];

  function init() {
    const btn = document.getElementById('btn-product-fetch');
    const input = document.getElementById('product-url');

    if (!btn || !input) return;

    btn.addEventListener('click', fetchFromInput);
    input.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') fetchFromInput();
    });
  }

  async function fetchFromInput() {
    const input = document.getElementById('product-url');
    const urls = parseProductUrls(input.value);

    if (!urls.length) {
      alert('Please enter at least one product URL.');
      return;
    }

    const invalidUrl = urls.find((url) => !/^https?:\/\//i.test(url));
    if (invalidUrl) {
      alert(`URL must start with http:// or https://\n${invalidUrl}`);
      return;
    }

    setLoading(true, `Checking 0/${urls.length} products...`);
    clearResult();
    checkedProducts = urls.map((url) => ({ sourceUrl: url, url, status: 'PENDING' }));
    renderBatchResults();

    for (let index = 0; index < urls.length; index++) {
      const url = urls[index];
      setStatus(`Checking ${index + 1}/${urls.length}: ${url}`);
      checkedProducts[index] = { sourceUrl: url, url, status: 'CHECKING' };
      renderBatchResults();

      try {
        checkedProducts[index] = await checkProductUrl(url);
      } catch (error) {
        checkedProducts[index] = buildFetchErrorProduct(url, error);
      }
      renderBatchResults();
    }

    const failed = checkedProducts.filter((product) => getProductFailedCases(product).length > 0).length;
    setLoading(false, `Done. Checked ${checkedProducts.length} products. Failed: ${failed}.`);
  }

  async function checkProductUrl(url) {
    const page = await fetchProductPage(url);
    const product = parseProductContent(page.content, url, page.type, page.provider);
    await enrichProductWithStoreApi(product, url);
    applyProductCaseTests(product);
    product.fetchProvider = product.fetchProvider || page.provider;
    return product;
  }

  function parseProductUrls(value) {
    const seen = new Set();
    return String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((url) => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
  }

  function buildFetchErrorProduct(url, error) {
    return {
      sourceUrl: url,
      url,
      sku: '',
      status: 'ERROR',
      fetch_error: error.message,
      fetch_error_case: {
        case: 'Fetch Case',
        status: 'FAIL',
        issue_count: 1,
        findings: [{ issue: 'fetch_failed', message: error.message }]
      }
    };
  }
  async function fetchProductPage(url) {
    const attempts = [];

    for (const provider of proxyProviders) {
      const requestUrl = provider.buildUrl(url);
      try {
        setStatus(`Fetching via ${provider.name}...`);
        const response = await fetchWithTimeout(requestUrl, { method: 'GET' }, 30000);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const content = await response.text();
        if (!content || content.length < 200) {
          throw new Error('Response is too short to be a product page.');
        }

        return { content, type: provider.type, provider: provider.name };
      } catch (error) {
        attempts.push(`${provider.name}: ${error.message}`);
      }
    }

    throw new Error(`Unable to fetch URL. Tried ${attempts.join(' | ')}`);
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Timeout');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function enrichProductWithStoreApi(product, url) {
    const slug = getProductSlug(url);
    if (!slug) return product;

    try {
      setStatus('Fetching variation details from Store API...');
      const apiProduct = await fetchJson(`https://kidsfootballkit.co.uk/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}`);
      const parent = Array.isArray(apiProduct) ? apiProduct[0] : apiProduct;
      if (!parent || !parent.id) return product;

      product.url = product.sourceUrl || url;
      product.sourceUrl = product.sourceUrl || url;
      product.page_price = product.page_price || product.price || '';
      product.page_regular_price = product.page_regular_price || product.regularPrice || '';
      product.title = cleanText(decodeHtml(parent.name || product.title || '').replace(/^#+\s*/, ''));
      product.sku = cleanText(parent.sku || product.sku || '');
      product.store_api_price = priceToNumber(parent.prices && parent.prices.price, parent.prices);
      product.base_price = product.store_api_price;
      product.price = product.page_price || product.store_api_price || product.price;
      product.regularPrice = product.page_regular_price || priceToNumber(parent.prices && parent.prices.regular_price, parent.prices) || product.regularPrice;
      product.currency = (parent.prices && parent.prices.currency_code) || product.currency || '';
      product.review_count = Number(parent.review_count || 0);
      product.categories = Array.isArray(parent.categories) ? parent.categories.map((item) => item.name).filter(Boolean) : product.categories;
      product.tags = Array.isArray(parent.tags) ? parent.tags.map((item) => item.name).filter(Boolean) : product.tags;
      product.images = Array.isArray(parent.images) && parent.images.length ? parent.images.map((image) => image.src).filter(Boolean) : product.images;
      product.image_count = buildImageCount(parent.images || []);
      product.image_details = buildImageDetails(parent.images || []);
      product.product_attributes = buildStoreProductAttributes(parent.attributes || [], product.product_attributes);

      const variations = Array.isArray(parent.variations) ? parent.variations : [];
      const variationDetails = await Promise.all(variations.map((variation) => fetchVariationDetail(variation)));
      const sizePrices = variationDetails.filter(Boolean).map((variation) => normalizeVariationDetail(variation));
      if (sizePrices.length) product.size_prices = sizePrices;
    } catch (error) {
      product.store_api_error = error.message;
    }

    return product;
  }

  async function fetchVariationDetail(variation) {
    const id = variation && variation.id;
    if (!id) return null;
    try {
      return await fetchJson(`https://kidsfootballkit.co.uk/wp-json/wc/store/v1/products/${id}`);
    } catch (error) {
      return {
        id,
        variation: variation.attributes ? variation.attributes.map((attr) => `${attr.name}: ${attr.value}`).join(', ') : '',
        store_api_error: error.message
      };
    }
  }

  async function fetchJson(url) {
    try {
      const response = await fetchWithTimeout(url, { method: 'GET' }, 30000);
      if (!response.ok) throw new Error(`Store API HTTP ${response.status}`);
      const text = await response.text();
      return parsePossiblyWrappedJson(text);
    } catch (directError) {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const response = await fetchWithTimeout(jinaUrl, { method: 'GET' }, 30000);
      if (!response.ok) throw new Error(`Store API proxy HTTP ${response.status}`);
      const text = await response.text();
      try {
        return parsePossiblyWrappedJson(text);
      } catch (proxyError) {
        throw new Error(`${directError.message}; proxy parse failed: ${proxyError.message}`);
      }
    }
  }

  function parsePossiblyWrappedJson(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '').trim();
    let jsonText = clean;

    const marker = 'Markdown Content:';
    const markerIndex = clean.indexOf(marker);
    if (markerIndex >= 0) {
      jsonText = clean.slice(markerIndex + marker.length).trim();
    } else if (!/^[\[{]/.test(clean)) {
      const jsonStart = clean.search(/[\[{]/);
      if (jsonStart >= 0) jsonText = clean.slice(jsonStart).trim();
    }

    jsonText = extractBalancedJson(jsonText);
    jsonText = unescapeMarkdownJson(jsonText);

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      return JSON.parse(escapeControlCharsInJsonStrings(jsonText));
    }
  }

  function extractBalancedJson(value) {
    const text = String(value || '').trim();
    const start = text.search(/[\[{]/);
    if (start === -1) throw new Error('No JSON payload found');

    const stack = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{' || char === '[') stack.push(char);
      if (char === '}' || char === ']') {
        const open = stack.pop();
        if ((char === '}' && open !== '{') || (char === ']' && open !== '[')) {
          throw new Error('JSON bracket mismatch');
        }
        if (!stack.length) return text.slice(start, i + 1);
      }
    }

    return text.slice(start);
  }

  function unescapeMarkdownJson(value) {
    return String(value || '')
      .replace(/\\_/g, '_')
      .replace(/\\-/g, '-')
      .replace(/\\\*/g, '*');
  }

  function escapeControlCharsInJsonStrings(jsonText) {
    let output = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i];
      const code = char.charCodeAt(0);

      if (escaped) {
        output += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        output += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        output += char;
        inString = !inString;
        continue;
      }

      if (inString && code < 0x20) {
        if (char === '\n') output += '\\n';
        else if (char === '\r') output += '\\r';
        else if (char === '\t') output += '\\t';
        else output += ' ';
        continue;
      }

      output += char;
    }

    return output;
  }

  function normalizeVariationDetail(variation) {
    const prices = variation.prices || {};
    const image = Array.isArray(variation.images) && variation.images.length ? variation.images[0] : {};

    return {
      size: extractSizeFromVariation(variation),
      sku: cleanText(variation.sku || ''),
      price: priceToNumber(prices.price, prices),
      regular_price: priceToNumber(prices.regular_price, prices),
      sale_price: priceToNumber(prices.sale_price, prices),
      variation_id: variation.id || null,
      in_stock: Boolean(variation.is_in_stock),
      image: image.src || '',
      image_thumbnail: image.thumbnail || '',
      image_id: image.id || null,
      image_alt: image.alt || ''
    };
  }

  function extractSizeFromVariation(variation) {
    const variationText = cleanText(variation.variation || '');
    const fromText = variationText.match(/Size:\s*([^,]+)/i);
    if (fromText) return fromText[1].toUpperCase();

    const attrs = Array.isArray(variation.attributes) ? variation.attributes : [];
    const sizeAttr = attrs.find((attr) => /size/i.test(attr.name || ''));
    return sizeAttr ? String(sizeAttr.value || '').toUpperCase() : '';
  }

  function buildStoreProductAttributes(attributes, fallback) {
    const result = { ...(fallback || {}) };
    attributes.forEach((attr) => {
      const key = slugifyAttributeName(attr.name || attr.taxonomy || 'attribute');
      result[key] = Array.isArray(attr.terms) ? attr.terms.map((term) => term.name).filter(Boolean) : [];
    });
    return result;
  }

  function buildImageCount(images) {
    const count = Array.isArray(images) ? images.length : 0;
    return { main: count ? 1 : 0, gallery: count > 1 ? count - 1 : 0, total: count };
  }

  function buildImageDetails(images) {
    return (Array.isArray(images) ? images : []).map((image, index) => ({
      index,
      id: image.id || null,
      src: image.src || '',
      thumbnail: image.thumbnail || '',
      alt: image.alt || '',
      name: image.name || '',
      role: index === 0 ? 'main' : 'gallery'
    }));
  }

  function priceToNumber(value, prices) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const minorUnit = prices && Number.isFinite(Number(prices.currency_minor_unit)) ? Number(prices.currency_minor_unit) : 2;
    return number / Math.pow(10, minorUnit);
  }

  function getProductSlug(url) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const productIndex = parts.indexOf('product');
      return productIndex >= 0 ? parts[productIndex + 1] : parts[parts.length - 1];
    } catch (error) {
      return '';
    }
  }

  function decodeHtml(value) {
    const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
    return doc.documentElement.textContent || '';
  }

  function slugifyAttributeName(value) {
    return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'attribute';
  }
  function applyProductCaseTests(product) {
    product.printed = detectPrinted(product);
    product.price_case = runPriceCase(product);
    product.forbidden_terms_case = runForbiddenTermsCase(product);
    product.alt_text_case = runAltTextCase(product);
    product.size_chart_case = runSizeChartCase(product);
    product.url_name_case = runUrlNameCase(product);
    product.personalise_option_case = runPersonaliseOptionCase(product);
    product.description_sku_case = runDescriptionSkuCase(product);
    return product;
  }

  function runPriceCase(product) {
    const classification = classifyPriceProduct(product);
    const expected = getExpectedPrice(classification);
    const actualBase = getActualPriceForPriceCase(product, classification, expected);
    const variations = Array.isArray(product.size_prices) ? product.size_prices : [];

    const result = {
      case: 'Price Case',
      currency: 'GBP',
      status: 'SKIP',
      product_type: classification.productType,
      bundle: classification.isBundle,
      socks: classification.socks,
      printed: classification.isPrinted,
      expected_price: expected,
      actual_base_price: actualBase,
      checks: [],
      reason: classification.reason
    };

    if (expected === null) {
      result.reason = classification.reason || 'No matching price rule for this product.';
      return result;
    }

    if (actualBase !== null) {
      result.checks.push(buildPriceCheck('base_price', actualBase, expected, product.sku || ''));
    }

    variations.forEach((variation) => {
      result.checks.push(buildPriceCheck(`size:${variation.size || variation.variation_id || 'unknown'}`, toComparablePrice(variation.price), expected, variation.sku || '', variation.variation_id || null));
    });

    if (!result.checks.length) {
      result.status = 'SKIP';
      result.reason = 'No price value found to compare.';
      return result;
    }

    result.status = result.checks.every((check) => check.pass) ? 'PASS' : 'FAIL';
    return result;
  }

  function getActualPriceForPriceCase(product, classification, expected) {
    const variations = Array.isArray(product.size_prices) ? product.size_prices : [];
    const variationPrices = variations.map((variation) => toComparablePrice(variation.price)).filter((price) => price !== null);

    if (classification.isBundle) {
      const pagePrice = toComparablePrice(product.page_price || product.price);
      if (pagePrice !== null) return pagePrice;

      const matchingVariationPrice = variationPrices.find((price) => expected !== null && roundMoney(price) === roundMoney(expected));
      if (matchingVariationPrice !== undefined) return matchingVariationPrice;

      if (variationPrices.length) return variationPrices[0];
    }

    const basePrice = toComparablePrice(product.base_price !== undefined ? product.base_price : product.price);
    if (basePrice !== null) return basePrice;
    return toComparablePrice(product.page_price || product.price);
  }
  function buildPriceCheck(target, actual, expected, sku, variationId) {
    return {
      target,
      sku,
      variation_id: variationId || null,
      expected,
      actual,
      diff: actual === null ? null : roundMoney(actual - expected),
      pass: actual !== null && roundMoney(actual) === roundMoney(expected)
    };
  }

  function runDescriptionSkuCase(product) {
    const rules = getDescriptionSkuRules();
    const skuTokens = extractSkuTokens(product.sku);
    const matchedRules = rules.filter((rule) => skuTokens.includes(rule.token));
    const descriptionText = normalizeCaseText([
      product.title,
      product.description,
      product.long_description,
      product.short_description,
      Array.isArray(product.description_headings) ? product.description_headings.join(' ') : ''
    ].join(' '));
    const findings = [];

    matchedRules.forEach((rule) => {
      const hasKeyword = rule.keywords.some((keyword) => new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword.toLowerCase())}([^a-z0-9]|$)`, 'i').test(descriptionText));
      if (!hasKeyword) {
        findings.push({
          issue: 'missing_description_keyword',
          sku_token: rule.token,
          expected: rule.label,
          keywords: rule.keywords,
          message: `SKU contains ${rule.token}, so description should mention ${rule.label}.`
        });
      }
    });

    return {
      case: 'Description SKU Case',
      status: findings.length ? 'FAIL' : 'PASS',
      sku_tokens: matchedRules.map((rule) => rule.token),
      checked_rules: matchedRules.length,
      issue_count: findings.length,
      findings
    };
  }

  function getDescriptionSkuRules() {
    return [
      { token: 'HO', label: 'Home', keywords: ['home'] },
      { token: 'AW', label: 'Away', keywords: ['away'] },
      { token: 'TH', label: 'Third', keywords: ['third'] },
      { token: 'GK', label: 'Goalkeeper', keywords: ['goalkeeper'] },
      { token: 'TN', label: 'Training', keywords: ['training'] }
    ];
  }

  function extractSkuTokens(sku) {
    return String(sku || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  }
  function runPersonaliseOptionCase(product) {
    const printed = product.printed || detectPrinted(product);
    const options = Array.isArray(product.global_form) ? product.global_form : [];
    const personaliseOptions = options.filter(isPersonaliseOption);
    const findings = [];

    if (printed.is_printed && personaliseOptions.length) {
      findings.push({
        issue: 'unexpected_personalise_option',
        message: 'Printed products should not show the Personalise option.',
        expected: 'No Personalise option',
        actual: `${personaliseOptions.length} Personalise option(s) found`,
        context: personaliseOptions.map((option) => option.label || option.name || '').filter(Boolean).join(' | ')
      });
    }

    if (!printed.is_printed && !personaliseOptions.length) {
      findings.push({
        issue: 'missing_personalise_option',
        message: 'Non-printed products should show the Personalise option.',
        expected: 'Personalise option found',
        actual: 'No Personalise option found',
        context: printed.reason || ''
      });
    }

    return {
      case: 'Personalise Option Case',
      status: findings.length ? 'FAIL' : 'PASS',
      printed: Boolean(printed.is_printed),
      printed_source: printed.source || '',
      option_count: options.length,
      personalise_option_count: personaliseOptions.length,
      issue_count: findings.length,
      findings
    };
  }

  function isPersonaliseOption(option) {
    const text = normalizeCaseText([
      option && option.name,
      option && option.label,
      option && option.type,
      JSON.stringify((option && option.values) || [])
    ].join(' '));
    return /personalise|personalize|name number|preferred name|preferred number/.test(text);
  }
  function runUrlNameCase(product) {
    const title = cleanText(String(product.title || '').replace(/^#+\s*/, ''));
    const sourceUrl = product.sourceUrl || product.url || '';
    const slug = getProductSlug(sourceUrl).toLowerCase();
    const findings = [];
    const rules = getClubNameChangeRules();

    rules.forEach((rule) => {
      const originalRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(rule.club.toLowerCase()).replace(/\s+/g, '\\s+')}([^a-z0-9]|$)`, 'i');
      const displayRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(rule.displayName.toLowerCase()).replace(/\s+/g, '\\s+')}([^a-z0-9]|$)`, 'i');
      const originalInTitle = originalRegex.test(title);
      const displayInTitle = displayRegex.test(title);
      const originalSlug = slugifyForCase(rule.club);
      const originalInSlug = slug.includes(originalSlug);
      const mappedInSlug = slug.includes(rule.urlSlug);

      if (originalInTitle) {
        findings.push({
          issue: 'blocked_club_name_in_title',
          field: 'title',
          found: rule.club,
          replace_with: rule.displayName,
          context: title
        });
      }

      if ((originalInSlug || displayInTitle || originalInTitle) && !mappedInSlug) {
        findings.push({
          issue: 'incorrect_url_slug',
          field: 'url',
          found: slug || sourceUrl,
          replace_with: rule.urlSlug,
          context: sourceUrl
        });
      }
    });

    return {
      case: 'URL / Name Case',
      status: findings.length ? 'FAIL' : 'PASS',
      checked_rules: rules.length,
      issue_count: findings.length,
      findings
    };
  }

  function getClubNameChangeRules() {
    return [
      { club: 'Liverpool', displayName: 'L-v-kids-football-kit', urlSlug: 'l-v-kids-football-kit' },
      { club: 'Arsenal', displayName: 'Arse-n-al', urlSlug: 'ar-snl' },
      { club: 'Manchester United', displayName: 'Man-U-nited', urlSlug: 'm-u' },
      { club: 'PSG', displayName: 'P-SG', urlSlug: 'p-g' },
      { club: 'Bayern Munich', displayName: 'Bay-rn M-n', urlSlug: 'b-m' },
      { club: 'Dortmund', displayName: 'Dort-mund', urlSlug: 'd-m' }
    ];
  }

  function slugifyForCase(value) {
    return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function runSizeChartCase(product) {
    const rule = classifySizeChartRule(product);
    const altValidation = validateSizeChartAltText(product, rule);
    const findings = [...altValidation.findings];

    if (!rule.shortcodes.length) {
      return {
        case: 'Size Chart Case',
        status: 'SKIP',
        product_type: rule.productType,
        sku_indicator: rule.skuIndicator,
        expected_shortcodes: [],
        expected_size_chart_alts: altValidation.expectedAlts,
        size_chart_images: altValidation.images,
        issue_count: 1,
        findings: [{ issue: 'unknown_sku_indicator', message: rule.reason || 'SKU does not contain AD, KD, WM, or ADK.' }]
      };
    }

    return {
      case: 'Size Chart Case',
      status: findings.length ? 'FAIL' : 'PASS',
      product_type: rule.productType,
      sku_indicator: rule.skuIndicator,
      expected_shortcodes: rule.shortcodes,
      expected_size_chart_alts: altValidation.expectedAlts,
      size_chart_images: altValidation.images,
      issue_count: findings.length,
      findings
    };
  }

  function classifySizeChartRule(product) {
    const sku = String(product.sku || '').toUpperCase();

    if (hasSkuIndicator(sku, 'ADK')) {
      return { productType: 'Adult Football Kit (shirt + shorts)', skuIndicator: 'ADK', shortcodes: ['[kfk_size_adult]'] };
    }

    if (hasSkuIndicator(sku, 'WM')) {
      return { productType: 'Women Football Shirt', skuIndicator: 'WM', shortcodes: ['[kfk_size_women]'] };
    }

    if (hasSkuIndicator(sku, 'KD')) {
      return { productType: 'Kids Football Kit', skuIndicator: 'KD', shortcodes: ['[kfk_size_kids]'] };
    }

    if (hasSkuIndicator(sku, 'AD')) {
      return { productType: 'Men Football Shirt', skuIndicator: 'AD', shortcodes: ['[kfk_size_men]'] };
    }

    if (hasSkuIndicator(sku, 'BABY')) {
      return { productType: 'Baby Football Kit', skuIndicator: 'Baby', shortcodes: ['[kfk_size_baby]'] };
    }

    return { productType: 'Unknown', skuIndicator: '', shortcodes: [], reason: 'SKU does not contain AD, KD, WM, ADK, or Baby indicator.' };
  }

  function hasSkuIndicator(sku, indicator) {
    return new RegExp(`(^|[^A-Z0-9])${indicator}([^A-Z0-9]|$)`).test(String(sku || '').toUpperCase());
  }

  function validateSizeChartAltText(product, rule) {
    const expectedGroups = getSizeChartAltGroups(rule);
    const expectedAlts = expectedGroups.flatMap((group) => group.alts);
    const images = getSizeChartImages(product);
    const findings = [];

    if (!expectedAlts.length) return { expectedAlts: [], images, findings };

    expectedGroups.forEach((group) => {
      const hasValidAlt = images.some((image) => group.normalized.has(normalizeAltText(image.alt)));
      if (!hasValidAlt) {
        findings.push({
          issue: 'missing_valid_size_chart_alt',
          message: `Size chart image alt should match the approved ${group.label} alt text list.`,
          expected_alts: group.alts,
          current_alt: images.map((image) => image.alt).filter(Boolean).join(' | ') || 'No size chart image alt found'
        });
      }
    });

    images.forEach((image) => {
      const normalizedAlt = normalizeAltText(image.alt);
      if (normalizedAlt && expectedGroups.some((group) => group.normalized.has(normalizedAlt))) return;
      findings.push({
        issue: 'invalid_size_chart_alt',
        target: image.target,
        image: image.src,
        message: 'Size chart image uses an alt text that is not in the approved list for this product type.',
        current_alt: image.alt || '',
        expected_alts: expectedAlts
      });
    });

    return { expectedAlts, images, findings };
  }

  function getSizeChartImages(product) {
    return getAltTextImages(product)
      .map((image, index) => ({
        target: `image:${index + 1}`,
        src: image.src || image.image || '',
        alt: cleanText(image.alt || image.image_alt || ''),
        name: image.name || '',
        thumbnail: image.thumbnail || image.image_thumbnail || ''
      }))
      .filter(isSizeChartImage);
  }

  function isSizeChartImage(image) {
    const text = `${image.src || ''} ${image.thumbnail || ''} ${image.name || ''} ${image.alt || ''}`.toLowerCase();
    return /size[\s\-_]*chart|kfk[\s\-_]*(adult|baby)|kids?[\s\-_]*football[\s\-_]*kit[\s\-_]*size|women[\s\-_]*shirt[\s\-_]*size|men[\s\-_]*shirt[\s\-_]*size/.test(text);
  }

  function getSizeChartAltGroups(rule) {
    const groups = [];
    if (rule.shortcodes.includes('[kfk_size_kids]')) {
      groups.push(buildSizeChartAltGroup('Kids Football Kit', ['Kids Football Kit Size Chart']));
    }
    if (rule.shortcodes.includes('[kfk_size_men]')) {
      groups.push(buildSizeChartAltGroup('Men Football Shirt', [
        'kfk-men-football-shirt-size-chart-3xl-4xl-final-2026',
        'KFK_size chart_men shirt normal',
        'KFK_size chart_men shirt _3xl4xl',
        'KFK_size chart_men shirt',
        'KFK_size chart_men shirt 3xl4xl',
        'KFK Men Shirt Size Chart'
      ]));
    }
    if (rule.shortcodes.includes('[kfk_size_adult]')) {
      groups.push(buildSizeChartAltGroup('Adult Football Kit', ['KFK Adult Kit Size Chart']));
    }
    if (rule.shortcodes.includes('[kfk_size_women]')) {
      groups.push(buildSizeChartAltGroup('Women Football Shirt', [
        'KFK-Women-Size-Chart-Update2026',
        'Women-Shirt-Size-Chart'
      ]));
    }
    if (rule.shortcodes.includes('[kfk_size_baby]')) {
      groups.push(buildSizeChartAltGroup('Baby Football Kit', ['KFK baby size chart']));
    }
    return groups;
  }

  function buildSizeChartAltGroup(label, alts) {
    return {
      label,
      alts,
      normalized: new Set(alts.map(normalizeAltText))
    };
  }

  function normalizeAltText(value) {
    return cleanText(value).toLowerCase().replace(/[_\s-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function validateSizeChartData(product, description, rule) {
    const normalized = normalizeSizeText(description);
    const findings = [];
    const hasTableData = /height\s*\(cm\)|weight\s*\(kg\)|chest\s*\(cm\)|shirt length|recommended age|top length|shorts length/i.test(description);
    if (!hasTableData) return findings;

    if (rule.shortcodes.includes('[kfk_size_kids]')) {
      getKidsSizeRows().forEach((row) => {
        if (!row.every((cell) => normalized.includes(normalizeSizeText(cell)))) {
          findings.push({ issue: 'size_data_mismatch', expected_row: row.join(' | '), message: 'Kids size chart data row was not found in description.' });
        }
      });
    }

    if (rule.shortcodes.includes('[kfk_size_men]') || rule.shortcodes.includes('[kfk_size_adult]')) {
      getMenSizeRows().forEach((row) => {
        if (!row.every((cell) => normalized.includes(normalizeSizeText(cell)))) {
          findings.push({ issue: 'size_data_mismatch', expected_row: row.join(' | '), message: 'Men/adult size chart data row was not found in description.' });
        }
      });
    }

    if (rule.shortcodes.includes('[kfk_size_women]')) {
      getWomenSizeRows().forEach((row) => {
        if (!row.every((cell) => normalized.includes(normalizeSizeText(cell)))) {
          findings.push({ issue: 'size_data_mismatch', expected_row: row.join(' | '), message: 'Women size chart data row was not found in description.' });
        }
      });
    }

    return findings;
  }

  function normalizeSizeText(value) {
    return String(value || '').toLowerCase().replace(/[--]/g, '-').replace(/\s+/g, ' ').trim();
  }

  function getKidsSizeRows() {
    return [
      ['16', '3-4 yrs', '95-105', '70', '44', '32'],
      ['18', '4-5 yrs', '105-115', '74', '47', '34'],
      ['20', '5-6 yrs', '115-125', '78', '50', '36'],
      ['22', '7-8 yrs', '125-135', '82', '53', '38'],
      ['24', '8-9 yrs', '135-145', '86', '56', '39'],
      ['26', '10-11 yrs', '145-155', '90', '59', '40'],
      ['28', '12-13 yrs', '155-165', '94', '62', '43']
    ];
  }

  function getMenSizeRows() {
    return [
      ['S', '165-172', '55-65', '96-100', '73'],
      ['M', '170-178', '65-75', '100-104', '75'],
      ['L', '175-182', '75-85', '104-108', '77'],
      ['XL', '180-188', '85-95', '108-114', '79'],
      ['XXL', '185-192', '95-105', '114-120', '81']
    ];
  }

  function getWomenSizeRows() {
    return [
      ['S', '155-165', '40-52.5', '66', '42'],
      ['M', '165-170', '52.5-57.5', '68', '44.5'],
      ['L', '170-175', '57.5-65', '70', '47'],
      ['XL', '175-180', '65-70', '72', '49.5'],
      ['2XL', '180-185', '70-75', '74', '52']
    ];
  }
  function runAltTextCase(product) {
    const images = getAltTextImages(product);
    const findings = [];
    const skippedImages = [];
    const seen = new Map();
    const requiredAngles = getRequiredAltAngleWords();

    images.forEach((image, index) => {
      const alt = cleanText(image.alt || image.image_alt || '');
      const target = `image:${index + 1}`;
      const src = image.src || image.image || '';
      const supportType = getSupportImageType(image);

      if (supportType) {
        skippedImages.push({ target, image: src, alt, reason: `Support image: ${supportType}` });
        return;
      }

      if (!alt) {
        findings.push(buildAltFinding(target, src, 'missing_alt', 'Product images must have alt text.', suggestAltText(product, image, index)));
        return;
      }

      const altKey = normalizeAltText(alt);
      if (seen.has(altKey)) {
        findings.push(buildAltFinding(target, src, 'duplicate_alt', `Alt text must be unique. This alt is also used by ${seen.get(altKey)}.`, suggestAltText(product, image, index), alt));
      } else {
        seen.set(altKey, target);
      }

      if (!hasRequiredAltAngle(alt)) {
        findings.push(buildAltFinding(target, src, 'missing_angle_word', `Alt text must include one of: ${requiredAngles.join(', ')}.`, suggestAltText(product, image, index), alt));
      }
    });

    return {
      case: 'Alt Text Case',
      status: findings.length ? 'FAIL' : 'PASS',
      required_angle_words: requiredAngles,
      image_count: images.length,
      product_image_count: images.length - skippedImages.length,
      skipped_image_count: skippedImages.length,
      skipped_images: skippedImages,
      issue_count: findings.length,
      findings
    };
  }
  function getAltTextImages(product) {
    if (Array.isArray(product.image_details) && product.image_details.length) return product.image_details;
    return (Array.isArray(product.images) ? product.images : []).map((src, index) => ({ index, src, alt: '' }));
  }

  function getSupportImageType(image) {
    const normalizedImage = {
      src: image.src || image.image || '',
      thumbnail: image.thumbnail || image.image_thumbnail || '',
      name: image.name || '',
      alt: image.alt || image.image_alt || ''
    };
    if (isSizeChartImage(normalizedImage)) return 'size chart';

    const text = `${normalizedImage.src} ${normalizedImage.thumbnail} ${normalizedImage.name} ${normalizedImage.alt}`.toLowerCase();
    const supportRules = [
      { type: 'review/trustpilot', regex: /trustpilot|truspilot|review|rating|stars?/ },
      { type: 'faq', regex: /faq|question|help/ },
      { type: 'delivery infographic', regex: /delivery|shipping|inforgraphic|infographic/ },
      { type: 'logo/brand asset', regex: /logo-kfk|logo\.jpg|kidsfootballkit\.co\.uk logo/ },
      { type: 'care instructions', regex: /washing|care|cold water|tumble|bleach|hang dry|instructions/ },
      { type: 'badge option graphic', regex: /premier-league-badges|badge option|badges\.png/ }
    ];

    const rule = supportRules.find((item) => item.regex.test(text));
    return rule ? rule.type : '';
  }
  function buildAltFinding(target, src, issue, message, suggestedAlt, currentAlt) {
    return {
      target,
      issue,
      message,
      current_alt: currentAlt || '',
      suggested_alt: suggestedAlt,
      image: src
    };
  }

  function buildAltFocusKeyword(product) {
    return cleanText(String(product.title || '').replace(/^#+\s*/, '').replace(/\s+[--|].*$/, ''));
  }

  function getRequiredAltAngleWords() {
    return ['Front View', 'Back View', 'Close-up', 'Detail', 'With Socks', 'Shorts', 'Over View'];
  }

  function hasRequiredAltAngle(alt) {
    const normalized = normalizeAltText(alt);
    return getRequiredAltAngleWords().some((angle) => normalized.includes(normalizeAltText(angle)));
  }

  function hasKeywordOverlap(alt, keyword) {
    const altWords = significantWords(alt);
    const keywordWords = significantWords(keyword);
    if (!keywordWords.length) return true;
    const matches = keywordWords.filter((word) => altWords.includes(word));
    return matches.length >= Math.min(3, keywordWords.length);
  }

  function significantWords(value) {
    const stopWords = new Set(['the', 'and', 'with', 'for', 'kit', 'football', 'shirt', 'view', 'home', 'away', 'third', 'adult', 'kids', 'kid', 'baby']);
    return cleanText(value).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stopWords.has(word));
  }

  function suggestAltText(product, image, index) {
    const keyword = buildAltFocusKeyword(product) || 'Football Kit';
    const srcText = `${image.src || image.image || ''} ${image.name || ''} ${image.alt || image.image_alt || ''}`.toLowerCase();
    const angle = inferImageAngle(srcText, index);
    return `${keyword} - ${angle}`;
  }

  function inferImageAngle(text, index) {
    if (/front/.test(text)) return 'Front View';
    if (/back/.test(text)) return 'Back View';
    if (/close|detail/.test(text)) return 'Close-up';
    if (/sock/.test(text)) return 'With Socks';
    if (/short/.test(text)) return 'Shorts';
    if (/over|overview/.test(text)) return 'Over View';
    return index === 0 ? 'Over View' : 'Detail';
  }
  function runForbiddenTermsCase(product) {
    const fields = getDescriptionFields(product);
    const findings = [];
    const rules = getForbiddenTermRules().sort((a, b) => b.find.length - a.find.length);

    fields.forEach(({ field, value }) => {
      const occupied = [];
      rules.forEach((rule) => {
        findTermMatches(value, rule.find).forEach((match) => {
          const overlaps = occupied.some((range) => match.index < range.end && match.end > range.start);
          if (overlaps) return;
          occupied.push({ start: match.index, end: match.end });
          findings.push({
            field,
            found: match.text,
            rule: rule.find,
            replace_with: rule.replaceWith,
            context: buildMatchContext(value, match.index, match.end)
          });
        });
      });
    });

    return {
      case: 'Forbidden Terms Case',
      status: findings.length ? 'FAIL' : 'PASS',
      scanned_fields: fields.map((item) => item.field),
      issue_count: findings.length,
      findings
    };
  }

  function getDescriptionFields(product) {
    const fields = [
      { field: 'short_description', value: product.short_description },
      { field: 'long_description', value: product.long_description },
      { field: 'description', value: product.description },
      { field: 'description_headings', value: Array.isArray(product.description_headings) ? product.description_headings.join('\n') : product.description_headings },
      { field: 'additional_information', value: product.additional_information ? JSON.stringify(product.additional_information) : '' }
    ];

    return fields
      .map((item) => ({ field: item.field, value: String(item.value || '') }))
      .filter((item) => item.value.trim());
  }

  function findTermMatches(value, term) {
    const matches = [];
    const escaped = escapeRegExp(term).replace(/\s+/g, '\\s+');
    const regex = new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, 'gi');
    let match;

    while ((match = regex.exec(value)) !== null) {
      const prefixLength = match[1] ? match[1].length : 0;
      const text = match[2];
      const index = match.index + prefixLength;
      matches.push({ index, end: index + text.length, text });
      if (regex.lastIndex === match.index) regex.lastIndex++;
    }

    return matches;
  }

  function buildMatchContext(value, start, end) {
    const before = value.slice(Math.max(0, start - 55), start).trimStart();
    const found = value.slice(start, end);
    const after = value.slice(end, Math.min(value.length, end + 55)).trimEnd();
    return `${before}${before ? ' ' : ''}[${found}]${after ? ' ' : ''}${after}`;
  }

  function getForbiddenTermRules() {
    return [
      { find: 'official', replaceWith: 'football-inspired' },
      { find: 'official look', replaceWith: 'football-inspired look' },
      { find: 'official match', replaceWith: 'match-day inspired style' },
      { find: 'official feel', replaceWith: 'match-day feel' },
      { find: 'official style', replaceWith: 'football-inspired look' },
      { find: 'official design', replaceWith: 'football-inspired design' },
      { find: 'official kit', replaceWith: 'football-inspired kit' },
      { find: 'official crest', replaceWith: 'club-inspired chest graphic' },
      { find: 'Official Version', replaceWith: 'Fan-Style Kit' },
      { find: 'Official Ones', replaceWith: 'Match-Day Styles' },
      { find: 'official-inspired', replaceWith: 'Fan-Style Options' },
      { find: 'authentic', replaceWith: 'football-inspired' },
      { find: 'authentic look', replaceWith: 'football-inspired look' },
      { find: 'authentic-looking', replaceWith: 'football-inspired' },
      { find: 'authentic feel', replaceWith: 'comfortable match-day feel' },
      { find: 'authentic design', replaceWith: 'football-inspired design' },
      { find: 'Authentic Design', replaceWith: 'Fan-Inspired Design' },
      { find: 'authentic-inspired', replaceWith: 'football-inspired' },
      { find: 'exact design', replaceWith: 'inspired design' },
      { find: 'faithfully recreates', replaceWith: 'takes inspiration from' },
      { find: 'mirror the real shirts and kits', replaceWith: 'offer a familiar football-inspired style' },
      { find: 'carefully crafted to mirror the real shirts and kits', replaceWith: 'made with a football-inspired look and comfortable everyday feel' },
      { find: '98% identical', replaceWith: 'closely inspired' },
      { find: '98% identical to those of the originals', replaceWith: 'designed with a familiar football-inspired look' },
      { find: 'identical to the Official Version', replaceWith: 'Football-Inspired Match-Day Style' },
      { find: 'identical to the Official Ones', replaceWith: 'Inspired by Familiar Match-Day Styles' },
      { find: '100% identical to the Official Version', replaceWith: 'designed with a familiar football-inspired look' },
      { find: 'similar to the Official Version', replaceWith: 'Football-Inspired Alternative' },
      { find: 'same as the Official Ones', replaceWith: 'Inspired by Familiar Football Styles' },
      { find: 'genuine', replaceWith: 'quality / well-made' },
      { find: 'authenticity', replaceWith: 'quality craftsmanship' },
      { find: 'looks authentic', replaceWith: 'looks the part' },
      { find: 'adds authenticity', replaceWith: 'adds a fan-inspired finishing touch' },
      { find: 'the originals', replaceWith: 'familiar football styles' },
      { find: 'real shirts and kits', replaceWith: 'football shirts and kits' },
      { find: 'Nike', replaceWith: 'brand detail' },
      { find: 'Adidas', replaceWith: 'brand detail' },
      { find: 'Puma', replaceWith: 'brand detail' },
      { find: 'Errea / Errea', replaceWith: 'brand detail' },
      { find: 'Macron', replaceWith: 'brand detail' },
      { find: 'Nike logo', replaceWith: 'brand detail' },
      { find: 'Adidas logo', replaceWith: 'brand detail' },
      { find: 'Puma logo', replaceWith: 'brand detail' },
      { find: 'Nike swoosh', replaceWith: 'brand detail' },
      { find: 'swoosh', replaceWith: 'brand detail' },
      { find: 'three stripes', replaceWith: 'brand detail' },
      { find: 'Jordan', replaceWith: 'brand detail' },
      { find: 'Jordan Brand', replaceWith: 'brand detail' },
      { find: 'Air Jordan', replaceWith: 'brand detail' },
      { find: 'Black Jordan', replaceWith: 'brand detail' },
      { find: 'White Jordan', replaceWith: 'brand detail' },
      { find: 'Jordan Training', replaceWith: 'brand detail' },
      { find: 'Snapdragon', replaceWith: 'brand detail' },
      { find: 'Airways (Etihad Airways context)', replaceWith: 'brand detail' },
      { find: 'Louis Vuitton', replaceWith: 'brand detail' },
      { find: 'LV', replaceWith: 'brand detail' },
      { find: 'x Jordan', replaceWith: 'brand detail' },
      { find: 'club crest', replaceWith: 'chest detail' },
      { find: "club's crest", replaceWith: 'chest detail' },
      { find: 'team crest', replaceWith: 'chest detail' },
      { find: 'club badge', replaceWith: 'chest detail' },
      { find: 'team badge', replaceWith: 'chest detail' },
      { find: 'crest', replaceWith: 'chest detail' },
      { find: 'badge', replaceWith: 'chest detail' },
      { find: 'emblem', replaceWith: 'chest detail' },
      { find: 'logo', replaceWith: 'printed detail' },
      { find: 'duplicate of the original', replaceWith: 'inspired by classic football styles' },
      { find: 'original shirts', replaceWith: 'football shirts' },
      { find: 'precise duplicates', replaceWith: 'football-inspired designs' },
      { find: 'sponsor logo', replaceWith: 'front graphic' },
      { find: 'main sponsor', replaceWith: 'front graphic' },
      { find: 'shirt sponsor', replaceWith: 'front graphic' },
      { find: 'chest sponsor', replaceWith: 'front graphic' },
      { find: 'sleeve sponsor', replaceWith: 'sleeve detail' },
      { find: 'sponsor', replaceWith: 'front graphic' },
      { find: 'on the chest', replaceWith: 'on the front' },
      { find: 'across the chest', replaceWith: 'features' },
      { find: 'proudly displays', replaceWith: 'features' },
      { find: 'displays the', replaceWith: 'includes the' },
      { find: 'features the', replaceWith: 'includes the' },
      { find: 'showcases the', replaceWith: 'highlights the' },
      { find: 'complete with', replaceWith: 'comes with' },
      { find: 'Anfield', replaceWith: 'brand detail' },
      { find: 'Old Trafford', replaceWith: 'brand detail' }
    ];
  }
  function classifyPriceProduct(product) {
    const haystack = normalizeCaseText([
      product.title,
      product.sku,
      Array.isArray(product.categories) ? product.categories.join(' ') : '',
      Array.isArray(product.tags) ? product.tags.join(' ') : '',
      JSON.stringify(product.product_attributes || {})
    ].join(' '));

    const isBundle = detectBundleFromTitle(product.title) || /bundle/.test(haystack);
    const isRetro = /retro/.test(haystack);
    const isBaby = /baby|bodysuit/.test(haystack);
    const isKids = isBaby || /kids?|children|youth|kd|kid/.test(haystack);
    const isAdult = /adult|men|women|adk|\bad\b/.test(haystack);
    const isShirtOnly = /shirt/.test(haystack) && !/kit|short|socks|bundle/.test(haystack);
    const sockType = detectSockTypeFromTitle(product.title);
    const withSocks = sockType === 'with_socks';
    const noSocks = sockType === 'no_socks';
    const printed = detectPrinted(product).is_printed;

    if (isBundle) {
      if (printed) return { productType: 'Printed Bundle', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed };
      if (isShirtOnly || /shirt bundle/.test(haystack)) return { productType: "Men's Shirt Bundle", isBundle, socks: 'n/a', isPrinted: printed };
      return { productType: withSocks ? 'Kids Bundle - With Socks' : 'Kids Bundle - No Socks', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed };
    }

    if (isRetro) {
      return { productType: 'Retro Shirt / Retro Kids Kit', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed, reason: 'Retro products use +GBP 1 on top of base price; base reference is not available yet.' };
    }

    if (isShirtOnly) {
      return { productType: "Men's Shirt / Women's Shirt", isBundle, socks: 'n/a', isPrinted: printed };
    }

    if (isAdult && !isKids) {
      return { productType: withSocks ? 'Adult Kit - With Socks' : 'Adult Kit - No Socks', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed };
    }

    if (isAdult && isKids && /adult/.test(haystack)) {
      return { productType: withSocks ? 'Adult Kit - With Socks' : 'Adult Kit - No Socks', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed };
    }

    if (isKids) {
      return { productType: withSocks ? 'Kids Kit - With Socks' : 'Kids Kit - No Socks', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed, reason: isBaby ? 'Baby Kit is treated as Kids Kit because no separate Baby price rule was provided.' : '' };
    }

    return { productType: 'Unknown', isBundle, socks: withSocks ? 'with_socks' : noSocks ? 'no_socks' : 'unknown', isPrinted: printed, reason: 'Unable to classify product type from title, SKU, categories, tags, or attributes.' };
  }

  function detectBundleFromTitle(title) {
    const titleText = normalizeCaseText(title || '');
    return /bundle|gift\s*pack|home\s*(and|&)\s*away|home\s*away|combo|family\s*pack/.test(titleText);
  }
  function detectSockTypeFromTitle(title) {
    const titleText = normalizeCaseText(title || '');
    if (/no\s*socks?|without\s*socks?/.test(titleText)) return 'no_socks';
    if (/with\s*socks?/.test(titleText)) return 'with_socks';
    return 'no_socks';
  }
  function getExpectedPrice(classification) {
    const basePrices = {
      'Kids Kit - No Socks': 26.99,
      'Kids Kit - With Socks': 29.99,
      'Adult Kit - No Socks': 30.99,
      'Adult Kit - With Socks': 33.99,
      "Men's Shirt / Women's Shirt": 29.99,
      'Kids Bundle - No Socks': 46.99,
      'Kids Bundle - With Socks': 49.99,
      "Men's Shirt Bundle": 49.99,
      'Printed Bundle': 64.99
    };

    if (classification.productType === 'Retro Shirt / Retro Kids Kit') return null;
    const base = basePrices[classification.productType];
    if (base === undefined) return null;

    if (classification.isPrinted && !classification.isBundle && classification.productType !== 'Printed Bundle') {
      return roundMoney(base + 10);
    }

    return base;
  }

  function detectPrinted(product) {
    const sku = String(product.sku || '');
    const normalizedSku = normalizeCaseText(sku);
    const haystack = normalizeCaseText([product.title, sku, JSON.stringify(product.product_attributes || {})].join(' '));

    if (hasPrintedSkuPattern(sku)) {
      return {
        is_printed: true,
        content: extractPrintedSkuContent(sku),
        source: 'sku',
        reason: 'SKU contains a name/number segment, so the product is identified as printed.'
      };
    }

    if (/(^|[_\-\s])no([_\-\s]|$)/.test(normalizedSku) || /no socks/.test(haystack)) {
      return {
        is_printed: false,
        content: null,
        source: 'sku',
        reason: 'SKU/title contains the No token, so the product is identified as not printed.'
      };
    }

    if (/printed|personalised|personalized|name number|with name|with number/.test(haystack)) {
      return {
        is_printed: true,
        content: null,
        source: 'title_or_attributes',
        reason: 'Product text contains printed/personalisation signals.'
      };
    }

    return {
      is_printed: false,
      content: null,
      source: 'default',
      reason: 'No printed signal found.'
    };
  }

  function hasPrintedSkuPattern(sku) {
    return /(^|_)[A-Z][A-Z0-9.' -]{1,}\s+\d{1,2}(_|$)/i.test(String(sku || ''));
  }

  function extractPrintedSkuContent(sku) {
    const match = String(sku || '').match(/(^|_)([A-Z][A-Z0-9.' -]{1,}\s+\d{1,2})(_|$)/i);
    return match ? cleanText(match[2]) : null;
  }

  function toComparablePrice(value) {
    if (typeof value === 'number') return roundMoney(value);
    const match = String(value || '').match(/[0-9]+(?:\.[0-9]{1,2})?/);
    return match ? roundMoney(Number(match[0])) : null;
  }

  function roundMoney(value) {
    return Math.round(Number(value) * 100) / 100;
  }

  function normalizeCaseText(value) {
    return String(value || '').toLowerCase().replace(/GBP /g, 'gbp').replace(/[^a-z0-9_\-\s/]+/g, ' ');
  }
  function parseProductContent(content, url, type, provider) {
    const looksLikeHtml = /<html|<body|<script|<div|<h1/i.test(content);
    const product = type === 'html' || looksLikeHtml
      ? parseProductHtml(content, url)
      : parseProductText(content, url);

    product.fetchProvider = provider;
    product.rawFormat = type;
    return product;
  }

  function parseProductText(text, url) {
    const lines = text.split(/\r?\n/).map((line) => cleanText(stripMarkdownLinks(line))).filter(Boolean);
    const joined = lines.join('\n');
    const title = findProductHeading(lines) || extractMatch(text, /^Title:\s*(.+)$/m);
    const sku = extractMatch(joined, /\bSKU:\s*([^\n]+?)(?:\s+Categories:|$)/i);
    const categories = extractListBetween(joined, 'Categories:', 'Tags:');
    const tags = extractListBetween(joined, 'Tags:', 'Rated');
    const sizes = extractSizesFromText(joined);
    const prices = extractPrices(text);
    const longDescription = extractDescriptionFromText(lines, title);
    const globalForm = extractGlobalFormFromText(text);

    return {
      sourceUrl: url,
      fetchedAt: new Date().toISOString(),
      title: cleanText(title),
      sku: cleanText(sku),
      price: prices.current || '',
      regularPrice: prices.regular || '',
      currency: prices.currency || '',
      availability: '',
      rating: cleanText(extractMatch(joined, /Rated\s+\*\*?([\d.]+)\*\*?\s+out of 5/i) || extractMatch(joined, /Rated\s+([\d.]+)\s+out of 5/i)),
      categories,
      tags,
      sizes,
      images: extractImagesFromText(text),
      description: cleanText(longDescription),
      short_description: extractShortDescription(lines),
      long_description: cleanText(longDescription),
      description_headings: extractDescriptionHeadings(longDescription),
      global_form: globalForm,
      size_prices: [],
      product_attributes: sizes.length ? { size: sizes } : {},
      jsonLdFound: 0
    };
  }

  function parseProductHtml(html, url) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const jsonLdProducts = extractJsonLdProducts(doc);
    const schemaProduct = jsonLdProducts[0] || {};
    const offer = normalizeOffer(schemaProduct.offers);

    const title = firstText(doc, [
      '.product_title',
      'h1.product_title',
      'h1.entry-title',
      'meta[property="og:title"]',
      'title'
    ]) || schemaProduct.name || '';

    const description = firstText(doc, [
      'meta[property="og:description"]',
      '.woocommerce-product-details__short-description',
      '#tab-description',
      '.product .summary'
    ]) || schemaProduct.description || '';

    return {
      sourceUrl: url,
      fetchedAt: new Date().toISOString(),
      title: cleanText(title),
      sku: cleanText(firstText(doc, ['.sku', '[itemprop="sku"]']) || schemaProduct.sku || ''),
      price: cleanText(firstText(doc, ['.summary .price ins .amount', '.summary .price .amount', 'p.price .amount']) || offer.price || ''),
      regularPrice: cleanText(firstText(doc, ['.summary .price del .amount', 'p.price del .amount']) || ''),
      currency: cleanText(offer.priceCurrency || extractCurrency(doc) || ''),
      availability: cleanText(offer.availability || firstText(doc, ['.stock']) || ''),
      rating: cleanText(firstText(doc, ['.woocommerce-product-rating .star-rating', '.woocommerce-review-link']) || aggregateRating(schemaProduct)),
      categories: uniqueTextList(doc, '.posted_in a, .product_meta a[rel="tag"]').filter(Boolean),
      tags: uniqueTextList(doc, '.tagged_as a').filter(Boolean),
      sizes: extractSizes(doc),
      images: extractImages(doc, schemaProduct.image),
      description: cleanText(description),
      jsonLdFound: jsonLdProducts.length
    };
  }

  function extractVariationSizePrices(doc) {
    const form = doc.querySelector('form.variations_form[data-product_variations]');
    if (!form) return [];

    try {
      const raw = form.getAttribute('data-product_variations') || '[]';
      return JSON.parse(decodeHtml(raw)).map((variation) => {
        const image = variation.image || {};
        return {
          size: cleanText((variation.attributes && (variation.attributes.attribute_pa_size || variation.attributes.attribute_size)) || ''),
          sku: cleanText(variation.sku || ''),
          price: Number.isFinite(Number(variation.display_price)) ? Number(variation.display_price) : null,
          regular_price: Number.isFinite(Number(variation.display_regular_price)) ? Number(variation.display_regular_price) : null,
          sale_price: Number.isFinite(Number(variation.display_price)) ? Number(variation.display_price) : null,
          variation_id: variation.variation_id || null,
          in_stock: Boolean(variation.is_in_stock),
          image: image.full_src || image.src || '',
          image_thumbnail: image.thumb_src || '',
          image_id: image.image_id || null,
          image_alt: image.alt || ''
        };
      });
    } catch (error) {
      return [];
    }
  }

  function buildProductAttributes(doc) {
    const attributes = {};
    const sizes = extractSizes(doc);
    if (sizes.length) attributes.size = sizes;

    doc.querySelectorAll('.woocommerce-product-attributes tr').forEach((row) => {
      const label = cleanText(row.querySelector('th') && row.querySelector('th').textContent);
      const value = cleanText(row.querySelector('td') && row.querySelector('td').textContent);
      if (label && value) attributes[slugifyAttributeName(label)] = value.split(',').map((item) => cleanText(item)).filter(Boolean);
    });

    return attributes;
  }
  function findProductHeading(lines) {
    return lines.find((line) => /^#\s+.+Football.+Kit/i.test(line))
      || lines.find((line) => /^#\s+/.test(line) && /Football|Kit|Shirt/i.test(line))
      || '';
  }

  function extractMatch(text, regex) {
    const match = text.match(regex);
    return match ? match[1] : '';
  }

  function extractListBetween(text, startLabel, endLabel) {
    const start = text.indexOf(startLabel);
    if (start === -1) return [];
    const fromStart = text.slice(start + startLabel.length);
    const end = fromStart.indexOf(endLabel);
    const raw = end === -1 ? fromStart.split('\n')[0] : fromStart.slice(0, end);

    return raw
      .split(',')
      .map((item) => cleanText(item))
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);
  }

  function extractGlobalFormFromText(text) {
    const form = [];
    const cleaned = String(text || '').replace(/\r/g, '');

    const badgeMatch = cleaned.match(/Adding\s+Premier\s+League\s+Badge[\s\S]*?(?:\u00a3|&pound;|&#163;)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:\u00a3|GBP )/i);
    if (badgeMatch) {
      form.push({
        name: 'tmcp_checkbox_0_0',
        label: 'Adding Premier League Badge',
        type: 'checkbox',
        values: ['_0'],
        price: toNumber(badgeMatch[1])
      });
    }

    const personaliseBlock = extractTextBlock(cleaned, /Personalise\s+For\s+(?:\u00a3|GBP )\s*10/i, /\*Name|\*Number|\*\s*Size|\[Reset options\]/i);
    if (personaliseBlock) {
      const headingPrice = extractNumber(personaliseBlock.match(/Personalise\s+For\s+(?:\u00a3|GBP )\s*([0-9]+(?:\.[0-9]{1,2})?)/i));
      const yesMatch = personaliseBlock.match(/Yes\s*\(\+\s*(?:\u00a3|GBP )?\s*([0-9]+(?:\.[0-9]{1,2})?)\)\s*([0-9]+(?:\.[0-9]{1,2})?)?\s*(?:\u00a3|GBP )?/i);
      const noMatch = personaliseBlock.match(/No\s+([0-9]+(?:\.[0-9]{1,2})?)\s*(?:\u00a3|GBP )?/i);

      form.push({
        name: 'tmcp_radio_1',
        label: headingPrice ? `Personalise For GBP ${formatPrice(headingPrice)}` : 'Personalise',
        type: 'radio',
        values: [yesMatch ? `Yes(+ GBP ${formatPrice(toNumber(yesMatch[1]))})_0` : 'Yes_0'],
        price: yesMatch ? toNumber(yesMatch[2] || yesMatch[1]) : headingPrice
      });

      form.push({
        name: 'tmcp_radio_1',
        label: headingPrice ? `Personalise For GBP ${formatPrice(headingPrice)}` : 'Personalise',
        type: 'radio',
        values: ['No_1'],
        price: noMatch ? toNumber(noMatch[1]) : 0
      });
    }

    if (/\*Name\s*\n/i.test(cleaned)) {
      form.push({
        name: 'tmcp_textfield_2',
        label: 'Name',
        type: 'text',
        values: [],
        price: 0
      });
    }

    if (/\*Number\s*\n/i.test(cleaned)) {
      form.push({
        name: 'tmcp_textfield_3',
        label: 'Number',
        type: 'text',
        values: [],
        price: 0
      });
    }

    return form;
  }

  function extractTextBlock(text, startRegex, endRegex) {
    const startMatch = text.match(startRegex);
    if (!startMatch || startMatch.index === undefined) return '';
    const start = startMatch.index;
    const rest = text.slice(start);
    const endMatch = rest.slice(startMatch[0].length).match(endRegex);
    if (!endMatch || endMatch.index === undefined) return rest;
    return rest.slice(0, startMatch[0].length + endMatch.index);
  }

  function extractNumber(match) {
    return match ? toNumber(match[1]) : 0;
  }

  function toNumber(value) {
    const number = parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(number) ? number : 0;
  }

  function formatPrice(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
  }
  function extractPrices(text) {
    const mainText = extractMainPriceText(text);
    const salePair = mainText.match(/(?:~~\s*)?(?:\u00a3|&pound;|&#163;)\s*([0-9]+(?:\.[0-9]{2})?)\s*(?:~~)?\s+(?:\u00a3|&pound;|&#163;)\s*([0-9]+(?:\.[0-9]{2})?)/i);
    if (salePair) {
      return {
        regular: `GBP ${salePair[1]}`,
        current: `GBP ${salePair[2]}`,
        currency: 'GBP'
      };
    }

    const priceMatches = Array.from(mainText.matchAll(/(?:\u00a3|&pound;|&#163;)\s*([0-9]+(?:\.[0-9]{2})?)/gi)).map((match) => match[1]);
    const uniquePrices = [...new Set(priceMatches)];

    return {
      regular: uniquePrices.length > 1 ? `GBP ${uniquePrices[0]}` : '',
      current: uniquePrices.length > 1 ? `GBP ${uniquePrices[1]}` : (uniquePrices[0] ? `GBP ${uniquePrices[0]}` : ''),
      currency: uniquePrices.length ? 'GBP' : ''
    };
  }

  function extractMainPriceText(text) {
    const source = String(text || '');
    const endMarkers = [
      /\[Button:\s*Add to basket\]/i,
      /Add to basket/i,
      /#####\s+The Perfect Gift/i,
      /KFK\s*-\s*information/i,
      /##\s+.*details/i,
      /Related products/i,
      /You may also like/i
    ];
    const endIndexes = endMarkers
      .map((regex) => {
        const match = source.match(regex);
        return match && match.index !== undefined ? match.index : -1;
      })
      .filter((index) => index > 0);
    return endIndexes.length ? source.slice(0, Math.min(...endIndexes)) : source;
  }

  function extractSizesFromText(text) {
    const sizeRow = extractMatch(text, /\|\s*Size\s*\|([^\n]+)/i);
    const source = sizeRow || text;
    const matches = source.match(/\b(?:S|M|L|XL|XXL|16|18|20|22|24|26|28)\b(?:\s*\([^)]+\))?/g) || [];

    return [...new Set(matches)].filter((size) => !['Size'].includes(size));
  }

  function extractImagesFromText(text) {
    const matches = Array.from(text.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)).map((match) => match[1]);
    return [...new Set(matches)].filter((src) => /product|kit|football|aston|villa|uploads/i.test(src)).slice(0, 12);
  }

  function extractDescriptionFromText(lines, title) {
    const titleText = normalizeDescriptionLine(title);
    const normalizedLines = lines.map(normalizeDescriptionLine);
    const startPatterns = [
      /^KFK\s*-\s*information$/i,
      /^Image\s+\d+:\s*KFK\s*-\s*information$/i,
      /^\(?Please scroll up for more details\)?$/i,
      /^Looking for the latest/i,
      new RegExp(`^Looking for the latest ${escapeRegExp(titleText)}`, 'i')
    ];
    const endPatterns = [
      /^5 Stars$/i,
      /^Average Star Rating:/i,
      /^\d+\s+review\s+for\s+/i,
      /^Add a review/i,
      /^Related products$/i,
      /^You may also like$/i,
      /^Recently viewed$/i,
      /^Customer reviews$/i
    ];

    let start = normalizedLines.findIndex((line) => startPatterns.some((pattern) => pattern.test(line)));
    if (start === -1) return '';

    if (/^(?:Image\s+\d+:\s*)?KFK\s*-\s*information$/i.test(normalizedLines[start])) start += 1;

    const end = normalizedLines.findIndex((line, index) => index > start && endPatterns.some((pattern) => pattern.test(line)));
    return normalizedLines.slice(start, end === -1 ? normalizedLines.length : end)
      .filter(Boolean)
      .join('\n');
  }

  function extractDescriptionHeadings(description) {
    return String(description || '')
      .split(/\n+/)
      .map(normalizeDescriptionLine)
      .filter((line) => /\?$|Options$|Chart$|Shipping$|Instructions$|Information$|Payment Options$|About /i.test(line))
      .filter((line, index, list) => list.indexOf(line) === index);
  }

  function normalizeDescriptionLine(value) {
    return cleanText(String(value || '')
      .replace(/^#+\s*/, '')
      .replace(/^[-*_`\s]+|[-*_`\s]+$/g, '')
      .replace(/^Image\s+\d+:\s*/i, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/_(.*?)_/g, '$1'));
  }

  function extractShortDescription(lines) {
    const start = lines.findIndex((line) => /60,000\+|Happy Customers/i.test(line));
    if (start === -1) return '';

    const end = lines.findIndex((line, index) => index > start && /\|\s*Size\s*\||Adding Premier League Badge|Personalise For/i.test(line));
    return lines.slice(start, end === -1 ? start + 12 : end).join(' ');
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripMarkdownLinks(value) {
    return String(value || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  }

  function extractJsonLdProducts(doc) {
    const blocks = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    const products = [];

    blocks.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent);
        flattenJsonLd(data).forEach((item) => {
          const type = item && item['@type'];
          const types = Array.isArray(type) ? type : [type];
          if (types.includes('Product')) products.push(item);
        });
      } catch (error) {
        // Ignore invalid JSON-LD blocks.
      }
    });

    return products;
  }

  function flattenJsonLd(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data.flatMap(flattenJsonLd);
    if (data['@graph']) return flattenJsonLd(data['@graph']);
    return [data];
  }

  function normalizeOffer(offers) {
    if (!offers) return {};
    if (Array.isArray(offers)) return offers[0] || {};
    return offers;
  }

  function aggregateRating(product) {
    const rating = product.aggregateRating;
    if (!rating) return '';
    const value = rating.ratingValue || '';
    const count = rating.reviewCount || rating.ratingCount || '';
    return [value, count ? `(${count})` : ''].filter(Boolean).join(' ');
  }

  function firstText(doc, selectors) {
    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (!el) continue;
      const value = el.getAttribute('content') || el.textContent;
      if (cleanText(value)) return value;
    }
    return '';
  }

  function uniqueTextList(doc, selector) {
    return [...new Set(Array.from(doc.querySelectorAll(selector)).map((el) => cleanText(el.textContent)))];
  }

  function extractSizes(doc) {
    const selectors = [
      'select[name*="size"] option',
      'select[id*="size"] option',
      '.variations select option',
      '.variable-items-wrapper [data-value]'
    ];

    const values = [];
    selectors.forEach((selector) => {
      doc.querySelectorAll(selector).forEach((el) => {
        const value = cleanText(el.getAttribute('data-value') || el.getAttribute('value') || el.textContent);
        if (value && !/^select$/i.test(value) && !values.includes(value)) values.push(value);
      });
    });

    return values;
  }

  function extractImages(doc, schemaImages) {
    const images = [];
    const addImage = (src) => {
      const value = cleanText(src);
      if (value && !images.includes(value)) images.push(value);
    };

    if (Array.isArray(schemaImages)) schemaImages.forEach(addImage);
    else addImage(schemaImages);

    doc.querySelectorAll('.woocommerce-product-gallery img, meta[property="og:image"]').forEach((el) => {
      addImage(el.getAttribute('content') || el.getAttribute('data-large_image') || el.getAttribute('src'));
    });

    return images.slice(0, 12);
  }

  function extractCurrency(doc) {
    const price = firstText(doc, ['.summary .price', 'p.price']);
    if (/\u00a3|&pound;|&#163;/.test(price)) return 'GBP';
    if (price.includes('$')) return 'USD';
    if (/\u20ac|&euro;|&#8364;/.test(price)) return 'EUR';
    return '';
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function renderBatchResults() {
    const area = document.getElementById('product-check-result');
    if (!area) return;

    if (!checkedProducts.length) {
      area.innerHTML = '<p class="muted">No product checked.</p>';
      return;
    }

    area.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'product-result-table-wrap';

    const table = document.createElement('table');
    table.className = 'product-result-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>URL</th>
          <th>SKU</th>
          <th>Errors</th>
          <th>Status</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    checkedProducts.forEach((product, index) => {
      const failedCases = getProductFailedCases(product);
      const isPending = product.status === 'PENDING' || product.status === 'CHECKING';
      const status = isPending ? product.status : failedCases.length ? 'FAIL' : 'PASS';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="product-result-url"></td>
        <td class="product-result-sku"></td>
        <td>${isPending ? '-' : failedCases.length}</td>
        <td><span class="product-status-pill ${status === 'FAIL' ? 'fail' : 'pass'}">${escapeHtml(status)}</span></td>
        <td></td>
      `;

      const urlCell = row.children[0];
      const link = document.createElement('a');
      link.href = product.sourceUrl || product.url || '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = product.sourceUrl || product.url || 'N/A';
      urlCell.appendChild(link);

      row.children[1].className = 'product-result-sku';
      row.children[1].textContent = product.sku || (isPending ? status : 'Not found');

      const button = document.createElement('button');
      button.className = 'btn-secondary';
      button.type = 'button';
      button.textContent = 'View Detail';
      button.disabled = isPending;
      button.addEventListener('click', () => showProductDetail(index));
      row.children[4].appendChild(button);

      tbody.appendChild(row);
    });

    wrap.appendChild(table);
    area.appendChild(wrap);
  }

  function getProductCaseEntries(product) {
    return [
      { key: 'fetch_error_case', label: 'Fetch Case', render: renderFetchErrorSection },
      { key: 'price_case', label: 'Price Case', render: renderPriceCaseSection },
      { key: 'forbidden_terms_case', label: 'Forbidden Terms Case', render: renderForbiddenTermsSection },
      { key: 'alt_text_case', label: 'Alt Text Case', render: renderAltTextSection },
      { key: 'size_chart_case', label: 'Size Chart Case', render: renderSizeChartSection },
      { key: 'url_name_case', label: 'URL / Name Case', render: renderUrlNameSection },
      { key: 'personalise_option_case', label: 'Personalise Option Case', render: renderPersonaliseOptionSection },
      { key: 'description_sku_case', label: 'Description SKU Case', render: renderDescriptionSkuSection }
    ];
  }

  function getProductFailedCases(product) {
    return getProductCaseEntries(product).filter((entry) => {
      const caseData = product && product[entry.key];
      return caseData && String(caseData.status || '').toUpperCase() === 'FAIL';
    });
  }

  function showProductDetail(index) {
    const product = checkedProducts[index];
    if (!product) return;

    const moreArea = document.getElementById('product-more-area');
    const failedArea = document.getElementById('product-failed-cases');
    const summary = document.getElementById('product-summary');
    const raw = document.getElementById('product-raw');
    if (!moreArea || !failedArea || !summary || !raw) return;

    moreArea.hidden = false;
    failedArea.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'product-detail-title';
    title.textContent = product.title || product.sourceUrl || product.url || 'Product detail';
    failedArea.appendChild(title);

    const failedCases = getProductFailedCases(product);
    if (!failedCases.length) {
      failedArea.innerHTML += '<p class="muted">No failed cases for this product.</p>';
    } else {
      failedCases.forEach((entry) => entry.render(failedArea, product[entry.key]));
    }

    renderProductSummary(summary, product);
    raw.value = JSON.stringify(product, null, 2);
    moreArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderProductSummary(summary, product) {
    summary.innerHTML = '';
    addRow(summary, 'URL', product.sourceUrl || product.url || 'Not found');
    addRow(summary, 'Title', product.title || 'Not found');
    addRow(summary, 'SKU', product.sku || 'Not found');
    addRow(summary, 'Price', [product.regularPrice, product.price].filter(Boolean).join(' -> ') || 'Not found');
    addRow(summary, 'Currency', product.currency || 'Not found');
    addRow(summary, 'Sizes', (product.sizes || []).join(', ') || 'Not found');
    addRow(summary, 'Size Prices', product.size_prices && product.size_prices.length ? String(product.size_prices.length) + ' variations' : 'Not found');
    addRow(summary, 'Categories', (product.categories || []).join(', ') || 'Not found');
    addRow(summary, 'Tags', (product.tags || []).join(', ') || 'Not found');
    addRow(summary, 'Rating', product.rating || 'Not found');
    addRow(summary, 'Short Description', product.short_description || 'Not found');
    addRow(summary, 'Long Description', product.long_description || product.description || 'Not found');
    addRow(summary, 'Options', product.global_form && product.global_form.length ? String(product.global_form.length) + ' options' : 'Not found');
    addRow(summary, 'Failed Cases', String(getProductFailedCases(product).length));
    addImages(summary, product.images || []);
  }

  function renderFetchErrorSection(area, fetchCase) {
    area.appendChild(createCaseStatusCard('Fetch Case', fetchCase, [`Issues: ${fetchCase.issue_count || 1}`]));
    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(fetchCase.findings) ? fetchCase.findings : [];
    findings.forEach((finding) => {
      const item = document.createElement('div');
      item.className = 'check-item fail';
      item.innerHTML = `<div><div class="check-item-title">${escapeHtml(finding.issue || 'fetch_failed')}</div><div class="check-item-detail">${escapeHtml(finding.message || '')}</div></div><div class="check-badge fail">FIX</div>`;
      list.appendChild(item);
    });
    area.appendChild(list);
  }
  function renderProduct(product) {
    const summary = document.getElementById('product-summary');
    const raw = document.getElementById('product-raw');
    renderCheckResult(product);
    summary.innerHTML = '';

    addRow(summary, 'Title', product.title || 'Not found');
    addRow(summary, 'SKU', product.sku || 'Not found');
    addRow(summary, 'Price', [product.regularPrice, product.price].filter(Boolean).join(' -> ') || 'Not found');
    addRow(summary, 'Currency', product.currency || 'Not found');
    addRow(summary, 'Sizes', product.sizes.join(', ') || 'Not found');
    addRow(summary, 'Size Prices', product.size_prices && product.size_prices.length ? String(product.size_prices.length) + ' variations' : 'Not found');
    addRow(summary, 'Categories', product.categories.join(', ') || 'Not found');
    addRow(summary, 'Tags', product.tags.join(', ') || 'Not found');
    addRow(summary, 'Rating', product.rating || 'Not found');
    addRow(summary, 'Short Description', product.short_description || 'Not found');
    addRow(summary, 'Long Description', product.long_description || product.description || 'Not found');
    addRow(summary, 'Options', product.global_form && product.global_form.length ? String(product.global_form.length) + ' options' : 'Not found');
    addRow(summary, 'Price Case', product.price_case ? product.price_case.status + ' - ' + product.price_case.product_type : 'Not tested');
    addRow(summary, 'Forbidden Terms', product.forbidden_terms_case ? product.forbidden_terms_case.status + ' - ' + product.forbidden_terms_case.issue_count + ' issues' : 'Not tested');
    addRow(summary, 'Alt Text Case', product.alt_text_case ? product.alt_text_case.status + ' - ' + product.alt_text_case.issue_count + ' issues' : 'Not tested');
    addRow(summary, 'Size Chart Case', product.size_chart_case ? product.size_chart_case.status + ' - ' + product.size_chart_case.issue_count + ' issues' : 'Not tested');
    addRow(summary, 'Personalise Option Case', product.personalise_option_case ? product.personalise_option_case.status + ' - ' + product.personalise_option_case.issue_count + ' issues' : 'Not tested');
    addRow(summary, 'Description SKU Case', product.description_sku_case ? product.description_sku_case.status + ' - ' + product.description_sku_case.issue_count + ' issues' : 'Not tested');
    addImages(summary, product.images);

    raw.value = JSON.stringify(product, null, 2);
  }

  function renderCheckResult(product) {
    const area = document.getElementById('product-check-result');
    if (!area) return;

    area.innerHTML = '';
    renderPriceCaseSection(area, product.price_case || {});
    renderForbiddenTermsSection(area, product.forbidden_terms_case || { status: 'PASS', findings: [], scanned_fields: [] });
    renderAltTextSection(area, product.alt_text_case || { status: 'PASS', findings: [], image_count: 0, issue_count: 0 });
    renderSizeChartSection(area, product.size_chart_case || { status: 'SKIP', findings: [], issue_count: 0 });
    renderUrlNameSection(area, product.url_name_case || { status: 'PASS', findings: [], issue_count: 0 });
    renderPersonaliseOptionSection(area, product.personalise_option_case || { status: 'PASS', findings: [], issue_count: 0 });
    renderDescriptionSkuSection(area, product.description_sku_case || { status: 'PASS', findings: [], issue_count: 0 });
  }

  function renderDescriptionSkuSection(area, descriptionCase) {
    area.appendChild(createCaseStatusCard('Description SKU Case', descriptionCase, getDescriptionSkuCaseMeta(descriptionCase)));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(descriptionCase.findings) ? descriptionCase.findings : [];
    if (!findings.length) {
      list.innerHTML = '<p class="muted">No description SKU issues found.</p>';
    } else {
      findings.forEach((finding) => list.appendChild(createDescriptionSkuFindingItem(finding)));
    }
    area.appendChild(list);
  }
  function renderPersonaliseOptionSection(area, personaliseCase) {
    area.appendChild(createCaseStatusCard('Personalise Option Case', personaliseCase, getPersonaliseOptionCaseMeta(personaliseCase)));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(personaliseCase.findings) ? personaliseCase.findings : [];
    if (!findings.length) {
      list.innerHTML = '<p class="muted">No Personalise option issues found.</p>';
    } else {
      findings.forEach((finding) => list.appendChild(createPersonaliseOptionFindingItem(finding)));
    }
    area.appendChild(list);
  }
  function renderUrlNameSection(area, urlNameCase) {
    area.appendChild(createCaseStatusCard('URL / Name Case', urlNameCase, getUrlNameCaseMeta(urlNameCase)));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(urlNameCase.findings) ? urlNameCase.findings : [];
    if (!findings.length) {
      list.innerHTML = '<p class="muted">No URL/name issues found.</p>';
    } else {
      findings.forEach((finding) => list.appendChild(createUrlNameFindingItem(finding)));
    }
    area.appendChild(list);
  }
  function renderPriceCaseSection(area, priceCase) {
    area.appendChild(createCaseStatusCard('Price Case', priceCase, getPriceCaseMeta(priceCase)));
    if (priceCase.reason) addRow(area, 'Price Reason', priceCase.reason);

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const checks = Array.isArray(priceCase.checks) ? priceCase.checks : [];
    if (!checks.length) {
      list.innerHTML = '<p class="muted">No price check details available.</p>';
    } else {
      checks.forEach((check) => list.appendChild(createCheckItem(check)));
    }
    area.appendChild(list);
  }

  function renderForbiddenTermsSection(area, forbiddenCase) {
    area.appendChild(createCaseStatusCard('Forbidden Terms Case', forbiddenCase, getForbiddenCaseMeta(forbiddenCase)));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(forbiddenCase.findings) ? forbiddenCase.findings : [];
    if (!findings.length) {
      list.innerHTML = '<p class="muted">No forbidden terms found.</p>';
    } else {
      findings.forEach((finding) => list.appendChild(createForbiddenFindingItem(finding)));
    }
    area.appendChild(list);
  }

  function renderSizeChartSection(area, sizeCase) {
    area.appendChild(createCaseStatusCard('Size Chart Case', sizeCase, getSizeChartCaseMeta(sizeCase)));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(sizeCase.findings) ? sizeCase.findings : [];
    if (!findings.length) {
      list.innerHTML = '<p class="muted">No size chart issues found.</p>';
    } else {
      findings.forEach((finding) => list.appendChild(createSizeChartFindingItem(finding)));
    }
    area.appendChild(list);
  }
  function renderAltTextSection(area, altCase) {
    area.appendChild(createCaseStatusCard('Alt Text Case', altCase, getAltTextCaseMeta(altCase)));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(altCase.findings) ? altCase.findings : [];
    if (!findings.length) {
      list.innerHTML = '<p class="muted">No alt text issues found.</p>';
    } else {
      findings.forEach((finding) => list.appendChild(createAltTextFindingItem(finding)));
    }
    area.appendChild(list);
  }
  function createCaseStatusCard(labelText, caseData, metaLines) {
    const status = String(caseData.status || 'SKIP').toUpperCase();
    const statusBox = document.createElement('div');
    statusBox.className = `check-status ${status.toLowerCase()}`;

    const main = document.createElement('div');
    main.className = 'check-status-main';

    const label = document.createElement('div');
    label.className = 'check-status-label';
    label.textContent = labelText;

    const value = document.createElement('div');
    value.className = 'check-status-value';
    value.textContent = status;

    main.appendChild(label);
    main.appendChild(value);

    const meta = document.createElement('div');
    meta.className = 'check-meta';
    meta.innerHTML = metaLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('');

    statusBox.appendChild(main);
    statusBox.appendChild(meta);
    return statusBox;
  }

  function getPriceCaseMeta(priceCase) {
    const checks = Array.isArray(priceCase.checks) ? priceCase.checks : [];
    return [
      priceCase.product_type || 'Unknown',
      `Expected: ${formatCheckPrice(priceCase.expected_price)}`,
      `Checked: ${checks.length}`
    ];
  }

  function getForbiddenCaseMeta(forbiddenCase) {
    const findings = Array.isArray(forbiddenCase.findings) ? forbiddenCase.findings : [];
    return [
      `Issues: ${findings.length}`,
      `Fields: ${(forbiddenCase.scanned_fields || []).length}`
    ];
  }

  function getSizeChartCaseMeta(sizeCase) {
    return [
      sizeCase.product_type || 'Unknown',
      `SKU: ${sizeCase.sku_indicator || 'N/A'}`,
      `Size chart images: ${(sizeCase.size_chart_images || []).length}`,
      `Issues: ${sizeCase.issue_count || 0}`
    ];
  }
  function getDescriptionSkuCaseMeta(descriptionCase) {
    return [
      `SKU tokens: ${(descriptionCase.sku_tokens || []).join(', ') || 'N/A'}`,
      `Checked: ${descriptionCase.checked_rules || 0}`,
      `Issues: ${descriptionCase.issue_count || 0}`
    ];
  }
  function getPersonaliseOptionCaseMeta(personaliseCase) {
    return [
      `Printed: ${personaliseCase.printed ? 'Yes' : 'No'}`,
      `Personalise options: ${personaliseCase.personalise_option_count || 0}`,
      `Issues: ${personaliseCase.issue_count || 0}`
    ];
  }
  function getUrlNameCaseMeta(urlNameCase) {
    return [
      `Rules: ${urlNameCase.checked_rules || 0}`,
      `Issues: ${urlNameCase.issue_count || 0}`
    ];
  }
  function getAltTextCaseMeta(altCase) {
    const productImages = altCase.product_image_count !== undefined ? altCase.product_image_count : (altCase.image_count || 0);
    return [
      `Images: ${productImages}`,
      `Skipped: ${altCase.skipped_image_count || 0}`,
      `Issues: ${altCase.issue_count || 0}`
    ];
  }
  function createDescriptionSkuFindingItem(finding) {
    const item = document.createElement('div');
    item.className = 'check-item fail';

    const content = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = `${finding.sku_token || 'SKU'}: ${finding.issue || 'description_sku_issue'}`;

    const detail = document.createElement('div');
    detail.className = 'check-item-detail';
    detail.textContent = finding.message || '';

    const expected = document.createElement('div');
    expected.className = 'check-item-detail';
    expected.textContent = `Expected: ${finding.expected || ''}`;

    const keywords = document.createElement('div');
    keywords.className = 'check-item-detail';
    keywords.textContent = `Keywords: ${(finding.keywords || []).join(', ')}`;

    const badge = document.createElement('div');
    badge.className = 'check-badge fail';
    badge.textContent = 'FIX';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(expected);
    content.appendChild(keywords);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }
  function createPersonaliseOptionFindingItem(finding) {
    const item = document.createElement('div');
    item.className = 'check-item fail';

    const content = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = finding.issue || 'personalise_option_issue';

    const detail = document.createElement('div');
    detail.className = 'check-item-detail';
    detail.textContent = finding.message || '';

    const expected = document.createElement('div');
    expected.className = 'check-item-detail';
    expected.textContent = `Expected: ${finding.expected || ''}`;

    const actual = document.createElement('div');
    actual.className = 'check-item-detail';
    actual.textContent = `Actual: ${finding.actual || ''}`;

    const context = document.createElement('div');
    context.className = 'check-item-detail';
    context.textContent = finding.context || '';

    const badge = document.createElement('div');
    badge.className = 'check-badge fail';
    badge.textContent = 'FIX';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(expected);
    content.appendChild(actual);
    if (context.textContent) content.appendChild(context);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }
  function createUrlNameFindingItem(finding) {
    const item = document.createElement('div');
    item.className = 'check-item fail';

    const content = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = `${finding.field || 'field'}: ${finding.issue || 'url_name_issue'}`;

    const detail = document.createElement('div');
    detail.className = 'check-item-detail';
    detail.textContent = `Found: ${finding.found || ''}`;

    const replace = document.createElement('div');
    replace.className = 'check-item-detail';
    replace.textContent = `Use: ${finding.replace_with || ''}`;

    const context = document.createElement('div');
    context.className = 'check-item-detail';
    context.textContent = finding.context || '';

    const badge = document.createElement('div');
    badge.className = 'check-badge fail';
    badge.textContent = 'FIX';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(replace);
    content.appendChild(context);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }
  function createSizeChartFindingItem(finding) {
    const item = document.createElement('div');
    item.className = 'check-item fail';

    const content = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = finding.target ? `${finding.target}: ${finding.issue || 'size_chart_issue'}` : (finding.issue || 'size_chart_issue');

    const detail = document.createElement('div');
    detail.className = 'check-item-detail';
    detail.textContent = finding.message || '';

    const expected = document.createElement('div');
    expected.className = 'check-item-detail';
    if (finding.expected_alts) {
      expected.textContent = `Expected alt: ${finding.expected_alts.join(' | ')}`;
    } else {
      expected.textContent = finding.expected ? `Expected: ${finding.expected}` : finding.expected_row ? `Expected row: ${finding.expected_row}` : '';
    }

    const current = document.createElement('div');
    current.className = 'check-item-detail';
    current.textContent = finding.current_alt ? `Current alt: ${finding.current_alt}` : '';

    const badge = document.createElement('div');
    badge.className = 'check-badge fail';
    badge.textContent = 'FIX';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(expected);
    if (current.textContent) content.appendChild(current);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }
  function createAltTextFindingItem(finding) {
    const item = document.createElement('div');
    item.className = 'check-item fail';

    const content = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = `${finding.target}: ${finding.issue}`;

    const detail = document.createElement('div');
    detail.className = 'check-item-detail';
    detail.textContent = finding.message || '';

    const suggestion = document.createElement('div');
    suggestion.className = 'check-item-detail';
    suggestion.textContent = `Suggested alt: ${finding.suggested_alt || ''}`;

    const current = document.createElement('div');
    current.className = 'check-item-detail';
    current.textContent = finding.current_alt ? `Current alt: ${finding.current_alt}` : finding.image || '';

    const badge = document.createElement('div');
    badge.className = 'check-badge fail';
    badge.textContent = 'FIX';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(suggestion);
    content.appendChild(current);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }

  function createForbiddenFindingItem(finding) {
    const item = document.createElement('div');
    item.className = 'check-item fail';

    const content = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = `${finding.field}: ${finding.found}`;

    const detail = document.createElement('div');
    detail.className = 'check-item-detail';
    detail.textContent = `Replace with: ${finding.replace_with}`;

    const context = document.createElement('div');
    context.className = 'check-item-detail';
    context.textContent = finding.context || '';

    const badge = document.createElement('div');
    badge.className = 'check-badge fail';
    badge.textContent = 'FIX';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(context);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }

  function createCheckItem(check) {
    const item = document.createElement('div');
    item.className = `check-item ${check.pass ? 'pass' : 'fail'}`;

    const content = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = check.target || 'Price';

    const detail = document.createElement('div');
    detail.className = 'check-item-detail';
    detail.textContent = `Actual ${formatCheckPrice(check.actual)} / Expected ${formatCheckPrice(check.expected)} / Diff ${formatCheckPrice(check.diff)}`;

    const sku = document.createElement('div');
    sku.className = 'check-item-detail';
    sku.textContent = check.sku || '';

    const badge = document.createElement('div');
    badge.className = `check-badge ${check.pass ? 'pass' : 'fail'}`;
    badge.textContent = check.pass ? 'PASS' : 'FAIL';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(sku);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }
  function formatCheckPrice(value) {
    if (value === null || value === undefined || value === '') return 'N/A';
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return `GBP ${number.toFixed(2)}`;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  }
  function addRow(parent, label, value) {
    const row = document.createElement('div');
    row.className = 'product-row';

    const key = document.createElement('div');
    key.className = 'product-key';
    key.textContent = label;

    const val = document.createElement('div');
    val.className = 'product-value';
    val.textContent = value;

    row.appendChild(key);
    row.appendChild(val);
    parent.appendChild(row);
  }

  function addImages(parent, images) {
    const row = document.createElement('div');
    row.className = 'product-row';

    const key = document.createElement('div');
    key.className = 'product-key';
    key.textContent = 'Images';

    const val = document.createElement('div');
    val.className = 'product-value product-images';

    if (!images.length) {
      val.textContent = 'Not found';
    } else {
      images.forEach((src) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Product image';
        val.appendChild(img);
      });
    }

    row.appendChild(key);
    row.appendChild(val);
    parent.appendChild(row);
  }

  function clearResult() {
    const checkResult = document.getElementById('product-check-result');
    const failedCases = document.getElementById('product-failed-cases');
    const summary = document.getElementById('product-summary');
    const raw = document.getElementById('product-raw');
    const moreArea = document.getElementById('product-more-area');

    if (checkResult) checkResult.innerHTML = '<p class="muted">Checking...</p>';
    if (failedCases) failedCases.innerHTML = '<p class="muted">Select a product row to view failed cases.</p>';
    if (summary) summary.innerHTML = '<p class="muted">No product loaded.</p>';
    if (raw) raw.value = '';
    if (moreArea) moreArea.hidden = true;
  }

  function setLoading(isLoading, message) {
    const btn = document.getElementById('btn-product-fetch');
    btn.disabled = isLoading;
    btn.innerText = isLoading ? 'Fetching...' : 'Fetch';
    if (message) setStatus(message);
  }

  function setStatus(message) {
    document.getElementById('product-status').innerText = message;
  }

  return {
    init,
    parseProductHtml,
    parseProductText,
    parseProductContent,
    fetchProductPage
  };
})();

document.addEventListener('DOMContentLoaded', productChecker.init);





























