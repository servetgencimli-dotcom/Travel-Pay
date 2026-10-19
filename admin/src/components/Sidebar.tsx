import React from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowLeftRight,
  ShieldAlert,
  Sliders,
  ShieldCheck,
  Compass,
  FileText,
  LogOut,
  X,
  Scale,
  Ban,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'users'
  | 'wallets'
  | 'transactions'
  | 'ledger'
  | 'fraud'
  | 'rules'
  | 'threats'
  | 'security'
  | 'travel'
  | 'audit';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onLogout,
  isOpen = false,
  onClose,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users Management', icon: Users },
    { id: 'wallets', label: 'Wallet Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'ledger', label: 'Ledger & Trial Balance', icon: Scale },
    { id: 'fraud', label: 'Fraud Monitoring', icon: ShieldAlert },
    { id: 'rules', label: 'Risk Rules Engine', icon: Sliders },
    { id: 'threats', label: 'Threat Shield (WAF)', icon: Ban },
    { id: 'security', label: 'Security Events', icon: ShieldCheck },
    { id: 'travel', label: 'Travel Analytics', icon: Compass },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-label="Close mobile sidebar backdrop"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 w-64 glass-card border-r border-white/10 flex flex-col h-screen shrink-0 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-white text-base tracking-tight leading-none">
                Travel<span className="text-cyan-400">Pay</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                Admin Suite
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav List */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id as NavTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

