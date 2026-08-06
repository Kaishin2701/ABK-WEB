function switchTab(tabId) {
    // Hide all
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Show one
    document.getElementById(tabId).classList.add('active');
    
    // Active button logic
    const btns = document.querySelectorAll('.tab-btn');
    if(tabId === 'tab-watermark') btns[0].classList.add('active');
    if(tabId === 'tab-linkcheck') btns[1].classList.add('active');
    if(tabId === 'tab-cleaner') btns[2].classList.add('active');
    if(tabId === 'tab-sku') btns[3].classList.add('active');
    if(tabId === 'tab-product') btns[4].classList.add('active');
}

// ============= SKU GENERATOR FUNCTIONS =============
let currentSkuVariants = [];

function skuGenerate() {
    const baseCode = document.getElementById('sku-base-code').value.trim();
    
    if (!baseCode) {
        alert('⚠️ Vui lòng nhập Base Product Code');
        return;
    }

    // Generate variants using the module
    currentSkuVariants = skuAuto.generateAllVariants(baseCode);
    
    if (currentSkuVariants.length === 0) {
        alert('❌ Base code không hợp lệ! Cần chứa: ADK/KD, KD hoặc AD');
        return;
    }

    // Display as text (mỗi dòng 1 SKU)
    const outputText = currentSkuVariants.join('\n');
    document.getElementById('sku-output').value = outputText;
    
    const infoDiv = document.getElementById('sku-info');
    infoDiv.innerHTML = `✅ ${currentSkuVariants.length} variants được tạo - Copy tất cả rồi paste vào Excel`;
    infoDiv.style.display = 'block';
}

function copySingleSku(sku) {
    navigator.clipboard.writeText(sku).then(() => {
        alert(`✅ Copied: ${sku}`);
    });
}

function skuCopyAll() {
    if (currentSkuVariants.length === 0) {
        alert('⚠️ Vui lòng Generate trước');
        return;
    }
    
    const textArea = document.getElementById('sku-output');
    textArea.select();
    document.execCommand('copy');
    alert(`✅ Copied ${currentSkuVariants.length} SKUs to clipboard!`);
}

function skuClearForm() {
    document.getElementById('sku-base-code').value = '';
    document.getElementById('sku-output').value = 'Nhập base code và bấm Generate để xem kết quả';
    document.getElementById('sku-info').style.display = 'none';
    currentSkuVariants = [];
}

function skuExportCsv() {
    if (currentSkuVariants.length === 0) {
        alert('⚠️ Vui lòng Generate trước');
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

function isPhoneLayout() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function setSidebarHidden(hidden) {
    const toggle = document.getElementById('sidebar-toggle');
    if (!toggle) return;

    if (isPhoneLayout()) {
        document.body.classList.toggle('sidebar-open', !hidden);
        document.body.classList.remove('sidebar-hidden');
    } else {
        document.body.classList.toggle('sidebar-hidden', hidden);
        document.body.classList.remove('sidebar-open');
    }

    toggle.textContent = hidden ? '+' : '−';
    toggle.setAttribute('aria-label', hidden ? 'Show toolbar' : 'Hide toolbar');
    toggle.setAttribute('aria-expanded', String(!hidden));
}

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('sidebar-toggle');
    if (!toggle) return;

    setSidebarHidden(isPhoneLayout());
    toggle.addEventListener('click', () => {
        const isHidden = isPhoneLayout()
            ? !document.body.classList.contains('sidebar-open')
            : document.body.classList.contains('sidebar-hidden');
        setSidebarHidden(!isHidden);
    });

    window.addEventListener('resize', () => setSidebarHidden(isPhoneLayout()));
});
