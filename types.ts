
export type UserRole = 'admin' | 'customer';
export type ClientStatus = 'active' | 'expired' | 'suspended' | 'left' | 'free';
export type TicketStatus = 'open' | 'in-progress' | 'resolved';

export interface Package {
  id: string;
  name: string;
  speed: number; 
  price: number;
  validityDays: number;
  dataLimitGb: number; 
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  packageId: string;
  status: ClientStatus;
  expiryDate: string;
  deadlineDate?: string;
  balance: number;
  dataUsedGb: number;
  dataLimitGb: number;
  zone?: string;
  clientType?: 'Personal' | 'Business' | 'Free';
  upstreamProvider?: string;
  lastLogin?: string;
}

export interface BillingRecord {
  id: string;
  userId: string;
  amount: number;
  date: string;
  billingMonth: string;
  status: 'paid' | 'pending' | 'partial';
  method: 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'None';
  description?: string;
  deadline?: string;
  invoiceId?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  category: string;
  description: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  solvedAt?: string;
  zone?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
