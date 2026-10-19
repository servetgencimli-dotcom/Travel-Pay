import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from './services/api';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { UsersView } from './views/UsersView';
import { WalletsView } from './views/WalletsView';
import { TransactionsView } from './views/TransactionsView';
import { LedgerView } from './views/LedgerView';
import { FraudMonitoringView } from './views/FraudMonitoringView';
import { RiskRulesView } from './views/RiskRulesView';
import { ThreatShieldView } from './views/ThreatShieldView';
import { SecurityEventsView } from './views/SecurityEventsView';
import { TravelAnalyticsView } from './views/TravelAnalyticsView';
import { AuditLogsView } from './views/AuditLogsView';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      setCheckingAuth(true);
      const res = await ApiClient.getMe();
      if (res.data?.user?.role === 'admin') {
        setCurrentUser(res.data.user);
      } else {
        ApiClient.clearToken();
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [checkAuth]);

  const handleLogout = async () => {
    try {
      await ApiClient.logout();
    } catch {
      // ignore
    } finally {
      ApiClient.clearToken();
      setCurrentUser(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050b14] text-xs font-mono text-cyan-400">
        Authenticating TravelPay Secure Gateway...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'users':
        return <UsersView />;
      case 'wallets':
        return <WalletsView />;
      case 'transactions':
        return <TransactionsView />;
      case 'ledger':
        return <LedgerView />;
      case 'fraud':
        return <FraudMonitoringView />;
      case 'rules':
        return <RiskRulesView />;
      case 'threats':
        return <ThreatShieldView />;
      case 'security':
        return <SecurityEventsView />;
      case 'travel':
        return <TravelAnalyticsView />;
      case 'audit':
        return <AuditLogsView />;
      default:
        return <DashboardView />;
    }
  };

  const titles: Record<NavTab, string> = {
    dashboard: 'Executive Financial & Cybersecurity Overview',
    users: 'Account Holder Registry & Wallet Permissions',
    wallets: 'Multi-Currency Reserves (AZN, EUR, USD)',
    transactions: 'Cryptographic Ledger & Transaction Audits',
    ledger: 'Double-Entry General Ledger & Trial Balance Verification',
    fraud: 'Cybersecurity Threat Detection & Alert Surveillance',
    rules: 'Automated Fraud Rules & Action Modifiers',
    threats: 'Threat Shield & Perimeter Defense (WAF / DDoS)',
    security: 'Platform Security Events & Registered Devices',
    travel: 'Smart Tourism Analytics & Category Spending',
    audit: 'Immutable Audit Trail & Regulatory Compliance',
  };

  return (
    <div className="flex h-screen bg-[#050b14] text-slate-200 overflow-hidden">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={titles[currentTab]}
          adminName={currentUser.name}
          onToggleMenu={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default App;
