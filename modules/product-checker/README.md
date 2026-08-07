# Multi-site Product Checker

`core/` contains code shared by every website. `sites/<site-id>/` holds one adapter per website. Each adapter declares accepted domains, SKU prefixes, parser type, and enabled cases.

Do not copy KFK price, size-chart, or personalisation rules into another site. Add that website's parser and cases in its own directory. RFS is active with the common cases and its own price/size-chart rules. CFS and RFK remain intentionally `planned`, so the app does not evaluate them with KFK rules.

