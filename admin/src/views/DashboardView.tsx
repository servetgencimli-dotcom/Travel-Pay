import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import {
  Users,
  Wallet,
  ArrowLeftRight,
  ShieldAlert,
  TrendingUp,
  Clock,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Activity,
  AlertOctagon,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      const res = await ApiClient.getDashboard();
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [loadDashboard]);

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-xs font-mono text-cyan-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Aggregating institutional telemetry & ledger metrics...</span>
        </div>
      </div>
    );
  }

  const {
    overview,
    volumes_by_currency,
    system_balances,
    recent_alerts,
    recent_security_events,
    daily_volume,
  } = data || {};

  // Find max daily volume count for scaling the chart bars
  const maxDailyCount = Math.max(
    1,
    ...(daily_volume?.map((d: any) => Math.max(d.completed + d.flagged, d.count, 1)) || [5])
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-[1600px] mx-auto w-full">
      {/* Header controls: Last updated + Manual Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Live FinTech Telemetry Stream</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>

        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
        </button>
      </div>

      {/* KPI Cards (6 metrics covering overview & PDF recommendations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Total Users */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white truncate">{overview?.total_users ?? 0}</div>
          <div className="text-[11px] text-cyan-400/90 font-medium mt-1 truncate">
            {overview?.kyc_verified_users ?? 0} eKYC verified
          </div>
        </div>

        {/* Active Wallets */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Wallets</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white truncate">{overview?.active_wallets ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            AZN · EUR · USD multi-cur
          </div>
        </div>

        {/* Total Ledger Transactions */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Ledger Tx</span>
            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white truncate">{overview?.total_transactions ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">Double-entry balanced</div>
        </div>

        {/* Held For Review (High Priority KPI from PDF) */}
        <div className={`glass-card p-4 rounded-2xl border relative overflow-hidden ${
          (overview?.held_transactions ?? 0) > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">Held Review</span>
            <AlertOctagon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white truncate">{overview?.held_transactions ?? 0}</div>
          <div className="text-[11px] text-amber-300 font-medium mt-1 truncate">
            Pending admin decision
          </div>
        </div>

        {/* Active Fraud Alerts */}
        <div className={`glass-card p-4 rounded-2xl border relative overflow-hidden ${
          (overview?.pending_fraud_alerts ?? 0) > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-white/10'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-red-400 font-bold">Fraud Alerts</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-white truncate">{overview?.pending_fraud_alerts ?? 0}</div>
          <div className="text-[11px] text-red-400/90 font-medium mt-1 truncate">
            Automated heuristics
          </div>
        </div>

        {/* Blocked Threats */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-purple-400 font-bold">Blocked IPs</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white truncate">{overview?.active_ip_blocks ?? 0}</div>
          <div className="text-[11px] text-purple-300/80 font-medium mt-1 truncate">
            {overview?.bookings ?? 0} active bookings
          </div>
        </div>
      </div>

      {/* 14-Day Daily Transaction Chart (High Priority from Report) */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>14-Day Transaction Trend & Volume Heuristics</span>
            </h3>
            <p className="text-xs text-slate-400">
              Aggregated daily completed volume vs flagged / held operations.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-cyan-400"></span>
              <span className="text-slate-300">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-purple-500"></span>
              <span className="text-slate-300">Held / Flagged</span>
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="pt-4 pb-2">
          {daily_volume && daily_volume.length > 0 ? (
            <div className="grid grid-cols-14 gap-1.5 sm:gap-3 items-end h-48 border-b border-white/10 pb-2">
              {daily_volume.map((day: any, idx: number) => {
                const total = (day.completed || 0) + (day.flagged || 0);
                const heightPct = total > 0 ? Math.min(100, Math.round((total / maxDailyCount) * 100)) : 4;
                const completedPct = total > 0 ? Math.round(((day.completed || 0) / total) * 100) : 100;
                const flaggedPct = total > 0 ? 100 - completedPct : 0;
                const dateLabel = day.date ? day.date.slice(5) : `D${idx + 1}`;

                return (
                  <div key={day.date || idx} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 shadow-xl text-[10px] font-mono text-white whitespace-nowrap">
                      <div>{day.date}: <strong className="text-cyan-400">{total} tx</strong></div>
                      <div className="text-slate-400">Completed: {day.completed} · Held: {day.flagged}</div>
                    </div>

                    {/* Bar Stack */}
                    <div
                      style={{ height: `${Math.max(6, heightPct)}%` }}
                      className="w-full max-w-[28px] rounded-md overflow-hidden flex flex-col justify-end bg-white/5 transition-all group-hover:brightness-125"
                    >
                      {flaggedPct > 0 && (
                        <div
                          style={{ height: `${flaggedPct}%` }}
                          className="w-full bg-purple-500"
                          title={`Held: ${day.flagged}`}
                        />
                      )}
                      <div
                        style={{ height: `${completedPct}%` }}
                        className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400"
                        title={`Completed: ${day.completed}`}
                      />
                    </div>

                    {/* Date label */}
                    <span className="text-[10px] font-mono text-slate-400 transform -rotate-45 sm:rotate-0 origin-top-left sm:origin-center mt-1">
                      {dateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500">
              No daily transaction volume recorded in the last 14 days.
            </div>
          )}
        </div>
      </div>

      {/* Currency Balances & Volumes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Total Simulated Reserves in System</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {system_balances?.map((b: any) => (
              <div key={b.currency_code} className="p-4 rounded-xl bg-white/5 border border-white/5 min-w-0">
                <div className="text-xs font-mono font-bold text-slate-400 truncate">{b.currency_code} Reserve</div>
                <div className="text-base sm:text-lg font-bold text-white mt-1 truncate">
                  {Number(b.total_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Completed Transaction Volume</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {volumes_by_currency?.length > 0 ? (
              volumes_by_currency.map((v: any) => (
                <div key={v.currency_code} className="p-4 rounded-xl bg-white/5 border border-white/5 min-w-0">
                  <div className="text-xs font-mono font-bold text-slate-400 truncate">{v.currency_code} Volume</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-1 truncate">
                    {Number(v.total_volume).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">{v.tx_count} transactions</div>
                </div>
              ))
            ) : (
              <div className="col-span-1 sm:col-span-3 text-xs text-slate-400 py-4 text-center">
                No completed transactions yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feeds Grid: Recent Alerts + Recent Security Events (Requested in Report) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Alerts Feed */}
        <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Recent Cybersecurity & Fraud Alerts</span>
          </h3>
          {recent_alerts?.length > 0 ? (
            <div className="divide-y divide-white/5">
              {recent_alerts.map((alert: any) => (
                <div key={alert.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{alert.title}</div>
                    <div className="text-slate-400 text-[11px] truncate">User: {alert.user?.name} ({alert.user?.email})</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
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

        {/* Recent Security Events Feed (Requested in Report) */}
        <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Live Security Stream & Access Events</span>
          </h3>
          {recent_security_events?.length > 0 ? (
            <div className="divide-y divide-white/5">
              {recent_security_events.map((ev: any) => (
                <div key={ev.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{ev.event_type}</div>
                    <div className="text-slate-400 text-[11px] truncate">
                      {ev.user?.name || ev.ip_address || 'Platform Device'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                      ev.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/10 text-cyan-300'
                    }`}>
                      {ev.severity}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-4 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No abnormal security events recorded.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
