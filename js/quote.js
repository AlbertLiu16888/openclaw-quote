// ===== Quote Builder =====
const Quote = {
    currentStep: 1,
    selectedItems: [], // { ...item, qty, customPrice }

    goStep(step) {
        if (step === 2 && this.currentStep === 1) {
            // Validate step 1
            const name = document.getElementById('q-client-name').value.trim();
            const date = document.getElementById('q-event-date').value;
            const loc = document.getElementById('q-location').value.trim();
            if (!name || !date || !loc) {
                Toast.show('請填寫客戶名稱、活動日期和地點', 'error');
                return;
            }
            this.renderItemsSelector();
        }
        if (step === 3) {
            this.renderPreview();
        }

        this.currentStep = step;
        document.querySelectorAll('.quote-step').forEach(el => el.classList.remove('active'));
        document.getElementById(`quote-step-${step}`).classList.add('active');

        document.querySelectorAll('.steps-bar .step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove('active', 'done');
            if (s === step) el.classList.add('active');
            else if (s < step) el.classList.add('done');
        });

        window.scrollTo(0, 0);
    },

    renderItemsSelector() {
        const container = document.getElementById('items-selector');
        const grouped = Data.getItemsByCategory();
        let html = '';

        for (const [cat, items] of Object.entries(grouped)) {
            const isStandard = items[0]?.isStandard;
            html += `<div class="item-category">
                <div class="item-category-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <span>${isStandard ? '⭐ ' : ''}${cat}</span>
                    <span>${items.length} 項</span>
                </div>
                <div class="item-category-body">`;

            for (const item of items) {
                const existing = this.selectedItems.find(s => s.id === item.id);
                const checked = existing ? 'checked' : '';
                const qty = existing ? existing.qty : 1;
                const price = existing ? existing.customPrice : item.unitPrice;

                html += `<div class="item-row ${checked ? 'checked' : ''}" id="row-${item.id}">
                    <input type="checkbox" ${checked}
                        onchange="Quote.toggleItem('${item.id}', this.checked)"
                        id="chk-${item.id}">
                    <label for="chk-${item.id}" style="cursor:pointer">${item.name}</label>
                    <input type="number" class="item-qty" value="${qty}" min="1"
                        onchange="Quote.updateItemQty('${item.id}', this.value)"
                        ${!checked ? 'disabled' : ''} id="qty-${item.id}">
                    <span style="font-size:11px;color:#888">${item.unit}</span>
                    <input type="number" class="item-unit-price" value="${price}"
                        onchange="Quote.updateItemPrice('${item.id}', this.value)"
                        ${!checked ? 'disabled' : ''} id="price-${item.id}">
                    <span class="item-total" id="total-${item.id}">
                        ${checked ? '$' + (qty * price).toLocaleString() : '-'}
                    </span>
                </div>`;
            }
            html += `</div></div>`;
        }

        container.innerHTML = html;
        this.updateRunningTotal();
    },

    toggleItem(id, checked) {
        const row = document.getElementById(`row-${id}`);
        const qtyInput = document.getElementById(`qty-${id}`);
        const priceInput = document.getElementById(`price-${id}`);

        if (checked) {
            row.classList.add('checked');
            qtyInput.disabled = false;
            priceInput.disabled = false;
            const items = Data.getItems();
            const item = items.find(i => i.id === id);
            if (item) {
                const qty = parseInt(qtyInput.value) || 1;
                const price = parseInt(priceInput.value) || item.unitPrice;
                this.selectedItems.push({ ...item, qty, customPrice: price });
            }
        } else {
            row.classList.remove('checked');
            qtyInput.disabled = true;
            priceInput.disabled = true;
            this.selectedItems = this.selectedItems.filter(s => s.id !== id);
        }
        this.updateItemTotal(id);
        this.updateRunningTotal();
    },

    updateItemQty(id, val) {
        const item = this.selectedItems.find(s => s.id === id);
        if (item) {
            item.qty = parseInt(val) || 1;
            this.updateItemTotal(id);
            this.updateRunningTotal();
        }
    },

    updateItemPrice(id, val) {
        const item = this.selectedItems.find(s => s.id === id);
        if (item) {
            item.customPrice = parseInt(val) || 0;
            this.updateItemTotal(id);
            this.updateRunningTotal();
        }
    },

    updateItemTotal(id) {
        const totalEl = document.getElementById(`total-${id}`);
        const item = this.selectedItems.find(s => s.id === id);
        if (item && totalEl) {
            totalEl.textContent = '$' + (item.qty * item.customPrice).toLocaleString();
        } else if (totalEl) {
            totalEl.textContent = '-';
        }
    },

    addCustomItem() {
        const cat = document.getElementById('custom-category').value.trim() || '其他';
        const name = document.getElementById('custom-name').value.trim();
        const unit = document.getElementById('custom-unit').value.trim() || '式';
        const price = parseInt(document.getElementById('custom-price').value) || 0;
        const qty = parseInt(document.getElementById('custom-qty').value) || 1;

        if (!name) { Toast.show('請輸入品名', 'error'); return; }

        const item = Data.addItem({
            category: cat, name, unit, unitPrice: price, isStandard: false, description: '自訂品項'
        });

        this.selectedItems.push({ ...item, qty, customPrice: price });

        // Clear inputs
        document.getElementById('custom-name').value = '';
        document.getElementById('custom-price').value = '';
        document.getElementById('custom-qty').value = '1';

        Toast.show(`已加入: ${name}`);
        this.renderItemsSelector();
    },

    getSubtotal() {
        return this.selectedItems.reduce((sum, i) => sum + (i.qty * i.customPrice), 0);
    },

    updateRunningTotal() {
        const subtotal = this.getSubtotal();
        const tax = Math.round(subtotal * CONFIG.TAX_RATE);
        const total = subtotal + tax;

        const el = (id) => document.getElementById(id);
        if (el('running-subtotal')) el('running-subtotal').textContent = '$' + subtotal.toLocaleString();
        if (el('running-tax')) el('running-tax').textContent = '$' + tax.toLocaleString();
        if (el('running-total')) el('running-total').textContent = '$' + total.toLocaleString();
    },

    // ===== Preview Generation =====
    getClientInfo() {
        return {
            clientName: document.getElementById('q-client-name').value.trim(),
            contact: document.getElementById('q-contact').value.trim(),
            email: document.getElementById('q-email').value.trim(),
            phone: document.getElementById('q-phone').value.trim(),
            eventDate: document.getElementById('q-event-date').value,
            location: document.getElementById('q-location').value.trim(),
            period: document.getElementById('q-event-period').value,
            headcount: document.getElementById('q-headcount').value,
            taxId: document.getElementById('q-tax-id').value.trim(),
            validDate: document.getElementById('q-valid-date').value,
            notes: document.getElementById('q-notes').value.trim(),
        };
    },

    renderPreview() {
        const info = this.getClientInfo();
        const quoteId = Data.generateQuoteId();
        const today = new Date();
        const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

        const formatDate = (d) => {
            if (!d) return '-';
            const dt = new Date(d + 'T00:00:00');
            return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
        };

        const subtotal = this.getSubtotal();
        const tax = Math.round(subtotal * CONFIG.TAX_RATE);
        const total = subtotal + tax;
        const deposit = Math.round(total * CONFIG.DEPOSIT_RATIO);
        const balance = total - deposit;

        // Group items by category
        const grouped = {};
        for (const item of this.selectedItems) {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        }

        // Build table rows
        let tableRows = '';
        let rowNum = 0;
        for (const cat of CATEGORY_ORDER) {
            if (!grouped[cat]) continue;
            tableRows += `<tr class="cat-row"><td colspan="5">${cat}</td></tr>`;
            for (const item of grouped[cat]) {
                rowNum++;
                const lineTotal = item.qty * item.customPrice;
                tableRows += `<tr>
                    <td>${item.name}</td>
                    <td style="text-align:center">${item.qty}</td>
                    <td style="text-align:center">${item.unit}</td>
                    <td>$${item.customPrice.toLocaleString()}</td>
                    <td>$${lineTotal.toLocaleString()}</td>
                </tr>`;
            }
        }
        // Add any remaining categories
        for (const cat of Object.keys(grouped)) {
            if (CATEGORY_ORDER.includes(cat)) continue;
            tableRows += `<tr class="cat-row"><td colspan="5">${cat}</td></tr>`;
            for (const item of grouped[cat]) {
                const lineTotal = item.qty * item.customPrice;
                tableRows += `<tr>
                    <td>${item.name}</td>
                    <td style="text-align:center">${item.qty}</td>
                    <td style="text-align:center">${item.unit}</td>
                    <td>$${item.customPrice.toLocaleString()}</td>
                    <td>$${lineTotal.toLocaleString()}</td>
                </tr>`;
            }
        }

        const html = `
            <div class="qp-header">
                <div class="qp-company">
                    <h1>${CONFIG.COMPANY.name}</h1>
                    <p>${CONFIG.COMPANY.nameEn}</p>
                    ${CONFIG.COMPANY.phone ? `<p>TEL: ${CONFIG.COMPANY.phone}</p>` : ''}
                    ${CONFIG.COMPANY.email ? `<p>Email: ${CONFIG.COMPANY.email}</p>` : ''}
                </div>
                <div class="qp-meta">
                    <div class="quote-number">${quoteId}</div>
                    <p>報價日期：${todayStr}</p>
                    <p>有效期限：${formatDate(info.validDate)}</p>
                </div>
            </div>

            <div class="qp-client-info">
                <div><span class="label">客戶名稱：</span><span class="value">${info.clientName}</span></div>
                <div><span class="label">活動日期：</span><span class="value">${formatDate(info.eventDate)} (${info.period})</span></div>
                <div><span class="label">聯絡人：</span><span class="value">${info.contact || '-'}</span></div>
                <div><span class="label">活動地點：</span><span class="value">${info.location}</span></div>
                <div><span class="label">Email：</span><span class="value">${info.email || '-'}</span></div>
                <div><span class="label">預估人數：</span><span class="value">${info.headcount ? info.headcount + ' 人' : '-'}</span></div>
                <div><span class="label">電話：</span><span class="value">${info.phone || '-'}</span></div>
                <div><span class="label">統一編號：</span><span class="value">${info.taxId || '-'}</span></div>
            </div>

            <table class="qp-table">
                <thead>
                    <tr>
                        <th style="width:40%">品項名稱</th>
                        <th style="width:10%;text-align:center">數量</th>
                        <th style="width:10%;text-align:center">單位</th>
                        <th style="width:20%">單價</th>
                        <th style="width:20%">小計</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <div class="qp-summary">
                <div class="qp-summary-table">
                    <div class="row"><span>未稅小計</span><span>$${subtotal.toLocaleString()}</span></div>
                    <div class="row"><span>營業稅 (5%)</span><span>$${tax.toLocaleString()}</span></div>
                    <div class="row total"><span>含稅總計</span><span>$${total.toLocaleString()}</span></div>
                </div>
            </div>

            <div class="qp-payment">
                <h4>付款方式</h4>
                <div class="qp-payment-grid">
                    <div>訂金 (${Math.round(CONFIG.DEPOSIT_RATIO * 100)}%)：$${deposit.toLocaleString()}</div>
                    <div>確認訂單時支付</div>
                    <div>尾款 (${Math.round((1 - CONFIG.DEPOSIT_RATIO) * 100)}%)：$${balance.toLocaleString()}</div>
                    <div>活動結束後 14 個工作天內支付</div>
                </div>
            </div>

            <div class="qp-terms">
                <h4>注意事項</h4>
                <ul>
                    <li>本報價單有效期限至 ${formatDate(info.validDate)}，逾期需重新報價。</li>
                    <li>確認訂單後請支付訂金，始完成訂單預約。</li>
                    <li>若已支付訂金，因不可抗力或臨時異動取消活動，將評估已產出之成本酌收作業費。</li>
                    <li>設計物相關素材請依團隊排程時間提供，避免額外修改費用。</li>
                    ${info.notes ? `<li>${info.notes}</li>` : ''}
                </ul>
            </div>

            <div class="qp-footer">
                <p>${CONFIG.COMPANY.name} ${CONFIG.COMPANY.nameEn}</p>
                ${CONFIG.COMPANY.address ? `<p>${CONFIG.COMPANY.address}</p>` : ''}
            </div>
        `;

        document.getElementById('quote-preview').innerHTML = html;

        // Store current quote data for saving
        this._currentQuoteData = {
            quoteId, info, items: [...this.selectedItems],
            subtotal, tax, total, deposit, balance,
            createdAt: new Date().toISOString()
        };
    },

    // ===== Export Functions =====
    printPDF() {
        window.print();
    },

    async saveToDrive() {
        if (!this._currentQuoteData) { Toast.show('請先預覽報價單', 'error'); return; }

        // Save to local history
        Data.saveQuote(this._currentQuoteData);
        Toast.show('報價單已儲存到本地紀錄', 'success');

        // Try cloud save
        const result = await Data.syncToCloud('saveQuote', this._currentQuoteData);
        if (result.success) {
            Toast.show('已同步到雲端！', 'success');
            if (result.pdfUrl) {
                window.open(result.pdfUrl, '_blank');
            }
        } else if (result.error) {
            Toast.show('雲端同步失敗（已存本地）: ' + result.error, 'error');
        }
    },

    async sendEmail() {
        if (!this._currentQuoteData) { Toast.show('請先預覽報價單', 'error'); return; }
        const email = this._currentQuoteData.info.email;
        if (!email) {
            Toast.show('請先填寫客戶 Email', 'error');
            this.goStep(1);
            return;
        }

        // Use mailto as fallback, or cloud function
        const subject = encodeURIComponent(`報價單 ${this._currentQuoteData.quoteId} - ${CONFIG.COMPANY.name}`);
        const body = encodeURIComponent(
            `${this._currentQuoteData.info.clientName} 您好，\n\n` +
            `附上報價單 ${this._currentQuoteData.quoteId}，含稅總計 $${this._currentQuoteData.total.toLocaleString()}。\n\n` +
            `請參閱附件，如有任何問題歡迎聯繫。\n\n` +
            `${CONFIG.COMPANY.name}`
        );

        // Try cloud send first
        const result = await Data.syncToCloud('sendEmail', {
            to: email,
            quoteData: this._currentQuoteData
        });

        if (result.success) {
            Toast.show(`報價單已寄送至 ${email}`, 'success');
        } else {
            // Fallback to mailto
            window.open(`mailto:${email}?subject=${subject}&body=${body}`);
            Toast.show('已開啟郵件客戶端', 'success');
        }
    },

    async sendLINE() {
        if (!this._currentQuoteData) { Toast.show('請先預覽報價單', 'error'); return; }

        const d = this._currentQuoteData;
        const info = d.info;

        // Step 1: Try to save to Drive first to get a PDF URL
        let pdfUrl = '';
        Toast.show('正在生成報價單連結...', 'info');

        try {
            const result = await Data.syncToCloud('saveQuote', d);
            if (result.pdfUrl) pdfUrl = result.pdfUrl;
            else if (result.sheetUrl) pdfUrl = result.sheetUrl;
        } catch (err) {
            console.log('Cloud save failed, using fallback', err);
        }

        // Step 2: Build message
        const lines = [
            `📋 報價單 ${d.quoteId}`,
            ``,
            `客戶：${info.clientName}`,
            `日期：${info.eventDate}`,
            `地點：${info.location}`,
            `人數：${info.headcount || '-'} 人`,
            `含稅總計：NT$ ${d.total.toLocaleString()}`,
            ``,
            `${CONFIG.COMPANY.name}`,
        ];

        if (pdfUrl) {
            lines.push(``, `📎 報價單檔案：`, pdfUrl);
        }

        const message = lines.join('\n');

        // Step 3: Open LINE Share (works on mobile + desktop)
        // Detect platform for best experience
        const encoded = encodeURIComponent(message);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // Mobile: use line:// scheme to open LINE app directly
            window.location.href = `line://msg/text/${encoded}`;
            // Fallback to HTTPS share if scheme doesn't work
            setTimeout(() => {
                window.open(`https://line.me/R/share?text=${encoded}`, '_blank');
            }, 2000);
        } else {
            // Desktop: use HTTPS share URL (opens LINE desktop or web)
            window.open(`https://line.me/R/share?text=${encoded}`, '_blank');
        }

        Toast.show('已開啟 LINE 分享', 'success');
    },

    // Generate PDF blob from preview for direct download
    async downloadPDF() {
        if (!this._currentQuoteData) { Toast.show('請先預覽報價單', 'error'); return; }

        // First try: Save to Drive and get PDF URL
        Toast.show('正在生成 PDF...', 'info');
        try {
            const result = await Data.syncToCloud('saveQuote', this._currentQuoteData);
            if (result.pdfUrl) {
                window.open(result.pdfUrl, '_blank');
                Toast.show('PDF 已生成！', 'success');
                return;
            }
        } catch (err) {
            console.log('Cloud PDF failed', err);
        }

        // Fallback: use browser print
        Toast.show('雲端生成失敗，使用瀏覽器列印存 PDF', 'info');
        setTimeout(() => window.print(), 500);
    },

    // ===== Reset =====
    reset() {
        this.currentStep = 1;
        this.selectedItems = [];
        this._currentQuoteData = null;
        document.querySelectorAll('#quote-step-1 input, #quote-step-1 textarea, #quote-step-1 select').forEach(el => {
            if (el.type === 'select-one') el.selectedIndex = 0;
            else el.value = '';
        });
        this.goStep(1);
    }
};
