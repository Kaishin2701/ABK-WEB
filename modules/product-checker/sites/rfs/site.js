window.ProductCheckerSiteRegistry.register({
  id: 'rfs',
  label: 'Replica Football Shirt',
  status: 'active',
  domains: ['replicafootballshirt.com'],
  skuPrefixes: ['RFS'],
  cases: ['price', 'forbidden-terms', 'alt-text', 'size-chart', 'url-name', 'personalise-option', 'description-sku', 'data-synchronization'],
  priceRules: {
    basePrices: {
      'Kids Kit - No Socks': 25.99,
      'Kids Kit - With Socks': 27.99,
      'Adult Kit - No Socks': 27.99,
      'Adult Kit - With Socks': 29.99,
      "Men's Shirt / Women's Shirt": 27.99,
      'Retro Kid Kit - No Socks': 26.99,
      'Retro Kid Kit - With Socks': 28.99,
      'Retro Men Shirt': 28.99,
      'Kids Bundle - No Socks': 44.99,
      'Kids Bundle - With Socks': 47.99,
      "Men's Shirt Bundle": 47.99
    },
    printedUpgrade: 10,
    printedBundleUpgrade: 20,
    addOns: {
      badge: 3.49,
      personalisation: 10,
      bundlePersonalisationPerItem: 8
    }
  },
  parser: 'rfs-woocommerce'
});

