/* =====================================================================
 * TravelPay — security pages: security center, eKYC
 * ===================================================================== */
(function () {
    'use strict';
    const { h, icon, panel, empty, chip, statusChip, options } = TP;

    const SEVERITY_COLOR = { info: 'text-slate-400', low: 'text-cyan-300', medium: 'text-amber-300', high: 'text-red-300', critical: 'text-red-400' };

    TP.pages.security = {
        title: 'Security Center',
        async render(el) {
            const [{ data: score }, { data: devices }, { data: sessions }, events, alerts, { data: summary }] = await Promise.all([
                TP.api('/security/score'),
                TP.api('/security/devices'),
                TP.api('/security/sessions'),
                TP.api('/security/events', { query: { per_page: 12 } }),
                TP.api('/security/alerts', { query: { per_page: 6 } }),
                TP.api('/wallet/summary'),
            ]);
            const frozen = summary.wallet.status !== 'active';
            const ringColor = score.score >= 70 ? '#34D399' : score.score >= 50 ? '#FBBF24' : '#F87171';

            el.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    ${panel('Security score', `
                        <div class="flex items-center gap-6">
                            <div class="relative w-32 h-32 shrink-0">
                                <svg viewBox="0 0 36 36" class="w-32 h-32 -rotate-90"><circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2.6"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="${ringColor}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${score.score} 100"/></svg>
                                <div class="absolute inset-0 flex flex-col items-center justify-center"><span class="text-3xl font-extrabold text-white">${score.score}</span><span class="text-xs text-slate-400">Grade ${score.grade}</span></div>
                            </div>
                            <ul class="space-y-2 text-sm min-w-0">
                                ${score.checks.map((c) => `<li class="flex items-start gap-2 ${c.ok ? 'text-slate-300' : 'text-amber-300'}">${icon(c.ok ? 'check' : 'alert', 'w-4 h-4 shrink-0 mt-0.5')}<span>${h(c.label)} <span class="text-[10px] text-slate-500">+${c.weight}</span></span></li>`).join('')}
                            </ul>
                        </div>`, '', 'xl:col-span-2')}

                    <section class="rounded-2xl p-5 border ${frozen ? 'bg-red-500/10 border-red-500/30' : 'glass'}">
                        <div class="flex items-center gap-3">
                            <span class="w-11 h-11 rounded-xl ${frozen ? 'bg-red-500/20 text-red-300' : 'bg-cyan-500/10 text-cyan-300'} flex items-center justify-center">${icon('lock', 'w-6 h-6')}</span>
                            <div><div class="text-sm font-bold text-white">Panic button</div><div class="text-xs text-slate-400">Wallet is <b class="${frozen ? 'text-red-300' : 'text-emerald-300'}">${frozen ? 'FROZEN' : 'active'}</b></div></div>
                        </div>
                        <p class="text-xs text-slate-400 mt-3">Lost your phone or see a payment you don't recognise? Freeze instantly: all outgoing payments stop and every other session is signed out.</p>
                        ${frozen
                            ? `<form id="unfreezeForm" class="mt-4 space-y-2"><input class="input" type="password" name="password" required placeholder="Password to unfreeze"><button class="btn btn-primary w-full" type="submit">Unfreeze wallet</button></form>`
                            : `<button class="btn btn-danger w-full mt-4" id="freezeBtn">${icon('lock', 'w-4 h-4')} Freeze my wallet</button>`}
                    </section>
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    ${panel('Two-factor authentication', `
                        <div class="flex items-center justify-between gap-3">
                            <div><div class="text-sm text-white font-semibold">Authenticator / OTP</div><div class="text-xs text-slate-400">Required at sign-in and for high-value payments (step-up).</div></div>
                            ${TP.user.two_factor_enabled ? chip('Enabled', 'green') : chip('Disabled', 'amber')}
                        </div>
                        <div id="twofa" class="mt-4">
                            ${TP.user.two_factor_enabled
                                ? '<button class="btn btn-danger" id="disable2fa">Disable 2FA</button>'
                                : '<button class="btn btn-primary" id="enable2fa">Enable 2FA</button>'}
                        </div>`)}

                    ${panel('Change password', `
                        <form id="pwForm" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input class="input" type="password" name="current_password" required placeholder="Current" autocomplete="current-password">
                            <input class="input" type="password" name="password" required minlength="8" placeholder="New" autocomplete="new-password">
                            <input class="input" type="password" name="password_confirmation" required minlength="8" placeholder="Confirm" autocomplete="new-password">
                            <button class="btn btn-primary sm:col-span-3" type="submit">Update password</button>
                        </form>
                        <p class="text-[11px] text-slate-500 mt-2">Changing your password signs out every other session.</p>`)}
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    ${panel('Devices', devices.length ? `<div class="space-y-2">${devices.map((d) => `
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <span class="w-9 h-9 rounded-lg ${d.is_trusted ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'} flex items-center justify-center">${icon('device', 'w-4 h-4')}</span>
                            <div class="min-w-0 flex-1"><div class="text-sm font-semibold text-white truncate">${h(d.device_name)} ${d.device_uuid === TP.store.get('tp_device_id') ? chip('this device', 'cyan') : ''}</div>
                            <div class="text-[11px] text-slate-500">${h(d.os)} · ${h(d.ip_address)} · ${TP.ago(d.last_active_at)}</div></div>
                            <button class="btn btn-ghost btn-sm" data-trust="${d.id}" data-val="${d.is_trusted ? 0 : 1}">${d.is_trusted ? 'Untrust' : 'Trust'}</button>
                            <button class="btn btn-danger btn-sm" data-revoke-device="${d.id}">Remove</button>
                        </div>`).join('')}</div>` : empty('No devices', 'device'))}

                    ${panel('Active sessions', `<div class="space-y-2">${sessions.map((s) => `
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <span class="w-2 h-2 rounded-full ${s.current ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
                            <div class="min-w-0 flex-1"><div class="text-sm text-white">Session #${s.id} ${s.current ? chip('current', 'green') : ''}</div><div class="text-[11px] text-slate-500">Started ${TP.date(s.created_at)} · last used ${s.last_used_at ? TP.ago(s.last_used_at) : 'never'}</div></div>
                            ${s.current ? '' : `<button class="btn btn-danger btn-sm" data-revoke-session="${s.id}">Revoke</button>`}
                        </div>`).join('')}</div>`, sessions.length > 1 ? '<button class="btn btn-ghost btn-sm" id="revokeOthers">Sign out others</button>' : '')}
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    ${panel('Security activity', events.data.length ? `<div class="divide-y divide-white/5">${events.data.map((e) => `
                        <div class="flex items-center gap-3 py-2.5">
                            <span class="text-xs font-bold uppercase w-16 shrink-0 ${SEVERITY_COLOR[e.severity] || ''}">${h(e.severity)}</span>
                            <span class="flex-1 text-sm text-slate-200">${h(TP.label(e.event_type))}</span>
                            <span class="text-[11px] text-slate-500 font-mono hidden sm:inline">${h(e.ip_address || '')}</span>
                            <span class="text-[11px] text-slate-500">${TP.ago(e.created_at)}</span>
                        </div>`).join('')}</div>` : empty('No events', 'shield'))}
                    ${panel('Fraud alerts on my account', alerts.data.length ? `<div class="space-y-2">${alerts.data.map((a) => `
                        <div class="p-3 rounded-xl bg-white/5">
                            <div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-white">${h(a.title)}</span>${statusChip(a.severity)}</div>
                            <div class="text-xs text-slate-400 mt-1">${h(a.description)}</div>
                            <div class="flex items-center gap-2 mt-2 text-[11px] text-slate-500">${statusChip(a.status)} risk ${a.risk_score}/100 · ${TP.ago(a.created_at)}</div>
                        </div>`).join('')}</div>` : empty('No fraud alerts — all clear', 'shield'))}
                </div>
            </div>`;

            // Panic freeze
            el.querySelector('#freezeBtn')?.addEventListener('click', async () => {
                if (!(await TP.confirm('Freeze wallet?', 'All outgoing payments will be blocked and other sessions signed out. You can unfreeze with your password.', 'Freeze now', true))) return;
                if (await TP.action(() => TP.api('/wallet/freeze', { body: {} }))) TP.reload();
            });
            TP.onSubmit(el.querySelector('#unfreezeForm'), async (data) => {
                const res = await TP.api('/wallet/unfreeze', { body: data });
                TP.toast(res.message);
                TP.reload();
            });

            // 2FA
            el.querySelector('#enable2fa')?.addEventListener('click', async () => {
                const res = await TP.action(() => TP.api('/auth/2fa/enable', { body: {} }), false);
                if (!res) return;
                el.querySelector('#twofa').innerHTML = `
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="p-4 rounded-xl bg-white/5">
                            <div class="label">Secret key</div>
                            <div class="font-mono text-sm text-cyan-300 break-all">${h(res.data.secret)}</div>
                            <div class="label mt-3">Recovery codes</div>
                            <div class="grid grid-cols-2 gap-1 font-mono text-[11px] text-slate-300">${res.data.recovery_codes.map((c) => `<span>${h(c)}</span>`).join('')}</div>
                        </div>
                        <form id="confirm2fa" class="space-y-3">
                            <p class="text-xs text-slate-400">Save your recovery codes, then confirm with a code (sandbox OTP: <span class="font-mono text-white">123456</span>).</p>
                            <input class="input font-mono tracking-[0.3em] text-center" name="code" required placeholder="123456">
                            <button class="btn btn-primary w-full" type="submit">Confirm & activate</button>
                        </form>
                    </div>`;
                TP.onSubmit(el.querySelector('#confirm2fa'), async (data) => {
                    const r = await TP.api('/auth/2fa/confirm', { body: data });
                    TP.user.two_factor_enabled = true;
                    TP.toast(r.message);
                    TP.reload();
                });
            });
            el.querySelector('#disable2fa')?.addEventListener('click', async () => {
                if (!(await TP.confirm('Disable 2FA?', 'Your account and high-value payments will be less protected.', 'Disable', true))) return;
                if (await TP.action(() => TP.api('/auth/2fa/disable', { body: {} }))) {
                    TP.user.two_factor_enabled = false;
                    TP.reload();
                }
            });

            TP.onSubmit(el.querySelector('#pwForm'), async (data, form) => {
                const res = await TP.api('/security/password', { body: data });
                TP.toast(res.message);
                form.reset();
            });

            el.querySelectorAll('[data-trust]').forEach((b) => b.addEventListener('click', async () => {
                if (await TP.action(() => TP.api('/security/devices/' + b.dataset.trust, { method: 'PATCH', body: { is_trusted: b.dataset.val === '1' } }))) TP.reload();
            }));
            el.querySelectorAll('[data-revoke-device]').forEach((b) => b.addEventListener('click', async () => {
                if (await TP.action(() => TP.api('/security/devices/' + b.dataset.revokeDevice, { method: 'DELETE' }))) TP.reload();
            }));
            el.querySelectorAll('[data-revoke-session]').forEach((b) => b.addEventListener('click', async () => {
                if (await TP.action(() => TP.api('/security/sessions/' + b.dataset.revokeSession, { method: 'DELETE' }))) TP.reload();
            }));
            el.querySelector('#revokeOthers')?.addEventListener('click', async () => {
                if (await TP.action(() => TP.api('/security/sessions/revoke-others', { body: {} }))) TP.reload();
            });
        },
    };

    // ------------------------------------------------------------------
    // eKYC
    // ------------------------------------------------------------------
    TP.pages.kyc = {
        title: 'Identity Verification (eKYC)',
        async render(el) {
            const { data } = await TP.api('/kyc');
            const k = data.latest;

            el.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div class="xl:col-span-2 space-y-6">
                    <section class="rounded-2xl p-6 border ${data.verified ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/25'}">
                        <span class="w-12 h-12 rounded-2xl ${data.verified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'} flex items-center justify-center">${icon(data.verified ? 'check' : 'id', 'w-6 h-6')}</span>
                        <h3 class="text-xl font-extrabold text-white mt-4">${data.verified ? 'Identity verified' : 'Not verified yet'}</h3>
                        <p class="text-sm text-slate-300 mt-1">${data.verified
                            ? 'You have full limits for transfers, payments, bookings and virtual assets.'
                            : `Unverified wallets are limited to <b>${TP.num(data.unverified_limit_azn, 0)} AZN</b> per transaction.`}</p>
                    </section>
                    ${k ? panel('Latest verification', `
                        <dl class="grid grid-cols-2 gap-3 text-xs">
                            <div class="p-3 rounded-xl bg-white/5"><dt class="text-slate-500">Status</dt><dd class="mt-1">${statusChip(k.status)}</dd></div>
                            <div class="p-3 rounded-xl bg-white/5"><dt class="text-slate-500">Document</dt><dd class="text-white mt-1 font-mono">${h(TP.label(k.document_type))} ${h(k.document_number_masked)}</dd></div>
                            <div class="p-3 rounded-xl bg-white/5"><dt class="text-slate-500">Document check</dt><dd class="text-white mt-1">${k.document_score}/100</dd></div>
                            <div class="p-3 rounded-xl bg-white/5"><dt class="text-slate-500">Liveness (selfie)</dt><dd class="text-white mt-1">${k.liveness_score}/100</dd></div>
                        </dl>
                        ${k.rejection_reason ? `<p class="text-xs text-red-300 mt-3">${h(k.rejection_reason)}</p>` : ''}`) : ''}
                </div>
                <div class="xl:col-span-3">
                    ${panel(data.verified ? 'Re-verify identity' : 'Verify your identity', `
                        <ol class="grid grid-cols-3 gap-2 mb-5 text-[11px]">
                            ${['Document details', 'Selfie liveness', 'Instant decision'].map((s, i) => `<li class="p-2.5 rounded-xl bg-white/5 text-center"><span class="block text-cyan-300 font-bold">Step ${i + 1}</span><span class="text-slate-400">${s}</span></li>`).join('')}
                        </ol>
                        <form id="kycForm" class="space-y-4">
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="label">Document type</label><select class="input" name="document_type">${options([['id_card', 'National ID card'], ['passport', 'Passport'], ['driver_license', "Driver's licence"]])}</select></div>
                                <div><label class="label">Document number</label><input class="input font-mono uppercase" name="document_number" required minlength="5" maxlength="20" placeholder="AA1234567"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="label">Nationality</label><select class="input" name="nationality">${options([['AZ', 'Azerbaijan'], ['TR', 'Türkiye'], ['GE', 'Georgia'], ['DE', 'Germany'], ['GB', 'United Kingdom'], ['US', 'United States'], ['AE', 'UAE']])}</select></div>
                                <div><label class="label">Date of birth</label><input class="input" type="date" name="date_of_birth" required></div>
                            </div>
                            <label class="flex items-start gap-3 p-4 rounded-xl bg-white/5 cursor-pointer">
                                <input type="checkbox" name="selfie_confirmed" class="mt-1 accent-cyan-500">
                                <span class="text-sm text-slate-300"><b class="text-white">Liveness check:</b> I took a live selfie matching my document photo. <span class="block text-xs text-slate-500 mt-0.5">Sandbox — leaving this unchecked simulates a failed liveness check.</span></span>
                            </label>
                            <div class="text-[11px] text-slate-500 flex gap-2">${icon('lock', 'w-4 h-4 shrink-0')} Only a masked document number and a one-way hash are stored. Duplicate documents across accounts are rejected (identity-fraud protection).</div>
                            <button class="btn btn-primary w-full" type="submit">${icon('id', 'w-4 h-4')} Submit for verification</button>
                        </form>`)}
                </div>
            </div>`;

            TP.onSubmit(el.querySelector('#kycForm'), async (d) => {
                d.document_number = d.document_number.toUpperCase();
                try {
                    const res = await TP.api('/kyc', { body: d });
                    TP.toast(res.message);
                } catch (e) {
                    TP.toast(e.message, 'error');
                }
                TP.reload();
            });
        },
    };
})();
