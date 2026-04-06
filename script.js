function saveData() {
    const db = JSON.parse(localStorage.getItem('flightDB') || '{}');
    const r = document.getElementById('reg').value;
    const p = document.getElementById('period').value;
    
    // Hanya ambil field yang masih ada di admin.html
    const fields = ['fi', 'std', 'exc']; 
    
    fields.forEach(f => {
        const inputEl = document.getElementById(f);
        if (inputEl) {
            db[`${r}-${p}-${f}`] = inputEl.value;
        }
    });

    // Opsional: Jika ingin mengosongkan CRS, OFF, ON, RMK secara otomatis saat update
    // db[`${r}-${p}-crs`] = "";
    // db[`${r}-${p}-off`] = "";
    // db[`${r}-${p}-on`] = "";
    // db[`${r}-${p}-rmk`] = "";

    localStorage.setItem('flightDB', JSON.stringify(db));
    alert(`Data PK-${r} Periode ${parseInt(p)+1} Berhasil Diupdate!`);
    
    // Reset form setelah simpan agar siap untuk input berikutnya
    document.getElementById('fi').value = "";
    document.getElementById('std').value = "";
    document.getElementById('exc').value = "";
}
