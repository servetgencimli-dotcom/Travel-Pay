const API_BASE = '/api/v1';

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem('travelpay_admin_token') || localStorage.getItem('travelpay_token');
  }

  public static setToken(token: string): void {
    localStorage.setItem('travelpay_admin_token', token);
    localStorage.setItem('travelpay_token', token);
  }

  public static clearToken(): void {
    localStorage.removeItem('travelpay_admin_token');
    localStorage.removeItem('travelpay_token');
  }

  public static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Session expired or unauthorized.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // Auth
  public static login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  public static getMe() {
    return this.request('/auth/me');
  }

  public static logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Admin APIs
  public static getDashboard() {
    return this.request('/admin/dashboard');
  }

  public static getUsers(search = '', role = '', status = '', page = 1, departmentId = '', userGroupId = '') {
    const params = new URLSearchParams({
      search,
      role,
      status,
      page: String(page),
      department_id: departmentId ? String(departmentId) : '',
      user_group_id: userGroupId ? String(userGroupId) : '',
    });
    return this.request(`/admin/users?${params}`);
  }

  public static createUser(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'user' | 'admin';
    department_id?: number | null;
    user_group_id?: number | null;
    initial_azn?: number;
    initial_eur?: number;
    initial_usd?: number;
  }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static updateUserStatus(userId: number, status: 'active' | 'suspended' | 'frozen') {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Departments
  public static getDepartments() {
    return this.request('/admin/departments');
  }

  public static createDepartment(data: {
    name: string;
    code: string;
    description?: string;
    manager_name?: string;
    status?: 'active' | 'inactive';
  }) {
    return this.request('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static updateDepartment(id: number, data: any) {
    return this.request(`/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public static deleteDepartment(id: number) {
    return this.request(`/admin/departments/${id}`, {
      method: 'DELETE',
    });
  }

  // User Groups & Roles
  public static getUserGroups() {
    return this.request('/admin/user-groups');
  }

  public static createUserGroup(data: {
    name: string;
    department_id?: number | null;
    description?: string;
    permission_ids?: number[];
  }) {
    return this.request('/admin/user-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static updateUserGroup(id: number, data: any) {
    return this.request(`/admin/user-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public static deleteUserGroup(id: number) {
    return this.request(`/admin/user-groups/${id}`, {
      method: 'DELETE',
    });
  }

  // Permissions (Special permission: manage_permissions)
  public static getPermissions() {
    return this.request('/admin/permissions');
  }

  public static updateGroupPermissions(groupId: number, permissionIds: number[]) {
    return this.request(`/admin/user-groups/${groupId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: permissionIds }),
    });
  }

  // Wallets
  public static getWallets(status = '', page = 1) {
    const params = new URLSearchParams({ status, page: String(page) });
    return this.request(`/admin/wallets?${params}`);
  }

  public static creditWallet(walletId: number, data: { currency_code: string; amount: number; reason: string }) {
    return this.request(`/admin/wallets/${walletId}/credit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static getTransactions(type = '', status = '', currency = '', page = 1) {
    const params = new URLSearchParams({ type, status, currency, page: String(page) });
    return this.request(`/admin/transactions?${params}`);
  }

  public static getFraudAlerts(status = '', severity = '', page = 1) {
    const params = new URLSearchParams({ status, severity, page: String(page) });
    return this.request(`/admin/fraud-alerts?${params}`);
  }

  public static createFraudAlert(data: {
    user_id: number;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    risk_score: number;
    details?: any;
  }) {
    return this.request('/admin/fraud-alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static updateFraudAlertStatus(alertId: number, status: string) {
    return this.request(`/admin/fraud-alerts/${alertId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  public static getFraudRules() {
    return this.request('/admin/fraud-rules');
  }

  public static createFraudRule(data: {
    rule_name: string;
    rule_code: string;
    description: string;
    rule_type: string;
    condition_operator: string;
    threshold_value: string;
    risk_weight: number;
    action: 'flag' | 'step_up_2fa' | 'hold' | 'block';
    is_active?: boolean;
  }) {
    return this.request('/admin/fraud-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static updateFraudRule(ruleId: number, data: any) {
    return this.request(`/admin/fraud-rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public static createLedgerEntry(data: {
    account_id: number;
    entry_type: 'debit' | 'credit';
    amount: number;
    currency_code: string;
    description: string;
    reference?: string;
  }) {
    return this.request('/admin/ledger/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static getSecurityEvents(eventType = '', severity = '', page = 1) {
    const params = new URLSearchParams({ event_type: eventType, severity, page: String(page) });
    return this.request(`/admin/security-events?${params}`);
  }

  public static getTravelAnalytics() {
    return this.request('/admin/travel-analytics');
  }

  public static approveTransaction(transactionId: number) {
    return this.request(`/admin/transactions/${transactionId}/approve`, {
      method: 'POST',
    });
  }

  public static rejectTransaction(transactionId: number) {
    return this.request(`/admin/transactions/${transactionId}/reject`, {
      method: 'POST',
    });
  }

  public static getLedger(limit = 40) {
    return this.request(`/admin/ledger?limit=${limit}`);
  }

  public static getThreats() {
    return this.request('/admin/threats');
  }

  public static blockIp(ip_address: string, reason: string, minutes?: number) {
    return this.request('/admin/blocked-ips', {
      method: 'POST',
      body: JSON.stringify({ ip_address, reason, minutes }),
    });
  }

  public static unblockIp(id: number) {
    return this.request(`/admin/blocked-ips/${id}`, {
      method: 'DELETE',
    });
  }

  public static simulateSandbox(scenario: string, count = 100) {
    return this.request('/admin/sandbox/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenario, count }),
    });
  }

  public static getAuditLogs(action = '', page = 1) {
    const params = new URLSearchParams({ action, page: String(page) });
    return this.request(`/admin/audit-logs?${params}`);
  }
}
