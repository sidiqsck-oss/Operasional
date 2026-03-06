/* ============================================
   PENJUALAN MODULE — Cattle Sales
   ============================================ */
const Penjualan = (() => {
    let cart = []; // Keranjang penjualan sementara

    function setDefaultDate() {
        const el = document.getElementById('penjTanggal');
        if (el && !el.value) el.value = Utils.todayStr();
    }

    // --- Load dropdowns ---
    async function loadDropdowns() {
        const pembeliValues = await DB.getMasterByType('pembeli');
        const pembeliSel = document.getElementById('penjPembeli');
        if (pembeliSel) {
            const cur = pembeliSel.value;
            pembeliSel.innerHTML = '<option value="">-- Pilih Pembeli --</option>';
            pembeliValues.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v; opt.textContent = v;
                pembeliSel.appendChild(opt);
            });
            if (cur) pembeliSel.value = cur;
        }

        const statusValues = await DB.getMasterByType('statusJual');
        const statusSel = document.getElementById('penjStatusJual');
        if (statusSel) {
            const cur = statusSel.value;
            statusSel.innerHTML = '<option value="">-- Pilih Status --</option>';
            statusValues.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v; opt.textContent = v;
                statusSel.appendChild(opt);
            });
            if (cur) statusSel.value = cur;
        }

        await loadFilterDropdowns();
    }

    async function loadFilterDropdowns() {
        const allInd = await DB.getAll('induksi');
        const shipments = [...new Set(allInd.map(d => d.shipment).filter(Boolean))].sort();
        const filterIds = ['penjTarikFilter', 'penjTarikDetailFilter', 'penjTarikNoPenjFilter'];
        for (const fid of filterIds) {
            const sel = document.getElementById(fid);
            if (!sel) continue;
            const cur = sel.value;
            sel.innerHTML = '<option value="">Semua Shipment</option>';
            shipments.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s; opt.textContent = s;
                sel.appendChild(opt);
            });
            if (cur) sel.value = cur;
        }

        // Pembeli filter
        const pembeliValues = await DB.getMasterByType('pembeli');
        const pembeliFilter = document.getElementById('penjHistoryFilterPembeli');
        if (pembeliFilter) {
            const cur = pembeliFilter.value;
            pembeliFilter.innerHTML = '<option value="">Semua Pembeli</option>';
            pembeliValues.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v; opt.textContent = v;
                pembeliFilter.appendChild(opt);
            });
            if (cur) pembeliFilter.value = cur;
        }

        // No Penjualan filter
        const allSales = await DB.getAll('penjualan');
        const noList = [...new Set(allSales.map(s => s.noPenjualan).filter(Boolean))].sort();
        const noFilterIds = ['penjHistoryFilterNo', 'penjTarikDetailFilterNo', 'penjTarikNoPenjFilterNo'];
        for (const fid of noFilterIds) {
            const sel = document.getElementById(fid);
            if (!sel) continue;
            const cur = sel.value;
            sel.innerHTML = '<option value="">Semua No Penjualan</option>';
            noList.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n; opt.textContent = n;
                sel.appendChild(opt);
            });
            if (cur) sel.value = cur;
        }
    }

    // --- Auto generate No Penjualan ---
    async function generateNo() {
        const no = await Utils.generateNoPenjualan();
        document.getElementById('penjNoPenjualan').value = no;
    }

    // --- RFID Lookup ---
    async function lookupRfid(rfid) {
        const ind = await DB.get('induksi', rfid);
        if (!ind) {
            Utils.showToast('RFID tidak ditemukan di data induksi', 'warning');
            return;
        }

        // Check if already sold
        const allSales = await DB.getAll('penjualan');
        const sold = allSales.find(s => s.rfid === rfid);
        if (sold) {
            Utils.showToast(`⚠️ Sapi sudah terjual!\nTanggal: ${Utils.formatDate(sold.tanggalJual)}\nPembeli: ${sold.pembeli}\nBerat Jual: ${sold.berat} Kg`, 'warning');
            document.getElementById('penjRfid').value = '';
            return;
        }

        document.getElementById('penjEartag').value = ind.eartag || '';
        document.getElementById('penjShipment').value = ind.shipment || '';
    }

    // --- Add to Cart ---
    function addToCart() {
        const noPenjualan = document.getElementById('penjNoPenjualan').value.trim();
        const pembeli = document.getElementById('penjPembeli').value;
        const rfid = document.getElementById('penjRfid').value.trim();
        const tanggalJual = document.getElementById('penjTanggal').value;
        const eartag = document.getElementById('penjEartag').value;
        const shipment = document.getElementById('penjShipment').value;
        const berat = parseFloat(document.getElementById('penjBerat').value) || 0;
        const statusJual = document.getElementById('penjStatusJual').value;

        if (!rfid) { Utils.showToast('RFID harus diisi', 'warning'); return; }
        if (!pembeli) { Utils.showToast('Pembeli harus dipilih', 'warning'); return; }
        if (!noPenjualan) { Utils.showToast('No Penjualan harus diisi', 'warning'); return; }

        // Check duplicate in cart
        if (cart.find(c => c.rfid === rfid)) {
            Utils.showToast('RFID sudah ada di keranjang', 'warning');
            return;
        }

        cart.push({ noPenjualan, pembeli, rfid, tanggalJual, eartag, shipment, berat, statusJual });
        refreshCart();
        clearInputFields();
    }

    function clearInputFields() {
        document.getElementById('penjRfid').value = '';
        document.getElementById('penjEartag').value = '';
        document.getElementById('penjShipment').value = '';
        document.getElementById('penjBerat').value = '';
        document.getElementById('penjRfid').focus();
    }

    function clearForm() {
        clearInputFields();
        document.getElementById('penjNoPenjualan').value = '';
        document.getElementById('penjPembeli').value = '';
        document.getElementById('penjStatusJual').value = '';
    }

    // --- Cart Display ---
    function refreshCart() {
        const tbody = document.getElementById('penjCartBody');
        const countEl = document.getElementById('cartCount');
        const totalEl = document.getElementById('cartTotal');

        countEl.textContent = cart.length;
        totalEl.textContent = Utils.formatNumber(cart.reduce((sum, c) => sum + c.berat, 0));

        if (cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Keranjang kosong</td></tr>';
            return;
        }

        tbody.innerHTML = cart.map((c, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${c.rfid}</td>
                <td>${c.eartag || '-'}</td>
                <td>${c.shipment || '-'}</td>
                <td>${Utils.formatNumber(c.berat)}</td>
                <td>${c.pembeli}</td>
                <td>${Utils.formatDate(c.tanggalJual)}</td>
                <td>${c.statusJual || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="Penjualan.editCartItem(${i})" title="Edit">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="Penjualan.removeFromCart(${i})" title="Hapus">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    function editCartItem(index) {
        const item = cart[index];
        document.getElementById('penjNoPenjualan').value = item.noPenjualan || '';
        document.getElementById('penjPembeli').value = item.pembeli || '';
        document.getElementById('penjRfid').value = item.rfid || '';
        document.getElementById('penjTanggal').value = item.tanggalJual || '';
        document.getElementById('penjEartag').value = item.eartag || '';
        document.getElementById('penjShipment').value = item.shipment || '';
        document.getElementById('penjBerat').value = item.berat || '';
        document.getElementById('penjStatusJual').value = item.statusJual || '';

        removeFromCart(index);
        document.getElementById('penjRfid').focus();
        Utils.showToast('Data dikembalikan ke form untuk diedit', 'info');
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        refreshCart();
    }

    // --- Save All Cart to DB ---
    async function saveAll() {
        if (cart.length === 0) { Utils.showToast('Keranjang kosong', 'warning'); return; }
        if (!confirm(`Simpan ${cart.length} data penjualan?`)) return;
        for (const item of cart) {
            await DB.add('penjualan', item);
        }
        DB.addLog('Penjualan', `Saved ${cart.length} sales: No=${cart[0].noPenjualan}`);
        Utils.showToast(`${cart.length} data penjualan berhasil disimpan`, 'success');
        cart = [];
        refreshCart();
        await generateNo();
        await refreshAll();
    }

    // --- History ---
    async function refreshHistory() {
        const tbody = document.getElementById('penjHistoryBody');
        const pembeliFilter = document.getElementById('penjHistoryFilterPembeli').value;
        const noFilter = document.getElementById('penjHistoryFilterNo').value;
        let data = await DB.getAll('penjualan');

        if (pembeliFilter) data = data.filter(d => d.pembeli === pembeliFilter);
        if (noFilter) data = data.filter(d => d.noPenjualan === noFilter);

        data.sort((a, b) => (b.tanggalJual || '').localeCompare(a.tanggalJual || ''));

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Belum ada riwayat</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((d, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${d.noPenjualan || '-'}</td>
                <td>${d.rfid}</td>
                <td>${d.eartag || '-'}</td>
                <td>${d.shipment || '-'}</td>
                <td>${Utils.formatNumber(d.berat)}</td>
                <td>${d.pembeli || '-'}</td>
                <td>${Utils.formatDate(d.tanggalJual)}</td>
                <td>${d.statusJual || '-'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="Penjualan.deleteRecord(${d.id})">🗑️</button></td>
            </tr>
        `).join('');
    }

    async function deleteRecord(id) {
        if (!confirm('Hapus data penjualan ini?')) return;
        await DB.remove('penjualan', id);
        DB.addLog('Penjualan', `Deleted sale ID=${id}`);
        Utils.showToast('Data dihapus', 'success');
        await refreshAll();
    }

    // --- Tarik Data: Laporan Total by Shipment ---
    async function refreshTarikData() {
        const tbody = document.getElementById('tarikDataBody');
        const shipFilter = document.getElementById('penjTarikFilter').value;

        const allInd = await DB.getAll('induksi');
        const allRew = await DB.getAll('reweight');
        const allSales = await DB.getAll('penjualan');

        const shipments = [...new Set(allInd.map(d => d.shipment).filter(Boolean))].sort();

        let filtered = shipFilter ? shipments.filter(s => s === shipFilter) : shipments;

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(ship => {
            const indData = allInd.filter(d => d.shipment === ship);
            const rewData = allRew.filter(d => d.shipment === ship);
            const salesData = allSales.filter(d => d.shipment === ship);
            const jmlInd = indData.length;
            const totalBeratInd = indData.reduce((s, d) => s + (d.berat || 0), 0);
            const jmlRew = rewData.length;
            const totalBeratRew = rewData.reduce((s, d) => s + (d.berat || 0), 0);
            const jmlSold = salesData.length;
            const totalBeratSold = salesData.reduce((s, d) => s + (d.berat || 0), 0);
            const sisa = jmlInd - jmlSold;
            return `<tr>
                <td>${ship}</td><td>${jmlInd}</td><td>${Utils.formatNumber(totalBeratInd)}</td>
                <td>${jmlRew}</td><td>${Utils.formatNumber(totalBeratRew)}</td>
                <td>${jmlSold}</td><td>${Utils.formatNumber(totalBeratSold)}</td><td>${sisa}</td>
            </tr>`;
        }).join('');
    }

    // --- Tarik Data: By No Penjualan & Shipment ---
    async function refreshTarikNoPenj() {
        const tbody = document.getElementById('tarikNoPenjBody');
        const shipFilter = document.getElementById('penjTarikNoPenjFilter').value;
        const noFilter = document.getElementById('penjTarikNoPenjFilterNo').value;

        let allSales = await DB.getAll('penjualan');
        if (shipFilter) allSales = allSales.filter(d => d.shipment === shipFilter);
        if (noFilter) allSales = allSales.filter(d => d.noPenjualan === noFilter);

        // Group by noPenjualan
        const map = {};
        for (const s of allSales) {
            const key = s.noPenjualan || '(Tanpa No)';
            if (!map[key]) map[key] = { pembeli: s.pembeli, tanggal: s.tanggalJual, count: 0, totalBerat: 0, shipments: new Set() };
            map[key].count++;
            map[key].totalBerat += s.berat || 0;
            if (s.shipment) map[key].shipments.add(s.shipment);
        }

        const keys = Object.keys(map).sort();
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }
        tbody.innerHTML = keys.map(no => {
            const m = map[no];
            return `<tr><td>${no}</td><td>${m.pembeli || '-'}</td><td>${[...m.shipments].join(', ')}</td><td>${m.count}</td><td>${Utils.formatNumber(m.totalBerat)}</td></tr>`;
        }).join('');
    }

    // --- Tarik Data Detail: Laporan per Eartag (26 kolom) ---
    async function refreshTarikDataDetail() {
        const tbody = document.getElementById('tarikDataDetailBody');
        const shipFilter = document.getElementById('penjTarikDetailFilter').value;
        const noFilter = document.getElementById('penjTarikDetailFilterNo').value;

        let allSales = await DB.getAll('penjualan');
        if (shipFilter) allSales = allSales.filter(d => d.shipment === shipFilter);
        if (noFilter) allSales = allSales.filter(d => d.noPenjualan === noFilter);

        if (allSales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="26" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }

        const allInd = await DB.getAll('induksi');
        const allRew = await DB.getAll('reweight');
        const indMap = {};
        allInd.forEach(d => indMap[d.rfid] = d);
        const rewMap = {};
        allRew.forEach(d => { rewMap[d.rfid] = d; }); // takes latest

        let totBeratInd = 0, totBeratRew = 0, totBeratJual = 0;
        let sumDofIR = 0, sumDofIJ = 0, sumDofRJ = 0;
        let sumAdgIR = 0, sumAdgIJ = 0, sumAdgRJ = 0, sumSelisih = 0;
        let cntDofIR = 0, cntDofIJ = 0, cntDofRJ = 0;
        let cntAdgIR = 0, cntAdgIJ = 0, cntAdgRJ = 0, cntSelisih = 0;

        const rows = allSales.map((sale, i) => {
            const ind = indMap[sale.rfid] || {};
            const rew = rewMap[sale.rfid] || {};

            const beratInd = ind.berat || 0;
            const beratRew = rew.berat || 0;
            const beratJual = sale.berat || 0;
            totBeratInd += beratInd;
            totBeratRew += beratRew;
            totBeratJual += beratJual;

            const dofIR = ind.tanggal && rew.tanggal ? Utils.calculateDOF(ind.tanggal, rew.tanggal) : '';
            const dofIJ = ind.tanggal && sale.tanggalJual ? Utils.calculateDOF(ind.tanggal, sale.tanggalJual) : '';
            const dofRJ = rew.tanggal && sale.tanggalJual ? Utils.calculateDOF(rew.tanggal, sale.tanggalJual) : '';

            const adgIR = dofIR ? Utils.calculateADG(beratInd, beratRew, dofIR) : '';
            const adgIJ = dofIJ ? Utils.calculateADG(beratInd, beratJual, dofIJ) : '';
            const adgRJ = dofRJ ? Utils.calculateADG(beratRew, beratJual, dofRJ) : '';
            const selisih = (adgRJ !== '' && adgIJ !== '') ? parseFloat((adgRJ - adgIJ).toFixed(2)) : '';

            if (dofIR !== '') { sumDofIR += dofIR; cntDofIR++; }
            if (dofIJ !== '') { sumDofIJ += dofIJ; cntDofIJ++; }
            if (dofRJ !== '') { sumDofRJ += dofRJ; cntDofRJ++; }
            if (adgIR !== '') { sumAdgIR += adgIR; cntAdgIR++; }
            if (adgIJ !== '') { sumAdgIJ += adgIJ; cntAdgIJ++; }
            if (adgRJ !== '') { sumAdgRJ += adgRJ; cntAdgRJ++; }
            if (selisih !== '') { sumSelisih += selisih; cntSelisih++; }

            return `<tr>
                <td>${i + 1}</td><td>${sale.rfid}</td><td>${sale.eartag || ind.eartag || '-'}</td>
                <td>${sale.shipment || '-'}</td><td>${ind.jenisSapi || '-'}</td>
                <td>${Utils.formatDate(ind.tanggal)}</td><td>${Utils.formatNumber(beratInd)}</td>
                <td>${Utils.formatDate(rew.tanggal)}</td><td>${Utils.formatNumber(beratRew)}</td>
                <td>${Utils.formatDate(sale.tanggalJual)}</td><td>${Utils.formatNumber(beratJual)}</td>
                <td>${dofIR !== '' ? dofIR : '-'}</td><td>${dofIJ !== '' ? dofIJ : '-'}</td><td>${dofRJ !== '' ? dofRJ : '-'}</td>
                <td>${adgIR !== '' ? Utils.formatNumber(adgIR, 2) : '-'}</td>
                <td>${adgIJ !== '' ? Utils.formatNumber(adgIJ, 2) : '-'}</td>
                <td>${adgRJ !== '' ? Utils.formatNumber(adgRJ, 2) : '-'}</td>
                <td>${selisih !== '' ? Utils.formatNumber(selisih, 2) : '-'}</td>
                <td>${ind.frame || '-'}</td><td>${ind.gigi || '-'}</td><td>${ind.kodeProperty || '-'}</td>
                <td>${ind.pen || '-'}</td><td>${rew.penAkhir || '-'}</td>
                <td>${sale.pembeli || '-'}</td><td>${sale.noPenjualan || '-'}</td><td>${sale.statusJual || '-'}</td>
            </tr>`;
        });

        // Footer row with totals and averages
        const footer = `<tr style="font-weight:700;background:var(--bg-hover)">
            <td colspan="6" class="text-center">TOTAL / RATA-RATA</td>
            <td>${Utils.formatNumber(totBeratInd)}</td>
            <td></td><td>${Utils.formatNumber(totBeratRew)}</td>
            <td></td><td>${Utils.formatNumber(totBeratJual)}</td>
            <td>${cntDofIR ? Utils.formatNumber(sumDofIR / cntDofIR, 0) : '-'}</td>
            <td>${cntDofIJ ? Utils.formatNumber(sumDofIJ / cntDofIJ, 0) : '-'}</td>
            <td>${cntDofRJ ? Utils.formatNumber(sumDofRJ / cntDofRJ, 0) : '-'}</td>
            <td>${cntAdgIR ? Utils.formatNumber(sumAdgIR / cntAdgIR, 2) : '-'}</td>
            <td>${cntAdgIJ ? Utils.formatNumber(sumAdgIJ / cntAdgIJ, 2) : '-'}</td>
            <td>${cntAdgRJ ? Utils.formatNumber(sumAdgRJ / cntAdgRJ, 2) : '-'}</td>
            <td>${cntSelisih ? Utils.formatNumber(sumSelisih / cntSelisih, 2) : '-'}</td>
            <td colspan="8"></td>
        </tr>`;

        tbody.innerHTML = rows.join('') + footer;
    }

    // --- Summary per Jenis Sapi for Penjualan ---
    async function refreshSummaryJenis() {
        // This is handled in dashboard
    }

    // --- Export functions ---
    async function exportHistory() {
        const pembeliFilter = document.getElementById('penjHistoryFilterPembeli').value;
        const noFilter = document.getElementById('penjHistoryFilterNo').value;
        let data = await DB.getAll('penjualan');
        if (pembeliFilter) data = data.filter(d => d.pembeli === pembeliFilter);
        if (noFilter) data = data.filter(d => d.noPenjualan === noFilter);
        const exp = data.map((d, i) => ({
            'No': i + 1, 'No Penjualan': d.noPenjualan, 'RFID': d.rfid, 'Eartag': d.eartag,
            'Shipment': d.shipment, 'Berat': d.berat, 'Pembeli': d.pembeli,
            'Tanggal': d.tanggalJual, 'Status Jual': d.statusJual
        }));
        Utils.exportToExcel(exp, `riwayat_penjualan_${Utils.todayStr()}.xlsx`, 'Riwayat');
    }

    async function exportTarikData() {
        const shipFilter = document.getElementById('penjTarikFilter').value;
        const allInd = await DB.getAll('induksi');
        const allRew = await DB.getAll('reweight');
        const allSales = await DB.getAll('penjualan');
        let shipments = [...new Set(allInd.map(d => d.shipment).filter(Boolean))].sort();
        if (shipFilter) shipments = shipments.filter(s => s === shipFilter);
        const exp = shipments.map(ship => {
            const indData = allInd.filter(d => d.shipment === ship);
            const rewData = allRew.filter(d => d.shipment === ship);
            const salesData = allSales.filter(d => d.shipment === ship);
            return {
                'Shipment': ship, 'Jml Induksi': indData.length,
                'Total Berat Ind.': indData.reduce((s, d) => s + (d.berat || 0), 0),
                'Jml Reweight': rewData.length,
                'Total Berat Rew.': rewData.reduce((s, d) => s + (d.berat || 0), 0),
                'Jml Terjual': salesData.length,
                'Total Berat Jual': salesData.reduce((s, d) => s + (d.berat || 0), 0),
                'Sisa Sapi': indData.length - salesData.length
            };
        });
        Utils.exportToExcel(exp, `laporan_total_shipment_${Utils.todayStr()}.xlsx`, 'Total Shipment');
    }

    async function exportTarikDetail() {
        const shipFilter = document.getElementById('penjTarikDetailFilter').value;
        const noFilter = document.getElementById('penjTarikDetailFilterNo').value;
        let allSales = await DB.getAll('penjualan');
        if (shipFilter) allSales = allSales.filter(d => d.shipment === shipFilter);
        if (noFilter) allSales = allSales.filter(d => d.noPenjualan === noFilter);
        const allInd = await DB.getAll('induksi');
        const allRew = await DB.getAll('reweight');
        const indMap = {}; allInd.forEach(d => indMap[d.rfid] = d);
        const rewMap = {}; allRew.forEach(d => rewMap[d.rfid] = d);

        const exp = allSales.map((sale, i) => {
            const ind = indMap[sale.rfid] || {};
            const rew = rewMap[sale.rfid] || {};
            const dofIR = ind.tanggal && rew.tanggal ? Utils.calculateDOF(ind.tanggal, rew.tanggal) : '';
            const dofIJ = ind.tanggal && sale.tanggalJual ? Utils.calculateDOF(ind.tanggal, sale.tanggalJual) : '';
            const dofRJ = rew.tanggal && sale.tanggalJual ? Utils.calculateDOF(rew.tanggal, sale.tanggalJual) : '';
            const adgIR = dofIR ? Utils.calculateADG(ind.berat, rew.berat, dofIR) : '';
            const adgIJ = dofIJ ? Utils.calculateADG(ind.berat, sale.berat, dofIJ) : '';
            const adgRJ = dofRJ ? Utils.calculateADG(rew.berat, sale.berat, dofRJ) : '';
            return {
                'No': i + 1, 'RFID': sale.rfid, 'Eartag': sale.eartag || ind.eartag,
                'Shipment': sale.shipment, 'Jenis Sapi': ind.jenisSapi,
                'Tgl Induksi': ind.tanggal, 'Berat Ind.': ind.berat,
                'Tgl Reweight': rew.tanggal, 'Berat Rew.': rew.berat,
                'Tgl Jual': sale.tanggalJual, 'Berat Jual': sale.berat,
                'DOF Ind-Rew': dofIR, 'DOF Ind-Jual': dofIJ, 'DOF Rew-Jual': dofRJ,
                'ADG Ind-Rew': adgIR, 'ADG Ind-Jual': adgIJ, 'ADG Rew-Jual': adgRJ,
                'Selisih ADG': adgRJ !== '' && adgIJ !== '' ? parseFloat((adgRJ - adgIJ).toFixed(2)) : '',
                'Frame': ind.frame, 'Gigi': ind.gigi, 'Property': ind.kodeProperty,
                'Pen Induksi': ind.pen, 'Pen Akhir Reweight': rew.penAkhir,
                'Pembeli': sale.pembeli, 'No Penjualan': sale.noPenjualan, 'Status Jual': sale.statusJual
            };
        });
        Utils.exportToExcel(exp, `detail_penjualan_${Utils.todayStr()}.xlsx`, 'Detail');
    }

    // --- Export Staff Excel (with extra DOF/ADG columns) ---
    async function exportStaffExcel() {
        const shipFilter = document.getElementById('penjTarikNoPenjFilter').value;
        const noFilter = document.getElementById('penjTarikNoPenjFilterNo').value;
        let allSales = await DB.getAll('penjualan');
        if (shipFilter) allSales = allSales.filter(d => d.shipment === shipFilter);
        if (noFilter) allSales = allSales.filter(d => d.noPenjualan === noFilter);
        const allInd = await DB.getAll('induksi');
        const allRew = await DB.getAll('reweight');
        const indMap = {}; allInd.forEach(d => indMap[d.rfid] = d);
        const rewMap = {}; allRew.forEach(d => rewMap[d.rfid] = d);

        const exp = allSales.map((sale, i) => {
            const ind = indMap[sale.rfid] || {};
            const rew = rewMap[sale.rfid] || {};
            const dofInd = ind.tanggal && sale.tanggalJual ? Utils.calculateDOF(ind.tanggal, sale.tanggalJual) : '';
            const adgInd = dofInd ? Utils.calculateADG(ind.berat, sale.berat, dofInd) : '';
            const dofRew = rew.tanggal && sale.tanggalJual ? Utils.calculateDOF(rew.tanggal, sale.tanggalJual) : '';
            const adgRew = dofRew ? Utils.calculateADG(rew.berat, sale.berat, dofRew) : '';
            return {
                'No': i + 1, 'No Penjualan': sale.noPenjualan, 'RFID': sale.rfid,
                'Eartag': sale.eartag || ind.eartag, 'Shipment': sale.shipment,
                'Pembeli': sale.pembeli, 'Tgl Jual': sale.tanggalJual,
                'Berat Jual': sale.berat, 'Status Jual': sale.statusJual,
                'DOF Induksi': dofInd, 'ADG Induksi': adgInd,
                'DOF Reweight': dofRew, 'ADG Reweight': adgRew
            };
        });
        Utils.exportToExcel(exp, `staff_penjualan_${Utils.todayStr()}.xlsx`, 'Staff Export');
    }

    // --- Export PDF Invoice ---
    async function exportPdfInvoice() {
        if (cart.length === 0) { Utils.showToast('Keranjang kosong', 'warning'); return; }

        const { jsPDF } = window.jspdf;
        const printSettings = await loadPrintSettings();

        const doc = new jsPDF({
            orientation: printSettings.orientation || 'portrait',
            unit: 'mm',
            format: printSettings.pageSize || 'a4'
        });

        let y = 15;

        // Logo
        if (printSettings.logoData) {
            try { doc.addImage(printSettings.logoData, 'PNG', 14, y, 25, 25); } catch (e) { /* ignore */ }
            y += 5;
        }

        // Header
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(printSettings.headerText || 'Feedlot Management', printSettings.logoData ? 45 : 14, y + 5);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(printSettings.subHeader || 'Invoice Penjualan Sapi', printSettings.logoData ? 45 : 14, y + 12);

        y += (printSettings.logoData ? 30 : 20);

        // Info
        doc.setFontSize(10);
        doc.text(`No Penjualan: ${cart[0]?.noPenjualan || '-'}`, 14, y);
        doc.text(`Pembeli: ${cart[0]?.pembeli || '-'}`, 14, y + 5);
        doc.text(`Tanggal: ${Utils.formatDate(cart[0]?.tanggalJual)}`, 14, y + 10);
        y += 18;

        // Table
        const tableData = cart.map((c, i) => [i + 1, c.rfid, c.eartag || '-', c.shipment || '-', Utils.formatNumber(c.berat), c.statusJual || '-']);
        const totalBerat = cart.reduce((s, c) => s + c.berat, 0);
        tableData.push(['', '', '', 'TOTAL', Utils.formatNumber(totalBerat), '']);

        doc.autoTable({
            startY: y,
            head: [['No', 'RFID', 'Eartag', 'Shipment', 'Berat (Kg)', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 52, 96] },
            styles: { fontSize: 9 }
        });

        // Footer
        if (printSettings.footerText) {
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(9);
            doc.text(printSettings.footerText, 14, pageHeight - 10);
        }

        doc.save(`invoice_${cart[0]?.noPenjualan || 'penjualan'}_${Utils.todayStr()}.pdf`);
        Utils.showToast('Invoice PDF berhasil dibuat', 'success');
    }

    // --- Print Settings ---
    async function loadPrintSettings() {
        const settings = {};
        const keys = ['printHeaderText', 'printSubHeader', 'printPageSize', 'printOrientation', 'printFooterText', 'printLogoData'];
        for (const key of keys) {
            const s = await DB.get('settings', key);
            if (s) settings[key.replace('print', '').replace(/^./, c => c.toLowerCase())] = s.value;
        }
        return settings;
    }

    async function savePrintSettings() {
        await DB.add('settings', { key: 'printHeaderText', value: document.getElementById('printHeaderText').value });
        await DB.add('settings', { key: 'printSubHeader', value: document.getElementById('printSubHeader').value });
        await DB.add('settings', { key: 'printPageSize', value: document.getElementById('printPageSize').value });
        await DB.add('settings', { key: 'printOrientation', value: document.getElementById('printOrientation').value });
        await DB.add('settings', { key: 'printFooterText', value: document.getElementById('printFooterText').value });

        // Logo file
        const logoInput = document.getElementById('printLogo');
        if (logoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                await DB.add('settings', { key: 'printLogoData', value: e.target.result });
            };
            reader.readAsDataURL(logoInput.files[0]);
        }
        Utils.showToast('Pengaturan cetak disimpan', 'success');
        Utils.closeModal('modalPrintSettings');
    }

    async function loadPrintSettingsUI() {
        const keys = { printHeaderText: 'Feedlot Management', printSubHeader: 'Invoice Penjualan Sapi', printPageSize: 'a4', printOrientation: 'portrait', printFooterText: '' };
        for (const [key, def] of Object.entries(keys)) {
            const s = await DB.get('settings', key);
            const el = document.getElementById(key);
            if (el) el.value = s ? s.value : def;
        }
    }

    // --- Refresh All ---
    async function refreshAll() {
        await loadFilterDropdowns();
        await refreshHistory();
        await refreshTarikData();
        await refreshTarikNoPenj();
        await refreshTarikDataDetail();
    }

    // --- Init ---
    async function init() {
        setDefaultDate();
        await loadDropdowns();
        await generateNo();
        await refreshAll();

        // RFID lookup
        document.getElementById('penjRfid').addEventListener('change', (e) => { if (e.target.value.trim()) lookupRfid(e.target.value.trim()); });

        document.getElementById('btnPenjAddToCart').addEventListener('click', addToCart);
        document.getElementById('btnPenjClear').addEventListener('click', clearForm);
        document.getElementById('btnPenjSaveAll').addEventListener('click', saveAll);
        document.getElementById('btnPenjExportPdf').addEventListener('click', exportPdfInvoice);
        document.getElementById('btnPenjExportStaffExcel').addEventListener('click', exportStaffExcel);
        document.getElementById('btnPenjHistoryExport').addEventListener('click', exportHistory);
        document.getElementById('btnTarikExport').addEventListener('click', exportTarikData);
        document.getElementById('btnTarikDetailExport').addEventListener('click', exportTarikDetail);
        document.getElementById('btnTarikNoPenjExport').addEventListener('click', exportStaffExcel);

        // Print settings
        document.getElementById('btnPrintSettings').addEventListener('click', async () => {
            await loadPrintSettingsUI();
            Utils.openModal('modalPrintSettings');
        });
        document.getElementById('btnSavePrintSettings').addEventListener('click', savePrintSettings);
        document.getElementById('btnClosePrintSettings').addEventListener('click', () => Utils.closeModal('modalPrintSettings'));

        // Filter change handlers
        document.getElementById('penjHistoryFilterPembeli').addEventListener('change', refreshHistory);
        document.getElementById('penjHistoryFilterNo').addEventListener('change', refreshHistory);
        document.getElementById('penjTarikFilter').addEventListener('change', refreshTarikData);
        document.getElementById('penjTarikNoPenjFilter').addEventListener('change', refreshTarikNoPenj);
        document.getElementById('penjTarikNoPenjFilterNo').addEventListener('change', refreshTarikNoPenj);
        document.getElementById('penjTarikDetailFilter').addEventListener('change', refreshTarikDataDetail);
        document.getElementById('penjTarikDetailFilterNo').addEventListener('change', refreshTarikDataDetail);
    }

    return {
        init, loadDropdowns, refreshAll, removeFromCart, deleteRecord,
        refreshHistory, refreshTarikData, refreshTarikDataDetail, editCartItem
    };
})();
