/* ============================================
   BACKUP MODULE — Full Export/Import JSON
   ============================================ */
const Backup = (() => {

    async function exportAll() {
        try {
            Utils.showToast('Membuat backup...', 'info');
            const data = await DB.exportAll();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const filename = `feedlot_backup_${Utils.todayStr()}.json`;
            Utils.downloadFile(blob, filename);
            Utils.showToast('Backup berhasil diunduh!', 'success');
            DB.addLog('Backup', 'Full backup exported');
        } catch (err) {
            console.error('Backup export error:', err);
            Utils.showToast('Gagal membuat backup: ' + err.message, 'error');
        }
    }

    async function importAll(file) {
        if (!confirm('Import akan MENGGANTI seluruh data lokal. Lanjutkan?')) return;
        try {
            Utils.showToast('Mengimport data...', 'info');
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data._app && !data._version) {
                Utils.showToast('File backup tidak valid', 'error');
                return;
            }
            await DB.importAll(data);
            Utils.showToast('Import berhasil! Halaman akan di-refresh.', 'success');
            DB.addLog('Backup', 'Full backup imported');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            console.error('Backup import error:', err);
            Utils.showToast('Gagal import: ' + err.message, 'error');
        }
    }

    return { exportAll, importAll };
})();
