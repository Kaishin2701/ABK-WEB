let inputFiles = [];
let wmImg = null;
let outputDirectoryHandle = null;
let selectedWatermarkKey = '';
let itemSettings = new WeakMap();
let editingFile = null;
let itemDraft = null;
let previewGeneration = 0;
let previewUrls = [];
let previewQueue = Promise.resolve();

const WATERMARK_LIBRARY = Object.freeze([
    { key: 'KFK-new-logo', label: 'KFK - New logo', src: 'watermark/New KFK WTM.png' },
    { key: 'KFK-no-logo', label: 'KFK - No logo', src: 'watermark/KFK WTM NO LOGO.png' },
    { key: 'RFK', label: 'RFK', src: 'watermark/RFK.png' },
    { key: 'RFS', label: 'RFS', src: 'watermark/RFS.jpg' },
    { key: 'Germany', label: 'Germany', src: 'watermark/Germany.png' },
    { key: 'DFSH', label: 'DFSH', src: 'watermark/DFSH.png' },
    { key: 'FCSH', label: 'FCSH', src: 'watermark/FCSH.png' },
    { key: 'FKDE', label: 'FKDE', src: 'watermark/FKDE.png' },
    { key: 'FKDI', label: 'FKDI', src: 'watermark/FKDI.png' },
    { key: 'FSCD', label: 'FSCD', src: 'watermark/FSCD.png' },
    { key: 'FSS', label: 'FSS', src: 'watermark/FSS.png' },
    { key: 'PLSH', label: 'PLSH', src: 'watermark/PLSH.png' },
    { key: 'Empty', label: 'Empty', src: 'watermark/Empty.png' }
]);

const watermarkLibraryDialog = document.getElementById('watermark-library-dialog');
const watermarkLibraryGrid = document.getElementById('watermark-library-grid');
const watermarkFileInput = document.getElementById('inp-wm');
const clearWatermarkButton = document.getElementById('clear-watermark');
const selectedWatermarkPreview = document.getElementById('selected-watermark-preview');
const selectedWatermarkImage = document.getElementById('selected-watermark-image');
const selectedWatermarkName = document.getElementById('selected-watermark-name');
const itemDialog = document.getElementById('wm-item-dialog');
const itemName = document.getElementById('wm-item-name');
const itemWatermark = document.getElementById('wm-item-watermark');
const itemWatermarkFile = document.getElementById('wm-item-watermark-file');

