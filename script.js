// CONFIGURATION DATA
const aircrafts = ["AEA", "AEB", "AEC", "AED", "AEE", "AEF", "AEG", "AEH", "AEI", "AEJ", "AEK", "AEL", "AEM", "AEN", "AEO", "AEP", "AEQ", "AER"];

const pInfo = [
    {h: "1ST (01-02)", c: "#e74c3c"}, {h: "2ND (02-03)", c: "#e74c3c"},
    {h: "3RD (04-05)", c: "#2980b9"}, {h: "REST (05-06)", c: "#16a085"},
    {h: "4TH (06-07)", c: "#d35400"}, {h: "5TH (08-09)", c: "#d35400"},
    {h: "6TH (09-10)", c: "#27ae60"}, {h: "7TH (11-12)", c: "#8e44ad"}
];

// --- FUNGSI UNTUK DASHBOARD (index.html) ---
function buildTable() {
    const displayDiv = document.getElementById('display');
    if(!displayDiv) return; // Proteksi jika bukan halaman dashboard

    let html = "";
    const layouts = [{ title: "MORNING SESSION", s: 0, e: 4 }, { title: "AFTERNOON SESSION", s: 4, e: 8 }];
    
    layouts.forEach(lay => {
        html += `<h3 style="color:white; margin-top:20px;">${lay.title}</h3>`;
        html += `<div class="table-wrapper"><table><thead><tr><th rowspan="2" class="reg-col">REG</th>`;
        for(let i=lay.s; i<lay.e; i++) {
            html += `<th colspan="6" class="p-head" style="background:${pInfo[i].c}">${pInfo[i].h}</th><th rowspan="2" class="course-col">CRS</th>`;
        }
        html += `</tr><tr>`;
        for(let i=lay.s; i<lay.e; i++) html += `<td>FI</td><td>STD</td><td>EXC</td><td>OFF</td><td>ON</td><td>RMK</td>`;
        html += `</tr></thead><tbody>`;
        
        aircrafts.forEach(r => {
            html += `<tr><td class="reg-col">PK-${r}</td>`;
            for(let i=lay.s; i<lay.e; i++) {
                ['fi', 'std', 'exc', 'off', 'on', 'rmk'].forEach(f => html += `<td id="${r}-${i}-${f}">-</td>`);
                html += `<td class="course-col" id="${r}-${i}-crs"></td>`; 
            }
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
    });
    displayDiv.innerHTML = html;
    loadData(); // Langsung muat data setelah tabel dibuat
}

// --- FUNGSI UNTUK ADMIN (admin.html) ---
function saveData() {
    const db = JSON.parse(localStorage.getItem('flightDB') || '{}');
    const r = document.getElementById('reg').value;
    const p = document.getElementById('period').value;
    
    // Ambil input dari form
    const fiVal = document.getElementById('fi').value;
    const stdVal = document.getElementById('std').value;
    const excVal = document.getElementById('exc').value;

    // Simpan ke object database temporary
    db[`${r}-${p}-fi`] = fiVal || "-";
    db[`${r}-${p}-std`] = stdVal || "-";
    db[`${r}-${p}-exc`] = excVal || "-";

    // Simpan permanent ke browser
    localStorage.setItem('flightDB', JSON.stringify(db));
    
    alert(`Update Berhasil: PK-${r} Periode ${parseInt(p)+1}`);
    
    // Reset form setelah sukses
    document.getElementById('fi').value = "";
    document.getElementById('std').value = "";
    document.getElementById('exc').value = "";
}

// --- FUNGSI LOAD & SYNC DATA ---
function loadData() {
    const db = JSON.parse(localStorage.getItem('flightDB') || '{}');
    
    aircrafts.forEach(r => {
        for (let p = 0; p < 8; p++) {
            // Update sel tabel FI, STD, EXC
            ['fi', 'std', 'exc', 'off', 'on', 'rmk'].forEach(f => {
                const cell = document.getElementById(`${r}-${p}-${f}`);
                if(cell) cell.innerText = db[`${r}-${p}-${f}`] || "-";
            });
            // Update sel CRS
            const crsCell = document.getElementById(`${r}-${p}-crs`);
            if(crsCell) crsCell.innerText = db[`${r}-${p}-crs`] || "";
        }
    });
}

// Jalankan saat window dimuat
window.onload = () => {
    buildTable();
    // Jika berada di index.html, lakukan auto-refresh data setiap 5 detik
    if(document.getElementById('display')) {
        setInterval(loadData, 5000);
    }
};
