export interface UserProfile {
  uid: string;
  email: string | null;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  type: 'Checking' | 'Savings' | 'Credit' | 'Cash' | 'Investment';
  currency: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string; // ISO string
  description: string;
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
}