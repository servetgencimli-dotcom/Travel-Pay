import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import type { FraudRule } from '../types';
import { Sliders, ToggleLeft, ToggleRight } from 'lucide-react';

export const RiskRulesView: React.FC = () => {
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getFraudRules();
      setRules(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleToggleActive = async (rule: FraudRule) => {
    try {
      await ApiClient.updateFraudRule(rule.id, { is_active: !rule.is_active });
      loadRules();
    } catch (err: any) {
      alert(err.message || 'Rule update failed');
    }
  };

  const handleChangeAction = async (rule: FraudRule, action: string) => {
    try {
      await ApiClient.updateFraudRule(rule.id, { action });
      loadRules();
    } catch (err: any) {
      alert(err.message || 'Action update failed');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Configurable Cybersecurity Rules Engine</span>
          </h3>
          <p className="text-xs text-slate-400">Dynamically adjust risk weights, threshold bounds, and automated response actions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Loading risk rules...</div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">{rule.rule_code}</span>
                  <span className="text-sm font-bold text-white">{rule.rule_name}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    {rule.rule_type}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{rule.description}</p>
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Condition: <strong className="text-white">{rule.condition_operator} {rule.threshold_value}</strong> • Weight: <strong className="text-amber-400">+{rule.risk_weight} points</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Enforcement Action</label>
                  <select
                    value={rule.action}
                    onChange={(e) => handleChangeAction(rule, e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value="flag" className="bg-navy-900">FLAG (Monitor)</option>
                    <option value="step_up_2fa" className="bg-navy-900">STEP_UP_2FA (Challenge)</option>
                    <option value="hold" className="bg-navy-900">HOLD (Review)</option>
                    <option value="block" className="bg-navy-900">BLOCK (Reject)</option>
                  </select>
                </div>

                <div className="space-y-1 text-center">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Status</label>
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      rule.is_active
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                  >
                    {rule.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{rule.is_active ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
