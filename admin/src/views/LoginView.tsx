import React, { useState } from 'react';
import { ApiClient } from '../services/api';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@travelpay.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await ApiClient.login(email, password);
      if (res.data && res.data.token) {
        ApiClient.setToken(res.data.token);
        if (res.data.user.role !== 'admin' && !res.data.user.can_access_admin && !res.data.user.is_system_admin) {
          throw new Error('Access denied. Administrator privileges required.');
        }
        onLoginSuccess(res.data.user);
      } else {
        throw new Error(res.message || 'Login failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050b14] relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-card p-7 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TravelPay Admin</h1>
          <p className="text-xs text-slate-400">Institutional FinTech Control & Fraud Surveillance</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 transition"
                placeholder="admin@travelpay.com"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 transition"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Giriş edilir...' : 'Admin Panelinə Daxil Ol'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 text-center space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hazır Test Hesabları (Klikləyərək Daxil Olun)
          </p>

          <div className="space-y-2 text-left">
            {/* Account 1: System Admin */}
            <div
              onClick={() => handleSelectAccount('admin@travelpay.com')}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                email === 'admin@travelpay.com'
                  ? 'bg-red-500/15 border-red-500/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">admin@travelpay.com</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-mono font-bold">
                    Sistem Administratoru
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Tam səlahiyyətli: Bütün icazələri görə və istənilən qrupa verə bilər
                </div>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold shrink-0 ml-2">Seç</span>
            </div>

            {/* Account 2: Access Mgr */}
            <div
              onClick={() => handleSelectAccount('rashad.security@travelpay.com')}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                email === 'rashad.security@travelpay.com'
                  ? 'bg-purple-500/15 border-purple-500/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">rashad.security@travelpay.com</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                    PermsAdmin
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Xüsusi <code className="text-cyan-300">manage_permissions</code> səlahiyyəti ilə təchiz olunub
                </div>
              </div>
              <span className="text-xs font-mono text-purple-400 font-bold shrink-0 ml-2">Seç</span>
            </div>

            {/* Account 3: Risk Lead */}
            <div
              onClick={() => handleSelectAccount('orkhan.risk@travelpay.com')}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                email === 'orkhan.risk@travelpay.com'
                  ? 'bg-amber-500/15 border-amber-500/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">orkhan.risk@travelpay.com</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                    Fraud Lead
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Fraud qaydaları və insidentlər (İcazə vermə hüququ yoxdur - Read-only)
                </div>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold shrink-0 ml-2">Seç</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-mono pt-1">
            Bütün demo hesablar üçün şifrə: <strong className="text-slate-300">Password123!</strong>
          </p>
        </div>
      </div>
    </div>
  );
};
