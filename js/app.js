// ===== Main Application =====
const App = {
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.showSection('dashboard');
        this.loadDashboard();
    },

    showSection(name) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById('sec-' + name);
        if (sec) sec.classList.add('active');

        // Update nav active state
        document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === name);
        });

        // Initialize section content
        switch (name) {
            case 'dashboard': this.loadDashboard(); break;
            case 'new-quote': Quote.goStep(Quote.currentStep); break;
            case 'items-mgmt': ItemsMgmt.render(); break;
            case 'clients-mgmt': ClientsMgmt.render(); break;
            case 'history': this.loadHistory(); break;
        }
    },

    loadDashboard() {
        const quotes = Data.getQuotes();
        const container = document.getElementById('recent-quotes');
        if (quotes.length === 0) {
            container.innerHTML = '<p class="empty-state">尚無報價紀錄</p>';
            return;
        }

        let html = `<table class="data-table"><thead><tr>
            <th>編號</th><th>客戶</th><th>金額</th><th>日期</th><th>操作</th>
        </tr></thead><tbody>`;

        for (const q of quotes.slice(0, 10)) {
            html += `<tr>
                <td>${q.quoteId || '-'}</td>
                <td>${q.info?.clientName || '-'}</td>
                <td>$${(q.total || 0).toLocaleString()}</td>
                <td>${q.createdAt ? new Date(q.createdAt).toLocaleDateString('zh-TW') : '-'}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="App.loadQuote('${q.quoteId}')">載入</button>
                </td>
            </tr>`;
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    loadHistory() {
        const quotes = Data.getQuotes();
        const container = document.getElementById('history-container');
        if (quotes.length === 0) {
            container.innerHTML = '<p class="empty-state">尚無報價紀錄</p>';
            return;
        }

        let html = `<table class="data-table"><thead><tr>
            <th>編號</th><th>客戶</th><th>地點</th><th>活動日期</th><th>金額</th><th>建立時間</th><th>操作</th>
        </tr></thead><tbody>`;

        for (const q of quotes) {
            html += `<tr>
                <td>${q.quoteId || '-'}</td>
                <td>${q.info?.clientName || '-'}</td>
                <td>${q.info?.location || '-'}</td>
                <td>${q.info?.eventDate || '-'}</td>
                <td>$${(q.total || 0).toLocaleString()}</td>
                <td>${q.createdAt ? new Date(q.createdAt).toLocaleDateString('zh-TW') : '-'}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="App.loadQuote('${q.quoteId}')">載入</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteQuote('${q.quoteId}')">刪除</button>
                </td>
            </tr>`;
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    loadQuote(quoteId) {
        const quotes = Data.getQuotes();
        const q = quotes.find(x => x.quoteId === quoteId);
        if (!q) return;

        // Populate step 1
        const info = q.info || {};
        document.getElementById('q-client-name').value = info.clientName || '';
        document.getElementById('q-contact').value = info.contact || '';
        document.getElementById('q-email').value = info.email || '';
        document.getElementById('q-phone').value = info.phone || '';
        document.getElementById('q-event-date').value = info.eventDate || '';
        document.getElementById('q-location').value = info.location || '';
        document.getElementById('q-event-period').value = info.period || '全天';
        document.getElementById('q-headcount').value = info.headcount || '';
        document.getElementById('q-tax-id').value = info.taxId || '';
        document.getElementById('q-valid-date').value = info.validDate || '';
        document.getElementById('q-notes').value = info.notes || '';

        // Load items
        Quote.selectedItems = (q.items || []).map(i => ({ ...i }));

        this.showSection('new-quote');
        Quote.goStep(1);
        Toast.show(`已載入報價單 ${quoteId}`);
    },

    deleteQuote(quoteId) {
        if (!confirm(`確定刪除報價單 ${quoteId}？`)) return;
        let quotes = Data.getQuotes();
        quotes = quotes.filter(q => q.quoteId !== quoteId);
        localStorage.setItem('quote_history', JSON.stringify(quotes));
        this.loadHistory();
        Toast.show('已刪除', 'success');
    }
};

// ===== Items Management =====
const ItemsMgmt = {
    render() {
        const grouped = Data.getItemsByCategory();
        const container = document.getElementById('items-table-container');

        let html = `<table class="data-table"><thead><tr>
            <th>類別</th><th>品項名稱</th><th>單位</th><th>單價</th><th>類型</th><th>操作</th>
        </tr></thead><tbody>`;

        for (const [cat, items] of Object.entries(grouped)) {
            for (const item of items) {
                html += `<tr>
                    <td>${item.category}</td>
                    <td>${item.name}</td>
                    <td>${item.unit}</td>
                    <td>$${item.unitPrice.toLocaleString()}</td>
                    <td>${item.isStandard ? '⭐ 標配' : '選配'}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-secondary" onclick="ItemsMgmt.showEditDialog('${item.id}')">編輯</button>
                        <button class="btn btn-sm btn-danger" onclick="ItemsMgmt.deleteItem('${item.id}')">刪除</button>
                    </td>
                </tr>`;
            }
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    showAddDialog() {
        Modal.open('新增品項', `
            <div class="input-group"><label>類別</label><input type="text" id="mi-category" placeholder="例：活動關卡" list="cat-list">
                <datalist id="cat-list">${CATEGORY_ORDER.map(c => `<option value="${c}">`).join('')}</datalist></div>
            <div class="input-group"><label>品項名稱</label><input type="text" id="mi-name"></div>
            <div class="input-group"><label>單位</label><input type="text" id="mi-unit" value="式"></div>
            <div class="input-group"><label>單價</label><input type="number" id="mi-price" value="0"></div>
            <div class="input-group"><label>類型</label><select id="mi-standard"><option value="false">選配</option><option value="true">標配</option></select></div>
            <div class="input-group"><label>說明</label><input type="text" id="mi-desc" placeholder="選填"></div>
        `, `<button class="btn btn-primary" onclick="ItemsMgmt.saveNew()">儲存</button>`);
    },

    saveNew() {
        const item = {
            category: document.getElementById('mi-category').value.trim(),
            name: document.getElementById('mi-name').value.trim(),
            unit: document.getElementById('mi-unit').value.trim() || '式',
            unitPrice: parseInt(document.getElementById('mi-price').value) || 0,
            isStandard: document.getElementById('mi-standard').value === 'true',
            description: document.getElementById('mi-desc').value.trim(),
        };
        if (!item.category || !item.name) { Toast.show('請填寫類別和名稱', 'error'); return; }
        Data.addItem(item);
        Modal.close();
        this.render();
        Toast.show('品項已新增', 'success');
    },

    showEditDialog(id) {
        const items = Data.getItems();
        const item = items.find(i => i.id === id);
        if (!item) return;

        Modal.open('編輯品項', `
            <div class="input-group"><label>類別</label><input type="text" id="mi-category" value="${item.category}" list="cat-list">
                <datalist id="cat-list">${CATEGORY_ORDER.map(c => `<option value="${c}">`).join('')}</datalist></div>
            <div class="input-group"><label>品項名稱</label><input type="text" id="mi-name" value="${item.name}"></div>
            <div class="input-group"><label>單位</label><input type="text" id="mi-unit" value="${item.unit}"></div>
            <div class="input-group"><label>單價</label><input type="number" id="mi-price" value="${item.unitPrice}"></div>
            <div class="input-group"><label>類型</label><select id="mi-standard"><option value="false" ${!item.isStandard ? 'selected' : ''}>選配</option><option value="true" ${item.isStandard ? 'selected' : ''}>標配</option></select></div>
            <div class="input-group"><label>說明</label><input type="text" id="mi-desc" value="${item.description || ''}"></div>
        `, `<button class="btn btn-primary" onclick="ItemsMgmt.saveEdit('${id}')">儲存</button>`);
    },

    saveEdit(id) {
        const updates = {
            category: document.getElementById('mi-category').value.trim(),
            name: document.getElementById('mi-name').value.trim(),
            unit: document.getElementById('mi-unit').value.trim(),
            unitPrice: parseInt(document.getElementById('mi-price').value) || 0,
            isStandard: document.getElementById('mi-standard').value === 'true',
            description: document.getElementById('mi-desc').value.trim(),
        };
        Data.updateItem(id, updates);
        Modal.close();
        this.render();
        Toast.show('品項已更新', 'success');
    },

    deleteItem(id) {
        if (!confirm('確定刪除此品項？')) return;
        Data.deleteItem(id);
        this.render();
        Toast.show('品項已刪除', 'success');
    }
};

// ===== Clients Management =====
const ClientsMgmt = {
    render() {
        const clients = Data.getClients();
        const container = document.getElementById('clients-table-container');

        if (clients.length === 0) {
            container.innerHTML = '<p class="empty-state">尚無客戶資料，點擊「+ 新增客戶」開始</p>';
            return;
        }

        let html = `<table class="data-table"><thead><tr>
            <th>客戶名稱</th><th>聯絡人</th><th>Email</th><th>電話</th><th>統編</th><th>操作</th>
        </tr></thead><tbody>`;

        for (const c of clients) {
            html += `<tr>
                <td>${c.clientName || ''}</td>
                <td>${c.contact || ''}</td>
                <td>${c.email || ''}</td>
                <td>${c.phone || ''}</td>
                <td>${c.taxId || ''}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="ClientsMgmt.useClient('${c.id}')">選用</button>
                    <button class="btn btn-sm btn-secondary" onclick="ClientsMgmt.showEditDialog('${c.id}')">編輯</button>
                    <button class="btn btn-sm btn-danger" onclick="ClientsMgmt.deleteClient('${c.id}')">刪除</button>
                </td>
            </tr>`;
        }
        html += '</tbody></table>';
        container.innerHTML = html;

        // Update datalist for quote form
        const dl = document.getElementById('client-list');
        if (dl) dl.innerHTML = clients.map(c => `<option value="${c.clientName}">`).join('');
    },

    showAddDialog() {
        Modal.open('新增客戶', `
            <div class="input-group"><label>客戶名稱</label><input type="text" id="mc-name"></div>
            <div class="input-group"><label>聯絡人</label><input type="text" id="mc-contact"></div>
            <div class="input-group"><label>Email</label><input type="email" id="mc-email"></div>
            <div class="input-group"><label>電話</label><input type="tel" id="mc-phone"></div>
            <div class="input-group"><label>統一編號</label><input type="text" id="mc-taxid" maxlength="8"></div>
            <div class="input-group"><label>地址</label><input type="text" id="mc-address"></div>
        `, `<button class="btn btn-primary" onclick="ClientsMgmt.saveNew()">儲存</button>`);
    },

    saveNew() {
        const client = {
            clientName: document.getElementById('mc-name').value.trim(),
            contact: document.getElementById('mc-contact').value.trim(),
            email: document.getElementById('mc-email').value.trim(),
            phone: document.getElementById('mc-phone').value.trim(),
            taxId: document.getElementById('mc-taxid').value.trim(),
            address: document.getElementById('mc-address').value.trim(),
        };
        if (!client.clientName) { Toast.show('請填寫客戶名稱', 'error'); return; }
        Data.addClient(client);
        Modal.close();
        this.render();
        Toast.show('客戶已新增', 'success');
    },

    showEditDialog(id) {
        const clients = Data.getClients();
        const c = clients.find(x => x.id === id);
        if (!c) return;

        Modal.open('編輯客戶', `
            <div class="input-group"><label>客戶名稱</label><input type="text" id="mc-name" value="${c.clientName || ''}"></div>
            <div class="input-group"><label>聯絡人</label><input type="text" id="mc-contact" value="${c.contact || ''}"></div>
            <div class="input-group"><label>Email</label><input type="email" id="mc-email" value="${c.email || ''}"></div>
            <div class="input-group"><label>電話</label><input type="tel" id="mc-phone" value="${c.phone || ''}"></div>
            <div class="input-group"><label>統一編號</label><input type="text" id="mc-taxid" value="${c.taxId || ''}" maxlength="8"></div>
            <div class="input-group"><label>地址</label><input type="text" id="mc-address" value="${c.address || ''}"></div>
        `, `<button class="btn btn-primary" onclick="ClientsMgmt.saveEdit('${id}')">儲存</button>`);
    },

    saveEdit(id) {
        const updates = {
            clientName: document.getElementById('mc-name').value.trim(),
            contact: document.getElementById('mc-contact').value.trim(),
            email: document.getElementById('mc-email').value.trim(),
            phone: document.getElementById('mc-phone').value.trim(),
            taxId: document.getElementById('mc-taxid').value.trim(),
            address: document.getElementById('mc-address').value.trim(),
        };
        Data.updateClient(id, updates);
        Modal.close();
        this.render();
        Toast.show('客戶已更新', 'success');
    },

    useClient(id) {
        const clients = Data.getClients();
        const c = clients.find(x => x.id === id);
        if (!c) return;

        document.getElementById('q-client-name').value = c.clientName || '';
        document.getElementById('q-contact').value = c.contact || '';
        document.getElementById('q-email').value = c.email || '';
        document.getElementById('q-phone').value = c.phone || '';
        document.getElementById('q-tax-id').value = c.taxId || '';

        App.showSection('new-quote');
        Quote.goStep(1);
        Toast.show(`已帶入客戶: ${c.clientName}`);
    },

    deleteClient(id) {
        if (!confirm('確定刪除此客戶？')) return;
        Data.deleteClient(id);
        this.render();
        Toast.show('客戶已刪除', 'success');
    }
};

// ===== Modal =====
const Modal = {
    open(title, bodyHtml, footerHtml = '') {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-footer').innerHTML = footerHtml;
        document.getElementById('modal-overlay').classList.add('active');
    },
    close() {
        document.getElementById('modal-overlay').classList.remove('active');
    }
};

// ===== Toast =====
const Toast = {
    show(msg, type = 'success') {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.className = 'toast show ' + type;
        clearTimeout(this._timer);
        this._timer = setTimeout(() => { el.className = 'toast'; }, 3000);
    }
};
