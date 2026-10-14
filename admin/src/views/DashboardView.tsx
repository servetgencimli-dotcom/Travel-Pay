import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { Users, Wallet, ArrowLeftRight, ShieldAlert, TrendingUp } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-xs text-slate-400">Loading system metrics...</div>;
  }

  const { overview, volumes_by_currency, system_balances, recent_alerts } = data || {};

  return (
    <div className="p-8 space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{overview?.total_users ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Platform active accounts</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Active Wallets</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{overview?.active_wallets ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Multi-currency AZN / EUR / USD</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Ledger Transactions</span>
            <ArrowLeftRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{overview?.total_transactions ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Double-entry balanced entries</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Active Fraud Alerts</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{overview?.pending_fraud_alerts ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Cybersecurity surveillance</div>
        </div>
      </div>

      {/* Currency Balances & Volumes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Total Simulated Reserves in System
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {system_balances?.map((b: any) => (
              <div key={b.currency_code} className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="text-xs font-mono font-bold text-slate-400">{b.currency_code} Reserve</div>
                <div className="text-lg font-bold text-white mt-1">
                  {Number(b.total_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            Completed Transaction Volume
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {volumes_by_currency?.length > 0 ? (
              volumes_by_currency.map((v: any) => (
                <div key={v.currency_code} className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-xs font-mono font-bold text-slate-400">{v.currency_code} Volume</div>
                  <div className="text-lg font-bold text-white mt-1">
                    {Number(v.total_volume).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{v.tx_count} transactions</div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-xs text-slate-400 py-4 text-center">
                Ready for Phase 3 Transfers and QR Payments.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Recent Cybersecurity & Fraud Alerts
        </h3>
        {recent_alerts?.length > 0 ? (
          <div className="divide-y divide-white/5">
            {recent_alerts.map((alert: any) => (
              <div key={alert.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{alert.title}</div>
                  <div className="text-slate-400 text-[11px]">User: {alert.user?.name} ({alert.user?.email})</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-amber-400 font-bold">Score: {alert.risk_score}</span>
                  <span className="px-2 py-0.5 rounded uppercase font-mono text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-4 text-center">
            No unresolved security threats detected. All systems nominal.
          </div>
        )}
      </div>
    </div>
  );
};
