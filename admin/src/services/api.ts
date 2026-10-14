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

  public static getUsers(search = '', role = '', status = '', page = 1) {
    const params = new URLSearchParams({ search, role, status, page: String(page) });
    return this.request(`/admin/users?${params}`);
  }

  public static updateUserStatus(userId: number, status: 'active' | 'suspended' | 'frozen') {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  public static getWallets(status = '', page = 1) {
    const params = new URLSearchParams({ status, page: String(page) });
    return this.request(`/admin/wallets?${params}`);
  }

  public static getTransactions(type = '', status = '', currency = '', page = 1) {
    const params = new URLSearchParams({ type, status, currency, page: String(page) });
    return this.request(`/admin/transactions?${params}`);
  }

  public static getFraudAlerts(status = '', severity = '', page = 1) {
    const params = new URLSearchParams({ status, severity, page: String(page) });
    return this.request(`/admin/fraud-alerts?${params}`);
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

  public static updateFraudRule(ruleId: number, data: any) {
    return this.request(`/admin/fraud-rules/${ruleId}`, {
      method: 'PUT',
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

  public static getAuditLogs(action = '', page = 1) {
    const params = new URLSearchParams({ action, page: String(page) });
    return this.request(`/admin/audit-logs?${params}`);
  }
}
