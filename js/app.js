/* ============================================
   APP.JS — Main Application Entry Point
   ============================================ */
(async () => {
    // --- Initialize DB ---
    try {
        await DB.open();
        console.log('IndexedDB initialized');
    } catch (err) {
        console.error('DB init failed:', err);
        alert('Gagal membuka database. Pastikan browser mendukung IndexedDB.');
        return;
    }

    // --- Initialize Auth ---
    const savedUser = await Auth.init();

    // --- Page elements ---
    const pageLogin = document.getElementById('pageLogin');
    const pageMain = document.getElementById('pageMain');
    const loginError = document.getElementById('loginError');

    // --- Show/Hide login ---
    function showLogin() {
        pageLogin.classList.remove('hidden');
        pageMain.classList.add('hidden');
    }

    function showMain() {
        pageLogin.classList.add('hidden');
        pageMain.classList.remove('hidden');
    }

    // --- Login handler ---
    document.getElementById('btnLogin').addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!username || !password) { loginError.textContent = 'Username dan password harus diisi'; return; }
        const result = await Auth.login(username, password);
        if (result.success) {
            loginError.textContent = '';
            showMain();
            setupUserUI(result.user);
            initModules();
        } else {
            loginError.textContent = result.message;
        }
    });

    // Enter key login
    document.getElementById('loginPassword').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') document.getElementById('btnLogin').click();
    });
    document.getElementById('loginUsername').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') document.getElementById('loginPassword').focus();
    });

    // --- Logout ---
    document.getElementById('btnLogout').addEventListener('click', () => {
        Auth.logout();
        showLogin();
    });

    // --- Setup User UI (permissions) ---
    function setupUserUI(user) {
        document.getElementById('headerUser').textContent = `👤 ${user.username} (${user.role})`;

        // Tab visibility based on permissions
        const tabMap = {
            tabDashboard: 'dashboard',
            tabInduksi: 'induksi',
            tabReweight: 'reweight',
            tabPenjualan: 'penjualan',
            tabSettings: 'settings'
        };

        for (const [tabId, perm] of Object.entries(tabMap)) {
            const tab = document.getElementById(tabId);
            if (Auth.hasPermission(perm)) {
                tab.style.display = '';
            } else {
                tab.style.display = 'none';
            }
        }
    }

    // --- SPA Navigation ---
    const navTabs = document.querySelectorAll('.nav-tab');
    const pageSections = document.querySelectorAll('.page-section');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const pageId = tab.dataset.page;

            // Update active tab
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show active page
            pageSections.forEach(s => s.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');

            // Refresh module when navigating
            switch (pageId) {
                case 'pageDashboard': Dashboard.refresh(); break;
                case 'pageInduksi': Induksi.refreshAll(); break;
                case 'pageReweight': Reweight.refreshAll(); break;
                case 'pagePenjualan': Penjualan.refreshAll(); break;
            }
        });
    });

    // --- Custom Filter Select Scroll Logic ---
    // Makes filter dropdowns become a scrollable list when focused
    document.addEventListener('focusin', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('filter-select')) {
            if (e.target.options.length > 5) e.target.setAttribute('size', '6');
        }
    });
    document.addEventListener('focusout', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('filter-select')) {
            e.target.removeAttribute('size');
        }
    });
    document.addEventListener('change', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('filter-select')) {
            e.target.removeAttribute('size');
            e.target.blur();
        }
    });

    // --- Scale Data Display ---
    window.addEventListener('scale-data', (e) => {
        const weight = e.detail.weight;
        document.getElementById('weightValue').textContent = weight.toFixed(1);

        // Also fill active weight input
        const activeEl = document.activeElement;
        const indBerat = document.getElementById('indBerat');
        const rewBerat = document.getElementById('rewBerat');
        const penjBerat = document.getElementById('penjBerat');

        // Auto-fill the weight input of the active page
        const activeSection = document.querySelector('.page-section.active');
        if (activeSection) {
            const id = activeSection.id;
            if (id === 'pageInduksi') indBerat.value = weight.toFixed(1);
            else if (id === 'pageReweight') { rewBerat.value = weight.toFixed(1); rewBerat.dispatchEvent(new Event('input')); }
            else if (id === 'pagePenjualan') penjBerat.value = weight.toFixed(1);
        }
    });

    // --- Scanner Data ---
    window.addEventListener('scanner-data', (e) => {
        const rfid = e.detail.rfid;

        // Auto-fill RFID input of active page
        const activeSection = document.querySelector('.page-section.active');
        if (activeSection) {
            const id = activeSection.id;
            if (id === 'pageInduksi') {
                document.getElementById('indRfid').value = rfid;
            } else if (id === 'pageReweight') {
                document.getElementById('rewRfid').value = rfid;
                Reweight.lookupRfid(rfid);
            } else if (id === 'pagePenjualan') {
                document.getElementById('penjRfid').value = rfid;
                const penjRfid = document.getElementById('penjRfid');
                penjRfid.dispatchEvent(new Event('change'));
            }
        }
        Utils.showToast(`RFID: ${rfid}`, 'info');
    });

    // --- Serial buttons ---
    document.getElementById('btnConnectScanner').addEventListener('click', () => SerialManager.toggleScanner());
    document.getElementById('btnConnectScale').addEventListener('click', () => SerialManager.toggleScale());

    // --- Backup buttons ---
    document.getElementById('btnExportBackup').addEventListener('click', () => Backup.exportAll());
    document.getElementById('btnImportBackup').addEventListener('click', () => document.getElementById('backupImportFile').click());
    document.getElementById('backupImportFile').addEventListener('change', (e) => {
        if (e.target.files[0]) { Backup.importAll(e.target.files[0]); e.target.value = ''; }
    });

    // --- Supabase buttons ---
    document.getElementById('btnSyncUpload').addEventListener('click', () => SupabaseSync.upload());
    document.getElementById('btnSyncDownload').addEventListener('click', () => SupabaseSync.download());
    document.getElementById('btnSupabaseSetup').addEventListener('click', async () => {
        const urlSet = await DB.get('settings', 'supabaseUrl');
        const keySet = await DB.get('settings', 'supabaseKey');
        document.getElementById('supabaseUrl').value = urlSet ? urlSet.value : '';
        document.getElementById('supabaseKey').value = keySet ? keySet.value : '';
        Utils.openModal('modalSupabase');
    });
    document.getElementById('btnSaveSupabase').addEventListener('click', async () => {
        const url = document.getElementById('supabaseUrl').value.trim();
        const key = document.getElementById('supabaseKey').value.trim();
        if (!url || !key) { Utils.showToast('URL dan Key harus diisi', 'warning'); return; }
        await SupabaseSync.saveConfig(url, key);
        Utils.showToast('Konfigurasi Supabase disimpan', 'success');
        Utils.closeModal('modalSupabase');
    });
    document.getElementById('btnCloseSupabase').addEventListener('click', () => Utils.closeModal('modalSupabase'));

    // --- Master Data Modal (Add/Delete) ---
    document.querySelectorAll('.btn-add-master').forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.dataset.type;
            const labels = {
                shipment: 'Shipment', frame: 'Frame', kodeProperty: 'Kode Property',
                jenisSapi: 'Jenis Sapi', pembeli: 'Pembeli', statusJual: 'Status Jual'
            };
            document.getElementById('masterModalTitle').textContent = `Kelola ${labels[type] || type}`;
            document.getElementById('masterType').value = type;
            document.getElementById('masterValue').value = '';
            await refreshMasterList(type);
            Utils.openModal('modalMaster');
        });
    });

    document.getElementById('btnSaveMaster').addEventListener('click', async () => {
        const type = document.getElementById('masterType').value;
        const value = document.getElementById('masterValue').value.trim();
        if (!value) { Utils.showToast('Nilai harus diisi', 'warning'); return; }
        await DB.addMaster(type, value);
        Utils.showToast(`"${value}" ditambahkan`, 'success');
        document.getElementById('masterValue').value = '';
        await refreshMasterList(type);
        // Refresh all dropdowns
        await Induksi.loadDropdowns();
        await Penjualan.loadDropdowns();
    });
    document.getElementById('btnCloseMaster').addEventListener('click', () => Utils.closeModal('modalMaster'));

    async function refreshMasterList(type) {
        const values = await DB.getMasterByType(type);
        const tbody = document.getElementById('masterListBody');
        if (values.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }
        tbody.innerHTML = values.map(v => `<tr><td>${v}</td><td><button class="btn btn-sm btn-danger" onclick="deleteMaster('${type}', '${v}')">🗑️</button></td></tr>`).join('');
    }

    // Global function for delete master
    window.deleteMaster = async function (type, value) {
        if (!confirm(`Hapus "${value}"?`)) return;
        await DB.removeMaster(type, value);
        Utils.showToast(`"${value}" dihapus`, 'success');
        await refreshMasterList(type);
        await Induksi.loadDropdowns();
        await Penjualan.loadDropdowns();
    };

    // --- User Management Modal ---
    document.getElementById('btnOpenUserMgmt').addEventListener('click', async () => {
        if (!Auth.isAdmin()) { Utils.showToast('Hanya admin yang bisa mengelola user', 'warning'); return; }
        await refreshUserList();
        Utils.openModal('modalUserMgmt');
    });
    document.getElementById('btnCloseUserMgmt').addEventListener('click', () => Utils.closeModal('modalUserMgmt'));
    document.getElementById('btnAddUser').addEventListener('click', async () => {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;
        if (!username || !password) { Utils.showToast('Username dan password wajib diisi', 'warning'); return; }
        const permissions = {
            induksi: document.getElementById('permInduksi').checked,
            reweight: document.getElementById('permReweight').checked,
            penjualan: document.getElementById('permPenjualan').checked,
            dashboard: document.getElementById('permDashboard').checked,
            settings: document.getElementById('permSettings').checked
        };
        const result = await Auth.addUser(username, password, role, permissions);
        if (result.success) {
            Utils.showToast(`User "${username}" berhasil ditambahkan`, 'success');
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            await refreshUserList();
        } else {
            Utils.showToast(result.message, 'error');
        }
    });

    async function refreshUserList() {
        const users = await Auth.getAllUsers();
        const tbody = document.getElementById('userListBody');
        tbody.innerHTML = users.map(u => {
            const perms = u.permissions ? Object.entries(u.permissions).filter(([, v]) => v).map(([k]) => k).join(', ') : 'all';
            const isProtected = u.username === 'Sidiq23';
            return `<tr>
                <td>${u.username}</td><td>${u.role}</td><td>${perms}</td>
                <td>${isProtected ? '<span class="text-muted">Protected</span>' : `<button class="btn btn-sm btn-danger" onclick="deleteUserFromList('${u.username}')">🗑️</button>`}</td>
            </tr>`;
        }).join('');
    }

    window.deleteUserFromList = async function (username) {
        const result = await Auth.deleteUser(username);
        if (result.success) {
            Utils.showToast(`User "${username}" dihapus`, 'success');
            await refreshUserList();
        } else {
            Utils.showToast(result.message, 'error');
        }
    };

    // --- Log Modal ---
    document.getElementById('btnViewLog').addEventListener('click', async () => {
        const logs = await DB.getAll('logs');
        const tbody = document.getElementById('logTableBody');
        const sorted = logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        tbody.innerHTML = sorted.slice(0, 100).map(l => `<tr><td>${Utils.formatDate(l.timestamp)} ${new Date(l.timestamp).toLocaleTimeString('id-ID')}</td><td>${l.action}</td><td>${l.detail}</td></tr>`).join('');
        Utils.openModal('modalLog');
    });
    document.getElementById('btnCloseLog').addEventListener('click', () => Utils.closeModal('modalLog'));

    // --- Initialize Modules ---
    async function initModules() {
        await SupabaseSync.initUI();
        await Induksi.init();
        await Reweight.init();
        await Penjualan.init();
        Dashboard.init();
    }

    // --- Restore session ---
    if (savedUser) {
        showMain();
        setupUserUI(savedUser);
        initModules();
    } else {
        showLogin();
    }

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.warn('Service Worker registration failed:', err));
    }
})();
