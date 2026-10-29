export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  manager_name?: string | null;
  status: 'active' | 'inactive';
  users_count?: number;
  user_groups_count?: number;
  created_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  created_at?: string;
}

export interface UserGroup {
  id: number;
  department_id?: number | null;
  department?: { id: number; name: string; code: string } | null;
  name: string;
  slug: string;
  description?: string | null;
  is_system: boolean;
  permissions?: Permission[];
  users_count?: number;
  created_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'user' | 'admin';
  department_id?: number | null;
  department?: { id: number; name: string; code: string } | null;
  user_group_id?: number | null;
  user_group?: { id: number; name: string; slug: string } | null;
  permissions?: string[];
  is_system_admin?: boolean;
  can_manage_permissions?: boolean;
  can_access_admin?: boolean;
  status: 'active' | 'suspended' | 'frozen';
  two_factor_enabled: boolean;
  last_login_at?: string | null;
  created_at?: string;
  wallet?: Wallet;
  devices?: UserDevice[];
}

export interface WalletBalance {
  id: number;
  currency_code: 'AZN' | 'EUR' | 'USD';
  balance: number | string;
  locked_balance: number | string;
  available_balance: number | string;
}

export interface Wallet {
  id: number;
  wallet_number: string;
  status: 'active' | 'frozen' | 'closed';
  balances?: WalletBalance[];
  created_at?: string;
}

export interface UserDevice {
  id: number;
  device_uuid: string;
  device_name: string;
  device_type: string;
  os: string;
  ip_address: string;
  last_active_at: string;
  is_trusted: boolean;
}

export interface Transaction {
  id: number;
  reference_number: string;
  type: string;
  status: string;
  amount: number | string;
  fee: number | string;
  currency_code: string;
  description?: string;
  risk_score: number;
  created_at: string;
  user?: { id: number; name: string; email: string };
  recipient_user?: { id: number; name: string; email: string };
}

export interface FraudRule {
  id: number;
  rule_name: string;
  rule_code: string;
  description: string;
  rule_type: string;
  condition_operator: string;
  threshold_value: string;
  risk_weight: number;
  is_active: boolean;
  action: 'flag' | 'step_up_2fa' | 'hold' | 'block';
}

export interface FraudAlert {
  id: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  risk_score: number;
  title: string;
  description?: string;
  details?: Record<string, any>;
  created_at: string;
  user?: { id: number; name: string; email: string };
}

export interface SecurityEvent {
  id: number;
  event_type: string;
  severity: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: { id: number; name: string; email: string };
}

export interface AuditLog {
  id: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  created_at: string;
  user?: { id: number; name: string; email: string };
}
