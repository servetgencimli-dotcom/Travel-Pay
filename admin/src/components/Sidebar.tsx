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
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'users'
  | 'wallets'
  | 'transactions'
  | 'fraud'
  | 'rules'
  | 'security'
  | 'travel'
  | 'audit';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users Management', icon: Users },
    { id: 'wallets', label: 'Wallet Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'fraud', label: 'Fraud Monitoring', icon: ShieldAlert },
    { id: 'rules', label: 'Risk Rules Engine', icon: Sliders },
    { id: 'security', label: 'Security Events', icon: ShieldCheck },
    { id: 'travel', label: 'Travel Analytics', icon: Compass },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <aside className="w-64 glass-card border-r border-white/10 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
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

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
