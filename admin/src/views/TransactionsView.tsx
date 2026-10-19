import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { ArrowLeftRight } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  held_for_review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-red-500/10 text-red-300 border-red-500/20',
};

export const TransactionsView: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [currency, setCurrency] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getTransactions(type, status, currency);
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type, status, currency]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return (
    <div className="p-8 space-y-6">
      {/* Filters */}
      <div className="glass-card p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
            Ledger Transactions Explorer
          </h3>
          <p className="text-xs text-slate-400">Auditable peer-to-peer transfers, conversions, and travel payments.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by transaction type"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="" className="bg-navy-900">All Types</option>
            <option value="transfer" className="bg-navy-900">Transfer</option>
            <option value="top_up" className="bg-navy-900">Top-up</option>
            <option value="exchange" className="bg-navy-900">Exchange</option>
            <option value="payment" className="bg-navy-900">QR Payment</option>
            <option value="card_payment" className="bg-navy-900">Card Payment</option>
            <option value="booking" className="bg-navy-900">Booking</option>
            <option value="refund" className="bg-navy-900">Refund</option>
            <option value="crypto_buy" className="bg-navy-900">Crypto Buy</option>
            <option value="crypto_sell" className="bg-navy-900">Crypto Sell</option>
          </select>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Filter by currency"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="" className="bg-navy-900">All Currencies</option>
            <option value="AZN" className="bg-navy-900">AZN (₼)</option>
            <option value="EUR" className="bg-navy-900">EUR (€)</option>
            <option value="USD" className="bg-navy-900">USD ($)</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="" className="bg-navy-900">All Statuses</option>
            <option value="completed" className="bg-navy-900">Completed</option>
            <option value="pending" className="bg-navy-900">Pending</option>
            <option value="held_for_review" className="bg-navy-900">Held for Review</option>
            <option value="failed" className="bg-navy-900">Failed</option>
            <option value="cancelled" className="bg-navy-900">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5 font-sans">
              <th className="py-3 px-5">Ref Number</th>
              <th className="py-3 px-4">Sender / Payer</th>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Risk Score</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-5 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">Loading ledger records...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No transactions match these filters.
                </td>
              </tr>
            ) : transactions.map((t) => (
              <tr key={t.id} className="hover:bg-white/5 transition">
                <td className="py-3.5 px-5 font-bold text-cyan-400">{t.reference_number}</td>
                <td className="py-3.5 px-4 font-sans text-white">{t.user?.name}</td>
                <td className="py-3.5 px-4 font-sans text-slate-300">{t.recipient_user?.name || 'Platform Reserve'}</td>
                <td className="py-3.5 px-4 uppercase text-[10px] text-purple-300">{t.type}</td>
                <td className="py-3.5 px-4 font-bold text-emerald-400">
                  {t.currency_code} {Number(t.amount).toFixed(2)}
                </td>
                <td className="py-3.5 px-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    t.risk_score >= 70 ? 'bg-red-500/20 text-red-400 font-bold' : (t.risk_score >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400')
                  }`}>
                    {t.risk_score}
                  </span>
                </td>
                <td className="py-3.5 px-4 uppercase text-[10px] font-sans">
                  <span className={`px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status] ?? STATUS_STYLES.pending}`}>
                    {t.status}
                  </span>
                </td>
                <td className="py-3.5 px-5 text-right text-slate-400 font-sans text-[11px]">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
