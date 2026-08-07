(function () {
  const sites = new Map();
  const normaliseId = (value) => window.ProductCheckerContracts.normaliseId(value);

  function register(site) {
    if (!site || !site.id) throw new Error('A Product Checker site adapter needs an id.');
    sites.set(normaliseId(site.id), Object.freeze({
      status: 'planned',
      domains: [],
      skuPrefixes: [],
      cases: [],
      ...site,
      id: normaliseId(site.id)
    }));
  }

  function detect(input) {
    const sourceUrl = String(input && input.url || '');
    const sku = String(input && input.sku || '').toUpperCase();
    let host = '';
    try { host = new URL(sourceUrl).hostname.toLowerCase(); } catch (error) { /* URL is optional while parsing */ }

    for (const site of sites.values()) {
      if (site.domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
        return { site, detectedBy: 'domain' };
      }
    }
    for (const site of sites.values()) {
      if (site.skuPrefixes.some((prefix) => sku.startsWith(`${String(prefix).toUpperCase()}_`))) {
        return { site, detectedBy: 'sku' };
      }
    }
    return null;
  }

  window.ProductCheckerSiteRegistry = {
    register,
    detect,
    get: (id) => sites.get(normaliseId(id)) || null,
    list: () => [...sites.values()]
  };
})();

