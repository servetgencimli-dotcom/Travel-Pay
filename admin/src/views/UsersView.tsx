import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import type { User } from '../types';
import { Search, Shield, Lock, Unlock } from 'lucide-react';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadUsers();
  }, [role, status]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getUsers(search, role, status);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'frozen' : 'active';
    if (!confirm(`Are you sure you want to change ${user.name}'s status to ${nextStatus}?`)) return;

    try {
      await ApiClient.updateUserStatus(user.id, nextStatus);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    }
  };

  return (
    <div className="p-8 space-y-6">
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

        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
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
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            {user.status === 'active' ? (
                              <>
                                <Lock className="w-3 h-3 text-red-400" />
                                <span>Freeze</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 text-emerald-400" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
