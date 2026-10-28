'use strict';

const OUTPUT_SIZE = 1000;
const BOX = { x: 14, bottom: 20, height: 60, gap: 12, pad: 30, stroke: 4, radius: 30, font: 32, minFont: 20, maxWidth: 972 };
const WATERMARK_LIBRARY = Object.freeze([
  { key: 'KFK', label: 'KFK', src: '../../watermark/KFK.png' },
  { key: 'RFK', label: 'RFK', src: '../../watermark/RFK.png' },
  { key: 'RFS', label: 'RFS', src: '../../watermark/RFS.jpg' },
  { key: 'Germany', label: 'Germany', src: '../../watermark/Germany.png' },
  { key: 'DFSH', label: 'DFSH', src: '../../watermark/DFSH.png' },
  { key: 'FCSH', label: 'FCSH', src: '../../watermark/FCSH.png' },
  { key: 'FKDE', label: 'FKDE', src: '../../watermark/FKDE.png' },
  { key: 'FKDI', label: 'FKDI', src: '../../watermark/FKDI.png' },
  { key: 'FSCD', label: 'FSCD', src: '../../watermark/FSCD.png' },
  { key: 'FSS', label: 'FSS', src: '../../watermark/FSS.png' },
  { key: 'PLSH', label: 'PLSH', src: '../../watermark/PLSH.png' },
  { key: 'Empty', label: 'Empty', src: '../../watermark/Empty.png' }
]);
const state = { items: [], watermark: null, watermarkUrl: '', selectedWatermarkKey: '', outputDirectory: null, editingId: null };
const $ = selector => document.querySelector(selector);
const els = {
  files: $('#imageFiles'), dropzone: $('#dropzone'), watermarkFile: $('#watermarkFile'), watermarkName: $('#watermarkName'),
  watermarkDialog: $('#watermarkLibraryDialog'), watermarkGrid: $('#watermarkLibraryGrid'), openWatermarkLibrary: $('#openWatermarkLibrary'),
  watermarkPosition: $('#watermarkPosition'), clearWatermark: $('#clearWatermark'), chooseFolder: $('#chooseFolder'), folderName: $('#folderName'),
  exportAll: $('#exportAll'), clearAll: $('#clearAll'), progress: $('#progressBar'),
  count: $('#resultCount'), gallery: $('#gallery'), toast: $('#toast'), dialog: $('#editorDialog'),
  editorCanvas: $('#editorCanvas'), editorFilename: $('#editorFilename'), editTitle: $('#editTitle'), editType: $('#editType'),
  editOptional: $('#editOptional'), editPlayer: $('#editPlayer'), editPlayerField: $('#editPlayerField'), editPlayerText: $('#editPlayerText')
};
let toastTimer;

