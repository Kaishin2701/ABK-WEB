(function (global) {
  'use strict';
  const documentId = '17GoEcDHr8OHKnlsD2QNhJjdBNLQFmGwreqX74arJ01w';
  const root = `https://docs.google.com/document/d/${documentId}`;
  let loaded = false;
  let loading = false;
  const seenKey = 'abk-news-seen-tabs-v1';
  const viewedAtKey = 'abk-news-viewed-at-v1';
  const reminderInterval = 5 * 60 * 60 * 1000;
  let seenInMemory = [];
  let viewedAtInMemory = 0;
  let checking = false;
  let pendingTabs = [];
  function getSeen() { try { const value = JSON.parse(sessionStorage.getItem(seenKey) || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return seenInMemory; } }
  function getViewedAt() { try { return Number(sessionStorage.getItem(viewedAtKey)) || viewedAtInMemory; } catch (_) { return viewedAtInMemory; } }
  function shouldRemind(tabs, seen, viewedAt, now) { return tabs.length > 0 && (tabs.some(tab => !seen.includes(tab.id)) || !viewedAt || now - viewedAt >= reminderInterval || now < viewedAt); }
  function markSeen(tabs) { seenInMemory = [...new Set([...getSeen(), ...tabs.map(tab => tab.id)])]; viewedAtInMemory = Date.now(); try { sessionStorage.setItem(seenKey, JSON.stringify(seenInMemory)); sessionStorage.setItem(viewedAtKey, String(viewedAtInMemory)); } catch (_) {} }
  async function fetchTabs() { const response = await fetch(`${root}/edit`, { cache: 'no-store', credentials: 'omit' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return extractTabs(await response.text()); }
  async function checkForNew() {
    if (checking) return;
    checking = true;
    try {
      const tabs = await fetchTabs();
      if (!shouldRemind(tabs, getSeen(), getViewedAt(), Date.now())) return;
      const active = document.querySelector('.tab-content.active');
      if (!active || ['tab-information', 'tab-announcements'].includes(active.id)) return;
      const dialog = document.getElementById('news-notice');
      pendingTabs = tabs;
      if (dialog && !dialog.open) dialog.showModal();
    } catch (_) { /* An unavailable source must not block the tools. */ }
    finally { checking = false; }
  }

  // Google does not document this model format. Fail visibly if it changes.
  function extractTabs(html) {
    const found = new Map();
    const pattern = /DOCS_modelChunk\s*=\s*(\{[\s\S]*?\});\s*DOCS_modelChunkLoadStart/g;
    for (const match of html.matchAll(pattern)) {
      let chunk;
      try { chunk = JSON.parse(match[1]); } catch (_) { continue; }
      if (!Array.isArray(chunk.chunk)) continue;
      for (const entry of chunk.chunk) {
        if (entry.ty === 'mkch' && typeof entry.d?.[0]?.[1] === 'string') found.set('t.0', entry.d[0][1]);
        if (entry.ty === 'ac' && /^t\.[a-z0-9]+$/i.test(entry.d?.[0] || '') && typeof entry.d?.[1]?.[1] === 'string') found.set(entry.d[0], entry.d[1][1]);
        if (entry.ty === 'dc' && typeof entry.d?.[0] === 'string') found.delete(entry.d[0] || 't.0');
      }
    }
    if (!found.size) throw new Error('Unable to identify document tabs.');
    return [...found].map(([id, title]) => ({ id, title }));
  }

  function safeDocumentContent(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const result = document.createDocumentFragment();
    const allowed = new Set(['P', 'SPAN', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TABLE', 'TBODY', 'TR', 'TD', 'TH', 'A', 'IMG']);
    const ignored = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON']);
    const properties = ['color', 'background-color', 'font-weight', 'font-style', 'font-size', 'font-family', 'text-decoration', 'text-align', 'vertical-align', 'line-height'];
    let rules = [];
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync([...parsed.querySelectorAll('style')].map(style => style.textContent).join('\n'));
      rules = [...sheet.cssRules].filter(rule => rule.type === CSSRule.STYLE_RULE && /^(?:\.[a-zA-Z_][\w-]*|p|li|h[1-6])$/.test(rule.selectorText));
    } catch (_) { /* Text remains readable if stylesheet parsing is unavailable. */ }
    function copyStyles(source, target) {
      const copy = style => properties.forEach(property => {
        const value = style.getPropertyValue(property).trim();
        if (!value || /url\s*\(|expression\s*\(|var\s*\(|[{}<>\\]/i.test(value) || !CSS.supports(property, value)) return;
        if (property === 'font-size' && !/^\d{1,2}(?:\.\d+)?(?:px|pt|em|rem|%)$/.test(value)) return;
        if (property === 'font-family' && !/^[\w\s,"'-]+$/.test(value)) return;
        target.style.setProperty(property, value);
      });
      rules.forEach(rule => { if (source.matches(rule.selectorText)) copy(rule.style); });
      copy(source.style);
    }
    function appendSafe(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== Node.ELEMENT_NODE || ignored.has(node.tagName)) return;
      if (node.tagName === 'IMG') {
        const src = node.getAttribute('src') || '';
        if (!/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(src)) return;
        const image = document.createElement('img'); image.src = src; image.alt = node.getAttribute('alt') || 'Announcement image'; image.loading = 'lazy'; parent.append(image); return;
      }
      const target = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : parent;
      if (target !== parent) copyStyles(node, target);
      if (node.tagName === 'A') {
        try { const url = new URL(node.getAttribute('href') || ''); if (url.protocol === 'https:' || url.protocol === 'http:') { target.href = url.href; target.target = '_blank'; target.rel = 'noopener noreferrer'; } } catch (_) {}
      }
      if (target !== parent) parent.append(target);
      node.childNodes.forEach(child => appendSafe(child, target));
    }
    parsed.body.childNodes.forEach(node => appendSafe(node, result));
    return result;
  }

  async function load() {
    if (loading) return;
    const status = document.getElementById('announcements-status');
    const list = document.getElementById('announcements-list');
    const refresh = document.getElementById('announcements-refresh');
    if (!status || !list || !refresh) return;
    loading = true; refresh.disabled = true; status.textContent = 'Loading announcements…';
    try {
      const tabs = await fetchTabs();
      const results = await Promise.all(tabs.map(async tab => {
        try {
          const item = await fetch(`${root}/export?format=html&tab=${encodeURIComponent(tab.id)}`, { cache: 'no-store', credentials: 'omit' });
          if (!item.ok) throw new Error(`HTTP ${item.status}`);
          return { ...tab, content: safeDocumentContent(await item.text()) };
        } catch (_) { return { ...tab, error: true }; }
      }));
      const fragment = document.createDocumentFragment();
      results.forEach((item, index) => {
        const card = document.createElement('details'); card.className = 'announcement-card'; card.open = index === 0;
        const heading = document.createElement('summary'); heading.textContent = item.title;
        const body = document.createElement('div'); body.className = 'announcement-body';
        if (item.error) body.textContent = 'This announcement could not be loaded. Please refresh.';
        else if (!item.content.textContent.trim() && !item.content.querySelector('img')) body.textContent = 'This announcement is empty.';
        else body.append(item.content);
        card.append(heading, body); fragment.append(card);
      });
      list.replaceChildren(fragment);
      const failed = results.filter(item => item.error).length;
      loaded = failed === 0;
      if (loaded && document.getElementById('tab-announcements')?.classList.contains('active')) markSeen(tabs);
      status.textContent = `${results.length} announcement${results.length === 1 ? '' : 's'}${failed ? ` · ${failed} could not be loaded` : ''}`;
    } catch (_) {
      loaded = false;
      status.textContent = 'Announcements could not be loaded. Please check your connection and try again.';
      if (!list.childNodes.length) list.textContent = 'Announcements are currently unavailable.';
    } finally { loading = false; refresh.disabled = false; }
  }
  global.ABKAnnouncements = { load, checkForNew, loadIfNeeded: () => { if (!loaded) load(); } };
  if (typeof module !== 'undefined' && module.exports) module.exports = { extractTabs, shouldRemind };
  if (typeof document !== 'undefined') {
    document.getElementById('announcements-refresh')?.addEventListener('click', load);
    const dialog = document.getElementById('news-notice');
    dialog?.addEventListener('cancel', event => event.preventDefault());
    document.getElementById('news-notice-view')?.addEventListener('click', () => { markSeen(pendingTabs); pendingTabs = []; dialog.close(); global.switchTab('tab-announcements'); });
  }
})(typeof window !== 'undefined' ? window : globalThis);
