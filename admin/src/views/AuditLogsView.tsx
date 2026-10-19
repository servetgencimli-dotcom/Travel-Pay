import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { FileText, Search } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getAuditLogs(action);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Immutable Audit Trail & Regulatory Logs</span>
          </h3>
          <p className="text-xs text-slate-400">Chronological, privacy-conscious change history of all administrative & user events.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Operator / User</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-5 text-right">Changes / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">No audit logs matching query.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition">
                  <td className="py-3.5 px-5 text-slate-400 text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-cyan-400">{log.action}</td>
                  <td className="py-3.5 px-4 font-sans">
                    <div className="font-semibold text-white">{log.user?.name || 'System Engine'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{log.user?.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {log.entity_type ? `${log.entity_type.split('\\').pop()} #${log.entity_id}` : 'General'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                  <td className="py-3.5 px-5 text-right text-[11px] text-slate-300">
                    {log.new_values ? (
                      <span className="font-mono text-[10px] bg-white/5 px-2 py-1 rounded max-w-[240px] truncate inline-block">
                        {JSON.stringify(log.new_values)}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
