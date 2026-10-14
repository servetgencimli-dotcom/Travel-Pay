<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>TravelPay Wallet — FinTech & Security Admin Portal</title>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

    <!-- Tailwind CSS (CDN for standalone blade portal) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                    },
                    colors: {
                        navy: {
                            950: '#050B14',
                            900: '#0A1128',
                            800: '#0F1E40',
                            700: '#1A2F60',
                        },
                        neon: {
                            cyan: '#00F2FE',
                            teal: '#0EA5E9',
                            emerald: '#10B981',
                        }
                    }
                }
            }
        }
    </script>

    <style>
        body {
            background-color: #050B14;
            background-image: 
                radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.12) 0px, transparent 50%),
                radial-gradient(at 100% 0%, rgba(0, 242, 254, 0.08) 0px, transparent 50%),
                radial-gradient(at 50% 100%, rgba(16, 185, 129, 0.08) 0px, transparent 50%);
            color: #E2E8F0;
        }
        .glass-panel {
            background: rgba(15, 30, 64, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-panel-glow {
            box-shadow: 0 0 35px -5px rgba(14, 165, 233, 0.15);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(15, 30, 64, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(14, 165, 233, 0.3);
            border-radius: 9999px;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col font-sans selection:bg-neon-teal selection:text-white">

    <!-- Top Navigation Bar -->
    <header class="border-b border-white/10 glass-panel sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-xl font-bold tracking-tight text-white">Travel<span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">Pay</span></span>
                        <span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">WALLET MVP</span>
                    </div>
                    <p class="text-xs text-slate-400">Smart Tourism, Cybersecurity & Ledger System</p>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span class="w-2 h-2 -ml-3 rounded-full bg-emerald-400"></span>
                    <span>System Online & Operational</span>
                </div>

                <a href="http://localhost:8080" target="_blank" class="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z"/></svg>
                    <span>phpMyAdmin (3307)</span>
                </a>

                <button id="adminLoginBtn" onclick="quickAdminLogin()" class="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                    <span id="adminBtnText">One-Click Admin Login</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <!-- Top Banner / System Health & Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl"></div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Registered Users</span>
                    <span class="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </span>
                </div>
                <div class="text-3xl font-extrabold text-white" id="statUserCount">{{ $userCount ?? 3 }}</div>
                <div class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <span class="text-emerald-400 font-semibold">1 Admin</span> • 2 Demo Users
                </div>
            </div>

            <div class="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-teal-500/10 rounded-full blur-xl"></div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Digital Wallets</span>
                    <span class="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    </span>
                </div>
                <div class="text-3xl font-extrabold text-white" id="statWalletCount">{{ $walletCount ?? 3 }}</div>
                <div class="text-xs text-slate-400 mt-1">
                    Multi-Currency: <span class="text-white font-medium">AZN, EUR, USD</span>
                </div>
            </div>

            <div class="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl"></div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Fraud Detection Rules</span>
                    <span class="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </span>
                </div>
                <div class="text-3xl font-extrabold text-white" id="statRuleCount">{{ $fraudRuleCount ?? 5 }}</div>
                <div class="text-xs text-slate-400 mt-1">
                    Risk Engine: <span class="text-emerald-400 font-medium">Active (0-100 Score)</span>
                </div>
            </div>

            <div class="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl"></div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Infrastructure</span>
                    <span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
                    </span>
                </div>
                <div class="text-3xl font-extrabold text-white">Docker + Herd</div>
                <div class="text-xs text-slate-400 mt-1">
                    MySQL 8 (3307) • Redis (6379)
                </div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-3 border-b border-white/10 pb-4">
            <button onclick="switchTab('overview')" id="tabBtn-overview" class="tab-btn px-4 py-2 rounded-xl text-sm font-semibold transition bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Dashboard Overview
            </button>
            <button onclick="switchTab('users')" id="tabBtn-users" class="tab-btn px-4 py-2 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5">
                Users & Wallets
            </button>
            <button onclick="switchTab('fraud')" id="tabBtn-fraud" class="tab-btn px-4 py-2 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5">
                Cybersecurity & Fraud Rules
            </button>
            <button onclick="switchTab('api')" id="tabBtn-api" class="tab-btn px-4 py-2 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5">
                REST API Explorer
            </button>
        </div>

        <!-- TAB 1: OVERVIEW -->
        <section id="tab-overview" class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- System Information -->
                <div class="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
                    <div class="flex items-center justify-between border-b border-white/10 pb-3">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                            TravelPay University MVP Architecture
                        </h3>
                        <span class="text-xs text-slate-400 font-mono">Laravel 12 / PHP 8.4</span>
                    </div>

                    <p class="text-sm text-slate-300 leading-relaxed">
                        Welcome to the <strong>TravelPay Wallet</strong> control center. This platform implements a high-security, simulated multi-currency FinTech digital wallet designed specifically for international travel and smart tourism, equipped with automated fraud analysis and double-entry financial accounting.
                    </p>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div class="p-3.5 rounded-xl bg-white/5 border border-white/5">
                            <div class="text-xs font-semibold text-cyan-300 mb-1">Double-Entry Ledger Core</div>
                            <div class="text-xs text-slate-400">Every wallet transfer and conversion generates balanced debit and credit entries, guaranteeing mathematically consistent audits.</div>
                        </div>
                        <div class="p-3.5 rounded-xl bg-white/5 border border-white/5">
                            <div class="text-xs font-semibold text-emerald-300 mb-1">Cybersecurity & Fraud Engine</div>
                            <div class="text-xs text-slate-400">Automated 0–100 risk scoring analyzing transaction velocity, anomalous thresholds, new devices, and geolocation changes.</div>
                        </div>
                        <div class="p-3.5 rounded-xl bg-white/5 border border-white/5">
                            <div class="text-xs font-semibold text-purple-300 mb-1">Multi-Currency Wallet (AZN, EUR, USD)</div>
                            <div class="text-xs text-slate-400">Instant in-app currency conversions with pegged baseline rates and locked available balance safeguards.</div>
                        </div>
                        <div class="p-3.5 rounded-xl bg-white/5 border border-white/5">
                            <div class="text-xs font-semibold text-amber-300 mb-1">Smart Tourism & TravelPay</div>
                            <div class="text-xs text-slate-400">Trip itinerary planning, category expense tracking (Hotels, Dining, Transit), and QR merchant payment receipts.</div>
                        </div>
                    </div>
                </div>

                <!-- Demo Credentials Quick Card -->
                <div class="glass-panel p-6 rounded-2xl space-y-4">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        Pre-Seeded Demo Accounts
                    </h3>
                    <p class="text-xs text-slate-400">Use these credentials to authenticate in the Admin Dashboard or Mobile App.</p>

                    <div class="space-y-3 pt-1">
                        <div class="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-cyan-400">Administrator</span>
                                <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">ROLE: ADMIN</span>
                            </div>
                            <div class="mt-1 font-mono text-xs text-slate-200">admin@travelpay.com</div>
                            <div class="font-mono text-xs text-slate-400">Password: <span class="text-white">Password123!</span></div>
                        </div>

                        <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-emerald-400">Primary Student / Traveler</span>
                                <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">ROLE: USER</span>
                            </div>
                            <div class="mt-1 font-mono text-xs text-slate-200">elvin@travelpay.com</div>
                            <div class="font-mono text-xs text-slate-400">Password: <span class="text-white">Password123!</span></div>
                        </div>

                        <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-purple-400">P2P Counterparty</span>
                                <span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">ROLE: USER</span>
                            </div>
                            <div class="mt-1 font-mono text-xs text-slate-200">aysel@travelpay.com</div>
                            <div class="font-mono text-xs text-slate-400">Password: <span class="text-white">Password123!</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- TAB 2: USERS & WALLETS -->
        <section id="tab-users" class="hidden space-y-6">
            <div class="glass-panel p-6 rounded-2xl space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-bold text-white">Registered Users & Digital Wallets</h3>
                        <p class="text-xs text-slate-400">Live multi-currency balances backed by MySQL 8 database.</p>
                    </div>
                    <button onclick="loadUsers()" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        Refresh Table
                    </button>
                </div>

                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                                <th class="py-3 px-4">User</th>
                                <th class="py-3 px-4">Wallet Number</th>
                                <th class="py-3 px-4">AZN Balance</th>
                                <th class="py-3 px-4">EUR Balance</th>
                                <th class="py-3 px-4">USD Balance</th>
                                <th class="py-3 px-4">Status</th>
                                <th class="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody" class="divide-y divide-white/5 font-mono">
                            @foreach ($users as $u)
                            <tr class="hover:bg-white/5 transition">
                                <td class="py-3.5 px-4 font-sans">
                                    <div class="font-bold text-white">{{ $u->name }}</div>
                                    <div class="text-[11px] text-slate-400 font-mono">{{ $u->email }}</div>
                                </td>
                                <td class="py-3.5 px-4 text-cyan-400 font-semibold">{{ $u->wallet?->wallet_number ?? 'N/A' }}</td>
                                <td class="py-3.5 px-4 text-emerald-400 font-bold">
                                    ₼ {{ number_format($u->wallet?->balances->firstWhere('currency_code', 'AZN')?->balance ?? 0, 2) }}
                                </td>
                                <td class="py-3.5 px-4 text-blue-400 font-bold">
                                    € {{ number_format($u->wallet?->balances->firstWhere('currency_code', 'EUR')?->balance ?? 0, 2) }}
                                </td>
                                <td class="py-3.5 px-4 text-amber-400 font-bold">
                                    $ {{ number_format($u->wallet?->balances->firstWhere('currency_code', 'USD')?->balance ?? 0, 2) }}
                                </td>
                                <td class="py-3.5 px-4 font-sans">
                                    <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold {{ $u->status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20' }}">
                                        {{ strtoupper($u->status) }}
                                    </span>
                                </td>
                                <td class="py-3.5 px-4 text-right font-sans">
                                    <button onclick="toggleUserStatus({{ $u->id }}, '{{ $u->status === 'active' ? 'frozen' : 'active' }}')" class="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition">
                                        {{ $u->status === 'active' ? 'Freeze' : 'Activate' }}
                                    </button>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- TAB 3: FRAUD RULES -->
        <section id="tab-fraud" class="hidden space-y-6">
            <div class="glass-panel p-6 rounded-2xl space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-bold text-white">Cybersecurity & Anti-Fraud Rules Engine</h3>
                        <p class="text-xs text-slate-400">Configurable risk weights and automated action thresholds.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-3">
                    @foreach ($fraudRules as $rule)
                    <div class="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2">
                                <span class="font-mono text-xs font-bold text-cyan-400">{{ $rule->rule_code }}</span>
                                <span class="text-sm font-semibold text-white">{{ $rule->rule_name }}</span>
                                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase">{{ $rule->rule_type }}</span>
                            </div>
                            <p class="text-xs text-slate-400">{{ $rule->description }}</p>
                            <div class="text-[11px] text-slate-500 font-mono">
                                Condition: <span class="text-slate-300">{{ $rule->condition_operator }} {{ $rule->threshold_value }}</span> • Risk Weight: <span class="text-amber-400 font-bold">+{{ $rule->risk_weight }} pts</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <span class="px-2.5 py-1 rounded text-xs font-mono font-semibold {{ $rule->action === 'hold' ? 'bg-red-500/20 text-red-400' : ($rule->action === 'step_up_2fa' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400') }}">
                                Action: {{ strtoupper($rule->action) }}
                            </span>
                            <span class="px-2 py-1 rounded text-xs font-semibold {{ $rule->is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800' }}">
                                {{ $rule->is_active ? 'Active' : 'Disabled' }}
                            </span>
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>
        </section>

        <!-- TAB 4: API EXPLORER -->
        <section id="tab-api" class="hidden space-y-6">
            <div class="glass-panel p-6 rounded-2xl space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-bold text-white">Live API v1 Endpoints & Test Console</h3>
                        <p class="text-xs text-slate-400">Execute and test live REST API endpoints directly from the browser.</p>
                    </div>
                    <div id="tokenBadge" class="text-xs font-mono text-slate-400">
                        Token: <span id="tokenStatus" class="text-red-400 font-semibold">Not Authenticated</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Actions</label>
                        <div class="flex flex-col gap-2">
                            <button onclick="testApi('/api/v1/auth/me', 'GET')" class="p-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-xs flex items-center justify-between">
                                <span class="font-mono text-cyan-400">GET /api/v1/auth/me</span>
                                <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">Profile</span>
                            </button>
                            <button onclick="testApi('/api/v1/security/devices', 'GET')" class="p-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-xs flex items-center justify-between">
                                <span class="font-mono text-cyan-400">GET /api/v1/security/devices</span>
                                <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">Devices</span>
                            </button>
                            <button onclick="testApi('/api/v1/security/events', 'GET')" class="p-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-xs flex items-center justify-between">
                                <span class="font-mono text-cyan-400">GET /api/v1/security/events</span>
                                <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">Audit</span>
                            </button>
                            <button onclick="testApi('/api/v1/admin/dashboard', 'GET')" class="p-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-xs flex items-center justify-between">
                                <span class="font-mono text-purple-400">GET /api/v1/admin/dashboard</span>
                                <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Admin</span>
                            </button>
                            <button onclick="testApi('/api/v1/admin/fraud-rules', 'GET')" class="p-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-xs flex items-center justify-between">
                                <span class="font-mono text-purple-400">GET /api/v1/admin/fraud-rules</span>
                                <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Admin</span>
                            </button>
                        </div>
                    </div>

                    <div class="lg:col-span-2 space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Response Output</label>
                            <span id="responseStatus" class="font-mono text-xs text-slate-400">Ready</span>
                        </div>
                        <pre id="apiOutput" class="w-full h-80 p-4 rounded-xl bg-navy-950/80 border border-white/10 text-emerald-400 font-mono text-xs overflow-auto custom-scrollbar">Click any endpoint on the left to execute test.</pre>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-white/10 glass-panel py-6 mt-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div>
                <span class="text-white font-semibold">TravelPay Wallet</span> — University FinTech & Smart Tourism Project
            </div>
            <div class="flex items-center gap-6">
                <span>MySQL 8 • Port 3307</span>
                <span>Redis • Port 6379</span>
                <span>API v1 REST</span>
            </div>
        </div>
    </footer>

    <!-- Interactive Scripts -->
    <script>
        let currentAuthToken = localStorage.getItem('travelpay_token') || '';

        if (currentAuthToken) {
            updateAuthBadge(currentAuthToken);
        }

        function switchTab(tabId) {
            document.querySelectorAll('section[id^="tab-"]').forEach(el => el.classList.add('hidden'));
            document.getElementById('tab-' + tabId).classList.remove('hidden');

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5';
            });
            document.getElementById('tabBtn-' + tabId).className = 'tab-btn px-4 py-2 rounded-xl text-sm font-semibold transition bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
        }

        async function quickAdminLogin() {
            const btn = document.getElementById('adminBtnText');
            btn.innerText = 'Authenticating...';

            try {
                const res = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        email: 'admin@travelpay.com',
                        password: 'Password123!'
                    })
                });

                const data = await res.json();
                if (res.ok && data.data && data.data.token) {
                    currentAuthToken = data.data.token;
                    localStorage.setItem('travelpay_token', currentAuthToken);
                    updateAuthBadge(currentAuthToken);
                    alert('Authenticated as TravelPay Administrator! Admin endpoints are now unlocked.');
                } else {
                    alert('Login failed: ' + (data.message || 'Unknown error'));
                    btn.innerText = 'One-Click Admin Login';
                }
            } catch (err) {
                alert('Connection error: ' + err.message);
                btn.innerText = 'One-Click Admin Login';
            }
        }

        function updateAuthBadge(token) {
            const btn = document.getElementById('adminBtnText');
            if (btn) btn.innerText = 'Admin Connected ✓';
            const status = document.getElementById('tokenStatus');
            if (status) {
                status.className = 'text-emerald-400 font-semibold';
                status.innerText = 'Bearer ' + token.substring(0, 10) + '...';
            }
        }

        async function testApi(endpoint, method = 'GET') {
            const out = document.getElementById('apiOutput');
            const statusEl = document.getElementById('responseStatus');
            out.innerText = 'Executing ' + method + ' ' + endpoint + '...';
            statusEl.innerText = 'Sending request...';

            try {
                const headers = {
                    'Accept': 'application/json'
                };
                if (currentAuthToken) {
                    headers['Authorization'] = 'Bearer ' + currentAuthToken;
                }

                const res = await fetch(endpoint, {
                    method: method,
                    headers: headers
                });

                statusEl.innerText = 'HTTP ' + res.status + ' ' + res.statusText;
                const json = await res.json();
                out.innerText = JSON.stringify(json, null, 2);
            } catch (err) {
                statusEl.innerText = 'Error';
                out.innerText = 'Error: ' + err.message;
            }
        }

        async function toggleUserStatus(userId, newStatus) {
            if (!currentAuthToken) {
                alert('Please click "One-Click Admin Login" first to authorize this action.');
                return;
            }

            try {
                const res = await fetch(`/api/v1/admin/users/${userId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + currentAuthToken
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    window.location.reload();
                } else {
                    alert('Failed: ' + (data.message || 'Error'));
                }
            } catch (e) {
                alert('Request error: ' + e.message);
            }
        }
    </script>
</body>
</html>
