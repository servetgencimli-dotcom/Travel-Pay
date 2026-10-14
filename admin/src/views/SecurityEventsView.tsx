import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { ShieldCheck, Laptop, Smartphone } from 'lucide-react';

export const SecurityEventsView: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getSecurityEvents();
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Security Events & Device Anomalies Stream
          </h3>
          <p className="text-xs text-slate-400">System logins, password updates, 2FA confirmations, and unrecognized device logins.</p>
        </div>
        <button onClick={loadEvents} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition cursor-pointer">
          Refresh Stream
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5">
              <th className="py-3 px-5">Timestamp</th>
              <th className="py-3 px-4">Event Type</th>
              <th className="py-3 px-4">Account</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Device Details</th>
              <th className="py-3 px-4 text-right">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">Loading security stream...</td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">No events recorded.</td>
              </tr>
            ) : events.map((ev) => (
              <tr key={ev.id} className="hover:bg-white/5 transition">
                <td className="py-3.5 px-5 text-slate-400 text-[11px]">
                  {new Date(ev.created_at).toLocaleString()}
                </td>
                <td className="py-3.5 px-4 font-bold text-cyan-400">{ev.event_type}</td>
                <td className="py-3.5 px-4 font-sans">
                  <div className="font-semibold text-white">{ev.user?.name || 'Anonymous'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{ev.user?.email}</div>
                </td>
                <td className="py-3.5 px-4 text-slate-300">{ev.ip_address || '127.0.0.1'}</td>
                <td className="py-3.5 px-4 font-sans text-slate-400">
                  {ev.device ? (
                    <div className="flex items-center gap-1.5">
                      {ev.device.device_type === 'mobile' ? <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> : <Laptop className="w-3.5 h-3.5 text-purple-400" />}
                      <span>{ev.device.device_name || ev.device.os}</span>
                    </div>
                  ) : (
                    'Web Client'
                  )}
                </td>
                <td className="py-3.5 px-5 text-right font-sans">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    ev.severity === 'critical' ? 'bg-red-500/20 text-red-400' : (ev.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/10 text-cyan-400')
                  }`}>
                    {ev.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
