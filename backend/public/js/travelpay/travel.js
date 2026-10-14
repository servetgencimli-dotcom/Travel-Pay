/* =====================================================================
 * TravelPay — smart tourism pages: trips, bookings, places, virtual
 * assets, spending insights
 * ===================================================================== */
(function () {
    'use strict';
    const { h, icon, money, num, panel, stat, empty, chip, statusChip, options } = TP;

    // ------------------------------------------------------------------
    // Trips (list + detail at #/trips/{id})
    // ------------------------------------------------------------------
    TP.pages.trips = {
        title: 'Trips & Budget',
        async render(el, id) {
            if (id) return renderTrip(el, id);

            const { data: trips } = await TP.api('/trips');
            el.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm text-slate-400 max-w-2xl">Every wallet payment, booking and card charge made during a trip is logged automatically as a travel expense — with budget pacing and tips.</p>
                    <button class="btn btn-primary" id="newTrip">${icon('plus', 'w-4 h-4')} New trip</button>
                </div>
                ${trips.length ? `<div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">${trips.map((t) => {
                    const s = t.summary;
                    const pct = Math.min(100, s.usage_percent ?? 0);
                    return `
                    <a href="#/trips/${t.id}" class="glass rounded-2xl p-5 hover:border-cyan-500/40 transition block">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0"><div class="text-base font-bold text-white truncate">${h(t.title)}</div><div class="text-xs text-slate-400 mt-0.5">${h(t.destination_country)} · ${TP.date(t.start_date, false)} → ${TP.date(t.end_date, false)}</div></div>
                            ${statusChip(t.status)}
                        </div>
                        <div class="grid grid-cols-3 gap-2 mt-5 text-center">
                            <div class="p-2 rounded-xl bg-white/5"><div class="text-[10px] uppercase text-slate-500 font-bold">Spent</div><div class="text-sm font-bold text-white">${money(s.total_spent, s.base_currency)}</div></div>
                            <div class="p-2 rounded-xl bg-white/5"><div class="text-[10px] uppercase text-slate-500 font-bold">Budget</div><div class="text-sm font-bold text-white">${s.total_budget ? money(s.total_budget, s.base_currency) : '—'}</div></div>
                            <div class="p-2 rounded-xl bg-white/5"><div class="text-[10px] uppercase text-slate-500 font-bold">Days</div><div class="text-sm font-bold text-white">${s.trip_days}</div></div>
                        </div>
                        ${s.total_budget ? `<div class="h-2 rounded-full bg-white/10 mt-4 overflow-hidden"><div class="h-full rounded-full ${pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}" style="width:${pct}%"></div></div>
                        <div class="text-[11px] text-slate-400 mt-1.5">${num(pct, 1)}% of budget used</div>` : ''}
                    </a>`;
                }).join('')}</div>` : panel('', empty('No trips yet — create one to start tracking', 'map'))}
            </div>`;

            el.querySelector('#newTrip').addEventListener('click', () => TP.modal(`
                <h3 class="text-lg font-bold text-white">Plan a trip</h3>
                <form class="space-y-4 mt-4" data-trip>
                    <div><label class="label">Title</label><input class="input" name="title" required placeholder="Baku Discovery Week"></div>
                    <div><label class="label">Destination</label><input class="input" name="destination_country" required value="Azerbaijan"></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="label">Start</label><input class="input" type="date" name="start_date" required value="${new Date().toISOString().slice(0, 10)}"></div>
                        <div><label class="label">End</label><input class="input" type="date" name="end_date" required></div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div class="col-span-2"><label class="label">Budget</label><input class="input" type="number" name="budget" min="0" placeholder="1500"></div>
                        <div><label class="label">Currency</label><select class="input" name="base_currency">${options(TP.currencies)}</select></div>
                    </div>
                    <button class="btn btn-primary w-full" type="submit">Create trip</button>
                </form>`, (box) => TP.onSubmit(box.querySelector('[data-trip]'), async (data) => {
                const res = await TP.api('/trips', { body: data });
                TP.closeModal();
                TP.toast('Trip created');
                TP.go('#/trips/' + res.data.id);
            })));
        },
    };

    async function renderTrip(el, id) {
        const [{ data: t }, { data: categories }] = await Promise.all([TP.api('/trips/' + id), TP.api('/expense-categories')]);
        const s = t.summary;
        document.getElementById('pageTitle').textContent = t.title;

        el.innerHTML = `
        <div class="space-y-6">
            <div class="flex flex-wrap items-center gap-3">
                <a href="#/trips" class="btn btn-ghost btn-sm">← All trips</a>
                ${statusChip(t.status)}
                <span class="text-sm text-slate-400">${h(t.destination_country)} · ${TP.date(t.start_date, false)} → ${TP.date(t.end_date, false)}</span>
                <div class="ml-auto flex gap-2">
                    <select class="input py-1.5 text-xs w-auto" id="tripStatus">${options(['planned', 'active', 'completed', 'cancelled'].map((x) => [x, TP.label(x)]), t.status)}</select>
                    <button class="btn btn-danger btn-sm" id="deleteTrip">Delete</button>
                </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                ${stat('Spent', money(s.total_spent, s.base_currency), `${s.usage_percent ?? 0}% of budget`, 'cyan', 'wallet')}
                ${stat('Budget', s.total_budget ? money(s.total_budget, s.base_currency) : '—', `<button class="text-cyan-400 hover:underline" id="editBudget">Edit budget</button>`, 'emerald', 'chart')}
                ${stat('Remaining', money(s.remaining, s.base_currency), `${s.days_left} days left`, s.remaining < 0 ? 'red' : 'amber', 'map')}
                ${stat('Daily average', money(s.daily_average, s.base_currency), `Projected ${money(s.projected_total, s.base_currency)}`, 'purple', 'sparkle')}
            </div>

            ${s.tips.length ? `<div class="space-y-2">${s.tips.map((tip) => `<div class="rounded-xl p-3 bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-100 flex gap-2">${icon('sparkle', 'w-4 h-4 shrink-0 text-cyan-300 mt-0.5')} ${h(tip)}</div>`).join('')}</div>` : ''}

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                ${panel('Spending by category', s.by_category.length ? `<div class="h-56"><canvas id="catChart"></canvas></div>
                    <div class="mt-4 space-y-1.5">${s.by_category.map((c) => `<div class="flex items-center gap-2 text-xs"><span class="w-2.5 h-2.5 rounded-full" style="background:${h(c.color)}"></span><span class="flex-1 text-slate-300">${h(c.category)}</span><span class="font-mono text-white">${money(c.amount, s.base_currency)}</span></div>`).join('')}</div>`
                    : empty('No expenses yet', 'chart'))}
                <div class="xl:col-span-2 space-y-6">
                    ${panel('Expenses', t.expenses.length ? `<div class="divide-y divide-white/5">${t.expenses.map((e) => `
                        <div class="flex items-center gap-3 py-3">
                            <span class="w-2 h-8 rounded-full" style="background:${h(e.color || '#64748B')}"></span>
                            <div class="min-w-0 flex-1"><div class="text-sm font-semibold text-white truncate">${h(e.description || e.category)}</div>
                            <div class="text-[11px] text-slate-500">${h(e.category)} · ${TP.date(e.spent_at)} ${e.from_wallet ? '· ' + chip('wallet', 'cyan') : '· ' + chip('cash', 'slate')}</div></div>
                            <div class="text-right"><div class="text-sm font-mono font-bold text-white">${money(e.amount, e.currency)}</div>${e.currency !== e.reporting_currency ? `<div class="text-[10px] text-slate-500">≈ ${money(e.reporting_amount, e.reporting_currency)}</div>` : ''}</div>
                            ${!e.from_wallet ? `<button class="p-1.5 text-slate-500 hover:text-red-400" data-del="${e.id}" title="Remove">${icon('x', 'w-4 h-4')}</button>` : ''}
                        </div>`).join('')}</div>` : empty('Payments made during this trip appear here automatically', 'receipt'),
                    `<button class="btn btn-ghost btn-sm" id="addExpense">${icon('plus', 'w-3.5 h-3.5')} Cash expense</button>`)}
                    ${panel('Bookings on this trip', t.bookings.length ? `<div class="space-y-2">${t.bookings.map((b) => `
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <span class="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-300 flex items-center justify-center">${icon('briefcase', 'w-4 h-4')}</span>
                            <div class="min-w-0 flex-1"><div class="text-sm font-semibold text-white">${h(b.title)}</div><div class="text-[11px] text-slate-500">${h(b.booking_reference)} · ${TP.date(b.start_date, false)}</div></div>
                            ${statusChip(b.status)}
                        </div>`).join('')}</div>` : empty('No bookings linked', 'briefcase'), '<a href="#/bookings" class="text-xs text-cyan-400 hover:underline">Book</a>')}
                </div>
            </div>
        </div>`;

        if (s.by_category.length) {
            TP.chart(el.querySelector('#catChart'), {
                type: 'doughnut',
                data: { labels: s.by_category.map((c) => c.category), datasets: [{ data: s.by_category.map((c) => c.amount), backgroundColor: s.by_category.map((c) => c.color), borderWidth: 0 }] },
                options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } },
            });
        }

        el.querySelector('#tripStatus').addEventListener('change', async (e) => {
            if (await TP.action(() => TP.api('/trips/' + id, { method: 'PATCH', body: { status: e.target.value } }))) TP.reload();
        });
        el.querySelector('#deleteTrip').addEventListener('click', async () => {
            if (!(await TP.confirm('Delete trip?', 'Expenses on this trip will be removed. Wallet transactions are kept.', 'Delete', true))) return;
            if (await TP.action(() => TP.api('/trips/' + id, { method: 'DELETE' }))) TP.go('#/trips');
        });
        el.querySelector('#editBudget').addEventListener('click', () => TP.modal(`
            <h3 class="text-lg font-bold text-white">Trip budget (${t.base_currency})</h3>
            <form class="space-y-4 mt-4" data-budget><input class="input text-lg font-bold" name="amount" type="number" min="0" step="0.01" value="${s.total_budget}" required><button class="btn btn-primary w-full" type="submit">Save budget</button></form>`,
            (box) => TP.onSubmit(box.querySelector('[data-budget]'), async (data) => {
                await TP.api(`/trips/${id}/budget`, { method: 'PUT', body: data });
                TP.closeModal();
                TP.reload();
            })));
        el.querySelector('#addExpense').addEventListener('click', () => TP.modal(`
            <h3 class="text-lg font-bold text-white">Add a cash / external expense</h3>
            <form class="space-y-4 mt-4" data-exp>
                <div><label class="label">Category</label><select class="input" name="expense_category_id">${options(categories.map((c) => [c.id, c.name]))}</select></div>
                <div class="grid grid-cols-3 gap-3">
                    <div class="col-span-2"><label class="label">Amount</label><input class="input" name="amount" type="number" step="0.01" min="0.01" required></div>
                    <div><label class="label">Currency</label><select class="input" name="currency">${options(TP.currencies, t.base_currency)}</select></div>
                </div>
                <div><label class="label">Description</label><input class="input" name="description" maxlength="140"></div>
                <button class="btn btn-primary w-full" type="submit">Add expense</button>
            </form>`, (box) => TP.onSubmit(box.querySelector('[data-exp]'), async (data) => {
            await TP.api(`/trips/${id}/expenses`, { body: data });
            TP.closeModal();
            TP.reload();
        })));
        el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
            if (await TP.action(() => TP.api(`/trips/${id}/expenses/${b.dataset.del}`, { method: 'DELETE' }))) TP.reload();
        }));
    }

    // ------------------------------------------------------------------
    // Bookings (hotels, flights, tours) with wallet or crypto payment
    // ------------------------------------------------------------------
    TP.pages.bookings = {
        title: 'Hotels & Flights',
        async render(el) {
            const [{ data: catalog }, { data: bookings }, { data: portfolio }, { data: trips }] = await Promise.all([
                TP.api('/bookings/catalog'),
                TP.api('/bookings'),
                TP.api('/crypto/portfolio'),
                TP.api('/trips'),
            ]);
            let filter = 'hotel';

            el.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-wrap items-center gap-2">
                    ${[['hotel', 'Hotels'], ['flight', 'Flights'], ['tour', 'Tours']].map(([k, l]) => `<button class="tab ${k === filter ? 'active' : ''}" data-type="${k}">${l}</button>`).join('')}
                    <input class="input md:w-72 ml-auto" id="catSearch" placeholder="Search Baku, Sheki, AZAL…">
                </div>
                <div id="catalog" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"></div>
                ${panel('My bookings', bookings.length ? `<div class="overflow-x-auto"><table class="data w-full">
                    <thead><tr><th>Booking</th><th>Dates</th><th>Paid</th><th>Trip</th><th>Status</th><th></th></tr></thead>
                    <tbody>${bookings.map((b) => `<tr>
                        <td><div class="font-semibold text-white">${h(b.title)}</div><div class="text-[11px] font-mono text-slate-500">${h(b.booking_reference)} · ${h(b.provider)}</div></td>
                        <td class="text-xs text-slate-300">${TP.date(b.start_date, false)}${b.end_date ? ' → ' + TP.date(b.end_date, false) : ''}<div class="text-slate-500">${b.quantity} ${b.booking_type === 'hotel' ? 'night(s)' : b.booking_type === 'flight' ? 'passenger(s)' : 'person(s)'}</div></td>
                        <td class="font-mono text-xs">${b.payment_method === 'crypto' ? `<span class="text-orange-300">${TP.crypto(b.crypto_amount)} ${h(b.crypto_asset)}</span>` : money(b.amount, b.currency_code)}</td>
                        <td class="text-xs text-slate-400">${h(b.trip?.title || '—')}</td>
                        <td>${statusChip(b.status)}</td>
                        <td class="text-right">${b.status === 'confirmed' ? `<button class="btn btn-danger btn-sm" data-cancel="${b.id}">Cancel</button>` : ''}</td>
                    </tr>`).join('')}</tbody></table></div>` : empty('No bookings yet', 'briefcase'))}
            </div>`;

            const grid = el.querySelector('#catalog');
            const draw = () => {
                const q = el.querySelector('#catSearch').value.toLowerCase();
                const items = catalog.filter((i) => i.type === filter && (!q || `${i.title} ${i.destination} ${i.provider}`.toLowerCase().includes(q)));
                grid.innerHTML = items.length ? items.map((i) => `
                    <div class="glass rounded-2xl p-5 flex flex-col">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0"><div class="text-base font-bold text-white">${h(i.title)}</div><div class="text-xs text-slate-400">${h(i.provider)} · ${h(i.destination)}</div></div>
                            <span class="flex items-center gap-1 text-xs text-amber-300">${icon('star', 'w-3.5 h-3.5')} ${num(i.rating, 1)}</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5 mt-3">${i.accepts_crypto ? chip('Accepts crypto', 'amber') : ''}${chip(TP.label(i.type), 'cyan')}</div>
                        <div class="flex items-end justify-between mt-auto pt-5">
                            <div><div class="text-2xl font-extrabold text-white">${money(i.price, i.currency)}</div><div class="text-[11px] text-slate-500">per ${i.unit}${i.currency !== 'AZN' ? ' · ≈ ' + money(i.price_azn) : ''}</div></div>
                            <button class="btn btn-primary btn-sm" data-book="${h(i.code)}">Book</button>
                        </div>
                    </div>`).join('') : `<div class="md:col-span-2 2xl:col-span-3">${panel('', empty('No offers match', 'briefcase'))}</div>`;
                grid.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => openBooking(catalog.find((i) => i.code === b.dataset.book), portfolio, trips)));
            };
            el.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
                filter = b.dataset.type;
                el.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('active', x === b));
                draw();
            }));
            el.querySelector('#catSearch').addEventListener('input', draw);
            draw();

            el.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', async () => {
                if (!(await TP.confirm('Cancel booking?', 'Free cancellation: the full amount is refunded to the original payment method.', 'Cancel booking', true))) return;
                if (await TP.action(() => TP.api(`/bookings/${b.dataset.cancel}/cancel`, { body: {} }))) TP.reload();
            }));
        },
    };

    function openBooking(item, portfolio, trips) {
        const unitLabel = item.type === 'hotel' ? 'Nights' : item.type === 'flight' ? 'Passengers' : 'People';
        const assets = portfolio.prices;
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

        TP.modal(`
            <div class="text-xs text-slate-400">${h(item.provider)} · ${h(item.destination)}</div>
            <h3 class="text-lg font-bold text-white">${h(item.title)}</h3>
            <form class="space-y-4 mt-5" data-bookform>
                <input type="hidden" name="catalog_code" value="${h(item.code)}">
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="label">${item.type === 'hotel' ? 'Check-in' : 'Date'}</label><input class="input" type="date" name="start_date" min="${new Date().toISOString().slice(0, 10)}" value="${tomorrow}" required></div>
                    <div><label class="label">${unitLabel}</label><input class="input" type="number" name="quantity" min="1" max="30" value="${item.type === 'hotel' ? 2 : 1}" required></div>
                </div>
                <div><label class="label">Link to trip</label><select class="input" name="trip_id"><option value="">Auto-detect by date</option>${options(trips.map((t) => [t.id, t.title]))}</select></div>
                <div>
                    <label class="label">Pay with</label>
                    <div class="grid grid-cols-2 gap-2">
                        <label class="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer"><input type="radio" name="payment_method" value="wallet" checked class="accent-cyan-500"> <span class="text-sm text-white">Wallet (${item.currency})</span></label>
                        <label class="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 ${item.accepts_crypto ? 'cursor-pointer' : 'opacity-40'}"><input type="radio" name="payment_method" value="crypto" ${item.accepts_crypto ? '' : 'disabled'} class="accent-cyan-500"> <span class="text-sm text-white">Virtual assets</span></label>
                    </div>
                </div>
                <div id="cryptoPick" class="hidden"><label class="label">Asset</label><select class="input" name="crypto_asset">${options(assets.map((a) => {
                    const held = portfolio.holdings.find((x) => x.asset_code === a.code);
                    return [a.code, `${a.code} — balance ${TP.crypto(held ? held.amount : 0)}`];
                }))}</select></div>
                <div class="p-4 rounded-xl bg-white/5 flex items-center justify-between"><span class="text-sm text-slate-400">Total</span><span class="text-xl font-extrabold text-white" id="bookTotal"></span></div>
                <button class="btn btn-primary w-full" type="submit">Confirm & pay</button>
            </form>`, (box) => {
            const form = box.querySelector('[data-bookform]');
            const total = () => {
                const qty = Math.max(1, parseInt(form.quantity.value || '1', 10));
                const isCrypto = form.payment_method.value === 'crypto';
                box.querySelector('#cryptoPick').classList.toggle('hidden', !isCrypto);
                let text = money(item.price * qty, item.currency);
                if (isCrypto) {
                    const a = assets.find((x) => x.code === form.crypto_asset.value);
                    if (a) text += ` ≈ ${TP.crypto((item.price_azn * qty) / a.sell_price_azn)} ${a.code}`;
                }
                box.querySelector('#bookTotal').textContent = text;
            };
            form.addEventListener('input', total);
            form.addEventListener('change', total);
            total();
            TP.onSubmit(form, async (data) => {
                if (!data.trip_id) delete data.trip_id;
                if (data.payment_method !== 'crypto') delete data.crypto_asset;
                const res = await TP.api('/bookings', { body: data, idem: TP.idem() });
                TP.closeModal();
                TP.toast(res.message);
                TP.reload();
            });
        });
    }

    // ------------------------------------------------------------------
    // Explore places (partner merchants)
    // ------------------------------------------------------------------
    TP.pages.places = {
        title: 'Explore Places',
        async render(el) {
            const { data } = await TP.api('/payments/places');
            let category = '';
            const catIcon = { Museums: 'book', Restaurants: 'sparkle', Transportation: 'map', Entertainment: 'star', Shopping: 'briefcase' };

            el.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-wrap gap-2" id="cats">
                    <button class="tab active" data-cat="">All</button>
                    ${data.categories.map((c) => `<button class="tab" data-cat="${h(c)}">${h(c)}</button>`).join('')}
                </div>
                <div id="placeGrid" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"></div>
            </div>`;

            const grid = el.querySelector('#placeGrid');
            const draw = () => {
                const list = data.places.filter((p) => !category || p.category === category);
                grid.innerHTML = list.map((p) => `
                    <div class="glass rounded-2xl p-5 flex flex-col">
                        <div class="flex items-start gap-3">
                            <span class="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 text-cyan-300 flex items-center justify-center">${icon(catIcon[p.category] || 'pin', 'w-5 h-5')}</span>
                            <div class="min-w-0 flex-1">
                                <div class="font-bold text-white">${h(p.name)}</div>
                                <div class="text-xs text-slate-400">${h(p.category)} · ${h(p.city)}</div>
                            </div>
                            <span class="flex items-center gap-1 text-xs text-amber-300">${icon('star', 'w-3.5 h-3.5')} ${num(p.rating, 1)}</span>
                        </div>
                        <p class="text-sm text-slate-300 mt-3">${h(p.description)}</p>
                        <div class="text-[11px] text-slate-500 mt-2 flex items-center gap-1">${icon('pin', 'w-3.5 h-3.5')} ${h(p.address)}</div>
                        <div class="flex flex-wrap gap-1.5 mt-3">${p.cashback_percent ? chip(num(p.cashback_percent, 0) + '% cashback', 'green') : ''}${p.accepts_crypto ? chip('Crypto friendly', 'amber') : ''}</div>
                        <div class="grid grid-cols-2 gap-2 mt-auto pt-4">
                            <button class="btn btn-ghost btn-sm" data-showqr="${h(p.qr_token)}" data-name="${h(p.name)}">${icon('qr', 'w-3.5 h-3.5')} Merchant QR</button>
                            <button class="btn btn-primary btn-sm" data-pay="${h(p.qr_token)}">Pay here</button>
                        </div>
                    </div>`).join('');
                grid.querySelectorAll('[data-pay]').forEach((b) => b.addEventListener('click', () => TP.payQr(b.dataset.pay)));
                grid.querySelectorAll('[data-showqr]').forEach((b) => b.addEventListener('click', () => TP.modal(`
                    <div class="text-center"><h3 class="text-lg font-bold text-white">${h(b.dataset.name)}</h3><p class="text-xs text-slate-400 mt-1">Static merchant QR — displayed at the counter</p>
                    <div class="flex justify-center mt-5"><div class="qr-box" data-qr></div></div>
                    <div class="text-[11px] font-mono text-slate-500 mt-3 break-all">travelpay://pay/${h(b.dataset.showqr)}</div></div>`,
                    (box) => TP.qr(box.querySelector('[data-qr]'), 'travelpay://pay/' + b.dataset.showqr, 220))));
            };
            el.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
                category = b.dataset.cat;
                el.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('active', x === b));
                draw();
            }));
            draw();
        },
    };

    // ------------------------------------------------------------------
    // Virtual assets
    // ------------------------------------------------------------------
    TP.pages.crypto = {
        title: 'Virtual Assets',
        async render(el) {
            const { data: p } = await TP.api('/crypto/portfolio');

            el.innerHTML = `
            <div class="space-y-6">
                <div class="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex gap-2">${icon('alert', 'w-4 h-4 shrink-0')} Sandbox virtual assets with simulated prices. Use them to pay crypto-friendly hotels, flights and tours. 1% spread on buy/sell.</div>
                <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    ${p.prices.map((a) => `
                    <div class="glass rounded-2xl p-5">
                        <div class="flex items-center gap-3">
                            <span class="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-extrabold" style="background:${h(a.color)}22;color:${h(a.color)}">${h(a.code)}</span>
                            <div><div class="text-sm font-bold text-white">${h(a.name)}</div><div class="text-[11px] text-slate-500">${h(a.network)}</div></div>
                        </div>
                        <div class="text-xl font-extrabold text-white mt-4">${money(a.price_azn)}</div>
                        <div class="text-xs mt-1 ${a.change_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}">${a.change_24h >= 0 ? '▲' : '▼'} ${num(Math.abs(a.change_24h))}% 24h</div>
                    </div>`).join('')}
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div class="xl:col-span-2 space-y-6">
                        ${panel(`Portfolio · ${money(p.total_value_azn)}`, p.holdings.length ? `<div class="overflow-x-auto"><table class="data w-full">
                            <thead><tr><th>Asset</th><th class="text-right">Amount</th><th class="text-right">Avg cost</th><th class="text-right">Value</th><th class="text-right">P&L</th></tr></thead>
                            <tbody>${p.holdings.map((c) => `<tr>
                                <td><span class="font-bold" style="color:${h(c.color)}">${h(c.asset_code)}</span> <span class="text-xs text-slate-500">${h(c.name)}</span></td>
                                <td class="text-right font-mono text-white">${TP.crypto(c.amount)}</td>
                                <td class="text-right font-mono text-slate-400">${money(c.average_cost_azn)}</td>
                                <td class="text-right font-mono text-white">${money(c.value_azn)}</td>
                                <td class="text-right font-mono ${c.pnl_azn >= 0 ? 'text-emerald-400' : 'text-red-400'}">${c.pnl_azn >= 0 ? '+' : ''}${num(c.pnl_azn)} (${num(c.pnl_percent)}%)</td></tr>`).join('')}</tbody></table></div>`
                            : empty('You do not hold any virtual assets yet', 'coin'))}
                        ${panel('History', p.history.length ? `<div class="divide-y divide-white/5">${p.history.map((tx) => `
                            <div class="flex items-center gap-3 py-3">
                                ${chip(TP.label(tx.type), tx.type === 'crypto_buy' ? 'green' : tx.type === 'crypto_sell' ? 'red' : 'amber')}
                                <span class="flex-1 text-sm text-slate-300 truncate">${h(tx.description)}</span>
                                <span class="font-mono text-sm text-white">${money(tx.amount, tx.currency_code)}</span>
                                <span class="text-[11px] text-slate-500 hidden sm:inline">${TP.date(tx.created_at)}</span>
                            </div>`).join('')}</div>` : empty('No trades yet', 'list'))}
                    </div>
                    ${panel('Trade', `
                        <div class="flex gap-2 mb-4"><button class="tab active" data-side="buy">Buy</button><button class="tab" data-side="sell">Sell</button></div>
                        <form id="buyForm" class="space-y-4">
                            <div><label class="label">Asset</label><select class="input" name="asset">${options(p.prices.map((a) => [a.code, `${a.code} · ${money(a.buy_price_azn)}`]))}</select></div>
                            <div><label class="label">Spend (AZN)</label><input class="input text-lg font-bold" name="amount_azn" type="number" min="5" step="0.01" required placeholder="100"></div>
                            <div class="text-xs text-slate-400" id="buyEst"></div>
                            <button class="btn btn-primary w-full" type="submit">Buy</button>
                        </form>
                        <form id="sellForm" class="space-y-4 hidden">
                            <div><label class="label">Asset</label><select class="input" name="asset">${options(p.prices.map((a) => {
                                const held = p.holdings.find((x) => x.asset_code === a.code);
                                return [a.code, `${a.code} · held ${TP.crypto(held ? held.amount : 0)}`];
                            }))}</select></div>
                            <div><label class="label">Units</label><input class="input text-lg font-bold" name="units" type="number" min="0.00000001" step="any" required></div>
                            <div class="text-xs text-slate-400" id="sellEst"></div>
                            <button class="btn btn-danger w-full" type="submit">Sell</button>
                        </form>`)}
                </div>
            </div>`;

            const buy = el.querySelector('#buyForm');
            const sell = el.querySelector('#sellForm');
            el.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => {
                el.querySelectorAll('[data-side]').forEach((x) => x.classList.toggle('active', x === b));
                buy.classList.toggle('hidden', b.dataset.side !== 'buy');
                sell.classList.toggle('hidden', b.dataset.side !== 'sell');
            }));
            const est = () => {
                const a = p.prices.find((x) => x.code === buy.asset.value);
                const amt = parseFloat(buy.amount_azn.value || 0);
                el.querySelector('#buyEst').textContent = a && amt ? `≈ ${TP.crypto(amt / a.buy_price_azn)} ${a.code}` : '';
                const s = p.prices.find((x) => x.code === sell.asset.value);
                const units = parseFloat(sell.units.value || 0);
                el.querySelector('#sellEst').textContent = s && units ? `≈ ${money(units * s.sell_price_azn)}` : '';
            };
            [buy, sell].forEach((f) => f.addEventListener('input', est));
            TP.onSubmit(buy, async (data) => {
                const res = await TP.api('/crypto/buy', { body: data, idem: TP.idem() });
                TP.toast(res.message);
                TP.reload();
            });
            TP.onSubmit(sell, async (data) => {
                const res = await TP.api('/crypto/sell', { body: data, idem: TP.idem() });
                TP.toast(res.message);
                TP.reload();
            });
        },
    };

    // ------------------------------------------------------------------
    // Spending insights (data analytics)
    // ------------------------------------------------------------------
    TP.pages.insights = {
        title: 'Spending Insights',
        async render(el, days) {
            const period = Number(days) || 30;
            const { data: d } = await TP.api('/insights', { query: { days: period } });

            el.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-wrap items-center gap-2">
                    ${[7, 30, 90].map((n) => `<a href="#/insights/${n}" class="tab ${n === period ? 'active' : ''}">${n} days</a>`).join('')}
                </div>
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${stat('Spent', money(d.total_spent_azn), `${d.transaction_count} payments`, 'cyan', 'up')}
                    ${stat('Received', money(d.total_received_azn), `Net ${d.net_flow_azn >= 0 ? '+' : ''}${money(d.net_flow_azn)}`, 'emerald', 'down')}
                    ${stat('Average payment', money(d.average_transaction_azn), `Largest ${money(d.largest_transaction_azn)}`, 'purple', 'chart')}
                    ${stat('Cashback earned', money(d.cashback_earned), 'from partner merchants', 'amber', 'sparkle')}
                </div>
                ${d.tips.length ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${d.tips.map((t) => `<div class="rounded-xl p-3 bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-100 flex gap-2">${icon('sparkle', 'w-4 h-4 shrink-0 text-cyan-300 mt-0.5')} ${h(t)}</div>`).join('')}</div>` : ''}
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    ${panel('Daily spending (AZN)', '<div class="h-64"><canvas id="dailyChart"></canvas></div>', '', 'xl:col-span-2')}
                    ${panel('By category', d.by_category.length ? '<div class="h-64"><canvas id="catChart"></canvas></div>' : empty('No spending in this period', 'chart'))}
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    ${panel('By weekday', '<div class="h-56"><canvas id="weekChart"></canvas></div>')}
                    ${panel('Top merchants', d.top_merchants.length ? `<div class="space-y-2">${d.top_merchants.map((m, i) => `
                        <div class="flex items-center gap-3 p-2.5 rounded-xl bg-white/5"><span class="w-6 text-center text-xs font-bold text-slate-500">${i + 1}</span><span class="flex-1 text-sm text-white truncate">${h(m.merchant)}</span><span class="text-[11px] text-slate-500">${m.visits}×</span><span class="font-mono text-sm text-white">${money(m.amount_azn)}</span></div>`).join('')}</div>` : empty('No merchant payments', 'pin'))}
                    ${panel('Category breakdown', d.by_category.length ? `<div class="space-y-3">${d.by_category.map((c, i) => `
                        <div><div class="flex justify-between text-xs"><span class="text-slate-300">${h(c.category)}</span><span class="font-mono text-white">${money(c.amount_azn)} · ${c.share}%</span></div>
                        <div class="h-1.5 rounded-full bg-white/10 mt-1"><div class="h-full rounded-full" style="width:${c.share}%;background:${TP.palette[i % TP.palette.length]}"></div></div></div>`).join('')}</div>` : empty('—', 'chart'))}
                </div>
            </div>`;

            const grid = { color: 'rgba(255,255,255,0.05)' };
            TP.chart(el.querySelector('#dailyChart'), {
                type: 'line',
                data: { labels: d.daily.map((x) => x.date.slice(5)), datasets: [{ data: d.daily.map((x) => x.amount_azn), borderColor: '#22D3EE', backgroundColor: 'rgba(34,211,238,0.12)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }] },
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { grid, beginAtZero: true } } },
            });
            if (d.by_category.length) {
                TP.chart(el.querySelector('#catChart'), {
                    type: 'doughnut',
                    data: { labels: d.by_category.map((c) => c.category), datasets: [{ data: d.by_category.map((c) => c.amount_azn), backgroundColor: TP.palette, borderWidth: 0 }] },
                    options: { maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } },
                });
            }
            TP.chart(el.querySelector('#weekChart'), {
                type: 'bar',
                data: { labels: d.by_weekday.map((x) => x.day), datasets: [{ data: d.by_weekday.map((x) => x.amount_azn), backgroundColor: 'rgba(52,211,153,0.6)', borderRadius: 6 }] },
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid, beginAtZero: true } } },
            });
        },
    };
})();
