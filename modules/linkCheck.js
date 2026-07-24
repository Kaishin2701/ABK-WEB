let isChecking = false;

document.getElementById('btn-check-link').addEventListener('click', startLinkCheck);
document.getElementById('btn-stop-link').addEventListener('click', () => isChecking = false);
document.getElementById('sel-filter').addEventListener('change', applyFilter);

async function startLinkCheck() {
    const raw = document.getElementById('inp-urls').value;
    const urls = raw.match(/(https?:\/\/[^\s]+)/g) || [];
    
    if(!urls.length) return alert("Không tìm thấy link!");
    
    // Reset UI
    const tbody = document.querySelector('#tbl-links tbody');
    tbody.innerHTML = '';
    document.getElementById('link-p-bar').style.width = '0%';
    document.getElementById('btn-check-link').disabled = true;
    document.getElementById('btn-stop-link').disabled = false;
    isChecking = true;

    let stats = { live: 0, dead: 0, error: 0 };
    updateStats(stats);

    for(let i=0; i<urls.length; i++) {
        if(!isChecking) break;
        
        const url = urls[i];
        let status = "Checking...";
        let color = "#ccc";
        let msg = "...";
        
        // Tạo dòng tạm
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="color:#ffa500">...</td><td>${url}</td><td>Checking...</td>`;
        tbody.appendChild(tr);

        // CHECK LOGIC DÙNG PROXY (Lách CORS)
        try {
            // Dùng corsproxy.io để gửi request thay cho trình duyệt
            const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
            
            // Fetch HEAD request để nhanh
            const res = await fetch(proxyUrl, { method: 'HEAD' });
            
            const code = res.status; // Lưu ý: Một số proxy có thể trả về 200 dù web gốc 404, nhưng đây là cách tốt nhất free.
            
            // Xóa dòng tạm, update dòng thật
            tr.remove(); 
            addLinkRow(code, url, res.statusText || "OK");

            if(code >= 200 && code < 300) stats.live++;
            else if(code === 404) stats.dead++;
            else stats.error++;

        } catch(e) {
            tr.remove();
            addLinkRow("ERR", url, "Network/CORS Error");
            stats.error++;
        }

        updateStats(stats);
        document.getElementById('link-p-bar').style.width = Math.round(((i+1)/urls.length)*100) + "%";
        document.getElementById('link-status').innerText = `Checking ${i+1}/${urls.length}`;
        
        // Scroll xuống dưới
        const wrapper = document.querySelector('.table-wrapper');
        wrapper.scrollTop = wrapper.scrollHeight;
    }

    isChecking = false;
    document.getElementById('btn-check-link').disabled = false;
    document.getElementById('btn-stop-link').disabled = true;
    document.getElementById('link-status').innerText = "Done.";
}

function addLinkRow(code, url, msg) {
    const tbody = document.querySelector('#tbl-links tbody');
    const tr = document.createElement('tr');
    
    let color = "#00ccff"; // Other
    if(code == 200) color = "#00ff88";
    else if(code == 404 || code == "ERR") color = "#ff5555";

    tr.innerHTML = `
        <td style="color:${color}; font-weight:bold">${code}</td>
        <td style="color:#ddd">${url}</td>
        <td style="color:${color}">${msg}</td>
    `;
    tbody.appendChild(tr);
}

function updateStats(s) {
    document.getElementById('link-stats').innerText = `Live: ${s.live} | Dead: ${s.dead} | Error: ${s.error}`;
}

function applyFilter() {
    const filter = document.getElementById('sel-filter').value;
    const rows = document.querySelectorAll('#tbl-links tbody tr');
    
    rows.forEach(row => {
        const code = row.cells[0].innerText;
        let show = false;
        if(filter === "Show All") show = true;
        else if(filter === "Live (200)" && code.startsWith('2')) show = true;
        else if(filter === "Dead (404)" && code === '404') show = true;
        
        row.style.display = show ? '' : 'none';
    });
}