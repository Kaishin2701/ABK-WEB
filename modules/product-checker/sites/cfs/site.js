window.ProductCheckerSiteRegistry.register({
  id: 'cfs',
  label: 'Cheap Football Shirts',
  status: 'active',
  domains: ['cheapfootballshirts.com'],
  skuPrefixes: ['CFS'],
  cases: ['price', 'forbidden-terms', 'alt-text', 'size-chart', 'url-name', 'personalise-option', 'description-sku', 'data-synchronization'],
  priceRules: {
    basePrices: {
      'Kids Kit - No Socks': 26.69,
      'Kids Kit - With Socks': 29.69,
      'Adult Kit - No Socks': 30.69,
      'Adult Kit - With Socks': 33.69,
      "Men's Shirt / Women's Shirt": 29.69,
      'Kids Bundle - No Socks': 44.69,
      'Kids Bundle - With Socks': 46.69,
      'Kids Bundle - Mix': 45.69,
      "Men's Shirt Bundle": 46.69,
      'Printed Bundle': 66.29
    },
    retroPriceAdjustment: 1,
    printedUpgrade: 10,
    printedBundleUpgrade: 20,
    addOns: { badge: 2.99, personalisation: 10 }
  },
  parser: 'cfs-woocommerce'
});