// UI Connect
document.getElementById('inp-files').addEventListener('change', handleFileSelect);
const standardDropzone = document.getElementById('wm-dropzone');
['dragenter', 'dragover'].forEach(type => standardDropzone.addEventListener(type, event => { event.preventDefault(); standardDropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => standardDropzone.addEventListener(type, event => { event.preventDefault(); standardDropzone.classList.remove('dragging'); }));
standardDropzone.addEventListener('drop', event => addStandardFiles(event.dataTransfer.files));
watermarkFileInput.addEventListener('change', handleWmSelect);
document.getElementById('btn-start-wm').addEventListener('click', startProcess);
document.getElementById('btn-select-output').addEventListener('click', selectOutputFolder);
document.getElementById('open-watermark-library').addEventListener('click', openWatermarkLibrary);
document.getElementById('close-watermark-library').addEventListener('click', closeWatermarkLibrary);
document.getElementById('cancel-watermark-library').addEventListener('click', closeWatermarkLibrary);
document.getElementById('choose-other-watermark').addEventListener('click', () => {
    closeWatermarkLibrary();
    watermarkFileInput.click();
});
clearWatermarkButton.addEventListener('click', clearWatermarkSelection);
watermarkLibraryDialog.addEventListener('click', (event) => {
    if (event.target === watermarkLibraryDialog) closeWatermarkLibrary();
});
document.getElementById('wm-item-close').addEventListener('click', closeItemEditor);
document.getElementById('wm-item-save').addEventListener('click', saveItemEditor);
document.getElementById('wm-item-remove').addEventListener('click', removeEditedItem);
itemDialog.addEventListener('close', () => { editingFile = null; itemDraft = null; editorPreviewGeneration++; if (editorPreviewUrl) URL.revokeObjectURL(editorPreviewUrl); editorPreviewUrl = ''; });
itemWatermark.addEventListener('change', changeItemWatermark);
itemWatermarkFile.addEventListener('change', loadItemWatermarkFile);
document.getElementById('sel-mode').addEventListener('change', renderGallery);
document.getElementById('inp-rename').addEventListener('input', renderGallery);
WATERMARK_LIBRARY.forEach(watermark => {
    const option = document.createElement('option'); option.value = watermark.key; option.textContent = watermark.label; itemWatermark.appendChild(option);
});

renderWatermarkLibrary();

// Logger
function log(msg) {
    const box = document.getElementById('log-box');
    const time = new Date().toLocaleTimeString();
    box.value += `[${time}] ${msg}\n`;
    box.scrollTop = box.scrollHeight;
}

function handleFileSelect(e) {
    addStandardFiles(e.target.files);
    e.target.value = '';
}
function addStandardFiles(files) {
    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (!newFiles.length) { alert('Please choose image files.'); return; }
    inputFiles = [...inputFiles, ...newFiles];
    renderGallery();
    log(`Đã thêm ${newFiles.length} ảnh.`);
}

function handleWmSelect(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const image = new Image();
            image.onload = () => applyWatermarkSelection(image, file.name, ev.target.result, '');
            image.onerror = () => {
                alert('Unable to load this watermark image. Please choose another file.');
                log(`Unable to load watermark: ${file.name}`);
            };
            image.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function renderWatermarkLibrary() {
    watermarkLibraryGrid.innerHTML = '';
    WATERMARK_LIBRARY.forEach((watermark) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `watermark-library-item${selectedWatermarkKey === watermark.key ? ' active' : ''}`;
        button.dataset.watermarkKey = watermark.key;
        button.setAttribute('aria-pressed', String(selectedWatermarkKey === watermark.key));
        button.innerHTML = `
            <span class="watermark-library-thumb"><img src="${watermark.src}" alt="" loading="lazy"></span>
            <strong>${watermark.label}</strong>
        `;
        button.addEventListener('click', () => loadBuiltInWatermark(watermark));
        watermarkLibraryGrid.appendChild(button);
    });
}

function openWatermarkLibrary() {
    renderWatermarkLibrary();
    if (typeof watermarkLibraryDialog.showModal === 'function') {
        watermarkLibraryDialog.showModal();
        return;
    }
    watermarkLibraryDialog.setAttribute('open', '');
}

function closeWatermarkLibrary() {
    if (typeof watermarkLibraryDialog.close === 'function' && watermarkLibraryDialog.open) {
        watermarkLibraryDialog.close();
        return;
    }
    watermarkLibraryDialog.removeAttribute('open');
}

function loadBuiltInWatermark(watermark) {
    const image = new Image();
    image.onload = () => {
        watermarkFileInput.value = '';
        applyWatermarkSelection(image, watermark.label, watermark.src, watermark.key);
        closeWatermarkLibrary();
    };
    image.onerror = () => {
        alert(`Unable to load the saved ${watermark.label} watermark.`);
        log(`Unable to load saved watermark: ${watermark.label}`);
    };
    image.src = watermark.src;
}

function applyWatermarkSelection(image, label, previewSource, libraryKey) {
    wmImg = image;
    selectedWatermarkKey = libraryKey;
    document.getElementById('wm-path-display').value = label;
    selectedWatermarkImage.src = previewSource;
    selectedWatermarkImage.alt = `${label} watermark preview`;
    selectedWatermarkName.textContent = label;
    selectedWatermarkPreview.hidden = false;
    clearWatermarkButton.disabled = false;
    renderWatermarkLibrary();
    renderGallery();
    log(`Watermark selected: ${label}`);
}

function clearWatermarkSelection() {
    wmImg = null;
    selectedWatermarkKey = '';
    watermarkFileInput.value = '';
    document.getElementById('wm-path-display').value = '';
    selectedWatermarkImage.removeAttribute('src');
    selectedWatermarkImage.alt = '';
    selectedWatermarkName.textContent = '';
    selectedWatermarkPreview.hidden = true;
    clearWatermarkButton.disabled = true;
    renderWatermarkLibrary();
    renderGallery();
    log('Watermark selection cleared.');
}

function renderGallery() {
    const area = document.getElementById('gallery-area');
    const generation = ++previewGeneration;
    previewUrls.forEach(url => URL.revokeObjectURL(url)); previewUrls = [];
    area.innerHTML = '';
    document.getElementById('wm-image-count').textContent = `${inputFiles.length} image${inputFiles.length === 1 ? '' : 's'}`;
    standardDropzone.hidden = inputFiles.length > 0;
    document.getElementById('wm-image-actions').hidden = inputFiles.length === 0;
    inputFiles.forEach(f => {
        const card = document.createElement('button'); card.type = 'button'; card.className = 'wm-preview-card';
        const img = document.createElement('img'); img.alt = `Preview of ${f.name}`;
        const title = document.createElement('strong'); title.textContent = outputName(f, document.getElementById('inp-rename').value);
        const hint = document.createElement('small'); hint.textContent = 'Click to edit';
        card.appendChild(img); card.appendChild(title); card.appendChild(hint); card.addEventListener('click', () => openItemEditor(f)); area.appendChild(card);
        const mode = document.getElementById('sel-mode').value, watermark = watermarkForFile(f);
        previewQueue = previewQueue.then(async () => {
            if (generation !== previewGeneration) return;
            try {
                const blob = await processImage(f, mode, 1, 0.75, watermark, 360);
                if (generation !== previewGeneration) return;
                const url = URL.createObjectURL(blob); previewUrls.push(url); img.src = url;
            } catch (_) { if (generation === previewGeneration) hint.textContent = 'Preview unavailable'; }
        });
    });
}

function clearGallery() {
    inputFiles = [];
    itemSettings = new WeakMap();
    renderGallery();
    log("Đã xóa danh sách ảnh.");
}

function watermarkForFile(file) {
    const settings = itemSettings.get(file);
    return settings && settings.watermarkMode !== 'shared' ? settings.watermarkImage : wmImg;
}
function outputName(file, template) {
    const override = itemSettings.get(file)?.name;
    const base = file.name.replace(/\.[^.]+$/, '');
    const raw = override || template.replaceAll('{default name}', base);
    return (raw.replace(/\.webp$/i, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || base) + '.webp';
}
function openItemEditor(file) {
    editingFile = file;
    const saved = itemSettings.get(file) || { name: '', watermarkMode: 'shared', watermarkImage: null, watermarkLabel: '' };
    itemDraft = { ...saved };
    document.getElementById('wm-item-original').textContent = file.name;
    itemName.value = saved.name; itemWatermark.value = saved.watermarkMode;
    itemWatermarkFile.value = ''; updateItemEditorPreview(); itemDialog.showModal();
}
function closeItemEditor() { editingFile = null; itemDraft = null; editorPreviewGeneration++; if (editorPreviewUrl) URL.revokeObjectURL(editorPreviewUrl); editorPreviewUrl = ''; itemDialog.close(); }
function saveItemEditor() {
    if (!editingFile || !itemDraft) return;
    if (itemDraft.watermarkMode !== 'shared' && itemDraft.watermarkMode !== 'none' && !itemDraft.watermarkImage) { alert('Please choose a watermark image first.'); return; }
    itemDraft.name = itemName.value.trim(); itemSettings.set(editingFile, { ...itemDraft }); closeItemEditor(); renderGallery();
}
function removeEditedItem() {
    if (!editingFile) return;
    const index = inputFiles.indexOf(editingFile); if (index !== -1) inputFiles.splice(index, 1);
    itemSettings.delete(editingFile); closeItemEditor(); renderGallery();
}
function changeItemWatermark() {
    if (!itemDraft) return;
    const mode = itemWatermark.value;
    if (mode === 'custom') { itemWatermark.value = itemDraft.watermarkMode; itemWatermarkFile.value = ''; itemWatermarkFile.click(); return; }
    itemDraft.watermarkMode = mode; itemDraft.watermarkImage = null; itemDraft.watermarkLabel = '';
    if (mode === 'shared' || mode === 'none') { updateItemEditorPreview(); return; }
    const watermark = WATERMARK_LIBRARY.find(entry => entry.key === mode);
    if (!watermark) return;
    const image = new Image();
    image.onload = () => { if (itemDraft && itemWatermark.value === mode) { itemDraft.watermarkImage = image; itemDraft.watermarkLabel = watermark.label; updateItemEditorPreview(); } };
    image.onerror = () => alert('Unable to load this watermark.'); image.src = watermark.src;
}
function loadItemWatermarkFile(event) {
    const file = event.target.files[0]; if (!file || !itemDraft) return;
    const reader = new FileReader();
    const target = editingFile;
    reader.onload = () => { const image = new Image(); image.onload = () => { if (!itemDraft || editingFile !== target) return; itemDraft.watermarkMode = 'custom'; itemWatermark.value = 'custom'; itemDraft.watermarkImage = image; itemDraft.watermarkLabel = file.name; updateItemEditorPreview(); }; image.onerror = () => alert('Unable to load this watermark.'); image.src = reader.result; };
    reader.onerror = () => alert('Unable to read this watermark.'); reader.readAsDataURL(file);
}
let editorPreviewGeneration = 0;
let editorPreviewUrl = '';
function updateItemEditorPreview() {
    if (!editingFile || !itemDraft) return;
    document.getElementById('wm-item-watermark-note').textContent = itemDraft.watermarkMode === 'shared' ? 'Using the shared watermark.' : itemDraft.watermarkMode === 'none' ? 'No watermark on this image.' : itemDraft.watermarkLabel || 'Loading watermark…';
    const token = ++editorPreviewGeneration;
    const watermark = itemDraft.watermarkMode === 'shared' ? wmImg : itemDraft.watermarkImage;
    processImage(editingFile, document.getElementById('sel-mode').value, 1, 0.75, watermark, 800).then(blob => {
        if (token !== editorPreviewGeneration || !editingFile) return;
        if (editorPreviewUrl) URL.revokeObjectURL(editorPreviewUrl);
        editorPreviewUrl = URL.createObjectURL(blob); document.getElementById('wm-item-preview-image').src = editorPreviewUrl;
    }).catch(() => { document.getElementById('wm-item-watermark-note').textContent = 'Preview unavailable.'; });
}

async function selectOutputFolder() {
    if (!window.showDirectoryPicker) {
        alert('This browser does not support folder selection. Please use Chrome or Edge.');
        return;
    }

    try {
        outputDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        document.getElementById('output-path-display').value = outputDirectoryHandle.name;
        document.getElementById('output-folder-note').textContent = 'Processed images will be saved directly to the selected folder.';
        log(`Output folder selected: ${outputDirectoryHandle.name}`);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Unable to select output folder:', error);
            alert('Unable to access the selected folder. Please try again.');
        }
    }
}

async function saveProcessedFilesToFolder(processedFiles) {
    if (!outputDirectoryHandle) return false;

    try {
        const permission = await outputDirectoryHandle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') throw new Error('Write permission was not granted.');

        for (const { blob, name } of processedFiles) {
            const fileHandle = await outputDirectoryHandle.getFileHandle(name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        }

        log(`Saved ${processedFiles.length} images to: ${outputDirectoryHandle.name}`);
        return true;
    } catch (error) {
        console.error('Unable to save to selected folder:', error);
        log(`Unable to save to selected folder: ${error.message}. Falling back to download.`);
        return false;
    }
}

async function startProcess() {
    if(!inputFiles.length) return alert("Chưa chọn ảnh!");
    let maxBytes;
    try { maxBytes = WebpLimit.limitBytes(document.getElementById('wm-max-kb').value); }
    catch (error) { alert(error.message); return; }

    const btn = document.getElementById('btn-start-wm');
    btn.disabled = true; btn.innerText = "ĐANG XỬ LÝ...";
    document.getElementById('log-box').value = ""; // Clear log

    const mode = document.getElementById('sel-mode').value;
    const opacity = 1;
    const quality = 1;
    const renameTpl = document.getElementById('inp-rename').value;
    const outputNames = inputFiles.map(file => outputName(file, renameTpl).toLowerCase());
    if (new Set(outputNames).size !== outputNames.length) { btn.disabled = false; btn.innerText = 'START PROCESSING'; alert('Some images have the same output name. Edit their names before exporting.'); return; }
    const downloadArea = document.getElementById('download-area');
    downloadArea.innerHTML = ''; // Reset link tải

    log(`🚀 Bắt đầu xử lý ${inputFiles.length} ảnh...`);
    if(!wmImg) log("⚠️ Không có watermark, chỉ xử lý hình ảnh gốc.");

    const processedFiles = []; // Array of {blob, name}

    for(let i=0; i<inputFiles.length; i++) {
        try {
            const file = inputFiles[i];
            const blob = await processImage(file, mode, opacity, quality, watermarkForFile(file));

            // Rename logic
            const newName = outputName(file, renameTpl);

            processedFiles.push({blob, name: newName});

            log(`✅ OK: ${file.name} -> ${newName}`);
            document.getElementById('p-bar-fill').style.width = Math.round(((i+1)/inputFiles.length)*100) + "%";
            document.getElementById('status-lbl').innerText = `${i+1}/${inputFiles.length}`;
        } catch(e) {
            log(`❌ Error: ${inputFiles[i].name} - ${e}`);
        }
        await new Promise(r => setTimeout(r, 100)); // Delay để UI mượt
    }

    if (!processedFiles.length) { btn.disabled = false; btn.innerText = 'START PROCESSING'; alert('No images could be processed. See the log for details.'); return; }
    let limited;
    try { limited = await WebpLimit.applyLimit(processedFiles, maxBytes); }
    catch (error) { btn.disabled = false; btn.innerText = 'START PROCESSING'; alert(`Compression failed: ${error.message}`); return; }
    limited.failed.forEach(file => log(`NOT EXPORTED: ${file.name} - ${file.reason}`));
    if (limited.failed.length) alert(`Could not compress these images below the limit; they will not be exported:\n\n${limited.failed.map(file => `${file.name}: ${file.reason}`).join('\n')}`);
    processedFiles.splice(0, processedFiles.length, ...limited.files);
    processedFiles.forEach(file => log(`READY: ${file.name} - ${(file.blob.size / 1000).toFixed(1)} KB`));
    if (!processedFiles.length) { btn.disabled = false; btn.innerText = 'START PROCESSING'; return; }
    const outputFileCount = processedFiles.length;
    const savedToFolder = outputFileCount > 0 && await saveProcessedFilesToFolder(processedFiles);
    if (savedToFolder) processedFiles.length = 0;

    // Download logic
    if(processedFiles.length === 1) {
        // Download single file
        const {blob, name} = processedFiles[0];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name;
        downloadArea.appendChild(a);
        a.click();
    } else if(processedFiles.length > 1) {
        // Create ZIP
        const zip = new JSZip();
        processedFiles.forEach(({blob, name}) => {
            zip.file(name, blob);
        });
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl; a.download = 'processed_images.zip';
        downloadArea.appendChild(a);
        a.click();
        log(`📦 Đã tạo ZIP với ${processedFiles.length} ảnh.`);
    }

    log("🎉 Hoàn tất!");
    btn.disabled = false; btn.innerText = "START PROCESSING";
    if (savedToFolder) {
        alert(`Processing complete! Saved ${outputFileCount} images to ${outputDirectoryHandle.name}.`);
        return;
    }
    const msg = processedFiles.length > 1 ? "Xử lý xong! Đã tải xuống file ZIP." : "Xử lý xong! Kiểm tra thư mục Tải về của trình duyệt.";
    alert(msg);
}

function processImage(file, mode, opacity, quality, watermark = wmImg, maxDimension = 0) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Unable to read image.'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Unable to decode image.'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const previewScale = maxDimension ? Math.min(1, maxDimension / Math.max(img.width, img.height)) : 1;
                canvas.width = Math.max(1, Math.round(img.width * previewScale)); canvas.height = Math.max(1, Math.round(img.height * previewScale));
                const ctx = canvas.getContext('2d');

                // 1. Draw Original
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // 2. Draw Watermark (chỉ nếu có)
                if(watermark) {
                    ctx.globalAlpha = opacity;
                    const W = canvas.width, H = canvas.height;
                    const wmW = watermark.width, wmH = watermark.height;

                    if(mode === 'Fullscreen') {
                        ctx.drawImage(watermark, 0, 0, W, H);
                    } else if (mode === 'Bottom-right') {
                        // Python Logic: scale = int(W * 0.2), if scale < 50 scale = 50
                        let scale = Math.floor(W * 0.2);
                        if (scale < 50 * previewScale) scale = 50 * previewScale;
                        const ratio = wmW / wmH;
                        const newH = Math.floor(scale / ratio);
                        ctx.drawImage(watermark, W - scale - 20 * previewScale, H - newH - 20 * previewScale, scale, newH);
                    } else if (mode === 'Diagonal repeat') {
                        // Python Logic: wm_scale = int(W * 0.25)
                        let scale = Math.floor(W * 0.25);
                        const ratio = wmW / wmH;
                        const newH = Math.floor(scale / ratio);
                        const stepX = scale + 50 * previewScale;
                        const stepY = newH + 50 * previewScale;

                        for(let x=0; x < W + stepX; x += stepX) {
                            for(let y=0; y < H + stepY; y += stepY) {
                                ctx.drawImage(watermark, x, y, scale, newH);
                            }
                        }
                    }
                }

                WebpLimit.encode(canvas, quality).then(resolve, reject);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
