// CONFIGURATION
const aircrafts = ["AEA", "AEB", "AEC", "AED", "AEE", "AEF", "AEG", "AEH", "AEI", "AEJ", "AEK", "AEL", "AEM", "AEN", "AEO", "AEP", "AEQ", "AER"];

const periods = [
    { name: "1ST (01-02)", color: "var(--p12)" },
    { name: "2ND (02:30-03:30)", color: "var(--p12)" },
    { name: "3RD (04-05)", color: "var(--p3)" },
    { name: "REST (05-06)", color: "var(--prest)" },
    { name: "4TH (06:30-07:30)", color: "var(--p45)" },
    { name: "5TH (08-09)", color: "var(--p45)" },
    { name: "6TH (09:30-10:30)", color: "var(--p67)" },
    { name: "7TH (11-12)", color: "var(--p8)" }
];

// --- FUNGSI UNTUK ADMIN (INPUT) ---
function initAdminForm() {
    const regSelect = document.getElementById('reg');
    if (regSelect) {
        aircrafts.forEach(r => {
            let opt = document.createElement('option');
            opt.value = r;
            opt.innerHTML = `PK-${r}`;
            regSelect.appendChild(opt);
        });
    }
}

function saveData() {
    const db = JSON.parse(localStorage.getItem('flightDB') || '{}');
    const r = document.getElementById('reg').value;
    const p = document.getElementById('period').value;
    
    const fields = ['fi', 'std', 'exc', 'off', 'on', 'rmk', 'crs'];
    fields.forEach(f => {
        db[`${r}-${p}-${f}`] = document.getElementById(f).value;
    });

    localStorage.setItem('flightDB', JSON.stringify(db));
    alert(`Success! PK-${r} Period ${parseInt(p)+1} updated.`);
}

// --- FUNGSI UNTUK DASHBOARD (DISPLAY) ---
function loadDashboardData() {
    const db = JSON.parse(localStorage.getItem('flightDB') || '{}');
    
    aircrafts.forEach(r => {
        for (let p = 0; p < 8; p++) {
            const fields = ['fi', 'std', 'exc', 'off', 'on', 'rmk', 'crs'];
            fields.forEach(f => {
                const cellId = `${r}-${p}-${f}`;
                const el = document.getElementById(cellId);
                if (el) {
                    const val = db[cellId] || "-";
                    el.innerText = val;
                    
                    // Auto-highlight jika "OK"
                    if (f === 'rmk' && val.toUpperCase() === 'OK') {
                        el.classList.add('status-ok');
                    } else if (f === 'rmk') {
                        el.classList.remove('status-ok');
                    }
                }
            });
        }
    });
}

// Inisialisasi saat halaman dibuka
window.onload = () => {
    if (document.getElementById('reg')) initAdminForm(); // Jika di halaman admin
    if (document.getElementById('display')) loadDashboardData(); // Jika di dashboard
};

// Update Dashboard secara Real-time setiap 5 detik
if (window.location.href.includes('index.html')) {
    setInterval(loadDashboardData, 5000);
}
