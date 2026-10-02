const UPDATE_LOG_ENTRIES = [
    {
        version: '6.2.2',
        label: 'Current release',
        title: 'Combined Piece details',
        description: 'Printed Bundle Pieces now show their fixed player print and colours together in one Product Details line, avoiding repeated labels for duplicate kits.'
    },
    {
        version: '6.2.1',
        label: 'Previous release',
        title: 'Piece-by-piece colour details',
        description: 'Bundle Product Details now list colours on a separate, clearly labelled line for every shirt and kit, making each Piece easier to check before ordering.'
    },
    {
        version: '6.2.0',
        label: 'Previous release',
        title: 'Universal Bundle Builder',
        description: 'Standard Bundles and KFK Birthday Gift Packs now accept the same flexible mix of Men, Women, Kids and Baby shirts, kits and suits. Shirt inclusions are cleaner, while duplicate kit types receive numbered labels for unambiguous options and product details.'
    },
    {
        version: '6.1.1',
        label: 'Previous release',
        title: 'Independent Bundle Pieces',
        description: 'Bundle Pieces can now use different teams, seasons and kit types. Each Piece is validated independently, while its product, audience, size, socks, personalisation and player-print facts must remain internally consistent.'
    },
    {
        version: '6.1.0',
        label: 'Previous release',
        title: 'Validated Bundle Description workflow',
        description: 'Bundle Description now supports 2–4 Piece Standard Bundles and KFK Birthday Gift Packs. Approved Gift Pack policies are applied automatically, while incompatible audience, size, product, socks, print, team, season, kit type and sleeve combinations are hidden or blocked before Add or Save.'
    },
];

function renderUpdateLog() {
    const list = document.getElementById('update-log-list');
    if (!list) return;

    list.innerHTML = UPDATE_LOG_ENTRIES.slice(0, 5).map((entry, index) => `
        <article class="update-entry" data-update-card data-update-index="${index}">
            <div class="update-entry-meta"><strong>Ver ${entry.version}</strong><span>${entry.label}</span></div>
            <h3>${entry.title}</h3>
            <p>${entry.description}</p>
        </article>
    `).join('');
}

let activeUpdateIndex = 0;
let updateWheelDelta = 0;
let updateCarouselLocked = false;
let updateCarouselUnlockTimer = null;
let updatePointerStartY = null;

function circularUpdateOffset(index, activeIndex, total) {
    let offset = (index - activeIndex + total) % total;
    if (offset > Math.floor(total / 2)) offset -= total;
    return offset;
}

function renderUpdateCarousel() {
    const cards = [...document.querySelectorAll('[data-update-card]')];
    if (!cards.length) return;

    const total = cards.length;
    const isMobile = window.innerWidth <= 768;
    const cardStep = isMobile ? 70 : 92;
    activeUpdateIndex = ((activeUpdateIndex % total) + total) % total;

    cards.forEach((card, index) => {
        const offset = circularUpdateOffset(index, activeUpdateIndex, total);
        const distance = Math.abs(offset);
        const isActive = offset === 0;
        card.style.setProperty('--carousel-y', `${offset * cardStep}px`);
        card.style.setProperty('--carousel-scale', Math.max(0.82, 1 - (distance * (isMobile ? 0.065 : 0.055))).toFixed(3));
        card.style.setProperty('--carousel-opacity', Math.max(0.28, 1 - (distance * 0.3)).toFixed(2));
        card.style.setProperty('--carousel-depth', `${distance * -90}px`);
        card.style.setProperty('--carousel-tilt', `${offset * -2.5}deg`);
        card.style.zIndex = String(30 - distance);
        card.classList.toggle('active', isActive);
        card.setAttribute('aria-hidden', String(!isActive));
    });

    const currentEntry = UPDATE_LOG_ENTRIES[activeUpdateIndex];
    const status = document.getElementById('update-carousel-status');
    if (status && currentEntry) {
        status.textContent = `${activeUpdateIndex + 1} / ${total} · Ver ${currentEntry.version}`;
    }

    const list = document.getElementById('update-log-list');
    if (list && currentEntry) {
        list.setAttribute('aria-label', `Update history carousel. Showing version ${currentEntry.version}.`);
    }
}

function moveUpdateCarousel(direction) {
    const total = document.querySelectorAll('[data-update-card]').length;
    if (!total) return;
    activeUpdateIndex = (activeUpdateIndex + direction + total) % total;
    renderUpdateCarousel();
}

function handleUpdateCarouselWheel(event) {
    if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    if (updateCarouselLocked) return;

    updateWheelDelta += event.deltaY;
    if (Math.abs(updateWheelDelta) < 35) return;

    moveUpdateCarousel(updateWheelDelta > 0 ? 1 : -1);
    updateWheelDelta = 0;
    updateCarouselLocked = true;
    window.clearTimeout(updateCarouselUnlockTimer);
    updateCarouselUnlockTimer = window.setTimeout(() => {
        updateCarouselLocked = false;
    }, 380);
}

function initialiseUpdateLogCarousel() {
    const list = document.getElementById('update-log-list');
    if (!list) return;

    list.tabIndex = 0;
    list.setAttribute('role', 'region');
    list.setAttribute('aria-roledescription', 'carousel');
    list.addEventListener('wheel', handleUpdateCarouselWheel, { passive: false });
    list.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'PageDown') {
            event.preventDefault();
            moveUpdateCarousel(1);
        } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
            event.preventDefault();
            moveUpdateCarousel(-1);
        }
    });
    list.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'mouse') updatePointerStartY = event.clientY;
    });
    list.addEventListener('pointerup', (event) => {
        if (updatePointerStartY === null) return;
        const movement = event.clientY - updatePointerStartY;
        updatePointerStartY = null;
        if (Math.abs(movement) >= 38) moveUpdateCarousel(movement < 0 ? 1 : -1);
    });
    list.addEventListener('pointercancel', () => {
        updatePointerStartY = null;
    });
    window.addEventListener('resize', renderUpdateCarousel);
    renderUpdateCarousel();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const activeTab = document.getElementById(tabId);
    if (!activeTab) return;
    activeTab.classList.add('active');

    const isToolWorkspace = !['tab-information', 'tab-tool-library'].includes(tabId);
    const section = tabId === 'tab-information' ? 'information' : 'tools';
    document.querySelectorAll('[data-section]').forEach((button) => {
        button.classList.toggle('active', button.dataset.section === section);
    });
    updateNavigationMode(isToolWorkspace);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavigationMode(showBackButton) {
    const navigation = document.getElementById('top-navigation');
    const backButton = document.getElementById('tool-back-button');
    if (!navigation || !backButton) return;

    navigation.classList.toggle('tool-open', showBackButton);
    backButton.setAttribute('aria-hidden', String(!showBackButton));
    backButton.tabIndex = showBackButton ? 0 : -1;
}

function openTool(tabId) {
    switchTab(tabId);
}

function returnToToolLibrary() {
    switchTab('tab-tool-library');
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
    initialiseUpdateLogCarousel();
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.getElementById('top-navigation')?.classList.contains('tool-open')) {
            returnToToolLibrary();
        }
    });
});

