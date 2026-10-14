import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface HeaderProps {
  title: string;
  adminName: string;
}

export const Header: React.FC<HeaderProps> = ({ title, adminName }) => {
  return (
    <header className="h-16 border-b border-white/10 glass-card px-8 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Docker MySQL 8 Online (Port 3307)</span>
        </div>

        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white">{adminName}</div>
            <div className="text-[10px] font-mono text-cyan-400">ADMINISTRATOR</div>
          </div>
        </div>
      </div>
    </header>
  );
};
