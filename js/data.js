// ===== Data Management (localStorage + Cloud sync) =====
const Data = {
    // --- Items ---
    getItems() {
        const stored = localStorage.getItem('quote_items');
        if (stored) return JSON.parse(stored);
        // Initialize with defaults
        this.saveItems(DEFAULT_ITEMS);
        return DEFAULT_ITEMS;
    },

    saveItems(items) {
        localStorage.setItem('quote_items', JSON.stringify(items));
    },

    addItem(item) {
        const items = this.getItems();
        item.id = 'X' + Date.now().toString(36).toUpperCase();
        items.push(item);
        this.saveItems(items);
        return item;
    },

    updateItem(id, updates) {
        const items = this.getItems();
        const idx = items.findIndex(i => i.id === id);
        if (idx >= 0) {
            items[idx] = { ...items[idx], ...updates };
            this.saveItems(items);
        }
    },

    deleteItem(id) {
        let items = this.getItems();
        items = items.filter(i => i.id !== id);
        this.saveItems(items);
    },

    getItemsByCategory() {
        const items = this.getItems();
        const grouped = {};
        for (const item of items) {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        }
        // Sort by category order
        const sorted = {};
        for (const cat of CATEGORY_ORDER) {
            if (grouped[cat]) sorted[cat] = grouped[cat];
        }
        // Add any remaining categories
        for (const cat of Object.keys(grouped)) {
            if (!sorted[cat]) sorted[cat] = grouped[cat];
        }
        return sorted;
    },

    // --- Clients ---
    getClients() {
        const stored = localStorage.getItem('quote_clients');
        return stored ? JSON.parse(stored) : [];
    },

    saveClients(clients) {
        localStorage.setItem('quote_clients', JSON.stringify(clients));
    },

    addClient(client) {
        const clients = this.getClients();
        client.id = 'C' + Date.now().toString(36).toUpperCase();
        clients.push(client);
        this.saveClients(clients);
        return client;
    },

    updateClient(id, updates) {
        const clients = this.getClients();
        const idx = clients.findIndex(c => c.id === id);
        if (idx >= 0) {
            clients[idx] = { ...clients[idx], ...updates };
            this.saveClients(clients);
        }
    },

    deleteClient(id) {
        let clients = this.getClients();
        clients = clients.filter(c => c.id !== id);
        this.saveClients(clients);
    },

    // --- Quotes History ---
    getQuotes() {
        const stored = localStorage.getItem('quote_history');
        return stored ? JSON.parse(stored) : [];
    },

    saveQuote(quote) {
        const quotes = this.getQuotes();
        quote.quoteId = this.generateQuoteId();
        quote.createdAt = new Date().toISOString();
        quotes.unshift(quote); // newest first
        // Keep last 100
        if (quotes.length > 100) quotes.length = 100;
        localStorage.setItem('quote_history', JSON.stringify(quotes));
        return quote;
    },

    generateQuoteId() {
        const now = new Date();
        const ymd = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');
        const quotes = this.getQuotes();
        const todayCount = quotes.filter(q => q.quoteId && q.quoteId.includes(ymd)).length;
        return `${CONFIG.QUOTE_PREFIX}${ymd}-${(todayCount + 1).toString().padStart(3, '0')}`;
    },

    // --- Settings ---
    getSetting(key, defaultVal = '') {
        return localStorage.getItem('quote_' + key) || defaultVal;
    },

    setSetting(key, value) {
        localStorage.setItem('quote_' + key, value);
    },

    // --- Cloud Sync ---
    async syncToCloud(action, data) {
        const url = CONFIG.API_URL || Data.getSetting('api_url');
        if (!url) return { error: 'API URL not set' };

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ ...data, action, game: 'quote' }),
            });
            return await resp.json();
        } catch (e) {
            console.error('Cloud sync error:', e);
            return { error: e.message };
        }
    },

    async fetchFromCloud(action, params = {}) {
        const url = CONFIG.API_URL || Data.getSetting('api_url');
        if (!url) return { error: 'API URL not set' };

        try {
            const qs = new URLSearchParams({ action, game: 'quote', ...params }).toString();
            const resp = await fetch(`${url}?${qs}`);
            return await resp.json();
        } catch (e) {
            console.error('Cloud fetch error:', e);
            return { error: e.message };
        }
    }
};
