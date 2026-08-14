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
  const variationFetchConcurrency = 3;
  const variationDetailCache = new Map();
  let storeApiTransport = 'unknown';
  let forbiddenTermRules = [];
  let forbiddenTermRulesLoadPromise = null;

  function init() {
    const btn = document.getElementById('btn-product-fetch');
    const input = document.getElementById('product-url');

    if (!btn || !input) return;

    void loadForbiddenTermRules();

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
    variationDetailCache.clear();
    storeApiTransport = 'unknown';
    checkedProducts = urls.map((url) => ({ sourceUrl: url, url, status: 'PENDING' }));
    renderBatchResults();

    for (let index = 0; index < urls.length; index++) {
      const url = urls[index];
      const startedAt = Date.now();
      setStatus(`Checking ${index + 1}/${urls.length}: ${url}`);
      checkedProducts[index] = { sourceUrl: url, url, status: 'CHECKING' };
      renderBatchResults();

      try {
        const product = await checkProductUrl(url);
        product.processing_ms = Date.now() - startedAt;
        checkedProducts[index] = product;
      } catch (error) {
        const product = buildFetchErrorProduct(url, error);
        product.processing_ms = Date.now() - startedAt;
        checkedProducts[index] = product;
      }
      renderBatchResults();
    }

    const failed = checkedProducts.filter((product) => getProductFailedCases(product).length > 0).length;
    setLoading(false, `Done. Checked ${checkedProducts.length} products. Failed: ${failed}.`);
  }

  async function checkProductUrl(url) {
    await loadForbiddenTermRules();
    const siteHint = identifyProductSite({}, url);
    const page = await fetchProductPage(url, siteHint);
    if (isNotFoundPageContent(page.content)) return buildNotFoundProduct(url, page.provider);
    const product = parseProductContent(page.content, url, page.type, page.provider, siteHint);
    product.site = identifyProductSite(product, url);
    if (product.site.id === 'kfk') await enrichProductWithStoreApi(product, url);
    if (product.site.id === 'rfs') await enrichWordPressMediaAltText(product, url);
    product.site = identifyProductSite(product, url);
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

  function loadForbiddenTermRules() {
    if (forbiddenTermRulesLoadPromise) return forbiddenTermRulesLoadPromise;

    forbiddenTermRulesLoadPromise = fetch('Data/forbidden-terms.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((rules) => {
        if (!Array.isArray(rules)) throw new Error('Rules file must contain an array.');
        forbiddenTermRules = rules
          .filter((rule) => rule && typeof rule.find === 'string' && rule.find.trim() && typeof rule.replaceWith === 'string')
          .map((rule) => ({
            find: rule.find.trim(),
            replaceWith: rule.replaceWith.trim(),
            status: String(rule.status || 'WARNING').toUpperCase() === 'FAIL' ? 'FAIL' : 'WARNING'
          }));
        return forbiddenTermRules;
      })
      .catch((error) => {
        console.warn('Forbidden term rules could not be loaded:', error.message);
        forbiddenTermRules = [];
        return forbiddenTermRules;
      });

    return forbiddenTermRulesLoadPromise;
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
  async function fetchProductPage(url, site) {
    const attempts = [];
    const providers = getProductPageProviders(site);

    for (const provider of providers) {
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
      product.additional_information = mergeAdditionalInformation(
        product.additional_information,
        buildStoreAdditionalInformation(parent.attributes || [])
      );

      const variations = Array.isArray(parent.variations) ? parent.variations : [];
      const variationDetails = await fetchVariationDetails(variations, product.size_prices);
      const sizePrices = variationDetails.filter(Boolean).map((variation) => normalizeVariationDetail(variation));
      if (sizePrices.length) product.size_prices = mergeSizePrices(product.size_prices, sizePrices);
    } catch (error) {
      product.store_api_error = error.message;
    }

    return product;
  }

  async function fetchVariationDetail(variation) {
    const id = variation && variation.id;
    if (!id) return null;
    const cacheKey = String(id);
    if (variationDetailCache.has(cacheKey)) return variationDetailCache.get(cacheKey);

    const request = fetchVariationDetailFromApi(variation);
    variationDetailCache.set(cacheKey, request);
    return request;
  }

  function buildNotFoundProduct(url, provider) {
    return {
      sourceUrl: url,
      url,
      title: 'Not Found',
      sku: '',
      status: 'NOT_FOUND',
      fetchProvider: provider || '',
      not_found: true
    };
  }

  function isNotFoundPageContent(content) {
    const source = String(content || '');
    return /(?:^|\n)\s*Title:\s*(?:404\b|page\s+not\s+found\b|not\s+found\b)/im.test(source)
      || /<title[^>]*>\s*(?:404\b|page\s+not\s+found\b|not\s+found\b)/i.test(source);
  }

  function getProductPageProviders(site) {
    // The Size Guide is a separate WooCommerce tab. KFK, CFS and RFK must
    // receive HTML before the Reader/text fallback so AI Size Guide can only
    // be derived from that tab, never inferred from the product title.
    if (!site || !['kfk', 'rfs', 'cfs', 'rfk'].includes(site.id)) return proxyProviders;
    const htmlFirst = proxyProviders.filter((provider) => provider.type === 'html');
    const textFallback = proxyProviders.filter((provider) => provider.type !== 'html');
    return [...htmlFirst, ...textFallback];
  }

  async function fetchVariationDetailFromApi(variation) {
    const id = variation && variation.id;
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const detail = await fetchJson(`https://kidsfootballkit.co.uk/wp-json/wc/store/v1/products/${id}`);
        if (hasVariationPrice(detail)) return detail;
        return buildMissingVariationPriceResult(variation, 'Variation response did not include a price.');
      } catch (error) {
        lastError = error;
        if (!isRetriableVariationError(error) || attempt === 2) break;
      }

      if (attempt < 2) await delay(350 * (attempt + 1));
    }

    return buildMissingVariationPriceResult(variation, lastError ? lastError.message : 'Unable to fetch variation price.');
  }

  function buildMissingVariationPriceResult(variation, errorMessage) {
    return {
      id: variation && variation.id,
      variation: variation && variation.attributes ? variation.attributes.map((attr) => `${attr.name}: ${attr.value}`).join(', ') : '',
      store_api_error: errorMessage
    };
  }

  function isRetriableVariationError(error) {
    const message = String(error && error.message || '');
    return /timeout|network|failed to fetch|http (?:429|5\d\d)|service unavailable|internal server error/i.test(message);
  }

  async function fetchVariationDetails(variations, existingPrices) {
    const missingVariations = (Array.isArray(variations) ? variations : []).filter((variation) => !hasExistingVariationPrice(variation, existingPrices));
    if (!missingVariations.length) return [];

    const details = new Array(missingVariations.length);
    let nextIndex = 0;
    let completed = 0;
    const workerCount = Math.min(variationFetchConcurrency, missingVariations.length);

    const worker = async () => {
      while (nextIndex < missingVariations.length) {
        const currentIndex = nextIndex++;
        details[currentIndex] = await fetchVariationDetail(missingVariations[currentIndex]);
        completed += 1;
        setStatus(`Fetching missing size prices ${completed}/${missingVariations.length}...`);
      }
    };

    await Promise.all(Array.from({ length: workerCount }, worker));
    return details;
  }

  function hasExistingVariationPrice(variation, existingPrices) {
    const variationId = String(variation && variation.id || '');
    if (!variationId) return false;
    return (Array.isArray(existingPrices) ? existingPrices : []).some((price) => {
      return String(price && price.variation_id || '') === variationId && toComparablePrice(price && price.price) !== null;
    });
  }

  /*
   * Store API is commonly blocked by browser CORS. Once one direct request
   * fails, use the working proxy for the rest of this checking session.
   */
  async function fetchJson(url) {
    let directError = null;

    if (storeApiTransport !== 'proxy') {
      try {
        const response = await fetchWithTimeout(url, { method: 'GET' }, 30000);
        if (!response.ok) throw new Error(`Store API HTTP ${response.status}`);
        const text = await response.text();
        const data = parsePossiblyWrappedJson(text);
        storeApiTransport = 'direct';
        return data;
      } catch (error) {
        directError = error;
        storeApiTransport = 'proxy';
      }
    }

    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetchWithTimeout(jinaUrl, { method: 'GET' }, 30000);
    if (!response.ok) throw new Error(`Store API proxy HTTP ${response.status}`);
    const text = await response.text();
    try {
      return parsePossiblyWrappedJson(text);
    } catch (proxyError) {
      const prefix = directError ? `${directError.message}; ` : '';
      throw new Error(`${prefix}proxy parse failed: ${proxyError.message}`);
    }
  }

  function hasVariationPrice(variation) {
    return priceToNumber(variation && variation.prices && variation.prices.price, variation && variation.prices) !== null;
  }

  function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  function mergeSizePrices(existingPrices, incomingPrices) {
    const merged = new Map();
    const add = (price) => {
      if (!price) return;
      const key = cleanText(price.size || price.sku || price.variation_id || '').toLowerCase();
      const previous = merged.get(key);
      if (!previous) {
        merged.set(key, price);
        return;
      }
      merged.set(key, {
        ...previous,
        ...price,
        price: price.price === null || price.price === undefined ? previous.price : price.price,
        regular_price: price.regular_price === null || price.regular_price === undefined ? previous.regular_price : price.regular_price,
        sale_price: price.sale_price === null || price.sale_price === undefined ? previous.sale_price : price.sale_price
      });
    };

    (Array.isArray(existingPrices) ? existingPrices : []).forEach(add);
    (Array.isArray(incomingPrices) ? incomingPrices : []).forEach(add);
    return [...merged.values()];
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
    product.site = product.site || identifyProductSite(product, product.sourceUrl || product.url);
    if (product.site.status !== 'active') {
      product.printed = detectPrinted(product);
      appendSizeGuideAdditionalInformation(product);
      product.extracted_information = buildSiteExtractedInformation(product);
      product.site_configuration_case = buildSiteConfigurationCase(product.site);
      return product;
    }

    product.printed = detectPrinted(product);
    appendSizeGuideAdditionalInformation(product);
    product.extracted_information = buildSiteExtractedInformation(product);
    product.price_case = runPriceCase(product);
    product.forbidden_terms_case = runForbiddenTermsCase(product);
    product.alt_text_case = runAltTextCase(product);
    product.colors = extractColorsFromText(product.title);
    product.color_consistency_case = runColorConsistencyCase(product);
    product.size_chart_case = runSizeChartCase(product);
    product.url_name_case = runUrlNameCase(product);
    product.personalise_option_case = runPersonaliseOptionCase(product);
    product.description_sku_case = runDescriptionSkuCase(product);
    product.data_synchronization_case = runDataSynchronizationCase(product);
    return product;
  }

  async function enrichWordPressMediaAltText(product, url) {
    const siteLabel = product.site && product.site.label || 'This site';
    const images = Array.isArray(product.image_details) ? product.image_details : [];
    const ids = [...new Set(images.map((image) => Number(image && image.image_id)).filter(Boolean))];
    if (!ids.length) {
      product.media_alt_text_error = `${siteLabel} gallery did not expose WordPress media attachment IDs.`;
      return product;
    }

    try {
      const origin = new URL(url).origin;
      const endpoint = `${origin}/wp-json/wp/v2/media?include=${ids.join(',')}&per_page=100`;
      // RFS does not expose CORS headers for its REST API. Jina keeps this
      // request read-only while returning the original attachment metadata.
      const proxyUrl = `https://r.jina.ai/${endpoint.replace(/&/g, '%26')}`;
      const response = await fetchWithTimeout(proxyUrl, { method: 'GET' }, 30000);
      if (!response.ok) throw new Error(`Media API proxy HTTP ${response.status}`);
      const media = parsePossiblyWrappedJson(await response.text());
      const altById = new Map((Array.isArray(media) ? media : []).map((item) => [
        Number(item && item.id),
        cleanText(item && item.alt_text)
      ]));

      product.image_details = images.map((image) => {
        const adminAlt = altById.get(Number(image && image.image_id));
        return adminAlt ? { ...image, alt: adminAlt, admin_alt: adminAlt, alt_source: 'wordpress_media' } : image;
      });
      product.media_alt_text_source = 'wordpress_media';
    } catch (error) {
      product.media_alt_text_error = error.message;
    }

    return product;
  }

  function buildSiteExtractedInformation(product) {
    const parser = window.ProductCheckerSiteParsers && product.site && window.ProductCheckerSiteParsers.get(product.site.id);
    let items;
    if (parser && typeof parser.extractExtractedInformation === 'function') {
      items = parser.extractExtractedInformation(product, { buildBase: buildExtractedInformation });
    } else {
      items = buildExtractedInformation(product);
    }
    return appendSizeGuideExtractedInformation(product, items);
  }

  function appendSizeGuideExtractedInformation(product, items) {
    if (!isKeywordSizeChartSite(product)) return items;
    const rule = getSizeChartKeywordRule(product.title || '');
    const normalizedItems = Array.isArray(items) ? items.filter((item) => item.key !== 'sizeguide') : [];
    normalizedItems.push({
      key: 'sizeguide',
      label: 'Size Guide',
      value: rule ? rule.sizeGuide : '',
      sources: rule ? ['title'] : []
    });
    return normalizedItems;
  }

  function appendSizeGuideAdditionalInformation(product) {
    if (!isKeywordSizeChartSite(product)) return;

    const currentItems = Array.isArray(product.additional_information) ? product.additional_information : [];
    const withoutSizeGuide = currentItems.filter((item) => getDataSyncFieldKey(item) !== 'sizeguide');
    const actualRule = getSizeChartKeywordRule(product.size_guide || '');

    if (actualRule) {
      withoutSizeGuide.push({
        key: 'sizeguide',
        label: 'Size Guide',
        value: actualRule.sizeGuide,
        source_name: 'Size Guide tab'
      });
    }

    product.additional_information = withoutSizeGuide;
  }

  function identifyProductSite(product, url) {
    const registry = window.ProductCheckerSiteRegistry;
    const detected = registry && typeof registry.detect === 'function'
      ? registry.detect({ url: url || product.sourceUrl || product.url, sku: product.sku })
      : null;

    if (!detected) {
      return { id: 'unknown', label: 'Unknown website', status: 'planned', detected_by: 'none' };
    }

    return {
      id: detected.site.id,
      label: detected.site.label,
      status: detected.site.status,
      detected_by: detected.detectedBy,
      enabled_cases: detected.site.cases || [],
      price_rules: detected.site.priceRules || null
    };
  }

  function buildSiteConfigurationCase(site) {
    const label = site && site.label ? site.label : 'This website';
    return {
      case: 'Website Configuration Case',
      status: 'WARNING',
      issue_count: 1,
      website: label,
      findings: [{
        issue: 'site_adapter_not_ready',
        message: `${label} has been identified, but its parser and case tests have not been configured yet.`
      }]
    };
  }

  const dataSyncFields = [
    { key: 'age', label: 'Age' },
    { key: 'season', label: 'Season' },
    { key: 'clubnational', label: 'Club / National' },
    { key: 'kittype', label: 'Kit type' },
    { key: 'department', label: 'Department' },
    { key: 'player', label: 'Player' },
    { key: 'sizeguide', label: 'Size Guide' }
  ];

  function buildExtractedInformation(product) {
    const sources = getEiSources(product);
    const age = detectEiAge(sources);
    const season = detectEiSeason(sources);
    const team = detectEiTeam(sources);
    const kitType = detectEiKitType(sources);
    const department = detectEiDepartment(sources);
    const player = product.printed && product.printed.is_printed ? {
      value: cleanText(product.printed.content),
      sources: [product.printed.source || 'sku']
    } : { value: '', sources: [] };

    return [
      buildEiInformationItem('age', 'Age', age),
      buildEiInformationItem('season', 'Season', season),
      buildEiInformationItem('clubnational', 'Club / National', team),
      buildEiInformationItem('kittype', 'Kit type', kitType),
      buildEiInformationItem('department', 'Department', department),
      buildEiInformationItem('player', 'Player', player)
    ];
  }

  function buildEiInformationItem(key, label, result) {
    return {
      key,
      label,
      value: cleanText(result && result.value),
      sources: result && Array.isArray(result.sources) ? result.sources : []
    };
  }

  function getEiSources(product) {
    return [
      { key: 'title', value: product.title },
      { key: 'sku', value: product.sku },
      { key: 'url', value: decodeURIComponentSafe(product.sourceUrl || product.url || '') },
      { key: 'categories', value: Array.isArray(product.categories) ? product.categories.join(' ') : '' },
      { key: 'tags', value: Array.isArray(product.tags) ? product.tags.join(' ') : '' },
      { key: 'description', value: product.description || product.long_description || '' }
    ].filter((source) => cleanText(source.value));
  }

  function decodeURIComponentSafe(value) {
    try {
      return decodeURIComponent(String(value || ''));
    } catch (error) {
      return String(value || '');
    }
  }

  function detectEiAge(sources) {
    return detectEiValue(sources, [
      { value: 'Kids', pattern: /\b(kids?|children|child|youth|junior)\b/i },
      { value: 'Women', pattern: /\b(women|woman|womens|ladies)\b/i },
      { value: 'Men', pattern: /\b(men|mens|male)\b/i },
      { value: 'Baby', pattern: /\b(baby|infant)\b/i },
      { value: 'Adult', pattern: /\b(adult|adk)\b/i }
    ]);
  }

  function detectEiSeason(sources) {
    for (const source of sources) {
      const season = normalizeSeasonValue(source.value);
      if (season) return { value: season, sources: [source.key] };
    }
    return { value: '', sources: [] };
  }

  function detectEiKitType(sources) {
    return detectEiValue(sources, [
      { value: 'Goalkeeper', pattern: /\b(goalkeeper|goalie|\bgk\b)\b/i },
      { value: 'Pre Match', pattern: /\bpre[\s-]?match\b|\bprem\b/i },
      { value: 'Training', pattern: /\btraining\b/i },
      { value: 'Fourth', pattern: /\b(fourth|4th)\b/i },
      { value: 'Third', pattern: /\bthird\b/i },
      { value: 'Away', pattern: /\baway\b/i },
      { value: 'Home', pattern: /\bhome\b/i }
    ]);
  }

  function detectEiDepartment(sources) {
    return detectEiValue(sources, [
      { value: 'No Socks', pattern: /\b(no\s*socks?)\b/i },
      { value: 'With Socks', pattern: /\b(with\s*socks?)\b/i }
    ]);
  }

  function detectEiValue(sources, rules) {
    for (const source of sources) {
      const match = rules.find((rule) => rule.pattern.test(String(source.value || '')));
      if (match) return { value: match.value, sources: [source.key] };
    }
    return { value: '', sources: [] };
  }

  function detectEiTeam(sources) {
    const dataSets = getTeamDataSets();
    const matches = [];

    sources.forEach((source, sourceIndex) => {
      dataSets.forEach((dataSet) => {
        dataSet.entries.forEach((entry) => {
          const aliases = Array.isArray(entry.aliases) ? entry.aliases : [entry.name];
          aliases.forEach((alias) => {
            if (hasNamedEntity(source.value, alias)) {
              matches.push({ value: entry.name, source: source.key, type: dataSet.type, sourceIndex, length: normalizeEntityText(alias).length });
            }
          });
        });
      });
    });

    if (!matches.length) return { value: '', sources: [] };
    matches.sort((left, right) => left.sourceIndex - right.sourceIndex || right.length - left.length);
    const best = matches[0];
    return { value: best.value, sources: [best.source], team_type: best.type };
  }

  function getTeamDataSets() {
    return [
      { type: 'National', entries: typeof window !== 'undefined' && Array.isArray(window.NATIONAL_TEAMS) ? window.NATIONAL_TEAMS : [] },
      { type: 'Club', entries: typeof window !== 'undefined' && Array.isArray(window.FOOTBALL_CLUBS) ? window.FOOTBALL_CLUBS : [] }
    ];
  }

  function getKnownTeamVariants(value) {
    const variants = new Set();
    const normalizedValue = normalizeEntityText(value);
    if (!normalizedValue) return variants;
    variants.add(normalizedValue);

    getTeamDataSets().forEach((dataSet) => {
      dataSet.entries.forEach((entry) => {
        const aliases = Array.isArray(entry.aliases) ? entry.aliases : [entry.name];
        if (!aliases.some((alias) => hasNamedEntity(value, alias))) return;
        variants.add(normalizeEntityText(entry.name));
        aliases.forEach((alias) => variants.add(normalizeEntityText(alias)));
      });
    });
    return variants;
  }

  function knownTeamsAreEquivalent(leftValue, rightValue) {
    const leftVariants = getKnownTeamVariants(leftValue);
    const rightVariants = getKnownTeamVariants(rightValue);
    return [...leftVariants].some((variant) => rightVariants.has(variant));
  }

  function hasNamedEntity(value, candidate) {
    const normalizedValue = normalizeEntityText(value);
    const normalizedCandidate = normalizeEntityText(candidate);
    if (!normalizedValue || !normalizedCandidate) return false;
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedCandidate)}(?=$|[^a-z0-9])`, 'i');
    return pattern.test(normalizedValue);
  }

  function normalizeEntityText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function runDataSynchronizationCase(product) {
    const eiItems = Array.isArray(product.extracted_information) ? product.extracted_information : [];
    const aiItems = Array.isArray(product.additional_information) ? product.additional_information : [];
    const findings = [];
    let checkedFields = 0;
    let matchedFields = 0;

    dataSyncFields.forEach((field) => {
      const eiItem = eiItems.find((item) => item.key === field.key);
      const aiItem = aiItems.find((item) => getDataSyncFieldKey(item) === field.key);
      const eiValue = cleanText(eiItem && eiItem.value);
      const aiValue = cleanText(aiItem && aiItem.value);

      if (!eiValue && !aiValue) return;
      if (!eiValue || !aiValue) {
        findings.push({
          field: field.label,
          status: 'INFO',
          ei_value: eiValue,
          ai_value: aiValue,
          source_ei: eiItem && eiItem.sources ? eiItem.sources : [],
          source_ai: aiItem && aiItem.source_name ? aiItem.source_name : '',
          message: !eiValue ? 'EI could not identify this value.' : 'AI does not provide this field.'
        });
        return;
      }

      checkedFields += 1;
      const matches = dataSyncValuesMatch(field.key, eiValue, aiValue);
      if (matches) matchedFields += 1;
      findings.push({
        field: field.label,
        status: matches ? 'PASS' : 'FAIL',
        ei_value: eiValue,
        ai_value: aiValue,
        source_ei: eiItem && eiItem.sources ? eiItem.sources : [],
        source_ai: aiItem && aiItem.source_name ? aiItem.source_name : '',
        message: matches ? 'EI and AI values are consistent.' : 'EI and AI values conflict.'
      });
    });

    const failed = findings.filter((finding) => finding.status === 'FAIL');
    return {
      case: 'Data Synchronization Case',
      status: failed.length ? 'FAIL' : checkedFields ? 'PASS' : 'SKIP',
      checked_fields: checkedFields,
      matched_fields: matchedFields,
      issue_count: failed.length,
      findings
    };
  }

  function getDataSyncFieldKey(item) {
    const key = String(item && item.key || '').toLowerCase();
    if (['gender', 'genderage'].includes(key)) return 'age';
    if (['national', 'nation', 'nationalteam', 'club', 'clubs', 'clubname', 'clubsname', 'team', 'teams', 'clubnational'].includes(key)) return 'clubnational';
    if (['department', 'subdepartment', 'kitoption'].includes(key)) return 'department';
    if (['player', 'players', 'printedplayer'].includes(key)) return 'player';
    return key;
  }

  function dataSyncValuesMatch(field, eiValue, aiValue) {
    if (field === 'clubnational') return knownTeamsAreEquivalent(eiValue, aiValue);
    if (field === 'player') return playerNamesAreEquivalent(eiValue, aiValue);
    const left = normalizeDataSyncValue(field, eiValue);
    const right = normalizeDataSyncValue(field, aiValue);
    if (!left || !right) return false;
    if (field === 'age' && left === 'adult') return ['adult', 'men', 'women'].includes(right);
    if (field === 'age' && right === 'adult') return ['adult', 'men', 'women'].includes(left);
    return left === right;
  }

  function playerNamesAreEquivalent(leftValue, rightValue) {
    const normalizePlayer = (value) => normalizeEntityText(value).replace(/\b\d{1,3}\b/g, '').replace(/\s+/g, ' ').trim();
    const left = normalizePlayer(leftValue);
    const right = normalizePlayer(rightValue);
    if (!left || !right) return false;
    if (left === right) return true;

    // EI commonly stores "SURNAME 25", while AI stores the player's full
    // name. A complete surname is sufficient when it appears as a full word.
    const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
    const shorterWords = shorter.split(' ').filter(Boolean);
    return shorterWords.length === 1
      && shorterWords[0].length >= 4
      && new RegExp(`(^|\\s)${escapeRegex(shorterWords[0])}(?=\\s|$)`, 'i').test(longer);
  }

  function normalizeDataSyncValue(field, value) {
    const text = normalizeEntityText(value);
    if (field === 'age') {
      if (/\b(kid|kids|children|child|youth|junior)\b/.test(text)) return 'kids';
      if (/\b(women|woman|womens|ladies)\b/.test(text)) return 'women';
      if (/\b(men|mens|male)\b/.test(text)) return 'men';
      if (/\b(baby|infant)\b/.test(text)) return 'baby';
      if (/\b(adult)\b/.test(text)) return 'adult';
    }
    if (field === 'department') {
      if (/\bno socks?\b/.test(text)) return 'no socks';
      if (/\bwith socks?\b/.test(text)) return 'with socks';
    }
    if (field === 'season') return normalizeSeasonValue(value);
    if (field === 'kittype') {
      if (/goalkeeper|goalie|\bgk\b/.test(text)) return 'goalkeeper';
      if (/pre match|prematch|\bprem\b/.test(text)) return 'pre match';
      if (/training/.test(text)) return 'training';
      if (/fourth|4th/.test(text)) return 'fourth';
      if (/third/.test(text)) return 'third';
      if (/away/.test(text)) return 'away';
      if (/home/.test(text)) return 'home';
    }
    return text;
  }

  function normalizeSeasonValue(value) {
    const source = String(value || '');
    const range = source.match(/\b((?:19|20)\d{2})\s*(?:\/|-)\s*((?:19|20)\d{2}|\d{2})\b/);
    if (range) {
      const endYear = range[2].length === 2 ? range[2] : range[2].slice(-2);
      return `${range[1]}/${endYear}`;
    }
    return (source.match(/\b(?:19|20)\d{2}\b/) || [''])[0];
  }

  function runPriceCase(product) {
    const classification = classifyPriceProduct(product);
    const expected = getExpectedPrice(classification, product);
    const parsedVariations = Array.isArray(product.size_prices) ? product.size_prices : [];
    const variations = parsedVariations.length ? parsedVariations : buildStorefrontPagePriceFallback(product);

    const result = {
      case: 'Price Case',
      currency: 'GBP',
      status: 'SKIP',
      product_type: classification.productType,
      bundle: classification.isBundle,
      socks: classification.socks,
      printed: classification.isPrinted,
      expected_price: expected,
      checks: [],
      reason: classification.reason
    };

    if (expected === null) {
      result.reason = classification.reason || 'No matching price rule for this product.';
      return result;
    }

    variations.forEach((variation) => {
      result.checks.push(buildPriceCheck(`size:${variation.size || variation.variation_id || 'unknown'}`, toComparablePrice(variation.price), expected, variation.sku || '', variation.variation_id || null));
    });

    if (!result.checks.length) {
      result.status = 'WARNING';
      result.reason = 'No size variation price found to compare.';
      return result;
    }

    if (result.checks.some((check) => check.status === 'FAIL')) {
      result.status = 'FAIL';
    } else if (result.checks.some((check) => check.status === 'WARNING')) {
      result.status = 'WARNING';
    } else {
      result.status = 'PASS';
    }
    return result;
  }

  function buildPriceCheck(target, actual, expected, sku, variationId) {
    const status = actual === null ? 'WARNING' : roundMoney(actual) === roundMoney(expected) ? 'PASS' : 'FAIL';
    return {
      target,
      sku,
      variation_id: variationId || null,
      expected,
      actual,
      diff: actual === null ? null : roundMoney(actual - expected),
      pass: status === 'PASS',
      status
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
      status: findings.length ? 'WARNING' : 'PASS',
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
    return /personalise|personalize|customi[sz]e|name number|preferred name|preferred number/.test(text);
  }
  function runUrlNameCase(product) {
    if (!product || !product.site || product.site.id !== 'kfk') {
      return {
        case: 'URL / Name Case',
        status: 'SKIP',
        checked_rules: 0,
        issue_count: 0,
        findings: []
      };
    }

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
    const sizeChartData = getSizeChartDataText(product);
    const dataFindings = isKeywordSizeChartSite(product) ? validateSizeChartData(product, sizeChartData, rule) : [];
    const sizeGuideValidation = isKeywordSizeChartSite(product) ? validateSizeGuideType(product, rule) : { findings: [], actualSizeGuide: '' };
    const findings = [...altValidation.findings, ...dataFindings, ...sizeGuideValidation.findings];

    if (!rule.shortcodes.length) {
      return {
        case: 'Size Chart Case',
        status: 'WARNING',
        product_type: rule.productType,
        sku_indicator: rule.skuIndicator,
        expected_shortcodes: [],
        expected_size_chart_alts: altValidation.expectedAlts,
        size_chart_images: altValidation.images,
        detection_source: rule.detectionSource || 'SKU',
        data_table_checked: Boolean(sizeChartData),
        size_guide_checked: Boolean(sizeGuideValidation.actualSizeGuide),
        expected_size_guide: rule.sizeGuide || '',
        actual_size_guide: sizeGuideValidation.actualSizeGuide,
        issue_count: 1,
        findings: [{ issue: 'unknown_size_chart_type', message: rule.reason || 'Product type could not be identified.' }]
      };
    }

    return {
      case: 'Size Chart Case',
      status: findings.some((finding) => String(finding.status || '').toUpperCase() === 'FAIL') ? 'FAIL' : (findings.length ? 'WARNING' : 'PASS'),
      product_type: rule.productType,
      sku_indicator: rule.skuIndicator,
      expected_shortcodes: rule.shortcodes,
      expected_size_chart_alts: altValidation.expectedAlts,
      size_chart_images: altValidation.images,
      detection_source: rule.detectionSource || 'SKU',
      data_table_checked: Boolean(sizeChartData),
      size_guide_checked: Boolean(sizeGuideValidation.actualSizeGuide),
      expected_size_guide: rule.sizeGuide || '',
      actual_size_guide: sizeGuideValidation.actualSizeGuide,
      issue_count: findings.length,
      findings
    };
  }

  function classifySizeChartRule(product) {
    const sku = String(product.sku || '').toUpperCase();
    const title = cleanText(product.title || '');

    if (isKeywordSizeChartSite(product)) {
      const keywordRule = getSizeChartKeywordRule(title);
      if (keywordRule) return keywordRule;
      return {
        productType: 'Unknown',
        skuIndicator: '',
        shortcodes: [],
        detectionSource: 'Title keyword',
        reason: 'Product title does not contain the Men, Kid, Adult, Women, or Baby keyword.'
      };
    }

    if (hasSkuIndicator(sku, 'ADK')) {
      return { productType: 'Adult Football Kit (shirt + shorts)', skuIndicator: 'ADK', shortcodes: ['[kfk_size_adult]'], detectionSource: 'SKU' };
    }

    if (hasSkuIndicator(sku, 'WM')) {
      return { productType: 'Women Football Shirt', skuIndicator: 'WM', shortcodes: ['[kfk_size_women]'], detectionSource: 'SKU' };
    }

    if (hasSkuIndicator(sku, 'KD')) {
      return { productType: 'Kids Football Kit', skuIndicator: 'KD', shortcodes: ['[kfk_size_kids]'], detectionSource: 'SKU' };
    }

    if (hasSkuIndicator(sku, 'AD')) {
      return { productType: 'Men Football Shirt', skuIndicator: 'AD', shortcodes: ['[kfk_size_men]'], detectionSource: 'SKU' };
    }

    if (hasSkuIndicator(sku, 'BABY')) {
      return { productType: 'Baby Football Kit', skuIndicator: 'Baby', shortcodes: ['[kfk_size_baby]'], detectionSource: 'SKU' };
    }

    return { productType: 'Unknown', skuIndicator: '', shortcodes: [], detectionSource: 'SKU', reason: 'SKU does not contain AD, KD, WM, ADK, or Baby indicator.' };
  }

  function isKeywordSizeChartSite(product) {
    return Boolean(product && product.site && ['kfk', 'cfs', 'rfk'].includes(product.site.id));
  }

  function getSizeChartKeywordRule(title) {
    const source = cleanText(title);
    if (/\b(?:women|woman)(?:['’]?s)?\b/i.test(source)) {
      return { productType: 'Women Football Shirt', sizeGuide: "Women's Size Guide", skuIndicator: 'Women', shortcodes: ['[kfk_size_women]'], detectionSource: 'Title keyword: Women' };
    }
    if (/\b(?:baby|babies)\b/i.test(source)) {
      return { productType: 'Baby Football Kit', sizeGuide: 'Baby Size Guide', skuIndicator: 'Baby', shortcodes: ['[kfk_size_baby]'], detectionSource: 'Title keyword: Baby' };
    }
    if (/\badult\b/i.test(source)) {
      return { productType: 'Adult Football Kit (shirt + shorts)', sizeGuide: 'Adult Kit Size Guide', skuIndicator: 'ADK', shortcodes: ['[kfk_size_adult]'], detectionSource: 'Title keyword: Adult' };
    }
    if (/\b(?:kid|kids)\b/i.test(source)) {
      return { productType: 'Kids Football Kit', sizeGuide: 'Kids Size Guide', skuIndicator: 'KD', shortcodes: ['[kfk_size_kids]'], detectionSource: 'Title keyword: Kid' };
    }
    if (/\bmen(?:['’]?s)?\b/i.test(source)) {
      return { productType: 'Men Football Shirt', sizeGuide: "Men's Shirt Size Guide", skuIndicator: 'AD', shortcodes: ['[kfk_size_men]'], detectionSource: 'Title keyword: Men' };
    }
    return null;
  }

  function getSizeChartDataText(product) {
    // KFK, CFS and RFK render the authoritative measurements inside their
    // dedicated Size Guide tab. Do not validate against product descriptions,
    // which may contain unrelated layout or promotional text.
    if (isKeywordSizeChartSite(product)) {
      const tabText = cleanText(product && product.size_guide || '');
      return /^(?:n\/?a|not found)$/i.test(tabText) ? '' : tabText;
    }

    return [...new Set([
      cleanText(product && product.short_description || ''),
      cleanText(product && product.long_description || ''),
      cleanText(product && product.description || '')
    ].filter((value) => value && !/^(?:n\/?a|not found)$/i.test(value)))].join(' ');
  }

  function validateSizeGuideType(product, expectedRule) {
    const rawSizeGuide = cleanText(product && product.size_guide || '');
    if (!rawSizeGuide || /^(?:n\/?a|not found)$/i.test(rawSizeGuide) || !expectedRule || !expectedRule.sizeGuide) {
      return { actualSizeGuide: '', findings: [] };
    }

    const actualRule = getSizeChartKeywordRule(rawSizeGuide);
    if (!actualRule || actualRule.skuIndicator === expectedRule.skuIndicator) {
      return { actualSizeGuide: actualRule ? actualRule.sizeGuide : rawSizeGuide, findings: [] };
    }

    return {
      actualSizeGuide: actualRule.sizeGuide,
      findings: [{
        status: 'FAIL',
        issue: 'size_guide_type_mismatch',
        message: `The Size Guide tab is for ${actualRule.productType}, but the product title requires ${expectedRule.productType}.`,
        expected: expectedRule.sizeGuide,
        actual: actualRule.sizeGuide
      }]
    };
  }

  function hasSkuIndicator(sku, indicator) {
    return new RegExp(`(^|[^A-Z0-9])${indicator}([^A-Z0-9]|$)`).test(String(sku || '').toUpperCase());
  }

  function validateSizeChartAltText(product, rule) {
    if (product.site && product.site.id === 'rfs') {
      return validateRfsSizeChart(product, rule);
    }
    if (product.site && product.site.id === 'cfs') {
      return validateCfsSizeChart(product, rule);
    }
    if (product.site && product.site.id === 'rfk') {
      return validateRfkSizeChart(product, rule);
    }

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

  function buildStorefrontPagePriceFallback(product) {
    // When a browser proxy strips WooCommerce's variation JSON, CFS/RFK still
    // exposes one product price and the available sizes in its reader output.
    // CFS/RFK prices are uniform per variation for these products, so retain the
    // size-level comparison instead of returning a false "Checked: 0".
    if (!product || !product.site || !['cfs', 'rfk'].includes(product.site.id)) return [];
    const pagePrice = toComparablePrice(product.price);
    if (pagePrice === null) return [];
    const sizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];
    const targets = sizes.length ? sizes : ['page price'];
    return targets.map((size) => ({
      size,
      sku: '',
      price: pagePrice,
      regular_price: null,
      sale_price: pagePrice,
      variation_id: null,
      price_source: `${product.site.id}_page_price_fallback`
    }));
  }

  function validateRfsSizeChart(product, rule) {
    const expected = {
      KD: {
        label: 'RFS Kid size chart',
        files: ['RFS-Kid-size-chart.png']
      },
      AD: {
        label: 'RFS Men size chart',
        files: ['rfs-men-football-shirt-size-chart-3xl-4xl-final.webp', 'RFS-Men-Size-Chart.png']
      },
      ADK: {
        label: 'RFS Adult football kit size chart',
        files: ['RFS-adult-football-kit-size-chart.png']
      },
      WM: {
        label: 'RFS Women size chart',
        files: ['New-RFS-Women-Shirt-Size-Chart-2807.webp', 'RFS-Women-Size-Chart-Update2026.webp', 'RFS-women-size-chart.png']
      },
      Baby: {
        label: 'RFS Baby size chart',
        files: ['RFS-Kid-size-chart.png']
      }
    }[rule.skuIndicator];
    const images = getSizeChartImages(product);

    if (!expected) return { expectedAlts: [], images, findings: [] };

    const hasExpectedChart = images.some((image) => {
      const source = [image.src, image.thumbnail, image.name]
        .map((value) => String(value || '').toLowerCase().replace(/-\d{2,4}x\d{2,4}(?=\.[a-z0-9]+(?:$|[?#]))/g, ''))
        .join(' ');
      return expected.files.some((file) => source.includes(file.toLowerCase()));
    });

    return {
      expectedAlts: expected.files,
      images,
      findings: hasExpectedChart ? [] : [{
        issue: 'missing_expected_size_chart',
        message: `RFS ${rule.productType} should include the ${expected.label} image.`,
        expected_alts: expected.files,
        current_images: images.map((image) => image.src).filter(Boolean)
      }]
    };
  }

  function validateCfsSizeChart(product, rule) {
    const expected = {
      KD: { label: 'CFS Kid size chart', pattern: /cfs[\s_-]*(?:kid|kids|children).*size[\s_-]*chart/i },
      AD: { label: 'CFS Men size chart', pattern: /cfs[\s_-]*men.*(?:shirt[\s_-]*)?size[\s_-]*chart/i },
      ADK: { label: 'CFS Adult kit size chart', pattern: /cfs[\s_-]*adult.*(?:kit[\s_-]*)?size[\s_-]*chart/i },
      WM: { label: 'CFS Women size chart', pattern: /cfs[\s_-]*(?:women|womens).*size[\s_-]*chart/i },
      Baby: { label: 'CFS Baby size chart', pattern: /cfs[\s_-]*baby.*size[\s_-]*chart/i }
    }[rule.skuIndicator];
    const images = getSizeChartImages(product);
    if (!expected) return { expectedAlts: [], images, findings: [] };

    const hasExpectedChart = images.some((image) => expected.pattern.test([
      image.src, image.thumbnail, image.name, image.alt
    ].join(' ')));
    return {
      expectedAlts: [expected.label],
      images,
      findings: hasExpectedChart ? [] : [{
        issue: 'missing_expected_size_chart',
        message: `CFS ${rule.productType} should include the ${expected.label} image.`,
        expected_alts: [expected.label],
        current_images: images.map((image) => image.src).filter(Boolean)
      }]
    };
  }

  function validateRfkSizeChart(product, rule) {
    const expected = {
      KD: { label: 'RFK Kid size chart', pattern: /rfk[\s_-]*(?:kid|kids|children).*size[\s_-]*chart/i },
      AD: { label: 'RFK Men size chart', pattern: /rfk[\s_-]*men.*(?:shirt[\s_-]*)?size[\s_-]*chart/i },
      ADK: { label: 'RFK Adult kit size chart', pattern: /rfk[\s_-]*adult.*(?:kit[\s_-]*)?size[\s_-]*chart/i },
      WM: { label: 'RFK Women size chart', pattern: /rfk[\s_-]*(?:women|womens).*size[\s_-]*chart/i },
      Baby: { label: 'RFK Baby size chart', pattern: /rfk[\s_-]*baby.*size[\s_-]*chart/i }
    }[rule.skuIndicator];
    const images = getSizeChartImages(product);
    if (!expected) return { expectedAlts: [], images, findings: [] };
    const hasExpectedChart = images.some((image) => expected.pattern.test([
      image.src, image.thumbnail, image.name, image.alt
    ].join(' ')));
    return {
      expectedAlts: [expected.label],
      images,
      findings: hasExpectedChart ? [] : [{
        issue: 'missing_expected_size_chart',
        message: `RFK ${rule.productType} should include the ${expected.label} image.`,
        expected_alts: [expected.label],
        current_images: images.map((image) => image.src).filter(Boolean)
      }]
    };
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
    return String(value || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  }

  function getKidsSizeRows() {
    return [
      ['16', '3-4', '95-105', '70', '44', '32'],
      ['18', '4-5', '105-115', '74', '47', '34'],
      ['20', '5-6', '115-125', '78', '50', '36'],
      ['22', '7-8', '125-135', '82', '53', '38'],
      ['24', '8-9', '135-145', '86', '56', '39'],
      ['26', '10-11', '145-155', '90', '59', '40'],
      ['28', '12-13', '155-165', '94', '62', '43']
    ];
  }

  function getMenSizeRows() {
    return [
      ['S', '165-172', '55-65', '96-100', '73'],
      ['M', '170-178', '65-75', '100-104', '75'],
      ['L', '175-182', '75-85', '104-108', '77'],
      ['XL', '180-188', '85-95', '108-114', '79'],
      ['XXL', '185-192', '95-105', '114-120', '81'],
      ['3XL', '188-195', '105-115', '120-126', '83'],
      ['4XL', '190-200', '115-130', '126-132', '85']
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
    if (product.site && product.site.id === 'rfs' && product.media_alt_text_error) {
      return {
        case: 'Alt Text Case',
        status: 'WARNING',
        image_count: images.length,
        product_image_count: images.length,
        skipped_image_count: 0,
        skipped_images: [],
        issue_count: 1,
        findings: [{
          issue: 'media_alt_metadata_unavailable',
          message: `${product.site.label || product.site.id.toUpperCase()} WordPress Media Alt Text could not be verified, so frontend gallery Alt Text was not evaluated.`,
          detail: product.media_alt_text_error
        }]
      };
    }

    const findings = [];
    const skippedImages = [];
    const seen = new Map();

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

    });

    return {
      case: 'Alt Text Case',
      status: findings.length ? 'WARNING' : 'PASS',
      image_count: images.length,
      product_image_count: images.length - skippedImages.length,
      skipped_image_count: skippedImages.length,
      skipped_images: skippedImages,
      issue_count: findings.length,
      findings
    };
  }

  function extractColorsFromText(value) {
    const colorRules = [
      ['Sky Blue', ['sky blue']],
      ['Royal Blue', ['royal blue']],
      ['Light Blue', ['light blue']],
      ['Dark Blue', ['dark blue']],
      ['Light Green', ['light green']],
      ['Dark Green', ['dark green']],
      ['Light Grey', ['light grey', 'light gray']],
      ['Dark Grey', ['dark grey', 'dark gray']],
      ['Neon Yellow', ['neon yellow', 'fluorescent yellow']],
      ['Neon Green', ['neon green', 'fluorescent green']],
      ['Navy', ['navy']],
      ['Black', ['black']],
      ['White', ['white']],
      ['Red', ['red']],
      ['Blue', ['blue']],
      ['Green', ['green']],
      ['Yellow', ['yellow']],
      ['Gold', ['gold']],
      ['Orange', ['orange']],
      ['Purple', ['purple']],
      ['Pink', ['pink']],
      ['Grey', ['grey', 'gray']],
      ['Silver', ['silver']],
      ['Maroon', ['maroon']],
      ['Burgundy', ['burgundy']],
      ['Brown', ['brown']],
      ['Beige', ['beige']],
      ['Cream', ['cream']],
      ['Teal', ['teal']],
      ['Turquoise', ['turquoise']],
      ['Mint', ['mint']],
      ['Aqua', ['aqua']],
      ['Multicolour', ['multicolour', 'multicolor']]
    ];
    let remaining = ` ${cleanText(value).toLowerCase()} `;
    const foundColors = new Map();

    colorRules.forEach(([color, aliases]) => {
      aliases.forEach((alias) => {
        const expression = new RegExp(`(^|[^a-z])${escapeRegex(alias)}(?=$|[^a-z])`, 'i');
        const match = remaining.match(expression);
        if (!match) return;
        if (!foundColors.has(color)) foundColors.set(color, match.index + String(match[1] || '').length);
        remaining = remaining.replace(new RegExp(`(^|[^a-z])${escapeRegex(alias)}(?=$|[^a-z])`, 'ig'), (match) => match.replace(/[a-z]/ig, ' '));
      });
    });
    return [...foundColors.entries()].sort((left, right) => left[1] - right[1]).map(([color]) => color);
  }

  function runColorConsistencyCase(product) {
    const titleColors = Array.isArray(product.colors) ? product.colors : extractColorsFromText(product.title);
    const images = getAltTextImages(product).filter((image) => !getSupportImageType(image));
    const descriptions = [
      { label: 'Short Description', value: cleanText(product.short_description || '') },
      { label: 'Long Description', value: cleanText(product.long_description || product.description || '') }
    ].filter((item) => item.value && !/^(?:n\/?a|not found)$/i.test(item.value));
    const findings = [];
    let warningCount = 0;
    let failCount = 0;

    if (!images.length) {
      findings.push({
        target: 'Product images',
        status: 'WARNING',
        issue: 'alt_text_unavailable',
        message: 'No product image Alt Text was available for colour comparison.',
        title_colors: titleColors,
        alt_colors: []
      });
      warningCount += 1;
    }

    images.forEach((image, index) => {
      const target = `image:${index + 1}`;
      const alt = cleanText(image.alt || image.image_alt || '');
      if (!alt) {
        findings.push({
          target,
          status: 'WARNING',
          issue: 'alt_text_unavailable',
          message: 'Alt Text is N/A, so colour comparison could not be completed.',
          image: image.src || image.image || '',
          title_colors: titleColors,
          alt_colors: []
        });
        warningCount += 1;
        return;
      }

      const altColors = extractColorsFromText(alt);
      const unexpectedInAlt = altColors.filter((color) => !titleColors.includes(color));
      if (unexpectedInAlt.length) {
        findings.push({
          target,
          status: 'FAIL',
          issue: 'alt_colour_missing_in_title',
          message: 'Colour found in this Alt Text is missing from the product title.',
          image: image.src || image.image || '',
          title_colors: titleColors,
          alt_colors: altColors,
          colors: unexpectedInAlt,
          current_alt: alt
        });
        failCount += 1;
      }
    });

    descriptions.forEach((description) => {
      const descriptionColors = extractColorsFromText(description.value);
      // A description may mention supporting or secondary colours. It is valid
      // as long as it mentions at least one colour extracted from the title.
      // Descriptions with no colour data stay neutral (PASS), as they cannot
      // confirm or contradict the title colour.
      if (!descriptionColors.length || !titleColors.length) return;
      const matchingTitleColors = descriptionColors.filter((color) => titleColors.includes(color));
      if (matchingTitleColors.length) return;
      findings.push({
        target: description.label,
        status: 'FAIL',
        issue: 'description_has_no_title_colour',
        message: 'This description mentions colours but none of them match a colour in the product title.',
        title_colors: titleColors,
        alt_colors: descriptionColors,
        compared_source: description.label,
        colors: descriptionColors
      });
      failCount += 1;
    });

    return {
      case: 'Color Consistency Case',
      status: failCount ? 'FAIL' : warningCount ? 'WARNING' : 'PASS',
      title_colors: titleColors,
      checked_images: images.length,
      checked_descriptions: descriptions.map((description) => description.label),
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
            status: rule.status || 'WARNING',
            context: buildMatchContext(value, match.index, match.end)
          });
        });
      });
    });

    const failCount = findings.filter((finding) => finding.status === 'FAIL').length;
    const warningCount = findings.filter((finding) => finding.status === 'WARNING').length;
    return {
      case: 'Forbidden Terms Case',
      status: failCount ? 'FAIL' : warningCount ? 'WARNING' : 'PASS',
      scanned_fields: fields.map((item) => item.field),
      issue_count: findings.length,
      fail_count: failCount,
      warning_count: warningCount,
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

  function getLegacyForbiddenTermRules() {
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

  function getForbiddenTermRules() {
    return forbiddenTermRules;
  }

  function classifyPriceProduct(product) {
    const haystack = normalizeCaseText([
      product.title,
      product.sku,
      Array.isArray(product.categories) ? product.categories.join(' ') : '',
      Array.isArray(product.tags) ? product.tags.join(' ') : '',
      JSON.stringify(product.product_attributes || {})
    ].join(' '));
    const titleAndSku = normalizeCaseText([product.title, product.sku].join(' '));

    const isBundle = detectBundleFromTitle(product.title) || /bundle/.test(haystack);
    const isRetro = /retro/.test(haystack);
    const isBaby = /baby|bodysuit/.test(haystack);
    const isKids = isBaby || /kids?|children|youth|kd|kid/.test(haystack);
    const isAdult = /adult|men|women|adk|\bad\b/.test(haystack);
    const isShirtOnly = /\bshirt\b/.test(titleAndSku) && !/\b(?:kit|shorts?|socks?|bundle)\b/.test(titleAndSku);
    const sockType = detectSockType(product);
    const withSocks = sockType === 'with_socks';
    const noSocks = sockType === 'no_socks';
    const printed = detectPrinted(product).is_printed;
    const siteId = product.site && product.site.id;

    if (isBundle) {
      if (siteId === 'rfs') {
        if (isShirtOnly || /shirt bundle/.test(haystack)) return { productType: "Men's Shirt Bundle", isBundle, socks: 'n/a', isPrinted: printed, siteId };
        return { productType: withSocks ? 'Kids Bundle - With Socks' : 'Kids Bundle - No Socks', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed, siteId };
      }
      if (siteId === 'cfs') {
        if (printed) return { productType: 'Printed Bundle', isBundle, socks: 'n/a', isPrinted: printed, siteId };
        if (isShirtOnly || /shirt bundle/.test(haystack)) return { productType: "Men's Shirt Bundle", isBundle, socks: 'n/a', isPrinted: printed, siteId };
        if (/mix(?:ed)?\s*(?:socks?)?|with\s*socks?.{0,30}no\s*socks?|no\s*socks?.{0,30}with\s*socks?/i.test(haystack)) {
          return { productType: 'Kids Bundle - Mix', isBundle, socks: 'mixed', isPrinted: printed, siteId };
        }
        return { productType: withSocks ? 'Kids Bundle - With Socks' : 'Kids Bundle - No Socks', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed, siteId };
      }
      if (siteId === 'rfk') {
        if (/\b(?:3\s*[x×]|three)\s*(?:kids?|kid)\b|\b3\s*(?:kids?|kid)\s*kit/i.test(haystack)) {
          return { productType: 'Kids Bundle - 3x', isBundle, socks: 'n/a', isPrinted: printed, siteId };
        }
        if (isShirtOnly || /shirt bundle/.test(haystack)) return { productType: "Men's Shirt Bundle", isBundle, socks: 'n/a', isPrinted: printed, siteId };
        return { productType: withSocks ? 'Kids Bundle - With Socks' : 'Kids Bundle - No Socks', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed, siteId };
      }
      if (printed) return { productType: 'Printed Bundle', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed };
      if (isShirtOnly || /shirt bundle/.test(haystack)) return { productType: "Men's Shirt Bundle", isBundle, socks: 'n/a', isPrinted: printed };
      return { productType: withSocks ? 'Kids Bundle - With Socks' : 'Kids Bundle - No Socks', isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed };
    }

    if (isRetro) {
      if (siteId === 'rfs') {
        const productType = isShirtOnly
          ? 'Retro Men Shirt'
          : withSocks ? 'Retro Kid Kit - With Socks' : 'Retro Kid Kit - No Socks';
        return { productType, isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed, siteId };
      }
      if (siteId === 'cfs') {
        const baseProductType = isShirtOnly
          ? "Men's Shirt / Women's Shirt"
          : isAdult && !isKids
            ? (withSocks ? 'Adult Kit - With Socks' : 'Adult Kit - No Socks')
            : (withSocks ? 'Kids Kit - With Socks' : 'Kids Kit - No Socks');
        return {
          productType: 'Retro Shirt / Retro Kids Kit',
          baseProductType,
          priceAdjustment: 1,
          isBundle,
          socks: withSocks ? 'with_socks' : 'no_socks',
          isPrinted: printed,
          siteId
        };
      }
      if (siteId === 'rfk') {
        const baseProductType = isShirtOnly
          ? "Men's Shirt / Women's Shirt"
          : isAdult && !isKids
            ? (withSocks ? 'Adult Kit - With Socks' : 'Adult Kit - No Socks')
            : (withSocks ? 'Kids Kit - With Socks' : 'Kids Kit - No Socks');
        return { productType: 'Retro Shirt / Retro Kids Kit', baseProductType, priceAdjustment: 1, isBundle, socks: withSocks ? 'with_socks' : 'no_socks', isPrinted: printed, siteId };
      }
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

  function detectSockType(product) {
    const additionalInfo = Array.isArray(product && product.additional_information) ? product.additional_information : [];
    const attributeValues = Object.entries(product && product.product_attributes || {})
      .filter(([key]) => /kit.?option|department|socks?/i.test(key))
      .flatMap(([, value]) => Array.isArray(value) ? value : [value]);
    const attributeValue = additionalInfo
      .filter((item) => /kit.?option|department|socks?/i.test(`${item.key || ''} ${item.label || ''} ${item.source_name || ''}`))
      .map((item) => item.value)
      .concat(attributeValues)
      .map(normalizeCaseText)
      .find(Boolean);

    if (attributeValue) {
      if (/no\s*socks?|without\s*socks?/.test(attributeValue)) return 'no_socks';
      if (/with\s*socks?/.test(attributeValue)) return 'with_socks';
    }

    return detectSockTypeFromTitle(product && product.title);
  }
  function getExpectedPrice(classification, product) {
    const priceRules = getSitePriceRules(product);
    const basePrices = priceRules.basePrices || {};

    if (priceRules.skipRetro && classification.productType === 'Retro Shirt / Retro Kids Kit') return null;
    const base = basePrices[classification.baseProductType || classification.productType];
    if (base === undefined) return null;
    const adjustedBase = base + Number(classification.priceAdjustment || 0);

    if (classification.isPrinted && classification.isBundle && priceRules.printedBundleUpgrade) {
      return roundMoney(adjustedBase + priceRules.printedBundleUpgrade);
    }

    if (classification.isPrinted && classification.isBundle && priceRules.applyPrintedUpgradeToBundles && priceRules.printedUpgrade) {
      return roundMoney(adjustedBase + priceRules.printedUpgrade);
    }

    if (classification.isPrinted && !classification.isBundle && classification.productType !== 'Printed Bundle' && priceRules.printedUpgrade) {
      return roundMoney(adjustedBase + priceRules.printedUpgrade);
    }

    return roundMoney(adjustedBase);
  }

  function getSitePriceRules(product) {
    const configured = product && product.site && product.site.price_rules;
    if (configured && configured.basePrices) return configured;

    const registry = window.ProductCheckerSiteRegistry;
    const site = registry && typeof registry.get === 'function' && product && product.site
      ? registry.get(product.site.id)
      : null;
    return (site && site.priceRules) || {};
  }

  function detectPrinted(product) {
    const sku = String(product.sku || '');
    const title = String(product.title || '');
    const normalizedSku = normalizeCaseText(sku);
    const haystack = normalizeCaseText([title, sku, JSON.stringify(product.product_attributes || {})].join(' '));

    if (hasPrintedSkuPattern(sku)) {
      return {
        is_printed: true,
        content: extractPrintedSkuContent(sku),
        source: 'sku',
        reason: 'SKU contains a name/number segment, so the product is identified as printed.'
      };
    }

    const titlePlayer = extractPrintedTitleContent(title);
    if (titlePlayer) {
      return {
        is_printed: true,
        content: titlePlayer,
        source: 'title',
        reason: 'Product title ends with a player name and shirt number, so the product is identified as printed.'
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
    return /(^|_)[\p{L}][\p{L}\p{N}.'’ -]{1,}\s+\d{1,2}(_|$)/u.test(String(sku || ''));
  }

  function extractPrintedSkuContent(sku) {
    const match = String(sku || '').match(/(^|_)([\p{L}][\p{L}\p{N}.'’ -]{1,}\s+\d{1,2})(_|$)/u);
    return match ? cleanText(match[2]) : null;
  }

  function extractPrintedTitleContent(title) {
    const match = String(title || '').match(/(?:^|[-–—])\s*([\p{L}][\p{L}\p{N}.'’ -]{1,}?\s+\d{1,2})(?=\s*(?:\(|$))/u);
    return match ? cleanText(match[1]) : null;
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
  function parseProductContent(content, url, type, provider, site) {
    const looksLikeHtml = /<html|<body|<script|<div|<h1/i.test(content);
    const parser = window.ProductCheckerSiteParsers && site && window.ProductCheckerSiteParsers.get(site.id);
    let product;

    if ((type === 'html' || looksLikeHtml) && parser && typeof parser.parseHtml === 'function') {
      try {
        product = parser.parseHtml(content, url);
      } catch (error) {
        product = parseProductHtml(content, url);
        product.site_parser_error = error.message;
      }
    } else {
      product = type === 'html' || looksLikeHtml
        ? parseProductHtml(content, url)
        : parseProductText(content, url);
    }

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
    const imageDetails = extractImageDetailsFromText(text);

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
      images: imageDetails.map((image) => image.src),
      image_details: imageDetails,
      description: cleanText(longDescription),
      short_description: extractShortDescription(lines),
      long_description: cleanText(longDescription),
      description_headings: extractDescriptionHeadings(longDescription),
      global_form: globalForm,
      size_prices: [],
      product_attributes: sizes.length ? { size: sizes } : {},
      additional_information: [],
      jsonLdFound: 0
    };
  }

  function parseProductHtml(html, url) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const jsonLdProducts = extractJsonLdProducts(doc);
    const schemaProduct = jsonLdProducts.find((item) => getJsonLdTypes(item).includes('ProductGroup')) || jsonLdProducts[0] || {};
    const offer = normalizeOffer(schemaProduct.offers);
    const additionalInformation = extractAdditionalInformation(schemaProduct);
    const globalForm = extractGlobalFormFromHtml(doc);

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
    const sizeGuide = firstText(doc, [
      '#tab-kfk_size_guide',
      '.woocommerce-Tabs-panel--kfk_size_guide',
      '#tab-rfk_size_guide',
      '.woocommerce-Tabs-panel--rfk_size_guide',
      '#tab-ecomus_size_guide',
      '.woocommerce-Tabs-panel--ecomus_size_guide',
      '#tab-size-guide',
      '.woocommerce-Tabs-panel--size-guide',
      '#tab-size_guide',
      '.woocommerce-Tabs-panel--size_guide'
    ]);

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
      size_prices: extractVariationSizePrices(doc),
      images: extractImages(doc, schemaProduct.image),
      description: cleanText(description),
      size_guide: cleanText(sizeGuide),
      global_form: globalForm,
      additional_information: additionalInformation,
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

    if (!form.some(isPersonaliseOption) && hasPersonaliseSignal(cleaned)) {
      form.push({
        name: 'detected_personalise',
        label: 'Personalise',
        type: 'radio',
        values: ['Yes', 'No'],
        price: 0,
        detected_from: 'page_text'
      });
    }

    return form;
  }

  function extractGlobalFormFromHtml(doc) {
    const sections = [
      ...doc.querySelectorAll('form.cart, .product .summary, .tm-extra-product-options, .tc-extra-product-options')
    ];
    const text = sections.map((section) => section.textContent || '').join('\n') || (doc.body && doc.body.textContent) || '';
    const form = extractGlobalFormFromText(text);

    if (!form.some(isPersonaliseOption) && hasPersonaliseSignal(text)) {
      form.push({
        name: 'detected_personalise_html',
        label: 'Personalise',
        type: 'radio',
        values: ['Yes', 'No'],
        price: 0,
        detected_from: 'page_html'
      });
    }

    return form;
  }

  function hasPersonaliseSignal(text) {
    const source = String(text || '');
    return /\bpersonal(?:ise|ize)\s+(?:for\s+)?(?:\u00a3|&pound;|gbp\s*)?\s*\d+(?:\.\d{1,2})?\b/i.test(source)
      || /\bpersonal(?:ise|ize)\b[\s\S]{0,180}\bYes\s*\(\+?[\s\S]{0,30}\)\s*[\s\S]{0,80}\bNo\b/i.test(source);
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
    return extractImageDetailsFromText(text).map((image) => image.src);
  }

  function extractImageDetailsFromText(text) {
    const images = [];
    const byImageKey = new Map();
    const matches = Array.from(String(text || '').matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g));

    matches.forEach((match) => {
      const alt = cleanText(match[1]).replace(/^Image\s+\d+:\s*/i, '');
      const src = match[2];
      if (!/product|kit|football|aston|villa|uploads/i.test(src)) return;
      const imageKey = src.replace(/-\d+x\d+(?=\.[a-z0-9]+(?:\?|$))/i, '');
      const existingIndex = byImageKey.get(imageKey);
      const detail = { index: images.length, src, thumbnail: '', alt, name: alt, role: 'gallery' };

      if (existingIndex === undefined) {
        byImageKey.set(imageKey, images.length);
        images.push(detail);
      } else if (!/-\d+x\d+(?=\.[a-z0-9]+(?:\?|$))/i.test(src)) {
        images[existingIndex] = { ...images[existingIndex], src, alt: alt || images[existingIndex].alt, name: alt || images[existingIndex].name };
      }
    });

    return images.slice(0, 12).map((image, index) => ({ ...image, index, role: index === 0 ? 'main' : 'gallery' }));
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
          if (types.includes('ProductGroup') || types.includes('Product')) products.push(item);
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

  function getJsonLdTypes(item) {
    const type = item && item['@type'];
    return Array.isArray(type) ? type : [type];
  }

  function extractAdditionalInformation(schemaProduct) {
    const properties = Array.isArray(schemaProduct && schemaProduct.additionalProperty)
      ? schemaProduct.additionalProperty
      : schemaProduct && schemaProduct.additionalProperty ? [schemaProduct.additionalProperty] : [];

    return properties
      .map((property) => buildAdditionalInformationItem(property && property.name, property && property.value))
      .filter(Boolean);
  }

  function buildStoreAdditionalInformation(attributes) {
    return (Array.isArray(attributes) ? attributes : [])
      .map((attribute) => {
        const name = attribute && (attribute.name || attribute.taxonomy);
        const terms = attribute && Array.isArray(attribute.terms) ? attribute.terms.map((term) => term.name).filter(Boolean) : [];
        const value = terms.length ? terms.join(', ') : attribute && attribute.value;
        return buildAdditionalInformationItem(name, value);
      })
      .filter(Boolean);
  }

  function buildAdditionalInformationItem(name, value) {
    const rawName = cleanText(name);
    const rawValue = Array.isArray(value) ? value.map(cleanText).filter(Boolean).join(', ') : cleanText(value);
    if (!rawName || !rawValue) return null;

    const key = normalizeAdditionalInformationKey(rawName);
    return {
      key,
      label: getAdditionalInformationLabel(key, rawName),
      value: rawValue,
      source_name: rawName
    };
  }

  function normalizeAdditionalInformationKey(value) {
    let key = String(value || '').toLowerCase();
    while (/^pa[_-]?/.test(key)) key = key.replace(/^pa[_-]?/, '');
    return key.replace(/[^a-z0-9]+/g, '');
  }

  function getAdditionalInformationLabel(key, fallback) {
    const labels = {
      age: 'Age',
      gender: 'Age',
      genderage: 'Age',
      season: 'Season',
      national: 'Club / National',
      club: 'Club / National',
      clubname: 'Club / National',
      clubsname: 'Club / National',
      team: 'Club / National',
      kittype: 'Kit type',
      department: 'Department',
      subdepartment: 'Department',
      kitoption: 'Department',
      player: 'Player',
      players: 'Player'
    };

    if (labels[key]) return labels[key];
    return cleanText(fallback)
      .replace(/^pa[_-]?/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function mergeAdditionalInformation(primary, secondary) {
    const merged = [];
    const seen = new Set();

    [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(secondary) ? secondary : [])]
      .forEach((item) => {
        if (!item || !item.label || !item.value) return;
        const dedupeKey = `${item.key || item.label}::${item.value}`.toLowerCase();
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        merged.push(item);
      });

    return merged;
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
      const warningCases = getProductWarningCases(product);
      const isNotFound = isProductNotFound(product);
      const status = isPending ? product.status : isNotFound ? 'NOT FOUND' : failedCases.length ? 'FAIL' : warningCases.length ? 'WARNING' : 'PASS';
      const statusClass = status === 'FAIL' ? 'fail' : status === 'NOT FOUND' ? 'not-found' : status === 'WARNING' || status === 'SKIP' ? 'warning' : 'pass';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="product-result-url"></td>
        <td class="product-result-sku"></td>
        <td>${isPending ? '-' : failedCases.length}</td>
        <td>
          <div class="product-status-cell">
            <span class="product-status-pill ${statusClass}">${escapeHtml(status)}</span>
            <span class="product-processing-time">${isPending ? 'Processing...' : formatProcessingTime(product.processing_ms)}</span>
          </div>
        </td>
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

  function formatProcessingTime(milliseconds) {
    const value = Number(milliseconds);
    if (!Number.isFinite(value) || value < 0) return 'Time N/A';
    if (value < 1000) return `${value} ms`;

    const totalSeconds = value / 1000;
    if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}m ${seconds}s`;
  }

  function isProductNotFound(product) {
    if (!product) return false;
    if (product.status === 'NOT_FOUND' || product.not_found) return true;
    // A Product Checker result without a SKU cannot be associated with a
    // product record, regardless of how the source page formatted its title.
    if (!cleanText(product.sku)) return true;
    const fetchError = cleanText(product.fetch_error || '');
    if (/\b(?:404|not\s+found)\b/i.test(fetchError)) return true;

    const title = cleanText(product.title || '');
    return !cleanText(product.sku) && /\b(?:404|not\s+found|nothing\s+found)\b/i.test(title);
  }

  function getProductCaseEntries(product) {
    return [
      { key: 'site_configuration_case', label: 'Website Configuration Case', render: renderSiteConfigurationSection },
      { key: 'fetch_error_case', label: 'Fetch Case', render: renderFetchErrorSection },
      { key: 'price_case', label: 'Price Case', render: renderPriceCaseSection },
      { key: 'forbidden_terms_case', label: 'Forbidden Terms Case', render: renderForbiddenTermsSection },
      { key: 'alt_text_case', label: 'Alt Text Case', render: renderAltTextSection },
      { key: 'color_consistency_case', label: 'Color Consistency Case', render: renderColorConsistencySection },
      { key: 'size_chart_case', label: 'Size Chart Case', render: renderSizeChartSection },
      { key: 'url_name_case', label: 'URL / Name Case', render: renderUrlNameSection },
      { key: 'personalise_option_case', label: 'Personalise Option Case', render: renderPersonaliseOptionSection },
      { key: 'description_sku_case', label: 'Description SKU Case', render: renderDescriptionSkuSection },
      { key: 'data_synchronization_case', label: 'Data Synchronization Case', render: renderDataSynchronizationSection }
    ];
  }

  function getProductFailedCases(product) {
    return getProductCaseEntries(product).filter((entry) => {
      const caseData = product && product[entry.key];
      return caseData && String(caseData.status || '').toUpperCase() === 'FAIL';
    });
  }

  function getProductWarningCases(product) {
    return getProductCaseEntries(product).filter((entry) => {
      const caseData = product && product[entry.key];
      return caseData && String(caseData.status || '').toUpperCase() === 'WARNING';
    });
  }

  function showProductDetail(index) {
    const product = checkedProducts[index];
    if (!product) return;

    const moreArea = document.getElementById('product-more-area');
    const failedArea = document.getElementById('product-failed-cases');
    const summary = document.getElementById('product-summary');
    const additionalInformation = document.getElementById('product-additional-information');
    const raw = document.getElementById('product-raw');
    if (!moreArea || !failedArea || !summary || !additionalInformation || !raw) return;

    moreArea.hidden = false;
    failedArea.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'product-detail-title';
    title.textContent = product.title || product.sourceUrl || product.url || 'Product detail';
    failedArea.appendChild(title);

    const failedCases = getProductFailedCases(product);
    const warningCases = getProductWarningCases(product);
    if (!failedCases.length && !warningCases.length) {
      failedArea.innerHTML += '<p class="muted">No failed cases or warnings for this product.</p>';
    } else {
      if (failedCases.length) {
        const failedLabel = document.createElement('div');
        failedLabel.className = 'case-section-label fail';
        failedLabel.textContent = 'Failed cases';
        failedArea.appendChild(failedLabel);
        failedCases.forEach((entry) => entry.render(failedArea, product[entry.key]));
      }
      if (warningCases.length) {
        const warningLabel = document.createElement('div');
        warningLabel.className = 'case-section-label warning';
        warningLabel.textContent = 'Warnings';
        failedArea.appendChild(warningLabel);
        warningCases.forEach((entry) => entry.render(failedArea, product[entry.key]));
      }
    }

    renderProductSummary(summary, product);
    renderAdditionalInformation(additionalInformation, product.additional_information);
    raw.value = JSON.stringify(product, null, 2);
    moreArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderProductSummary(summary, product) {
    summary.innerHTML = '';
    addRow(summary, 'Website', product.site ? `${product.site.label} (${product.site.detected_by})` : 'Not detected');
    addRow(summary, 'URL', product.sourceUrl || product.url || 'Not found');
    addRow(summary, 'Title', product.title || 'Not found');
    addRow(summary, 'SKU', product.sku || 'Not found');
    addRow(summary, 'Colors', (product.colors || []).join(', ') || 'Not found');
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
    (product.extracted_information || []).forEach((item) => {
      addRow(summary, `EI - ${item.label}`, item.value || 'Not found');
    });
    addRow(summary, 'Data Sync Case', formatDataSynchronizationCase(product.data_synchronization_case));
    addRow(summary, 'Failed Cases', String(getProductFailedCases(product).length));
    addImages(summary, product.images || []);
  }

  function renderAdditionalInformation(area, information) {
    area.innerHTML = '';
    const items = Array.isArray(information) ? information : [];

    if (!items.length) {
      area.innerHTML = '<p class="muted">No additional information found.</p>';
      return;
    }

    items.forEach((item) => addRow(area, item.label || item.source_name || 'Attribute', item.value));
  }

  function renderDataSynchronizationSection(area, syncCase) {
    area.appendChild(createCaseStatusCard('Data Synchronization Case', syncCase, getDataSynchronizationCaseMeta(syncCase)));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(syncCase.findings) ? syncCase.findings : [];
    if (!findings.length) {
      list.innerHTML = '<p class="muted">No EI and AI fields are available to compare.</p>';
    } else {
      findings.forEach((finding) => list.appendChild(createDataSynchronizationFindingItem(finding)));
    }
    area.appendChild(list);
  }

  function renderSiteConfigurationSection(area, configurationCase) {
    area.appendChild(createCaseStatusCard('Website Configuration Case', configurationCase, [
      `Website: ${configurationCase.website || 'Unknown'}`,
      `Issues: ${configurationCase.issue_count || 0}`
    ]));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    (configurationCase.findings || []).forEach((finding) => {
      const item = document.createElement('div');
      item.className = 'check-item warning';
      item.innerHTML = `<div><div class="check-item-title">${escapeHtml(finding.issue || 'site_adapter_not_ready')}</div><div class="check-item-detail">${escapeHtml(finding.message || '')}</div></div><div class="check-badge warning">WARNING</div>`;
      list.appendChild(item);
    });
    area.appendChild(list);
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
    const additionalInformation = document.getElementById('product-additional-information');
    const raw = document.getElementById('product-raw');
    renderCheckResult(product);
    summary.innerHTML = '';

    addRow(summary, 'Title', product.title || 'Not found');
    addRow(summary, 'SKU', product.sku || 'Not found');
    addRow(summary, 'Colors', (product.colors || []).join(', ') || 'Not found');
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
    (product.extracted_information || []).forEach((item) => {
      addRow(summary, `EI - ${item.label}`, item.value || 'Not found');
    });
    addRow(summary, 'Data Sync Case', formatDataSynchronizationCase(product.data_synchronization_case));
    addImages(summary, product.images);
    if (additionalInformation) renderAdditionalInformation(additionalInformation, product.additional_information);

    raw.value = JSON.stringify(product, null, 2);
  }

  function renderCheckResult(product) {
    const area = document.getElementById('product-check-result');
    if (!area) return;

    area.innerHTML = '';
    renderPriceCaseSection(area, product.price_case || {});
    renderForbiddenTermsSection(area, product.forbidden_terms_case || { status: 'PASS', findings: [], scanned_fields: [] });
    renderAltTextSection(area, product.alt_text_case || { status: 'PASS', findings: [], image_count: 0, issue_count: 0 });
    renderColorConsistencySection(area, product.color_consistency_case || { status: 'SKIP', title_colors: [], checked_images: 0, findings: [], issue_count: 0 });
    renderSizeChartSection(area, product.size_chart_case || { status: 'SKIP', findings: [], issue_count: 0 });
    renderUrlNameSection(area, product.url_name_case || { status: 'PASS', findings: [], issue_count: 0 });
    renderPersonaliseOptionSection(area, product.personalise_option_case || { status: 'PASS', findings: [], issue_count: 0 });
    renderDescriptionSkuSection(area, product.description_sku_case || { status: 'PASS', findings: [], issue_count: 0 });
    renderDataSynchronizationSection(area, product.data_synchronization_case || { status: 'SKIP', findings: [], checked_fields: 0, matched_fields: 0, issue_count: 0 });
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
  function renderColorConsistencySection(area, colorCase) {
    area.appendChild(createCaseStatusCard('Color Consistency Case', colorCase, getColorConsistencyCaseMeta(colorCase)));

    const list = document.createElement('div');
    list.className = 'check-list case-detail-list';
    const findings = Array.isArray(colorCase.findings) ? colorCase.findings : [];
    if (!findings.length) {
      list.innerHTML = '<p class="muted">Title and product image Alt Text colours are consistent.</p>';
    } else {
      findings.forEach((finding) => list.appendChild(createColorConsistencyFindingItem(finding)));
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
      `Fail: ${forbiddenCase.fail_count || 0}`,
      `Warnings: ${forbiddenCase.warning_count || 0}`,
      `Fields: ${(forbiddenCase.scanned_fields || []).length}`
    ];
  }

  function getSizeChartCaseMeta(sizeCase) {
    return [
      sizeCase.product_type || 'Unknown',
      `Detected by: ${sizeCase.detection_source || 'SKU'} (${sizeCase.sku_indicator || 'N/A'})`,
      `Size chart images: ${(sizeCase.size_chart_images || []).length}`,
      `Data table checked: ${sizeCase.data_table_checked ? 'Yes' : 'No'}`,
      sizeCase.size_guide_checked ? `Size Guide tab: ${sizeCase.actual_size_guide || 'Detected'}` : 'Size Guide tab: Not found',
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
  function getDataSynchronizationCaseMeta(syncCase) {
    return [
      `Compared: ${syncCase.checked_fields || 0}`,
      `Matched: ${syncCase.matched_fields || 0}`,
      `Conflicts: ${syncCase.issue_count || 0}`
    ];
  }
  function formatDataSynchronizationCase(syncCase) {
    if (!syncCase) return 'Not tested';
    return `${syncCase.status || 'SKIP'} - ${syncCase.issue_count || 0} conflicts`;
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
  function getColorConsistencyCaseMeta(colorCase) {
    return [
      `Title colors: ${(colorCase.title_colors || []).join(', ') || 'None found'}`,
      `Images checked: ${colorCase.checked_images || 0}`,
      `Descriptions checked: ${(colorCase.checked_descriptions || []).join(', ') || 'None available'}`,
      `Issues: ${colorCase.issue_count || 0}`
    ];
  }
  function createDataSynchronizationFindingItem(finding) {
    const item = document.createElement('div');
    const status = String(finding.status || 'INFO').toUpperCase();
    item.className = `check-item ${status === 'FAIL' ? 'fail' : status === 'PASS' ? 'pass' : 'info'}`;

    const content = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = `${finding.field || 'Field'}: ${status}`;

    const ei = document.createElement('div');
    ei.className = 'check-item-detail';
    ei.textContent = `EI: ${finding.ei_value || 'Not found'}`;

    const ai = document.createElement('div');
    ai.className = 'check-item-detail';
    ai.textContent = `AI: ${finding.ai_value || 'Not found'}`;

    const source = document.createElement('div');
    source.className = 'check-item-detail';
    const eiSource = Array.isArray(finding.source_ei) ? finding.source_ei.join(', ') : finding.source_ei;
    source.textContent = `Sources - EI: ${eiSource || 'N/A'} / AI: ${finding.source_ai || 'N/A'}`;

    const message = document.createElement('div');
    message.className = 'check-item-detail';
    message.textContent = finding.message || '';

    const badge = document.createElement('div');
    badge.className = `check-badge ${status === 'FAIL' ? 'fail' : status === 'PASS' ? 'pass' : 'info'}`;
    badge.textContent = status;

    content.appendChild(title);
    content.appendChild(ei);
    content.appendChild(ai);
    content.appendChild(source);
    if (message.textContent) content.appendChild(message);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }
  function createDescriptionSkuFindingItem(finding) {
    const item = document.createElement('div');
    item.className = 'check-item warning';

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
    badge.className = 'check-badge warning';
    badge.textContent = 'WARNING';

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
    const status = String(finding.status || 'WARNING').toUpperCase();
    item.className = `check-item ${status === 'FAIL' ? 'fail' : 'warning'}`;

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
    current.textContent = finding.actual ? `Actual: ${finding.actual}` : (finding.current_alt ? `Current alt: ${finding.current_alt}` : '');

    const badge = document.createElement('div');
    badge.className = `check-badge ${status === 'FAIL' ? 'fail' : 'warning'}`;
    badge.textContent = status === 'FAIL' ? 'FAIL' : 'WARNING';

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
    item.className = 'check-item warning';

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
    badge.className = 'check-badge warning';
    badge.textContent = 'WARNING';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(suggestion);
    content.appendChild(current);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }
  function createColorConsistencyFindingItem(finding) {
    const status = String(finding.status || 'WARNING').toUpperCase();
    const className = status === 'FAIL' ? 'fail' : status === 'PASS' ? 'pass' : 'warning';
    const item = document.createElement('div');
    item.className = `check-item ${className}`;

    const content = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'check-item-title';
    title.textContent = `${finding.target || 'Image'}: ${finding.issue || 'color_consistency_issue'}`;
    const detail = document.createElement('div');
    detail.className = 'check-item-detail';
    detail.textContent = finding.message || '';
    const expected = document.createElement('div');
    expected.className = 'check-item-detail';
    expected.textContent = `Title colors: ${(finding.title_colors || []).join(', ') || 'None found'}`;
    const actual = document.createElement('div');
    actual.className = 'check-item-detail';
    actual.textContent = `${finding.compared_source || 'Alt'} colors: ${(finding.alt_colors || []).join(', ') || 'None found'}`;
    const mismatch = document.createElement('div');
    mismatch.className = 'check-item-detail';
    mismatch.textContent = finding.colors && finding.colors.length ? `Unexpected colors: ${finding.colors.join(', ')}` : '';
    const badge = document.createElement('div');
    badge.className = `check-badge ${className}`;
    badge.textContent = status;
    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(expected);
    content.appendChild(actual);
    if (mismatch.textContent) content.appendChild(mismatch);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }

  function createForbiddenFindingItem(finding) {
    const status = String(finding.status || 'WARNING').toUpperCase();
    const className = status === 'FAIL' ? 'fail' : 'warning';
    const item = document.createElement('div');
    item.className = `check-item ${className}`;

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
    badge.className = `check-badge ${className}`;
    badge.textContent = status === 'FAIL' ? 'FIX' : 'WARNING';

    content.appendChild(title);
    content.appendChild(detail);
    content.appendChild(context);
    item.appendChild(content);
    item.appendChild(badge);
    return item;
  }

  function createCheckItem(check) {
    const status = String(check.status || (check.pass ? 'PASS' : 'FAIL')).toUpperCase();
    const item = document.createElement('div');
    item.className = `check-item ${status === 'WARNING' ? 'warning' : status === 'PASS' ? 'pass' : 'fail'}`;

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
    badge.className = `check-badge ${status === 'WARNING' ? 'warning' : status === 'PASS' ? 'pass' : 'fail'}`;
    badge.textContent = status;

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
    const additionalInformation = document.getElementById('product-additional-information');
    const raw = document.getElementById('product-raw');
    const moreArea = document.getElementById('product-more-area');

    if (checkResult) checkResult.innerHTML = '<p class="muted">Checking...</p>';
    if (failedCases) failedCases.innerHTML = '<p class="muted">Select a product row to view failed cases.</p>';
    if (summary) summary.innerHTML = '<p class="muted">No product loaded.</p>';
    if (additionalInformation) additionalInformation.innerHTML = '<p class="muted">No additional information found.</p>';
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





























