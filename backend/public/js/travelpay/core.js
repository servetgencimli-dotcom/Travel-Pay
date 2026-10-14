/* =====================================================================
 * TravelPay web app — core: API client, router, sidebar, auth, UI kit
 * ===================================================================== */
(function () {
    'use strict';

    const ICONS = {
        logo: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        wallet: 'M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5zm0 0h-4a2 2 0 100 4h4',
        send: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
        qr: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
        swap: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
        bank: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
        card: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
        list: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
        map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
        briefcase: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
        coin: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        id: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
        grid: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
        users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        review: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        sliders: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
        bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
        beaker: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
        book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
        doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        globe: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        terminal: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
        logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
        menu: 'M4 6h16M4 12h16M4 18h16',
        collapse: 'M11 19l-7-7 7-7m8 14l-7-7 7-7',
        plus: 'M12 4v16m8-8H4',
        copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
        x: 'M6 18L18 6M6 6l12 12',
        lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
        refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        up: 'M5 10l7-7m0 0l7 7m-7-7v18',
        down: 'M19 14l-7 7m0 0l-7-7m7 7V3',
        star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
        check: 'M5 13l4 4L19 7',
        device: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
        receipt: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
        sparkle: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    };

    const NAV = [
        { section: 'Overview', items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'home' },
        ] },
        { section: 'Wallet', items: [
            { id: 'wallet', label: 'My Wallet', icon: 'wallet' },
            { id: 'send', label: 'Send & Request', icon: 'send' },
            { id: 'qr', label: 'QR Pay', icon: 'qr' },
            { id: 'exchange', label: 'Exchange', icon: 'swap' },
            { id: 'topup', label: 'Open Banking', icon: 'bank' },
            { id: 'cards', label: 'Virtual Cards', icon: 'card' },
            { id: 'transactions', label: 'Transactions', icon: 'list' },
        ] },
        { section: 'Travel', items: [
            { id: 'trips', label: 'Trips & Budget', icon: 'map' },
            { id: 'bookings', label: 'Hotels & Flights', icon: 'briefcase' },
            { id: 'places', label: 'Explore Places', icon: 'pin' },
            { id: 'crypto', label: 'Virtual Assets', icon: 'coin' },
            { id: 'insights', label: 'Spending Insights', icon: 'chart' },
        ] },
        { section: 'Security', items: [
            { id: 'security', label: 'Security Center', icon: 'shield' },
            { id: 'kyc', label: 'Identity (eKYC)', icon: 'id' },
        ] },
        { section: 'Administration', admin: true, items: [
            { id: 'admin', label: 'Admin Overview', icon: 'grid' },
            { id: 'admin-users', label: 'Users & Wallets', icon: 'users' },
            { id: 'admin-transactions', label: 'Transaction Review', icon: 'review', badge: 'held' },
            { id: 'admin-alerts', label: 'Fraud Alerts', icon: 'alert', badge: 'alerts' },
            { id: 'admin-rules', label: 'Fraud Rules', icon: 'sliders' },
            { id: 'admin-threats', label: 'Threat Monitor', icon: 'bolt' },
            { id: 'admin-sandbox', label: 'Risk Sandbox', icon: 'beaker' },
            { id: 'admin-ledger', label: 'Ledger', icon: 'book' },
            { id: 'admin-travel', label: 'Travel Analytics', icon: 'globe' },
            { id: 'admin-audit', label: 'Audit Logs', icon: 'doc' },
            { id: 'api', label: 'API Explorer', icon: 'terminal' },
        ] },
    ];

    const SYMBOLS = { AZN: '₼', EUR: '€', USD: '$' };

    const TP = window.TP = {
        token: null,
        user: null,
        pages: {},
        charts: [],
        badges: {},
        icons: ICONS,
        currencies: ['AZN', 'EUR', 'USD'],
    };

    // ------------------------------------------------------------------
    // Storage (wrapped: private mode / blocked storage must not break the app)
    // ------------------------------------------------------------------
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    };
    TP.store = store;

    function deviceId() {
        let id = store.get('tp_device_id');
        if (!id) {
            id = 'web-' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
            store.set('tp_device_id', id);
        }
        return id;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------
    TP.icon = (name, cls = 'w-5 h-5') =>
        `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${ICONS[name] || ICONS.sparkle}"/></svg>`;

    TP.h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    TP.num = (v, d = 2) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

    TP.money = (v, cur = 'AZN', d = 2) => `${SYMBOLS[cur] || ''}${SYMBOLS[cur] ? '' : cur + ' '}${TP.num(v, d)}`;

    TP.crypto = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 8 });

    TP.date = (iso, withTime = true) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: withTime ? undefined : 'numeric' })
            + (withTime ? ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
    };

    TP.ago = (iso) => {
        if (!iso) return '';
        const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
        if (s < 60) return `${s}s ago`;
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    };

    TP.label = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const CHIP_COLORS = {
        green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
        cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
        amber: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
        red: 'bg-red-500/10 text-red-300 border-red-500/25',
        purple: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
        slate: 'bg-white/5 text-slate-300 border-white/10',
    };
    TP.chip = (text, color = 'slate') => `<span class="chip ${CHIP_COLORS[color] || CHIP_COLORS.slate}">${TP.h(text)}</span>`;

    TP.statusChip = (status) => {
        const map = {
            completed: 'green', active: 'green', verified: 'green', confirmed: 'green', resolved: 'green', info: 'slate',
            pending: 'amber', planned: 'cyan', investigating: 'amber', medium: 'amber', step_up_2fa: 'amber', flag: 'cyan',
            held_for_review: 'purple', hold: 'purple', high: 'red', critical: 'red',
            failed: 'red', cancelled: 'slate', frozen: 'red', suspended: 'red', rejected: 'red', block: 'red', expired: 'slate', used: 'slate',
            new: 'red', dismissed: 'slate', low: 'cyan', revoked: 'slate',
        };
        return TP.chip(TP.label(status), map[status] || 'slate');
    };

    const TX_META = {
        top_up: { icon: 'bank', color: 'text-emerald-300 bg-emerald-500/10' },
        transfer: { icon: 'send', color: 'text-cyan-300 bg-cyan-500/10' },
        exchange: { icon: 'swap', color: 'text-blue-300 bg-blue-500/10' },
        payment: { icon: 'qr', color: 'text-amber-300 bg-amber-500/10' },
        booking: { icon: 'briefcase', color: 'text-purple-300 bg-purple-500/10' },
        card_payment: { icon: 'card', color: 'text-pink-300 bg-pink-500/10' },
        crypto_buy: { icon: 'coin', color: 'text-orange-300 bg-orange-500/10' },
        crypto_sell: { icon: 'coin', color: 'text-orange-300 bg-orange-500/10' },
        crypto_payment: { icon: 'coin', color: 'text-orange-300 bg-orange-500/10' },
        refund: { icon: 'refresh', color: 'text-emerald-300 bg-emerald-500/10' },
    };

    TP.txRow = (tx) => {
        const meta = TX_META[tx.type] || { icon: 'list', color: 'text-slate-300 bg-white/5' };
        const sign = tx.direction === 'in' ? '+' : '−';
        const amountColor = tx.status === 'failed' || tx.status === 'cancelled' ? 'text-slate-500 line-through'
            : tx.direction === 'in' ? 'text-emerald-400' : 'text-white';
        return `
            <button class="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left transition" data-tx="${TP.h(tx.reference)}">
                <span class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${meta.color}">${TP.icon(meta.icon, 'w-5 h-5')}</span>
                <span class="min-w-0 flex-1">
                    <span class="block text-sm font-semibold text-white truncate">${TP.h(tx.description || TP.label(tx.type))}</span>
                    <span class="block text-[11px] text-slate-400">${TP.label(tx.type)} · ${TP.date(tx.created_at)}</span>
                </span>
                <span class="text-right shrink-0">
                    <span class="block text-sm font-bold font-mono ${amountColor}">${sign}${TP.money(tx.amount, tx.currency_code)}</span>
                    ${tx.status !== 'completed' ? `<span class="block mt-0.5">${TP.statusChip(tx.status)}</span>` : (tx.risk_score >= 30 ? `<span class="block text-[10px] text-amber-400 mt-0.5">risk ${tx.risk_score}</span>` : '')}
                </span>
            </button>`;
    };

    TP.empty = (text, icon = 'sparkle') => `
        <div class="flex flex-col items-center justify-center text-center py-10 text-slate-500">
            <span class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">${TP.icon(icon, 'w-6 h-6')}</span>
            <p class="text-sm">${TP.h(text)}</p>
        </div>`;

    TP.stat = (label, value, sub = '', accent = 'cyan', icon = null) => `
        <div class="glass rounded-2xl p-5 relative overflow-hidden">
            <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-${accent}-500/10 rounded-full blur-2xl"></div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] uppercase tracking-wider text-slate-400 font-bold">${TP.h(label)}</span>
                ${icon ? `<span class="p-1.5 rounded-lg bg-${accent}-500/10 text-${accent}-400">${TP.icon(icon, 'w-4 h-4')}</span>` : ''}
            </div>
            <div class="text-2xl font-extrabold text-white">${value}</div>
            ${sub ? `<div class="text-xs text-slate-400 mt-1">${sub}</div>` : ''}
        </div>`;

    TP.panel = (title, body, actions = '', extra = '') => `
        <section class="glass rounded-2xl ${extra}">
            ${title ? `<div class="flex items-center justify-between gap-3 px-5 pt-5 pb-3"><h3 class="text-sm font-bold text-white">${title}</h3><div class="flex items-center gap-2">${actions}</div></div>` : ''}
            <div class="${title ? 'px-5 pb-5' : 'p-5'}">${body}</div>
        </section>`;

    TP.loading = () => `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="skeleton h-28"></div><div class="skeleton h-28"></div><div class="skeleton h-28"></div></div>
            <div class="skeleton h-64"></div>
        </div>`;

    TP.options = (list, selected) => list.map((v) => {
        const [val, text] = Array.isArray(v) ? v : [v, v];
        return `<option value="${TP.h(val)}" ${String(val) === String(selected) ? 'selected' : ''}>${TP.h(text)}</option>`;
    }).join('');

    TP.formData = (form) => {
        const data = {};
        new FormData(form).forEach((v, k) => { data[k] = v; });
        form.querySelectorAll('input[type=checkbox]').forEach((c) => { data[c.name] = c.checked; });
        return data;
    };

    TP.copy = async (text) => {
        try { await navigator.clipboard.writeText(text); TP.toast('Copied to clipboard'); } catch (e) { TP.toast(text, 'info'); }
    };

    TP.qr = (el, text, size = 180) => {
        el.innerHTML = '';
        if (window.QRCode) {
            new QRCode(el, { text, width: size, height: size, colorDark: '#0A1128', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
        } else {
            el.innerHTML = `<div class="text-xs font-mono break-all p-3 bg-white/5 rounded-xl">${TP.h(text)}</div>`;
        }
    };

    // ------------------------------------------------------------------
    // Charts
    // ------------------------------------------------------------------
    TP.palette = ['#22D3EE', '#34D399', '#A78BFA', '#FBBF24', '#F472B6', '#60A5FA', '#F87171', '#94A3B8'];

    TP.chart = (canvas, config) => {
        if (!window.Chart || !canvas) return null;
        Chart.defaults.color = '#94A3B8';
        Chart.defaults.font.family = '"Plus Jakarta Sans", sans-serif';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
        const chart = new Chart(canvas, config);
        TP.charts.push(chart);
        return chart;
    };

    // ------------------------------------------------------------------
    // Toasts & modal
    // ------------------------------------------------------------------
    TP.toast = (message, type = 'success') => {
        const colors = {
            success: 'border-emerald-500/30 text-emerald-200',
            error: 'border-red-500/30 text-red-200',
            info: 'border-cyan-500/30 text-cyan-200',
            warn: 'border-amber-500/30 text-amber-200',
        };
        const el = document.createElement('div');
        el.className = `glass-strong rounded-xl px-4 py-3 text-sm shadow-2xl border ${colors[type] || colors.info} fade-in`;
        el.textContent = message;
        document.getElementById('toasts').appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 4200);
        setTimeout(() => el.remove(), 4600);
    };

    let modalResolve = null;
    TP.modal = (html, onMount) => {
        const root = document.getElementById('modalRoot');
        const box = document.getElementById('modalBox');
        box.innerHTML = `<button class="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" data-close>${TP.icon('x', 'w-5 h-5')}</button>${html}`;
        root.classList.remove('hidden');
        box.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => TP.closeModal()));
        if (onMount) onMount(box);
        return new Promise((resolve) => { modalResolve = resolve; });
    };
    TP.closeModal = (value = null) => {
        document.getElementById('modalRoot').classList.add('hidden');
        document.getElementById('modalBox').innerHTML = '';
        if (modalResolve) { const r = modalResolve; modalResolve = null; r(value); }
    };

    TP.confirm = (title, text, okLabel = 'Confirm', danger = false) => TP.modal(`
        <h3 class="text-lg font-bold text-white pr-8">${TP.h(title)}</h3>
        <p class="text-sm text-slate-400 mt-2">${text}</p>
        <div class="flex justify-end gap-2 mt-6">
            <button class="btn btn-ghost" data-close>Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${TP.h(okLabel)}</button>
        </div>`, (box) => box.querySelector('[data-ok]').addEventListener('click', () => TP.closeModal(true)));

    // ------------------------------------------------------------------
    // API client
    // ------------------------------------------------------------------
    class ApiError extends Error {
        constructor(status, data) {
            const firstValidation = data && data.errors ? Object.values(data.errors)[0]?.[0] : null;
            super(firstValidation || (data && data.message) || `Request failed (${status})`);
            this.status = status;
            this.data = data || {};
        }
    }
    TP.ApiError = ApiError;

    function promptStepUp(data) {
        return TP.modal(`
            <div class="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center mb-4">${TP.icon('lock', 'w-6 h-6')}</div>
            <h3 class="text-lg font-bold text-white">Confirm with 2FA</h3>
            <p class="text-sm text-slate-400 mt-1">${TP.h(data.message)} Risk score: <b class="text-amber-300">${data.context?.risk_score ?? '—'}</b>/100.</p>
            <p class="text-xs text-slate-500 mt-1">Sandbox: use <span class="font-mono text-slate-300">123456</span> or a recovery code.</p>
            <form class="mt-4 space-y-3" data-stepup>
                <input class="input font-mono tracking-[0.4em] text-center text-lg" name="code" maxlength="20" autofocus required placeholder="••••••">
                <button class="btn btn-primary w-full">Verify & continue</button>
            </form>`, (box) => {
            box.querySelector('[data-stepup]').addEventListener('submit', (e) => {
                e.preventDefault();
                TP.closeModal(e.target.code.value.trim());
            });
        });
    }

    TP.api = async (path, opts = {}) => {
        const headers = {
            Accept: 'application/json',
            'X-Device-Id': deviceId(),
            'X-Device-Name': 'TravelPay Web (' + (navigator.platform || 'browser') + ')',
            'X-Device-Type': 'web',
        };
        if (TP.token) headers.Authorization = 'Bearer ' + TP.token;
        if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
        if (opts.idem) headers['Idempotency-Key'] = opts.idem;

        let query = '';
        if (opts.query) {
            const params = new URLSearchParams();
            Object.entries(opts.query).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) params.append(k, v); });
            query = params.toString() ? '?' + params.toString() : '';
        }

        const res = await fetch('/api/v1' + path + query, {
            method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
            headers,
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });

        let data = null;
        try { data = await res.json(); } catch (e) { /* empty body */ }

        if (res.status === 401 && TP.token && !opts.noLogout) {
            TP.logout(true);
            throw new ApiError(401, { message: 'Session expired. Please sign in again.' });
        }

        if (!res.ok) {
            if (data && data.error_code === 'step_up_required' && opts.stepUp !== false) {
                const code = await promptStepUp(data);
                if (code) {
                    return TP.api(path, { ...opts, body: { ...(opts.body || {}), two_factor_code: code } });
                }
            }
            throw new ApiError(res.status, data);
        }
        return data;
    };

    /**
     * Bind a form to an async handler: disables the submit button, shows errors as toasts.
     */
    TP.onSubmit = (form, handler) => {
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type=submit], button:not([type])');
            const original = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span> Working…'; }
            try {
                await handler(TP.formData(form), form);
            } catch (err) {
                TP.toast(err.message || 'Something went wrong', err.status === 202 ? 'warn' : 'error');
            } finally {
                if (btn && document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = original; }
            }
        });
    };

    TP.action = async (fn, successMsg) => {
        try {
            const r = await fn();
            if (successMsg !== false) TP.toast(successMsg || r?.message || 'Done');
            return r;
        } catch (err) {
            TP.toast(err.message, 'error');
            return null;
        }
    };

    TP.idem = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

    // ------------------------------------------------------------------
    // Transaction detail modal (used from many pages)
    // ------------------------------------------------------------------
    TP.showTx = async (reference) => {
        try {
            const { data: tx } = await TP.api('/wallet/transactions/' + encodeURIComponent(reference));
            const factors = (tx.risk?.factors || []).map((f) => `<li class="flex justify-between gap-2"><span>${TP.h(f.name)}</span><span class="font-mono text-amber-300">+${f.weight}</span></li>`).join('');
            const entries = (tx.ledger_entries || []).map((e) => `
                <tr><td class="font-mono text-[11px]">${TP.h(e.ledger_account?.account_number)}</td>
                <td>${e.entry_type === 'debit' ? TP.chip('DR', 'cyan') : TP.chip('CR', 'purple')}</td>
                <td class="text-right font-mono">${TP.num(e.amount)} ${e.currency_code}</td></tr>`).join('');
            TP.modal(`
                <div class="text-xs text-slate-400 font-mono">${TP.h(tx.reference)}</div>
                <div class="text-3xl font-extrabold mt-1 ${tx.direction === 'in' ? 'text-emerald-400' : 'text-white'}">${tx.direction === 'in' ? '+' : '−'}${TP.money(tx.amount, tx.currency_code)}</div>
                <div class="text-sm text-slate-300 mt-1">${TP.h(tx.description)}</div>
                <div class="flex flex-wrap gap-2 mt-3">${TP.statusChip(tx.status)} ${TP.chip(TP.label(tx.type), 'cyan')} ${tx.fee > 0 ? TP.chip('Fee ' + TP.money(tx.fee, tx.currency_code), 'amber') : ''}</div>
                <dl class="grid grid-cols-2 gap-3 mt-5 text-xs">
                    <div class="p-3 rounded-xl bg-white/5"><dt class="text-slate-500">Date</dt><dd class="text-white mt-0.5">${TP.date(tx.created_at)}</dd></div>
                    <div class="p-3 rounded-xl bg-white/5"><dt class="text-slate-500">Counterparty</dt><dd class="text-white mt-0.5">${TP.h(tx.counterparty || '—')}</dd></div>
                    <div class="p-3 rounded-xl bg-white/5"><dt class="text-slate-500">Risk score</dt><dd class="mt-0.5 font-bold ${tx.risk_score >= 60 ? 'text-red-400' : tx.risk_score >= 30 ? 'text-amber-300' : 'text-emerald-400'}">${tx.risk_score}/100 ${tx.risk ? '· ' + TP.h(tx.risk.risk_level) : ''}</dd></div>
                    <div class="p-3 rounded-xl bg-white/5"><dt class="text-slate-500">Engine decision</dt><dd class="text-white mt-0.5">${TP.h(TP.label(tx.risk?.recommended_action || 'allow'))}</dd></div>
                </dl>
                ${factors ? `<div class="mt-4"><div class="label">Triggered risk rules</div><ul class="text-xs text-slate-300 space-y-1">${factors}</ul></div>` : ''}
                ${entries ? `<div class="mt-4"><div class="label">Double-entry ledger</div><table class="data w-full"><tbody>${entries}</tbody></table></div>` : ''}
            `);
        } catch (err) {
            TP.toast(err.message, 'error');
        }
    };

    TP.bindTxRows = (root) => {
        root.querySelectorAll('[data-tx]').forEach((el) => el.addEventListener('click', () => TP.showTx(el.dataset.tx)));
    };

    // ------------------------------------------------------------------
    // Sidebar & router
    // ------------------------------------------------------------------
    function renderNav() {
        const nav = document.getElementById('sidebarNav');
        const isAdmin = TP.user && TP.user.role === 'admin';
        nav.innerHTML = NAV.filter((g) => !g.admin || isAdmin).map((group) => `
            <div class="nav-section mt-4 first:mt-0 mb-1 px-3"><span class="nav-section-label uppercase font-bold text-slate-500">${group.section}</span></div>
            ${group.items.map((item) => `
                <a href="#/${item.id}" data-nav="${item.id}" title="${TP.h(item.label)}"
                   class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5">
                    <span class="shrink-0">${TP.icon(item.icon, 'w-5 h-5')}</span>
                    <span class="sb-label flex-1 truncate">${item.label}</span>
                    ${item.badge ? `<span class="sb-label hidden min-w-[20px] h-5 px-1.5 rounded-full bg-red-500/90 text-[10px] font-bold text-white items-center justify-center" data-badge="${item.badge}"></span>` : ''}
                </a>`).join('')}
        `).join('');
        updateBadges();
    }

    function updateBadges() {
        document.querySelectorAll('[data-badge]').forEach((el) => {
            const n = TP.badges[el.dataset.badge] || 0;
            el.textContent = n > 99 ? '99+' : n;
            el.classList.toggle('hidden', !n);
            el.classList.toggle('flex', !!n);
        });
    }

    TP.updateBadges = updateBadges;

    TP.refreshBadges = async () => {
        if (!TP.user || TP.user.role !== 'admin') return;
        try {
            const { data } = await TP.api('/admin/dashboard');
            TP.badges.held = data.overview.held_transactions;
            TP.badges.alerts = data.overview.pending_fraud_alerts;
            updateBadges();
        } catch (e) { /* ignore */ }
    };

    function findNavItem(id) {
        for (const g of NAV) for (const i of g.items) if (i.id === id) return { ...i, section: g.section };
        return null;
    }

    async function route() {
        if (!TP.token || !TP.user) return;
        const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
        const [pageId, param] = hash.split('/');
        const page = TP.pages[pageId];
        const view = document.getElementById('view');

        TP.charts.forEach((c) => c.destroy());
        TP.charts = [];
        document.body.classList.remove('sb-open');
        document.getElementById('sbOverlay').classList.add('hidden');

        if (!page || (page.admin && TP.user.role !== 'admin')) {
            location.hash = '#/dashboard';
            return;
        }

        const navId = page.nav || pageId;
        document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === navId));
        const navItem = findNavItem(navId);
        document.getElementById('pageTitle').textContent = page.title || navItem?.label || '';
        document.getElementById('pageCrumb').textContent = navItem?.section || '';
        document.title = `${page.title || navItem?.label || 'TravelPay'} · TravelPay`;

        view.innerHTML = TP.loading();
        const token = (TP.routeToken = Symbol('route'));
        try {
            await page.render(view, param);
            if (token === TP.routeToken) {
                view.firstElementChild?.classList.add('fade-in');
                TP.bindTxRows(view);
            }
        } catch (err) {
            if (token !== TP.routeToken) return;
            view.innerHTML = TP.panel('', `<div class="text-center py-10"><p class="text-red-300 font-semibold">${TP.h(err.message)}</p><button class="btn btn-ghost mt-4" onclick="TP.reload()">Retry</button></div>`);
        }
    }
    TP.reload = route;
    TP.go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

    // ------------------------------------------------------------------
    // Notifications
    // ------------------------------------------------------------------
    const NOTIF_ICON = { transfer_in: 'down', transfer_out: 'up', payment: 'qr', exchange: 'swap', top_up: 'bank', booking: 'briefcase', crypto: 'coin', card: 'card', security: 'shield' };

    async function loadNotifications() {
        if (!TP.token) return;
        try {
            const res = await TP.api('/notifications');
            const unread = res.meta.unread;
            const dot = document.getElementById('notifDot');
            dot.textContent = unread > 9 ? '9+' : unread;
            dot.classList.toggle('hidden', !unread);
            document.getElementById('notifList').innerHTML = res.data.length ? res.data.map((n) => `
                <div class="flex gap-3 px-4 py-3 ${n.read ? '' : 'bg-cyan-500/5'}">
                    <span class="w-8 h-8 shrink-0 rounded-lg bg-white/5 text-cyan-300 flex items-center justify-center">${TP.icon(NOTIF_ICON[n.kind] || 'bell', 'w-4 h-4')}</span>
                    <div class="min-w-0">
                        <div class="text-sm font-semibold text-white">${TP.h(n.title)}</div>
                        <div class="text-xs text-slate-400">${TP.h(n.body)}</div>
                        <div class="text-[10px] text-slate-500 mt-0.5">${TP.ago(n.created_at)}</div>
                    </div>
                </div>`).join('') : TP.empty('No notifications yet', 'bell');
        } catch (e) { /* ignore */ }
    }
    TP.loadNotifications = loadNotifications;

    // ------------------------------------------------------------------
    // Auth
    // ------------------------------------------------------------------
    const DEMO = [
        { email: 'elvin@travelpay.com', label: 'Traveller', color: 'emerald' },
        { email: 'aysel@travelpay.com', label: 'Friend (P2P)', color: 'purple' },
        { email: 'admin@travelpay.com', label: 'Admin', color: 'cyan' },
    ];

    function showAuth() {
        document.getElementById('appShell').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
    }

    async function showApp() {
        const { data } = await TP.api('/auth/me');
        TP.user = data.user;
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('appShell').classList.remove('hidden');
        document.getElementById('sbName').textContent = TP.user.name;
        document.getElementById('sbRole').textContent = TP.user.role === 'admin' ? 'Administrator' : (TP.user.wallet?.wallet_number || 'Traveller');
        document.getElementById('sbAvatar').textContent = TP.user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
        renderNav();
        loadNotifications();
        clearInterval(TP.notifTimer);
        TP.notifTimer = setInterval(loadNotifications, 30000);
        TP.refreshBadges();
        if (!location.hash || location.hash === '#/' || location.hash === '#') {
            location.hash = TP.user.role === 'admin' && location.pathname.startsWith('/admin') ? '#/admin' : '#/dashboard';
        }
        route();
    }

    async function login(payload) {
        const err = document.getElementById('loginError');
        err.classList.add('hidden');
        const res = await TP.api('/auth/login', { body: payload, noLogout: true });
        if (res.requires_two_factor) {
            document.getElementById('twoFactorField').classList.remove('hidden');
            document.querySelector('#loginForm [name=two_factor_code]').focus();
            TP.toast('Enter your 2FA code (sandbox: 123456)', 'info');
            return;
        }
        TP.token = res.data.token;
        store.set('tp_token', TP.token);
        document.getElementById('twoFactorField').classList.add('hidden');
        await showApp();
        TP.toast(`Welcome, ${TP.user.name.split(' ')[0]}!`);
    }

    TP.logout = async (expired = false) => {
        if (!expired && TP.token) {
            try { await TP.api('/auth/logout', { body: {}, noLogout: true }); } catch (e) { /* ignore */ }
        }
        TP.token = null;
        TP.user = null;
        store.del('tp_token');
        clearInterval(TP.notifTimer);
        TP.charts.forEach((c) => c.destroy());
        TP.charts = [];
        showAuth();
        if (expired) TP.toast('Your session ended. Please sign in again.', 'warn');
    };

    function bindAuth() {
        document.querySelectorAll('[data-auth-tab]').forEach((tab) => tab.addEventListener('click', () => {
            document.querySelectorAll('[data-auth-tab]').forEach((t) => t.classList.toggle('active', t === tab));
            document.getElementById('loginForm').classList.toggle('hidden', tab.dataset.authTab !== 'login');
            document.getElementById('registerForm').classList.toggle('hidden', tab.dataset.authTab !== 'register');
        }));

        document.getElementById('demoAccounts').innerHTML = DEMO.map((d) => `
            <button type="button" data-demo="${d.email}" class="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition">
                <div class="text-[11px] font-bold text-${d.color}-400">${d.label}</div>
                <div class="text-[10px] text-slate-400 truncate">${d.email.split('@')[0]}</div>
            </button>`).join('');
        document.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', () => {
            const f = document.getElementById('loginForm');
            f.email.value = b.dataset.demo;
            f.password.value = 'Password123!';
            f.requestSubmit();
        }));

        TP.onSubmit(document.getElementById('loginForm'), async (data) => {
            try {
                await login(data);
            } catch (e) {
                const err = document.getElementById('loginError');
                err.textContent = e.message;
                err.classList.remove('hidden');
            }
        });

        TP.onSubmit(document.getElementById('registerForm'), async (data) => {
            try {
                const res = await TP.api('/auth/register', { body: data, noLogout: true });
                TP.token = res.data.token;
                store.set('tp_token', TP.token);
                location.hash = '#/dashboard';
                await showApp();
                TP.toast('Wallet created! Link a bank account to top up.');
            } catch (e) {
                const err = document.getElementById('registerError');
                err.textContent = e.message;
                err.classList.remove('hidden');
            }
        });
    }

    function bindShell() {
        document.getElementById('logoutBtn').addEventListener('click', () => TP.logout());
        document.getElementById('menuBtn').addEventListener('click', () => {
            document.body.classList.add('sb-open');
            document.getElementById('sbOverlay').classList.remove('hidden');
        });
        document.getElementById('sbOverlay').addEventListener('click', () => {
            document.body.classList.remove('sb-open');
            document.getElementById('sbOverlay').classList.add('hidden');
        });
        document.getElementById('collapseBtn').addEventListener('click', () => {
            document.body.classList.toggle('sb-collapsed');
            store.set('tp_sb_collapsed', document.body.classList.contains('sb-collapsed') ? '1' : '0');
        });
        if (store.get('tp_sb_collapsed') === '1') document.body.classList.add('sb-collapsed');

        const panel = document.getElementById('notifPanel');
        document.getElementById('notifBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) loadNotifications();
        });
        document.addEventListener('click', (e) => { if (!panel.contains(e.target)) panel.classList.add('hidden'); });
        document.getElementById('notifReadAll').addEventListener('click', async () => {
            await TP.action(() => TP.api('/notifications/read', { body: {} }), false);
            loadNotifications();
        });

        document.getElementById('modalBackdrop').addEventListener('click', () => TP.closeModal());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') TP.closeModal(); });
        window.addEventListener('hashchange', route);
    }

    TP.boot = async () => {
        document.querySelectorAll('[data-icon]').forEach((el) => {
            el.innerHTML = TP.icon(el.dataset.icon, el.dataset.icon === 'logo' ? 'w-6 h-6 text-white' : 'w-5 h-5');
        });
        bindAuth();
        bindShell();

        TP.token = store.get('tp_token');
        if (!TP.token) return showAuth();
        try {
            await showApp();
        } catch (e) {
            TP.token = null;
            store.del('tp_token');
            showAuth();
        }
    };
})();