function notify(message, error = false) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.toggle('error', error);
  els.toast.classList.add('show');
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try { return { image: await loadImage(url), url }; }
  catch (error) { URL.revokeObjectURL(url); throw error; }
}
function revokeWatermarkObjectUrl() {
  if (state.watermarkUrl.startsWith('blob:')) URL.revokeObjectURL(state.watermarkUrl);
}
function renderWatermarkLibrary() {
  els.watermarkGrid.innerHTML = '';
  WATERMARK_LIBRARY.forEach(watermark => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `watermark-library-item${state.selectedWatermarkKey === watermark.key ? ' active' : ''}`;
    button.setAttribute('aria-pressed', String(state.selectedWatermarkKey === watermark.key));
    button.innerHTML = `<span class="watermark-library-thumb"><img src="${watermark.src}" alt="" loading="lazy"></span><strong>${watermark.label}</strong>`;
    button.addEventListener('click', () => selectSavedWatermark(watermark)); els.watermarkGrid.appendChild(button);
  });
}
function openWatermarkLibrary() { renderWatermarkLibrary(); els.watermarkDialog.showModal(); }
function closeWatermarkLibrary() { if (els.watermarkDialog.open) els.watermarkDialog.close(); }
async function selectSavedWatermark(watermark) {
  try {
    const image = await loadImage(watermark.src); revokeWatermarkObjectUrl();
    state.watermark = image; state.watermarkUrl = watermark.src; state.selectedWatermarkKey = watermark.key;
    els.watermarkName.textContent = watermark.label; els.clearWatermark.disabled = false; closeWatermarkLibrary(); rerenderAll(); notify(`${watermark.label} watermark applied to all results.`);
  } catch (error) { notify(`The saved ${watermark.label} watermark could not be loaded.`, true); }
}
function fontString(size) { return `700 ${size}px Arial, Helvetica, sans-serif`; }
function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
}
function measure(ctx, text, size) { ctx.font = fontString(size); return ctx.measureText(text).width; }
function boxLayout(ctx, item) {
  const detail = item.mode === 'player' ? clean(item.playerText) || 'PLAYER NAME 00' : 'Optional Personalisation';
  let typeSize = BOX.font, detailSize = BOX.font, typeWidth, detailWidth;
  do {
    typeWidth = Math.ceil(measure(ctx, item.type, typeSize) + BOX.pad * 2);
    detailWidth = Math.ceil(measure(ctx, detail, detailSize) + BOX.pad * 2);
    if (typeWidth + detailWidth <= BOX.maxWidth) break;
    if (detailWidth >= typeWidth && detailSize > BOX.minFont) detailSize--;
    else if (typeSize > BOX.minFont) typeSize--;
    else break;
  } while (true);
  const scale = Math.min(1, BOX.maxWidth / (typeWidth + detailWidth));
  typeWidth = Math.floor(typeWidth * scale); detailWidth = Math.floor(detailWidth * scale);
  const titleWidth = Math.ceil(measure(ctx, item.title, BOX.font) + BOX.pad * 2);
  const shared = Math.min(BOX.maxWidth, Math.max(600, typeWidth + detailWidth, titleWidth));
  const extra = shared - typeWidth - detailWidth; typeWidth += Math.floor(extra / 2); detailWidth = shared - typeWidth;
  let titleSize = BOX.font;
  while (titleSize > BOX.minFont && measure(ctx, item.title, titleSize) + BOX.pad * 2 > shared) titleSize--;
  const y2 = OUTPUT_SIZE - BOX.bottom - BOX.height, y1 = y2 - BOX.gap - BOX.height;
  return [
    { text: item.title, size: titleSize, x: BOX.x, y: y1, width: shared },
    { text: item.type, size: typeSize, x: BOX.x, y: y2, width: typeWidth },
    { text: detail, size: detailSize, x: BOX.x + typeWidth, y: y2, width: detailWidth }
  ];
}
function drawCover(ctx, image) {
  const scale = Math.max(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.drawImage(image, (OUTPUT_SIZE - width) / 2, (OUTPUT_SIZE - height) / 2, width, height);
}
function drawWatermark(ctx) {
  const image = state.watermark;
  if (!image) return;
  const mode = els.watermarkPosition.value;
  ctx.save(); ctx.globalAlpha = 1;
  if (mode === 'cover') {
    const scale = Math.min(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    ctx.drawImage(image, (OUTPUT_SIZE - width) / 2, (OUTPUT_SIZE - height) / 2, width, height);
  } else {
    const max = mode === 'bottom-right' ? 280 : 480;
    const scale = Math.min(max / image.naturalWidth, max / image.naturalHeight, 1);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    const x = mode === 'bottom-right' ? OUTPUT_SIZE - width - 26 : (OUTPUT_SIZE - width) / 2;
    const y = mode === 'bottom-right' ? OUTPUT_SIZE - height - 166 : (OUTPUT_SIZE - height) / 2;
    ctx.drawImage(image, x, y, width, height);
  }
  ctx.restore();
}
function drawBox(ctx, box) {
  roundedRect(ctx, box.x, box.y, box.width, BOX.height, BOX.radius);
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = BOX.stroke; ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.font = fontString(box.size); ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(box.text, box.x + box.width / 2, box.y + BOX.height / 2 + 1, Math.max(20, box.width - BOX.pad * 1.5));
}
function renderComposite(item, canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  drawCover(ctx, item.image); drawWatermark(ctx); boxLayout(ctx, item).forEach(box => drawBox(ctx, box));
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function cardFor(item) {
  const card = document.createElement('article');
  card.className = 'card'; card.dataset.id = item.id;
  card.innerHTML = `<div class="card-preview" role="button" tabindex="0" aria-label="Enter content for ${escapeHtml(item.file.name)}"><canvas width="1000" height="1000"></canvas><span class="card-status">NEEDS INPUT</span></div><div class="card-body"><h3 class="card-title" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</h3><div class="chips"><span class="chip" data-chip="type"></span><span class="chip" data-chip="mode"></span></div><div class="card-actions"><button class="button small" data-action="edit" type="button">Enter content</button><button class="button small danger" data-action="remove" type="button">Remove</button></div></div>`;
  card.querySelector('[data-action=edit]').addEventListener('click', () => openEditor(item.id));
  card.querySelector('.card-preview').addEventListener('click', () => openEditor(item.id));
  card.querySelector('.card-preview').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openEditor(item.id); } });
  card.querySelector('[data-action=remove]').addEventListener('click', () => removeItem(item.id));
  return card;
}
function refreshCard(item) {
  const card = els.gallery.querySelector(`[data-id="${CSS.escape(item.id)}"]`);
  if (!card) return;
  renderComposite(item, card.querySelector('canvas'));
  card.querySelector('[data-chip=type]').textContent = item.type;
  card.querySelector('[data-chip=mode]').textContent = item.configured ? (item.mode === 'player' ? item.playerText : 'Optional personalisation') : 'Manual input required';
  const status = card.querySelector('.card-status'); status.textContent = item.configured ? 'READY' : 'NEEDS INPUT'; status.classList.toggle('pending', !item.configured);
}
function updateUI() {
  const total = state.items.length;
  const ready = state.items.filter(item => item.configured).length;
  els.count.textContent = total ? `${ready} of ${total} ready` : '0 images';
  els.gallery.hidden = total === 0;
  [els.exportAll, els.clearAll].forEach(button => { button.disabled = total === 0; });
}
async function addFiles(fileList) {
  const files = [...fileList].filter(file => /^image\/(jpeg|png|webp)$/.test(file.type));
  if (!files.length) { notify('Please choose JPG, PNG or WebP images.', true); return; }
  let added = 0;
  for (const file of files) {
    try {
      const loaded = await fileToImage(file);
      const item = { id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`, file, image: loaded.image, url: loaded.url, title: '', type: 'Kids Kit', mode: 'optional', playerText: '', configured: false };
      state.items.push(item); const card = cardFor(item); els.gallery.appendChild(card); refreshCard(item); added++;
    } catch (error) { notify(`Could not read ${file.name}.`, true); }
  }
  els.files.value = ''; updateUI(); notify(`${added} image${added === 1 ? '' : 's'} added. Enter the box content manually.`);
}
function removeItem(id) {
  const index = state.items.findIndex(item => item.id === id);
  if (index < 0) return;
  URL.revokeObjectURL(state.items[index].url); state.items.splice(index, 1);
  els.gallery.querySelector(`[data-id="${CSS.escape(id)}"]`)?.remove(); updateUI();
}
function clearAll() {
  state.items.forEach(item => URL.revokeObjectURL(item.url)); state.items = []; els.gallery.innerHTML = '';
  updateUI(); els.progress.style.width = '0'; notify('Batch cleared.');
}
function rerenderAll() { state.items.forEach(refreshCard); if (state.editingId) renderEditorPreview(); }
async function setWatermark(file) {
  revokeWatermarkObjectUrl();
  const loaded = await fileToImage(file);
  state.watermark = loaded.image; state.watermarkUrl = loaded.url; state.selectedWatermarkKey = ''; els.watermarkName.textContent = file.name; els.clearWatermark.disabled = false;
  rerenderAll(); notify('Watermark applied to all results.');
}
function clearWatermark() {
  revokeWatermarkObjectUrl();
  state.watermark = null; state.watermarkUrl = ''; state.selectedWatermarkKey = ''; els.watermarkFile.value = ''; els.watermarkName.textContent = 'No watermark selected'; els.clearWatermark.disabled = true; renderWatermarkLibrary(); rerenderAll();
}
function openEditor(id) {
  const item = state.items.find(entry => entry.id === id); if (!item) return;
  state.editingId = id; els.editorFilename.textContent = item.file.name; els.editTitle.value = item.title; els.editType.value = item.type;
  els.editPlayer.checked = item.mode === 'player'; els.editOptional.checked = item.mode !== 'player'; els.editPlayerText.value = item.playerText;
  togglePlayerField(); renderEditorPreview(); els.dialog.showModal();
}
function togglePlayerField() { els.editPlayerField.hidden = !els.editPlayer.checked; els.editPlayerText.required = els.editPlayer.checked; }
function editorDraft() {
  return { ...state.items.find(item => item.id === state.editingId), title: clean(els.editTitle.value) || 'Product Name', type: els.editType.value, mode: els.editPlayer.checked ? 'player' : 'optional', playerText: clean(els.editPlayerText.value) };
}
function renderEditorPreview() { if (state.editingId) renderComposite(editorDraft(), els.editorCanvas); }
function closeEditor() { state.editingId = null; els.dialog.close(); }
function saveEditor(event) {
  event.preventDefault(); const item = state.items.find(entry => entry.id === state.editingId); if (!item) return;
  const draft = editorDraft(); Object.assign(item, { title: draft.title, type: draft.type, mode: draft.mode, playerText: draft.playerText, configured: true });
  refreshCard(item); updateUI(); closeEditor(); notify('Image content saved.');
}
function slug(value) { return clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'processed-image'; }
function canvasBlob(canvas) { return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png', 1)); }
async function chooseOutputFolder() {
  if (!window.showDirectoryPicker) { notify('Folder selection is not supported here. Files will download normally.', true); return; }
  try { state.outputDirectory = await window.showDirectoryPicker({ mode: 'readwrite' }); els.folderName.textContent = state.outputDirectory.name; notify(`Output folder: ${state.outputDirectory.name}`); }
  catch (error) { if (error.name !== 'AbortError') notify('The output folder could not be opened.', true); }
}
async function exportAll() {
  if (!state.items.length) return;
  const incomplete = state.items.find(item => !item.configured);
  if (incomplete) { notify('Enter the content for every image before exporting.', true); openEditor(incomplete.id); return; }
  els.exportAll.disabled = true; let completed = 0;
  try {
    for (let index = 0; index < state.items.length; index++) {
      const item = state.items[index], canvas = document.createElement('canvas'); canvas.width = OUTPUT_SIZE; canvas.height = OUTPUT_SIZE;
      renderComposite(item, canvas); const blob = await canvasBlob(canvas); const filename = `${slug(item.title)}-${String(index + 1).padStart(2, '0')}.png`;
      if (state.outputDirectory) {
        const handle = await state.outputDirectory.getFileHandle(filename, { create: true }); const writable = await handle.createWritable(); await writable.write(blob); await writable.close();
      } else {
        const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(anchor.href), 1500); await new Promise(resolve => setTimeout(resolve, 120));
      }
      completed++; els.progress.style.width = `${Math.round(completed / state.items.length * 100)}%`;
    }
    notify(`${completed} metadata-free PNG${completed === 1 ? '' : 's'} exported.`);
  } catch (error) { notify(`Export stopped after ${completed} image${completed === 1 ? '' : 's'}.`, true); }
  finally { els.exportAll.disabled = false; }
}

els.files.addEventListener('change', () => addFiles(els.files.files));
['dragenter', 'dragover'].forEach(type => els.dropzone.addEventListener(type, event => { event.preventDefault(); els.dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => els.dropzone.addEventListener(type, event => { event.preventDefault(); els.dropzone.classList.remove('dragging'); }));
els.dropzone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
els.openWatermarkLibrary.addEventListener('click', openWatermarkLibrary);
$('#closeWatermarkLibrary').addEventListener('click', closeWatermarkLibrary);
$('#cancelWatermarkLibrary').addEventListener('click', closeWatermarkLibrary);
$('#otherWatermark').addEventListener('click', () => { closeWatermarkLibrary(); els.watermarkFile.click(); });
els.watermarkDialog.addEventListener('click', event => { if (event.target === els.watermarkDialog) closeWatermarkLibrary(); });
els.watermarkFile.addEventListener('change', async () => { const file = els.watermarkFile.files[0]; if (file) try { await setWatermark(file); } catch (error) { notify('That watermark could not be read.', true); } });
els.watermarkPosition.addEventListener('change', rerenderAll); els.clearWatermark.addEventListener('click', clearWatermark); els.chooseFolder.addEventListener('click', chooseOutputFolder);
els.exportAll.addEventListener('click', exportAll); els.clearAll.addEventListener('click', clearAll);
$('#closeEditor').addEventListener('click', closeEditor); $('#cancelEditor').addEventListener('click', closeEditor); $('#editorForm').addEventListener('submit', saveEditor);
[els.editTitle, els.editType, els.editOptional, els.editPlayer, els.editPlayerText].forEach(input => input.addEventListener('input', () => { togglePlayerField(); renderEditorPreview(); }));
els.dialog.addEventListener('click', event => { if (event.target === els.dialog) closeEditor(); });
els.watermarkPosition.value = 'cover';
renderWatermarkLibrary();
updateUI();
