/* ============================================
   INDUKSI MODULE — Cattle Induction
   ============================================ */
const Induksi = (() => {

    // --- Populate dropdowns ---
    async function loadDropdowns() {
        const types = [
            { type: 'shipment', elId: 'indShipment' },
            { type: 'frame', elId: 'indFrame' },
            { type: 'kodeProperty', elId: 'indKodeProperty' },
            { type: 'jenisSapi', elId: 'indJenisSapi' }
        ];
        for (const { type, elId } of types) {
            const values = await DB.getMasterByType(type);
            const select = document.getElementById(elId);
            const current = select.value;
            select.innerHTML = '<option value="">-- Pilih --</option>';
            values.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v;
                select.appendChild(opt);
            });
            if (current) select.value = current;
        }
        // Also load into filter dropdowns
        await loadFilterDropdowns();
    }

    async function loadFilterDropdowns() {
        const allInd = await DB.getAll('induksi');
        const shipments = [...new Set(allInd.map(d => d.shipment).filter(Boolean))].sort();
        const filterIds = ['indTableFilter', 'indSummaryFilter', 'indSummaryJenisFilter'];
        for (const fid of filterIds) {
            const sel = document.getElementById(fid);
            if (!sel) continue;
            const current = sel.value;
            sel.innerHTML = '<option value="">Semua Shipment</option>';
            shipments.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s; opt.textContent = s;
                sel.appendChild(opt);
            });
            if (current) sel.value = current;
        }
        // PEN filter from actual data
        const allData = await DB.getAll('induksi');
        const pens = [...new Set(allData.map(d => d.pen).filter(Boolean))].sort();
        const penSel = document.getElementById('indTableFilterPen');
        if (penSel) {
            const currentPen = penSel.value;
            penSel.innerHTML = '<option value="">Semua PEN</option>';
            pens.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p; opt.textContent = p;
                penSel.appendChild(opt);
            });
            if (currentPen) penSel.value = currentPen;
        }
    }

    // --- Set today's date ---
    function setDefaultDate() {
        const el = document.getElementById('indTanggal');
        if (el && !el.value) el.value = Utils.todayStr();
    }

    // --- Input handler ---
    async function inputData() {
        const shipment = document.getElementById('indShipment').value;
        const rfid = document.getElementById('indRfid').value.trim();
        const tanggal = document.getElementById('indTanggal').value;
        const eartag = document.getElementById('indEartag').value.trim();
        const berat = parseFloat(document.getElementById('indBerat').value) || 0;
        const pen = document.getElementById('indPen').value.trim();
        const gigi = document.getElementById('indGigi').value;
        const frame = document.getElementById('indFrame').value;
        const kodeProperty = document.getElementById('indKodeProperty').value;
        const vitamin = parseInt(document.getElementById('indVitamin').value) || 1;
        const jenisSapi = document.getElementById('indJenisSapi').value;

        if (!rfid) { Utils.showToast('RFID harus diisi', 'warning'); return; }
        if (!shipment) { Utils.showToast('Shipment harus dipilih', 'warning'); return; }

        // Check duplicate RFID
        const existing = await DB.get('induksi', rfid);
        if (existing) {
            if (!confirm(`RFID ${rfid} sudah ada (Eartag: ${existing.eartag}). Ganti data?`)) return;
        }

        const record = { rfid, shipment, tanggal, eartag, berat, pen, gigi, frame, kodeProperty, vitamin, jenisSapi };
        await DB.add('induksi', record);
        DB.addLog('Induksi', `Input: RFID=${rfid}, Eartag=${eartag}, Shipment=${shipment}`);
        Utils.showToast('Data induksi berhasil disimpan', 'success');
        clearForm();
        await refreshAll();
    }

    function clearForm() {
        document.getElementById('indRfid').value = '';
        document.getElementById('indEartag').value = '';
        document.getElementById('indBerat').value = '';
        document.getElementById('indPen').value = '';
        document.getElementById('indGigi').value = '0';
        document.getElementById('indVitamin').value = '1';
        document.getElementById('indRfid').focus();
    }

    // --- Refresh table ---
    async function refreshTable() {
        const tbody = document.getElementById('indTableBody');
        const shipFilter = document.getElementById('indTableFilter').value;
        const penFilter = document.getElementById('indTableFilterPen').value;
        let data = await DB.getAll('induksi');

        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        if (penFilter) data = data.filter(d => d.pen === penFilter);

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((d, i) => `
            <tr>
                <td class="checkbox-col"><input type="checkbox" class="ind-check" data-rfid="${d.rfid}"></td>
                <td>${i + 1}</td>
                <td>${d.shipment || '-'}</td>
                <td>${d.rfid}</td>
                <td>${Utils.formatDate(d.tanggal)}</td>
                <td>${d.eartag || '-'}</td>
                <td>${Utils.formatNumber(d.berat)}</td>
                <td><span class="editable-pen" onclick="Induksi.editPen('${d.rfid}', this)">${d.pen || '-'}</span></td>
                <td>${d.gigi || '0'}</td>
                <td>${d.frame || '-'}</td>
                <td>${d.kodeProperty || '-'}</td>
                <td>${d.vitamin || 1}</td>
                <td>${d.jenisSapi || '-'}</td>
            </tr>
        `).join('');
    }

    // --- Edit PEN inline ---
    async function editPen(rfid, el) {
        const current = el.textContent === '-' ? '' : el.textContent;
        const newPen = prompt('Ubah PEN:', current);
        if (newPen === null) return;
        const record = await DB.get('induksi', rfid);
        if (record) {
            record.pen = newPen.trim();
            await DB.update('induksi', record);
            DB.addLog('Induksi', `PEN updated: RFID=${rfid}, PEN=${newPen}`);
            await refreshAll();
        }
    }

    // --- Summary per PEN ---
    async function refreshSummaryPen() {
        const tbody = document.getElementById('indSummaryBody');
        const shipFilter = document.getElementById('indSummaryFilter').value;
        let data = await DB.getAll('induksi');
        const soldRfids = await DB.getSoldRfids();
        data = data.filter(d => !soldRfids.has(d.rfid));
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);

        const penMap = {};
        for (const d of data) {
            const pen = d.pen || '(Tanpa PEN)';
            if (!penMap[pen]) penMap[pen] = { count: 0, totalBerat: 0, jenis: new Set(), frames: new Set() };
            penMap[pen].count++;
            penMap[pen].totalBerat += d.berat || 0;
            if (d.jenisSapi) penMap[pen].jenis.add(d.jenisSapi);
            if (d.frame) penMap[pen].frames.add(d.frame);
        }

        const pens = Object.keys(penMap).sort();
        if (pens.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }

        tbody.innerHTML = pens.map(pen => {
            const p = penMap[pen];
            const avg = p.count > 0 ? p.totalBerat / p.count : 0;
            return `<tr>
                <td>${pen}</td>
                <td>${p.count}</td>
                <td>${Utils.formatNumber(p.totalBerat)}</td>
                <td>${Utils.formatNumber(avg)}</td>
                <td>${[...p.jenis].join(', ') || '-'}</td>
                <td>${[...p.frames].join(', ') || '-'}</td>
            </tr>`;
        }).join('');
    }

    // --- Summary per Jenis Sapi ---
    async function refreshSummaryJenis() {
        const tbody = document.getElementById('indSummaryJenisBody');
        const shipFilter = document.getElementById('indSummaryJenisFilter').value;
        let data = await DB.getAll('induksi');
        const soldRfids = await DB.getSoldRfids();
        data = data.filter(d => !soldRfids.has(d.rfid));
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);

        const jenisMap = {};
        for (const d of data) {
            const jenis = d.jenisSapi || '(Tidak diketahui)';
            if (!jenisMap[jenis]) jenisMap[jenis] = { count: 0, totalBerat: 0 };
            jenisMap[jenis].count++;
            jenisMap[jenis].totalBerat += d.berat || 0;
        }

        const jenisArr = Object.keys(jenisMap).sort();
        if (jenisArr.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }

        tbody.innerHTML = jenisArr.map(jenis => {
            const j = jenisMap[jenis];
            const avg = j.count > 0 ? j.totalBerat / j.count : 0;
            return `<tr>
                <td>${jenis}</td>
                <td>${j.count}</td>
                <td>${Utils.formatNumber(j.totalBerat)}</td>
                <td>${Utils.formatNumber(avg)}</td>
            </tr>`;
        }).join('');
    }

    // --- Delete selected ---
    async function deleteSelected() {
        const checked = document.querySelectorAll('.ind-check:checked');
        if (checked.length === 0) { Utils.showToast('Pilih data yang akan dihapus', 'warning'); return; }
        if (!confirm(`Hapus ${checked.length} data induksi?`)) return;
        for (const cb of checked) {
            await DB.remove('induksi', cb.dataset.rfid);
        }
        DB.addLog('Induksi', `Deleted ${checked.length} records`);
        Utils.showToast(`${checked.length} data dihapus`, 'success');
        await refreshAll();
    }

    // --- Export to Excel ---
    async function exportExcel() {
        const shipFilter = document.getElementById('indTableFilter').value;
        let data = await DB.getAll('induksi');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        const exportData = data.map((d, i) => ({
            'No': i + 1, 'Shipment': d.shipment, 'RFID': d.rfid, 'Tanggal': d.tanggal,
            'Eartag': d.eartag, 'Berat': d.berat, 'PEN': d.pen, 'Gigi': d.gigi,
            'Frame': d.frame, 'Kode Property': d.kodeProperty, 'Vitamin': d.vitamin, 'Jenis Sapi': d.jenisSapi
        }));
        Utils.exportToExcel(exportData, `induksi_${Utils.todayStr()}.xlsx`, 'Induksi');
    }

    // --- Import Excel ---
    async function importExcel(file) {
        try {
            const rows = await Utils.readExcel(file);
            let count = 0;
            for (const row of rows) {
                const rfid = String(row['RFID'] || row['rfid'] || '').trim();
                if (!rfid) continue;
                const record = {
                    rfid,
                    shipment: row['Shipment'] || row['shipment'] || '',
                    tanggal: row['Tanggal'] || row['tanggal'] || '',
                    eartag: String(row['Eartag'] || row['eartag'] || ''),
                    berat: parseFloat(row['Berat'] || row['berat']) || 0,
                    pen: row['PEN'] || row['pen'] || '',
                    gigi: String(row['Gigi'] || row['gigi'] || '0'),
                    frame: row['Frame'] || row['frame'] || '',
                    kodeProperty: row['Kode Property'] || row['kodeProperty'] || '',
                    vitamin: parseInt(row['Vitamin'] || row['vitamin']) || 1,
                    jenisSapi: row['Jenis Sapi'] || row['jenisSapi'] || ''
                };
                await DB.add('induksi', record);
                count++;
            }
            Utils.showToast(`${count} data induksi berhasil diimport`, 'success');
            DB.addLog('Induksi', `Imported ${count} records from Excel`);
            await refreshAll();
        } catch (err) {
            Utils.showToast('Gagal import: ' + err.message, 'error');
        }
    }

    // --- Download template ---
    function downloadTemplateFile() {
        Utils.downloadTemplate(
            ['RFID', 'Shipment', 'Tanggal', 'Eartag', 'Berat', 'PEN', 'Gigi', 'Frame', 'Kode Property', 'Vitamin', 'Jenis Sapi'],
            'template_induksi.xlsx'
        );
    }

    // --- Export summary ---
    async function exportSummaryPen() {
        const shipFilter = document.getElementById('indSummaryFilter').value;
        let data = await DB.getAll('induksi');
        const soldRfids = await DB.getSoldRfids();
        data = data.filter(d => !soldRfids.has(d.rfid));
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        const penMap = {};
        for (const d of data) {
            const pen = d.pen || '(Tanpa PEN)';
            if (!penMap[pen]) penMap[pen] = { count: 0, totalBerat: 0, jenis: new Set(), frames: new Set() };
            penMap[pen].count++;
            penMap[pen].totalBerat += d.berat || 0;
            if (d.jenisSapi) penMap[pen].jenis.add(d.jenisSapi);
            if (d.frame) penMap[pen].frames.add(d.frame);
        }
        const exportData = Object.keys(penMap).sort().map(pen => {
            const p = penMap[pen];
            return { PEN: pen, 'Jumlah Sapi': p.count, 'Total Berat': p.totalBerat, 'Avg Berat': p.count ? (p.totalBerat / p.count).toFixed(1) : 0, 'Jenis Sapi': [...p.jenis].join(', '), 'Frame': [...p.frames].join(', ') };
        });
        Utils.exportToExcel(exportData, `summary_pen_induksi_${Utils.todayStr()}.xlsx`, 'Summary PEN');
    }

    async function exportSummaryJenis() {
        const shipFilter = document.getElementById('indSummaryJenisFilter').value;
        let data = await DB.getAll('induksi');
        const soldRfids = await DB.getSoldRfids();
        data = data.filter(d => !soldRfids.has(d.rfid));
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        const jenisMap = {};
        for (const d of data) {
            const jenis = d.jenisSapi || '(Tidak diketahui)';
            if (!jenisMap[jenis]) jenisMap[jenis] = { count: 0, totalBerat: 0 };
            jenisMap[jenis].count++;
            jenisMap[jenis].totalBerat += d.berat || 0;
        }
        const exportData = Object.keys(jenisMap).sort().map(jenis => {
            const j = jenisMap[jenis];
            return { 'Jenis Sapi': jenis, 'Jumlah Sapi': j.count, 'Total Berat': j.totalBerat, 'Avg Berat': j.count ? (j.totalBerat / j.count).toFixed(1) : 0 };
        });
        Utils.exportToExcel(exportData, `summary_jenis_induksi_${Utils.todayStr()}.xlsx`, 'Summary Jenis');
    }

    // --- Check All ---
    function setupCheckAll() {
        const checkAll = document.getElementById('indCheckAll');
        if (checkAll) {
            checkAll.addEventListener('change', () => {
                document.querySelectorAll('.ind-check').forEach(cb => cb.checked = checkAll.checked);
            });
        }
    }

    // --- Refresh all ---
    async function refreshAll() {
        await loadFilterDropdowns();
        await refreshTable();
        await refreshSummaryPen();
        await refreshSummaryJenis();
    }

    // --- Init ---
    async function init() {
        setDefaultDate();
        await loadDropdowns();
        setupCheckAll();
        await refreshAll();

        // Event listeners
        document.getElementById('btnInduksiInput').addEventListener('click', inputData);
        document.getElementById('btnInduksiClear').addEventListener('click', clearForm);
        document.getElementById('btnIndDeleteSelected').addEventListener('click', deleteSelected);
        document.getElementById('btnIndExportExcel').addEventListener('click', exportExcel);
        document.getElementById('btnIndImportExcel').addEventListener('click', () => document.getElementById('indImportFile').click());
        document.getElementById('indImportFile').addEventListener('change', (e) => { if (e.target.files[0]) { importExcel(e.target.files[0]); e.target.value = ''; } });
        document.getElementById('btnIndDownloadTemplate').addEventListener('click', downloadTemplateFile);
        document.getElementById('btnIndSummaryExport').addEventListener('click', exportSummaryPen);
        document.getElementById('btnIndSummaryJenisExport').addEventListener('click', exportSummaryJenis);

        // Filter change handlers
        document.getElementById('indTableFilter').addEventListener('change', refreshTable);
        document.getElementById('indTableFilterPen').addEventListener('change', refreshTable);
        document.getElementById('indSummaryFilter').addEventListener('change', refreshSummaryPen);
        document.getElementById('indSummaryJenisFilter').addEventListener('change', refreshSummaryJenis);
    }

    return { init, loadDropdowns, refreshAll, editPen };
})();
