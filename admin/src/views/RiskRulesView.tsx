import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import type { FraudRule } from '../types';
import { Sliders, ToggleLeft, ToggleRight, Plus, X, ShieldAlert, Sparkles } from 'lucide-react';

export const RiskRulesView: React.FC = () => {
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Rule Form
  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    rule_code: '',
    description: '',
    rule_type: 'transaction_amount',
    condition_operator: '>',
    threshold_value: '5000',
    risk_weight: 35,
    action: 'hold' as 'flag' | 'step_up_2fa' | 'hold' | 'block',
    is_active: true,
  });

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getFraudRules();
      setRules(res.data || []);
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

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await ApiClient.createFraudRule(ruleForm);
      setShowCreateModal(false);
      setRuleForm({
        rule_name: '',
        rule_code: '',
        description: '',
        rule_type: 'transaction_amount',
        condition_operator: '>',
        threshold_value: '5000',
        risk_weight: 35,
        action: 'hold',
        is_active: true,
      });
      loadRules();
      alert('Yeni Fraud Qaydası / Riski uğurla əlavə edildi!');
    } catch (err: any) {
      alert(err.message || 'Qayda yaradılarkən xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Kiber Təhlükəsizlik və Fırıldaqçılıq Qaydaları Mühərriki</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Risk Skorinq Qaydaları və Avtomatlaşdırılmış Reaksiya Hədləri</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tranzaksiyaların məbləğ, tezlik (velocity), coğrafi anomaliya və cihaz dəyişikliyi üzrə risk xallarını tənzimləyin.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Fraud Riski / Qaydası Əlavə Et</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400 glass-card rounded-2xl border border-white/10">
            Qaydalar yüklənir...
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 glass-card rounded-2xl border border-white/10">
            Heç bir fraud qaydası tapılmadı.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-cyan-500/25 transition shadow-md"
            >
              <div className="space-y-1.5 max-w-2xl min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {rule.rule_code}
                  </span>
                  <span className="text-sm font-bold text-white">{rule.rule_name}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {rule.rule_type}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{rule.description}</p>
                <div className="text-[11px] text-slate-400 font-mono pt-1 flex items-center gap-4 flex-wrap">
                  <span>
                    Şərt Həddi: <strong className="text-white bg-white/5 px-1.5 py-0.5 rounded">{rule.condition_operator} {rule.threshold_value}</strong>
                  </span>
                  <span>
                    Risk Çəkisi: <strong className="text-amber-400 font-bold">+{rule.risk_weight} bal</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 shrink-0">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Tədbir (Action)</label>
                  <select
                    value={rule.action}
                    onChange={(e) => handleChangeAction(rule, e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value="flag">FLAG (Monitorinq / İşarələ)</option>
                    <option value="step_up_2fa">STEP_UP_2FA (2FA Tələbi)</option>
                    <option value="hold">HOLD (Gözləmə / Review)</option>
                    <option value="block">BLOCK (Avtomatik Rədd Et)</option>
                  </select>
                </div>

                <div className="space-y-1 text-center">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Status</label>
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      rule.is_active
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-500 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {rule.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{rule.is_active ? 'Aktiv' : 'Deaktiv'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE NEW FRAUD RULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-xl rounded-2xl border border-white/15 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Yeni Fraud Qaydası / Riski Əlavə Et</h3>
                <p className="text-xs text-slate-400">
                  Şübhəli tranzaksiya aşkarlama şərtlərini və avtomatlaşdırılmış reaksiya həddini təyin edin.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateRuleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Qaydanın Adı *
                </label>
                <input
                  type="text"
                  required
                  value={ruleForm.rule_name}
                  onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                  placeholder="Məsələn: Yüksək Məbləğli Gecə Əməliyyat Riski"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Qayda Kodu (Unikal Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleForm.rule_code}
                    onChange={(e) => setRuleForm({ ...ruleForm, rule_code: e.target.value.toUpperCase() })}
                    placeholder="MIDNIGHT_HIGH_TX"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Qayda Kateqoriyası / Tipi *
                  </label>
                  <select
                    value={ruleForm.rule_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="transaction_amount">transaction_amount</option>
                    <option value="velocity">velocity (əməliyyat tezliyi)</option>
                    <option value="geo_anomaly">geo_anomaly (coğrafi anomaliya)</option>
                    <option value="device_change">device_change (yeni cihaz)</option>
                    <option value="kyc_risk">kyc_risk</option>
                    <option value="dormant_account">dormant_account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Operator *
                  </label>
                  <select
                    value={ruleForm.condition_operator}
                    onChange={(e) => setRuleForm({ ...ruleForm, condition_operator: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value=">">&gt; (Böyükdür)</option>
                    <option value=">=">&gt;= (Böyük və ya bərabər)</option>
                    <option value="<">&lt; (Kiçikdir)</option>
                    <option value="==">== (Bərabərdir)</option>
                    <option value="!=">!= (Bərabər deyil)</option>
                    <option value="IN">IN (Daxildir)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Hədd Dəyəri (Threshold) *
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleForm.threshold_value}
                    onChange={(e) => setRuleForm({ ...ruleForm, threshold_value: e.target.value })}
                    placeholder="5000"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Risk Çəkisi (0-100) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={ruleForm.risk_weight}
                    onChange={(e) => setRuleForm({ ...ruleForm, risk_weight: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-amber-400 font-bold text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Reaksiya Tədbiri (Action) *
                </label>
                <select
                  value={ruleForm.action}
                  onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="flag">FLAG (Monitorinq et və işarələ)</option>
                  <option value="step_up_2fa">STEP_UP_2FA (2-ci pilləli təsdiq tələb et)</option>
                  <option value="hold">HOLD (Manual baxış üçün saxla)</option>
                  <option value="block">BLOCK (Əməliyyatı avtomatik rədd et)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Qaydanın Təsviri və Səbəbi *
                </label>
                <textarea
                  rows={2}
                  required
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  placeholder="Bu qaydanın işləmə mexanizmi və risk ssenarisi..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 resize-none"
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Əlavə Edilir...' : 'Fraud Qaydasını Əlavə Et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskRulesView;
