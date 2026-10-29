/* =====================================================================
 * TravelPay — administration: overview, users, transaction review,
 * fraud alerts & rules, threat monitor, risk sandbox, ledger, travel
 * analytics, audit logs, API explorer
 * ===================================================================== */
(function () {
    'use strict';
    const { h, icon, money, num, panel, stat, empty, chip, statusChip, options } = TP;
    const grid = { color: 'rgba(255,255,255,0.05)' };
    const pager = (meta, onPage) => {
        const wrap = document.createElement('div');
        wrap.className = 'flex items-center justify-between mt-3';
        wrap.innerHTML = `<span class="text-xs text-slate-400">${meta.total} records · page ${meta.current_page}/${meta.last_page}</span>
            <div class="flex gap-2"><button class="btn btn-ghost btn-sm" data-p="-1" ${meta.current_page <= 1 ? 'disabled' : ''}>Previous</button><button class="btn btn-ghost btn-sm" data-p="1" ${meta.current_page >= meta.last_page ? 'disabled' : ''}>Next</button></div>`;
        wrap.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => onPage(meta.current_page + Number(b.dataset.p))));
        return wrap;
    };

    // ------------------------------------------------------------------
    // Overview
    // ------------------------------------------------------------------
    TP.pages.admin = {
        title: 'Admin Overview',
        admin: true,
        async render(el) {
            const { data: d } = await TP.api('/admin/dashboard');
            const o = d.overview;
            TP.badges.held = o.held_transactions;
            TP.badges.alerts = o.pending_fraud_alerts;
            TP.updateBadges();

            el.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${stat('Users', num(o.total_users, 0), `${num(o.kyc_verified_users, 0)} eKYC verified`, 'cyan', 'users')}
                    ${stat('Active wallets', num(o.active_wallets, 0), `${num(o.bookings, 0)} active bookings`, 'emerald', 'wallet')}
                    ${stat('Transactions', num(o.total_transactions, 0), `<a href="#/admin-transactions" class="${o.held_transactions ? 'text-purple-300' : ''}">${o.held_transactions} held for review</a>`, 'purple', 'list')}
                    ${stat('Open fraud alerts', num(o.pending_fraud_alerts, 0), `<a href="#/admin-threats">${o.active_ip_blocks} IPs blocked</a>`, 'red', 'alert')}
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    ${panel('Transactions — last 14 days', '<div class="h-64"><canvas id="volChart"></canvas></div>', '', 'xl:col-span-2')}
                    ${panel('System balances (customer funds)', `<div class="space-y-3">${d.system_balances.map((b) => `
                        <div class="flex items-center justify-between p-3 rounded-xl bg-white/5"><span class="font-bold text-slate-300">${b.currency_code}</span><span class="font-mono text-white">${money(b.total_balance, b.currency_code)}</span></div>`).join('')}</div>
                        <div class="label mt-5">Completed volume</div>
                        <div class="space-y-2">${d.volumes_by_currency.map((v) => `<div class="flex justify-between text-sm"><span class="text-slate-400">${v.currency_code} · ${v.tx_count} tx</span><span class="font-mono text-white">${money(v.total_volume, v.currency_code)}</span></div>`).join('') || '<p class="text-xs text-slate-500">No volume yet</p>'}</div>`)}
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    ${panel('Recent fraud alerts', d.recent_alerts.length ? `<div class="space-y-2">${d.recent_alerts.map((a) => `
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            ${statusChip(a.severity)}
                            <div class="min-w-0 flex-1"><div class="text-sm text-white truncate">${h(a.title)}</div><div class="text-[11px] text-slate-500">${h(a.user?.name)} · risk ${a.risk_score} · ${TP.ago(a.created_at)}</div></div>
                            ${statusChip(a.status)}
                        </div>`).join('')}</div>` : empty('No alerts', 'shield'), '<a href="#/admin-alerts" class="text-xs text-cyan-400 hover:underline">All alerts</a>')}
                    ${panel('Recent security events', d.recent_security_events.length ? `<div class="divide-y divide-white/5">${d.recent_security_events.map((e) => `
                        <div class="flex items-center gap-3 py-2.5 text-sm">${statusChip(e.severity)}<span class="flex-1 text-slate-200 truncate">${h(TP.label(e.event_type))}</span><span class="text-[11px] text-slate-500 truncate max-w-[120px]">${h(e.user?.name || e.ip_address || '')}</span><span class="text-[11px] text-slate-500">${TP.ago(e.created_at)}</span></div>`).join('')}</div>` : empty('No events', 'shield'), '<a href="#/admin-threats" class="text-xs text-cyan-400 hover:underline">Threat monitor</a>')}
                </div>
            </div>`;

            TP.chart(el.querySelector('#volChart'), {
                type: 'bar',
                data: {
                    labels: d.daily_volume.map((x) => x.date.slice(5)),
                    datasets: [
                        { label: 'Completed', data: d.daily_volume.map((x) => x.completed), backgroundColor: 'rgba(34,211,238,0.7)', borderRadius: 4, stack: 's' },
                        { label: 'Held / failed', data: d.daily_volume.map((x) => x.flagged), backgroundColor: 'rgba(167,139,250,0.8)', borderRadius: 4, stack: 's' },
                    ],
                },
                options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid, beginAtZero: true, ticks: { precision: 0 } } } },
            });
        },
    };

    // ------------------------------------------------------------------
    // Users
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // Users
    // ------------------------------------------------------------------
    TP.pages['admin-users'] = {
        title: 'Users & Wallets',
        admin: true,
        async render(el) {
            const state = { page: 1, search: '', role: '', status: '', department_id: '', user_group_id: '' };
            const [{ data: depts }, { data: groups }] = await Promise.all([
                TP.api('/admin/departments').catch(() => ({ data: [] })),
                TP.api('/admin/user-groups').catch(() => ({ data: [] })),
            ]);

            el.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-xs text-slate-400">Platform user accounts, assigned departments, and authority groups.</p>
                    <button id="btnNewUser" class="btn btn-primary btn-sm flex items-center gap-1.5">${TP.icon('plus', 'w-4 h-4')} Create User</button>
                </div>
                <form id="uf" class="glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <input class="input col-span-2 md:col-span-1" name="search" placeholder="Search: name, email, phone…">
                    <select class="input" name="role"><option value="">All roles</option>${options(['user', 'merchant', 'admin'])}</select>
                    <select class="input" name="status"><option value="">All statuses</option>${options(['active', 'frozen', 'suspended'])}</select>
                    <select class="input" name="department_id"><option value="">All departments</option>${depts.map(d => `<option value="${d.id}">${h(d.name)}</option>`).join('')}</select>
                    <select class="input" name="user_group_id"><option value="">All groups</option>${groups.map(g => `<option value="${g.id}">${h(g.name)}</option>`).join('')}</select>
                </form>
                <div class="glass rounded-2xl p-2 overflow-x-auto" id="ut"></div>
            </div>`;
            const box = el.querySelector('#ut');
            const bal = (u, c) => u.wallet?.balances?.find((b) => b.currency_code === c)?.balance ?? 0;
            const load = async () => {
                const res = await TP.api('/admin/users', { query: { ...state, per_page: 15 } });
                box.innerHTML = `<table class="data w-full"><thead><tr><th>User</th><th>Department</th><th>Group</th><th>Role</th><th>Wallet</th><th class="text-right">AZN</th><th class="text-right">EUR</th><th class="text-right">USD</th><th>Status</th><th class="text-right">Action</th></tr></thead><tbody>
                    ${res.data.map((u) => `<tr>
                        <td>
                            <div class="font-semibold text-white flex items-center gap-1">
                                <span>${h(u.name)}</span>
                                ${u.is_system_admin ? '<span class="chip bg-red-500/20 text-red-300 border-red-500/30 text-[9px] uppercase font-mono font-bold">SysAdmin</span>' : ''}
                                ${u.can_manage_permissions && !u.is_system_admin ? '<span class="chip bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[9px] uppercase font-mono font-bold">PermsAdmin</span>' : ''}
                            </div>
                            <div class="text-[11px] text-slate-500 font-mono">${h(u.email)}</div>
                        </td>
                        <td>${u.department ? `<span class="chip bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[11px]">${h(u.department.name)}</span>` : '<span class="text-slate-500 text-xs italic">—</span>'}</td>
                        <td>${u.user_group ? `<span class="chip bg-purple-500/10 text-purple-300 border-purple-500/20 text-[11px]">${h(u.user_group.name)}</span>` : '<span class="text-slate-500 text-xs italic">—</span>'}</td>
                        <td>${chip(u.role, u.role === 'admin' ? 'cyan' : u.role === 'merchant' ? 'amber' : 'slate')}</td>
                        <td class="font-mono text-xs text-cyan-300">${h(u.wallet?.wallet_number || '—')}</td>
                        <td class="text-right font-mono">${num(bal(u, 'AZN'))}</td><td class="text-right font-mono">${num(bal(u, 'EUR'))}</td><td class="text-right font-mono">${num(bal(u, 'USD'))}</td>
                        <td>${statusChip(u.status)}</td>
                        <td class="text-right whitespace-nowrap space-x-1">
                            <button class="btn btn-ghost btn-sm text-cyan-400 hover:text-cyan-300" data-edit-user="${u.id}" title="Edit User & Department Assignment">${TP.icon('sliders', 'w-3.5 h-3.5')} <span class="hidden sm:inline">Edit</span></button>
                            ${u.id !== TP.user.id ? `<button class="btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-ghost'}" data-status="${u.status === 'active' ? 'frozen' : 'active'}" data-id="${u.id}">${u.status === 'active' ? 'Freeze' : 'Activate'}</button>` : ''}
                        </td>
                    </tr>`).join('')}</tbody></table>`;
                box.appendChild(pager(res.meta, (p) => { state.page = p; load(); }));
                box.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', async () => {
                    if (await TP.action(() => TP.api(`/admin/users/${b.dataset.id}/status`, { method: 'PATCH', body: { status: b.dataset.status } }))) load();
                }));
                box.querySelectorAll('[data-edit-user]').forEach((b) => b.addEventListener('click', () => {
                    const user = res.data.find(x => x.id == b.dataset.editUser);
                    if (!user) return;
                    TP.modal(`
                        <h3 class="text-lg font-bold text-white mb-2 flex items-center gap-2">${TP.icon('sliders', 'w-5 h-5 text-cyan-400')} Edit User & Department Assignment</h3>
                        <p class="text-xs text-slate-400 mb-4">Assign to a department or remove (unassign), set user group permissions and role.</p>
                        <form id="editUserForm" class="space-y-4">
                            <div class="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-base shrink-0">
                                    ${h(user.name.charAt(0).toUpperCase())}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="font-bold text-white text-sm truncate">${h(user.name)}</div>
                                    <div class="text-xs text-slate-400 font-mono truncate">${h(user.email)} · ID #${user.id}</div>
                                </div>
                                ${statusChip(user.status)}
                            </div>

                            <div>
                                <label class="label">Full Name</label>
                                <input class="input" name="name" value="${h(user.name)}" required>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="label">Department Assignment</label>
                                    <select class="input" name="department_id">
                                        <option value="">— None / Unassign from Department —</option>
                                        ${depts.map(d => `<option value="${d.id}" ${user.department_id == d.id ? 'selected' : ''}>${h(d.name)} (${h(d.code)})</option>`).join('')}
                                    </select>
                                    <span class="text-[10px] text-slate-500 mt-1 block">Select "None" to remove user from department.</span>
                                </div>
                                <div>
                                    <label class="label">User Group (Authority)</label>
                                    <select class="input" name="user_group_id">
                                        <option value="">— None / Unassign from Group —</option>
                                        ${groups.map(g => `<option value="${g.id}" ${user.user_group_id == g.id ? 'selected' : ''}>${h(g.name)}</option>`).join('')}
                                    </select>
                                    <span class="text-[10px] text-slate-500 mt-1 block">Determines assigned RBAC permissions.</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="label">Platform Role</label>
                                    <select class="input" name="role">
                                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>Standard User (Customer)</option>
                                        <option value="merchant" ${user.role === 'merchant' ? 'selected' : ''}>Merchant / Business</option>
                                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="label">Phone Number</label>
                                    <input class="input font-mono" name="phone" value="${h(user.phone || '')}">
                                </div>
                            </div>

                            <div class="flex justify-between items-center pt-3 border-t border-white/10">
                                ${user.department ? `
                                    <button type="button" id="btnUnassignDept" class="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                        ${TP.icon('x', 'w-3.5 h-3.5')} Unassign from ${h(user.department.name)}
                                    </button>
                                ` : '<span></span>'}
                                <div class="flex gap-2">
                                    <button type="button" class="btn btn-ghost" data-close>Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save Changes</button>
                                </div>
                            </div>
                        </form>
                    `, (modalBox) => {
                        const unassignBtn = modalBox.querySelector('#btnUnassignDept');
                        if (unassignBtn) {
                            unassignBtn.addEventListener('click', () => {
                                const sel = modalBox.querySelector('select[name=department_id]');
                                if (sel) sel.value = '';
                                modalBox.querySelector('#editUserForm').requestSubmit();
                            });
                        }

                        modalBox.querySelector('#editUserForm').addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target);
                            const body = {
                                name: fd.get('name'),
                                phone: fd.get('phone') || null,
                                role: fd.get('role'),
                                department_id: fd.get('department_id') ? Number(fd.get('department_id')) : null,
                                user_group_id: fd.get('user_group_id') ? Number(fd.get('user_group_id')) : null,
                            };

                            await TP.action(() => TP.api(`/admin/users/${user.id}`, { method: 'PUT', body }), 'User & department assignment updated successfully!');
                            TP.closeModal();
                            load();
                        });
                    });
                }));
            };

            el.querySelector('#btnNewUser').addEventListener('click', () => {
                TP.modal(`
                    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">${TP.icon('users', 'w-5 h-5 text-cyan-400')} Create New User</h3>
                    <form id="newUserForm" class="space-y-3">
                        <div><label class="label">Full Name *</label><input class="input" name="name" required placeholder="John Doe"></div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Email *</label><input class="input" name="email" type="email" required placeholder="user@travelpay.com"></div>
                            <div><label class="label">Phone</label><input class="input" name="phone" value="+99450"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Password *</label><input class="input" name="password" type="password" value="Password123!" required></div>
                            <div><label class="label">Role</label><select class="input" name="role"><option value="user">Standard User</option><option value="admin">Administrator</option></select></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Department</label><select class="input" name="department_id"><option value="">— Unassigned —</option>${depts.map(d => `<option value="${d.id}">${h(d.name)}</option>`).join('')}</select></div>
                            <div><label class="label">User Group</label><select class="input" name="user_group_id"><option value="">— Unassigned —</option>${groups.map(g => `<option value="${g.id}">${h(g.name)}</option>`).join('')}</select></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="label">Initial AZN</label><input class="input font-mono" type="number" name="initial_azn" value="1000"></div>
                            <div><label class="label">Initial EUR</label><input class="input font-mono" type="number" name="initial_eur" value="500"></div>
                            <div><label class="label">Initial USD</label><input class="input font-mono" type="number" name="initial_usd" value="500"></div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3">
                            <button type="button" class="btn btn-ghost" data-close>Cancel</button>
                            <button type="submit" class="btn btn-primary">Create User</button>
                        </div>
                    </form>
                `, (box) => {
                    box.querySelector('#newUserForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const body = Object.fromEntries(fd.entries());
                        ['initial_azn', 'initial_eur', 'initial_usd'].forEach(k => body[k] = Number(body[k] || 0));
                        if (!body.department_id) delete body.department_id;
                        if (!body.user_group_id) delete body.user_group_id;
                        await TP.action(() => TP.api('/admin/users', { method: 'POST', body }), 'User created successfully!');
                        TP.closeModal();
                        load();
                    });
                });
            });

            let t;
            el.querySelector('#uf').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state[e.target.name] = e.target.value; state.page = 1; load(); }, 250); });
            await load();
        },
    };

    // ------------------------------------------------------------------
    // User Groups & Permissions
    // ------------------------------------------------------------------
    TP.pages['admin-groups'] = {
        title: 'User Groups & Permissions (RBAC)',
        admin: true,
        async render(el) {
            const canManage = TP.user?.is_system_admin || TP.user?.can_manage_permissions || TP.user?.role === 'admin';
            const [{ data: groups }, { data: depts }, { data: perms }] = await Promise.all([
                TP.api('/admin/user-groups'),
                TP.api('/admin/departments').catch(() => ({ data: [] })),
                TP.api('/admin/permissions').catch(() => ({ data: [] })),
            ]);

            el.innerHTML = `
            <div class="space-y-6">
                <!-- Permission info banner -->
                <div class="p-4 rounded-xl border flex items-center justify-between gap-4 ${canManage ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}">
                    <div class="flex items-center gap-3">
                        <span class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">${TP.icon(canManage ? 'check' : 'lock', 'w-5 h-5')}</span>
                        <div class="text-xs">
                            ${canManage ? '<strong>Authority Confirmed:</strong> You are System Administrator or hold the <code class="font-mono bg-cyan-950 px-1 py-0.5 rounded">manage_permissions</code> privilege. You can assign and configure group permissions.' : '<strong>Restricted Access:</strong> Only System Administrators or users with <code class="font-mono bg-amber-950 px-1 py-0.5 rounded">manage_permissions</code> can modify permissions (Read-only mode).'}
                        </div>
                    </div>
                    <span class="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-black/40 font-bold shrink-0">${canManage ? 'FULL ACCESS' : 'READ ONLY'}</span>
                </div>

                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-base font-bold text-white">User Groups & Authority Profiles</h2>
                        <p class="text-xs text-slate-400">Click <b>Configure Permissions</b> on any group to customize assigned access rights.</p>
                    </div>
                    <button id="btnNewGroup" class="btn btn-primary btn-sm flex items-center gap-1.5">${TP.icon('plus', 'w-4 h-4')} Create Group</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="groupList">
                    ${groups.map((g) => {
                        const hasManagePerms = (g.permissions || []).some(p => p.slug === 'manage_permissions');
                        return `
                        <div class="glass rounded-2xl p-5 flex flex-col justify-between space-y-4 border border-white/10 hover:border-purple-500/30 transition">
                            <div class="space-y-3">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h3 class="text-base font-bold text-white">${h(g.name)}</h3>
                                            ${g.is_system ? '<span class="chip bg-red-500/20 text-red-300 border-red-500/30 text-[9px] uppercase font-mono font-bold">System</span>' : ''}
                                        </div>
                                        <span class="font-mono text-[11px] text-purple-400 font-semibold block mt-0.5">slug: ${h(g.slug)}</span>
                                    </div>
                                    ${!g.is_system ? `<button class="text-slate-500 hover:text-red-400 p-1" data-del-group="${g.id}">${TP.icon('x', 'w-4 h-4')}</button>` : ''}
                                </div>

                                ${g.department ? `<div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/5">${TP.icon('bank', 'w-3.5 h-3.5 text-cyan-400')} <span>Department: <b class="text-white">${h(g.department.name)}</b></span></div>` : ''}

                                <p class="text-xs text-slate-400">${h(g.description || 'No description provided.')}</p>

                                ${hasManagePerms ? `<div class="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] flex items-center gap-2">${TP.icon('sparkle', 'w-4 h-4 text-cyan-400 shrink-0')}<span>Special Authority: Users in this group can grant/modify permissions!</span></div>` : ''}

                                <div>
                                    <div class="text-[11px] uppercase font-bold text-slate-400 mb-2 flex items-center justify-between">
                                        <span>Assigned permissions (${(g.permissions || []).length}):</span>
                                        <span class="text-slate-500 font-mono">${g.users_count || 0} members</span>
                                    </div>
                                    <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                        ${(g.permissions && g.permissions.length) ? g.permissions.map(p => `
                                            <span class="text-[10px] px-2 py-0.5 rounded-md border font-medium ${p.slug === 'manage_permissions' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-white/5 text-slate-300 border-white/10'}">${h(p.name)}</span>
                                        `).join('') : '<span class="text-slate-500 italic text-xs">No permissions assigned yet</span>'}
                                    </div>
                                </div>
                            </div>

                            <button class="btn btn-primary w-full text-xs font-bold py-2.5" data-cfg-perms="${g.id}">
                                ${TP.icon('lock', 'w-4 h-4')} Configure Permissions
                            </button>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;

            // Open Permissions Config Modal
            el.querySelectorAll('[data-cfg-perms]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const group = groups.find(g => g.id == btn.dataset.cfgPerms);
                    if (!group) return;
                    const assignedIds = new Set((group.permissions || []).map(p => p.id));

                    // Categorize permissions
                    const byCat = {};
                    perms.forEach(p => {
                        const cat = p.category || 'General Permissions';
                        if (!byCat[cat]) byCat[cat] = [];
                        byCat[cat].push(p);
                    });

                    TP.modal(`
                        <div class="space-y-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                                    ${TP.icon('lock', 'w-5 h-5')}
                                </div>
                                <div>
                                    <h3 class="text-base font-bold text-white">${h(group.name)} — Permission Matrix</h3>
                                    <p class="text-xs text-slate-400">Select the platform permissions and privileges to assign to this group.</p>
                                </div>
                            </div>

                            ${!canManage ? `<div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs"><b>Notice:</b> Your account does not have permission management privileges. Permissions are displayed in read-only mode.</div>` : ''}

                            <div class="max-h-[50vh] overflow-y-auto scroll-thin space-y-4 p-1">
                                ${Object.entries(byCat).map(([cat, pList]) => `
                                    <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2.5">
                                        <div class="text-xs font-bold uppercase tracking-wider text-purple-300 border-b border-white/10 pb-1.5 flex justify-between">
                                            <span>${h(cat)}</span>
                                            <span class="text-[10px] text-slate-500 font-mono">${pList.length} permissions</span>
                                        </div>
                                        <div class="grid grid-cols-1 gap-2">
                                            ${pList.map(p => {
                                                const isChecked = assignedIds.has(p.id);
                                                const isManage = p.slug === 'manage_permissions';
                                                return `
                                                <label class="flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition ${isChecked ? (isManage ? 'bg-cyan-500/20 border-cyan-500/50 text-white' : 'bg-purple-500/15 border-purple-500/40 text-white') : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20'} ${!canManage ? 'opacity-70 pointer-events-none' : ''}">
                                                    <input type="checkbox" name="perm" value="${p.id}" ${isChecked ? 'checked' : ''} class="mt-1 accent-purple-500">
                                                    <div class="min-w-0 flex-1">
                                                        <div class="flex items-center gap-1.5">
                                                            <span class="text-xs font-bold text-white">${h(p.name)}</span>
                                                            ${isManage ? '<span class="chip bg-cyan-400 text-black text-[9px] uppercase font-bold">Special Authority</span>' : ''}
                                                        </div>
                                                        <p class="text-[11px] text-slate-400 leading-tight mt-0.5">${h(p.description)}</p>
                                                        <span class="font-mono text-[10px] text-slate-500">slug: ${h(p.slug)}</span>
                                                    </div>
                                                </label>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <div class="flex justify-end gap-2 pt-3 border-t border-white/10">
                                <button type="button" class="btn btn-ghost" data-close>Close</button>
                                ${canManage ? `<button type="button" id="btnSavePerms" class="btn btn-primary">Save Permissions</button>` : ''}
                            </div>
                        </div>
                    `, (modalBox) => {
                        const saveBtn = modalBox.querySelector('#btnSavePerms');
                        if (saveBtn) {
                            saveBtn.addEventListener('click', async () => {
                                const selected = Array.from(modalBox.querySelectorAll('input[name=perm]:checked')).map(cb => Number(cb.value));
                                await TP.action(() => TP.api(`/admin/user-groups/${group.id}/permissions`, {
                                    method: 'PATCH',
                                    body: { permission_ids: selected }
                                }), 'Permissions updated successfully!');
                                TP.closeModal();
                                TP.pages['admin-groups'].render(el);
                            });
                        }
                    });
                });
            });

            // New Group Modal
            el.querySelector('#btnNewGroup').addEventListener('click', () => {
                TP.modal(`
                    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">${TP.icon('lock', 'w-5 h-5 text-purple-400')} Create User Group</h3>
                    <form id="newGroupForm" class="space-y-3">
                        <div><label class="label">Group Name *</label><input class="input" name="name" required placeholder="e.g. Lead Risk Analysts"></div>
                        <div><label class="label">Department</label><select class="input" name="department_id"><option value="">— Unassigned —</option>${depts.map(d => `<option value="${d.id}">${h(d.name)}</option>`).join('')}</select></div>
                        <div><label class="label">Description</label><textarea class="input" name="description" rows="3" placeholder="Group roles, responsibilities and scope..."></textarea></div>
                        <div class="flex justify-end gap-2 pt-3">
                            <button type="button" class="btn btn-ghost" data-close>Cancel</button>
                            <button type="submit" class="btn btn-primary">Create Group</button>
                        </div>
                    </form>
                `, (box) => {
                    box.querySelector('#newGroupForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const body = Object.fromEntries(fd.entries());
                        if (!body.department_id) delete body.department_id;
                        await TP.action(() => TP.api('/admin/user-groups', { method: 'POST', body }), 'User group created successfully!');
                        TP.closeModal();
                        TP.pages['admin-groups'].render(el);
                    });
                });
            });

            // Delete Group
            el.querySelectorAll('[data-del-group]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (await TP.confirm('Delete user group?', 'Users assigned to this group will be unassigned.', 'Yes, Delete', true)) {
                        await TP.action(() => TP.api(`/admin/user-groups/${btn.dataset.delGroup}`, { method: 'DELETE' }), 'Group deleted.');
                        TP.pages['admin-groups'].render(el);
                    }
                });
            });
        },
    };

    // ------------------------------------------------------------------
    // Departments
    // ------------------------------------------------------------------
    TP.pages['admin-departments'] = {
        title: 'Departments',
        admin: true,
        async render(el) {
            const { data: depts } = await TP.api('/admin/departments');

            el.innerHTML = `
            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-base font-bold text-white">Organizational Departments & Units</h2>
                        <p class="text-xs text-slate-400">Organize users, teams, and administrative roles by corporate departments.</p>
                    </div>
                    <button id="btnNewDept" class="btn btn-primary btn-sm flex items-center gap-1.5">${TP.icon('plus', 'w-4 h-4')} Create Department</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    ${depts.map((d) => `
                        <div class="glass rounded-2xl p-5 flex flex-col justify-between space-y-4 border border-white/10 hover:border-emerald-500/30 transition">
                            <div class="space-y-3">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <span class="chip bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono text-[10px] font-bold uppercase">${h(d.code)}</span>
                                        <h3 class="text-base font-bold text-white mt-1">${h(d.name)}</h3>
                                    </div>
                                    <div class="flex gap-1">
                                        <button class="text-slate-400 hover:text-white p-1" data-edit-dept="${d.id}">${TP.icon('sliders', 'w-4 h-4')}</button>
                                        <button class="text-slate-500 hover:text-red-400 p-1" data-del-dept="${d.id}">${TP.icon('x', 'w-4 h-4')}</button>
                                    </div>
                                </div>
                                <div class="text-xs text-slate-300">Department Head: <b class="text-white">${h(d.manager_name || 'Not assigned')}</b></div>
                                <p class="text-xs text-slate-400">${h(d.description || 'No description provided.')}</p>
                            </div>
                            <div class="flex items-center justify-between pt-2 border-t border-white/5">
                                <span class="chip ${d.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'} text-xs font-semibold">${d.status === 'active' ? 'Active' : 'Inactive'}</span>
                                <button class="btn btn-ghost btn-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5" data-members-dept="${d.id}" title="Manage department staff members">
                                    ${TP.icon('users', 'w-3.5 h-3.5')}
                                    <span>${d.users_count || 0} staff · Manage</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;

            // Open Manage Staff Modal
            const openStaffModal = async (deptId) => {
                const res = await TP.api(`/admin/departments/${deptId}/members`);
                const dept = res.data.department;
                const members = res.data.members || [];
                const candidates = res.data.candidates || [];

                TP.modal(`
                    <div class="space-y-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                                ${TP.icon('users', 'w-5 h-5')}
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                    <span>${h(dept.name)}</span>
                                    <span class="chip bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono text-[10px]">${h(dept.code)}</span>
                                </h3>
                                <p class="text-xs text-slate-400">Manage assigned users: assign new staff or remove existing members from this department.</p>
                            </div>
                        </div>

                        <!-- Assign user form -->
                        <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                            <label class="text-xs font-bold uppercase tracking-wider text-emerald-400 block">Assign User to Department</label>
                            <div class="flex gap-2">
                                <select id="staffCandidateSelect" class="input flex-1 text-xs">
                                    <option value="">— Select an existing user to assign —</option>
                                    ${candidates.map(c => `<option value="${c.id}">${h(c.name)} (${h(c.email)}) — ${c.department ? 'Current: ' + h(c.department.name) : 'No Dept'}</option>`).join('')}
                                </select>
                                <button id="btnAssignStaff" class="btn btn-primary btn-sm shrink-0 flex items-center gap-1.5">
                                    ${TP.icon('plus', 'w-3.5 h-3.5')} Assign
                                </button>
                            </div>
                        </div>

                        <!-- Current members table -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Current Department Staff (${members.length})</span>
                            </div>
                            <div class="max-h-72 overflow-y-auto custom-scrollbar rounded-xl border border-white/5 divide-y divide-white/5 bg-black/20">
                                ${members.length ? members.map(m => `
                                    <div class="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                                        <div class="min-w-0 flex-1">
                                            <div class="font-bold text-white text-xs truncate">${h(m.name)}</div>
                                            <div class="text-[11px] text-slate-400 font-mono truncate">${h(m.email)}</div>
                                            ${m.user_group ? `<span class="chip bg-purple-500/10 text-purple-300 border-purple-500/20 text-[9px] mt-1 inline-block">${h(m.user_group.name)}</span>` : ''}
                                        </div>
                                        <div class="flex items-center gap-2 shrink-0">
                                            ${statusChip(m.status)}
                                            <button class="btn btn-danger btn-xs" data-remove-staff="${m.id}" title="Remove user from this department">
                                                ${TP.icon('x', 'w-3 h-3')} Remove
                                            </button>
                                        </div>
                                    </div>
                                `).join('') : '<div class="p-6 text-center text-xs text-slate-500 italic">No users currently assigned to this department.</div>'}
                            </div>
                        </div>

                        <div class="flex justify-end pt-2 border-t border-white/10">
                            <button type="button" class="btn btn-ghost" data-close>Close</button>
                        </div>
                    </div>
                `, (box) => {
                    box.querySelector('#btnAssignStaff')?.addEventListener('click', async () => {
                        const sel = box.querySelector('#staffCandidateSelect');
                        const userId = sel?.value;
                        if (!userId) {
                            TP.toast('Please select a user to assign.', 'error');
                            return;
                        }
                        await TP.action(() => TP.api(`/admin/departments/${dept.id}/assign-member`, {
                            method: 'POST',
                            body: { user_id: Number(userId) },
                        }), 'User assigned to department!');
                        TP.closeModal();
                        TP.pages['admin-departments'].render(el);
                        openStaffModal(dept.id);
                    });

                    box.querySelectorAll('[data-remove-staff]').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const uId = btn.dataset.removeStaff;
                            if (await TP.confirm('Remove from department?', 'The user will be unassigned from this department.', 'Yes, Remove', true)) {
                                await TP.action(() => TP.api(`/admin/departments/${dept.id}/remove-member/${uId}`, {
                                    method: 'POST',
                                }), 'User removed from department.');
                                TP.closeModal();
                                TP.pages['admin-departments'].render(el);
                                openStaffModal(dept.id);
                            }
                        });
                    });
                });
            };

            // Open Create/Edit Dept Modal
            const openDeptModal = (dept = null) => {
                TP.modal(`
                    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">${TP.icon('bank', 'w-5 h-5 text-emerald-400')} ${dept ? 'Edit Department' : 'Create Department'}</h3>
                    <form id="deptModalForm" class="space-y-3">
                        <div><label class="label">Department Name *</label><input class="input" name="name" required value="${h(dept?.name || '')}" placeholder="Risk & Fraud Surveillance"></div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Code *</label><input class="input font-mono uppercase" name="code" required value="${h(dept?.code || '')}" placeholder="RISK"></div>
                            <div><label class="label">Department Head</label><input class="input" name="manager_name" value="${h(dept?.manager_name || '')}" placeholder="Orkhan Huseynov"></div>
                        </div>
                        <div><label class="label">Description</label><textarea class="input" name="description" rows="3" placeholder="Operational responsibilities...">${h(dept?.description || '')}</textarea></div>
                        <div><label class="label">Status</label><select class="input" name="status"><option value="active" ${dept?.status !== 'inactive' ? 'selected' : ''}>Active</option><option value="inactive" ${dept?.status === 'inactive' ? 'selected' : ''}>Inactive</option></select></div>
                        <div class="flex justify-end gap-2 pt-3">
                            <button type="button" class="btn btn-ghost" data-close>Cancel</button>
                            <button type="submit" class="btn btn-primary">${dept ? 'Save Changes' : 'Create Department'}</button>
                        </div>
                    </form>
                `, (box) => {
                    box.querySelector('#deptModalForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const body = Object.fromEntries(fd.entries());
                        if (dept) {
                            await TP.action(() => TP.api(`/admin/departments/${dept.id}`, { method: 'PUT', body }), 'Department updated!');
                        } else {
                            await TP.action(() => TP.api('/admin/departments', { method: 'POST', body }), 'Department created!');
                        }
                        TP.closeModal();
                        TP.pages['admin-departments'].render(el);
                    });
                });
            };

            el.querySelector('#btnNewDept').addEventListener('click', () => openDeptModal());
            el.querySelectorAll('[data-edit-dept]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dept = depts.find(d => d.id == btn.dataset.editDept);
                    if (dept) openDeptModal(dept);
                });
            });
            el.querySelectorAll('[data-members-dept]').forEach(btn => {
                btn.addEventListener('click', () => {
                    openStaffModal(btn.dataset.membersDept);
                });
            });
            el.querySelectorAll('[data-del-dept]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (await TP.confirm('Delete department?', 'Users in this department will remain without department assignment.', 'Yes, Delete', true)) {
                        await TP.action(() => TP.api(`/admin/departments/${btn.dataset.delDept}`, { method: 'DELETE' }), 'Department deleted.');
                        TP.pages['admin-departments'].render(el);
                    }
                });
            });
        },
    };

    // ------------------------------------------------------------------
    // Transaction review (held queue + all transactions)
    // ------------------------------------------------------------------
    TP.pages['admin-transactions'] = {
        title: 'Transaction Review',
        admin: true,
        async render(el) {
            const state = { page: 1, status: 'held_for_review', type: '', currency: '' };
            el.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-wrap items-center gap-2">
                    ${[['held_for_review', 'Review queue'], ['', 'All'], ['completed', 'Completed'], ['failed', 'Blocked / failed'], ['cancelled', 'Rejected']].map(([s, l]) => `<button class="tab ${s === state.status ? 'active' : ''}" data-st="${s}">${l}</button>`).join('')}
                    <select class="input w-auto ml-auto text-xs" id="ttype"><option value="">All types</option>${options(['transfer', 'payment', 'exchange', 'top_up', 'booking', 'card_payment', 'crypto_buy', 'crypto_sell', 'refund'].map((x) => [x, TP.label(x)]))}</select>
                </div>
                <div class="glass rounded-2xl p-2 overflow-x-auto" id="tt"></div>
            </div>`;
            const box = el.querySelector('#tt');
            const load = async () => {
                const res = await TP.api('/admin/transactions', { query: { ...state, per_page: 20 } });
                box.innerHTML = res.data.length ? `<table class="data w-full"><thead><tr><th>Reference</th><th>From → To</th><th>Type</th><th class="text-right">Amount</th><th>Risk</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>
                    ${res.data.map((tx) => `<tr>
                        <td class="font-mono text-[11px] text-slate-300">${h(tx.reference_number)}</td>
                        <td class="text-xs"><div class="text-white">${h(tx.user?.name)}</div><div class="text-slate-500">${tx.recipient_user ? '→ ' + h(tx.recipient_user.name) : h(tx.description || '')}</div></td>
                        <td>${chip(TP.label(tx.type), 'cyan')}</td>
                        <td class="text-right font-mono font-semibold text-white">${money(tx.amount, tx.currency_code)}</td>
                        <td><span class="font-mono font-bold ${tx.risk_score >= 60 ? 'text-red-400' : tx.risk_score >= 30 ? 'text-amber-300' : 'text-emerald-400'}">${tx.risk_score}</span></td>
                        <td>${statusChip(tx.status)}</td>
                        <td class="text-[11px] text-slate-400">${TP.date(tx.created_at)}</td>
                        <td class="text-right whitespace-nowrap">${tx.status === 'held_for_review' ? `<button class="btn btn-primary btn-sm" data-approve="${tx.id}">Approve</button> <button class="btn btn-danger btn-sm" data-reject="${tx.id}">Reject</button>` : ''}</td>
                    </tr>`).join('')}</tbody></table>` : empty(state.status === 'held_for_review' ? 'Review queue is empty — nothing held by the risk engine' : 'No transactions', 'review');
                if (res.data.length) box.appendChild(pager(res.meta, (p) => { state.page = p; load(); }));
                box.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', async () => {
                    if (!(await TP.confirm('Approve transaction?', 'Funds will be settled to the recipient and the fraud alert resolved.', 'Approve'))) return;
                    if (await TP.action(() => TP.api(`/admin/transactions/${b.dataset.approve}/approve`, { body: {} }))) { load(); TP.refreshBadges(); }
                }));
                box.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', async () => {
                    if (!(await TP.confirm('Reject transaction?', 'Reserved funds will be released back to the sender.', 'Reject', true))) return;
                    if (await TP.action(() => TP.api(`/admin/transactions/${b.dataset.reject}/reject`, { body: {} }))) { load(); TP.refreshBadges(); }
                }));
            };
            el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => {
                state.status = b.dataset.st; state.page = 1;
                el.querySelectorAll('[data-st]').forEach((x) => x.classList.toggle('active', x === b));
                load();
            }));
            el.querySelector('#ttype').addEventListener('change', (e) => { state.type = e.target.value; state.page = 1; load(); });
            await load();
        },
    };

    // ------------------------------------------------------------------
    // Fraud alerts
    // ------------------------------------------------------------------
    TP.pages['admin-alerts'] = {
        title: 'Fraud Alerts',
        admin: true,
        async render(el) {
            const state = { page: 1, status: 'new', severity: '' };
            el.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex flex-wrap gap-2">
                        ${[['new', 'New'], ['investigating', 'Investigating'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['', 'All']].map(([s, l]) => `<button class="tab ${s === state.status ? 'active' : ''}" data-st="${s}">${l}</button>`).join('')}
                        <select class="input w-auto text-xs" id="sev"><option value="">All severities</option>${options(['low', 'medium', 'high', 'critical'])}</select>
                    </div>
                    <button id="btnNewAlert" class="btn btn-primary btn-sm shrink-0 flex items-center gap-1.5">${TP.icon('plus', 'w-4 h-4')} Create Incident Alert</button>
                </div>
                <div id="al" class="space-y-3"></div>
            </div>`;
            const box = el.querySelector('#al');
            const load = async () => {
                const res = await TP.api('/admin/fraud-alerts', { query: { ...state, per_page: 15 } });
                box.innerHTML = res.data.length ? res.data.map((a) => `
                    <div class="glass rounded-2xl p-5">
                        <div class="flex flex-wrap items-start gap-3">
                            <div class="min-w-0 flex-1">
                                <div class="flex flex-wrap items-center gap-2">${statusChip(a.severity)}<span class="font-bold text-white">${h(a.title)}</span></div>
                                <p class="text-sm text-slate-400 mt-1">${h(a.description)}</p>
                                <div class="flex flex-wrap gap-1.5 mt-2">${(a.triggered_rules || []).map((r) => chip(r, 'purple')).join('')}</div>
                                <div class="text-[11px] text-slate-500 mt-2">${h(a.user?.name)} (${h(a.user?.email)}) · risk <b class="text-amber-300">${a.risk_score}</b>/100 · ${TP.date(a.created_at)}${a.transaction ? ' · tx ' + h(a.transaction.reference_number) + ' ' + statusChip(a.transaction.status) : ''}${a.resolver ? ' · by ' + h(a.resolver.name) : ''}</div>
                            </div>
                            <div class="flex items-center gap-2">
                                ${statusChip(a.status)}
                                <select class="input py-1.5 text-xs w-auto" data-alert="${a.id}">${options(['new', 'investigating', 'resolved', 'dismissed'].map((s) => [s, TP.label(s)]), a.status)}</select>
                            </div>
                        </div>
                    </div>`).join('') : panel('', empty('No alerts in this state', 'shield'));
                if (res.data.length) box.appendChild(pager(res.meta, (p) => { state.page = p; load(); }));
                box.querySelectorAll('[data-alert]').forEach((s) => s.addEventListener('change', async () => {
                    if (await TP.action(() => TP.api(`/admin/fraud-alerts/${s.dataset.alert}/status`, { method: 'PATCH', body: { status: s.value } }))) { load(); TP.refreshBadges(); }
                }));
            };

            el.querySelector('#btnNewAlert').addEventListener('click', () => {
                TP.modal(`
                    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">${TP.icon('alert', 'w-5 h-5 text-red-400')} Create Fraud Incident / Alert</h3>
                    <form id="newAlertForm" class="space-y-3">
                        <div><label class="label">Incident Title *</label><input class="input" name="title" required placeholder="Suspicious International IP and Rapid Payments"></div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Severity Level</label><select class="input" name="severity">${options(['low', 'medium', 'high', 'critical'])}</select></div>
                            <div><label class="label">Risk Score (0-100)</label><input class="input font-mono" type="number" name="risk_score" min="0" max="100" value="85" required></div>
                        </div>
                        <div><label class="label">Description</label><textarea class="input" name="description" rows="2" placeholder="Incident details and investigation findings..."></textarea></div>
                        <div class="flex justify-end gap-2 pt-3">
                            <button type="button" class="btn btn-ghost" data-close>Cancel</button>
                            <button type="submit" class="btn btn-primary">Create Incident</button>
                        </div>
                    </form>
                `, (box) => {
                    box.querySelector('#newAlertForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const body = Object.fromEntries(fd.entries());
                        body.risk_score = Number(body.risk_score);
                        await TP.action(() => TP.api('/admin/fraud-alerts', { method: 'POST', body }), 'Fraud alert created!');
                        TP.closeModal();
                        load();
                    });
                });
            });

            el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => {
                state.status = b.dataset.st; state.page = 1;
                el.querySelectorAll('[data-st]').forEach((x) => x.classList.toggle('active', x === b));
                load();
            }));
            el.querySelector('#sev').addEventListener('change', (e) => { state.severity = e.target.value; load(); });
            await load();
        },
    };

    // ------------------------------------------------------------------
    // Fraud rules (editable)
    // ------------------------------------------------------------------
    TP.pages['admin-rules'] = {
        title: 'Fraud Rules Engine',
        admin: true,
        async render(el) {
            const { data: rules } = await TP.api('/admin/fraud-rules');
            el.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm text-slate-400 max-w-2xl">Each outgoing payment is scored 0–100 by summing the weights of triggered rules. The most severe action wins; scores ≥ 80 are always held. Test changes safely in the <a href="#/admin-sandbox" class="text-cyan-400 hover:underline">Risk Sandbox</a>.</p>
                    <button id="btnNewRule" class="btn btn-primary btn-sm shrink-0 flex items-center gap-1.5">${TP.icon('plus', 'w-4 h-4')} Add Fraud Risk Rule</button>
                </div>
                ${rules.map((r) => `
                <form class="glass rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end" data-rule="${r.id}">
                    <div class="lg:col-span-5">
                        <div class="flex flex-wrap items-center gap-2"><span class="font-mono text-xs font-bold text-cyan-400">${h(r.rule_code)}</span>${chip(r.rule_type, 'purple')}</div>
                        <div class="font-semibold text-white mt-1">${h(r.rule_name)}</div>
                        <div class="text-xs text-slate-400">${h(r.description)}</div>
                    </div>
                    <div class="lg:col-span-2"><label class="label">Threshold (${h(r.condition_operator)})</label><input class="input font-mono" name="threshold_value" value="${h(r.threshold_value)}"></div>
                    <div class="lg:col-span-1"><label class="label">Weight</label><input class="input font-mono" type="number" min="0" max="100" name="risk_weight" value="${r.risk_weight}"></div>
                    <div class="lg:col-span-2"><label class="label">Action</label><select class="input" name="action">${options([['flag', 'Flag'], ['step_up_2fa', 'Step-up 2FA'], ['hold', 'Hold for review'], ['block', 'Block']], r.action)}</select></div>
                    <div class="lg:col-span-2 flex items-center gap-3">
                        <label class="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" name="is_active" class="accent-cyan-500" ${r.is_active ? 'checked' : ''}> Active</label>
                        <button class="btn btn-primary btn-sm ml-auto" type="submit">Save</button>
                    </div>
                </form>`).join('')}
            </div>`;

            el.querySelector('#btnNewRule').addEventListener('click', () => {
                TP.modal(`
                    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">${TP.icon('sliders', 'w-5 h-5 text-cyan-400')} Add Fraud Risk Rule</h3>
                    <form id="newRuleForm" class="space-y-3">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Rule Code *</label><input class="input font-mono uppercase" name="rule_code" required placeholder="VELOCITY_EXTREME"></div>
                            <div><label class="label">Rule Name *</label><input class="input" name="rule_name" required placeholder="High Velocity Transactions"></div>
                        </div>
                        <div><label class="label">Description</label><textarea class="input" name="description" rows="2" placeholder="Rule conditions and risk intent..."></textarea></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="label">Rule Type</label><select class="input" name="rule_type">${options(['velocity', 'threshold', 'pattern', 'country', 'ip_blacklist'])}</select></div>
                            <div><label class="label">Condition Operator</label><select class="input" name="condition_operator">${options(['>', '>=', '<', '<=', '==', 'in', 'contains'])}</select></div>
                            <div><label class="label">Threshold Value</label><input class="input font-mono" name="threshold_value" required value="5000"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Risk Weight (0-100)</label><input class="input font-mono" type="number" name="risk_weight" min="0" max="100" value="40" required></div>
                            <div><label class="label">Action Modifier</label><select class="input" name="action">${options([['flag', 'Flag Transaction'], ['step_up_2fa', 'Step-up 2FA Challenge'], ['hold', 'Hold for Review'], ['block', 'Block Immediately']])}</select></div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3">
                            <button type="button" class="btn btn-ghost" data-close>Cancel</button>
                            <button type="submit" class="btn btn-primary">Add Rule</button>
                        </div>
                    </form>
                `, (box) => {
                    box.querySelector('#newRuleForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const body = Object.fromEntries(fd.entries());
                        body.risk_weight = Number(body.risk_weight);
                        body.is_active = true;
                        await TP.action(() => TP.api('/admin/fraud-rules', { method: 'POST', body }), 'Fraud rule added successfully!');
                        TP.closeModal();
                        TP.pages['admin-rules'].render(el);
                    });
                });
            });

            el.querySelectorAll('[data-rule]').forEach((f) => TP.onSubmit(f, async (data) => {
                data.risk_weight = Number(data.risk_weight);
                const res = await TP.api('/admin/fraud-rules/' + f.dataset.rule, { method: 'PUT', body: data });
                TP.toast(res.message);
            }));
        },
    };

    // ------------------------------------------------------------------
    // Threat monitor (DDoS / WAF / payment-flow anomalies)
    // ------------------------------------------------------------------
    TP.pages['admin-threats'] = {
        title: 'Threat Monitor',
        admin: true,
        async render(el) {
            const { data: d } = await TP.api('/admin/threats');
            const flow = d.payment_flow;

            el.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${stat('API requests (30m)', num(d.totals.requests, 0), `DDoS threshold ${d.shield.ddos_requests_per_minute}/min per IP`, 'cyan', 'bolt')}
                    ${stat('WAF blocks (30m)', num(d.totals.threats, 0), d.shield.waf_signatures.map(TP.label).join(', '), 'red', 'shield')}
                    ${stat('Blocked hits (30m)', num(d.totals.blocked, 0), `${d.totals.active_blocks} active IP blocks`, 'purple', 'lock')}
                    ${stat('Payment anomalies (24h)', num(flow.anomalies, 0), `μ ${flow.mean_per_hour}/h · σ ${flow.std_dev}`, 'amber', 'chart')}
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    ${panel('Edge traffic — last 30 minutes', '<div class="h-60"><canvas id="edgeChart"></canvas></div>')}
                    ${panel('Payment flow — statistical monitoring (24h)', `<div class="h-60"><canvas id="flowChart"></canvas></div>
                        <div class="grid grid-cols-4 gap-2 mt-3 text-center text-[11px]">
                            <div class="p-2 rounded-lg bg-white/5"><div class="text-slate-500">Total</div><div class="text-white font-bold">${flow.total_24h}</div></div>
                            <div class="p-2 rounded-lg bg-white/5"><div class="text-slate-500">Held</div><div class="text-purple-300 font-bold">${flow.held_24h}</div></div>
                            <div class="p-2 rounded-lg bg-white/5"><div class="text-slate-500">Blocked</div><div class="text-red-300 font-bold">${flow.failed_24h}</div></div>
                            <div class="p-2 rounded-lg bg-white/5"><div class="text-slate-500">Avg risk</div><div class="text-amber-300 font-bold">${flow.avg_risk_24h}</div></div>
                        </div>`)}
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    ${panel('Blocked IP addresses', `
                        <form id="blockForm" class="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
                            <input class="input font-mono" name="ip_address" required placeholder="203.0.113.7">
                            <input class="input sm:col-span-2" name="reason" required placeholder="Reason (botnet, brute force…)">
                            <select class="input" name="minutes">${options([[60, '1 hour'], [1440, '1 day'], [10080, '7 days'], ['', 'Permanent']])}</select>
                            <button class="btn btn-danger sm:col-span-4" type="submit">${icon('lock', 'w-4 h-4')} Block IP</button>
                        </form>
                        ${d.blocked_ips.length ? `<div class="overflow-x-auto"><table class="data w-full"><thead><tr><th>IP</th><th>Reason</th><th>Source</th><th>Hits</th><th>Until</th><th></th></tr></thead><tbody>${d.blocked_ips.map((b) => `
                            <tr class="${b.active ? '' : 'opacity-50'}"><td class="font-mono text-white">${h(b.ip_address)}</td><td class="text-xs text-slate-300">${h(b.reason)}</td><td>${chip(TP.label(b.source), b.source === 'manual' ? 'slate' : 'red')}</td><td class="font-mono">${b.hits}</td><td class="text-[11px] text-slate-400">${b.blocked_until ? TP.date(b.blocked_until) : 'permanent'}</td>
                            <td class="text-right"><button class="btn btn-ghost btn-sm" data-unblock="${b.id}">Unblock</button></td></tr>`).join('')}</tbody></table></div>` : empty('No blocked IPs', 'lock')}`, '', 'xl:col-span-2')}
                    <div class="space-y-6">
                        ${panel('Events by severity (24h)', `<div class="space-y-2">${['critical', 'high', 'medium', 'low', 'info'].map((s) => `<div class="flex items-center justify-between">${statusChip(s)}<span class="font-mono text-white">${d.events_by_severity[s] || 0}</span></div>`).join('')}</div>`)}
                        ${panel('Top risky IPs (24h)', d.top_risky_ips.length ? `<div class="space-y-2">${d.top_risky_ips.map((r) => `<div class="flex items-center justify-between text-sm"><span class="font-mono text-slate-300">${h(r.ip_address)}</span><span class="text-red-300 font-bold">${r.total}</span></div>`).join('')}</div>` : empty('None', 'globe'))}
                    </div>
                </div>
                ${panel('Recent threats', d.recent_threats.length ? `<div class="overflow-x-auto"><table class="data w-full"><thead><tr><th>Event</th><th>Severity</th><th>IP</th><th>Details</th><th>When</th></tr></thead><tbody>${d.recent_threats.map((e) => `
                    <tr><td class="text-white">${h(TP.label(e.event_type))}</td><td>${statusChip(e.severity)}</td><td class="font-mono text-xs">${h(e.ip_address || '—')}</td><td class="text-[11px] text-slate-400 font-mono max-w-xs truncate">${h(e.metadata ? JSON.stringify(e.metadata) : '')}</td><td class="text-[11px] text-slate-500">${TP.ago(e.created_at)}</td></tr>`).join('')}</tbody></table></div>` : empty('No threats detected', 'shield'),
                    '<button class="btn btn-ghost btn-sm" id="wafTest">Test WAF</button>')}
            </div>`;

            TP.chart(el.querySelector('#edgeChart'), {
                type: 'line',
                data: {
                    labels: d.timeline.map((x) => x.minute),
                    datasets: [
                        { label: 'Requests', data: d.timeline.map((x) => x.requests), borderColor: '#22D3EE', backgroundColor: 'rgba(34,211,238,.1)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 },
                        { label: 'WAF blocks', data: d.timeline.map((x) => x.threats), borderColor: '#F87171', tension: 0.3, pointRadius: 0, borderWidth: 2 },
                        { label: 'Blocked IP hits', data: d.timeline.map((x) => x.blocked), borderColor: '#A78BFA', tension: 0.3, pointRadius: 0, borderWidth: 2 },
                    ],
                },
                options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { grid, beginAtZero: true, ticks: { precision: 0 } } } },
            });
            TP.chart(el.querySelector('#flowChart'), {
                type: 'bar',
                data: {
                    labels: flow.series.map((x) => x.hour),
                    datasets: [{
                        label: 'Transactions/hour',
                        data: flow.series.map((x) => x.count),
                        backgroundColor: flow.series.map((x) => (x.anomaly ? 'rgba(248,113,113,.85)' : 'rgba(52,211,153,.6)')),
                        borderRadius: 4,
                    }],
                },
                options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (c) => `z-score ${flow.series[c.dataIndex].z_score} · avg risk ${flow.series[c.dataIndex].avg_risk}` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }, y: { grid, beginAtZero: true, ticks: { precision: 0 } } } },
            });

            TP.onSubmit(el.querySelector('#blockForm'), async (data) => {
                if (!data.minutes) delete data.minutes;
                const res = await TP.api('/admin/blocked-ips', { body: data });
                TP.toast(res.message);
                TP.reload();
            });
            el.querySelectorAll('[data-unblock]').forEach((b) => b.addEventListener('click', async () => {
                if (await TP.action(() => TP.api('/admin/blocked-ips/' + b.dataset.unblock, { method: 'DELETE' }))) TP.reload();
            }));
            el.querySelector('#wafTest').addEventListener('click', async () => {
                try {
                    await TP.api('/wallet/recipient-lookup', { body: { query: "' UNION SELECT password FROM users --" } });
                } catch (e) {
                    TP.toast(`WAF: ${e.message}`, e.data?.error_code === 'waf_blocked' ? 'success' : 'error');
                }
                setTimeout(TP.reload, 400);
            });
        },
    };

    // ------------------------------------------------------------------
    // Risk sandbox
    // ------------------------------------------------------------------
    TP.pages['admin-sandbox'] = {
        title: 'Risk Sandbox',
        admin: true,
        async render(el) {
            const scenarios = [
                ['normal', 'Normal traffic', 'Everyday low-value payments from trusted devices.'],
                ['tourist_peak', 'Tourist peak season', 'Higher amounts, some new devices (travellers).'],
                ['card_testing', 'Card-testing attack', 'Bursts of tiny payments from untrusted devices.'],
                ['account_takeover', 'Account takeover', 'Failed logins, new device, large transfers.'],
            ];
            el.innerHTML = `
            <div class="space-y-6">
                <p class="text-sm text-slate-400 max-w-3xl">Run synthetic traffic through the <b class="text-white">live fraud rules</b> without moving real money — a regulatory-style sandbox for tuning the engine before enabling new rules (CBDC / instant-payment readiness testing).</p>
                <form id="sbForm" class="glass rounded-2xl p-5 space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        ${scenarios.map(([v, l, d], i) => `<label class="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer has-[:checked]:border-cyan-400/60 has-[:checked]:bg-cyan-500/10">
                            <input type="radio" name="scenario" value="${v}" class="accent-cyan-500" ${i === 3 ? 'checked' : ''}> <span class="text-sm font-semibold text-white">${l}</span>
                            <span class="block text-xs text-slate-400 mt-1">${d}</span></label>`).join('')}
                    </div>
                    <div class="flex flex-wrap items-end gap-3">
                        <div><label class="label">Synthetic transactions</label><input class="input w-40" type="number" name="count" min="10" max="5000" value="1000"></div>
                        <button class="btn btn-primary" type="submit">${icon('beaker', 'w-4 h-4')} Run simulation</button>
                    </div>
                </form>
                <div id="sbResult"></div>
            </div>`;

            TP.onSubmit(el.querySelector('#sbForm'), async (data) => {
                const { data: r } = await TP.api('/admin/sandbox/simulate', { body: { scenario: data.scenario, count: Number(data.count) } });
                const out = el.querySelector('#sbResult');
                out.innerHTML = `
                <div class="space-y-6 fade-in">
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        ${stat('Simulated', num(r.transactions, 0), TP.label(r.scenario), 'cyan', 'beaker')}
                        ${stat('Interception rate', r.interception_rate + '%', '2FA + hold + block', 'red', 'shield')}
                        ${stat('Average risk', r.avg_risk_score, `max ${r.max_risk_score}`, 'amber', 'chart')}
                        ${stat('Allowed clean', num(r.outcomes.allow, 0), `${num(r.outcomes.flag, 0)} flagged`, 'emerald', 'check')}
                    </div>
                    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        ${panel('Engine decisions', '<div class="h-60"><canvas id="sbChart"></canvas></div>')}
                        ${panel('Rule hits', Object.keys(r.rule_hits).length ? `<div class="space-y-3">${Object.entries(r.rule_hits).map(([k, v]) => `<div><div class="flex justify-between text-xs"><span class="font-mono text-cyan-300">${h(k)}</span><span class="text-white">${v}</span></div><div class="h-1.5 rounded-full bg-white/10 mt-1"><div class="h-full rounded-full bg-purple-400" style="width:${(v / r.transactions) * 100}%"></div></div></div>`).join('')}</div>` : empty('No rule fired', 'sliders'))}
                        ${panel('Sample decisions', `<div class="space-y-2 text-xs">${r.samples.map((s) => `<div class="p-2.5 rounded-lg bg-white/5 flex items-center gap-2"><span class="font-mono text-slate-300 flex-1">${num(s.context.amount_azn, 0)} AZN · v${s.context.velocity_10m} · ${h(s.context.device_status)} · ${s.context.failed_logins_1h} fails</span><span class="font-mono text-amber-300">${s.score}</span>${statusChip(s.action)}</div>`).join('')}</div>`)}
                    </div>
                </div>`;
                const labels = ['allow', 'flag', 'step_up_2fa', 'hold', 'block'];
                TP.chart(out.querySelector('#sbChart'), {
                    type: 'doughnut',
                    data: { labels: labels.map(TP.label), datasets: [{ data: labels.map((k) => r.outcomes[k]), backgroundColor: ['#34D399', '#22D3EE', '#FBBF24', '#A78BFA', '#F87171'], borderWidth: 0 }] },
                    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } },
                });
            });
        },
    };

    // ------------------------------------------------------------------
    // Ledger
    // ------------------------------------------------------------------
    TP.pages['admin-ledger'] = {
        title: 'Double-Entry Ledger',
        admin: true,
        async render(el) {
            const { data: d } = await TP.api('/admin/ledger', { query: { limit: 60 } });
            el.innerHTML = `
            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-base font-bold text-white">Double-Entry General Ledger</h2>
                        <p class="text-xs text-slate-400">Balance verification and official double-entry ledger journals.</p>
                    </div>
                    <button id="btnNewJournal" class="btn btn-primary btn-sm flex items-center gap-1.5">${TP.icon('plus', 'w-4 h-4')} Post Manual Journal Entry</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${d.trial_balance.map((t) => `
                    <div class="glass rounded-2xl p-5">
                        <div class="flex items-center justify-between"><span class="font-bold text-white">${t.currency_code} trial balance</span>${t.balanced ? chip('Balanced', 'green') : chip('UNBALANCED', 'red')}</div>
                        <div class="grid grid-cols-2 gap-3 mt-4 text-xs">
                            <div><div class="text-slate-500">Total debits</div><div class="font-mono text-white text-base">${num(t.total_debit)}</div></div>
                            <div><div class="text-slate-500">Total credits</div><div class="font-mono text-white text-base">${num(t.total_credit)}</div></div>
                        </div>
                    </div>`).join('') || panel('', empty('No ledger entries yet', 'book'))}
                </div>
                ${panel('Chart of accounts', `<div class="overflow-x-auto"><table class="data w-full"><thead><tr><th>Account</th><th>Name</th><th>Type</th><th class="text-right">Balance</th></tr></thead><tbody>
                    ${d.accounts.map((a) => `<tr><td class="font-mono text-xs text-cyan-300">${h(a.account_number)}</td><td class="text-white">${h(a.account_name)}</td><td>${chip(a.type, { asset: 'green', liability: 'amber', revenue: 'cyan', equity: 'purple' }[a.type] || 'slate')}</td><td class="text-right font-mono text-white">${money(a.balance, a.currency_code)}</td></tr>`).join('')}
                </tbody></table></div>`)}
                ${panel('Journal — latest entries', `<div class="overflow-x-auto"><table class="data w-full"><thead><tr><th>Transaction</th><th>Account</th><th>Side</th><th class="text-right">Amount</th><th class="text-right">Balance after</th><th>Description</th><th>When</th></tr></thead><tbody>
                    ${d.recent_entries.map((e) => `<tr><td class="font-mono text-[11px] text-slate-300">${h(e.transaction?.reference_number)}</td><td class="font-mono text-[11px] text-cyan-300">${h(e.ledger_account?.account_number)}</td><td>${e.entry_type === 'debit' ? chip('DR', 'cyan') : chip('CR', 'purple')}</td><td class="text-right font-mono">${num(e.amount)} ${e.currency_code}</td><td class="text-right font-mono text-slate-400">${num(e.balance_after)}</td><td class="text-xs text-slate-400 max-w-xs truncate">${h(e.description)}</td><td class="text-[11px] text-slate-500">${TP.ago(e.created_at)}</td></tr>`).join('')}
                </tbody></table></div>`)}
            </div>`;

            el.querySelector('#btnNewJournal').addEventListener('click', () => {
                TP.modal(`
                    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">${TP.icon('book', 'w-5 h-5 text-cyan-400')} Post Manual Journal Entry (Double-Entry)</h3>
                    <form id="newJournalForm" class="space-y-3">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Debit Account (DR) *</label><select class="input font-mono" name="debit_account_id" required>${d.accounts.map(a => `<option value="${a.id}">${h(a.account_number)} — ${h(a.account_name)}</option>`).join('')}</select></div>
                            <div><label class="label">Credit Account (CR) *</label><select class="input font-mono" name="credit_account_id" required>${d.accounts.map(a => `<option value="${a.id}">${h(a.account_number)} — ${h(a.account_name)}</option>`).join('')}</select></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="label">Currency</label><select class="input" name="currency_code">${options(['AZN', 'EUR', 'USD'])}</select></div>
                            <div><label class="label">Amount *</label><input class="input font-mono" type="number" step="0.01" name="amount" required value="100.00"></div>
                        </div>
                        <div><label class="label">Memo / Description *</label><input class="input" name="description" required placeholder="Reserve balancing or manual adjustment entry"></div>
                        <div class="flex justify-end gap-2 pt-3">
                            <button type="button" class="btn btn-ghost" data-close>Cancel</button>
                            <button type="submit" class="btn btn-primary">Post Journal Entry</button>
                        </div>
                    </form>
                `, (box) => {
                    box.querySelector('#newJournalForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const body = Object.fromEntries(fd.entries());
                        body.amount = Number(body.amount);
                        body.debit_account_id = Number(body.debit_account_id);
                        body.credit_account_id = Number(body.credit_account_id);
                        await TP.action(() => TP.api('/admin/ledger/entries', { method: 'POST', body }), 'Journal entry posted successfully!');
                        TP.closeModal();
                        TP.pages['admin-ledger'].render(el);
                    });
                });
            });
        },
    };

    // ------------------------------------------------------------------
    // Travel analytics
    // ------------------------------------------------------------------
    TP.pages['admin-travel'] = {
        title: 'Travel Analytics',
        admin: true,
        async render(el) {
            const [{ data: t }, { data: b }, { data: merchants }, { data: kyc }] = await Promise.all([
                TP.api('/admin/travel-analytics'),
                TP.api('/admin/bookings'),
                TP.api('/admin/merchants'),
                TP.api('/admin/kyc'),
            ]);
            el.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${stat('Trips', num(t.total_trips, 0), t.trips_by_status.map((s) => `${s.count} ${s.status}`).join(' · '), 'cyan', 'map')}
                    ${stat('Bookings', num(b.bookings.length, 0), `${b.bookings.filter((x) => x.payment_method === 'crypto').length} paid with crypto`, 'purple', 'briefcase')}
                    ${stat('Partner merchants', num(merchants.length, 0), `${merchants.reduce((s, m) => s + m.payments_count, 0)} QR payments`, 'amber', 'pin')}
                    ${stat('eKYC checks', num(kyc.length, 0), `${kyc.filter((k) => k.status === 'verified').length} verified`, 'emerald', 'id')}
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    ${panel('Tourist spend by category (AZN)', t.expenses_by_category.length ? '<div class="h-64"><canvas id="tcat"></canvas></div>' : empty('No expenses', 'chart'))}
                    ${panel('Merchant performance', `<div class="overflow-x-auto"><table class="data w-full"><thead><tr><th>Merchant</th><th>City</th><th class="text-right">Payments</th><th class="text-right">Volume</th></tr></thead><tbody>
                        ${merchants.sort((a, c) => c.payments_volume - a.payments_volume).map((m) => `<tr><td><div class="text-white">${h(m.merchant_name)}</div><div class="text-[11px] text-slate-500">${h(m.category)} · ${num(m.cashback_percent, 0)}% cashback</div></td><td class="text-xs text-slate-400">${h(m.city)}</td><td class="text-right font-mono">${m.payments_count}</td><td class="text-right font-mono text-white">${money(m.payments_volume)}</td></tr>`).join('')}
                    </tbody></table></div>`, '', 'xl:col-span-2')}
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    ${panel('Latest bookings', b.bookings.length ? `<div class="divide-y divide-white/5">${b.bookings.slice(0, 10).map((x) => `<div class="flex items-center gap-3 py-2.5"><span class="flex-1 min-w-0"><span class="block text-sm text-white truncate">${h(x.title)}</span><span class="block text-[11px] text-slate-500">${h(x.user?.name)} · ${h(x.booking_reference)}</span></span><span class="font-mono text-xs">${x.payment_method === 'crypto' ? TP.crypto(x.crypto_amount) + ' ' + h(x.crypto_asset) : money(x.amount, x.currency_code)}</span>${statusChip(x.status)}</div>`).join('')}</div>` : empty('No bookings', 'briefcase'))}
                    ${panel('Crypto custody', b.crypto_custody.length ? `<div class="space-y-2">${b.crypto_custody.map((c) => `<div class="flex justify-between p-3 rounded-xl bg-white/5"><span class="font-bold text-white">${h(c.asset_code)}</span><span class="font-mono text-slate-300">${TP.crypto(c.total_units)}</span></div>`).join('')}</div>` : empty('No virtual assets held', 'coin'))}
                </div>
            </div>`;
            if (t.expenses_by_category.length) {
                TP.chart(el.querySelector('#tcat'), {
                    type: 'doughnut',
                    data: { labels: t.expenses_by_category.map((c) => c.name), datasets: [{ data: t.expenses_by_category.map((c) => Number(c.total_amount)), backgroundColor: TP.palette, borderWidth: 0 }] },
                    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } },
                });
            }
        },
    };

    // ------------------------------------------------------------------
    // Audit logs
    // ------------------------------------------------------------------
    TP.pages['admin-audit'] = {
        title: 'Audit Logs',
        admin: true,
        async render(el) {
            const state = { page: 1, action: '' };
            el.innerHTML = `
            <div class="space-y-4">
                <input class="input md:w-80" id="act" placeholder="Filter by action (wallet., admin., user.login…)">
                <div class="glass rounded-2xl p-2 overflow-x-auto" id="logs"></div>
            </div>`;
            const box = el.querySelector('#logs');
            const load = async () => {
                const res = await TP.api('/admin/audit-logs', { query: { ...state, per_page: 25 } });
                box.innerHTML = `<table class="data w-full"><thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Changes</th><th>IP</th></tr></thead><tbody>
                    ${res.data.map((l) => `<tr><td class="text-[11px] text-slate-400 whitespace-nowrap">${TP.date(l.created_at)}</td><td class="text-xs text-white">${h(l.user?.name || 'system')}</td><td><span class="font-mono text-xs text-cyan-300">${h(l.action)}</span></td>
                    <td class="text-[11px] text-slate-400">${h((l.entity_type || '').split('\\').pop())} ${l.entity_id ? '#' + l.entity_id : ''}</td>
                    <td class="text-[11px] font-mono text-slate-400 max-w-sm truncate" title="${h(JSON.stringify(l.new_values || {}))}">${h(l.new_values ? JSON.stringify(l.new_values) : '')}</td><td class="font-mono text-[11px] text-slate-500">${h(l.ip_address || '')}</td></tr>`).join('')}
                </tbody></table>`;
                box.appendChild(pager(res.meta, (p) => { state.page = p; load(); }));
            };
            let t;
            el.querySelector('#act').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.action = e.target.value; state.page = 1; load(); }, 300); });
            await load();
        },
    };

    // ------------------------------------------------------------------
    // API explorer
    // ------------------------------------------------------------------
    TP.pages.api = {
        title: 'REST API Explorer',
        admin: true,
        async render(el) {
            const endpoints = [
                ['GET', '/auth/me', 'Profile'], ['GET', '/wallet/summary', 'Wallet'], ['GET', '/wallet/transactions', 'Wallet'], ['GET', '/wallet/rates', 'FX'],
                ['GET', '/payments/places', 'QR'], ['GET', '/bookings/catalog', 'Travel'], ['GET', '/trips', 'Travel'], ['GET', '/crypto/portfolio', 'Assets'],
                ['GET', '/insights', 'Data'], ['GET', '/security/score', 'Security'], ['GET', '/security/devices', 'Security'], ['GET', '/security/events', 'Security'],
                ['GET', '/admin/dashboard', 'Admin'], ['GET', '/admin/threats', 'Admin'], ['GET', '/admin/ledger', 'Admin'], ['GET', '/admin/fraud-rules', 'Admin'],
            ];
            el.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                ${panel('Endpoints · /api/v1', `<div class="space-y-1.5">${endpoints.map(([m, p, tag]) => `
                    <button class="w-full flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-left" data-ep="${p}">
                        <span class="text-[10px] font-bold font-mono text-emerald-300 w-9">${m}</span><span class="font-mono text-xs ${tag === 'Admin' ? 'text-purple-300' : 'text-cyan-300'} flex-1 truncate">${p}</span><span class="text-[10px] text-slate-500">${tag}</span>
                    </button>`).join('')}</div>`)}
                ${panel('Response', `<div class="flex items-center gap-2 mb-3"><input class="input font-mono text-xs" id="epInput" value="/auth/me"><button class="btn btn-primary" id="epRun">Send</button></div>
                    <div class="text-xs font-mono text-slate-400 mb-2" id="epStatus">Ready — requests use your bearer token and device headers.</div>
                    <pre id="epOut" class="h-[520px] overflow-auto scroll-thin p-4 rounded-xl bg-navy-950/80 border border-white/10 text-emerald-300 font-mono text-xs"></pre>`, '', 'xl:col-span-2')}
            </div>`;
            const run = async (path) => {
                const out = el.querySelector('#epOut');
                const status = el.querySelector('#epStatus');
                el.querySelector('#epInput').value = path;
                status.textContent = 'GET /api/v1' + path + ' …';
                const started = performance.now();
                try {
                    const res = await TP.api(path);
                    status.textContent = `200 OK · ${Math.round(performance.now() - started)} ms`;
                    out.textContent = JSON.stringify(res, null, 2);
                } catch (e) {
                    status.textContent = `${e.status} · ${e.message}`;
                    out.textContent = JSON.stringify(e.data, null, 2);
                }
            };
            el.querySelectorAll('[data-ep]').forEach((b) => b.addEventListener('click', () => run(b.dataset.ep)));
            el.querySelector('#epRun').addEventListener('click', () => run(el.querySelector('#epInput').value.trim()));
            run('/auth/me');
        },
    };
})();
