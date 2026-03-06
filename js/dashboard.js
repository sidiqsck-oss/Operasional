/* ============================================
   DASHBOARD MODULE — Sales Dashboard
   ============================================ */
const Dashboard = (() => {

    async function refresh() {
        const filterMonth = document.getElementById('dashFilterMonth') ? document.getElementById('dashFilterMonth').value : '';
        const filterYear = document.getElementById('dashFilterYear') ? document.getElementById('dashFilterYear').value : '';

        const allInd = await DB.getAll('induksi');
        const allRew = await DB.getAll('reweight');
        const allSales = await DB.getAll('penjualan');
        const soldRfids = new Set(allSales.map(s => s.rfid));

        let filteredSales = allSales;
        let filteredInd = allInd;
        let filteredRew = allRew;

        if (filterMonth || filterYear) {
            // Helper to get matching date
            const isMatch = (dateStr) => {
                if (!dateStr) return false;
                const d = new Date(dateStr);
                if (filterYear && d.getFullYear() !== parseInt(filterYear)) return false;
                if (filterMonth && (d.getMonth() + 1) !== parseInt(filterMonth)) return false;
                return true;
            };

            filteredSales = allSales.filter(s => isMatch(s.tanggalJual));
            filteredInd = allInd.filter(i => isMatch(i.tanggal));
            filteredRew = allRew.filter(r => isMatch(r.tanggal));
        }

        // --- Stat Cards ---
        const sisaSapi = filteredInd.filter(d => !soldRfids.has(d.rfid)).length;
        document.getElementById('statSisaSapi').textContent = sisaSapi;

        // Avg ADG from reweight
        const rewWithAdg = filteredRew.filter(d => d.adg > 0);
        const avgAdg = rewWithAdg.length > 0 ? (rewWithAdg.reduce((s, d) => s + d.adg, 0) / rewWithAdg.length).toFixed(2) : '0';
        document.getElementById('statAvgADG').textContent = avgAdg;

        // Penjualan bulan ini
        const now = new Date();
        const thisMonth = filteredSales.filter(s => {
            if (!s.tanggalJual) return false;
            const d = new Date(s.tanggalJual);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        document.getElementById('statPenjBulan').textContent = thisMonth.length;

        // Total unique customers
        const customers = new Set(filteredSales.map(s => s.pembeli).filter(Boolean));
        document.getElementById('statCustomer').textContent = customers.size;

        // --- Sisa Sapi per Shipment per Jenis Sapi ---
        const sisaBody = document.getElementById('dashSisaSapiBody');
        const sisaMap = {};
        for (const ind of filteredInd) {
            if (soldRfids.has(ind.rfid)) continue;
            const key = `${ind.shipment || '-'}|${ind.jenisSapi || '-'}`;
            if (!sisaMap[key]) sisaMap[key] = { shipment: ind.shipment || '-', jenis: ind.jenisSapi || '-', count: 0, totalBerat: 0 };
            sisaMap[key].count++;
            sisaMap[key].totalBerat += ind.berat || 0;
        }
        const sisaArr = Object.values(sisaMap).sort((a, b) => a.shipment.localeCompare(b.shipment));
        sisaBody.innerHTML = sisaArr.length > 0 ? sisaArr.map(s => `<tr><td>${s.shipment}</td><td>${s.jenis}</td><td>${s.count}</td><td>${Utils.formatNumber(s.totalBerat)}</td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted">Tidak ada data</td></tr>';

        // --- Avg ADG per Shipment per Jenis ---
        const adgBody = document.getElementById('dashAvgADGBody');
        const adgMap = {};
        for (const r of filteredRew) {
            const key = `${r.shipment || '-'}|${r.jenisSapi || '-'}`;
            if (!adgMap[key]) adgMap[key] = { shipment: r.shipment || '-', jenis: r.jenisSapi || '-', count: 0, totalAdg: 0 };
            adgMap[key].count++;
            adgMap[key].totalAdg += r.adg || 0;
        }
        const adgArr = Object.values(adgMap).sort((a, b) => a.shipment.localeCompare(b.shipment));
        adgBody.innerHTML = adgArr.length > 0 ? adgArr.map(a => `<tr><td>${a.shipment}</td><td>${a.jenis}</td><td>${a.count}</td><td>${Utils.formatNumber(a.count ? a.totalAdg / a.count : 0, 2)}</td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted">Tidak ada data</td></tr>';

        // --- Penjualan per Bulan ---
        const penjBulBody = document.getElementById('dashPenjualanBulBody');
        const monthMap = {};
        for (const s of filteredSales) {
            if (!s.tanggalJual) continue;
            const d = new Date(s.tanggalJual);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) monthMap[key] = { count: 0, totalBerat: 0 };
            monthMap[key].count++;
            monthMap[key].totalBerat += s.berat || 0;
        }
        const months = Object.keys(monthMap).sort().reverse();
        penjBulBody.innerHTML = months.length > 0 ? months.map(m => `<tr><td>${m}</td><td>${monthMap[m].count}</td><td>${Utils.formatNumber(monthMap[m].totalBerat)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-center text-muted">Tidak ada data</td></tr>';

        // --- Performa Customer per Bulan ---
        const custBody = document.getElementById('dashCustomerBody');
        const custMap = {};
        for (const s of filteredSales) {
            if (!s.pembeli) continue;
            const d = s.tanggalJual ? new Date(s.tanggalJual) : null;
            const bulan = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '-';
            const key = `${s.pembeli}|${bulan}`;
            if (!custMap[key]) custMap[key] = { pembeli: s.pembeli, bulan, count: 0, totalBerat: 0 };
            custMap[key].count++;
            custMap[key].totalBerat += s.berat || 0;
        }
        const custArr = Object.values(custMap).sort((a, b) => a.pembeli.localeCompare(b.pembeli) || b.bulan.localeCompare(a.bulan));
        custBody.innerHTML = custArr.length > 0 ? custArr.map(c => `<tr><td>${c.pembeli}</td><td>${c.bulan}</td><td>${c.count}</td><td>${Utils.formatNumber(c.totalBerat)}</td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted">Tidak ada data</td></tr>';

        // --- Penjualan per Kondisi (Status Jual) ---
        const kondisiBody = document.getElementById('dashKondisiBody');
        if (kondisiBody) {
            const kondisiMap = {};
            for (const s of filteredSales) {
                const status = s.statusJual || '(Tanpa Status)';
                if (!kondisiMap[status]) kondisiMap[status] = { count: 0, totalBerat: 0 };
                kondisiMap[status].count++;
                kondisiMap[status].totalBerat += s.berat || 0;
            }
            const kondisiArr = Object.keys(kondisiMap).sort();
            kondisiBody.innerHTML = kondisiArr.length > 0 ? kondisiArr.map(k => `<tr><td>${k}</td><td>${kondisiMap[k].count}</td><td>${Utils.formatNumber(kondisiMap[k].totalBerat)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-center text-muted">Tidak ada data</td></tr>';
        }
    }

    function init() {
        // Setup filter listeners
        const filterMonth = document.getElementById('dashFilterMonth');
        const filterYear = document.getElementById('dashFilterYear');
        if (filterMonth) filterMonth.addEventListener('change', refresh);
        if (filterYear) filterYear.addEventListener('change', refresh);

        // Populate year filter
        if (filterYear) {
            const currentYear = new Date().getFullYear();
            filterYear.innerHTML = '<option value="">Semua Tahun</option>';
            for (let y = currentYear; y >= currentYear - 5; y--) {
                const opt = document.createElement('option');
                opt.value = y; opt.textContent = y;
                filterYear.appendChild(opt);
            }
        }

        refresh();
    }

    return { init, refresh };
})();
