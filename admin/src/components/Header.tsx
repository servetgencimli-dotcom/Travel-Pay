import React from 'react';
import { User as UserIcon, Menu, Database } from 'lucide-react';

interface HeaderProps {
  title: string;
  adminName: string;
  onToggleMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, adminName, onToggleMenu }) => {
  return (
    <header className="h-16 border-b border-white/10 glass-card px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onToggleMenu && (
          <button
            onClick={onToggleMenu}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition shrink-0 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate" title={title}>
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="hidden md:inline">Docker MySQL 8 Online (Port 3307)</span>
          <span className="hidden sm:inline md:hidden flex items-center gap-1">
            <Database className="w-3.5 h-3.5" /> MySQL 8
          </span>
          <span className="sm:hidden text-[11px] font-mono">DB OK</span>
        </div>

        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-cyan-500/30 shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">{adminName}</div>
            <div className="text-[10px] font-mono text-cyan-400 font-semibold leading-tight">ADMINISTRATOR</div>
          </div>
        </div>
      </div>
    </header>
  );
};

