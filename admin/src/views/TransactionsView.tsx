import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { ArrowLeftRight, Check, X, Eye, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  held_for_review: 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-red-500/10 text-red-300 border-red-500/20',
};

export const TransactionsView: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [currency, setCurrency] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ current_page: 1, last_page: 1, total: 0 });
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadTransactions = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await ApiClient.getTransactions(type, status, currency, targetPage);
      setTransactions(res.data);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type, status, currency, page]);

  useEffect(() => {
    loadTransactions(page);
  }, [loadTransactions, page]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [type, status, currency]);

  const handleApprove = async (txId: number) => {
    if (!confirm('Approve and settle this held transaction? Reserved funds will be released to recipient.')) return;
    try {
      setActionLoading(txId);
      await ApiClient.approveTransaction(txId);
      if (selectedTx?.id === txId) {
        setSelectedTx(null);
      }
      loadTransactions(page);
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (txId: number) => {
    if (!confirm('Reject this transaction? Reserved funds will be refunded to sender.')) return;
    try {
      setActionLoading(txId);
      await ApiClient.rejectTransaction(txId);
      if (selectedTx?.id === txId) {
        setSelectedTx(null);
      }
      loadTransactions(page);
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Filters */}
      <div className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Ledger Transactions Explorer</span>
          </h3>
          <p className="text-xs text-slate-400">Auditable peer-to-peer transfers, conversions, and travel payments.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            <option value="held_for_review" className="bg-navy-900">Held for Review (Attention)</option>
            <option value="completed" className="bg-navy-900">Completed</option>
            <option value="pending" className="bg-navy-900">Pending</option>
            <option value="failed" className="bg-navy-900">Failed</option>
            <option value="cancelled" className="bg-navy-900">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5 font-sans">
                <th className="py-3 px-5">Ref Number</th>
                <th className="py-3 px-4">Sender / Payer</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading ledger records...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
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
                  <td className="py-3.5 px-4 text-slate-400 font-sans text-[11px]">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-5 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Detail button */}
                      <button
                        onClick={() => setSelectedTx(t)}
                        title="View details"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Approve / Reject buttons for held transactions (High Priority in Report) */}
                      {t.status === 'held_for_review' && (
                        <>
                          <button
                            onClick={() => handleApprove(t.id)}
                            disabled={actionLoading === t.id}
                            title="Approve Transaction"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(t.id)}
                            disabled={actionLoading === t.id}
                            title="Reject Transaction"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-bold border border-red-500/30 transition cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (High Priority in Report) */}
        <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 font-sans">
          <div>
            Showing <strong className="text-white">{transactions.length}</strong> of{' '}
            <strong className="text-white">{meta.total}</strong> records · Page{' '}
            <strong className="text-white">{meta.current_page}</strong> of{' '}
            <strong className="text-white">{meta.last_page}</strong>
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
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-lg w-full glass-card p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-white text-base">Transaction Details</h4>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 font-mono">
                <div className="text-[11px] text-slate-400">Reference Number</div>
                <div className="text-sm font-bold text-cyan-400">{selectedTx.reference_number}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5">
                  <div className="text-[11px] text-slate-400 font-sans">Sender / Payer</div>
                  <div className="font-semibold text-white mt-0.5">{selectedTx.user?.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{selectedTx.user?.email}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <div className="text-[11px] text-slate-400 font-sans">Recipient</div>
                  <div className="font-semibold text-white mt-0.5">
                    {selectedTx.recipient_user?.name || 'Platform Reserve'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {selectedTx.recipient_user?.email || 'System'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-white/5">
                  <div className="text-[10px] text-slate-400 font-sans">Amount</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {selectedTx.currency_code} {Number(selectedTx.amount).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <div className="text-[10px] text-slate-400 font-sans">Type</div>
                  <div className="text-xs uppercase text-purple-300 mt-1 font-bold">
                    {selectedTx.type}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <div className="text-[10px] text-slate-400 font-sans">Risk Score</div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">
                    {selectedTx.risk_score} / 100
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Current Status</div>
                  <div className="text-xs uppercase font-bold text-white mt-0.5">{selectedTx.status}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                  STATUS_STYLES[selectedTx.status] ?? STATUS_STYLES.pending
                }`}>
                  {selectedTx.status}
                </span>
              </div>

              {selectedTx.description && (
                <div className="p-3 rounded-xl bg-white/5">
                  <div className="text-[11px] text-slate-400">Description</div>
                  <p className="text-white mt-0.5">{selectedTx.description}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              {selectedTx.status === 'held_for_review' && (
                <>
                  <button
                    onClick={() => handleApprove(selectedTx.id)}
                    disabled={actionLoading === selectedTx.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Release Funds</span>
                  </button>
                  <button
                    onClick={() => handleReject(selectedTx.id)}
                    disabled={actionLoading === selectedTx.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject & Refund</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
