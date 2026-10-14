import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { ShieldAlert, CheckCircle } from 'lucide-react';

export const FraudMonitoringView: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getFraudAlerts();
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (alertId: number, status: string) => {
    try {
      await ApiClient.updateFraudAlertStatus(alertId, status);
      loadAlerts();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Fraud Surveillance & Risk Alerts
          </h3>
          <p className="text-xs text-slate-400">Real-time alerts triggered by automated FinTech cybersecurity heuristics.</p>
        </div>
        <button onClick={loadAlerts} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition cursor-pointer">
          Refresh Alerts
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Scanning security feeds...</div>
        ) : alerts.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-white">No Flagged Transactions</div>
            <p className="text-xs text-slate-400">All recent operations are evaluated within normal risk thresholds (0–39 score).</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded uppercase text-[10px] font-mono font-bold ${
                    alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-sm font-bold text-white">{alert.title}</span>
                  <span className="font-mono text-xs text-slate-400">Score: <strong className="text-amber-400">{alert.risk_score}</strong>/100</span>
                </div>
                <p className="text-xs text-slate-300">{alert.description}</p>
                <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                  <span>User: <strong className="text-white">{alert.user?.name}</strong></span>
                  <span>Email: {alert.user?.email}</span>
                  <span>Date: {new Date(alert.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {alert.status === 'new' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(alert.id, 'investigating')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition cursor-pointer"
                    >
                      Investigate
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
                    >
                      Approve & Resolve
                    </button>
                  </>
                )}
                {alert.status === 'investigating' && (
                  <button
                    onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                )}
                <span className="text-[10px] uppercase font-mono px-2 py-1 rounded bg-white/5 text-slate-400">
                  Status: {alert.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
