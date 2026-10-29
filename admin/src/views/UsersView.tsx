import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import type { Department, Permission, User, UserGroup } from '../types';
import {
  Search,
  Shield,
  Lock,
  Unlock,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Wallet as WalletIcon,
  Clock,
  ShieldCheck,
  Plus,
  Users as UsersIcon,
  Building2,
  Key,
  Check,
  Edit3,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface UsersViewProps {
  currentUser?: User | null;
  initialTab?: ActiveSubTab;
}

type ActiveSubTab = 'users' | 'groups' | 'departments';

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, initialTab = 'users' }) => {
  const [activeTab, setActiveTab] = useState<ActiveSubTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // --- Data states ---
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ current_page: 1, last_page: 1, total: 0 });

  // Detail Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // --- Modals ---
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Permissions Config Modal for a UserGroup
  const [selectedGroupForPerms, setSelectedGroupForPerms] = useState<UserGroup | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Forms state
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '+994',
    password: 'Password123!',
    role: 'user' as 'user' | 'admin',
    department_id: '',
    user_group_id: '',
    initial_azn: 1000,
    initial_eur: 500,
    initial_usd: 500,
  });

  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    department_id: '',
    description: '',
    permission_ids: [] as number[],
  });

  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    manager_name: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Check if current logged-in user has rights to grant/manage permissions
  const canManagePermissions = currentUser?.role === 'admin' || currentUser?.can_manage_permissions || currentUser?.is_system_admin;

  // Load Reference Data (Departments, Groups, Permissions)
  const loadReferenceData = useCallback(async () => {
    try {
      const [deptRes, groupRes, permRes] = await Promise.all([
        ApiClient.getDepartments(),
        ApiClient.getUserGroups(),
        ApiClient.getPermissions(),
      ]);
      setDepartments(deptRes.data || []);
      setUserGroups(groupRes.data || []);
      setPermissions(permRes.data || []);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  }, []);

  // Load Users List
  const loadUsers = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await ApiClient.getUsers(
        search,
        role,
        status,
        targetPage,
        selectedDeptFilter,
        selectedGroupFilter
      );
      setUsers(res.data || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, role, status, page, selectedDeptFilter, selectedGroupFilter]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadUsers(page);
  }, [loadUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [role, status, selectedDeptFilter, selectedGroupFilter]);

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

  // --- Handlers: Create User ---
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await ApiClient.createUser({
        name: newUserForm.name,
        email: newUserForm.email,
        phone: newUserForm.phone,
        password: newUserForm.password,
        role: newUserForm.role,
        department_id: newUserForm.department_id ? Number(newUserForm.department_id) : null,
        user_group_id: newUserForm.user_group_id ? Number(newUserForm.user_group_id) : null,
        initial_azn: Number(newUserForm.initial_azn),
        initial_eur: Number(newUserForm.initial_eur),
        initial_usd: Number(newUserForm.initial_usd),
      });

      setShowCreateUserModal(false);
      setNewUserForm({
        name: '',
        email: '',
        phone: '+994',
        password: 'Password123!',
        role: 'user',
        department_id: '',
        user_group_id: '',
        initial_azn: 1000,
        initial_eur: 500,
        initial_usd: 500,
      });
      loadUsers(1);
      loadReferenceData();
      alert('Yeni istifadəçi və rəqəmsal cüzdan uğurla yaradıldı!');
    } catch (err: any) {
      alert(err.message || 'İstifadəçi yaradılarkən xəta baş verdi.');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers: Create User Group ---
  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.createUserGroup({
        name: newGroupForm.name,
        department_id: newGroupForm.department_id ? Number(newGroupForm.department_id) : null,
        description: newGroupForm.description,
        permission_ids: newGroupForm.permission_ids,
      });

      setShowCreateGroupModal(false);
      setNewGroupForm({
        name: '',
        department_id: '',
        description: '',
        permission_ids: [],
      });
      loadReferenceData();
      alert('Yeni istifadəçi qrupu uğurla yaradıldı!');
    } catch (err: any) {
      alert(err.message || 'Qrup yaradılarkən xəta baş verdi.');
    }
  };

  // --- Handlers: Delete User Group ---
  const handleDeleteGroup = async (group: UserGroup) => {
    if (!confirm(`'${group.name}' qrupunu silmək istədiyinizdən əminsiniz?`)) return;
    try {
      await ApiClient.deleteUserGroup(group.id);
      loadReferenceData();
    } catch (err: any) {
      alert(err.message || 'Qrup silinə bilmədi.');
    }
  };

  // --- Handlers: Permissions Matrix ---
  const handleOpenPermissionsModal = (group: UserGroup) => {
    setSelectedGroupForPerms(group);
    setSelectedPermIds(group.permissions?.map((p) => p.id) || []);
  };

  const handleTogglePermissionId = (permId: number) => {
    if (!canManagePermissions) return;
    setSelectedPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSaveGroupPermissions = async () => {
    if (!selectedGroupForPerms) return;
    if (!canManagePermissions) {
      alert('İcazə verilmədi! Yalnız Sistem Administratoru və ya "manage_permissions" səlahiyyəti olan şəxslər icazə təyin edə bilər.');
      return;
    }

    try {
      setSavingPerms(true);
      await ApiClient.updateGroupPermissions(selectedGroupForPerms.id, selectedPermIds);
      await loadReferenceData();
      setSelectedGroupForPerms(null);
      alert(`'${selectedGroupForPerms.name}' üçün icazələr uğurla tətbiq olundu!`);
    } catch (err: any) {
      alert(err.message || 'İcazələr yenilənərkən xəta baş verdi.');
    } finally {
      setSavingPerms(false);
    }
  };

  // --- Handlers: Department Create & Edit ---
  const handleSaveDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await ApiClient.updateDepartment(editingDept.id, deptForm);
      } else {
        await ApiClient.createDepartment(deptForm);
      }
      setShowCreateDeptModal(false);
      setEditingDept(null);
      setDeptForm({
        name: '',
        code: '',
        description: '',
        manager_name: '',
        status: 'active',
      });
      loadReferenceData();
      alert(editingDept ? 'Departament məlumatları yeniləndi!' : 'Yeni departament uğurla yaradıldı!');
    } catch (err: any) {
      alert(err.message || 'Departament əməliyyatı uğursuz oldu.');
    }
  };

  const handleDeleteDept = async (dept: Department) => {
    if (!confirm(`'${dept.name}' departamentini silmək istəyirsiniz?`)) return;
    try {
      await ApiClient.deleteDepartment(dept.id);
      loadReferenceData();
    } catch (err: any) {
      alert(err.message || 'Departament silinə bilmədi.');
    }
  };

  // Group permissions by category for the modal
  const permissionsByCategory = permissions.reduce((acc, curr) => {
    const cat = curr.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner & Sub-Tabs Navigation */}
      <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>İstifadəçilər, Departamentlər və Səlahiyyət İdarəetməsi</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            İstifadəçi Qrupları, Departament və İcazə Nəzarət Mərkəzi
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Sistem administratoru qaydası: İcazələri yalnız Sistem Administratoru və ya xüsusi{' '}
            <code className="text-cyan-300 font-mono bg-cyan-500/10 px-1 py-0.5 rounded">manage_permissions</code>{' '}
            icazəsinə malik istifadəçilər təyin edə bilər.
          </p>
        </div>

        {/* Action Buttons based on Tab */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {activeTab === 'users' && (
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İstifadəçi Yarat</span>
            </button>
          )}

          {activeTab === 'groups' && (
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İstifadəçi Qrupu</span>
            </button>
          )}

          {activeTab === 'departments' && (
            <button
              onClick={() => {
                setEditingDept(null);
                setDeptForm({
                  name: '',
                  code: '',
                  description: '',
                  manager_name: '',
                  status: 'active',
                });
                setShowCreateDeptModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Departament Yarat</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'users'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-xl'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>Users & Accounts ({meta.total || users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'groups'
              ? 'border-purple-400 text-purple-400 bg-purple-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-xl'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>User Groups & Permissions ({userGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'departments'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-xl'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: USERS LIST                                              */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10">
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Axtarış: ad, email və ya telefon..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 transition"
              />
            </form>

            <div className="flex flex-wrap items-center gap-3">
              {/* Department Filter */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                aria-label="Filter by department"
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="" className="bg-[#0b1329]">Bütün Departamentlər</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#0b1329]">
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>

              {/* User Group Filter */}
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                aria-label="Filter by user group"
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="" className="bg-[#0b1329]">Bütün Qruplar</option>
                {userGroups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#0b1329]">
                    {g.name}
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-label="Filter by role"
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="" className="bg-[#0b1329]">Bütün Rollar</option>
                <option value="user" className="bg-[#0b1329]">Standart İstifadəçilər</option>
                <option value="admin" className="bg-[#0b1329]">Adminlər</option>
              </select>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="" className="bg-[#0b1329]">Bütün Statuslar</option>
                <option value="active" className="bg-[#0b1329]">Aktiv</option>
                <option value="frozen" className="bg-[#0b1329]">Dondurulmuş</option>
                <option value="suspended" className="bg-[#0b1329]">Dayandırılmış</option>
              </select>

              <button
                onClick={() => {
                  setSearch('');
                  setRole('');
                  setStatus('');
                  setSelectedDeptFilter('');
                  setSelectedGroupFilter('');
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs border border-white/10 transition cursor-pointer"
              >
                Sıfırla
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider bg-white/5">
                    <th className="py-3 px-5">İstifadəçi</th>
                    <th className="py-3 px-4">Departament</th>
                    <th className="py-3 px-4">İstifadəçi Qrupu</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Cüzdan Nömrəsi</th>
                    <th className="py-3 px-4">AZN Balans</th>
                    <th className="py-3 px-4">EUR Balans</th>
                    <th className="py-3 px-4">USD Balans</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        İstifadəçi hesabları yüklənir...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Heç bir istifadəçi tapılmadı.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const azn = user.wallet?.balances?.find((b) => b.currency_code === 'AZN')?.balance ?? '0.00';
                      const eur = user.wallet?.balances?.find((b) => b.currency_code === 'EUR')?.balance ?? '0.00';
                      const usd = user.wallet?.balances?.find((b) => b.currency_code === 'USD')?.balance ?? '0.00';

                      return (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-300 shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-white flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {user.is_system_admin && (
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-bold">
                                      SysAdmin
                                    </span>
                                  )}
                                  {user.can_manage_permissions && !user.is_system_admin && (
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                                      PermsAdmin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {user.department ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                                <Building2 className="w-3 h-3 text-emerald-400" />
                                {user.department.name}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">— Təyin edilməyib —</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {user.user_group ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-semibold">
                                <Key className="w-3 h-3 text-purple-400" />
                                {user.user_group.name}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">— Qrup yoxdur —</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin'
                                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-slate-700/50 text-slate-300'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {user.wallet?.wallet_number || '—'}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                            {Number(azn).toLocaleString('en-US', { minimumFractionDigits: 2 })} ₼
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">
                            {Number(eur).toLocaleString('en-US', { minimumFractionDigits: 2 })} €
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">
                            ${Number(usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                user.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : user.status === 'frozen'
                                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.status === 'active'
                                    ? 'bg-emerald-400'
                                    : user.status === 'frozen'
                                    ? 'bg-blue-400'
                                    : 'bg-red-400'
                                }`}
                              />
                              {user.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 text-right space-x-1">
                            <button
                              onClick={() => setSelectedUser(user)}
                              title="Təfərrüatlara bax"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {user.status === 'active' ? (
                              <button
                                disabled={actionLoading === user.id}
                                onClick={() => handleSetStatus(user, 'frozen')}
                                title="Hesabı Dondur"
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition cursor-pointer disabled:opacity-50"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                disabled={actionLoading === user.id}
                                onClick={() => handleSetStatus(user, 'active')}
                                title="Hesabı Aktivləşdir"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition cursor-pointer disabled:opacity-50"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {user.status !== 'suspended' && (
                              <button
                                disabled={actionLoading === user.id}
                                onClick={() => handleSetStatus(user, 'suspended')}
                                title="Hesabı Dayandır (Suspend)"
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer disabled:opacity-50"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
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

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Səhifə <strong className="text-white">{meta.current_page}</strong> / {meta.last_page} (Cəmi: {meta.total})
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: USER GROUPS & PERMISSIONS MATRIX                        */}
      {/* ============================================================== */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Permission Enforcement Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              canManagePermissions
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                {canManagePermissions ? (
                  <span>
                    <strong>Səlahiyyət Təsdiqləndi:</strong> Siz Sistem Administratorusunuz və ya{' '}
                    <code className="text-cyan-200 font-mono bg-cyan-900/50 px-1 py-0.5 rounded">manage_permissions</code>{' '}
                    icazəsinə maliksiniz. Qruplara icazələr verə və dəyişə bilərsiniz.
                  </span>
                ) : (
                  <span>
                    <strong>Məhdud Giriş:</strong> Sizin hesabınızda icazə vermək hüququ yoxdur. İcazələri yalnız{' '}
                    <strong>Sistem Administratoru</strong> və ya{' '}
                    <code className="text-amber-200 font-mono bg-amber-900/50 px-1 py-0.5 rounded">manage_permissions</code>{' '}
                    səlahiyyəti verilmiş istifadəçilər tənzimləyə bilər.
                  </span>
                )}
              </div>
            </div>

            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-black/40 font-bold shrink-0">
              {canManagePermissions ? 'TAM İCAZƏ VERİLDİ' : 'OXU REJİMİ (READ-ONLY)'}
            </span>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userGroups.map((group) => {
              const hasManagePerms = group.permissions?.some((p) => p.slug === 'manage_permissions');

              return (
                <div
                  key={group.id}
                  className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-tight">{group.name}</h3>
                          {group.is_system && (
                            <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                              Sistem
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-purple-400 font-semibold block mt-0.5">
                          slug: {group.slug}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!group.is_system && (
                          <button
                            onClick={() => handleDeleteGroup(group)}
                            title="Qrupu sil"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {group.department && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-[11px] border border-white/5">
                        <Building2 className="w-3 h-3 text-cyan-400" />
                        <span>Departament: <strong className="text-white">{group.department.name}</strong></span>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 line-clamp-2">{group.description || 'Təsvir yoxdur.'}</p>

                    {/* Manage Permissions Special Flag */}
                    {hasManagePerms && (
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>Xüsusi Səlahiyyət: Bu qrupdakı istifadəçilər icazə təyin edə bilər!</span>
                      </div>
                    )}

                    {/* Permissions summary */}
                    <div>
                      <div className="text-[11px] uppercase font-bold text-slate-400 mb-2 flex items-center justify-between">
                        <span>Təyin edilmiş icazələr ({group.permissions?.length || 0}):</span>
                        <span className="text-slate-500 font-mono">{group.users_count || 0} üzv</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                        {group.permissions && group.permissions.length > 0 ? (
                          group.permissions.map((p) => (
                            <span
                              key={p.id}
                              className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                                p.slug === 'manage_permissions'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                                  : 'bg-white/5 text-slate-300 border-white/10'
                              }`}
                            >
                              {p.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Heç bir icazə təyin edilməyib</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Configure Permissions Button */}
                  <button
                    onClick={() => handleOpenPermissionsModal(group)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>İcazələri Tənzimlə</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: DEPARTMENTS LIST                                        */}
      {/* ============================================================== */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        {dept.code}
                      </span>
                      <h3 className="text-base font-bold text-white tracking-tight mt-1">{dept.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDept(dept);
                          setDeptForm({
                            name: dept.name,
                            code: dept.code,
                            description: dept.description || '',
                            manager_name: dept.manager_name || '',
                            status: dept.status,
                          });
                          setShowCreateDeptModal(true);
                        }}
                        title="Redaktə et"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteDept(dept)}
                        title="Departamenti sil"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{dept.description || 'Təsvir əlavə edilməyib.'}</p>

                  <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Rəhbər / Məsul Şəxs:</span>
                      <strong className="text-white font-medium">{dept.manager_name || 'Təyin edilməyib'}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>İstifadəçi Qrupları:</span>
                      <span className="font-mono text-purple-400 font-bold">{dept.user_groups_count || 0} qrup</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Təyin edilmiş Heyət / İstifadəçilər:</span>
                      <span className="font-mono text-cyan-400 font-bold">{dept.users_count || 0} nəfər</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Status:</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          dept.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {dept.status}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedDeptFilter(String(dept.id));
                    setActiveTab('users');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 text-xs font-semibold border border-white/10 transition cursor-pointer"
                >
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span>Departamentin İstifadəçilərini Göstər</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CREATE NEW USER                                       */}
      {/* ============================================================== */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-xl rounded-2xl border border-white/15 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowCreateUserModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <UsersIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Yeni İstifadəçi Əlavə Et</h3>
                <p className="text-xs text-slate-400">
                  İstifadəçi üçün departament, rol, istifadəçi qrupu və başlanğıc balans təyin edin.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Ad və Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    placeholder="Məsələn: Tural Qasımov"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Email Ünvanı *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="tural@travelpay.com"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Əlaqə Telefonu *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    placeholder="+994501234567"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    İlkin Şifrə *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Sistem Rolu *
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="user">İstifadəçi (User)</option>
                    <option value="admin">İnzibatçı (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Departament *
                  </label>
                  <select
                    value={newUserForm.department_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Departament Seçin</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    İstifadəçi Qrupu
                  </label>
                  <select
                    value={newUserForm.user_group_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, user_group_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Qrup Seçin</option>
                    {userGroups
                      .filter(
                        (g) => !newUserForm.department_id || g.department_id === Number(newUserForm.department_id)
                      )
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Initial Balances */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-[11px] font-bold uppercase text-slate-300 flex items-center gap-2">
                  <WalletIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rəqəmsal Pul Kisəsinin Başlanğıc Balansları</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">AZN (₼)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={newUserForm.initial_azn}
                      onChange={(e) => setNewUserForm({ ...newUserForm, initial_azn: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">EUR (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={newUserForm.initial_eur}
                      onChange={(e) => setNewUserForm({ ...newUserForm, initial_eur: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-blue-400 font-mono text-xs focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">USD ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={newUserForm.initial_usd}
                      onChange={(e) => setNewUserForm({ ...newUserForm, initial_usd: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  İstifadəçini Yarat və Təyin Et
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CREATE USER GROUP                                     */}
      {/* ============================================================== */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-xl rounded-2xl border border-white/15 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowCreateGroupModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Yeni İstifadəçi Qrupu Yarat</h3>
                <p className="text-xs text-slate-400">
                  Qrupun aid olduğu departamenti və ilkin icazələrini seçin.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Qrup Adı *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, name: e.target.value })}
                  placeholder="Məsələn: Fraud Monitoring Operator"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Departament *
                </label>
                <select
                  required
                  value={newGroupForm.department_id}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400"
                >
                  <option value="">Departament Seçin</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Təsvir
                </label>
                <textarea
                  rows={2}
                  value={newGroupForm.description}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, description: e.target.value })}
                  placeholder="Bu qrupun vəzifə öhdəlikləri və icazə səviyyəsi..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  İlkin İcazələrin Təyini
                </label>
                <div className="max-h-48 overflow-y-auto custom-scrollbar p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  {permissions.map((p) => {
                    const isChecked = newGroupForm.permission_ids.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition ${
                          isChecked ? 'bg-purple-500/15 border border-purple-500/30' : 'hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewGroupForm({
                                ...newGroupForm,
                                permission_ids: [...newGroupForm.permission_ids, p.id],
                              });
                            } else {
                              setNewGroupForm({
                                ...newGroupForm,
                                permission_ids: newGroupForm.permission_ids.filter((id) => id !== p.id),
                              });
                            }
                          }}
                          className="mt-0.5 rounded text-purple-500 focus:ring-0"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.slug} • {p.category}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20 cursor-pointer"
                >
                  Qrupu Yarat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CONFIGURE GROUP PERMISSIONS (MATRIX)                  */}
      {/* ============================================================== */}
      {selectedGroupForPerms && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-3xl rounded-2xl border border-purple-500/30 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedGroupForPerms(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    İcazələrin Tənzimlənməsi: {selectedGroupForPerms.name}
                  </h3>
                  {selectedGroupForPerms.is_system && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                      Sistem Qrupu
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Bu qrupa daxil olan bütün istifadəçilərə tətbiq ediləcək platforma səlahiyyətləri.
                </p>
              </div>
            </div>

            {/* Warning if current user cannot manage permissions */}
            {!canManagePermissions ? (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>Diqqət:</strong> İcazələri dəyişmək üçün Sistem Administratoru və ya{' '}
                  <code className="text-red-200 font-mono bg-red-950 px-1 py-0.5 rounded">manage_permissions</code>{' '}
                  icazəsinə malik olmalısınız. Siz yalnız icazələrə baxa bilərsiniz.
                </span>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Sizin icazə vermək hüququnuz təsdiqləndi. İcazələri aktivləşdirib yadda saxlaya bilərsiniz.
                </span>
              </div>
            )}

            {/* Permissions categorized */}
            <div className="max-h-[55vh] overflow-y-auto custom-scrollbar space-y-5 p-2">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center justify-between border-b border-white/10 pb-2">
                    <span>{category}</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {perms.filter((p) => selectedPermIds.includes(p.id)).length} / {perms.length} aktiv
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {perms.map((p) => {
                      const isChecked = selectedPermIds.includes(p.id);
                      const isManagePerms = p.slug === 'manage_permissions';

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleTogglePermissionId(p.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                            isChecked
                              ? isManagePerms
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-md shadow-cyan-500/10'
                                : 'bg-purple-500/15 border-purple-500/40 text-white'
                              : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20'
                          } ${!canManagePermissions ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            disabled={!canManagePermissions}
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div
                            className={`mt-1 rounded focus:ring-0 ${
                              isManagePerms ? 'text-cyan-400' : 'text-purple-500'
                            }`}
                          />
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-white">{p.name}</span>
                              {isManagePerms && (
                                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-400 text-black font-extrabold">
                                  Xüsusi Səlahiyyət
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight">{p.description}</p>
                            <span className="font-mono text-[10px] text-slate-500 block">slug: {p.slug}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
              <span className="text-xs text-slate-400">
                Seçilmiş: <strong className="text-white font-mono">{selectedPermIds.length}</strong> icazə
              </span>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedGroupForPerms(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Bağla
                </button>

                {canManagePermissions && (
                  <button
                    disabled={savingPerms}
                    onClick={handleSaveGroupPermissions}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {savingPerms ? 'Yadda Saxlanılır...' : 'İcazələri Yadda Saxla'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CREATE / EDIT DEPARTMENT                              */}
      {/* ============================================================== */}
      {showCreateDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/15 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setShowCreateDeptModal(false);
                setEditingDept(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingDept ? 'Departamenti Redaktə Et' : 'Yeni Departament Yarat'}
                </h3>
                <p className="text-xs text-slate-400">
                  Təşkilati struktur vahidinin adı, kodu və rəhbərini daxil edin.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDeptSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Departamentin Adı *
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="Məsələn: Risk və Fırıldaqçılığın Qarşısının Alınması"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Unikal Kod (Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    placeholder="RISK"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                    Rəhbər / Məsul Şəxs
                  </label>
                  <input
                    type="text"
                    value={deptForm.manager_name}
                    onChange={(e) => setDeptForm({ ...deptForm, manager_name: e.target.value })}
                    placeholder="Məsələn: Orxan Hüseynov"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Təsvir
                </label>
                <textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Departamentin fəaliyyət istiqamətləri və cavabdehliyi..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Status
                </label>
                <select
                  value={deptForm.status}
                  onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                >
                  <option value="active">Aktiv</option>
                  <option value="inactive">Qeyri-aktiv</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDeptModal(false);
                    setEditingDept(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {editingDept ? 'Dəyişiklikləri Yadda Saxla' : 'Departamenti Yarat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: USER DETAILS VIEW                                     */}
      {/* ============================================================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-white/15 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-cyan-500/25 shrink-0">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedUser.name}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      selectedUser.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : selectedUser.status === 'frozen'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                </h3>
                <div className="text-xs text-slate-400 font-mono">{selectedUser.email} • ID #{selectedUser.id}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Departament</span>
                <span className="text-xs font-semibold text-emerald-400">
                  {selectedUser.department?.name || '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">İstifadəçi Qrupu</span>
                <span className="text-xs font-semibold text-purple-400">
                  {selectedUser.user_group?.name || '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Rol</span>
                <span className="text-xs font-semibold text-cyan-400 uppercase font-mono">
                  {selectedUser.role}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Telefon</span>
                <span className="text-xs font-semibold text-slate-200 font-mono">
                  {selectedUser.phone || '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">2FA Təhlükəsizlik</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  {selectedUser.two_factor_enabled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktivdir
                    </>
                  ) : (
                    <span className="text-slate-400">Deaktiv</span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Qeydiyyat Tarixi</span>
                <span className="text-xs font-semibold text-slate-300 font-mono">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>

            {/* Wallet details */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WalletIcon className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Rəqəmsal Pul Kisəsi
                  </span>
                </div>
                <span className="font-mono text-xs text-cyan-400">
                  {selectedUser.wallet?.wallet_number || 'N/A'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['AZN', 'EUR', 'USD'].map((curr) => {
                  const b = selectedUser.wallet?.balances?.find((item) => item.currency_code === curr);
                  return (
                    <div key={curr} className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-[10px] font-mono text-slate-400 block">{curr} Balansı</span>
                      <span className="text-sm font-mono font-bold text-white">
                        {Number(b?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Permissions list */}
            {selectedUser.permissions && selectedUser.permissions.length > 0 && (
              <div className="space-y-2 mb-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  İstifadəçinin Sahib Olduğu İcazələr ({selectedUser.permissions.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                  {selectedUser.permissions.map((slug) => (
                    <span
                      key={slug}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                    >
                      {slug}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Status Change Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Son Giriş:{' '}
                  {selectedUser.last_login_at
                    ? new Date(selectedUser.last_login_at).toLocaleString()
                    : 'Giriş qeydə alınmayıb'}
                </span>
              </div>

              <div className="flex gap-2">
                {selectedUser.status === 'active' ? (
                  <button
                    onClick={() => handleSetStatus(selectedUser, 'frozen')}
                    className="px-3.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition cursor-pointer"
                  >
                    Hesabı Dondur
                  </button>
                ) : (
                  <button
                    onClick={() => handleSetStatus(selectedUser, 'active')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition cursor-pointer"
                  >
                    Hesabı Aktivləşdir
                  </button>
                )}

                {selectedUser.status !== 'suspended' && (
                  <button
                    onClick={() => handleSetStatus(selectedUser, 'suspended')}
                    className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/30 transition cursor-pointer"
                  >
                    Dayandır (Suspend)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
