
import { Package, User, BillingRecord, Ticket } from './types';

export const ZONES = ['College Para', 'Dhap', 'RK Road', 'Sathmatha', 'Jahaj Company'];

export const PACKAGES: Package[] = [
  { id: 'p1', name: 'Starter - 10 Mbps', speed: 10, price: 500, validityDays: 30, dataLimitGb: 0 },
  { id: 'p2', name: 'Basic - 20 Mbps', speed: 20, price: 700, validityDays: 30, dataLimitGb: 0 },
  { id: 'p3', name: 'Standard - 30 Mbps', speed: 30, price: 1000, validityDays: 30, dataLimitGb: 0 },
  { id: 'p4', name: 'Elite - 50 Mbps', speed: 50, price: 1500, validityDays: 30, dataLimitGb: 0 },
];

export const MOCK_TICKETS: Ticket[] = [
  { 
    id: 't1', 
    userId: 'u2', 
    userName: 'Test Customer', 
    category: 'No Internet', 
    description: 'RED light on ONU', 
    status: 'open', 
    priority: 'high', 
    createdAt: '2024-07-28T10:00:00Z',
    zone: 'College Para'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    username: 'admin',
    fullName: 'System Administrator',
    email: 'admin@nexusconnect.net',
    phone: '+8801700000000',
    address: 'Main Office',
    role: 'admin',
    packageId: 'p4',
    status: 'active',
    expiryDate: '2099-12-31',
    balance: 0,
    dataUsedGb: 0,
    dataLimitGb: 0,
  }
];
