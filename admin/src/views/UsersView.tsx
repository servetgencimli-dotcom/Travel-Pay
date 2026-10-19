import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import type { User } from '../types';
import {
  Search,
  Shield,
  Lock,
  Unlock,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Wallet as WalletIcon,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ current_page: 1, last_page: 1, total: 0 });

  // Detail Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await ApiClient.getUsers(search, role, status, targetPage);
      setUsers(res.data);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, role, status, page]);

  useEffect(() => {
    loadUsers(page);
  }, [loadUsers, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [role, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers(1);
  };

  const handleSetStatus = async (user: User, nextStatus: 'active' | 'suspended' | 'frozen') => {
    if (user.status === nextStatus) return;

    const warnMsg =
      nextStatus !== 'active'
        ? `Setting ${user.name}'s status to "${nextStatus}" will IMMEDIATELY revoke all active API tokens and prevent logins. Continue?`
        : `Activate ${user.name}'s account?`;

    if (!confirm(warnMsg)) return;

    try {
      setActionLoading(user.id);
      await ApiClient.updateUserStatus(user.id, nextStatus);
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, status: nextStatus });
      }
      loadUsers(page);
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Header and Filters */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Filter by role"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="" className="bg-navy-900">All Roles</option>
            <option value="user" className="bg-navy-900">Users</option>
            <option value="admin" className="bg-navy-900">Admins</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="" className="bg-navy-900">All Statuses</option>
            <option value="active" className="bg-navy-900">Active</option>
            <option value="frozen" className="bg-navy-900">Frozen</option>
            <option value="suspended" className="bg-navy-900">Suspended</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setRole('');
              setStatus('');
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs border border-white/10 transition cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Wallet Number</th>
                <th className="py-3 px-4">AZN Balance</th>
                <th className="py-3 px-4">EUR Balance</th>
                <th className="py-3 px-4">USD Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading accounts...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No matching accounts found.</td>
                </tr>
              ) : (
                users.map((user) => {
                  const azn = user.wallet?.balances?.find((b) => b.currency_code === 'AZN')?.balance ?? 0;
                  const eur = user.wallet?.balances?.find((b) => b.currency_code === 'EUR')?.balance ?? 0;
                  const usd = user.wallet?.balances?.find((b) => b.currency_code === 'USD')?.balance ?? 0;

                  return (
                    <tr key={user.id} className="hover:bg-white/5 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{user.name}</span>
                          {user.role === 'admin' && (
                            <Shield className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          user.role === 'admin' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-500/20 text-slate-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-cyan-400 font-medium">
                        {user.wallet?.wallet_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                        ₼ {Number(azn).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">
                        € {Number(eur).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">
                        $ {Number(usd).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          user.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : user.status === 'suspended'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUser(user)}
                            title="Inspect User Details"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          </button>

                          {user.role !== 'admin' && (
                            <div className="inline-flex items-center gap-1">
                              {user.status === 'active' ? (
                                <>
                                  <button
                                    onClick={() => handleSetStatus(user, 'frozen')}
                                    disabled={actionLoading === user.id}
                                    title="Freeze wallet & operations"
                                    className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 transition text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <Lock className="w-3 h-3 text-red-400" />
                                    <span>Freeze</span>
                                  </button>
                                  <button
                                    onClick={() => handleSetStatus(user, 'suspended')}
                                    disabled={actionLoading === user.id}
                                    title="Suspend account & revoke tokens"
                                    className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition text-[11px] font-medium cursor-pointer disabled:opacity-50"
                                  >
                                    Suspend
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleSetStatus(user, 'active')}
                                  disabled={actionLoading === user.id}
                                  title="Reactivate account"
                                  className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Unlock className="w-3 h-3 text-emerald-400" />
                                  <span>Activate</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-mono">{users.length}</span> accounts of{' '}
            <span className="text-white font-mono">{meta.total}</span> total
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-2xl w-full glass-card p-6 rounded-3xl border border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-base">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <span>{selectedUser.name}</span>
                    {selectedUser.role === 'admin' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 uppercase">Admin</span>
                    )}
                  </h4>
                  <div className="text-xs text-slate-400 font-mono">{selectedUser.email}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 space-y-1">
                <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2FA Security</span>
                </div>
                <div className="font-semibold">
                  {selectedUser.two_factor_enabled ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Activated
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" /> Disabled
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 space-y-1">
                <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Status</span>
                </div>
                <div className="font-semibold uppercase font-mono">
                  <span className={
                    selectedUser.status === 'active' ? 'text-emerald-400' :
                    selectedUser.status === 'suspended' ? 'text-amber-400' : 'text-red-400'
                  }>
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 space-y-1 col-span-2 sm:col-span-1">
                <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Phone Number</span>
                </div>
                <div className="font-mono text-white">
                  {selectedUser.phone || 'Not linked'}
                </div>
              </div>
            </div>

            {/* Wallet & Multi-Currency Balances */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-white flex items-center gap-2">
                  <WalletIcon className="w-4 h-4 text-cyan-400" />
                  <span>Primary Multi-Currency Digital Wallet</span>
                </div>
                <span className="font-mono text-cyan-400 text-[11px]">
                  {selectedUser.wallet?.wallet_number || 'No Wallet'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-black/20 border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Azerbaijani Manat</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    ₼ {Number(selectedUser.wallet?.balances?.find((b) => b.currency_code === 'AZN')?.balance ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Locked: ₼ {Number(selectedUser.wallet?.balances?.find((b) => b.currency_code === 'AZN')?.locked_balance ?? 0).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/20 border border-blue-500/20">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Euro</div>
                  <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
                    € {Number(selectedUser.wallet?.balances?.find((b) => b.currency_code === 'EUR')?.balance ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Locked: € {Number(selectedUser.wallet?.balances?.find((b) => b.currency_code === 'EUR')?.locked_balance ?? 0).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/20 border border-amber-500/20">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">US Dollar</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                    $ {Number(selectedUser.wallet?.balances?.find((b) => b.currency_code === 'USD')?.balance ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Locked: $ {Number(selectedUser.wallet?.balances?.find((b) => b.currency_code === 'USD')?.locked_balance ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Devices */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span>Authorized Devices & Sessions ({selectedUser.devices?.length || 0})</span>
                </div>
              </div>

              {(!selectedUser.devices || selectedUser.devices.length === 0) ? (
                <div className="p-3 rounded-xl bg-white/5 text-center text-xs text-slate-400">
                  No active registered devices for this user.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {selectedUser.devices.map((dev) => (
                    <div
                      key={dev.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{dev.device_name || 'Generic Device'}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                            {dev.os || dev.device_type}
                          </span>
                          {dev.is_trusted && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                              Trusted
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          IP: {dev.ip_address} • Last active: {dev.last_active_at ? new Date(dev.last_active_at).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Management Actions in Modal */}
            {selectedUser.role !== 'admin' && (
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Account Status Override:
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSetStatus(selectedUser, 'active')}
                    disabled={selectedUser.status === 'active' || actionLoading === selectedUser.id}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleSetStatus(selectedUser, 'suspended')}
                    disabled={selectedUser.status === 'suspended' || actionLoading === selectedUser.id}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Suspend & Revoke Tokens
                  </button>
                  <button
                    onClick={() => handleSetStatus(selectedUser, 'frozen')}
                    disabled={selectedUser.status === 'frozen' || actionLoading === selectedUser.id}
                    className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Freeze Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
