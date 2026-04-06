// DATA GLOBAL
const aircrafts = ["AEA", "AEB", "AEC", "AED", "AEE", "AEF", "AEG", "AEH", "AEI", "AEJ", "AEK", "AEL", "AEM", "AEN", "AEO", "AEP", "AEQ", "AER"];

const pInfo = [
    {h: "1ST (01:00-02:00)", c: "#e74c3c"}, {h: "2ND (02:30-03:30)", c: "#e74c3c"},
    {h: "3RD (04:00-05:00)", c: "#2980b9"}, {h: "REST (05:00-06:00)", c: "#16a085"},
    {h: "4TH (06:30-07:30)", c: "#d35400"}, {h: "5TH (08:00-09:00)", c: "#d35400"},
    {h: "6TH (09:30-10:30)", c: "#27ae60"}, {h: "7TH (11:00-12:00)", c: "#8e44ad"}
];

// FUNGSI GENERATE TABEL (Dashboard)
function buildTable() {
    const displayDiv = document.getElementById('display');
    if(!displayDiv) return;

    let html = "";
    const layouts = [
        { title: "MORNING SESSION", start: 0, end: 4 }, 
        { title: "AFTERNOON SESSION", start: 4, end: 8 }
    ];
    
    layouts.forEach(lay => {
        html += `<h3 style="color:white; margin-top:20px;">${lay.title}</h3>`;
        html += `<div class="table-wrapper"><table><thead><tr><th rowspan="2" class="reg-col">REG</th>`;
        for(let i=lay.start; i<lay.end; i++) {
            html += `<th colspan="6" class="p-head" style="background:${pInfo[i].c}">${pInfo[i].h}</th><th rowspan="2" class="course-col">CRS</th>`;
        }
        html += `</tr><tr>`;
        for(let i=lay.start; i<lay.end; i++) html += `<td>FI</td><td>STD</td><td>EXC</td><td>OFF</td><td>ON</td><td>RMK</td>`;
        html += `</tr></thead><tbody>`;
        
        aircrafts.forEach(r => {
            html += `<tr><td class="reg-col">PK-${r}</td>`;
            for(let i=lay.start; i<lay.end; i++) {
                const fields = ['fi', 'std', 'exc', 'off', 'on', 'rmk'];
                fields.forEach(f => html += `<td id="${r}-${i}-${f}">-</td>`);
                html += `<td class="course-col" id="${r}-${i}-crs"></td>`; 
            }
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
    });
    displayDiv.innerHTML = html;
    loadData();
}

// SIMPAN DATA (Admin)
function saveData() {
    const db = JSON.parse(localStorage.getItem('flightDB') || '{}');
    const r = document.getElementById('reg').value;
    const p = document.getElementById('period').value;
    
    const fields = ['fi', 'std', 'exc', 'off', 'on', 'rmk', 'crs'];
    fields.forEach(f => {
        const val = document.getElementById(f).value;
        db[`${r}-${p}-${f}`] = val;
    });

    localStorage.setItem('flightDB', JSON.stringify(db));
    alert(`Data PK-${r} berhasil diupdate!`);
}

// LOAD DATA (Dashboard)
function loadData() {
    const db = JSON.parse(localStorage.getItem('flightDB') || '{}');
    aircrafts.forEach(r => {
        for (let p = 0; p < 8; p++) {
            ['fi', 'std', 'exc', 'off', 'on', 'rmk'].forEach(f => {
                const el = document.getElementById(`${r}-${p}-${f}`);
                if(el) {
                    const val = db[`${r}-${p}-${f}`] || "-";
                    el.innerText = val;
                    if(f === 'rmk' && val.toUpperCase() === "OK") el.classList.add('status-ok');
                    else if(f === 'rmk') el.classList.remove('status-ok');
                }
            });
            const crsEl = document.getElementById(`${r}-${p}-crs`);
            if(crsEl) crsEl.innerText = db[`${r}-${p}-crs`] || "";
        }
    });
}

// INIT UNTUK ADMIN PAGE
function initAdmin() {
    const regSelect = document.getElementById('reg');
    if(regSelect) {
        aircrafts.forEach(r => {
            let opt = document.createElement('option');
            opt.value = r;
            opt.innerHTML = `PK-${r}`;
            regSelect.appendChild(opt);
        });
    }
}

// Jalankan otomatis
window.onload = () => {
    buildTable();
    initAdmin();
    if(document.getElementById('display')) {
        setInterval(loadData, 5000); // Auto refresh tiap 5 detik di dashboard
    }
};
