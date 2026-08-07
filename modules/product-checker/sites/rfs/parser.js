(function () {
  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function text(doc, selectors) {
    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      const value = clean(element && element.textContent);
      if (value) return value;
    }
    return '';
  }

  function decodeHtml(doc, value) {
    const element = doc.createElement('textarea');
    element.innerHTML = String(value || '');
    return element.value;
  }

  function normaliseKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/^pa[_-]?/, '')
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function labelForAttribute(key, fallback) {
    const labels = {
      genderage: 'Gender/Age',
      season: 'Season',
      clubname: 'Clubs Name',
      national: 'National',
      kittype: 'Kit Type',
      kitoption: 'Kit Option',
      department: 'Department',
      players: 'Player',
      player: 'Player'
    };
    return labels[key] || clean(fallback).replace(/^pa[_-]?/i, '') || 'Attribute';
  }

  function flattenJsonLd(value, items) {
    if (Array.isArray(value)) {
      value.forEach((item) => flattenJsonLd(item, items));
      return;
    }
    if (!value || typeof value !== 'object') return;
    items.push(value);
    if (value['@graph']) flattenJsonLd(value['@graph'], items);
  }

  function extractSchemaProduct(doc) {
    const items = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try { flattenJsonLd(JSON.parse(script.textContent || '{}'), items); } catch (error) { /* Skip malformed schema blocks. */ }
    });
    return items.find((item) => String(item['@type'] || '').includes('ProductGroup'))
      || items.find((item) => String(item['@type'] || '').includes('Product'))
      || {};
  }

  function extractAdditionalInformation(schemaProduct) {
    const properties = Array.isArray(schemaProduct.additionalProperty) ? schemaProduct.additionalProperty : [];
    const seen = new Set();
    return properties.map((property) => {
      const sourceName = clean(property.name || '');
      const key = normaliseKey(sourceName);
      const value = clean(property.value || '');
      if (!key || !value || seen.has(`${key}:${value}`)) return null;
      seen.add(`${key}:${value}`);
      return { key, label: labelForAttribute(key, sourceName), value, source_name: sourceName };
    }).filter(Boolean);
  }

  function extractVariationPrices(doc) {
    const form = doc.querySelector('form.variations_form[data-product_variations]');
    if (!form) return [];

    try {
      const variations = JSON.parse(decodeHtml(doc, form.getAttribute('data-product_variations') || '[]'));
      return variations.map((variation) => {
        const image = variation.image || {};
        return {
          size: clean(variation.attributes && (variation.attributes.attribute_pa_size || variation.attributes.attribute_size)),
          sku: clean(variation.sku),
          price: Number.isFinite(Number(variation.display_price)) ? Number(variation.display_price) : null,
          regular_price: Number.isFinite(Number(variation.display_regular_price)) ? Number(variation.display_regular_price) : null,
          sale_price: Number.isFinite(Number(variation.display_price)) ? Number(variation.display_price) : null,
          variation_id: variation.variation_id || null,
          in_stock: Boolean(variation.is_in_stock),
          image: image.full_src || image.url || image.src || '',
          image_thumbnail: image.thumb_src || image.gallery_thumbnail_src || '',
          image_id: image.image_id || null,
          image_alt: image.alt || ''
        };
      });
    } catch (error) {
      return [];
    }
  }

  function extractImages(doc) {
    const images = [];
    const seen = new Set();
    const addImage = (element) => {
      const src = element.getAttribute('data-large_image') || element.getAttribute('data-src') || element.getAttribute('src') || element.getAttribute('content') || '';
      const imageKey = String(src).replace(/-\d{2,4}x\d{2,4}(?=\.[a-z0-9]+(?:$|[?#]))/i, '');
      if (!src || seen.has(imageKey)) return;
      seen.add(imageKey);
      const imageContainer = element.closest('[data-image-id]');
      images.push({
        index: images.length,
        src,
        thumbnail: element.getAttribute('data-thumb') || '',
        alt: element.getAttribute('alt') || '',
        name: element.getAttribute('title') || element.getAttribute('alt') || '',
        image_id: Number(imageContainer && imageContainer.getAttribute('data-image-id')) || null,
        role: images.length === 0 ? 'main' : 'gallery'
      });
    };

    // WooCommerce prints the same gallery image in full and thumbnail sizes.
    // Keep one representative image per attachment, not both DOM renderings.
    doc.querySelectorAll('.woocommerce-product-gallery img, .product-gallery img').forEach(addImage);
    // OG image is a sharing fallback, not a content image with an Alt attribute.
    if (!images.length) doc.querySelectorAll('meta[property="og:image"]').forEach(addImage);
    return images;
  }

  function extractSizes(doc, variationPrices) {
    const sizes = variationPrices.map((item) => item.size).filter(Boolean);
    doc.querySelectorAll('select[name*="size"] option').forEach((option) => {
      const value = clean(option.textContent || option.value);
      if (value && !/choose an option/i.test(value) && !sizes.includes(value)) sizes.push(value);
    });
    return sizes;
  }

  function extractOptions(doc) {
    const options = [];
    const seen = new Set();
    doc.querySelectorAll('form.cart input, form.cart select, .tm-extra-product-options input, .tm-extra-product-options select').forEach((control) => {
      const name = control.getAttribute('name') || '';
      if (!name || /^(quantity|variation_id|add-to-cart)$/i.test(name)) return;
      const container = control.closest('li, .tmcp-field-wrap, .tc-cell, p, div');
      const optionGroup = control.closest('.cpf-type-radio, .cpf-type-select, .tc-container, .tm-extra-product-options');
      const groupLabel = optionGroup && optionGroup.querySelector('.tm-epo-element-label, .tc-epo-label');
      const label = clean((groupLabel && groupLabel.textContent) || (container && container.querySelector('label') && container.querySelector('label').textContent) || control.getAttribute('aria-label') || name);
      const key = `${name}:${label}`;
      if (seen.has(key)) return;
      seen.add(key);
      const values = control.tagName === 'SELECT'
        ? [...control.options].map((option) => clean(option.textContent || option.value)).filter((value) => value && !/choose an option/i.test(value))
        : clean(control.value) ? [clean(control.value)] : [];
      options.push({ name, label, type: control.type || control.tagName.toLowerCase(), values, price: 0 });
    });
    return options;
  }

  function extractAttributes(doc, additionalInformation, sizes) {
    const attributes = {};
    if (sizes.length) attributes.size = sizes;
    additionalInformation.forEach((item) => { attributes[item.key] = [item.value]; });
    doc.querySelectorAll('.woocommerce-product-attributes tr').forEach((row) => {
      const label = clean(row.querySelector('th') && row.querySelector('th').textContent);
      const value = clean(row.querySelector('td') && row.querySelector('td').textContent);
      if (label && value) attributes[normaliseKey(label)] = value.split(',').map(clean).filter(Boolean);
    });
    return attributes;
  }

  function extractExtractedInformation(product, helpers) {
    const items = helpers.buildBase(product);
    const tokens = String(product.sku || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
    const fallbackByKey = {
      age: tokens.includes('KD') ? 'Kids' : tokens.includes('AD') || tokens.includes('ADK') ? 'Adult' : tokens.includes('WM') ? 'Women' : '',
      kittype: tokens.includes('GK') ? 'Goalkeeper'
        : tokens.includes('PREM') ? 'Pre Match'
          : tokens.includes('TN') ? 'Training'
            : tokens.includes('TH') ? 'Third'
              : tokens.includes('AW') ? 'Away'
                : tokens.includes('HO') ? 'Home' : ''
    };

    items.forEach((item) => {
      // RFS titles/SKUs do not reliably state the socks option. It belongs to
      // Additional Information only and must not be inferred into EI.
      if (item.key === 'department') {
        item.value = '';
        item.sources = [];
        return;
      }
      if (item.value || !fallbackByKey[item.key]) return;
      item.value = fallbackByKey[item.key];
      item.sources = ['sku'];
    });
    return items;
  }

  function parseHtml(html, url) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const schemaProduct = extractSchemaProduct(doc);
    const additionalInformation = extractAdditionalInformation(schemaProduct);
    const sizePrices = extractVariationPrices(doc);
    const variationForm = doc.querySelector('form.variations_form[data-product_id]');
    const images = extractImages(doc);
    const longDescription = text(doc, ['#tab-description', '.woocommerce-Tabs-panel--description', '.entry-content']);
    const shortDescription = text(doc, ['.woocommerce-product-details__short-description', '.summary .short-description']);
    const title = clean(schemaProduct.name || text(doc, ['h1.product_title', '.product_title', 'h1'])).replace(/\s*\|\s*Quality Assurance\s*$/i, '');
    const sku = clean(schemaProduct.sku || doc.querySelector('meta[property="product:retailer_item_id"]')?.getAttribute('content'));
    const imagesOnly = images.map((image) => image.src);

    return {
      sourceUrl: url,
      url,
      fetchedAt: new Date().toISOString(),
      title,
      sku,
      product_id: Number(variationForm && variationForm.getAttribute('data-product_id')) || null,
      price: text(doc, ['.summary .price ins .amount', '.summary .price .amount', 'p.price .amount']),
      regularPrice: text(doc, ['.summary .price del .amount', 'p.price del .amount']),
      currency: 'GBP',
      availability: clean(doc.querySelector('meta[property="product:availability"]')?.getAttribute('content') || text(doc, ['.stock'])),
      rating: clean(doc.querySelector('[itemprop="ratingValue"]')?.getAttribute('content') || ''),
      categories: [...doc.querySelectorAll('.posted_in a, .product_meta .posted_in a')].map((item) => clean(item.textContent)).filter(Boolean),
      tags: [...doc.querySelectorAll('.tagged_as a, .product_meta .tagged_as a')].map((item) => clean(item.textContent)).filter(Boolean),
      sizes: extractSizes(doc, sizePrices),
      size_prices: sizePrices,
      images: imagesOnly,
      image_details: images,
      description: longDescription,
      short_description: shortDescription,
      long_description: longDescription,
      description_headings: [...doc.querySelectorAll('#tab-description h2, #tab-description h3, .woocommerce-Tabs-panel--description h2, .woocommerce-Tabs-panel--description h3')].map((item) => clean(item.textContent)).filter(Boolean),
      global_form: extractOptions(doc),
      product_attributes: extractAttributes(doc, additionalInformation, extractSizes(doc, sizePrices)),
      additional_information: additionalInformation,
      jsonLdFound: schemaProduct && Object.keys(schemaProduct).length ? 1 : 0,
      parser: 'rfs-woocommerce-html'
    };
  }

  window.ProductCheckerSiteParsers.register('rfs', { parseHtml, extractExtractedInformation });
})();

