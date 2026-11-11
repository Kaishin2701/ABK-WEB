const UPDATE_LOG_ENTRIES = [
    {
        version: '7.2.2',
        label: 'Current release',
        title: 'Clearer KFK product and bundle descriptions',
        description: 'KFK printed products no longer list their fixed player print as an optional extra. Multi-team KFK bundles now identify items by team throughout the description, with additional distinctions when needed.'
    },
    {
        version: '7.2.1',
        label: 'Previous release',
        title: 'A fresh ABK home',
        description: 'The new Home introduces an animated wireframe sphere, direct shortcuts to key tools and a cleaner What’s New section with expandable release history. The Home and Tools navigation is balanced, and Auto Watermark Plus now highlights the image upload area on hover.'
    },
    {
        version: '7.2.0',
        label: 'Previous release',
        title: 'Image previews and individual controls',
        description: 'Standard and Plus now combine image selection and previews in one workspace, including drag and drop, adding more images and clearing the batch. Standard adds per-image output names and watermark choices, image removal and duplicate-name protection. On narrow screens, the Standard image workspace appears before the settings. Oversized WebP images are compressed automatically.'
    },
    {
        version: '7.1.0',
        label: 'Previous release',
        title: 'WebP size limits for Auto Watermark',
        description: 'Standard and Plus now export WebP images with a configurable maximum file size, defaulting to 200 KB. Images at or above the limit are listed for confirmation before quality is reduced. Images that still exceed the limit are reported and excluded from export, and Plus displays the resulting file sizes.'
    },
    {
        version: '7.0.1',
        label: 'Previous release',
        title: 'Updated KFK watermark choices',
        description: 'The Standard and Plus watermark libraries now include dedicated KFK - New logo and KFK - No logo choices. The obsolete KFK library card has been removed, while the original asset remains available in the project for safe rollback.'
    },
    {
        version: '7.0.0',
        label: 'Previous release',
        title: 'Auto Watermark Standard and Plus',
        description: 'Auto Watermark now opens with a mode selector. Standard preserves the original single-workflow processor, while Plus adds batch image intake, manual per-image subtext editing, the shared built-in watermark library, custom watermark uploads, folder export and metadata-free PNG output. Full image is the default watermark position in Plus.'
    },
    {
        version: '6.6.0',
        label: 'Previous release',
        title: 'Built-in Auto Watermark library',
        description: 'Auto Watermark now opens a visual library of saved website watermarks, while Other still supports a watermark file from the user\'s device. The selected watermark is previewed and can be cleared before processing. Image quality and watermark opacity are fixed at 100%, and the compact Add, Clear and Select controls align with their adjacent fields.'
    },
    {
        version: '6.5.2',
        label: 'Previous release',
        title: 'Cleaner conditional sections and responsive builder',
        description: 'KFK and CFS descriptions now remove an optional section automatically when it has no content, preventing empty headings such as Options You Can Add or Make It Yours. Create Description also switches to a full-width single-column layout when its iframe becomes too narrow, so the Input and Output panels remain readable without horizontal clipping.'
    },
    {
        version: '6.5.1',
        label: 'Previous release',
        title: 'Lean CFS Bundle facts',
        description: 'CFS Bundle descriptions no longer repeat item colours in a separate Back line. Each shirt, kit and Baby Suit keeps its verified colours, garment contents, socks status and fixed player print under What\'s Included, while Bundle Facts remains focused on shared buying details.'
    },
    {
        version: '6.5.0',
        label: 'Previous release',
        title: 'Complete CFS Bundle builder',
        description: 'CFS Bundle now uses the full two-to-four-item editor available in KFK while generating its own approved CFS description structure. It supports shirts, kits, long-sleeve products and Baby Suits in plain, pre-printed and mixed combinations, with item-specific socks, sizes, colours and badge facts. A dedicated CFS Bundle sample and an exhaustive regression matrix cover 2,325 valid bundle configurations without unexpected blocks.'
    },
    {
        version: '6.4.4',
        label: 'Previous release',
        title: 'Clearer CFS fixed-player wording',
        description: 'CFS Printed products now state that the confirmed player name and number are pre-printed on the back of the shirt and that the print cannot be changed. The wording applies only to CFS Printed products; CFS customisable products and all KFK templates remain unchanged.'
    },
    {
        version: '6.4.3',
        label: 'Previous release',
        title: 'Badge naming and player-print fixes',
        description: 'Badge suggestions and their search hint now use the correct La Liga spelling. Product and Bundle title inference also recognises McTOMMINAY as a fixed player print while preserving the required lowercase c in the player name.'
    },
    {
        version: '6.4.2',
        label: 'Previous release',
        title: 'Automatic CFS visual copy',
        description: 'CFS Product no longer requires a separate visual-facts form. Opening and colour copy is now generated automatically from the verified team, season, product type, kit type and garment colours, with controlled wording rotation for repeated generations. Unverified back-design details are omitted instead of being invented.'
    },
    {
        version: '6.4.1',
        label: 'Previous release',
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
];

function renderUpdateLog() {
    const list = document.getElementById('update-log-list');
    if (!list) return;
    const [latest, ...previous] = UPDATE_LOG_ENTRIES;
    if (!latest) return;
    const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    list.innerHTML = `<article class="home-update-latest"><div class="home-update-meta"><strong>Ver ${escapeText(latest.version)}</strong><span>Latest update</span></div><h3>${escapeText(latest.title)}</h3><p>${escapeText(latest.description)}</p></article><div class="home-update-history">${previous.map((entry, index) => `<details class="home-update-item"${index >= 3 ? ' hidden' : ''}><summary><span class="home-update-version">${escapeText(entry.version)}</span><strong>${escapeText(entry.title)}</strong><span class="home-update-toggle" aria-hidden="true"></span></summary><p>${escapeText(entry.description)}</p></details>`).join('')}</div>`;
    const button = document.getElementById('show-all-updates');
    if (button) {
        button.hidden = previous.length <= 3;
        button.addEventListener('click', () => {
            const expanded = button.getAttribute('aria-expanded') === 'true';
            list.querySelectorAll('.home-update-item').forEach((item, index) => { if (index >= 3) { item.hidden = expanded; if (expanded) item.open = false; } });
            button.setAttribute('aria-expanded', String(!expanded));
            button.textContent = expanded ? 'View all updates →' : 'Show fewer updates ↑';
        });
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const activeTab = document.getElementById(tabId);
    if (!activeTab) return;
    activeTab.classList.add('active');

    const isToolWorkspace = !['tab-information', 'tab-tool-library'].includes(tabId);
    const section = tabId === 'tab-information' ? 'information' : 'tools';
    const backLabel = document.getElementById('nav-back-label');
    if (backLabel) backLabel.textContent = ['tab-watermark', 'tab-watermark-plus'].includes(tabId) ? 'Modes' : 'All tools';
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
    const activeTabId = document.querySelector('.tab-content.active')?.id;
    if (['tab-watermark', 'tab-watermark-plus'].includes(activeTabId)) {
        switchTab('tab-auto-watermark');
        return;
    }
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
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.getElementById('top-navigation')?.classList.contains('tool-open')) {
            returnToToolLibrary();
        }
    });
});

