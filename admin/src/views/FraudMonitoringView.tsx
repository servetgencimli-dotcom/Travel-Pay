import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import {
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const FraudMonitoringView: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ current_page: 1, last_page: 1, total: 0 });
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadAlerts = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await ApiClient.getFraudAlerts(status, severity, targetPage);
      setAlerts(res.data);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, severity, page]);

  useEffect(() => {
    loadAlerts(page);
  }, [loadAlerts, page]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [status, severity]);

  const handleUpdateStatus = async (alertId: number, nextStatus: string) => {
    try {
      setActionLoading(alertId);
      await ApiClient.updateFraudAlertStatus(alertId, nextStatus);
      loadAlerts(page);
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveTx = async (alertId: number, txId: number) => {
    if (!confirm('Approve and settle this transaction? Reserved funds will be released to the recipient.')) return;
    try {
      setActionLoading(alertId);
      await ApiClient.approveTransaction(txId);
      loadAlerts(page);
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTx = async (alertId: number, txId: number) => {
    if (!confirm('Reject and cancel this transaction? Reserved funds will be refunded.')) return;
    try {
      setActionLoading(alertId);
      await ApiClient.rejectTransaction(txId);
      loadAlerts(page);
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Header and Filters */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>Fraud Surveillance & Risk Alerts</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time alerts triggered by automated FinTech cybersecurity heuristics and anomaly models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="" className="bg-navy-900">All Alert Statuses</option>
            <option value="new" className="bg-navy-900">New</option>
            <option value="investigating" className="bg-navy-900">Investigating</option>
            <option value="resolved" className="bg-navy-900">Resolved</option>
            <option value="dismissed" className="bg-navy-900">Dismissed</option>
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            aria-label="Filter by severity"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="" className="bg-navy-900">All Severities</option>
            <option value="critical" className="bg-navy-900">Critical</option>
            <option value="high" className="bg-navy-900">High</option>
            <option value="medium" className="bg-navy-900">Medium</option>
            <option value="low" className="bg-navy-900">Low</option>
          </select>

          <button
            onClick={() => loadAlerts(page)}
            title="Reload alerts"
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card p-12 text-center text-xs text-slate-400 space-y-2">
            <RotateCcw className="w-5 h-5 text-cyan-400 animate-spin mx-auto" />
            <div>Scanning fraud surveillance feeds...</div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-3 border border-white/10">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="text-base font-bold text-white">No Flagged Transactions</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No alerts match the selected criteria. All recent operations are running within normal risk thresholds.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const hasHeldTx = alert.transaction && alert.transaction.status === 'held_for_review';
            const txId = alert.transaction_id || alert.transaction?.id;

            return (
              <div
                key={alert.id}
                className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition hover:border-white/20"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded uppercase text-[10px] font-mono font-bold ${
                        alert.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : alert.severity === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : alert.severity === 'medium'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}
                    >
                      {alert.severity}
                    </span>

                    <span className="text-sm font-bold text-white truncate">{alert.title}</span>

                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/30 border border-white/5 text-slate-400">
                      Risk Score:{' '}
                      <strong
                        className={
                          alert.risk_score >= 80
                            ? 'text-red-400 font-bold'
                            : alert.risk_score >= 40
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400 font-bold'
                        }
                      >
                        {alert.risk_score}
                      </strong>
                      /100
                    </span>

                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                        alert.status === 'new'
                          ? 'bg-red-500/15 text-red-300'
                          : alert.status === 'investigating'
                          ? 'bg-amber-500/15 text-amber-300'
                          : alert.status === 'resolved'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>

                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 font-mono">
                    <span>
                      User: <strong className="text-white font-sans">{alert.user?.name || 'N/A'}</strong> ({alert.user?.email})
                    </span>
                    {alert.transaction && (
                      <span className="text-cyan-400 flex items-center gap-1">
                        Tx: {alert.transaction.reference_number} ({alert.transaction.currency_code}{' '}
                        {Number(alert.transaction.amount).toFixed(2)}) • Status: {alert.transaction.status}
                      </span>
                    )}
                    <span>{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                  {/* If attached transaction is held for review, give immediate approve/reject buttons */}
                  {hasHeldTx && (
                    <div className="flex items-center gap-2 bg-amber-500/10 p-1.5 rounded-xl border border-amber-500/20 mr-1">
                      <span className="text-[10px] text-amber-300 font-semibold uppercase px-1">Held Tx:</span>
                      <button
                        onClick={() => handleApproveTx(alert.id, txId)}
                        disabled={actionLoading === alert.id}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleRejectTx(alert.id, txId)}
                        disabled={actionLoading === alert.id}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {alert.status === 'new' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'investigating')}
                        disabled={actionLoading === alert.id}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        Investigate
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                        disabled={actionLoading === alert.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    </>
                  )}

                  {alert.status === 'investigating' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                        disabled={actionLoading === alert.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'dismissed')}
                        disabled={actionLoading === alert.id}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </>
                  )}

                  {(alert.status === 'resolved' || alert.status === 'dismissed') && (
                    <button
                      onClick={() => handleUpdateStatus(alert.id, 'investigating')}
                      disabled={actionLoading === alert.id}
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {meta.total > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-mono">{alerts.length}</span> alerts of{' '}
            <span className="text-white font-mono">{meta.total}</span> total
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-mono text-cyan-400 font-bold">{meta.current_page}</span>
            <button
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={meta.current_page >= meta.last_page || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
