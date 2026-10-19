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
        if (res.data.user.role !== 'admin') {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050b14] relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 mb-2">
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
            <span>{loading ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 text-center space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Demo Administrator Credentials
          </p>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-mono text-slate-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
            <span className="text-cyan-400 font-semibold">admin@travelpay.com</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span>Password: <strong className="text-slate-100 font-normal">Password123!</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
