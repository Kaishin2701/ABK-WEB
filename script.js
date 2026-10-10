const UPDATE_LOG_ENTRIES = [
    {
        version: '6.4.1',
        label: 'Current release',
        title: 'Expanded CFS Product coverage',
        description: 'CFS Product now supports the full single-product range available in KFK, including shirts, long-sleeve products, kits with or without socks, fixed player prints, Baby Suits, all audiences and independent sleeve and chest badges. Controlled wording rotation keeps repeated generations distinct while preserving every verified product fact.'
    },
    {
        version: '6.4.0',
        label: 'Previous release',
        title: 'Multi-site Description Builder',
        description: 'Create Description now opens with a dedicated website selector. KFK keeps its existing Product and Bundle workflows, while CFS Product adds its own verified-fact inputs, Shirt Facts, Make It Yours and Good to Know template, plus site-specific validation and audit checks. CFS Bundle, RFK and RFS remain marked as coming soon.'
    },
    {
        version: '6.3.0',
        label: 'Previous release',
        title: 'Unified Product and badge editor',
        description: 'Product mode now uses the streamlined single-item editor from Bundle mode, with suggested size ranges, image-assisted colours and independent sleeve and chest badges. Product and Bundle badge fields now share the same compact autocomplete, Champions toggle and position-aware description output.'
    },
    {
        version: '6.2.3',
        label: 'Previous release',
        title: 'Bundle option consistency',
        description: 'Bundle descriptions now distinguish one shared badge option from per-item badge options, group duplicate kit types as Home (×2), clarify audience-specific shirt products and reduce repeated no-socks warnings. A grouped no-socks warning now passes validation when every affected item is named, and Champion status is selected directly with the trophy icon.'
    },
    {
        version: '6.2.2',
        label: 'Previous release',
        title: 'Combined item details',
        description: 'Printed Bundle items now show their fixed player print and colours together in one Product Details line, avoiding repeated labels for duplicate kits.'
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
    if (tabId === 'tab-create-description-kfk') {
        const frame = document.getElementById('create-description-frame');
        frame?.contentWindow?.postMessage({ type: 'cdf:open-kfk-builder' }, window.location.origin);
    }
    if (tabId === 'tab-create-description-cfs') {
        const frame = document.getElementById('create-description-cfs-frame');
        frame?.contentWindow?.postMessage({ type: 'cdf:open-cfs-builder' }, window.location.origin);
    }
}

function returnToToolLibrary() {
    switchTab('tab-tool-library');
}

window.addEventListener('message', (event) => {
    const frames = [
        document.getElementById('create-description-frame'),
        document.getElementById('create-description-cfs-frame')
    ];
    if (event.origin !== window.location.origin || !frames.some((frame) => event.source === frame?.contentWindow)) return;
    if (event.data?.type === 'cdf:return-to-site-chooser') switchTab('tab-create-description');
});

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

