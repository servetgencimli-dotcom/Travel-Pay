/* =====================================================================
 * TravelPay — wallet pages: dashboard, wallet, P2P, QR, exchange,
 * open banking, virtual cards, transactions
 * ===================================================================== */
(function () {
    'use strict';
    const { h, icon, money, num, panel, stat, empty, chip, statusChip, txRow, options } = TP;
    const CUR_STYLE = {
        AZN: { name: 'Azerbaijani Manat', grad: 'from-emerald-500/25 to-teal-500/5', text: 'text-emerald-300' },
        EUR: { name: 'Euro', grad: 'from-blue-500/25 to-indigo-500/5', text: 'text-blue-300' },
        USD: { name: 'US Dollar', grad: 'from-amber-500/25 to-orange-500/5', text: 'text-amber-300' },
    };

    // ------------------------------------------------------------------
    // Dashboard
    // ------------------------------------------------------------------
    TP.pages.dashboard = {
        title: 'Dashboard',
        async render(el) {
            const [summary, trips, score] = await Promise.all([
                TP.api('/wallet/summary'),
                TP.api('/trips').catch(() => ({ data: [] })),
                TP.api('/security/score').catch(() => ({ data: null })),
            ]);
            const s = summary.data;
            const trip = trips.data.find((t) => t.status === 'active') || trips.data.find((t) => t.status === 'planned');
            const sec = score.data;
            const first = TP.user.name.split(' ')[0];

            el.innerHTML = `
            <div class="space-y-6">
                ${s.wallet.status !== 'active' ? `<div class="rounded-2xl p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">${icon('lock')} Your wallet is frozen — outgoing payments are blocked. <a href="#/security" class="underline font-semibold">Unfreeze in Security Center</a></div>` : ''}
                ${!s.kyc_verified ? `<div class="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm flex flex-wrap items-center gap-3">${icon('id')} <span class="flex-1">Verify your identity to lift the 2,000 AZN per-transaction limit.</span><a href="#/kyc" class="btn btn-sm btn-ghost">Verify now</a></div>` : ''}

                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <section class="xl:col-span-2 rounded-3xl p-6 sm:p-7 relative overflow-hidden bg-gradient-to-br from-cyan-600/30 via-blue-700/20 to-navy-900 border border-cyan-400/20">
                        <div class="absolute -right-16 -top-16 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl"></div>
                        <div class="relative flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div class="text-sm text-cyan-100/80">Salam, ${h(first)} 👋</div>
                                <div class="text-xs uppercase tracking-widest text-cyan-200/60 font-bold mt-4">Total net worth</div>
                                <div class="text-4xl sm:text-5xl font-extrabold text-white mt-1">${money(s.net_worth_azn, 'AZN')}</div>
                                <div class="text-xs text-cyan-100/70 mt-2">Fiat ${money(s.fiat_value_azn, 'AZN')} · Virtual assets ${money(s.crypto_value_azn, 'AZN')}</div>
                            </div>
                            <button class="text-left px-3 py-2 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10" data-copy="${h(s.wallet.wallet_number)}">
                                <div class="text-[10px] uppercase tracking-widest text-cyan-200/70 font-bold">Wallet number</div>
                                <div class="font-mono text-sm text-white flex items-center gap-2">${h(s.wallet.wallet_number)} ${icon('copy', 'w-3.5 h-3.5 text-cyan-300')}</div>
                            </button>
                        </div>
                        <div class="relative grid grid-cols-2 sm:grid-cols-5 gap-2 mt-7">
                            ${[['send', 'send', 'Send'], ['qr', 'qr', 'QR Pay'], ['exchange', 'swap', 'Exchange'], ['topup', 'bank', 'Top up'], ['bookings', 'briefcase', 'Book trip']].map(([to, ic, label]) => `
                                <a href="#/${to}" class="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition">
                                    <span class="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white">${icon(ic, 'w-5 h-5')}</span>
                                    <span class="text-xs font-semibold text-white">${label}</span>
                                </a>`).join('')}
                        </div>
                    </section>

                    <section class="glass rounded-3xl p-6 flex flex-col">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-bold text-white">Security score</h3>
                            <a href="#/security" class="text-xs text-cyan-400 hover:underline">Improve</a>
                        </div>
                        ${sec ? `
                        <div class="flex items-center gap-5 mt-4">
                            <div class="relative w-24 h-24 shrink-0">
                                <svg viewBox="0 0 36 36" class="w-24 h-24 -rotate-90"><circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="${sec.score >= 70 ? '#34D399' : sec.score >= 50 ? '#FBBF24' : '#F87171'}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${sec.score} 100"/></svg>
                                <div class="absolute inset-0 flex flex-col items-center justify-center"><span class="text-2xl font-extrabold text-white">${sec.score}</span><span class="text-[10px] text-slate-400">grade ${sec.grade}</span></div>
                            </div>
                            <ul class="space-y-1.5 text-xs min-w-0">
                                ${sec.checks.slice(0, 4).map((c) => `<li class="flex items-center gap-1.5 ${c.ok ? 'text-slate-300' : 'text-amber-300'}">${icon(c.ok ? 'check' : 'alert', 'w-3.5 h-3.5 shrink-0')}<span class="truncate">${h(c.label)}</span></li>`).join('')}
                            </ul>
                        </div>` : ''}
                        <div class="mt-auto pt-5 grid grid-cols-2 gap-3">
                            <div class="p-3 rounded-xl bg-white/5"><div class="text-[10px] uppercase text-slate-500 font-bold">Spent this month</div><div class="text-base font-bold text-white mt-0.5">${money(s.spent_this_month_azn)}</div></div>
                            <div class="p-3 rounded-xl bg-white/5"><div class="text-[10px] uppercase text-slate-500 font-bold">2FA</div><div class="text-base font-bold mt-0.5 ${s.two_factor_enabled ? 'text-emerald-400' : 'text-amber-300'}">${s.two_factor_enabled ? 'Enabled' : 'Off'}</div></div>
                        </div>
                    </section>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${s.balances.map((b) => {
                        const st = CUR_STYLE[b.currency_code] || CUR_STYLE.AZN;
                        return `
                        <div class="rounded-2xl p-5 bg-gradient-to-br ${st.grad} border border-white/10">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold ${st.text}">${b.currency_code}</span>
                                <span class="text-[11px] text-slate-400">${st.name}</span>
                            </div>
                            <div class="text-2xl font-extrabold text-white mt-3">${money(b.balance, b.currency_code)}</div>
                            <div class="text-[11px] text-slate-400 mt-1">${b.locked_balance > 0 ? `<span class="text-purple-300">${money(b.locked_balance, b.currency_code)} on hold</span> · ` : ''}≈ ${money(b.value_azn, 'AZN')}</div>
                        </div>`;
                    }).join('')}
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    ${panel('Recent activity', s.recent_transactions.length ? `<div class="-mx-2">${s.recent_transactions.map(txRow).join('')}</div>` : empty('No transactions yet', 'list'), '<a href="#/transactions" class="text-xs text-cyan-400 hover:underline">View all</a>', 'xl:col-span-2')}
                    <div class="space-y-6">
                        ${trip ? tripWidget(trip) : panel('Travel', empty('Plan your first trip to track budget automatically', 'map') + '<a href="#/trips" class="btn btn-primary w-full">Plan a trip</a>')}
                        ${panel('Exchange rates', `<div class="space-y-2">${s.rates.filter((r) => r.to === 'AZN' || (r.from === 'EUR' && r.to === 'USD')).map((r) => `
                            <div class="flex items-center justify-between text-sm"><span class="text-slate-400 font-mono">${r.pair}</span><span class="font-mono font-semibold text-white">${num(r.rate, 4)}</span></div>`).join('')}</div>`, '<a href="#/exchange" class="text-xs text-cyan-400 hover:underline">Exchange</a>')}
                    </div>
                </div>
            </div>`;

            el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => TP.copy(b.dataset.copy)));
        },
    };

    function tripWidget(trip) {
        const s = trip.summary;
        const pct = Math.min(100, s.usage_percent ?? 0);
        const color = pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400';
        return panel(`${h(trip.title)}`, `
            <div class="flex items-center gap-2 text-xs text-slate-400">${statusChip(trip.status)} ${h(trip.destination_country)} · ${TP.date(trip.start_date, false)} → ${TP.date(trip.end_date, false)}</div>
            <div class="mt-4 flex items-end justify-between"><div><div class="text-[10px] uppercase text-slate-500 font-bold">Spent</div><div class="text-xl font-extrabold text-white">${money(s.total_spent, s.base_currency)}</div></div>
            <div class="text-right"><div class="text-[10px] uppercase text-slate-500 font-bold">Budget</div><div class="text-sm font-semibold text-slate-300">${s.total_budget ? money(s.total_budget, s.base_currency) : '—'}</div></div></div>
            <div class="h-2 rounded-full bg-white/10 mt-3 overflow-hidden"><div class="h-full ${color} rounded-full" style="width:${pct}%"></div></div>
            <div class="text-[11px] text-slate-400 mt-2">${s.days_left} days left · avg ${money(s.daily_average, s.base_currency)}/day</div>
            ${s.tips[0] ? `<div class="mt-3 text-xs text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">${h(s.tips[0])}</div>` : ''}`,
        `<a href="#/trips/${trip.id}" class="text-xs text-cyan-400 hover:underline">Open</a>`);
    }

    // ------------------------------------------------------------------
    // My Wallet
    // ------------------------------------------------------------------
    TP.pages.wallet = {
        title: 'My Wallet',
        async render(el) {
            const [{ data: s }, { data: banks }, { data: crypto }] = await Promise.all([
                TP.api('/wallet/summary'),
                TP.api('/open-banking/accounts'),
                TP.api('/crypto/portfolio'),
            ]);
            const receivePayload = `travelpay://wallet/${s.wallet.wallet_number}`;

            el.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-2 space-y-6">
                    ${panel('Currency balances', `
                        <div class="overflow-x-auto"><table class="data w-full">
                            <thead><tr><th>Currency</th><th class="text-right">Balance</th><th class="text-right">On hold</th><th class="text-right">Available</th><th class="text-right">≈ AZN</th></tr></thead>
                            <tbody>${s.balances.map((b) => `<tr>
                                <td><span class="font-bold ${(CUR_STYLE[b.currency_code] || {}).text || ''}">${b.currency_code}</span> <span class="text-xs text-slate-500">${(CUR_STYLE[b.currency_code] || {}).name || ''}</span></td>
                                <td class="text-right font-mono text-white">${num(b.balance)}</td>
                                <td class="text-right font-mono ${b.locked_balance > 0 ? 'text-purple-300' : 'text-slate-500'}">${num(b.locked_balance)}</td>
                                <td class="text-right font-mono text-emerald-400 font-semibold">${num(b.available_balance)}</td>
                                <td class="text-right font-mono text-slate-300">${num(b.value_azn)}</td></tr>`).join('')}
                            </tbody>
                            <tfoot><tr><td class="font-bold text-white pt-3">Fiat total</td><td colspan="4" class="text-right font-mono font-bold text-white pt-3">${money(s.fiat_value_azn)}</td></tr></tfoot>
                        </table></div>`)}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${panel('Linked bank accounts', banks.length ? `<div class="space-y-2">${banks.map((b) => `
                            <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                <span class="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-300 flex items-center justify-center">${icon('bank', 'w-4 h-4')}</span>
                                <div class="min-w-0 flex-1"><div class="text-sm font-semibold text-white">${h(b.bank_name)}</div><div class="text-[11px] font-mono text-slate-400">${h(b.iban_masked)}</div></div>
                                <span class="text-xs font-mono text-slate-300">${money(b.available_balance, b.currency_code)}</span>
                            </div>`).join('')}</div>` : empty('No bank linked yet', 'bank'), '<a href="#/topup" class="text-xs text-cyan-400 hover:underline">Manage</a>')}
                        ${panel('Virtual assets', crypto.holdings.length ? `<div class="space-y-2">${crypto.holdings.map((c) => `
                            <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                <span class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white" style="background:${h(c.color)}33;color:${h(c.color)}">${h(c.asset_code)}</span>
                                <div class="min-w-0 flex-1"><div class="text-sm font-semibold text-white">${TP.crypto(c.amount)} ${h(c.asset_code)}</div><div class="text-[11px] ${c.pnl_azn >= 0 ? 'text-emerald-400' : 'text-red-400'}">${c.pnl_azn >= 0 ? '+' : ''}${num(c.pnl_percent)}%</div></div>
                                <span class="text-xs font-mono text-slate-300">${money(c.value_azn)}</span>
                            </div>`).join('')}</div>` : empty('No virtual assets', 'coin'), '<a href="#/crypto" class="text-xs text-cyan-400 hover:underline">Trade</a>')}
                    </div>
                </div>

                <div class="space-y-6">
                    ${panel('Receive money', `
                        <div class="flex flex-col items-center text-center">
                            <div id="walletQr" class="qr-box"></div>
                            <div class="font-mono text-sm text-white mt-3">${h(s.wallet.wallet_number)}</div>
                            <p class="text-xs text-slate-400 mt-1">Share your wallet number, email or phone to receive P2P transfers instantly.</p>
                            <div class="flex gap-2 mt-4 w-full">
                                <button class="btn btn-ghost flex-1" data-copy="${h(s.wallet.wallet_number)}">${icon('copy', 'w-4 h-4')} Copy</button>
                                <a href="#/qr" class="btn btn-primary flex-1">${icon('qr', 'w-4 h-4')} Request</a>
                            </div>
                        </div>`)}
                    ${panel('Wallet status', `
                        <div class="flex items-center justify-between"><span class="text-sm text-slate-300">Status</span>${statusChip(s.wallet.status)}</div>
                        <div class="flex items-center justify-between mt-3"><span class="text-sm text-slate-300">Identity</span>${s.kyc_verified ? chip('eKYC verified', 'green') : chip('Unverified', 'amber')}</div>
                        <div class="flex items-center justify-between mt-3"><span class="text-sm text-slate-300">Two-factor</span>${s.two_factor_enabled ? chip('Enabled', 'green') : chip('Disabled', 'amber')}</div>
                        <a href="#/security" class="btn btn-ghost w-full mt-5">${icon('shield', 'w-4 h-4')} Security Center</a>`)}
                </div>
            </div>`;

            TP.qr(el.querySelector('#walletQr'), receivePayload, 168);
            el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => TP.copy(b.dataset.copy)));
        },
    };

    // ------------------------------------------------------------------
    // Send money (P2P)
    // ------------------------------------------------------------------
    TP.pages.send = {
        title: 'Send & Request',
        async render(el) {
            const [{ data: s }] = await Promise.all([TP.api('/wallet/summary')]);
            const preset = TP.store.get('tp_send_to') || '';
            TP.store.del('tp_send_to');

            el.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div class="xl:col-span-3 space-y-6">
                    ${panel('Send money instantly', `
                        <form id="sendForm" class="space-y-4">
                            <div>
                                <label class="label">Recipient</label>
                                <div class="flex gap-2">
                                    <input class="input" name="recipient" required placeholder="Email, phone (+994…) or wallet number (TP…)" value="${h(preset)}">
                                    <button type="button" class="btn btn-ghost" id="lookupBtn">Check</button>
                                </div>
                                <div id="recipientInfo" class="mt-2 text-xs"></div>
                            </div>
                            <div class="grid grid-cols-3 gap-3">
                                <div class="col-span-2"><label class="label">Amount</label><input class="input text-lg font-bold" name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00"></div>
                                <div><label class="label">Currency</label><select class="input text-lg font-bold" name="currency">${options(TP.currencies)}</select></div>
                            </div>
                            <div id="availHint" class="text-xs text-slate-400"></div>
                            <div><label class="label">Note (optional)</label><input class="input" name="note" maxlength="140" placeholder="Dinner split, tickets…"></div>
                            <div class="rounded-xl p-3 bg-cyan-500/5 border border-cyan-500/15 text-xs text-slate-400 flex gap-2">${icon('shield', 'w-4 h-4 text-cyan-400 shrink-0')} Every transfer is scored by the fraud engine. High-value transfers may require 2FA or a security review.</div>
                            <button class="btn btn-primary w-full" type="submit">${icon('send', 'w-4 h-4')} Send now</button>
                        </form>`)}
                </div>
                <div class="xl:col-span-2 space-y-6">
                    ${panel('Quick send', `<div class="space-y-2">${[
                        ['aysel@travelpay.com', 'Aysel Aliyeva'],
                        ['elvin@travelpay.com', 'Elvin Mammadov'],
                    ].filter(([e]) => e !== TP.user.email).map(([e, n]) => `
                        <button class="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left" data-pick="${e}">
                            <span class="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">${n.split(' ').map((p) => p[0]).join('')}</span>
                            <span><span class="block text-sm font-semibold text-white">${n}</span><span class="block text-[11px] text-slate-400">${e}</span></span>
                        </button>`).join('')}</div>`)}
                    ${panel('Your balances', `<div class="space-y-2">${s.balances.map((b) => `<div class="flex justify-between text-sm"><span class="text-slate-400">${b.currency_code}</span><span class="font-mono text-white">${num(b.available_balance)}</span></div>`).join('')}</div>`)}
                </div>
            </div>`;

            const form = el.querySelector('#sendForm');
            const info = el.querySelector('#recipientInfo');
            const hint = el.querySelector('#availHint');
            const updateHint = () => {
                const b = s.balances.find((x) => x.currency_code === form.currency.value);
                hint.textContent = b ? `Available: ${money(b.available_balance, b.currency_code)}` : '';
            };
            form.currency.addEventListener('change', updateHint);
            updateHint();

            const lookup = async () => {
                const q = form.recipient.value.trim();
                if (!q) return;
                info.innerHTML = '<span class="text-slate-500">Checking…</span>';
                try {
                    const { data } = await TP.api('/wallet/recipient-lookup', { body: { query: q } });
                    info.innerHTML = `<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300">${icon('check', 'w-3.5 h-3.5')} ${h(data.name)} · <span class="font-mono">${h(data.wallet_number)}</span></span>`;
                } catch (e) {
                    info.innerHTML = `<span class="text-red-400">${h(e.message)}</span>`;
                }
            };
            el.querySelector('#lookupBtn').addEventListener('click', lookup);
            el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { form.recipient.value = b.dataset.pick; lookup(); }));
            if (preset) lookup();

            TP.onSubmit(form, async (data) => {
                const ok = await TP.confirm('Confirm transfer', `Send <b class="text-white">${money(data.amount, data.currency)}</b> to <b class="text-white">${h(data.recipient)}</b>?`, 'Send');
                if (!ok) return;
                const res = await TP.api('/wallet/transfer', { body: data, idem: TP.idem() });
                TP.toast(res.message, res.data.status === 'held_for_review' ? 'warn' : 'success');
                TP.go('#/transactions');
            });
        },
    };

    // ------------------------------------------------------------------
    // QR Pay (pay, receive, receipts)
    // ------------------------------------------------------------------
    TP.payQr = async (tokenOrPayload) => {
        const token = String(tokenOrPayload || '').trim();
        if (!token) return;
        let req;
        try {
            req = (await TP.api('/payments/qr/' + encodeURIComponent(token.split('/').pop()))).data;
        } catch (e) {
            TP.toast(e.message, 'error');
            return;
        }
        if (req.status !== 'pending') {
            TP.toast(`This QR code is ${req.status}.`, 'warn');
            return;
        }
        await TP.modal(`
            <div class="flex items-center gap-3">
                <span class="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center">${icon(req.payee_type === 'merchant' ? 'pin' : 'users', 'w-6 h-6')}</span>
                <div><div class="text-xs text-slate-400">${req.payee_type === 'merchant' ? h(req.category || 'Merchant') : 'Payment request'}</div><div class="text-lg font-bold text-white">${h(req.payee)}</div></div>
            </div>
            ${req.description && req.payee_type !== 'merchant' ? `<p class="text-sm text-slate-300 mt-3">${h(req.description)}</p>` : ''}
            ${req.cashback_percent ? `<div class="mt-3">${chip(req.cashback_percent + '% cashback partner', 'green')}</div>` : ''}
            <form class="mt-5 space-y-4" data-payform>
                ${req.amount === null
                    ? `<div><label class="label">Amount (${req.currency_code})</label><input class="input text-2xl font-extrabold" name="amount" type="number" step="0.01" min="0.01" required autofocus placeholder="0.00"></div>`
                    : `<div class="text-center py-3"><div class="text-xs text-slate-400">Amount due</div><div class="text-4xl font-extrabold text-white">${money(req.amount, req.currency_code)}</div></div>`}
                <button class="btn btn-primary w-full" type="submit">${icon('check', 'w-4 h-4')} Pay ${req.amount !== null ? money(req.amount, req.currency_code) : ''}</button>
            </form>`, (box) => {
            TP.onSubmit(box.querySelector('[data-payform]'), async (data) => {
                const res = await TP.api(`/payments/qr/${encodeURIComponent(req.token)}/pay`, { body: data.amount ? { amount: data.amount } : {}, idem: TP.idem() });
                const d = res.data;
                TP.closeModal(true);
                TP.modal(`
                    <div class="text-center">
                        <div class="w-16 h-16 mx-auto rounded-full ${d.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-purple-500/15 text-purple-300'} flex items-center justify-center">${icon(d.status === 'completed' ? 'check' : 'lock', 'w-8 h-8')}</div>
                        <div class="text-lg font-bold text-white mt-4">${h(res.message)}</div>
                        <div class="text-3xl font-extrabold text-white mt-2">${money(d.amount, d.currency_code)}</div>
                        <div class="text-sm text-slate-400">to ${h(d.payee)}</div>
                        ${d.cashback ? `<div class="mt-3">${chip('+' + money(d.cashback, d.currency_code) + ' cashback', 'green')}</div>` : ''}
                        <div class="mt-5 text-left text-xs space-y-1.5 p-4 rounded-xl bg-white/5 font-mono">
                            <div class="flex justify-between"><span class="text-slate-500">Reference</span><span class="text-white">${h(d.reference)}</span></div>
                            ${d.receipt_number ? `<div class="flex justify-between"><span class="text-slate-500">Receipt</span><span class="text-white">${h(d.receipt_number)}</span></div>` : ''}
                            <div class="flex justify-between"><span class="text-slate-500">Risk score</span><span class="text-white">${d.risk_score}/100</span></div>
                        </div>
                        <button class="btn btn-ghost w-full mt-5" data-close>Done</button>
                    </div>`);
                if (location.hash.startsWith('#/qr') || location.hash.startsWith('#/dashboard')) TP.reload();
            });
        });
    };

    TP.pages.qr = {
        title: 'QR Pay',
        async render(el) {
            const [{ data: places }, { data: requests }, { data: receipts }] = await Promise.all([
                TP.api('/payments/places'),
                TP.api('/payments/requests'),
                TP.api('/payments/receipts'),
            ]);

            el.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div class="space-y-6">
                    ${panel('Scan & pay', `
                        <p class="text-sm text-slate-400">Paste a TravelPay QR link (<span class="font-mono">travelpay://pay/…</span>) or pick a nearby partner below — in the mobile app this opens the camera.</p>
                        <form id="scanForm" class="flex gap-2 mt-4">
                            <input class="input font-mono" name="token" required placeholder="travelpay://pay/…">
                            <button class="btn btn-primary" type="submit">${icon('qr', 'w-4 h-4')} Pay</button>
                        </form>
                        <div class="label mt-6">Nearby partners</div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${places.places.slice(0, 6).map((p) => `
                                <button class="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left" data-scan="${h(p.qr_token)}">
                                    <span class="w-9 h-9 shrink-0 rounded-lg bg-amber-500/10 text-amber-300 flex items-center justify-center">${icon('qr', 'w-4 h-4')}</span>
                                    <span class="min-w-0"><span class="block text-sm font-semibold text-white truncate">${h(p.name)}</span><span class="block text-[11px] text-slate-400">${h(p.category)}${p.cashback_percent ? ` · <span class="text-emerald-400">${num(p.cashback_percent, 0)}% back</span>` : ''}</span></span>
                                </button>`).join('')}
                        </div>`)}

                    ${panel('Payment receipts', receipts.length ? `<div class="divide-y divide-white/5">${receipts.slice(0, 8).map((r) => `
                        <div class="flex items-center gap-3 py-3">
                            <span class="w-9 h-9 rounded-lg bg-white/5 text-slate-300 flex items-center justify-center">${icon('receipt', 'w-4 h-4')}</span>
                            <div class="min-w-0 flex-1"><div class="text-sm font-semibold text-white truncate">${h(r.payee)}</div><div class="text-[11px] text-slate-500 font-mono">${h(r.receipt_number)} · ${TP.date(r.confirmed_at)}</div></div>
                            <div class="text-right"><div class="text-sm font-mono font-bold text-white">${money(r.amount, r.currency_code)}</div>${r.cashback ? `<div class="text-[10px] text-emerald-400">+${num(r.cashback)} back</div>` : ''}</div>
                        </div>`).join('')}</div>` : empty('No receipts yet', 'receipt'))}
                </div>

                <div class="space-y-6">
                    ${panel('Request money with a QR', `
                        <form id="requestForm" class="space-y-4">
                            <div class="grid grid-cols-3 gap-3">
                                <div class="col-span-2"><label class="label">Amount</label><input class="input" name="amount" type="number" step="0.01" min="0.01" required></div>
                                <div><label class="label">Currency</label><select class="input" name="currency">${options(TP.currencies)}</select></div>
                            </div>
                            <div class="grid grid-cols-3 gap-3">
                                <div class="col-span-2"><label class="label">What for?</label><input class="input" name="description" maxlength="140" placeholder="Museum tickets"></div>
                                <div><label class="label">Valid for</label><select class="input" name="expires_in_minutes">${options([[15, '15 min'], [60, '1 hour'], [1440, '1 day']], 60)}</select></div>
                            </div>
                            <button class="btn btn-primary w-full" type="submit">${icon('qr', 'w-4 h-4')} Generate QR</button>
                        </form>
                        <div id="requestResult"></div>`)}

                    ${panel('My payment requests', requests.length ? `<div class="divide-y divide-white/5">${requests.map((r) => `
                        <div class="flex items-center gap-3 py-3">
                            <div class="min-w-0 flex-1"><div class="text-sm font-semibold text-white">${money(r.amount, r.currency_code)} <span class="text-slate-400 font-normal">${h(r.description || '')}</span></div>
                            <div class="text-[11px] text-slate-500">${r.paid_by ? 'Paid by ' + h(r.paid_by) : 'Expires ' + TP.date(r.expires_at)}</div></div>
                            ${statusChip(r.status)}
                            ${r.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-show="${h(r.qr_payload)}" data-amount="${h(money(r.amount, r.currency_code))}">Show</button><button class="btn btn-danger btn-sm" data-cancel="${r.id}">Cancel</button>` : ''}
                        </div>`).join('')}</div>` : empty('No requests yet', 'qr'))}
                </div>
            </div>`;

            TP.onSubmit(el.querySelector('#scanForm'), async (d) => TP.payQr(d.token));
            el.querySelectorAll('[data-scan]').forEach((b) => b.addEventListener('click', () => TP.payQr(b.dataset.scan)));

            const showQr = (payload, amountText) => TP.modal(`
                <div class="text-center">
                    <h3 class="text-lg font-bold text-white">Scan to pay ${h(amountText)}</h3>
                    <p class="text-xs text-slate-400 mt-1">Any TravelPay user can scan this to pay you instantly.</p>
                    <div class="flex justify-center mt-5"><div class="qr-box" data-qr></div></div>
                    <button class="btn btn-ghost w-full mt-5" data-copyqr>${icon('copy', 'w-4 h-4')} Copy payment link</button>
                </div>`, (box) => {
                TP.qr(box.querySelector('[data-qr]'), payload, 220);
                box.querySelector('[data-copyqr]').addEventListener('click', () => TP.copy(payload));
            });

            TP.onSubmit(el.querySelector('#requestForm'), async (data) => {
                const res = await TP.api('/payments/requests', { body: data });
                TP.toast('Payment QR created');
                showQr(res.data.qr_payload, money(res.data.amount, res.data.currency_code));
                TP.reload();
            });
            el.querySelectorAll('[data-show]').forEach((b) => b.addEventListener('click', () => showQr(b.dataset.show, b.dataset.amount)));
            el.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', async () => {
                if (await TP.action(() => TP.api(`/payments/requests/${b.dataset.cancel}/cancel`, { body: {} }))) TP.reload();
            }));
        },
    };

    // ------------------------------------------------------------------
    // Exchange
    // ------------------------------------------------------------------
    TP.pages.exchange = {
        title: 'Currency Exchange',
        async render(el) {
            const [{ data: s }] = await Promise.all([TP.api('/wallet/summary')]);
            el.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div class="xl:col-span-3">
                    ${panel('Exchange between your currency pockets', `
                        <form id="fxForm" class="space-y-4">
                            <div class="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div class="flex justify-between text-xs text-slate-400 mb-2"><span>You sell</span><span id="fromAvail"></span></div>
                                <div class="flex gap-3"><input class="input text-2xl font-extrabold border-0 bg-transparent px-0" name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00">
                                <select class="input w-28 font-bold" name="from">${options(TP.currencies, 'EUR')}</select></div>
                            </div>
                            <div class="flex justify-center -my-2 relative z-10"><button type="button" id="swapBtn" class="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:rotate-180 transition">${icon('swap', 'w-5 h-5 rotate-90')}</button></div>
                            <div class="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div class="text-xs text-slate-400 mb-2">You receive</div>
                                <div class="flex gap-3 items-center"><div id="toAmount" class="flex-1 text-2xl font-extrabold text-emerald-300">0.00</div>
                                <select class="input w-28 font-bold" name="to">${options(TP.currencies, 'AZN')}</select></div>
                            </div>
                            <div id="quoteInfo" class="text-xs text-slate-400 space-y-1"></div>
                            <button class="btn btn-primary w-full" type="submit">${icon('swap', 'w-4 h-4')} Exchange</button>
                        </form>`)}
                </div>
                <div class="xl:col-span-2 space-y-6">
                    ${panel('Live rates', `<table class="data w-full"><tbody>${s.rates.map((r) => `<tr><td class="font-mono text-slate-300">${r.pair}</td><td class="text-right font-mono font-semibold text-white">${num(r.rate, 6)}</td></tr>`).join('')}</tbody></table>
                        <p class="text-[11px] text-slate-500 mt-3">Fee: 0.5% per conversion. Rates are pegged sandbox rates (1 USD = 1.70 AZN).</p>`)}
                    ${panel('Balances', `<div class="space-y-2">${s.balances.map((b) => `<div class="flex justify-between text-sm"><span class="text-slate-400">${b.currency_code}</span><span class="font-mono text-white">${num(b.available_balance)}</span></div>`).join('')}</div>`)}
                </div>
            </div>`;

            const form = el.querySelector('#fxForm');
            let timer;
            const quote = () => {
                clearTimeout(timer);
                const b = s.balances.find((x) => x.currency_code === form.from.value);
                el.querySelector('#fromAvail').textContent = b ? `Available ${money(b.available_balance, b.currency_code)}` : '';
                timer = setTimeout(async () => {
                    const amount = parseFloat(form.amount.value);
                    if (!amount || form.from.value === form.to.value) {
                        el.querySelector('#toAmount').textContent = '0.00';
                        el.querySelector('#quoteInfo').innerHTML = form.from.value === form.to.value ? '<span class="text-amber-300">Pick two different currencies.</span>' : '';
                        return;
                    }
                    try {
                        const { data: q } = await TP.api('/wallet/exchange/quote', { body: { amount, from: form.from.value, to: form.to.value } });
                        el.querySelector('#toAmount').textContent = num(q.to_amount);
                        el.querySelector('#quoteInfo').innerHTML = `<div class="flex justify-between"><span>Rate</span><span class="font-mono text-white">1 ${q.from_currency} = ${num(q.rate, 6)} ${q.to_currency}</span></div><div class="flex justify-between"><span>Fee (${q.fee_percent}%)</span><span class="font-mono text-white">${money(q.fee, q.from_currency)}</span></div>`;
                    } catch (e) { /* ignore while typing */ }
                }, 250);
            };
            ['input', 'change'].forEach((ev) => form.addEventListener(ev, quote));
            el.querySelector('#swapBtn').addEventListener('click', () => {
                const f = form.from.value;
                form.from.value = form.to.value;
                form.to.value = f;
                quote();
            });
            quote();

            TP.onSubmit(form, async (data) => {
                const res = await TP.api('/wallet/exchange', { body: data, idem: TP.idem() });
                TP.toast(`${res.message} ${money(res.data.amount, res.data.currency_code)} → ${money(res.data.metadata.to_amount, res.data.metadata.to_currency)}`);
                TP.reload();
            });
        },
    };

    // ------------------------------------------------------------------
    // Open Banking
    // ------------------------------------------------------------------
    TP.pages.topup = {
        title: 'Open Banking',
        async render(el) {
            const [{ data: accounts }, { data: banks }] = await Promise.all([
                TP.api('/open-banking/accounts'),
                TP.api('/open-banking/banks'),
            ]);

            el.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div class="space-y-6">
                    ${panel('Top up from your bank', accounts.length ? `
                        <form id="topupForm" class="space-y-4">
                            <div><label class="label">From account</label><select class="input" name="bank_account_id">${options(accounts.map((a) => [a.id, `${a.bank_name} · ${a.iban_masked} · ${money(a.available_balance, a.currency_code)}`]))}</select></div>
                            <div><label class="label">Amount</label><input class="input text-lg font-bold" name="amount" type="number" min="1" step="0.01" required placeholder="0.00"></div>
                            <div class="flex flex-wrap gap-2">${[50, 100, 250, 500].map((v) => `<button type="button" class="btn btn-ghost btn-sm" data-amt="${v}">+${v}</button>`).join('')}</div>
                            <button class="btn btn-primary w-full" type="submit">${icon('bank', 'w-4 h-4')} Top up instantly</button>
                        </form>` : empty('Link a bank account first to top up your wallet', 'bank'))}

                    ${panel('Linked accounts', accounts.length ? `<div class="space-y-3">${accounts.map((a) => `
                        <div class="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div class="flex items-center gap-3">
                                <span class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-300 flex items-center justify-center">${icon('bank', 'w-5 h-5')}</span>
                                <div class="min-w-0 flex-1"><div class="font-semibold text-white">${h(a.bank_name)}</div><div class="text-xs font-mono text-slate-400">${h(a.iban_masked)} · ${h(a.account_holder)}</div></div>
                                <button class="btn btn-danger btn-sm" data-revoke="${a.id}">Revoke</button>
                            </div>
                            <div class="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
                                ${a.consent_valid ? chip('Consent valid', 'green') : chip('Consent expired', 'red')}
                                <span class="text-slate-500">until ${TP.date(a.consent_expires_at, false)}</span>
                                <span class="ml-auto font-mono text-slate-300">Bank balance ${money(a.available_balance, a.currency_code)}</span>
                            </div>
                        </div>`).join('')}</div>` : empty('No linked accounts', 'bank'))}
                </div>

                ${panel('Link a new bank account', `
                    <form id="linkForm" class="space-y-4">
                        <div><label class="label">Bank</label><select class="input" name="bank_code">${options(banks.map((b) => [b.code, b.name]))}</select></div>
                        <div><label class="label">IBAN</label><input class="input font-mono uppercase" name="iban" required placeholder="AZ21NABZ00000000137010001944"></div>
                        <div class="grid grid-cols-3 gap-3">
                            <div class="col-span-2"><label class="label">Account holder</label><input class="input" name="account_holder" required value="${h(TP.user.name)}"></div>
                            <div><label class="label">Currency</label><select class="input" name="currency">${options(TP.currencies)}</select></div>
                        </div>
                        <label class="flex items-start gap-3 p-3 rounded-xl bg-white/5 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" name="consent" class="mt-0.5 accent-cyan-500" required>
                            <span>I authorise TravelPay to read my account balance and initiate top-up payments for <b>90 days</b> (PSD2-style consent). I can revoke it at any time.</span>
                        </label>
                        <div class="text-[11px] text-slate-500 flex gap-2">${icon('lock', 'w-4 h-4 shrink-0')} Only a masked IBAN and a one-way hash are stored. Your bank credentials never touch TravelPay.</div>
                        <button class="btn btn-primary w-full" type="submit">${icon('plus', 'w-4 h-4')} Link account</button>
                    </form>`)}
            </div>`;

            const topup = el.querySelector('#topupForm');
            if (topup) {
                el.querySelectorAll('[data-amt]').forEach((b) => b.addEventListener('click', () => { topup.amount.value = b.dataset.amt; }));
                TP.onSubmit(topup, async (data) => {
                    const res = await TP.api('/wallet/top-up', { body: data, idem: TP.idem() });
                    TP.toast(`${res.message} +${money(res.data.amount, res.data.currency_code)}`);
                    TP.reload();
                });
            }
            TP.onSubmit(el.querySelector('#linkForm'), async (data) => {
                data.iban = data.iban.replace(/\s+/g, '').toUpperCase();
                data.consent = data.consent ? 1 : 0;
                const res = await TP.api('/open-banking/accounts', { body: data });
                TP.toast(res.message);
                TP.reload();
            });
            el.querySelectorAll('[data-revoke]').forEach((b) => b.addEventListener('click', async () => {
                if (!(await TP.confirm('Revoke consent?', 'TravelPay will no longer be able to read this account or top up from it.', 'Revoke', true))) return;
                if (await TP.action(() => TP.api('/open-banking/accounts/' + b.dataset.revoke, { method: 'DELETE' }))) TP.reload();
            }));
        },
    };

    // ------------------------------------------------------------------
    // Virtual cards
    // ------------------------------------------------------------------
    TP.pages.cards = {
        title: 'Virtual Cards',
        async render(el) {
            const { data: cards } = await TP.api('/cards');

            el.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm text-slate-400 max-w-2xl">Tokenized cards for online bookings and abroad. Merchants only receive a <span class="text-cyan-300">token</span> — never a real card number — and you control limits, freezing and channels in real time.</p>
                    <button class="btn btn-primary" id="newCard">${icon('plus', 'w-4 h-4')} New card</button>
                </div>
                ${cards.length ? `<div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">${cards.map((c) => `
                    <div class="space-y-3">
                        <div class="vcard ${c.status !== 'active' ? 'frozen' : ''} rounded-2xl p-5 aspect-[1.586] flex flex-col justify-between shadow-2xl shadow-cyan-900/40 relative overflow-hidden">
                            <div class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10"></div>
                            <div class="relative flex justify-between items-start">
                                <div><div class="text-[10px] uppercase tracking-widest text-white/70 font-bold">TravelPay</div><div class="text-sm font-semibold text-white">${h(c.label)}</div></div>
                                <div class="text-lg font-extrabold italic text-white">${h(c.brand)}</div>
                            </div>
                            <div class="relative font-mono text-lg sm:text-xl tracking-widest text-white">${h(c.masked_pan)}</div>
                            <div class="relative flex justify-between items-end text-white">
                                <div><div class="text-[9px] uppercase text-white/60">Token</div><div class="text-[11px] font-mono">${h(c.token_preview)}</div></div>
                                <div class="text-right"><div class="text-[9px] uppercase text-white/60">Expires</div><div class="text-sm font-mono">${h(c.expiry)}</div></div>
                            </div>
                        </div>
                        <div class="glass rounded-2xl p-4 space-y-3">
                            <div class="flex items-center justify-between">${statusChip(c.status)} ${c.is_single_use ? chip('Single-use', 'purple') : ''}<span class="text-xs text-slate-400">${c.currency_code}</span></div>
                            <div>
                                <div class="flex justify-between text-xs"><span class="text-slate-400">Monthly limit</span><span class="font-mono text-white">${num(c.spent_this_month)} / ${num(c.spending_limit)}</span></div>
                                <div class="h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden"><div class="h-full bg-cyan-400 rounded-full" style="width:${Math.min(100, (c.spent_this_month / c.spending_limit) * 100)}%"></div></div>
                            </div>
                            <div class="flex flex-wrap gap-3 text-xs">
                                <label class="flex items-center gap-1.5 cursor-pointer text-slate-300"><input type="checkbox" class="accent-cyan-500" data-toggle="allow_online" data-id="${c.id}" ${c.allow_online ? 'checked' : ''} ${c.status === 'used' ? 'disabled' : ''}> Online</label>
                                <label class="flex items-center gap-1.5 cursor-pointer text-slate-300"><input type="checkbox" class="accent-cyan-500" data-toggle="allow_international" data-id="${c.id}" ${c.allow_international ? 'checked' : ''} ${c.status === 'used' ? 'disabled' : ''}> International</label>
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                ${c.status === 'used' ? '' : `<button class="btn btn-ghost btn-sm" data-freeze="${c.id}" data-status="${c.status === 'active' ? 'frozen' : 'active'}">${c.status === 'active' ? 'Freeze' : 'Unfreeze'}</button>
                                <button class="btn btn-ghost btn-sm" data-limit="${c.id}" data-current="${c.spending_limit}">Limit</button>
                                <button class="btn btn-primary btn-sm" data-charge="${c.id}" ${c.status !== 'active' ? 'disabled' : ''}>Pay</button>`}
                            </div>
                            <button class="w-full text-[11px] text-red-400/80 hover:text-red-300" data-cancel="${c.id}">Cancel card</button>
                        </div>
                    </div>`).join('')}</div>` : panel('', empty('No virtual cards yet — create one for safe online bookings', 'card'))}
            </div>`;

            el.querySelector('#newCard').addEventListener('click', () => TP.modal(`
                <h3 class="text-lg font-bold text-white">Issue a virtual card</h3>
                <form class="space-y-4 mt-4" data-newcard>
                    <div><label class="label">Card name</label><input class="input" name="label" maxlength="40" placeholder="Hotels & flights"></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="label">Currency</label><select class="input" name="currency">${options(TP.currencies)}</select></div>
                        <div><label class="label">Monthly limit</label><input class="input" name="spending_limit" type="number" min="10" value="500" required></div>
                    </div>
                    <label class="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="is_single_use" class="accent-cyan-500"> Single-use (burns after first payment)</label>
                    <button class="btn btn-primary w-full" type="submit">Issue card</button>
                </form>`, (box) => TP.onSubmit(box.querySelector('[data-newcard]'), async (data) => {
                await TP.api('/cards', { body: data });
                TP.closeModal();
                TP.toast('Virtual card issued');
                TP.reload();
            })));

            const patch = (id, body) => TP.action(() => TP.api('/cards/' + id, { method: 'PATCH', body })).then((r) => r && TP.reload());
            el.querySelectorAll('[data-freeze]').forEach((b) => b.addEventListener('click', () => patch(b.dataset.freeze, { status: b.dataset.status })));
            el.querySelectorAll('[data-toggle]').forEach((c) => c.addEventListener('change', () => patch(c.dataset.id, { [c.dataset.toggle]: c.checked })));
            el.querySelectorAll('[data-limit]').forEach((b) => b.addEventListener('click', () => TP.modal(`
                <h3 class="text-lg font-bold text-white">Monthly spending limit</h3>
                <form class="space-y-4 mt-4" data-limitform><input class="input text-lg font-bold" name="spending_limit" type="number" min="10" value="${b.dataset.current}" required><button class="btn btn-primary w-full" type="submit">Save</button></form>`,
                (box) => TP.onSubmit(box.querySelector('[data-limitform]'), async (data) => { TP.closeModal(); await patch(b.dataset.limit, data); }))));
            el.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', async () => {
                if (!(await TP.confirm('Cancel this card?', 'Its token will be permanently disabled.', 'Cancel card', true))) return;
                if (await TP.action(() => TP.api('/cards/' + b.dataset.cancel, { method: 'DELETE' }))) TP.reload();
            }));
            el.querySelectorAll('[data-charge]').forEach((b) => b.addEventListener('click', () => TP.modal(`
                <h3 class="text-lg font-bold text-white">Sandbox card payment</h3>
                <p class="text-xs text-slate-400 mt-1">Simulates a merchant charging this card's token.</p>
                <form class="space-y-4 mt-4" data-chargeform>
                    <div><label class="label">Merchant</label><input class="input" name="merchant" required value="Booking.com"></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="label">Amount</label><input class="input" name="amount" type="number" step="0.01" min="0.01" required value="45"></div>
                        <div><label class="label">Category</label><select class="input" name="category">${options(['Hotels', 'Restaurants', 'Transportation', 'Museums', 'Shopping', 'Entertainment', 'Other'])}</select></div>
                    </div>
                    <div class="flex gap-4 text-sm text-slate-300"><label class="flex items-center gap-2"><input type="checkbox" name="online" class="accent-cyan-500" checked> Online</label><label class="flex items-center gap-2"><input type="checkbox" name="international" class="accent-cyan-500"> International</label></div>
                    <button class="btn btn-primary w-full" type="submit">Authorise payment</button>
                </form>`, (box) => TP.onSubmit(box.querySelector('[data-chargeform]'), async (data) => {
                const res = await TP.api(`/cards/${b.dataset.charge}/charge`, { body: data, idem: TP.idem() });
                TP.closeModal();
                TP.toast(`${res.message} Auth code ${res.data.authorization_code}`);
                TP.reload();
            }))));
        },
    };

    // ------------------------------------------------------------------
    // Transactions
    // ------------------------------------------------------------------
    const TX_TYPES = ['top_up', 'transfer', 'exchange', 'payment', 'booking', 'card_payment', 'crypto_buy', 'crypto_sell', 'crypto_payment', 'refund'];
    const TX_STATUSES = ['completed', 'held_for_review', 'pending', 'failed', 'cancelled'];

    TP.pages.transactions = {
        title: 'Transactions',
        async render(el) {
            const state = { page: 1, type: '', status: '', currency: '', search: '' };

            el.innerHTML = `
            <div class="space-y-4">
                <form id="txFilters" class="glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <input class="input col-span-2 md:col-span-2" name="search" placeholder="Search description or reference…">
                    <select class="input" name="type"><option value="">All types</option>${options(TX_TYPES.map((t) => [t, TP.label(t)]))}</select>
                    <select class="input" name="status"><option value="">All statuses</option>${options(TX_STATUSES.map((t) => [t, TP.label(t)]))}</select>
                    <select class="input" name="currency"><option value="">All currencies</option>${options(TP.currencies)}</select>
                </form>
                <div class="glass rounded-2xl p-2" id="txList"></div>
                <div class="flex items-center justify-between" id="txPager"></div>
            </div>`;

            const list = el.querySelector('#txList');
            const pager = el.querySelector('#txPager');
            const load = async () => {
                list.innerHTML = '<div class="skeleton h-64 m-2"></div>';
                const res = await TP.api('/wallet/transactions', { query: { ...state, per_page: 15 } });
                list.innerHTML = res.data.length ? res.data.map(txRow).join('') : empty('No transactions match your filters', 'list');
                TP.bindTxRows(list);
                pager.innerHTML = `
                    <span class="text-xs text-slate-400">${res.meta.total} transactions · page ${res.meta.current_page} of ${res.meta.last_page}</span>
                    <div class="flex gap-2"><button class="btn btn-ghost btn-sm" data-p="-1" ${res.meta.current_page <= 1 ? 'disabled' : ''}>Previous</button><button class="btn btn-ghost btn-sm" data-p="1" ${res.meta.current_page >= res.meta.last_page ? 'disabled' : ''}>Next</button></div>`;
                pager.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { state.page += Number(b.dataset.p); load(); }));
            };

            let timer;
            el.querySelector('#txFilters').addEventListener('input', (e) => {
                clearTimeout(timer);
                timer = setTimeout(() => { state[e.target.name] = e.target.value; state.page = 1; load(); }, 250);
            });
            await load();
        },
    };
})();
