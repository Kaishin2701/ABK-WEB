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
    if (!site || !['rfs', 'cfs'].includes(site.id)) return proxyProviders;
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
 …25857 tokens truncated… urlNameCase) {
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
    item.className = 'check-item warning';

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
    badge.className = 'check-badge warning';
    badge.textContent = 'WARNING';

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






























