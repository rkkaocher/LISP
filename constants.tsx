
import { Package, User, BillingRecord } from './types';

export const PACKAGES: Package[] = [
  { id: 'p1', name: 'Starter - 10 Mbps', speed: 10, price: 500, validityDays: 30, dataLimitGb: 100 },
  { id: 'p2', name: 'Starter Plus - 10 Mbps', speed: 10, price: 550, validityDays: 30, dataLimitGb: 0 },
  { id: 'p3', name: 'Basic - 15 Mbps', speed: 15, price: 600, validityDays: 30, dataLimitGb: 0 },
  { id: 'p4', name: 'Basic Plus - 20 Mbps', speed: 20, price: 650, validityDays: 30, dataLimitGb: 0 },
  { id: 'p5', name: 'Standard - 25 Mbps', speed: 25, price: 750, validityDays: 30, dataLimitGb: 0 },
  { id: 'p6', name: 'Standard Plus - 30 Mbps', speed: 30, price: 800, validityDays: 30, dataLimitGb: 0 },
  { id: 'p7', name: 'Elite - 35 Mbps', speed: 35, price: 900, validityDays: 30, dataLimitGb: 0 },
  { id: 'p8', name: 'Elite Plus - 40 Mbps', speed: 40, price: 1000, validityDays: 30, dataLimitGb: 0 },
  { id: 'p9', name: 'Platinum - 45 Mbps', speed: 45, price: 1050, validityDays: 30, dataLimitGb: 0 },
  { id: 'p10', name: 'Diamond - 50 Mbps', speed: 50, price: 1200, validityDays: 30, dataLimitGb: 0 },
  { id: 'p11', name: 'Diamond Plus - 60 Mbps', speed: 60, price: 1500, validityDays: 30, dataLimitGb: 0 },
  { id: 'p12', name: 'Premium - 80 Mbps', speed: 80, price: 1800, validityDays: 30, dataLimitGb: 0 },
  { id: 'p13', name: 'Premium Plus - 100 Mbps', speed: 100, price: 2000, validityDays: 30, dataLimitGb: 0 },
  { id: 'p14', name: 'CATV - 300 Taka', speed: 0, price: 300, validityDays: 30, dataLimitGb: 0 },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    username: 'admin', 
    password: 'password123', 
    fullName: 'System Administrator',
    email: 'admin@nexusconnect.net',
    phone: '+8801700000000',
    address: 'Main Office',
    role: 'admin',
    packageId: 'p13',
    status: 'active',
    expiryDate: '2099-12-31',
    balance: 0,
    dataUsedGb: 0,
    dataLimitGb: 0,
  },
  {
    id: 'u2',
    username: 'demo_user',
    password: 'password123',
    fullName: 'Test Customer',
    email: 'test@example.com',
    phone: '+8801800000000',
    address: 'Dhaka, Bangladesh',
    role: 'customer',
    packageId: 'p4',
    status: 'active',
    expiryDate: '2025-12-31',
    balance: 650,
    dataUsedGb: 45.4,
    dataLimitGb: 0,
    upstreamProvider: 'Amber IT'
  }
];

export const MOCK_BILLING: BillingRecord[] = [
  { id: 'b1', userId: 'u2', amount: 650, date: '2024-07-25', billingMonth: 'July 2024', status: 'paid', method: 'bKash' },
  { id: 'b2', userId: 'u2', amount: 650, date: '', billingMonth: 'August 2024', status: 'pending', method: 'None' },
];
