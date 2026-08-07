(function () {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  function text(doc, selectors) {
    for (const selector of selectors) {
      const value = clean(doc.querySelector(selector)?.textContent);
      if (value) return value;
    }
    return '';
  }

  function normaliseKey(value) {
    return String(value || '').toLowerCase().replace(/^pa[_-]?/, '').replace(/[^a-z0-9]+/g, '');
  }

  function attributeLabel(key, fallback) {
    const labels = {
      genderage: 'Gender/Age', season: 'Season', clubname: 'Clubs Name', national: 'National', nationalteam: 'National',
      kittype: 'Kit Type', kitoption: 'Kit Option', department: 'Department', players: 'Player', player: 'Player'
    };
    return labels[key] || clean(fallback).replace(/^pa[_-]?/i, '') || 'Attribute';
  }

  function flattenJsonLd(value, items) {
    if (Array.isArray(value)) return value.forEach((item) => flattenJsonLd(item, items));
    if (!value || typeof value !== 'object') return;
    items.push(value);
    if (value['@graph']) flattenJsonLd(value['@graph'], items);
  }

  function schemaProduct(doc) {
    const items = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try { flattenJsonLd(JSON.parse(script.textContent || '{}'), items); } catch (error) { /* malformed schema */ }
    });
    return items.find((item) => String(item['@type'] || '').includes('ProductGroup'))
      || items.find((item) => String(item['@type'] || '').includes('Product')) || {};
  }

  function addAdditional(items, seen, sourceName, rawValue) {
    const key = normaliseKey(sourceName);
    const value = clean(rawValue);
    if (!key || !value || seen.has(`${key}:${value.toLowerCase()}`)) return;
    seen.add(`${key}:${value.toLowerCase()}`);
    items.push({ key, label: attributeLabel(key, sourceName), value, source_name: clean(sourceName) });
  }

  function additionalInformation(doc, product) {
    const items = [];
    const seen = new Set();
    (Array.isArray(product.additionalProperty) ? product.additionalProperty : []).forEach((item) => {
      addAdditional(items, seen, item.name, item.value);
    });

    // CFS and RFK can render source attributes in the Additional information
    // tab instead of schema JSON-LD, so read that table as a first-class source.
    doc.querySelectorAll('.woocommerce-product-attributes tr, #tab-additional_information tr, .woocommerce-Tabs-panel--additional_information tr').forEach((row) => {
      addAdditional(items, seen, row.querySelector('th')?.textContent, row.querySelector('td')?.textContent);
    });
    return items;
  }

  function decode(doc, value) {
    const node = doc.createElement('textarea');
    node.innerHTML = String(value || '');
    return node.value;
  }

  function variationPrices(doc) {
    const form = doc.querySelector('form.variations_form[data-product_variations]');
    if (form) try {
      const variations = JSON.parse(decode(doc, form.getAttribute('data-product_variations') || '[]'));
      const parsed = variations.map((item) => {
        const image = item.image || {};
        return {
          size: clean(item.attributes?.attribute_pa_size || item.attributes?.attribute_size),
          sku: clean(item.sku),
          price: Number.isFinite(Number(item.display_price)) ? Number(item.display_price) : null,
          regular_price: Number.isFinite(Number(item.display_regular_price)) ? Number(item.display_regular_price) : null,
          sale_price: Number.isFinite(Number(item.display_price)) ? Number(item.display_price) : null,
          variation_id: item.variation_id || null,
          in_stock: Boolean(item.is_in_stock),
          image: image.full_src || image.url || image.src || '',
          image_thumbnail: image.thumb_src || image.gallery_thumbnail_src || '',
          image_id: image.image_id || null,
          image_alt: image.alt || ''
        };
      });
      if (parsed.length) return parsed;
    } catch (error) { /* Use the storefront variation selector below. */ }

    // CFS's sticky add-to-cart form contains one option per variation. This
    // survives some HTML proxies that remove the large JSON data attribute.
    const fromSelector = [];
    doc.querySelectorAll('select[name="variation_id"] option[value]').forEach((option) => {
      const value = clean(option.value);
      const label = clean(option.textContent);
      // The separator before a CFS variation price is an em/en dash. Requiring
      // it prevents the age digits in e.g. "16 (3-4 yrs)" being misread as a
      // size/price pair ("1" and "6.00").
      const match = label.match(/^(.+?)\s*[â€”â€“]\s*Â£\s*([0-9]+(?:\.[0-9]{1,2})?)\s*$/i);
      if (!value || !match) return;
      fromSelector.push({
        size: clean(match[1]).replace(/[â€”-]\s*$/, ''),
        sku: '',
        price: Number(match[2]),
        regular_price: null,
        sale_price: Number(match[2]),
        variation_id: value,
        in_stock: true,
        image: option.getAttribute('data-image') || '',
        image_thumbnail: '',
        image_id: null,
        image_alt: ''
      });
    });
    return fromSelector;
  }

  function images(doc) {
    const result = [];
    const seen = new Set();
    const add = (node) => {
      const src = node.getAttribute('data-large_image') || node.getAttribute('data-src') || node.getAttribute('src') || node.getAttribute('content') || '';
      const id = node.closest('[data-image-id]')?.getAttribute('data-image-id') || '';
      const key = id || src.replace(/-\d{2,4}x\d{2,4}(?=\.[a-z0-9]+(?:$|[?#]))/i, '');
      if (!src || seen.has(key)) return;
      seen.add(key);
      result.push({
        index: result.length, src, thumbnail: node.getAttribute('data-thumb') || '',
        alt: node.getAttribute('alt') || '', name: node.getAttribute('title') || node.getAttribute('alt') || '',
        image_id: Number(id) || null, role: result.length ? 'gallery' : 'main'
      });
    };
    doc.querySelectorAll('.woocommerce-product-gallery img, .product-gallery img, .product-images img').forEach(add);
    if (!result.length) doc.querySelectorAll('meta[property="og:image"]').forEach(add);
    return result;
  }

  function sizes(doc, prices) {
    const result = prices.map((item) => item.size).filter(Boolean);
    doc.querySelectorAll('select[name*="size"] option').forEach((option) => {
      const value = clean(option.textContent || option.value);
      if (value && !/choose an option/i.test(value) && !result.includes(value)) result.push(value);
    });
    return result;
  }

  function globalForm(doc) {
    const result = [];
    const seen = new Set();
    doc.querySelectorAll('form.cart input, form.cart select, .tm-extra-product-options input, .tm-extra-product-options select').forEach((control) => {
      const name = control.getAttribute('name') || '';
      if (!name || /^(quantity|variation_id|add-to-cart)$/i.test(name)) return;
      const group = control.closest('.cpf-type-radio, .cpf-type-select, .tc-container, .tm-extra-product-options');
      const label = clean(group?.querySelector('.tm-epo-element-label, .tc-epo-label')?.textContent || control.closest('li, p, div')?.querySelector('label')?.textContent || control.getAttribute('aria-label') || name);
      const key = `${name}:${label}`;
      if (seen.has(key)) return;
      seen.add(key);
      const values = control.tagName === 'SELECT'
        ? [...control.options].map((option) => clean(option.textContent || option.value)).filter((value) => value && !/choose an option/i.test(value))
        : clean(control.value) ? [clean(control.value)] : [];
      result.push({ name, label, type: control.type || control.tagName.toLowerCase(), values, price: 0 });
    });
    return result;
  }

  function attributes(info, productSizes) {
    const result = {};
    if (productSizes.length) result.size = productSizes;
    info.forEach((item) => { result[item.key] = [item.value]; });
    return result;
  }

  function extractExtractedInformation(product, helpers) {
    const items = helpers.buildBase(product);
    const tokens = String(product.sku || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
    const fallback = {
      age: tokens.includes('KD') ? 'Kids' : tokens.includes('AD') || tokens.includes('ADK') ? 'Adult' : tokens.includes('WM') ? 'Women' : '',
      kittype: tokens.includes('GK') ? 'Goalkeeper' : tokens.includes('PREM') ? 'Pre Match' : tokens.includes('TN') ? 'Training' : tokens.includes('TH') ? 'Third' : tokens.includes('AW') ? 'Away' : tokens.includes('HO') ? 'Home' : ''
    };
    items.forEach((item) => {
      // As with RFS, socks are controlled by Additional Information, not EI.
      if (item.key === 'department') { item.value = ''; item.sources = []; return; }
      if (!item.value && fallback[item.key]) { item.value = fallback[item.key]; item.sources = ['sku']; }
    });
    return items;
  }

  function parseHtml(html, url) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const schema = schemaProduct(doc);
    const info = additionalInformation(doc, schema);
    const sizePrices = variationPrices(doc);
    const productImages = images(doc);
    const description = text(doc, ['#tab-description', '.woocommerce-Tabs-panel--description', '.entry-content']);
    const form = doc.querySelector('form.variations_form[data-product_id]');
    const productSizes = sizes(doc, sizePrices);
    return {
      sourceUrl: url, url, fetchedAt: new Date().toISOString(),
      title: clean(schema.name || text(doc, ['h1.product_title', '.product_title', 'h1'])).replace(/\s*\|\s*(?:100%\s*)?Satisfaction\s*$/i, ''),
      sku: clean(schema.sku || doc.querySelector('[itemprop="sku"]')?.textContent || doc.querySelector('meta[property="product:retailer_item_id"]')?.getAttribute('content')),
      product_id: Number(form?.getAttribute('data-product_id')) || null,
      price: text(doc, ['.summary .price ins .amount', '.summary .price .amount', 'p.price .amount']),
      regularPrice: text(doc, ['.summary .price del .amount', 'p.price del .amount']), currency: 'GBP',
      availability: clean(doc.querySelector('meta[property="product:availability"]')?.getAttribute('content') || text(doc, ['.stock'])),
      rating: clean(doc.querySelector('[itemprop="ratingValue"]')?.getAttribute('content')),
      categories: [...doc.querySelectorAll('.posted_in a, .product_meta .posted_in a')].map((node) => clean(node.textContent)).filter(Boolean),
      tags: [...doc.querySelectorAll('.tagged_as a, .product_meta .tagged_as a')].map((node) => clean(node.textContent)).filter(Boolean),
      sizes: productSizes, size_prices: sizePrices, images: productImages.map((item) => item.src), image_details: productImages,
      description, short_description: text(doc, ['.woocommerce-product-details__short-description', '.summary .short-description']), long_description: description,
      description_headings: [...doc.querySelectorAll('#tab-description h2, #tab-description h3, .woocommerce-Tabs-panel--description h2, .woocommerce-Tabs-panel--description h3')].map((node) => clean(node.textContent)).filter(Boolean),
      global_form: globalForm(doc), product_attributes: attributes(info, productSizes), additional_information: info,
      jsonLdFound: Object.keys(schema).length ? 1 : 0, parser: 'cfs-woocommerce-html'
    };
  }

  // RFK currently uses the same WooCommerce markup as CFS. Its registration
  // remains separate so it can be replaced independently if the theme changes.
  window.ProductCheckerSiteParsers.register('cfs', { parseHtml, extractExtractedInformation });
  window.ProductCheckerSiteParsers.register('rfk', { parseHtml, extractExtractedInformation });
})();

