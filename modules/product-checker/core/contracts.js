(function () {
  const normaliseId = (value) => String(value || '').trim().toLowerCase();

  window.ProductCheckerContracts = {
    normaliseId,
    createCaseResult(caseName, status, findings, extra) {
      const items = Array.isArray(findings) ? findings : [];
      return {
        case: caseName,
        status: status || 'SKIP',
        issue_count: items.length,
        findings: items,
        ...(extra || {})
      };
    }
  };

  const parsers = new Map();
  window.ProductCheckerSiteParsers = {
    register(siteId, parser) {
      parsers.set(normaliseId(siteId), parser);
    },
    get(siteId) {
      return parsers.get(normaliseId(siteId));
    }
  };
})();

