// --- MODIFIKASI PADA FUNGSI GENERATE TABEL ---
function buildDashboard() {
    let html = "";
    const layouts = [{ title: "MORNING SESSION", start: 0, end: 4 }, { title: "AFTERNOON SESSION", start: 4, end: 8 }];
    
    layouts.forEach(lay => {
        html += `<h3>${lay.title}</h3><div class="table-wrapper"><table><thead><tr><th rowspan="2" class="reg-col">REG</th>`;
        for(let i=lay.start; i<lay.end; i++) {
            html += `<th colspan="6" class="p-head" style="background:${pInfo[i].c}">${pInfo[i].h}</th><th rowspan="2" class="course">CRS</th>`;
        }
        html += `</tr><tr>`;
        for(let i=lay.start; i<lay.end; i++) html += `<td>FI</td><td>STD</td><td>EXC</td><td>OFF</td><td>ON</td><td>RMK</td>`;
        html += `</tr></thead><tbody>`;
        
        aircrafts.forEach(r => {
            html += `<tr><td class="reg-col">PK-${r}</td>`;
            for(let i=lay.start; i<lay.end; i++) {
                const fields = ['fi', 'std', 'exc', 'off', 'on', 'rmk'];
                fields.forEach(f => html += `<td id="${r}-${i}-${f}">-</td>`);
                
                // BAGIAN INI DIUBAH: Kosongkan teks default agar standby
                html += `<td class="course" id="${r}-${i}-crs"></td>`; 
            }
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
    });
    document.getElementById('display').innerHTML = html;
    loadData();
}

// --- MODIFIKASI PADA FUNGSI LOAD DATA ---
function loadData() {
    const db = JSON.parse(localStorage.getItem('flightDB') || '{}');
    
    // Pastikan data CRS juga ikut ter-update dari memory
    aircrafts.forEach(r => {
        for (let p = 0; p < 8; p++) {
            // Update kolom reguler
            ['fi', 'std', 'exc', 'off', 'on', 'rmk'].forEach(f => {
                const el = document.getElementById(`${r}-${p}-${f}`);
                if(el) el.innerText = db[`${r}-${p}-${f}`] || "-";
            });
            
            // Update kolom CRS
            const crsEl = document.getElementById(`${r}-${p}-crs`);
            if(crsEl) {
                crsEl.innerText = db[`${r}-${p}-crs`] || ""; // Jika kosong di admin, tetap kosong di dashboard
            }
        }
    });
}
