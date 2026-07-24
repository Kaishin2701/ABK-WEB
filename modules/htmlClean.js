document.addEventListener("DOMContentLoaded", () => {
    // 1. Gán sự kiện cho đúng ID trong index.html (V3)
    const btnClean = document.getElementById('btn-clean');
    const btnCopy = document.getElementById('btn-copy-html');

    if (btnClean) btnClean.addEventListener('click', runHtmlClean);
    if (btnCopy) btnCopy.addEventListener('click', copyCleanResult);
});

function runHtmlClean() {
    // 2. Lấy đúng ID input/output
    const rawInput = document.getElementById('html-in').value;
    const outputBox = document.getElementById('html-out');

    if (!rawInput.trim()) {
        alert("Vui lòng dán code HTML vào ô Input!");
        return;
    }

    // --- LOGIC GIỐNG HỆT PYTHON (BeautifulSoup) ---

    // Tạo DOM ảo để xử lý
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawInput, 'text/html');
    const body = doc.body;

    // A. DANH SÁCH THẺ CẦN "LỘT VỎ" (UNWRAP)
    // Python: useless_containers = ['div', 'section', ...]
    const uselessTags = ['div', 'section', 'article', 'header', 'footer', 'aside', 'main', 'nav'];
    
    // Lặp qua từng loại thẻ và lột vỏ
    uselessTags.forEach(tagName => {
        // Lấy tất cả thẻ loại này
        const elements = body.querySelectorAll(tagName);
        elements.forEach(el => {
            // Di chuyển toàn bộ thẻ con ra ngoài (trước thẻ cha)
            while (el.firstChild) {
                el.parentNode.insertBefore(el.firstChild, el);
            }
            // Xóa thẻ cha rỗng
            el.remove();
        });
    });

    // B. LỌC THUỘC TÍNH (WHITELIST)
    // Python: allowed_attributes = ['style', 'href', ...]
    const allowedAttrs = ['style', 'href', 'target', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'];
    const allElements = body.querySelectorAll('*');

    allElements.forEach(el => {
        // Chuyển attributes thành mảng để duyệt
        const attrs = Array.from(el.attributes);
        attrs.forEach(attr => {
            if (!allowedAttrs.includes(attr.name)) {
                el.removeAttribute(attr.name); // Xóa attribute không cho phép
            }
        });
    });

    // C. XỬ LÝ THẺ SPAN
    // Python: if not span.attrs: span.unwrap()
    const spans = body.querySelectorAll('span');
    spans.forEach(span => {
        // Nếu không còn attribute nào (hoặc style đã bị xóa ở bước B)
        if (span.attributes.length === 0) {
            while (span.firstChild) {
                span.parentNode.insertBefore(span.firstChild, span);
            }
            span.remove();
        }
    });

    // D. DỌN DẸP THẺ RỖNG (Block tags)
    // Python: if not text and not find(['img', 'br', ...])
    const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'blockquote'];
    blockTags.forEach(tag => {
        const els = body.querySelectorAll(tag);
        els.forEach(el => {
            const textContent = el.textContent.trim();
            // Kiểm tra có thẻ đặc biệt bên trong không
            const hasSpecialTag = el.querySelector('img, br, hr, iframe');
            
            if (!textContent && !hasSpecialTag) {
                el.remove(); // Xóa nếu rỗng tuếch
            }
        });
    });

    // 3. Xuất kết quả ra ô Output
    outputBox.value = body.innerHTML.trim();
}

function copyCleanResult() {
    const output = document.getElementById('html-out');
    if (!output.value) return;
    
    output.select();
    output.setSelectionRange(0, 99999); // Cho mobile

    try {
        navigator.clipboard.writeText(output.value).then(() => {
            alert("Đã copy code sạch!");
        });
    } catch (err) {
        // Fallback cho trình duyệt cũ
        document.execCommand('copy');
        alert("Đã copy code sạch!");
    }
}