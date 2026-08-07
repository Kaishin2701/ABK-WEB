document.addEventListener("DOMContentLoaded", () => {
    // 1. GÃ¡n sá»± kiá»‡n cho Ä‘Ãºng ID trong index.html (V3)
    const btnClean = document.getElementById('btn-clean');
    const btnCopy = document.getElementById('btn-copy-html');

    if (btnClean) btnClean.addEventListener('click', runHtmlClean);
    if (btnCopy) btnCopy.addEventListener('click', copyCleanResult);
});

function runHtmlClean() {
    // 2. Láº¥y Ä‘Ãºng ID input/output
    const rawInput = document.getElementById('html-in').value;
    const outputBox = document.getElementById('html-out');

    if (!rawInput.trim()) {
        alert("Vui lÃ²ng dÃ¡n code HTML vÃ o Ã´ Input!");
        return;
    }

    // --- LOGIC GIá»NG Há»†T PYTHON (BeautifulSoup) ---

    // Táº¡o DOM áº£o Ä‘á»ƒ xá»­ lÃ½
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawInput, 'text/html');
    const body = doc.body;

    // A. DANH SÃCH THáºº Cáº¦N "Lá»˜T Vá»Ž" (UNWRAP)
    // Python: useless_containers = ['div', 'section', ...]
    const uselessTags = ['div', 'section', 'article', 'header', 'footer', 'aside', 'main', 'nav'];
    
    // Láº·p qua tá»«ng loáº¡i tháº» vÃ  lá»™t vá»
    uselessTags.forEach(tagName => {
        // Láº¥y táº¥t cáº£ tháº» loáº¡i nÃ y
        const elements = body.querySelectorAll(tagName);
        elements.forEach(el => {
            // Di chuyá»ƒn toÃ n bá»™ tháº» con ra ngoÃ i (trÆ°á»›c tháº» cha)
            while (el.firstChild) {
                el.parentNode.insertBefore(el.firstChild, el);
            }
            // XÃ³a tháº» cha rá»—ng
            el.remove();
        });
    });

    // B. Lá»ŒC THUá»˜C TÃNH (WHITELIST)
    // Python: allowed_attributes = ['style', 'href', ...]
    const allowedAttrs = ['style', 'href', 'target', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'];
    const allElements = body.querySelectorAll('*');

    allElements.forEach(el => {
        // Chuyá»ƒn attributes thÃ nh máº£ng Ä‘á»ƒ duyá»‡t
        const attrs = Array.from(el.attributes);
        attrs.forEach(attr => {
            if (!allowedAttrs.includes(attr.name)) {
                el.removeAttribute(attr.name); // XÃ³a attribute khÃ´ng cho phÃ©p
            }
        });
    });

    // C. Xá»¬ LÃ THáºº SPAN
    // Python: if not span.attrs: span.unwrap()
    const spans = body.querySelectorAll('span');
    spans.forEach(span => {
        // Náº¿u khÃ´ng cÃ²n attribute nÃ o (hoáº·c style Ä‘Ã£ bá»‹ xÃ³a á»Ÿ bÆ°á»›c B)
        if (span.attributes.length === 0) {
            while (span.firstChild) {
                span.parentNode.insertBefore(span.firstChild, span);
            }
            span.remove();
        }
    });

    // D. Dá»ŒN Dáº¸P THáºº Rá»–NG (Block tags)
    // Python: if not text and not find(['img', 'br', ...])
    const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'blockquote'];
    blockTags.forEach(tag => {
        const els = body.querySelectorAll(tag);
        els.forEach(el => {
            const textContent = el.textContent.trim();
            // Kiá»ƒm tra cÃ³ tháº» Ä‘áº·c biá»‡t bÃªn trong khÃ´ng
            const hasSpecialTag = el.querySelector('img, br, hr, iframe');
            
            if (!textContent && !hasSpecialTag) {
                el.remove(); // XÃ³a náº¿u rá»—ng tuáº¿ch
            }
        });
    });

    // 3. Xuáº¥t káº¿t quáº£ ra Ã´ Output
    outputBox.value = body.innerHTML.trim();
}

function copyCleanResult() {
    const output = document.getElementById('html-out');
    if (!output.value) return;
    
    output.select();
    output.setSelectionRange(0, 99999); // Cho mobile

    try {
        navigator.clipboard.writeText(output.value).then(() => {
            alert("ÄÃ£ copy code sáº¡ch!");
        });
    } catch (err) {
        // Fallback cho trÃ¬nh duyá»‡t cÅ©
        document.execCommand('copy');
        alert("ÄÃ£ copy code sáº¡ch!");
    }
}
