import React, { useState, useEffect, useMemo } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Wallet, TrendingUp, TrendingDown, LogOut, Plus, Trash2, Edit2, BrainCircuit, CreditCard, DollarSign, Loader2, PlayCircle, Lock 
} from 'lucide-react';

import { auth, db, isFirebaseInitialized } from './services/firebase';
import { getFinancialAdvice } from './services/geminiService';
import { BankAccount, Transaction, Category, TransactionType } from './types';
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS, DEFAULT_CATEGORIES } from './constants';

// --- Utility Components ---
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-200 text-slate-800 hover:bg-slate-300",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
    {...props} 
  />
);

// --- Main App ---

export default function App() {
  // Global App Mode
  const [appMode, setAppMode] = useState<'demo' | 'production'>(isFirebaseInitialized ? 'production' : 'demo');

  // Auth State
  const [user, setUser] = useState<User | null>(null); // For Demo mode, we simulate a User object
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // App Data State
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories] = useState<Category[]>(DEFAULT_CATEGORIES); 
  
  // UI State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions'>('dashboard');
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Form States - Account
  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('');

  // Form States - Transaction
  const [transAmount, setTransAmount] = useState('');
  const [transDesc, setTransDesc] = useState('');
  const [transType, setTransType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [transCategory, setTransCategory] = useState(DEFAULT_CATEGORIES[0].name);
  const [transAccountId, setTransAccountId] = useState('');

  // --- Initialization & Auth Effects ---

  useEffect(() => {
    // If not initialized, force demo
    if (!isFirebaseInitialized) {
      setAppMode('demo');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    if (appMode === 'demo') {
      // Clean up previous user state if switching to demo but not "logged in" explicitly yet
      // Actually, for demo, we might auto-login or wait for user to click "Enter Demo"
      // Let's require a "Login" even for demo to mimic the flow, or just auto-set mock user if they choose demo.
      // Current design: User selects mode at login screen.
      setUser(null);
      setIsLoading(false);
    } else {
      // Production Mode
      if (!auth) {
         setIsLoading(false);
         return; 
      }
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [appMode]);

  // --- Data Fetching Effects ---

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setTransactions([]);
      return;
    }

    if (appMode === 'demo') {
      // Load Mock Data
      setAccounts(MOCK_ACCOUNTS);
      setTransactions(MOCK_TRANSACTIONS);
      return;
    }

    // Production Data Fetching
    if (!db) return;

    const qAccounts = query(collection(db, 'accounts'), where('uid', '==', user.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    });

    const qTransactions = query(collection(db, 'transactions'), where('uid', '==', user.uid));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const transList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      transList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(transList);
    });

    return () => {
      unsubAccounts();
      unsubTransactions();
    };
  }, [user, appMode]);

  // --- Logic Helpers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (appMode === 'demo') {
      // Demo Login: Accept anything
      setUser({ uid: 'demo-user', email: email || 'demo@example.com' } as User);
      return;
    }

    if (!auth) {
      setAuthError("Firebase 未初始化，請檢查設定或切換至展示模式。");
      return;
    }

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message || "登入失敗");
    }
  };

  const handleLogout = async () => {
    if (appMode === 'demo') {
      setUser(null);
      setAiAdvice('');
    } else {
      if (auth) await signOut(auth);
    }
  };

  // --- Account Management ---

  const openAddAccount = () => {
    setEditingAccount(null);
    setAccountName('');
    setAccountBalance('');
    setShowAccountModal(true);
  };

  const openEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountName(acc.name);
    setAccountBalance(acc.balance.toString());
    setShowAccountModal(true);
  };

  const saveAccount = async () => {
    if (!accountName || !accountBalance) return;
    const balanceNum = parseFloat(accountBalance);

    if (editingAccount) {
      // Update
      if (appMode === 'demo') {
        setAccounts(accounts.map(a => a.id === editingAccount.id ? { ...a, name: accountName, balance: balanceNum } : a));
      } else if (db && user) {
        await updateDoc(doc(db, 'accounts', editingAccount.id), { name: accountName, balance: balanceNum });
      }
    } else {
      // Create
      const newAcc = {
        name: accountName,
        balance: balanceNum,
        type: 'Checking' as const, // default
        currency: 'TWD',
        uid: user?.uid
      };
      if (appMode === 'demo') {
        setAccounts([...accounts, { ...newAcc, id: Date.now().toString() } as BankAccount]);
      } else if (db && user) {
        await addDoc(collection(db, 'accounts'), newAcc);
      }
    }
    setShowAccountModal(false);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm("確定要刪除此帳戶嗎？這將無法復原。")) return;
    if (appMode === 'demo') {
      setAccounts(accounts.filter(a => a.id !== id));
    } else if (db) {
      await deleteDoc(doc(db, 'accounts', id));
    }
  };

  // --- Transaction Management ---

  const saveTransaction = async () => {
    if (!transAmount || !transDesc || !transAccountId) {
      alert("請填寫完整資訊");
      return;
    }

    const amount = parseFloat(transAmount);
    const account = accounts.find(a => a.id === transAccountId);
    if (!account) return;

    // Calculate new balance
    let newBalance = account.balance;
    if (transType === TransactionType.INCOME) newBalance += amount;
    else newBalance -= amount;

    const newTx = {
      accountId: transAccountId,
      amount,
      type: transType,
      category: transCategory,
      date: new Date().toISOString(),
      description: transDesc,
      uid: user?.uid
    };

    if (appMode === 'demo') {
      setTransactions([{ ...newTx, id: Date.now().toString() } as Transaction, ...transactions]);
      setAccounts(accounts.map(a => a.id === transAccountId ? { ...a, balance: newBalance } : a));
    } else if (db && user) {
      await addDoc(collection(db, 'transactions'), newTx);
      await updateDoc(doc(db, 'accounts', transAccountId), { balance: newBalance });
    }

    setShowTransactionModal(false);
    setTransAmount('');
    setTransDesc('');
  };

  const handleGetAiAdvice = async () => {
    setIsAiLoading(true);
    const advice = await getFinancialAdvice(transactions, accounts);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  // --- Statistics Logic ---
  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);
  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0), [transactions]);
  
  const pieData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // --- Render ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md relative overflow-hidden">
          {/* Mode Toggle UI */}
          <div className="flex w-full mb-6 bg-slate-100 p-1 rounded-lg">
            <button 
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${appMode === 'demo' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setAppMode('demo')}
            >
              <PlayCircle className="w-4 h-4" /> 展示模式 (Demo)
            </button>
            <button 
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${appMode === 'production' ? 'bg-white shadow text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setAppMode('production')}
            >
              <Lock className="w-4 h-4" /> 正式模式 (Prod)
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">SmartFinance AI</h1>
            <p className="text-slate-500">
              {appMode === 'demo' ? '體驗版 - 資料僅存於本機' : '正式版 - 資料同步至雲端'}
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">電子郵件</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder={appMode === 'demo' ? "demo@test.com" : "user@example.com"} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            
            {authError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{authError}</p>}
            
            <Button type="submit" className={`w-full ${appMode === 'demo' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}>
              {appMode === 'demo' ? '進入展示模式' : (authMode === 'login' ? '登入' : '註冊')}
            </Button>
          </form>

          {appMode === 'production' && (
            <div className="mt-4 text-center text-sm">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-blue-600 hover:underline"
              >
                {authMode === 'login' ? '沒有帳號？立即註冊' : '已有帳號？登入'}
              </button>
            </div>
          )}
        </Card>
        
        {appMode === 'production' && !isFirebaseInitialized && (
          <p className="mt-4 text-amber-600 text-sm max-w-md text-center">
            注意：偵測到 Firebase 尚未設定。請更新程式碼中的設定或切換至展示模式。
          </p>
        )}
      </div>
    );
  }

  // MAIN APP INTERFACE
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64 transition-colors">
      
      {/* Sidebar */}
      <nav className="fixed bottom-0 md:top-0 md:left-0 w-full md:w-64 h-16 md:h-screen bg-white border-t md:border-t-0 md:border-r border-slate-200 z-40 flex md:flex-col justify-around md:justify-start md:p-4">
        <div className="hidden md:flex items-center gap-2 mb-8 px-2">
          <Wallet className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold text-slate-800">SmartFinance</span>
        </div>
        
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 md:p-3 rounded-lg flex flex-col md:flex-row items-center gap-2 ${activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
          <TrendingUp className="w-6 h-6" />
          <span className="text-xs md:text-sm font-medium">總覽</span>
        </button>
        
        <button onClick={() => setActiveTab('accounts')} className={`p-2 md:p-3 rounded-lg flex flex-col md:flex-row items-center gap-2 ${activeTab === 'accounts' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
          <CreditCard className="w-6 h-6" />
          <span className="text-xs md:text-sm font-medium">帳戶</span>
        </button>
        
        <button onClick={() => setActiveTab('transactions')} className={`p-2 md:p-3 rounded-lg flex flex-col md:flex-row items-center gap-2 ${activeTab === 'transactions' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
          <DollarSign className="w-6 h-6" />
          <span className="text-xs md:text-sm font-medium">收支</span>
        </button>

        <div className="hidden md:block mt-auto">
          <div className="mb-4 px-2 p-3 rounded bg-slate-50">
            <p className="text-xs text-slate-400 mb-1">{appMode === 'demo' ? '展示模式' : '正式模式'}</p>
            <p className="text-sm font-medium truncate text-slate-700">{user.email}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout} className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700">
            <LogOut className="w-4 h-4" /> 登出
          </Button>
        </div>
        <button onClick={handleLogout} className="md:hidden p-2 text-slate-500">
          <LogOut className="w-6 h-6" />
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {activeTab === 'dashboard' && '財務儀表板'}
            {activeTab === 'accounts' && '銀行帳戶管理'}
            {activeTab === 'transactions' && '收支紀錄明細'}
          </h2>
          {appMode === 'demo' && <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold">DEMO MODE</span>}
        </div>

        {/* --- Dashboard Tab --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none">
                <p className="text-blue-100 mb-1">總資產</p>
                <h3 className="text-3xl font-bold">${totalBalance.toLocaleString()}</h3>
              </Card>
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-full text-green-600"><TrendingUp /></div>
                  <div>
                    <p className="text-slate-500 text-sm">本月收入</p>
                    <h3 className="text-xl font-bold text-slate-800">+${totalIncome.toLocaleString()}</h3>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 rounded-full text-red-600"><TrendingDown /></div>
                  <div>
                    <p className="text-slate-500 text-sm">本月支出</p>
                    <h3 className="text-xl font-bold text-slate-800">-${totalExpense.toLocaleString()}</h3>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="border-blue-200 bg-blue-50/50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-lg text-white shrink-0">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 mb-2">AI 財務顧問</h3>
                  {aiAdvice ? (
                    <div className="prose prose-sm text-slate-700 whitespace-pre-line mb-4 bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                      {aiAdvice}
                    </div>
                  ) : (
                    <p className="text-slate-600 mb-4">點擊分析，讓 AI 根據您目前的帳戶與交易紀錄提供理財建議。</p>
                  )}
                  <Button onClick={handleGetAiAdvice} disabled={isAiLoading}>
                    {isAiLoading ? <><Loader2 className="animate-spin w-4 h-4"/> 分析中...</> : '生成財務分析報告'}
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="font-bold text-slate-700 mb-4">支出分類統計</h3>
                <div className="h-64">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => `$${value}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">尚無支出資料</div>
                  )}
                </div>
              </Card>
              <Card>
                <h3 className="font-bold text-slate-700 mb-4">近期交易</h3>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                      <div>
                        <p className="font-medium text-slate-800">{t.description}</p>
                        <p className="text-xs text-slate-500">{t.date.split('T')[0]} · {t.category}</p>
                      </div>
                      <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}${t.amount}
                      </span>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-slate-400 text-center">無交易紀錄</p>}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* --- Accounts Tab --- */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={openAddAccount}><Plus className="w-4 h-4" /> 新增帳戶</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(acc => (
                <Card key={acc.id} className="relative group hover:shadow-md transition-shadow">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditAccount(acc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <h3 className="font-bold text-slate-700 mb-1">{acc.name}</h3>
                  <p className="text-xs text-slate-400 uppercase mb-4">{acc.type}</p>
                  <p className="text-2xl font-bold text-slate-800">${acc.balance.toLocaleString()}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --- Transactions Tab --- */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
             <div className="flex justify-end">
              <Button onClick={() => setShowTransactionModal(true)}><Plus className="w-4 h-4" /> 新增紀錄</Button>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="p-4 text-sm font-semibold text-slate-600">日期</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">說明</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">分類</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">帳戶</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 text-right">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => {
                      const accName = accounts.find(a => a.id === t.accountId)?.name || '未知帳戶';
                      return (
                        <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                          <td className="p-4 text-sm text-slate-600">{t.date.split('T')[0]}</td>
                          <td className="p-4 text-sm font-medium text-slate-800">{t.description}</td>
                          <td className="p-4 text-sm"><span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{t.category}</span></td>
                          <td className="p-4 text-sm text-slate-500">{accName}</td>
                          <td className={`p-4 text-sm font-bold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                             {t.type === 'income' ? '+' : '-'}${t.amount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {transactions.length === 0 && <div className="p-8 text-center text-slate-400">尚無交易紀錄</div>}
            </Card>
          </div>
        )}

        {/* --- Modals --- */}
        
        {/* Account Modal (Create/Edit) */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-sm">
              <h3 className="font-bold text-lg mb-4">{editingAccount ? '編輯銀行帳戶' : '新增銀行帳戶'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-slate-600">帳戶名稱</label>
                  <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="例如：玉山銀行" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-600">目前餘額</label>
                  <Input type="number" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} placeholder="0" />
                </div>
                <div className="flex gap-2 mt-6">
                  <Button variant="secondary" onClick={() => setShowAccountModal(false)} className="flex-1">取消</Button>
                  <Button onClick={saveAccount} className="flex-1">儲存</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-sm">
              <h3 className="font-bold text-lg mb-4">新增收支紀錄</h3>
              <div className="space-y-4">
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                  <button 
                    className={`flex-1 py-1 rounded text-sm font-medium transition-colors ${transType === TransactionType.EXPENSE ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
                    onClick={() => setTransType(TransactionType.EXPENSE)}
                  >
                    支出
                  </button>
                  <button 
                    className={`flex-1 py-1 rounded text-sm font-medium transition-colors ${transType === TransactionType.INCOME ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}
                    onClick={() => setTransType(TransactionType.INCOME)}
                  >
                    收入
                  </button>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-600">金額</label>
                  <Input type="number" value={transAmount} onChange={e => setTransAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-600">說明</label>
                  <Input value={transDesc} onChange={e => setTransDesc(e.target.value)} placeholder="例如：晚餐" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-600">分類</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    value={transCategory}
                    onChange={e => setTransCategory(e.target.value)}
                  >
                    {categories.filter(c => c.type === transType).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-600">帳戶</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    value={transAccountId}
                    onChange={e => setTransAccountId(e.target.value)}
                  >
                    <option value="">請選擇帳戶</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} (${a.balance})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button variant="secondary" onClick={() => setShowTransactionModal(false)} className="flex-1">取消</Button>
                  <Button onClick={saveTransaction} className="flex-1">儲存</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}