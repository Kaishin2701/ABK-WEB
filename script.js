const UPDATE_LOG_ENTRIES = [
    {
        version: '5.4.5',
        label: 'Current release',
        title: 'Player data synchronization',
        description: 'Player names now match across all websites when EI includes a shirt number and AI provides the player’s full name.'
    },
    {
        version: '5.4.4',
        label: 'Previous release',
        title: 'RFK product data reliability',
        description: 'RFK now restores Additional Information and uses only the product gallery, even when the page is fetched through a text fallback.'
    },
    {
        version: '5.4.3',
        label: 'Previous release',
        title: 'Simplified Update Log',
        description: 'Removed the version-sequence note to keep the Information page focused on release history.'
    },
];

function renderUpdateLog() {
    const list = document.getElementById('update-log-list');
    if (!list) return;

    list.innerHTML = UPDATE_LOG_ENTRIES.slice(0, 3).map((entry) => `
        <article class="update-entry">
            <div class="update-entry-meta"><strong>Ver ${entry.version}</strong><span>${entry.label}</span></div>
            <h3>${entry.title}</h3>
            <p>${entry.description}</p>
        </article>
    `).join('');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const activeTab = document.getElementById(tabId);
    if (!activeTab) return;
    activeTab.classList.add('active');

    const section = tabId === 'tab-information' ? 'information' : 'tools';
    document.querySelectorAll('[data-section]').forEach((button) => {
        button.classList.toggle('active', button.dataset.section === section);
    });
    closeToolMenu();
}

function closeToolMenu() {
    const menu = document.getElementById('tool-menu');
    const toggle = document.getElementById('tool-menu-toggle');
    if (menu) menu.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function toggleToolMenu() {
    const menu = document.getElementById('tool-menu');
    const toggle = document.getElementById('tool-menu-toggle');
    if (!menu || !toggle) return;
    const willOpen = !menu.classList.contains('open');
    menu.classList.toggle('open', willOpen);
    toggle.setAttribute('aria-expanded', String(willOpen));
}

// ============= SKU GENERATOR FUNCTIONS =============
let currentSkuVariants = [];

function skuGenerate() {
    const baseCode = document.getElementById('sku-base-code').value.trim();
    
    if (!baseCode) {
        alert('âš ï¸ Vui lÃ²ng nháº­p Base Product Code');
        return;
    }

    // Generate variants using the module
    currentSkuVariants = skuAuto.generateAllVariants(baseCode);
    
    if (currentSkuVariants.length === 0) {
        alert('âŒ Base code khÃ´ng há»£p lá»‡! Cáº§n chá»©a: ADK/KD, KD hoáº·c AD');
        return;
    }

    // Display as text (má»—i dÃ²ng 1 SKU)
    const outputText = currentSkuVariants.join('\n');
    document.getElementById('sku-output').value = outputText;
    
    const infoDiv = document.getElementById('sku-info');
    infoDiv.innerHTML = `âœ… ${currentSkuVariants.length} variants Ä‘Æ°á»£c táº¡o - Copy táº¥t cáº£ rá»“i paste vÃ o Excel`;
    infoDiv.style.display = 'block';
}

function copySingleSku(sku) {
    navigator.clipboard.writeText(sku).then(() => {
        alert(`âœ… Copied: ${sku}`);
    });
}

function skuCopyAll() {
    if (currentSkuVariants.length === 0) {
        alert('âš ï¸ Vui lÃ²ng Generate trÆ°á»›c');
        return;
    }
    
    const textArea = document.getElementById('sku-output');
    textArea.select();
    document.execCommand('copy');
    alert(`âœ… Copied ${currentSkuVariants.length} SKUs to clipboard!`);
}

function skuClearForm() {
    document.getElementById('sku-base-code').value = '';
    document.getElementById('sku-output').value = 'Nháº­p base code vÃ  báº¥m Generate Ä‘á»ƒ xem káº¿t quáº£';
    document.getElementById('sku-info').style.display = 'none';
    currentSkuVariants = [];
}

function skuExportCsv() {
    if (currentSkuVariants.length === 0) {
        alert('âš ï¸ Vui lÃ²ng Generate trÆ°á»›c');
        return;
    }
    
    const baseCode = document.getElementById('sku-base-code').value;
    const csv = 'Base Code,SKU Variant\n' + 
                currentSkuVariants.map(sku => `"${baseCode}","${sku}"`).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SKU_${baseCode}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    renderUpdateLog();
    const toolToggle = document.getElementById('tool-menu-toggle');
    const toolMenu = document.getElementById('tool-menu');
    if (!toolToggle || !toolMenu) return;

    toolToggle.addEventListener('click', toggleToolMenu);
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.tool-menu-wrap')) closeToolMenu();
    });
});

