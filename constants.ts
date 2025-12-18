import { BankAccount, Category, Transaction, TransactionType } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: '飲食', type: TransactionType.EXPENSE },
  { id: '2', name: '交通', type: TransactionType.EXPENSE },
  { id: '3', name: '居住', type: TransactionType.EXPENSE },
  { id: '4', name: '娛樂', type: TransactionType.EXPENSE },
  { id: '5', name: '薪資', type: TransactionType.INCOME },
  { id: '6', name: '投資回報', type: TransactionType.INCOME },
  { id: '7', name: '其他', type: TransactionType.EXPENSE },
];

export const MOCK_ACCOUNTS: BankAccount[] = [
  { id: 'mock-1', name: '預設現金帳戶', balance: 50000, type: 'Cash', currency: 'TWD' },
  { id: 'mock-2', name: '薪資轉帳戶', balance: 120000, type: 'Checking', currency: 'TWD' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', accountId: 'mock-1', amount: 150, type: 'expense', category: '飲食', date: new Date().toISOString(), description: '午餐' },
  { id: 't2', accountId: 'mock-2', amount: 50000, type: 'income', category: '薪資', date: new Date().toISOString(), description: '十月薪資' },
  { id: 't3', accountId: 'mock-1', amount: 1200, type: 'expense', category: '交通', date: new Date().toISOString(), description: '高鐵票' },
];
