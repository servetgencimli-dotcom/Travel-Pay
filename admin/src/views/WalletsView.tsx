import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { Wallet, Plus, X, ArrowUpRight } from 'lucide-react';

export const WalletsView: React.FC = () => {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [creditForm, setCreditForm] = useState({
    wallet_id: '',
    currency_code: 'AZN',
    amount: 100,
    reason: 'Manual Account Liquidity Credit',
  });

  const loadWallets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getWallets();
      setWallets(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const handleOpenCreditModal = (walletId?: number) => {
    setCreditForm({
      wallet_id: walletId ? String(walletId) : (wallets[0]?.id ? String(wallets[0].id) : ''),
      currency_code: 'AZN',
      amount: 100,
      reason: 'Manual Account Liquidity Credit',
    });
    setShowCreditModal(true);
  };

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditForm.wallet_id) {
      alert('Zəhmət olmasa cüzdan seçin.');
      return;
    }

    try {
      setSubmitting(true);
      await ApiClient.creditWallet(Number(creditForm.wallet_id), {
        currency_code: creditForm.currency_code,
        amount: Number(creditForm.amount),
        reason: creditForm.reason,
      });

      setShowCreditModal(false);
      loadWallets();
      alert('Balans uğurla artırıldı və tranzaksiya auditə yazıldı!');
    } catch (err: any) {
      alert(err.message || 'Balans artırılarkən xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/10">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Rəqəmsal Pul Kisələri və Çoxvalyutalı Ehtiyatlar</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            AZN, EUR və USD balanslarının canlı monitorinqi və inzibati vəsait təminatı.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenCreditModal()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Balans Artır / Kredit Ver</span>
          </button>

          <button
            onClick={loadWallets}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
          >
            Yenilə
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-3 px-5">Cüzdan Nömrəsi</th>
                <th className="py-3 px-4">Hesab Sahibi</th>
                <th className="py-3 px-4">AZN Ümumi / Mövcud</th>
                <th className="py-3 px-4">EUR Ümumi / Mövcud</th>
                <th className="py-3 px-4">USD Ümumi / Mövcud</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    Cüzdanlar yüklənir...
                  </td>
                </tr>
              ) : wallets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    Heç bir cüzdan tapılmadı.
                  </td>
                </tr>
              ) : (
                wallets.map((w) => {
                  const azn = w.balances?.find((b: any) => b.currency_code === 'AZN');
                  const eur = w.balances?.find((b: any) => b.currency_code === 'EUR');
                  const usd = w.balances?.find((b: any) => b.currency_code === 'USD');

                  const aznBal = Number(azn?.balance || 0);
                  const eurBal = Number(eur?.balance || 0);
                  const usdBal = Number(usd?.balance || 0);

                  return (
                    <tr key={w.id} className="hover:bg-white/5 transition">
                      <td className="py-3.5 px-5 font-bold text-cyan-400">{w.wallet_number}</td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-semibold text-white">{w.user?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{w.user?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400">
                        <div className="font-bold">₼ {aznBal.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          Mövcud: ₼ {(aznBal - Number(azn?.locked_balance || 0)).toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-blue-400">
                        <div className="font-bold">€ {eurBal.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          Mövcud: € {(eurBal - Number(eur?.locked_balance || 0)).toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-amber-400">
                        <div className="font-bold">$ {usdBal.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          Mövcud: $ {(usdBal - Number(usd?.locked_balance || 0)).toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-sans">
                        <button
                          onClick={() => handleOpenCreditModal(w.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Balans Artır</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: TOP-UP / CREDIT WALLET */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-md rounded-2xl border border-emerald-500/30 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowCreditModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Pul Kisəsinə Vəsait Əlavə Et</h3>
                <p className="text-xs text-slate-400">
                  İstifadəçi cüzdanına manual kredit/balans yükləyin.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreditSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Cüzdan Sahibi *
                </label>
                <select
                  required
                  value={creditForm.wallet_id}
                  onChange={(e) => setCreditForm({ ...creditForm, wallet_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                >
                  <option value="">Cüzdan seçin</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.user?.name} ({w.wallet_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Valyuta *
                  </label>
                  <select
                    value={creditForm.currency_code}
                    onChange={(e) => setCreditForm({ ...creditForm, currency_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono font-bold"
                  >
                    <option value="AZN">AZN (₼)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Məbləğ *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={creditForm.amount}
                    onChange={(e) => setCreditForm({ ...creditForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-emerald-400 font-bold text-xs focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Səbəb / Qeyd *
                </label>
                <input
                  type="text"
                  required
                  value={creditForm.reason}
                  onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })}
                  placeholder="Məsələn: Səyahət avans köçürməsi"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Yüklənir...' : 'Balansı Artır'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletsView;
