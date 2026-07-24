let isChecking = false;

const linkCheckProviders = [
    {
        name: 'Jina Reader',
        method: 'GET',
        buildUrl: (url) => `https://r.jina.ai/${url}`
    },
    {
        name: 'AllOrigins',
        method: 'GET',
        buildUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    },
    {
        name: 'CorsProxy',
        method: 'GET',
        buildUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
    },
    {
        name: 'Direct HEAD',
        method: 'HEAD',
        buildUrl: (url) => url
    },
    {
        name: 'Direct GET',
        method: 'GET',
        buildUrl: (url) => url
    }
];

document.getElementById('btn-check-link').addEventListener('click', startLinkCheck);
document.getElementById('btn-stop-link').addEventListener('click', () => isChecking = false);
document.getElementById('sel-filter').addEventListener('change', applyFilter);

async function startLinkCheck() {
    const raw = document.getElementById('inp-urls').value;
    const urls = [...new Set(raw.match(/(https?:\/\/[^\s]+)/g) || [])];

    if (!urls.length) return alert('No links found.');

    const tbody = document.querySelector('#tbl-links tbody');
    tbody.innerHTML = '';
    document.getElementById('link-p-bar').style.width = '0%';
    document.getElementById('btn-check-link').disabled = true;
    document.getElementById('btn-stop-link').disabled = false;
    isChecking = true;

    const stats = { live: 0, dead: 0, error: 0 };
    updateStats(stats);

    for (let i = 0; i < urls.length; i++) {
        if (!isChecking) break;

        const url = urls[i];
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="color:#ffa500">...</td><td>${escapeHtml(url)}</td><td>Checking...</td>`;
        tbody.appendChild(tr);

        try {
            const result = await checkUrlWithFallbacks(url);
            tr.remove();
            addLinkRow(result.code, url, result.message);

            if (result.code >= 200 && result.code < 400) stats.live++;
            else if (result.code === 404) stats.dead++;
            else stats.error++;
        } catch (error) {
            tr.remove();
            addLinkRow('ERR', url, error.message || 'Unable to check URL');
            stats.error++;
        }

        updateStats(stats);
        document.getElementById('link-p-bar').style.width = Math.round(((i + 1) / urls.length) * 100) + '%';
        document.getElementById('link-status').innerText = `Checking ${i + 1}/${urls.length}`;

        const wrapper = document.querySelector('.table-wrapper');
        wrapper.scrollTop = wrapper.scrollHeight;
    }

    isChecking = false;
    document.getElementById('btn-check-link').disabled = false;
    document.getElementById('btn-stop-link').disabled = true;
    document.getElementById('link-status').innerText = 'Done.';
}

async function checkUrlWithFallbacks(url) {
    const attempts = [];

    for (const provider of linkCheckProviders) {
        try {
            const requestUrl = provider.buildUrl(url);
            const response = await fetchWithTimeout(requestUrl, { method: provider.method }, 25000);
            const code = response.status;

            if (code >= 200 && code < 400) {
                if (provider.method !== 'HEAD') {
                    const text = await response.text();
                    if (!looksLikeUsefulResponse(text, provider.name)) {
                        throw new Error(`HTTP ${code} but response is empty`);
                    }
                }
                return { code, message: `OK via ${provider.name}` };
            }

            attempts.push(`${provider.name}: HTTP ${code}`);
            if (code === 404) return { code: 404, message: `Not Found via ${provider.name}` };
        } catch (error) {
            attempts.push(`${provider.name}: ${error.message}`);
        }
    }

    throw new Error(`Unable to check URL. Tried ${attempts.join(' | ')}`);
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error.name === 'AbortError') throw new Error('Timeout');
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function looksLikeUsefulResponse(text, providerName) {
    const content = String(text || '').trim();
    if (providerName === 'Jina Reader') return content.length > 80 && !/^Title:\s*Error/i.test(content);
    return content.length > 0;
}

function addLinkRow(code, url, msg) {
    const tbody = document.querySelector('#tbl-links tbody');
    const tr = document.createElement('tr');

    let color = '#00ccff';
    if (String(code).startsWith('2') || String(code).startsWith('3')) color = '#00ff88';
    else if (code == 404 || code == 'ERR') color = '#ff5555';

    tr.innerHTML = `
        <td style="color:${color}; font-weight:bold">${escapeHtml(code)}</td>
        <td style="color:#ddd">${escapeHtml(url)}</td>
        <td style="color:${color}">${escapeHtml(msg)}</td>
    `;
    tbody.appendChild(tr);
}

function updateStats(s) {
    document.getElementById('link-stats').innerText = `Live: ${s.live} | Dead: ${s.dead} | Error: ${s.error}`;
}

function applyFilter() {
    const filter = document.getElementById('sel-filter').value;
    const rows = document.querySelectorAll('#tbl-links tbody tr');

    rows.forEach(row => {
        const code = row.cells[0].innerText;
        let show = false;
        if (filter === 'Show All') show = true;
        else if (filter === 'Live (200)' && /^[23]/.test(code)) show = true;
        else if (filter === 'Dead (404)' && code === '404') show = true;

        row.style.display = show ? '' : 'none';
    });
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
