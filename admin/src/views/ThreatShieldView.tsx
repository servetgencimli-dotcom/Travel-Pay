import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import {
  ShieldCheck,
  Ban,
  Activity,
  RotateCcw,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Flame,
  Globe,
  Radio,
} from 'lucide-react';

interface BlockedIpRecord {
  id: number;
  ip_address: string;
  reason: string;
  source: 'auto_ddos' | 'manual';
  hits: number;
  blocked_until: string | null;
  active: boolean;
  created_at: string;
  creator?: { id: number; name: string };
}

interface ThreatData {
  timeline?: Array<{ minute: string; requests: number; threats: number; blocked: number }>;
  totals?: { requests: number; threats: number; blocked: number; active_blocks: number };
  events_by_severity?: Record<string, number>;
  top_risky_ips?: Array<{ ip_address: string; total: number }>;
  recent_threats?: Array<any>;
  blocked_ips?: BlockedIpRecord[];
  shield?: {
    ddos_requests_per_minute: number;
    ddos_block_minutes: number;
    waf_signatures: string[];
  };
}

export const ThreatShieldView: React.FC = () => {
  const [data, setData] = useState<ThreatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Block IP Form modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockIpAddress, setBlockIpAddress] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockMinutes, setBlockMinutes] = useState('60');

  // Simulation state
  const [simScenario, setSimScenario] = useState('card_testing');
  const [simCount, setSimCount] = useState(100);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  const loadThreats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getThreats();
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load threat data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreats();
    const interval = setInterval(loadThreats, 20000); // 20s live polling
    return () => clearInterval(interval);
  }, [loadThreats]);

  const handleBlockIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIpAddress.trim() || !blockReason.trim()) return;

    try {
      setActionLoading(true);
      const mins = blockMinutes ? parseInt(blockMinutes, 10) : undefined;
      await ApiClient.blockIp(blockIpAddress.trim(), blockReason.trim(), mins);
      setShowBlockModal(false);
      setBlockIpAddress('');
      setBlockReason('');
      setBlockMinutes('60');
      loadThreats();
    } catch (err: any) {
      alert(err.message || 'Failed to block IP.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockIp = async (id: number, ip: string) => {
    if (!confirm(`Unblock IP ${ip}? Access will be restored immediately.`)) return;
    try {
      setActionLoading(true);
      await ApiClient.unblockIp(id);
      loadThreats();
    } catch (err: any) {
      alert(err.message || 'Failed to unblock IP.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    try {
      setSimRunning(true);
      setSimResult(null);
      const res = await ApiClient.simulateSandbox(simScenario, simCount);
      setSimResult(res.data);
      loadThreats();
    } catch (err: any) {
      alert(err.message || 'Simulation run failed.');
    } finally {
      setSimRunning(false);
    }
  };

  const totals = data?.totals || { requests: 0, threats: 0, blocked: 0, active_blocks: 0 };
  const blockedList = data?.blocked_ips || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Threat Shield & Perimeter Defense (WAF / DDoS)</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              SHIELD ACTIVE
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time IP reputation filtering, rate-limit enforcement, WAF SQLi/XSS signature inspection, and DDoS defense.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowBlockModal(true)}
            className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Block Suspicious IP</span>
          </button>

          <button
            onClick={loadThreats}
            title="Refresh telemetry"
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>30m Gateway Traffic</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono">
            {totals.requests.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Total API requests counted</div>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>WAF Threats Filtered</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">
            {totals.threats.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Payloads flagged (SQLi, XSS)</div>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5 text-red-400" />
            <span>Blocked Perimeter Hits</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-400 font-mono">
            {totals.blocked.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Connections immediately denied</div>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>Active IP Blocklist</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-400 font-mono">
            {totals.active_blocks}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Manual + automated rate-blocks</div>
        </div>
      </div>

      {/* Main Grid: Blocked IPs and Threat Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blocked IPs Table (2 cols) */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-white/10 overflow-hidden space-y-3">
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" />
              <h4 className="font-bold text-white text-xs sm:text-sm">
                Perimeter Blocked IPs ({blockedList.length})
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Auto-expires via Redis / Cache TTL
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5 font-sans">
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4">Reason / Threat Vector</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Hits Denied</th>
                  <th className="py-2.5 px-3">Expires</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {blockedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      No IPs are currently blacklisted on the perimeter.
                    </td>
                  </tr>
                ) : (
                  blockedList.map((block) => (
                    <tr key={block.id} className="hover:bg-white/5 transition">
                      <td className="py-2.5 px-4 font-bold text-red-400">{block.ip_address}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-300 max-w-xs truncate">
                        {block.reason}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            block.source === 'auto_ddos'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {block.source === 'auto_ddos' ? 'Auto-DDoS' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">{block.hits}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">
                        {block.blocked_until ? new Date(block.blocked_until).toLocaleTimeString() : 'Permanent'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleUnblockIp(block.id, block.ip_address)}
                          disabled={actionLoading}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 ml-auto text-[11px] font-sans disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                          <span>Unblock</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sandbox Simulation Panel (1 col) */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-white text-xs sm:text-sm">Heuristic Defense Sandbox</h4>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Generate synthetic traffic scenarios through the fraud heuristics engine to validate anomaly thresholds.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Attack / Traffic Scenario</label>
              <select
                value={simScenario}
                onChange={(e) => setSimScenario(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="card_testing" className="bg-navy-900">Card Testing Rapid Micro-charges</option>
                <option value="account_takeover" className="bg-navy-900">Account Takeover / Multiple IPs</option>
                <option value="tourist_peak" className="bg-navy-900">Tourist Peak High-Velocity Flow</option>
                <option value="normal" className="bg-navy-900">Normal Baseline Activity</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Transaction Sample Count ({simCount})</label>
              <input
                type="range"
                min={20}
                max={500}
                step={20}
                value={simCount}
                onChange={(e) => setSimCount(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={simRunning}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{simRunning ? 'Running Synthetic Pipeline...' : 'Execute Simulation'}</span>
            </button>

            {simResult && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 pt-3">
                <div className="text-[11px] font-bold text-cyan-400 flex items-center justify-between">
                  <span>Simulation Report</span>
                  <span className="font-mono text-slate-400">{simResult.scenario}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-black/30">
                    <div className="text-slate-400">Processed</div>
                    <div className="text-white font-bold">{simResult.transactions_generated || simCount}</div>
                  </div>
                  <div className="p-2 rounded bg-black/30">
                    <div className="text-slate-400">Flagged / Held</div>
                    <div className="text-amber-400 font-bold">{simResult.flagged_count ?? simResult.held_count ?? 0}</div>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Defense thresholds validated cleanly.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleBlockIp}
            className="max-w-md w-full glass-card p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-400" />
                <h4 className="font-bold text-white text-base">Add IP to Perimeter Blocklist</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-sans">IP Address (IPv4 / IPv6)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 198.51.100.44"
                  value={blockIpAddress}
                  onChange={(e) => setBlockIpAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-red-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-sans">Reason / Investigation Note</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Credential stuffing bot pattern"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-sans">Block Duration (Minutes, empty = permanent)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="60"
                  value={blockMinutes}
                  onChange={(e) => setBlockMinutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-red-400"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
