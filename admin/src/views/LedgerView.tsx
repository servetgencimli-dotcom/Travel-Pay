import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  ArrowDownRight,
  ArrowUpRight,
  Search,
} from 'lucide-react';

interface TrialBalanceItem {
  currency_code: string;
  total_debit: number;
  total_credit: number;
  balanced: boolean;
}

interface LedgerAccount {
  id: number;
  account_number: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  currency_code: string;
  balance: number | string;
}

interface LedgerEntry {
  id: number;
  entry_type: 'debit' | 'credit';
  amount: number | string;
  currency_code: string;
  description?: string;
  created_at: string;
  ledger_account?: { id: number; account_number: string };
  transaction?: { id: number; reference_number: string; type: string };
}

export const LedgerView: React.FC = () => {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [accountFilter, setAccountFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');

  const loadLedger = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getLedger(limit);
      if (res.data) {
        setTrialBalance(res.data.trial_balance || []);
        setAccounts(res.data.accounts || []);
        setEntries(res.data.recent_entries || []);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const filteredAccounts = accounts.filter((acc) => {
    const matchesCurrency = !currencyFilter || acc.currency_code === currencyFilter;
    const matchesSearch =
      !accountFilter ||
      acc.account_name.toLowerCase().includes(accountFilter.toLowerCase()) ||
      acc.account_number.toLowerCase().includes(accountFilter.toLowerCase());
    return matchesCurrency && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Double-Entry General Ledger & Trial Balance</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time verification of mathematical equality between debits and credits across all multi-currency pools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Entries limit"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value={25} className="bg-navy-900">25 Recent Entries</option>
            <option value={50} className="bg-navy-900">50 Recent Entries</option>
            <option value={100} className="bg-navy-900">100 Recent Entries</option>
          </select>

          <button
            onClick={loadLedger}
            title="Refresh Ledger"
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Trial Balance Cards by Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trialBalance.length === 0 && !loading && (
          <div className="glass-card p-6 rounded-2xl col-span-3 text-center text-xs text-slate-400">
            No trial balance records found in the ledger.
          </div>
        )}
        {trialBalance.map((tb) => {
          const diff = Math.abs(tb.total_debit - tb.total_credit);
          const isBalanced = tb.balanced || diff < 0.0001;

          return (
            <div
              key={tb.currency_code}
              className={`glass-card p-5 rounded-2xl border transition ${
                isBalanced ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white font-mono">{tb.currency_code}</span>
                  <span className="text-xs text-slate-400">Pool</span>
                </div>
                {isBalanced ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Balanced</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 text-[10px] font-mono font-bold uppercase">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Discrepancy</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5">
                  <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3 text-cyan-400" />
                    <span>Total Debits</span>
                  </div>
                  <div className="text-sm font-bold text-cyan-400 font-mono">
                    {tb.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5">
                  <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    <span>Total Credits</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {tb.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Variance:</span>
                <span className={diff === 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {diff.toFixed(4)} {tb.currency_code}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ledger Accounts Directory */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden space-y-3">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-white text-xs sm:text-sm">Chart of Ledger Accounts ({filteredAccounts.length})</h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                placeholder="Search account name / number..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 w-48 sm:w-56"
              />
            </div>

            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              aria-label="Filter by currency"
              className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="" className="bg-navy-900">All Currencies</option>
              <option value="AZN" className="bg-navy-900">AZN</option>
              <option value="EUR" className="bg-navy-900">EUR</option>
              <option value="USD" className="bg-navy-900">USD</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-2.5 px-4 font-mono">Account No</th>
                <th className="py-2.5 px-4">Account Title</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Currency</th>
                <th className="py-2.5 px-4 text-right">Current Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">
                    No matching ledger accounts found.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const numBal = Number(acc.balance);
                  return (
                    <tr key={acc.id} className="hover:bg-white/5 transition">
                      <td className="py-2.5 px-4 text-cyan-400 font-semibold">{acc.account_number}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-white">{acc.account_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-white/5 text-slate-300">
                          {acc.account_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{acc.currency_code}</td>
                      <td className="py-2.5 px-4 text-right font-bold">
                        <span className={numBal >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {numBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Journal Entries */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden space-y-3">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-white text-xs sm:text-sm">Audit Trail: Double-Entry Journal Entries</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">Showing last {entries.length} postings</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5 font-sans">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Account</th>
                <th className="py-2.5 px-3">Entry Type</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-4">Related Tx</th>
                <th className="py-2.5 px-4">Memo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    Loading journal entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No journal entries recorded.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5 transition">
                    <td className="py-2.5 px-4 text-slate-400">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-cyan-400 font-semibold">
                      {entry.ledger_account?.account_number || `Acc #${entry.id}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          entry.entry_type === 'debit'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {Number(entry.amount).toFixed(2)} {entry.currency_code}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {entry.transaction ? (
                        <span className="text-cyan-400">
                          {entry.transaction.reference_number} ({entry.transaction.type})
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-300 max-w-xs truncate">
                      {entry.description || 'System posting'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
