/* ============================================
   REWEIGHT MODULE — Cattle Reweighing
   ============================================ */
const Reweight = (() => {

    function setDefaultDate() {
        const el = document.getElementById('rewTanggal');
        if (el && !el.value) el.value = Utils.todayStr();
    }

    // --- RFID Lookup from Induksi ---
    async function lookupRfid(rfid) {
        const ind = await DB.get('induksi', rfid);
        if (!ind) {
            Utils.showToast('RFID tidak ditemukan di data induksi', 'warning');
            return;
        }
        document.getElementById('rewTglInduksi').value = ind.tanggal || '';
        document.getElementById('rewEartag').value = ind.eartag || '';
        document.getElementById('rewShipment').value = ind.shipment || '';
        document.getElementById('rewBeratInduksi').value = ind.berat || 0;
        document.getElementById('rewPenInduksi').value = ind.pen || '';
        document.getElementById('rewFrame').value = ind.frame || '';
        document.getElementById('rewJenisSapi').value = ind.jenisSapi || '';
        calculateDofAdg();
    }

    function calculateDofAdg() {
        const tglInd = document.getElementById('rewTglInduksi').value;
        const tglRew = document.getElementById('rewTanggal').value;
        const beratInd = parseFloat(document.getElementById('rewBeratInduksi').value) || 0;
        const beratRew = parseFloat(document.getElementById('rewBerat').value) || 0;
        const dof = Utils.calculateDOF(tglInd, tglRew);
        const adg = Utils.calculateADG(beratInd, beratRew, dof);
        document.getElementById('rewDof').value = dof;
        document.getElementById('rewAdg').value = adg;
    }

    // --- Input Data ---
    async function inputData() {
        const rfid = document.getElementById('rewRfid').value.trim();
        const tglInduksi = document.getElementById('rewTglInduksi').value;
        const tanggal = document.getElementById('rewTanggal').value;
        const eartag = document.getElementById('rewEartag').value;
        const shipment = document.getElementById('rewShipment').value;
        const berat = parseFloat(document.getElementById('rewBerat').value) || 0;
        const beratInduksi = parseFloat(document.getElementById('rewBeratInduksi').value) || 0;
        const penInduksi = document.getElementById('rewPenInduksi').value;
        const penAwal = document.getElementById('rewPenAwal').value.trim();
        const penAkhir = document.getElementById('rewPenAkhir').value.trim();
        const dof = parseInt(document.getElementById('rewDof').value) || 0;
        const adg = parseFloat(document.getElementById('rewAdg').value) || 0;
        const frame = document.getElementById('rewFrame').value;
        const vitamin = parseInt(document.getElementById('rewVitamin').value) || 1;
        const jenisSapi = document.getElementById('rewJenisSapi').value;

        if (!rfid) { Utils.showToast('RFID harus diisi', 'warning'); return; }
        if (!tanggal) { Utils.showToast('Tanggal harus diisi', 'warning'); return; }

        const record = { rfid, tglInduksi, tanggal, eartag, shipment, berat, beratInduksi, penInduksi, penAwal, penAkhir, dof, adg, frame, vitamin, jenisSapi };
        await DB.add('reweight', record);
        DB.addLog('Reweight', `Input: RFID=${rfid}, Eartag=${eartag}, Berat=${berat}`);
        Utils.showToast('Data reweight berhasil disimpan', 'success');
        clearForm();
        await refreshAll();
    }

    function clearForm() {
        ['rewRfid', 'rewTglInduksi', 'rewEartag', 'rewShipment', 'rewBeratInduksi', 'rewPenInduksi',
            'rewPenAwal', 'rewPenAkhir', 'rewDof', 'rewAdg', 'rewFrame', 'rewJenisSapi', 'rewBerat'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        document.getElementById('rewVitamin').value = '1';
        document.getElementById('rewRfid').focus();
    }

    // --- Load filter dropdowns ---
    async function loadFilterDropdowns() {
        const allInd = await DB.getAll('induksi');
        const shipments = [...new Set(allInd.map(d => d.shipment).filter(Boolean))].sort();
        const filterIds = ['rewTableFilter', 'rewSummaryAwalFilter', 'rewSummaryAkhirFilter', 'rewDetailFilter', 'rewSummaryJenisFilter'];
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
        const allData = await DB.getAll('reweight');
        const pens = [...new Set(allData.map(d => d.penAkhir).filter(Boolean))].sort();
        const penSel = document.getElementById('rewTableFilterPen');
        if (penSel) {
            const cur = penSel.value;
            penSel.innerHTML = '<option value="">Semua PEN Akhir</option>';
            pens.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p; opt.textContent = p;
                penSel.appendChild(opt);
            });
            if (cur) penSel.value = cur;
        }
    }

    // --- Refresh Table ---
    async function refreshTable() {
        const tbody = document.getElementById('rewTableBody');
        const shipFilter = document.getElementById('rewTableFilter').value;
        const penFilter = document.getElementById('rewTableFilterPen').value;
        let data = await DB.getAll('reweight');

        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        if (penFilter) data = data.filter(d => d.penAkhir === penFilter);

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="17" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((d, i) => `
            <tr>
                <td class="checkbox-col"><input type="checkbox" class="rew-check" data-id="${d.id}"></td>
                <td>${i + 1}</td>
                <td>${d.rfid}</td>
                <td>${Utils.formatDate(d.tglInduksi)}</td>
                <td>${Utils.formatDate(d.tanggal)}</td>
                <td>${d.eartag || '-'}</td>
                <td>${d.shipment || '-'}</td>
                <td>${Utils.formatNumber(d.berat)}</td>
                <td>${d.penInduksi || '-'}</td>
                <td>${d.penAwal || '-'}</td>
                <td><span class="editable-pen" onclick="Reweight.editPenAkhir(${d.id}, this)">${d.penAkhir || '-'}</span></td>
                <td>${d.dof || 0}</td>
                <td>${Utils.formatNumber(d.adg, 2)}</td>
                <td>${d.frame || '-'}</td>
                <td>${d.vitamin || 1}</td>
                <td>${d.jenisSapi || '-'}</td>
            </tr>
        `).join('');
    }

    // --- Edit PEN Akhir inline ---
    async function editPenAkhir(id, el) {
        const current = el.textContent === '-' ? '' : el.textContent;
        const newPen = prompt('Ubah PEN Akhir:', current);
        if (newPen === null) return;
        const record = await DB.get('reweight', id);
        if (record) {
            record.penAkhir = newPen.trim();
            await DB.update('reweight', record);
            DB.addLog('Reweight', `PEN Akhir updated: ID=${id}, PEN=${newPen}`);
            await refreshAll();
        }
    }

    // --- Summary PEN Awal ---
    async function refreshSummaryAwal() {
        const tbody = document.getElementById('rewSummaryAwalBody');
        const shipFilter = document.getElementById('rewSummaryAwalFilter').value;
        let data = await DB.getAll('reweight');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);

        const map = {};
        for (const d of data) {
            const pen = d.penAwal || '(Tanpa PEN)';
            if (!map[pen]) map[pen] = { count: 0, totalBerat: 0, totalAdg: 0, jenis: new Set() };
            map[pen].count++;
            map[pen].totalBerat += d.berat || 0;
            map[pen].totalAdg += d.adg || 0;
            if (d.jenisSapi) map[pen].jenis.add(d.jenisSapi);
        }

        const keys = Object.keys(map).sort();
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }
        tbody.innerHTML = keys.map(pen => {
            const p = map[pen];
            return `<tr><td>${pen}</td><td>${p.count}</td><td>${Utils.formatNumber(p.totalBerat)}</td><td>${Utils.formatNumber(p.count ? p.totalBerat / p.count : 0)}</td><td>${Utils.formatNumber(p.count ? p.totalAdg / p.count : 0, 2)}</td><td>${[...p.jenis].join(', ') || '-'}</td></tr>`;
        }).join('');
    }

    // --- Summary PEN Akhir ---
    async function refreshSummaryAkhir() {
        const tbody = document.getElementById('rewSummaryAkhirBody');
        const shipFilter = document.getElementById('rewSummaryAkhirFilter').value;
        let data = await DB.getAll('reweight');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);

        const map = {};
        for (const d of data) {
            const pen = d.penAkhir || '(Tanpa PEN)';
            if (!map[pen]) map[pen] = { count: 0, totalBerat: 0, totalAdg: 0, jenis: new Set() };
            map[pen].count++;
            map[pen].totalBerat += d.berat || 0;
            map[pen].totalAdg += d.adg || 0;
            if (d.jenisSapi) map[pen].jenis.add(d.jenisSapi);
        }

        const keys = Object.keys(map).sort();
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }
        tbody.innerHTML = keys.map(pen => {
            const p = map[pen];
            return `<tr><td>${pen}</td><td>${p.count}</td><td>${Utils.formatNumber(p.totalBerat)}</td><td>${Utils.formatNumber(p.count ? p.totalBerat / p.count : 0)}</td><td>${Utils.formatNumber(p.count ? p.totalAdg / p.count : 0, 2)}</td><td>${[...p.jenis].join(', ') || '-'}</td></tr>`;
        }).join('');
    }

    // --- Detail Report per Eartag ---
    async function refreshDetail() {
        const tbody = document.getElementById('rewDetailBody');
        const shipFilter = document.getElementById('rewDetailFilter').value;
        let rewData = await DB.getAll('reweight');
        if (shipFilter) rewData = rewData.filter(d => d.shipment === shipFilter);

        if (rewData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }

        tbody.innerHTML = rewData.map((d, i) => `
            <tr>
                <td>${i + 1}</td><td>${d.shipment || '-'}</td><td>${d.rfid}</td><td>${d.eartag || '-'}</td>
                <td>${Utils.formatDate(d.tglInduksi)}</td><td>${Utils.formatNumber(d.beratInduksi)}</td>
                <td>${Utils.formatDate(d.tanggal)}</td><td>${Utils.formatNumber(d.berat)}</td>
                <td>${d.dof || 0}</td><td>${Utils.formatNumber(d.adg, 2)}</td><td>${d.jenisSapi || '-'}</td>
            </tr>
        `).join('');
    }

    // --- Summary per Jenis Sapi ---
    async function refreshSummaryJenis() {
        const tbody = document.getElementById('rewSummaryJenisBody');
        const shipFilter = document.getElementById('rewSummaryJenisFilter').value;
        let data = await DB.getAll('reweight');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);

        const map = {};
        for (const d of data) {
            const jenis = d.jenisSapi || '(Tidak diketahui)';
            if (!map[jenis]) map[jenis] = { count: 0, totalBerat: 0, totalAdg: 0, totalDof: 0 };
            map[jenis].count++;
            map[jenis].totalBerat += d.berat || 0;
            map[jenis].totalAdg += d.adg || 0;
            map[jenis].totalDof += d.dof || 0;
        }

        const keys = Object.keys(map).sort();
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }
        tbody.innerHTML = keys.map(jenis => {
            const j = map[jenis];
            return `<tr><td>${jenis}</td><td>${j.count}</td><td>${Utils.formatNumber(j.totalBerat)}</td><td>${Utils.formatNumber(j.count ? j.totalBerat / j.count : 0)}</td><td>${Utils.formatNumber(j.count ? j.totalAdg / j.count : 0, 2)}</td><td>${Utils.formatNumber(j.count ? j.totalDof / j.count : 0, 0)}</td></tr>`;
        }).join('');
    }

    // --- Delete selected ---
    async function deleteSelected() {
        const checked = document.querySelectorAll('.rew-check:checked');
        if (checked.length === 0) { Utils.showToast('Pilih data yang akan dihapus', 'warning'); return; }
        if (!confirm(`Hapus ${checked.length} data reweight?`)) return;
        for (const cb of checked) {
            await DB.remove('reweight', parseInt(cb.dataset.id));
        }
        DB.addLog('Reweight', `Deleted ${checked.length} records`);
        Utils.showToast(`${checked.length} data dihapus`, 'success');
        await refreshAll();
    }

    // --- Export Excel ---
    async function exportExcel() {
        const shipFilter = document.getElementById('rewTableFilter').value;
        let data = await DB.getAll('reweight');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        const exportData = data.map((d, i) => ({
            'No': i + 1, 'RFID': d.rfid, 'Tgl Induksi': d.tglInduksi, 'Tgl Reweight': d.tanggal,
            'Eartag': d.eartag, 'Shipment': d.shipment, 'Berat': d.berat, 'PEN Induksi': d.penInduksi,
            'PEN Awal': d.penAwal, 'PEN Akhir': d.penAkhir, 'DOF': d.dof, 'ADG': d.adg,
            'Frame': d.frame, 'Vitamin': d.vitamin, 'Jenis Sapi': d.jenisSapi
        }));
        Utils.exportToExcel(exportData, `reweight_${Utils.todayStr()}.xlsx`, 'Reweight');
    }

    // --- Import Excel ---
    async function importExcel(file) {
        try {
            const rows = await Utils.readExcel(file);
            let count = 0;
            for (const row of rows) {
                const rfid = String(row['RFID'] || row['rfid'] || '').trim();
                if (!rfid) continue;
                const ind = await DB.get('induksi', rfid);
                const beratInd = ind ? ind.berat : (parseFloat(row['Berat Induksi']) || 0);
                const tanggal = row['Tgl Reweight'] || row['tanggal'] || Utils.todayStr();
                const tglInduksi = ind ? ind.tanggal : (row['Tgl Induksi'] || '');
                const dof = Utils.calculateDOF(tglInduksi, tanggal);
                const berat = parseFloat(row['Berat'] || row['berat']) || 0;
                const adg = Utils.calculateADG(beratInd, berat, dof);
                const record = {
                    rfid, tglInduksi, tanggal, eartag: ind ? ind.eartag : (row['Eartag'] || ''),
                    shipment: ind ? ind.shipment : (row['Shipment'] || ''), berat, beratInduksi: beratInd,
                    penInduksi: ind ? ind.pen : (row['PEN Induksi'] || ''),
                    penAwal: row['PEN Awal'] || row['penAwal'] || '', penAkhir: row['PEN Akhir'] || row['penAkhir'] || '',
                    dof, adg, frame: ind ? ind.frame : (row['Frame'] || ''),
                    vitamin: parseInt(row['Vitamin'] || row['vitamin']) || 1,
                    jenisSapi: ind ? ind.jenisSapi : (row['Jenis Sapi'] || '')
                };
                await DB.add('reweight', record);
                count++;
            }
            Utils.showToast(`${count} data reweight berhasil diimport`, 'success');
            DB.addLog('Reweight', `Imported ${count} records from Excel`);
            await refreshAll();
        } catch (err) {
            Utils.showToast('Gagal import: ' + err.message, 'error');
        }
    }

    function downloadTemplateFile() {
        Utils.downloadTemplate(
            ['RFID', 'Tgl Reweight', 'PEN Awal', 'PEN Akhir', 'Berat', 'Vitamin'],
            'template_reweight.xlsx'
        );
    }

    // --- Export summaries ---
    async function exportSummaryAwal() {
        const shipFilter = document.getElementById('rewSummaryAwalFilter').value;
        let data = await DB.getAll('reweight');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        const map = {};
        for (const d of data) {
            const pen = d.penAwal || '(Tanpa PEN)';
            if (!map[pen]) map[pen] = { count: 0, totalBerat: 0, totalAdg: 0, jenis: new Set() };
            map[pen].count++; map[pen].totalBerat += d.berat || 0; map[pen].totalAdg += d.adg || 0;
            if (d.jenisSapi) map[pen].jenis.add(d.jenisSapi);
        }
        const exp = Object.keys(map).sort().map(pen => {
            const p = map[pen];
            return { 'PEN Awal': pen, 'Jumlah': p.count, 'Total Berat': p.totalBerat, 'Avg Berat': (p.totalBerat / p.count).toFixed(1), 'Avg ADG': (p.totalAdg / p.count).toFixed(2), 'Jenis Sapi': [...p.jenis].join(', ') };
        });
        Utils.exportToExcel(exp, `summary_pen_awal_reweight_${Utils.todayStr()}.xlsx`, 'PEN Awal');
    }

    async function exportSummaryAkhir() {
        const shipFilter = document.getElementById('rewSummaryAkhirFilter').value;
        let data = await DB.getAll('reweight');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        const map = {};
        for (const d of data) {
            const pen = d.penAkhir || '(Tanpa PEN)';
            if (!map[pen]) map[pen] = { count: 0, totalBerat: 0, totalAdg: 0, jenis: new Set() };
            map[pen].count++; map[pen].totalBerat += d.berat || 0; map[pen].totalAdg += d.adg || 0;
            if (d.jenisSapi) map[pen].jenis.add(d.jenisSapi);
        }
        const exp = Object.keys(map).sort().map(pen => {
            const p = map[pen];
            return { 'PEN Akhir': pen, 'Jumlah': p.count, 'Total Berat': p.totalBerat, 'Avg Berat': (p.totalBerat / p.count).toFixed(1), 'Avg ADG': (p.totalAdg / p.count).toFixed(2), 'Jenis Sapi': [...p.jenis].join(', ') };
        });
        Utils.exportToExcel(exp, `summary_pen_akhir_reweight_${Utils.todayStr()}.xlsx`, 'PEN Akhir');
    }

    async function exportDetail() {
        const shipFilter = document.getElementById('rewDetailFilter').value;
        let data = await DB.getAll('reweight');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        const exp = data.map((d, i) => ({
            'No': i + 1, 'Shipment': d.shipment, 'RFID': d.rfid, 'Eartag': d.eartag,
            'Tgl Induksi': d.tglInduksi, 'Berat Ind.': d.beratInduksi, 'Tgl Reweight': d.tanggal,
            'Berat Rew.': d.berat, 'DOF Ind-Rew': d.dof, 'ADG Ind-Rew': d.adg, 'Jenis Sapi': d.jenisSapi
        }));
        Utils.exportToExcel(exp, `detail_reweight_${Utils.todayStr()}.xlsx`, 'Detail');
    }

    async function exportSummaryJenis() {
        const shipFilter = document.getElementById('rewSummaryJenisFilter').value;
        let data = await DB.getAll('reweight');
        if (shipFilter) data = data.filter(d => d.shipment === shipFilter);
        const map = {};
        for (const d of data) {
            const jenis = d.jenisSapi || '(Tidak diketahui)';
            if (!map[jenis]) map[jenis] = { count: 0, totalBerat: 0, totalAdg: 0, totalDof: 0 };
            map[jenis].count++; map[jenis].totalBerat += d.berat || 0; map[jenis].totalAdg += d.adg || 0; map[jenis].totalDof += d.dof || 0;
        }
        const exp = Object.keys(map).sort().map(j => {
            const m = map[j];
            return { 'Jenis Sapi': j, 'Jumlah': m.count, 'Total Berat': m.totalBerat, 'Avg Berat': (m.totalBerat / m.count).toFixed(1), 'Avg ADG': (m.totalAdg / m.count).toFixed(2), 'Avg DOF': (m.totalDof / m.count).toFixed(0) };
        });
        Utils.exportToExcel(exp, `summary_jenis_reweight_${Utils.todayStr()}.xlsx`, 'Summary Jenis');
    }

    // --- Check All ---
    function setupCheckAll() {
        const checkAll = document.getElementById('rewCheckAll');
        if (checkAll) {
            checkAll.addEventListener('change', () => {
                document.querySelectorAll('.rew-check').forEach(cb => cb.checked = checkAll.checked);
            });
        }
    }

    async function refreshAll() {
        await loadFilterDropdowns();
        await refreshTable();
        await refreshSummaryAwal();
        await refreshSummaryAkhir();
        await refreshDetail();
        await refreshSummaryJenis();
    }

    async function init() {
        setDefaultDate();
        setupCheckAll();
        await loadFilterDropdowns();
        await refreshAll();

        // RFID change triggers lookup
        document.getElementById('rewRfid').addEventListener('change', (e) => { if (e.target.value.trim()) lookupRfid(e.target.value.trim()); });
        // Weight / date change triggers DOF/ADG calc
        document.getElementById('rewBerat').addEventListener('input', calculateDofAdg);
        document.getElementById('rewTanggal').addEventListener('change', calculateDofAdg);

        document.getElementById('btnReweightInput').addEventListener('click', inputData);
        document.getElementById('btnReweightClear').addEventListener('click', clearForm);
        document.getElementById('btnRewDeleteSelected').addEventListener('click', deleteSelected);
        document.getElementById('btnRewExportExcel').addEventListener('click', exportExcel);
        document.getElementById('btnRewImportExcel').addEventListener('click', () => document.getElementById('rewImportFile').click());
        document.getElementById('rewImportFile').addEventListener('change', (e) => { if (e.target.files[0]) { importExcel(e.target.files[0]); e.target.value = ''; } });
        document.getElementById('btnRewDownloadTemplate').addEventListener('click', downloadTemplateFile);
        document.getElementById('btnRewSummaryAwalExport').addEventListener('click', exportSummaryAwal);
        document.getElementById('btnRewSummaryAkhirExport').addEventListener('click', exportSummaryAkhir);
        document.getElementById('btnRewDetailExport').addEventListener('click', exportDetail);
        document.getElementById('btnRewSummaryJenisExport').addEventListener('click', exportSummaryJenis);

        // Summary tab toggle
        document.getElementById('btnSummaryAwal').addEventListener('click', () => {
            document.getElementById('rewSummaryAwalSection').classList.remove('hidden');
            document.getElementById('rewSummaryAkhirSection').classList.add('hidden');
            document.getElementById('btnSummaryAwal').classList.add('active');
            document.getElementById('btnSummaryAkhir').classList.remove('active');
        });
        document.getElementById('btnSummaryAkhir').addEventListener('click', () => {
            document.getElementById('rewSummaryAkhirSection').classList.remove('hidden');
            document.getElementById('rewSummaryAwalSection').classList.add('hidden');
            document.getElementById('btnSummaryAkhir').classList.add('active');
            document.getElementById('btnSummaryAwal').classList.remove('active');
        });

        // Filter change handlers
        document.getElementById('rewTableFilter').addEventListener('change', refreshTable);
        document.getElementById('rewTableFilterPen').addEventListener('change', refreshTable);
        document.getElementById('rewSummaryAwalFilter').addEventListener('change', refreshSummaryAwal);
        document.getElementById('rewSummaryAkhirFilter').addEventListener('change', refreshSummaryAkhir);
        document.getElementById('rewDetailFilter').addEventListener('change', refreshDetail);
        document.getElementById('rewSummaryJenisFilter').addEventListener('change', refreshSummaryJenis);
    }

    return { init, refreshAll, editPenAkhir, lookupRfid };
})();
