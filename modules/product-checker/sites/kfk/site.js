window.ProductCheckerSiteRegistry.register({
  id: 'kfk',
  label: 'Kids Football Kit',
  status: 'active',
  domains: ['kidsfootballkit.co.uk'],
  skuPrefixes: ['KFK'],
  cases: ['price', 'forbidden-terms', 'alt-text', 'size-chart', 'url-name', 'personalise-option', 'description-sku', 'data-synchronization'],
  priceRules: {
    basePrices: {
      'Kids Kit - No Socks': 26.99,
      'Kids Kit - With Socks': 29.99,
      'Adult Kit - No Socks': 30.99,
      'Adult Kit - With Socks': 33.99,
      "Men's Shirt / Women's Shirt": 29.99,
      'Kids Bundle - No Socks': 46.99,
      'Kids Bundle - With Socks': 49.99,
      "Men's Shirt Bundle": 49.99,
      'Printed Bundle': 64.99
    },
    printedUpgrade: 10,
    skipRetro: true
  },
  parser: 'woocommerce-kfk'
});

