let inputFiles = [];
let wmImg = null;

// UI Connect
document.getElementById('inp-files').addEventListener('change', handleFileSelect);
document.getElementById('inp-wm').addEventListener('change', handleWmSelect);
document.getElementById('btn-start-wm').addEventListener('click', startProcess);
document.getElementById('rng-quality').addEventListener('input', (e) => document.getElementById('lbl-quality').innerText = `Quality: ${e.target.value}`);
document.getElementById('rng-opacity').addEventListener('input', (e) => document.getElementById('lbl-opacity').innerText = `Opacity: ${e.target.value}%`);

// Logger
function log(msg) {
    const box = document.getElementById('log-box');
    const time = new Date().toLocaleTimeString();
    box.value += `[${time}] ${msg}\n`;
    box.scrollTop = box.scrollHeight;
}

function handleFileSelect(e) {
    const newFiles = Array.from(e.target.files);
    inputFiles = [...inputFiles, ...newFiles];
    renderGallery();
    log(`ÄÃ£ thÃªm ${newFiles.length} áº£nh.`);
}

function handleWmSelect(e) {
    const file = e.target.files[0];
    if(file) {
        document.getElementById('wm-path-display').value = file.name;
        const reader = new FileReader();
        reader.onload = (ev) => {
            wmImg = new Image();
            wmImg.src = ev.target.result;
            log(`ÄÃ£ load Watermark: ${file.name}`);
        };
        reader.readAsDataURL(file);
    }
}

function renderGallery() {
    const area = document.getElementById('gallery-area');
    area.innerHTML = '';
    if(inputFiles.length === 0) {
        area.innerHTML = '<p id="gallery-placeholder">Trá»‘ng...</p>';
        return;
    }
    inputFiles.forEach(f => {
        const url = URL.createObjectURL(f);
        const img = document.createElement('img');
        img.src = url; img.className = 'g-thumb';
        area.appendChild(img);
    });
}

function clearGallery() {
    inputFiles = [];
    renderGallery();
    log("ÄÃ£ xÃ³a danh sÃ¡ch áº£nh.");
}

async function startProcess() {
    if(!inputFiles.length) return alert("ChÆ°a chá»n áº£nh!");

    const btn = document.getElementById('btn-start-wm');
    btn.disabled = true; btn.innerText = "ÄANG Xá»¬ LÃ...";
    document.getElementById('log-box').value = ""; // Clear log
    
    const mode = document.getElementById('sel-mode').value;
    const opacity = parseInt(document.getElementById('rng-opacity').value) / 100;
    const quality = parseInt(document.getElementById('rng-quality').value) / 100;
    const renameTpl = document.getElementById('inp-rename').value;
    const downloadArea = document.getElementById('download-area');
    downloadArea.innerHTML = ''; // Reset link táº£i

    log(`ðŸš€ Báº¯t Ä‘áº§u xá»­ lÃ½ ${inputFiles.length} áº£nh...`);
    if(!wmImg) log("âš ï¸ KhÃ´ng cÃ³ watermark, chá»‰ xá»­ lÃ½ hÃ¬nh áº£nh gá»‘c.");

    const processedFiles = []; // Array of {blob, name}

    for(let i=0; i<inputFiles.length; i++) {
        try {
            const file = inputFiles[i];
            const blob = await processImage(file, mode, opacity, quality);
            
            // Rename logic
            let baseName = file.name.substring(0, file.name.lastIndexOf('.'));
            let newName = renameTpl.replace('{default name}', baseName);
            newName = newName.replace(/[<>:"/\\|?*]/g, '_') + ".webp"; // Sanitize

            processedFiles.push({blob, name: newName});

            log(`âœ… OK: ${file.name} -> ${newName}`);
            document.getElementById('p-bar-fill').style.width = Math.round(((i+1)/inputFiles.length)*100) + "%";
            document.getElementById('status-lbl').innerText = `${i+1}/${inputFiles.length}`;
        } catch(e) {
            log(`âŒ Error: ${inputFiles[i].name} - ${e}`);
        }
        await new Promise(r => setTimeout(r, 100)); // Delay Ä‘á»ƒ UI mÆ°á»£t
    }

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
        log(`ðŸ“¦ ÄÃ£ táº¡o ZIP vá»›i ${processedFiles.length} áº£nh.`);
    }

    log("ðŸŽ‰ HoÃ n táº¥t!");
    btn.disabled = false; btn.innerText = "START PROCESSING";
    const msg = processedFiles.length > 1 ? "Xá»­ lÃ½ xong! ÄÃ£ táº£i xuá»‘ng file ZIP." : "Xá»­ lÃ½ xong! Kiá»ƒm tra thÆ° má»¥c Táº£i vá» cá»§a trÃ¬nh duyá»‡t.";
    alert(msg);
}

function processImage(file, mode, opacity, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // 1. Draw Original
                ctx.drawImage(img, 0, 0);

                // 2. Draw Watermark (chá»‰ náº¿u cÃ³)
                if(wmImg) {
                    ctx.globalAlpha = opacity;
                    const W = canvas.width, H = canvas.height;
                    const wmW = wmImg.width, wmH = wmImg.height;

                    if(mode === 'Fullscreen') {
                        ctx.drawImage(wmImg, 0, 0, W, H);
                    } else if (mode === 'Bottom-right') {
                        // Python Logic: scale = int(W * 0.2), if scale < 50 scale = 50
                        let scale = Math.floor(W * 0.2);
                        if (scale < 50) scale = 50;
                        const ratio = wmW / wmH;
                        const newH = Math.floor(scale / ratio);
                        ctx.drawImage(wmImg, W - scale - 20, H - newH - 20, scale, newH);
                    } else if (mode === 'Diagonal repeat') {
                        // Python Logic: wm_scale = int(W * 0.25)
                        let scale = Math.floor(W * 0.25);
                        const ratio = wmW / wmH;
                        const newH = Math.floor(scale / ratio);
                        const stepX = scale + 50;
                        const stepY = newH + 50;
                        
                        for(let x=0; x < W + stepX; x += stepX) {
                            for(let y=0; y < H + stepY; y += stepY) {
                                ctx.drawImage(wmImg, x, y, scale, newH);
                            }
                        }
                    }
                }
                
                canvas.toBlob(resolve, 'image/webp', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
