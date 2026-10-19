import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { Wallet } from 'lucide-react';

export const WalletsView: React.FC = () => {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWallets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getWallets();
      setWallets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  return (
    <div className="p-8 space-y-6">
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-400" />
            Wallet Accounts & Reserves Overview
          </h3>
          <p className="text-xs text-slate-400">Multi-currency digital accounts with double-entry integrity check.</p>
        </div>
        <button onClick={loadWallets} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition cursor-pointer">
          Refresh
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5">
              <th className="py-3 px-5">Wallet Number</th>
              <th className="py-3 px-4">Account Owner</th>
              <th className="py-3 px-4">AZN Total / Available</th>
              <th className="py-3 px-4">EUR Total / Available</th>
              <th className="py-3 px-4">USD Total / Available</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">Loading wallets...</td>
              </tr>
            ) : wallets.map((w) => {
              const azn = w.balances?.find((b: any) => b.currency_code === 'AZN');
              const eur = w.balances?.find((b: any) => b.currency_code === 'EUR');
              const usd = w.balances?.find((b: any) => b.currency_code === 'USD');

              return (
                <tr key={w.id} className="hover:bg-white/5 transition">
                  <td className="py-3.5 px-5 font-bold text-cyan-400">{w.wallet_number}</td>
                  <td className="py-3.5 px-4 font-sans">
                    <div className="font-semibold text-white">{w.user?.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{w.user?.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400">
                    <div>₼ {Number(azn?.balance || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500 font-sans">Avail: ₼ {Number(azn?.balance - (azn?.locked_balance || 0)).toFixed(2)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-blue-400">
                    <div>€ {Number(eur?.balance || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500 font-sans">Avail: € {Number(eur?.balance - (eur?.locked_balance || 0)).toFixed(2)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-amber-400">
                    <div>$ {Number(usd?.balance || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500 font-sans">Avail: $ {Number(usd?.balance - (usd?.locked_balance || 0)).toFixed(2)}</div>
                  </td>
                  <td className="py-3.5 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {w.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
