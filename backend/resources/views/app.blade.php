<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>TravelPay — Smart Tourism Wallet</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

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
                        navy: { 950: '#050B14', 900: '#0A1128', 800: '#0F1E40', 700: '#1A2F60' },
                        neon: { cyan: '#00F2FE', teal: '#0EA5E9', emerald: '#10B981' },
                    },
                },
            },
        };
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

    <style>
        body {
            background-color: #050B14;
            background-image:
                radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.12) 0px, transparent 50%),
                radial-gradient(at 100% 0%, rgba(0, 242, 254, 0.08) 0px, transparent 50%),
                radial-gradient(at 50% 100%, rgba(16, 185, 129, 0.08) 0px, transparent 50%);
            background-attachment: fixed;
            color: #E2E8F0;
        }
        .glass { background: rgba(15, 30, 64, 0.65); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
        .glass-strong { background: rgba(10, 17, 40, 0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
        .scroll-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scroll-thin::-webkit-scrollbar-track { background: transparent; }
        .scroll-thin::-webkit-scrollbar-thumb { background: rgba(14, 165, 233, 0.3); border-radius: 9999px; }

        /* Sidebar */
        #sidebar { width: 272px; transition: width .2s ease, transform .25s ease; }
        .nav-section { font-size: 10px; letter-spacing: .14em; }
        .nav-link { position: relative; transition: background .15s, color .15s; }
        .nav-link.active { background: linear-gradient(90deg, rgba(6,182,212,.18), rgba(6,182,212,.04)); color: #67E8F9; }
        .nav-link.active::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 4px 4px 0; background: #22D3EE; }
        body.sb-collapsed #sidebar { width: 80px; }
        body.sb-collapsed #sidebar .sb-label, body.sb-collapsed #sidebar .nav-section-label, body.sb-collapsed #sidebar .sb-hide { display: none; }
        body.sb-collapsed #sidebar .nav-section { height: 1px; margin: 10px 18px; background: rgba(255,255,255,.08); }
        body.sb-collapsed #sidebar .nav-link { justify-content: center; }
        body.sb-collapsed #main { margin-left: 80px; }
        #main { margin-left: 272px; transition: margin-left .2s ease; }
        @media (max-width: 1023px) {
            #sidebar { transform: translateX(-100%); width: 272px !important; }
            body.sb-open #sidebar { transform: translateX(0); }
            #main, body.sb-collapsed #main { margin-left: 0; }
            body.sb-collapsed #sidebar .sb-label, body.sb-collapsed #sidebar .nav-section-label, body.sb-collapsed #sidebar .sb-hide { display: initial; }
        }

        .input { width: 100%; background: rgba(5, 11, 20, .6); border: 1px solid rgba(255,255,255,.1); border-radius: .75rem; padding: .6rem .85rem; font-size: .875rem; color: #fff; outline: none; transition: border-color .15s, box-shadow .15s; }
        .input:focus { border-color: rgba(34, 211, 238, .6); box-shadow: 0 0 0 3px rgba(34, 211, 238, .12); }
        select.input option { background: #0A1128; }
        .label { display: block; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #94A3B8; margin-bottom: .4rem; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; border-radius: .75rem; padding: .6rem 1rem; font-size: .8rem; font-weight: 600; transition: all .15s; white-space: nowrap; }
        .btn:disabled { opacity: .5; cursor: not-allowed; }
        .btn-primary { background: linear-gradient(90deg, #06B6D4, #14B8A6); color: #fff; box-shadow: 0 8px 24px -8px rgba(6,182,212,.5); }
        .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
        .btn-ghost { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #CBD5E1; }
        .btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.1); color: #fff; }
        .btn-danger { background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3); color: #FCA5A5; }
        .btn-danger:hover:not(:disabled) { background: rgba(239,68,68,.22); }
        .btn-sm { padding: .35rem .65rem; font-size: .72rem; border-radius: .55rem; }
        .chip { display: inline-flex; align-items: center; gap: .3rem; padding: .15rem .55rem; border-radius: 9999px; font-size: .68rem; font-weight: 600; border: 1px solid transparent; }
        .tab { padding: .5rem .9rem; border-radius: .7rem; font-size: .8rem; font-weight: 600; color: #94A3B8; transition: all .15s; }
        .tab:hover { color: #fff; background: rgba(255,255,255,.05); }
        .tab.active { background: rgba(6,182,212,.18); color: #67E8F9; border: 1px solid rgba(6,182,212,.3); }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.09), rgba(255,255,255,.04)); background-size: 200% 100%; animation: sk 1.2s infinite; border-radius: .75rem; }
        @keyframes sk { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .fade-in { animation: fi .25s ease; }
        @keyframes fi { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        .vcard { background: linear-gradient(135deg, #0EA5E9 0%, #0F766E 55%, #0A1128 100%); }
        .vcard.frozen { filter: grayscale(.85) brightness(.7); }
        .qr-box img, .qr-box canvas { border-radius: .75rem; background: #fff; padding: 10px; }
        table.data th { font-size: .66rem; text-transform: uppercase; letter-spacing: .08em; color: #94A3B8; font-weight: 700; padding: .7rem .9rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,.08); white-space: nowrap; }
        table.data td { padding: .75rem .9rem; border-bottom: 1px solid rgba(255,255,255,.04); font-size: .8rem; vertical-align: middle; }
        table.data tbody tr:hover { background: rgba(255,255,255,.03); }
    </style>
</head>
<body class="min-h-screen font-sans selection:bg-cyan-500 selection:text-white">

    <!-- ============ AUTH SCREEN ============ -->
    <div id="authScreen" class="hidden min-h-screen grid lg:grid-cols-2">
        <div class="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden">
            <div class="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
            <div class="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div class="relative flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30" data-icon="logo"></div>
                <span class="text-2xl font-extrabold tracking-tight text-white">Travel<span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">Pay</span></span>
            </div>
            <div class="relative space-y-6 max-w-lg">
                <h1 class="text-4xl font-extrabold text-white leading-tight">One wallet for every payment in <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-300">Azerbaijan</span>.</h1>
                <p class="text-slate-400">Multi-currency wallet, instant QR & P2P payments, hotel and flight bookings with virtual assets — protected by a real-time fraud engine, WAF and DDoS shield.</p>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="glass rounded-xl p-3"><div class="text-cyan-300 font-semibold">Instant payments</div><div class="text-xs text-slate-400">QR, P2P, multi-currency</div></div>
                    <div class="glass rounded-xl p-3"><div class="text-emerald-300 font-semibold">Smart tourism</div><div class="text-xs text-slate-400">Trips, budgets, bookings</div></div>
                    <div class="glass rounded-xl p-3"><div class="text-purple-300 font-semibold">Cybersecurity</div><div class="text-xs text-slate-400">2FA, tokenization, WAF</div></div>
                    <div class="glass rounded-xl p-3"><div class="text-amber-300 font-semibold">Virtual assets</div><div class="text-xs text-slate-400">Pay hotels with crypto</div></div>
                </div>
            </div>
            <p class="relative text-xs text-slate-500">University FinTech & Smart Tourism Project — sandbox environment.</p>
        </div>

        <div class="flex items-center justify-center p-6">
            <div class="w-full max-w-md glass-strong rounded-3xl p-7 space-y-6 fade-in">
                <div class="lg:hidden flex items-center gap-2">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center" data-icon="logo"></div>
                    <span class="text-xl font-extrabold text-white">Travel<span class="text-cyan-400">Pay</span></span>
                </div>
                <div class="flex gap-2">
                    <button class="tab active" data-auth-tab="login">Sign in</button>
                    <button class="tab" data-auth-tab="register">Create account</button>
                </div>

                <form id="loginForm" class="space-y-4">
                    <div><label class="label">Email</label><input class="input" name="email" type="email" required autocomplete="username"></div>
                    <div><label class="label">Password</label><input class="input" name="password" type="password" required autocomplete="current-password"></div>
                    <div id="twoFactorField" class="hidden"><label class="label">2FA code</label><input class="input font-mono tracking-widest" name="two_factor_code" inputmode="numeric" placeholder="123456"></div>
                    <p id="loginError" class="hidden text-xs text-red-400"></p>
                    <button class="btn btn-primary w-full" type="submit">Sign in</button>
                </form>

                <form id="registerForm" class="space-y-4 hidden">
                    <div><label class="label">Full name</label><input class="input" name="name" required></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="label">Email</label><input class="input" name="email" type="email" required></div>
                        <div><label class="label">Phone</label><input class="input" name="phone" placeholder="+994..."></div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="label">Password</label><input class="input" name="password" type="password" minlength="8" required></div>
                        <div><label class="label">Confirm</label><input class="input" name="password_confirmation" type="password" minlength="8" required></div>
                    </div>
                    <p id="registerError" class="hidden text-xs text-red-400"></p>
                    <button class="btn btn-primary w-full" type="submit">Create wallet</button>
                </form>

                <div class="space-y-2">
                    <div class="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Demo accounts (sandbox)</div>
                    <div class="grid grid-cols-3 gap-2" id="demoAccounts"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- ============ APP SHELL ============ -->
    <div id="appShell" class="hidden">
        <div id="sbOverlay" class="fixed inset-0 bg-black/60 z-30 hidden lg:hidden"></div>

        <aside id="sidebar" class="fixed inset-y-0 left-0 z-40 glass-strong border-r border-white/10 flex flex-col">
            <div class="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
                <div class="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30" data-icon="logo"></div>
                <div class="sb-label min-w-0">
                    <div class="text-lg font-extrabold tracking-tight text-white leading-none">Travel<span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">Pay</span></div>
                    <div class="text-[10px] text-slate-500 mt-1">Wallet · Travel · Security</div>
                </div>
            </div>

            <nav id="sidebarNav" class="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-1"></nav>

            <div class="border-t border-white/10 p-3 shrink-0 space-y-2">
                <div class="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                    <div id="sbAvatar" class="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-sm font-bold text-white">?</div>
                    <div class="sb-label min-w-0 flex-1">
                        <div id="sbName" class="text-sm font-semibold text-white truncate">—</div>
                        <div id="sbRole" class="text-[11px] text-slate-400 truncate">—</div>
                    </div>
                    <button id="logoutBtn" class="sb-hide p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5" title="Sign out" data-icon="logout"></button>
                </div>
                <button id="collapseBtn" class="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5">
                    <span data-icon="collapse"></span><span class="sb-label">Collapse</span>
                </button>
            </div>
        </aside>

        <div id="main" class="min-h-screen flex flex-col">
            <header class="h-16 sticky top-0 z-20 glass-strong border-b border-white/10 flex items-center gap-3 px-4 sm:px-6">
                <button id="menuBtn" class="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-white/5" data-icon="menu"></button>
                <div class="min-w-0 flex-1">
                    <div id="pageCrumb" class="text-[11px] uppercase tracking-widest text-slate-500 font-bold"></div>
                    <h1 id="pageTitle" class="text-base sm:text-lg font-bold text-white truncate leading-tight"></h1>
                </div>
                <div id="shieldBadge" class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <span class="relative flex w-2 h-2"><span class="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span><span class="relative inline-flex w-2 h-2 rounded-full bg-emerald-400"></span></span>
                    Threat Shield active
                </div>
                <div class="relative">
                    <button id="notifBtn" class="relative p-2 rounded-lg text-slate-300 hover:bg-white/5" title="Notifications">
                        <span data-icon="bell"></span>
                        <span id="notifDot" class="hidden absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center"></span>
                    </button>
                    <div id="notifPanel" class="hidden absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] glass-strong rounded-2xl shadow-2xl overflow-hidden fade-in">
                        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <span class="text-sm font-bold text-white">Notifications</span>
                            <button id="notifReadAll" class="text-xs text-cyan-400 hover:text-cyan-300">Mark all read</button>
                        </div>
                        <div id="notifList" class="max-h-96 overflow-y-auto scroll-thin divide-y divide-white/5"></div>
                    </div>
                </div>
            </header>

            <main id="view" class="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto"></main>
        </div>
    </div>

    <!-- Modal & toasts -->
    <div id="modalRoot" class="hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div id="modalBackdrop" class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div id="modalBox" class="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto scroll-thin glass-strong rounded-t-3xl sm:rounded-3xl p-6 fade-in"></div>
    </div>
    <div id="toasts" class="fixed bottom-4 right-4 z-[60] space-y-2 w-[calc(100vw-2rem)] sm:w-96"></div>

    <script src="{{ asset('js/travelpay/core.js') }}?v=1"></script>
    <script src="{{ asset('js/travelpay/wallet.js') }}?v=1"></script>
    <script src="{{ asset('js/travelpay/travel.js') }}?v=1"></script>
    <script src="{{ asset('js/travelpay/security.js') }}?v=1"></script>
    <script src="{{ asset('js/travelpay/admin.js') }}?v=1"></script>
    <script>TP.boot();</script>
</body>
</html>
