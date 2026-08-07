window.ProductCheckerSiteRegistry.register({
  id: 'rfk',
  label: 'Replica Football Kits',
  status: 'active',
  domains: ['replicafootballkits.com'],
  skuPrefixes: ['RFK'],
  cases: ['price', 'forbidden-terms', 'alt-text', 'size-chart', 'url-name', 'personalise-option', 'description-sku', 'data-synchronization'],
  priceRules: {
    basePrices: {
      'Kids Kit - No Socks': 24.49,
      'Kids Kit - With Socks': 26.49,
      'Adult Kit - No Socks': 27.49,
      'Adult Kit - With Socks': 29.49,
      "Men's Shirt / Women's Shirt": 26.49,
      'Kids Bundle - No Socks': 44.49,
      'Kids Bundle - With Socks': 47.49,
      'Kids Bundle - 3x': 71.49,
      "Men's Shirt Bundle": 47.49
    },
    retroPriceAdjustment: 1,
    printedUpgrade: 10,
    applyPrintedUpgradeToBundles: true
  },
  parser: 'rfk-woocommerce'
});

