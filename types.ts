
export type UserRole = 'admin' | 'customer';

export interface Package {
  id: string;
  name: string;
  speed: number; // in Mbps
  price: number;
  validityDays: number;
  dataLimitGb: number; // 0 for unlimited
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  packageId: string;
  status: 'active' | 'expired' | 'suspended';
  expiryDate: string;
  balance: number;
  dataUsedGb: number;
  dataLimitGb: number;
  upstreamProvider?: string; // e.g., "Amber IT", "Link3", "Carnival"
}

export interface BillingRecord {
  id: string;
  userId: string;
  amount: number;
  date: string;
  billingMonth: string; // Format: "January 2024"
  status: 'paid' | 'pending';
  method: 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'None';
  description?: string; // For miscellaneous charges like "Router purchase", "Connection fee"
  type?: 'package' | 'miscellaneous';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
