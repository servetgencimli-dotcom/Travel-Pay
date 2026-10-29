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
  Plus,
} from 'lucide-react';

export const FraudMonitoringView: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ current_page: 1, last_page: 1, total: 0 });
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // New Fraud Alert Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [alertForm, setAlertForm] = useState({
    user_id: '',
    title: '',
    description: '',
    severity: 'high' as 'low' | 'medium' | 'high' | 'critical',
    risk_score: 75,
  });

  const loadUsersForAlert = async () => {
    try {
      const res = await ApiClient.getUsers('', '', '', 1);
      setUsersList(res.data || []);
    } catch {
      // ignore
    }
  };

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

  const handleCreateAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.user_id) {
      alert('Zəhmət olmasa şübhəli istifadəçi hesabını seçin.');
      return;
    }

    try {
      setSubmitting(true);
      await ApiClient.createFraudAlert({
        user_id: Number(alertForm.user_id),
        title: alertForm.title,
        description: alertForm.description,
        severity: alertForm.severity,
        risk_score: Number(alertForm.risk_score),
      });

      setShowCreateModal(false);
      setAlertForm({
        user_id: '',
        title: '',
        description: '',
        severity: 'high',
        risk_score: 75,
      });
      loadAlerts(1);
      alert('Yeni Fraud Siqnalı / İnsidenti uğurla qeydə alındı!');
    } catch (err: any) {
      alert(err.message || 'Xəta baş verdi.');
    } finally {
      setSubmitting(false);
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
          <button
            onClick={() => {
              loadUsersForAlert();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white text-xs font-bold transition shadow-lg shadow-red-500/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Fraud İnsidenti Əlavə Et</span>
          </button>

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

      {/* CREATE NEW FRAUD ALERT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-red-500/30 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Yeni Fraud İnsidenti / Siqnalı Qeydə Al</h3>
                <p className="text-xs text-slate-400">
                  Şübhəli hesabı və manual təhlükəsizlik xəbərdarlığını sistemə daxil edin.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAlertSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Şübhəli İstifadəçi Hesabı *
                </label>
                <select
                  required
                  value={alertForm.user_id}
                  onChange={(e) => setAlertForm({ ...alertForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-red-400"
                >
                  <option value="">İstifadəçi seçin</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Xəbərdarlıq Başlığı *
                </label>
                <input
                  type="text"
                  required
                  value={alertForm.title}
                  onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                  placeholder="Məsələn: Qeyri-adi Coğrafi Lokasiyadan Şübhəli Giriş və Çıxarış"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Ciddilik Dərəcəsi (Severity) *
                  </label>
                  <select
                    value={alertForm.severity}
                    onChange={(e) => setAlertForm({ ...alertForm, severity: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-red-400 font-mono"
                  >
                    <option value="low">LOW (Aşağı)</option>
                    <option value="medium">MEDIUM (Orta)</option>
                    <option value="high">HIGH (Yüksək)</option>
                    <option value="critical">CRITICAL (Kritik)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Risk Skoru (0-100) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={alertForm.risk_score}
                    onChange={(e) => setAlertForm({ ...alertForm, risk_score: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-amber-400 font-bold text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  İnsidentin Ətraflı Təsviri *
                </label>
                <textarea
                  rows={3}
                  required
                  value={alertForm.description}
                  onChange={(e) => setAlertForm({ ...alertForm, description: e.target.value })}
                  placeholder="Təhlükəsizlik analitiki tərəfindən aşkar edilmiş anomaliya və səbəblər..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white text-xs font-bold transition shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Qeydə Alınır...' : 'İnsidenti Qeydə Al'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
