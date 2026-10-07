import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Area,
  AreaChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type User = { id: string; email: string; name: string; createdAt?: string }
type Category = { id: string; name: string; type: 'INCOME' | 'EXPENSE' }
type Transaction = {
  id: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  description: string
  date: string
  category?: Category | null
}
type Budget = { id: string; amount: number; month: number; year: number; categoryId?: string | null; category?: Category | null }
type Page = 'Dashboard' | 'Transazioni' | 'Categorie' | 'Budget' | 'Ricorrenti' | 'Analytics' | 'Impostazioni'
type Recurring = { id: string; amount: number; type: 'INCOME' | 'EXPENSE'; description: string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'; nextExecution: string; category?: Category | null }

const API = '/api'
const chartColors = ['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']

async function api<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('expense-token')
  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Impossibile raggiungere il server. Verifica che il backend sia avviato.')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error?.message ?? 'Operazione non riuscita')
  return body as T
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('expense-token'))
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('Dashboard')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(localStorage.getItem('expense-theme') !== 'light')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [auth, setAuth] = useState({ email: '', password: '', name: '' })
  const [transactionForm, setTransactionForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE',
    date: new Date().toISOString().slice(0, 10),
    categoryId: '',
  })
  const [budgetForm, setBudgetForm] = useState({
    amount: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    categoryId: '',
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('expense-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    document.documentElement.classList.toggle('compact-mode', localStorage.getItem('expense-compact') === 'true')
    document.documentElement.classList.toggle('reduced-motion', localStorage.getItem('expense-motion') === 'reduced')
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [me, tx, cats, budgetData, recurringData] = await Promise.all([
        api<{ user: User }>('/auth/me'),
        api<{ transactions: Transaction[] }>('/transactions'),
        api<{ categories: Category[] }>('/categories'),
        api<{ budgets: Budget[] }>('/budgets'),
        api<{ recurringTransactions: Recurring[] }>('/recurring-transactions'),
      ])
      setUser(me.user)
      setTransactions(tx.transactions)
      setCategories(cats.categories)
      setBudgets(budgetData.budgets)
      setRecurring(recurringData.recurringTransactions)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Errore di caricamento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  const totals = useMemo(
    () =>
      transactions.reduce(
        (acc, item) => {
          acc[item.type === 'INCOME' ? 'income' : 'expenses'] += Number(item.amount)
          return acc
        },
        { income: 0, expenses: 0 },
      ),
    [transactions],
  )
  const currentMonthExpenses = transactions
    .filter((item) => item.type === 'EXPENSE' && new Date(item.date).getMonth() === new Date().getMonth())
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const categoryChart = useMemo(
    () =>
      categories
        .map((category) => ({
          name: category.name,
          value: transactions
            .filter((item) => item.category?.id === category.id && item.type === 'EXPENSE')
            .reduce((sum, item) => sum + Number(item.amount), 0),
        }))
        .filter((item) => item.value > 0),
    [categories, transactions],
  )
  const monthlyChart = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const month = date.getMonth()
      const year = date.getFullYear()
      const monthRows = transactions.filter((item) => {
        const itemDate = new Date(item.date)
        return itemDate.getMonth() === month && itemDate.getFullYear() === year
      })
      return {
        name: date.toLocaleDateString('it-IT', { month: 'short' }),
        Entrate: monthRows.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + Number(item.amount), 0),
        Uscite: monthRows.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + Number(item.amount), 0),
      }
    })
  }, [transactions])

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const result = await api<{ token: string; user: User }>(`/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(auth),
      })
      localStorage.setItem('expense-token', result.token)
      setToken(result.token)
      setUser(result.user)
      setToast({ message: authMode === 'login' ? 'Accesso completato.' : 'Account creato con successo.', type: 'success' })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Autenticazione fallita'
      setError(message)
      setToast({ message, type: 'error' })
    }
  }

  const addTransaction = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...transactionForm,
          amount: Number(transactionForm.amount),
          categoryId: transactionForm.categoryId || null,
        }),
      })
      setTransactionForm({ ...transactionForm, description: '', amount: '' })
      await load()
      setToast({ message: 'Transazione aggiunta.', type: 'success' })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Impossibile salvare la transazione'
      setError(message)
      setToast({ message, type: 'error' })
    }
  }

  const addBudget = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api('/budgets', {
        method: 'POST',
        body: JSON.stringify({
          ...budgetForm,
          amount: Number(budgetForm.amount),
          month: Number(budgetForm.month),
          year: Number(budgetForm.year),
          categoryId: budgetForm.categoryId || null,
        }),
      })
      setBudgetForm({ ...budgetForm, amount: '' })
      await load()
      setToast({ message: 'Budget creato.', type: 'success' })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Impossibile salvare il budget'
      setError(message)
      setToast({ message, type: 'error' })
    }
  }

  const deleteTransaction = async (id: string) => {
    if (!window.confirm('Eliminare questa transazione?')) return
    await api(`/transactions/${id}`, { method: 'DELETE' })
    await load()
    setToast({ message: 'Transazione eliminata.', type: 'success' })
  }

  const updateTransaction = async (id: string, data: object) => {
    await api(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    await load()
    setToast({ message: 'Transazione aggiornata.', type: 'success' })
  }

  const addCategory = async (data: { name: string; type: Category['type'] }) => {
    await api('/categories', { method: 'POST', body: JSON.stringify(data) })
    await load()
    setToast({ message: 'Categoria creata.', type: 'success' })
  }

  const deleteCategory = async (id: string) => {
    if (!window.confirm('Eliminare questa categoria?')) return
    try {
      await api(`/categories/${id}`, { method: 'DELETE' })
      await load()
      setToast({ message: 'Categoria eliminata. Le transazioni collegate sono rimaste senza categoria.', type: 'success' })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Impossibile eliminare la categoria'
      setError(message)
      setToast({ message, type: 'error' })
    }
  }

  const updateCategory = async (id: string, data: object) => {
    await api(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    await load()
    setToast({ message: 'Categoria aggiornata.', type: 'success' })
  }

  const deleteBudget = async (id: string) => {
    if (!window.confirm('Eliminare questo budget?')) return
    await api(`/budgets/${id}`, { method: 'DELETE' })
    await load()
    setToast({ message: 'Budget eliminato.', type: 'success' })
  }

  const addRecurring = async (data: object) => {
    await api('/recurring-transactions', { method: 'POST', body: JSON.stringify(data) })
    await load()
    setToast({ message: 'Ricorrenza creata.', type: 'success' })
  }

  const deleteRecurring = async (id: string) => {
    if (!window.confirm('Eliminare questa spesa ricorrente?')) return
    await api(`/recurring-transactions/${id}`, { method: 'DELETE' })
    await load()
    setToast({ message: 'Ricorrenza eliminata.', type: 'success' })
  }

  const exportCsv = async () => {
    const response = await fetch(`${API}/transactions/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'transactions.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importCsv = async (file: File) => {
    const response = await fetch(`${API}/transactions/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/csv' },
      body: await file.text(),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error?.message ?? 'Importazione non riuscita')
    await load()
    setToast({ message: `${result.imported} transazioni importate${result.rejected ? `, ${result.rejected} righe rifiutate` : ''}.`, type: result.rejected ? 'error' : 'success' })
  }

  const logout = () => {
    localStorage.removeItem('expense-token')
    setToken(null)
    setUser(null)
  }

  if (!token) {
    return (
      <main className={`relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6 ${darkMode ? 'auth-dark' : 'bg-slate-100'}`}>
        <span className="ambient-orb -left-20 top-10" />
        <span className="ambient-orb-two bottom-0 right-0" />
        <div className="auth-layout page-enter">
          <div className="auth-showcase">
            <div className="flex items-center gap-3">
              <div className="brand-mark">€</div>
              <div><p className="text-lg font-bold text-white">ExpenseTracker</p><p className="text-xs text-slate-400">Finance workspace</p></div>
            </div>
            <div className="auth-showcase-copy">
              <p className="section-label auth-label">Il tuo controllo finanziario</p>
              <h2>Più chiarezza.<br /><span>Ogni giorno.</span></h2>
              <p>Un unico spazio per tenere sotto controllo spese, budget e obiettivi senza complicazioni.</p>
            </div>
            <div className="auth-trust"><span className="trust-dot" /> I tuoi dati restano al sicuro e sempre sotto il tuo controllo.</div>
          </div>
          <form onSubmit={submitAuth} className="glass-panel auth-card auth-form">
            <div className="mb-8">
              <p className="auth-kicker">{authMode === 'login' ? 'ACCESSO ACCOUNT' : 'NUOVO ACCOUNT'}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight auth-title">{authMode === 'login' ? 'Bentornato' : 'Inizia oggi'}</h1>
              <p className="mt-2 text-sm text-slate-400">{authMode === 'login' ? 'Accedi per continuare nel tuo spazio.' : 'Crea il tuo spazio personale in pochi secondi.'}</p>
            </div>
            <div className="auth-fields">
              {authMode === 'register' && <label><span>Nome completo</span><input required placeholder="Come ti chiami?" className="input" value={auth.name} onChange={(event) => setAuth({ ...auth, name: event.target.value })} /></label>}
              <label><span>Email</span><input required type="email" placeholder="nome@azienda.it" className="input" value={auth.email} onChange={(event) => setAuth({ ...auth, email: event.target.value })} /></label>
              <label><span>Password</span><input required minLength={8} type="password" placeholder="Minimo 8 caratteri" className="input" value={auth.password} onChange={(event) => setAuth({ ...auth, password: event.target.value })} /></label>
            </div>
            {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
            <button className="shine-button auth-submit mt-6 w-full rounded-xl px-4 py-3 font-semibold text-white">{authMode === 'login' ? 'Accedi al workspace' : 'Crea il mio account'} <span>→</span></button>
            <button type="button" className="mt-5 w-full text-sm font-medium text-slate-400 hover:text-white" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError('') }}>{authMode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}</button>
          </form>
        </div>
      </main>
    )
  }

  const navItems: { label: Page; icon: string }[] = [
    { label: 'Dashboard', icon: '⌂' },
    { label: 'Transazioni', icon: '↕' },
    { label: 'Categorie', icon: '◈' },
    { label: 'Budget', icon: '◎' },
    { label: 'Ricorrenti', icon: '↻' },
    { label: 'Analytics', icon: '▥' },
    { label: 'Impostazioni', icon: '⚙' },
  ]

  return (
    <div className={`app-shell min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 ${page === 'Dashboard' ? 'dashboard-mode' : ''}`}>
      <aside className="app-sidebar fixed inset-y-0 z-20 hidden w-64 flex-col bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20 md:flex">
        <div className="app-brand flex items-center gap-3 px-2 py-3"><div className="brand-mark">€</div><div><span className="brand-copy block text-lg font-bold">ExpenseTracker</span><span className="brand-copy block text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Finance workspace</span></div></div>
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Account</p><p className="mt-1 truncate text-sm font-semibold">Il mio spazio</p><p className="mt-1 text-xs text-slate-500">Dati personali protetti</p></div>
        <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Navigazione</p>
        <nav className="space-y-1">{navItems.map((item) => <NavButton key={item.label} item={item} active={page === item.label} onClick={() => setPage(item.label)} />)}</nav>
        <div className="mt-auto rounded-2xl bg-slate-900 p-4"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="mt-1 truncate text-xs text-slate-500">{user?.email}</p><button onClick={logout} className="mt-4 text-xs font-medium text-slate-400 hover:text-white">Esci dall'account →</button></div>
      </aside>

      {mobileMenu && <div className="backdrop-enter fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={() => setMobileMenu(false)}><aside className="mobile-drawer h-full w-72 bg-slate-950 p-5 text-white" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex items-center gap-3"><div className="brand-mark">€</div><div><span className="block text-lg font-bold">ExpenseTracker</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Finance workspace</span></div></div>{navItems.map((item) => <NavButton key={item.label} item={item} active={page === item.label} onClick={() => { setPage(item.label); setMobileMenu(false) }} />)}</aside></div>}

      <main className="page-enter app-main md:ml-64">
        <header className="app-header sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur transition-colors duration-500 dark:border-slate-800 dark:bg-slate-950/85 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3"><button className="text-2xl transition-transform hover:rotate-90 md:hidden" onClick={() => setMobileMenu(true)}>☰</button><div><p className="section-label hidden sm:inline-flex">Panoramica finanziaria</p><h1 className="text-xl font-bold transition-all duration-500 sm:text-2xl">{page}</h1></div></div>
            <div className="flex items-center gap-3"><span className="hidden rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:inline-flex">● Dati aggiornati</span><button onClick={() => setDarkMode(!darkMode)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800">{darkMode ? '☀' : '☾'}</button><div className="hidden h-10 w-10 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700 sm:grid">{user?.name?.charAt(0).toUpperCase()}</div></div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl p-4 sm:p-6">
          {error && <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"><span>{error}</span><button onClick={() => setError('')}>×</button></div>}
          {loading ? <div className="glass-panel rounded-2xl p-16 text-center text-slate-500 dark:bg-slate-900"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />Caricamento dati...</div> : <div key={page} className="content-transition"><PageContent page={page} user={user} totals={totals} currentMonthExpenses={currentMonthExpenses} categoryChart={categoryChart} monthlyChart={monthlyChart} transactions={transactions} categories={categories} budgets={budgets} recurring={recurring} transactionForm={transactionForm} setTransactionForm={setTransactionForm} budgetForm={budgetForm} setBudgetForm={setBudgetForm} addTransaction={addTransaction} addBudget={addBudget} addCategory={addCategory} updateCategory={updateCategory} deleteCategory={deleteCategory} updateTransaction={updateTransaction} deleteBudget={deleteBudget} deleteTransaction={deleteTransaction} addRecurring={addRecurring} deleteRecurring={deleteRecurring} exportCsv={exportCsv} importCsv={importCsv} setPage={setPage} /></div>}
        </section>
      </main>
      {toast && <div className={`toast-enter fixed right-4 top-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50/95 text-emerald-700' : 'border-red-200 bg-red-50/95 text-red-700'}`}><span className="grid h-7 w-7 place-items-center rounded-full bg-white/70">{toast.type === 'success' ? '✓' : '!'}</span>{toast.message}<button className="ml-2 opacity-60 hover:opacity-100" onClick={() => setToast(null)}>×</button></div>}
    </div>
  )
}

function NavButton({ item, active, onClick }: { item: { label: Page; icon: string }; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}><span className="w-5 text-center text-lg transition-transform duration-200 group-hover:scale-110">{item.icon}</span>{item.label}</button>
}

function PageContent(props: {
  page: Page
  user: User | null
  totals: { income: number; expenses: number }
  currentMonthExpenses: number
  categoryChart: { name: string; value: number }[]
  monthlyChart: { name: string; Entrate: number; Uscite: number }[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  recurring: Recurring[]
  transactionForm: { description: string; amount: string; type: string; date: string; categoryId: string }
  setTransactionForm: (value: PageContentProps['transactionForm']) => void
  budgetForm: { amount: string; month: string; year: string; categoryId: string }
  setBudgetForm: (value: PageContentProps['budgetForm']) => void
  addTransaction: (event: FormEvent) => void
  addBudget: (event: FormEvent) => void
  addCategory: (data: { name: string; type: Category['type'] }) => Promise<void>
  updateCategory: (id: string, data: object) => void
  deleteCategory: (id: string) => void
  updateTransaction: (id: string, data: object) => void
  deleteTransaction: (id: string) => void
  deleteBudget: (id: string) => void
  addRecurring: (data: object) => void
  deleteRecurring: (id: string) => void
  exportCsv: () => void
  importCsv: (file: File) => Promise<void>
  setPage: (page: Page) => void
}) {
  const { page } = props
  const content = page === 'Dashboard' ? <Dashboard {...props} /> :
    page === 'Transazioni' ? <Transactions {...props} /> :
      page === 'Categorie' ? <Categories {...props} /> :
        page === 'Budget' ? <Budgets {...props} /> :
          page === 'Ricorrenti' ? <RecurringPage {...props} /> :
            page === 'Analytics' ? <Analytics {...props} /> : <Settings {...props} />
  return <div className="page-shell hud-corner">{content}</div>
}

type PageContentProps = Parameters<typeof PageContent>[0]

function Dashboard({ totals, currentMonthExpenses, categoryChart, transactions, budgets, recurring, setPage }: PageContentProps) {
  const budgetTotal = budgets.reduce((sum, budget) => sum + Number(budget.amount), 0)
  const budgetPercent = budgetTotal ? Math.min(100, Math.round((currentMonthExpenses / budgetTotal) * 100)) : 0
  const now = new Date()
  const currentMonth = transactions.filter((item) => {
    const date = new Date(item.date)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const previousMonth = transactions.filter((item) => {
    const date = new Date(item.date)
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return date.getMonth() === previous.getMonth() && date.getFullYear() === previous.getFullYear()
  })
  const monthTotal = (rows: Transaction[], type: Transaction['type']) => rows.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.amount), 0)
  const currentIncome = monthTotal(currentMonth, 'INCOME')
  const previousIncome = monthTotal(previousMonth, 'INCOME')
  const currentExpenses = monthTotal(currentMonth, 'EXPENSE')
  const previousExpenses = monthTotal(previousMonth, 'EXPENSE')
  const currentBalance = currentIncome - currentExpenses
  const previousBalance = previousIncome - previousExpenses
  const currentSavings = Math.max(0, currentIncome - currentExpenses)
  const previousSavings = Math.max(0, previousIncome - previousExpenses)
  const trend = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? '—' : 'Nuovo'
    const change = ((current - previous) / Math.abs(previous)) * 100
    return `${change >= 0 ? '+' : ''}${change.toFixed(1).replace('.', ',')}%`
  }
  let runningBalance = 0
  const chartData = [...transactions].reverse().slice(-30).map((item) => {
    const amount = Number(item.amount)
    runningBalance += item.type === 'INCOME' ? amount : -amount
    return {
      name: new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
      income: item.type === 'INCOME' ? amount : 0,
      expenses: item.type === 'EXPENSE' ? amount : 0,
      balance: runningBalance,
    }
  })
  const expenseTotal = categoryChart.reduce((sum, item) => sum + item.value, 0)
  const topCategories = categoryChart.slice(0, 4)
  return <div className="dashboard-view">
    <div className="dashboard-heading"><div><p className="dashboard-eyebrow">OVERVIEW</p><h2>Il tuo riepilogo</h2></div><div className="dashboard-actions"><button className="dashboard-period">Questo mese <span>⌄</span></button><button onClick={() => setPage('Transazioni')} className="dashboard-primary">+ Nuova transazione</button></div></div>
    <div className="dashboard-kpis">
      <DashboardKpi label="Saldo" value={totals.income - totals.expenses} trend={`${trend(currentBalance, previousBalance)} questo mese`} accent="violet" icon="↗" />
      <DashboardKpi label="Entrate" value={totals.income} trend={`${trend(currentIncome, previousIncome)} questo mese`} accent="cyan" icon="↗" />
      <DashboardKpi label="Uscite" value={totals.expenses} trend={`${trend(currentExpenses, previousExpenses)} questo mese`} accent="rose" icon="↘" />
      <DashboardKpi label="Risparmio" value={Math.max(0, totals.income - totals.expenses)} trend={`${trend(currentSavings, previousSavings)} questo mese`} accent="green" icon="✦" />
    </div>
    <div className="dashboard-grid">
      <DashboardPanel title="Andamento del mese" action="Mostra dettagli →" onAction={() => setPage('Analytics')} className="dashboard-chart-panel">
        <div className="dashboard-chart-summary"><div><span>Entrate complessive</span><strong>€ {totals.income.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong></div><p className="positive-trend">{trend(currentIncome, previousIncome)} <small>rispetto al mese scorso</small></p></div>
        {chartData.length ? <ResponsiveContainer width="100%" height={280}><AreaChart data={chartData}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.42} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `€${value}`} /><Tooltip contentStyle={{ background: '#11131a', border: '1px solid #3f3f46', borderRadius: 12 }} formatter={(value) => `€ ${Number(value).toFixed(2)}`} /><Area type="monotone" dataKey="income" stroke="#a78bfa" strokeWidth={3} fill="url(#incomeFill)" /><Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2} dot={false} /></AreaChart></ResponsiveContainer> : <Empty text="Registra alcune transazioni per visualizzare l'andamento." />}
      </DashboardPanel>
      <DashboardPanel title="Tutte le spese" action="Mostra dettagli →" onAction={() => setPage('Analytics')} className="dashboard-expense-panel">
        <div className="donut-wrap">{expenseTotal ? <><PieChart width={210} height={210}><Pie data={topCategories} dataKey="value" innerRadius={63} outerRadius={84} paddingAngle={5} stroke="none">{topCategories.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Pie></PieChart><div className="donut-label"><strong>€ {expenseTotal.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</strong><span>spese totali</span></div></> : <Empty text="Nessun dato" />}</div>
        <div className="dashboard-legend">{topCategories.map((item, index) => <div key={item.name}><span className="legend-dot" style={{ background: chartColors[index % chartColors.length] }} /><span>{item.name}</span><strong>€ {item.value.toFixed(0)}</strong></div>)}</div>
      </DashboardPanel>
    </div>
    <div className="dashboard-lower-grid">
      <DashboardPanel title="Ultime transazioni" action="Vedi tutte →" onAction={() => setPage('Transazioni')}><div className="dashboard-table-head"><span>Nome</span><span>Importo</span><span>Data</span><span>Stato</span></div>{transactions.slice(0, 4).map((item) => <div className="dashboard-table-row" key={item.id}><span className="transaction-name"><i className={item.type === 'INCOME' ? 'income-dot' : 'expense-dot'} />{item.description}</span><strong className={item.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}>{item.type === 'INCOME' ? '+' : '-'}€ {Number(item.amount).toFixed(2)}</strong><span>{new Date(item.date).toLocaleDateString('it-IT')}</span><em className={item.type === 'INCOME' ? 'status-approved' : 'status-expense'}>{item.type === 'INCOME' ? 'Entrata' : 'Uscita'}</em></div>)}{!transactions.length && <Empty text="Non ci sono ancora transazioni." />}</DashboardPanel>
      <DashboardPanel title="Prossimi pagamenti" action="Mostra tutti →" onAction={() => setPage('Ricorrenti')}>{recurring.slice(0, 4).map((item) => <div className="upcoming-row" key={item.id}><span className="upcoming-icon">↻</span><div><strong>{item.description}</strong><small>{new Date(item.nextExecution).toLocaleDateString('it-IT')}</small></div><b>€ {Number(item.amount).toFixed(2)}</b></div>)}{!recurring.length && <Empty text="Nessun pagamento ricorrente." />}</DashboardPanel>
      <DashboardPanel title="Budget del mese" action="Gestisci →" onAction={() => setPage('Budget')}><div className="budget-highlight"><strong>€ {currentMonthExpenses.toFixed(2)}</strong><span>di € {budgetTotal.toFixed(2)}</span></div><div className="budget-track"><i style={{ width: `${budgetPercent}%` }} /></div><p className="budget-caption">{budgetTotal ? `${budgetPercent}% del budget utilizzato` : 'Imposta un budget per iniziare'}</p><button onClick={() => setPage('Budget')} className="dashboard-secondary">Apri budget</button></DashboardPanel>
    </div>
  </div>
}

function DashboardPanel({ title, action, onAction, children, className = '' }: { title: string; action: string; onAction?: () => void; children: ReactNode; className?: string }) {
  return <section className={`dashboard-panel ${className}`}><div className="dashboard-panel-heading"><h3>{title}</h3><button type="button" onClick={onAction}>{action}</button></div>{children}</section>
}

function DashboardKpi({ label, value, trend, accent, icon }: { label: string; value: number; trend: string; accent: string; icon: string }) {
  return <div className={`dashboard-kpi ${accent}`}><div className="kpi-top"><span>{label}</span><i>{icon}</i></div><div className="kpi-value">€ {value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div><span className="kpi-trend">{trend}</span><div className="kpi-spark" /></div>
}

function Transactions({ transactions, categories, transactionForm, setTransactionForm, addTransaction, updateTransaction, deleteTransaction }: PageContentProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [editing, setEditing] = useState<Transaction | null>(null)
  const filtered = transactions.filter((item) => {
    const matchesQuery = item.description.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (typeFilter === 'ALL' || item.type === typeFilter) && (categoryFilter === 'ALL' || item.category?.id === categoryFilter)
  })
  const editForm = editing ? { description: editing.description, amount: String(editing.amount), type: editing.type, date: editing.date.slice(0, 10), categoryId: editing.category?.id ?? '' } : null

  return <><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Gestisci ogni movimento</p><h2 className="mt-1 text-2xl font-bold">Le tue transazioni</h2></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">{filtered.length} risultati</span></div><form onSubmit={addTransaction} className="mb-4 grid gap-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-5"><input required placeholder="Descrizione" className="input" value={transactionForm.description} onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })} /><input required type="number" min="0.01" step="0.01" placeholder="Importo" className="input" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} /><select className="input" value={transactionForm.type} onChange={(event) => setTransactionForm({ ...transactionForm, type: event.target.value })}><option value="EXPENSE">Uscita</option><option value="INCOME">Entrata</option></select><select className="input" value={transactionForm.categoryId} onChange={(event) => setTransactionForm({ ...transactionForm, categoryId: event.target.value })}><option value="">Senza categoria</option>{categories.filter((category) => category.type === transactionForm.type).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button className="shine-button rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">Aggiungi</button></form><div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><input className="input" placeholder="Cerca descrizione..." value={query} onChange={(event) => setQuery(event.target.value)} /><select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="ALL">Tutti i tipi</option><option value="EXPENSE">Uscite</option><option value="INCOME">Entrate</option></select><select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="ALL">Tutte le categorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>{editing && editForm && <form onSubmit={async (event) => { event.preventDefault(); await updateTransaction(editing.id, { ...editForm, amount: Number(editForm.amount), categoryId: editForm.categoryId || null }); setEditing(null) }} className="mb-4 grid gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/30 sm:grid-cols-2 xl:grid-cols-5"><input required className="input" value={editForm.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /><input required type="number" step="0.01" className="input" value={editForm.amount} onChange={(event) => setEditing({ ...editing, amount: Number(event.target.value) })} /><select className="input" value={editForm.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as Transaction['type'] })}><option value="EXPENSE">Uscita</option><option value="INCOME">Entrata</option></select><input type="date" className="input" value={editForm.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} /><div className="flex gap-2"><button className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Salva</button><button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-white px-4 py-2 text-slate-600">Annulla</button></div></form>}<Card title="Tutte le transazioni"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Descrizione</th><th className="p-3">Categoria</th><th className="p-3">Data</th><th className="p-3 text-right">Importo</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="row-interactive border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-medium">{item.description}</td><td className="p-3 text-slate-500">{item.category?.name ?? '—'}</td><td className="p-3 text-slate-500">{new Date(item.date).toLocaleDateString('it-IT')}</td><td className={`p-3 text-right font-semibold ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.type === 'INCOME' ? '+' : '-'} €{Number(item.amount).toFixed(2)}</td><td className="p-3 text-right"><button onClick={() => setEditing(item)} className="mr-3 text-xs font-semibold text-indigo-500">Modifica</button><button onClick={() => deleteTransaction(item.id)} className="text-slate-400 hover:text-rose-600">×</button></td></tr>)}</tbody></table>{!filtered.length && <Empty text="Nessuna transazione corrisponde ai filtri." />}</div></Card></>
}

function Categories({ categories, addCategory, updateCategory, deleteCategory }: PageContentProps) {
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<{ name: string; type: Category['type'] }>({ name: '', type: 'EXPENSE' })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    await addCategory({ name: form.name.trim(), type: form.type })
    setForm({ name: '', type: 'EXPENSE' })
  }
  return <><div className="mb-6"><p className="text-sm text-slate-500">Organizza le tue spese</p><h2 className="mt-1 text-2xl font-bold">Categorie</h2></div><form onSubmit={submit} className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 sm:grid-cols-[1fr_220px_auto]"><input required minLength={1} maxLength={80} placeholder="Nome categoria" className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Category['type'] })}><option value="EXPENSE">Uscita</option><option value="INCOME">Entrata</option></select><button type="submit" className="shine-button rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">+ Crea categoria</button></form><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <div key={category.id} className="motion-card group rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><div className={`mb-5 grid h-11 w-11 place-items-center rounded-xl text-xl ${category.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>{category.type === 'INCOME' ? '↗' : '↘'}</div>{editing?.id === category.id ? <form onSubmit={async (event) => { event.preventDefault(); await updateCategory(category.id, { name: editing.name, type: editing.type }); setEditing(null) }} className="space-y-2"><input className="input w-full" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /><select className="input w-full" value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as Category['type'] })}><option value="EXPENSE">Uscita</option><option value="INCOME">Entrata</option></select><div className="flex gap-2"><button className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Salva</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs">Annulla</button></div></form> : <div className="flex items-center justify-between"><div><h3 className="font-semibold">{category.name}</h3><p className="mt-1 text-xs text-slate-500">{category.type === 'INCOME' ? 'Entrata' : 'Uscita'}</p></div><div className="flex gap-3 text-xs font-semibold"><button onClick={() => setEditing(category)} className="text-indigo-500">Modifica</button><button onClick={() => deleteCategory(category.id)} className="text-slate-400 hover:text-rose-600">Elimina</button></div></div>}</div>)}{!categories.length && <Card title="Nessuna categoria"><Empty text="Crea la prima categoria per classificare le tue transazioni." /></Card>}</div></>
}

function Budgets({ budgets, categories, transactions, budgetForm, setBudgetForm, addBudget, deleteBudget }: PageContentProps) {
  return <><div className="mb-6"><p className="text-sm text-slate-500">Pianifica le tue spese</p><h2 className="mt-1 text-2xl font-bold">Budget mensili</h2></div><form onSubmit={addBudget} className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-5"><input required type="number" min="0.01" step="0.01" placeholder="Importo budget" className="input" value={budgetForm.amount} onChange={(event) => setBudgetForm({ ...budgetForm, amount: event.target.value })} /><select className="input" value={budgetForm.month} onChange={(event) => setBudgetForm({ ...budgetForm, month: event.target.value })}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2024, index).toLocaleString('it-IT', { month: 'long' })}</option>)}</select><input required type="number" min="2000" className="input" value={budgetForm.year} onChange={(event) => setBudgetForm({ ...budgetForm, year: event.target.value })} /><select className="input" value={budgetForm.categoryId} onChange={(event) => setBudgetForm({ ...budgetForm, categoryId: event.target.value })}><option value="">Tutte le categorie</option>{categories.filter((category) => category.type === 'EXPENSE').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button className="shine-button rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Crea budget</button></form><div className="grid gap-4 md:grid-cols-2">{budgets.map((budget) => { const spent = transactions.filter((item) => item.type === 'EXPENSE' && new Date(item.date).getMonth() + 1 === budget.month && new Date(item.date).getFullYear() === budget.year && (!budget.categoryId || item.category?.id === budget.categoryId)).reduce((sum, item) => sum + Number(item.amount), 0); const progress = Math.min((spent / Number(budget.amount)) * 100, 100); return <div key={budget.id} className="motion-card rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><div className="flex justify-between"><div><p className="text-sm font-semibold">{budget.category?.name ?? 'Budget generale'}</p><p className="mt-1 text-xs capitalize text-slate-500">{new Date(2024, budget.month - 1).toLocaleString('it-IT', { month: 'long' })} {budget.year}</p></div><button onClick={() => deleteBudget(budget.id)} className="text-slate-400 hover:text-rose-600">×</button></div><div className="mt-5 flex items-end justify-between text-sm"><span className="text-slate-500">Speso € {spent.toFixed(2)}</span><span className={`font-semibold ${progress >= 100 ? 'text-rose-600' : 'text-indigo-600'}`}>{progress.toFixed(0)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-slate-500">Limite € {Number(budget.amount).toFixed(2)}</p></div> })}{!budgets.length && <Card title="Nessun budget"><Empty text="Imposta un limite mensile per tenere sotto controllo le spese." /></Card>}</div></>
}

function RecurringPage({ recurring, categories, addRecurring, deleteRecurring }: PageContentProps) {
  const [form, setForm] = useState({ description: '', amount: '', type: 'EXPENSE', frequency: 'MONTHLY', nextExecution: new Date().toISOString().slice(0, 10), categoryId: '' })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await addRecurring({ ...form, amount: Number(form.amount), categoryId: form.categoryId || null })
    setForm({ ...form, description: '', amount: '' })
  }
  const labels = { DAILY: 'Ogni giorno', WEEKLY: 'Ogni settimana', MONTHLY: 'Ogni mese', YEARLY: 'Ogni anno' }
  return <><div className="mb-6"><p className="text-sm text-slate-500">Automatizza le tue abitudini</p><h2 className="mt-1 text-2xl font-bold">Movimenti ricorrenti</h2></div><form onSubmit={submit} className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-5"><input required placeholder="Descrizione" className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><input required type="number" min="0.01" step="0.01" placeholder="Importo" className="input" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /><select className="input" value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input required type="date" className="input" value={form.nextExecution} onChange={(event) => setForm({ ...form, nextExecution: event.target.value })} /><button className="shine-button rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Aggiungi</button><select className="input sm:col-span-2 xl:col-span-1" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Senza categoria</option>{categories.filter((category) => category.type === form.type).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></form><div className="grid gap-4 md:grid-cols-2">{recurring.map((item) => <div key={item.id} className="motion-card rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${item.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>↻</div><div><h3 className="font-semibold">{item.description}</h3><p className="text-xs text-slate-500">{item.category?.name ?? 'Senza categoria'} · {labels[item.frequency]}</p></div></div><button onClick={() => deleteRecurring(item.id)} className="text-slate-400 hover:text-rose-600">×</button></div><div className="mt-5 flex items-end justify-between"><p className={`text-2xl font-bold ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-indigo-600'}`}>€ {Number(item.amount).toFixed(2)}</p><p className="text-right text-xs text-slate-500">Prossima esecuzione<br /><span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(item.nextExecution).toLocaleDateString('it-IT')}</span></p></div></div>)}{!recurring.length && <Card title="Nessun movimento ricorrente"><Empty text="Aggiungi abbonamenti, stipendio o spese fisse per non dimenticarli." /></Card>}</div></>
}

function Analytics({ categoryChart, monthlyChart }: PageContentProps) {
  return <><div className="mb-6"><p className="text-sm text-slate-500">Numeri e tendenze aggiornati dai tuoi movimenti</p><h2 className="mt-1 text-2xl font-bold">Analytics</h2></div><div className="grid gap-6 xl:grid-cols-2"><Card title="Entrate vs uscite"><ResponsiveContainer width="100%" height={300}><BarChart data={monthlyChart}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#11131a', border: '1px solid #3f3f46', borderRadius: 12 }} formatter={(value) => `€ ${Number(value).toFixed(2)}`} /><Bar dataKey="Entrate" fill="#34d399" radius={[6, 6, 0, 0]} /><Bar dataKey="Uscite" fill="#fb7185" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card><Card title="Ripartizione spese">{categoryChart.length ? <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={categoryChart} dataKey="value" nameKey="name" outerRadius={105} label>{categoryChart.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} /></PieChart></ResponsiveContainer> : <Empty text="Non ci sono ancora dati sufficienti." />}</Card></div></>
}

function Settings({ user, exportCsv, importCsv }: PageContentProps) {
  const [compactMode, setCompactMode] = useState(localStorage.getItem('expense-compact') === 'true')
  const [animations, setAnimations] = useState(localStorage.getItem('expense-motion') !== 'reduced')
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [importStatus, setImportStatus] = useState('')

  const toggleCompact = (value: boolean) => {
    setCompactMode(value)
    localStorage.setItem('expense-compact', String(value))
    document.documentElement.classList.toggle('compact-mode', value)
  }
  const toggleAnimations = (value: boolean) => {
    setAnimations(value)
    localStorage.setItem('expense-motion', value ? 'full' : 'reduced')
    document.documentElement.classList.toggle('reduced-motion', !value)
  }
  const savePreferences = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }
  const resetLocalPreferences = () => {
    localStorage.removeItem('expense-theme')
    localStorage.removeItem('expense-compact')
    localStorage.removeItem('expense-motion')
    window.location.reload()
  }
  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await importCsv(file)
      setImportStatus('Importazione completata.')
    } catch (reason) {
      setImportStatus(reason instanceof Error ? reason.message : 'Importazione non riuscita.')
    } finally {
      event.target.value = ''
    }
  }

  return <><div className="mb-8"><p className="section-label">Preferenze account</p><h2 className="mt-2 text-3xl font-bold">Impostazioni</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">Personalizza l’esperienza e gestisci i tuoi dati in modo trasparente.</p></div><div className="grid max-w-6xl gap-6 xl:grid-cols-[1.3fr_0.7fr]"><div className="space-y-6"><Card title="Profilo personale" subtitle="Informazioni associate all’account"><div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-400 text-xl font-bold text-white shadow-lg shadow-indigo-200">{user?.name?.slice(0, 2).toUpperCase() ?? 'ET'}</div><div><p className="font-semibold">{user?.name ?? 'Account personale'}</p><p className="text-sm text-slate-500">{user?.email ?? 'Email non disponibile'}</p></div><span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Attivo</span></div></Card><Card title="Preferenze interfaccia" subtitle="Le modifiche vengono salvate su questo dispositivo"><div className="space-y-1"><PreferenceRow title="Animazioni avanzate" description="Transizioni morbide e micro-interazioni" checked={animations} onChange={toggleAnimations} /><PreferenceRow title="Modalità compatta" description="Riduci spazi e densità delle schede" checked={compactMode} onChange={toggleCompact} /></div><button onClick={savePreferences} className="shine-button mt-5 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">{saved ? '✓ Preferenze salvate' : 'Salva preferenze'}</button></Card><Card title="I tuoi dati" subtitle="Esporta o importa transazioni in formato CSV"><div className="grid gap-3 sm:grid-cols-2"><button onClick={exportCsv} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-100">↓ Esporta CSV</button><label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">↑ Importa CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleImport} /></label></div>{importStatus && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{importStatus}</p>}<p className="mt-3 text-xs text-slate-500">Colonne supportate: description, amount, type, date, category.</p></Card></div><div className="space-y-6"><Card title="Stato sistema"><div className="space-y-3"><StatusRow label="API ExpenseTracker" status="Operativa" /><StatusRow label="Database PostgreSQL" status="Connesso" /><StatusRow label="Autenticazione JWT" status="Protetta" /></div></Card><Card title="Sicurezza" subtitle="Controlla la sessione attiva"><div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><p className="font-semibold">✓ Sessione protetta</p><p className="mt-1 text-xs opacity-80">Token JWT attivo e dati isolati per il tuo account.</p></div><button onClick={() => setSecurityOpen(!securityOpen)} className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{securityOpen ? 'Nascondi dettagli' : 'Mostra dettagli sessione'}</button>{securityOpen && <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><p>Accesso: autenticato</p><p>Protezione password: bcrypt</p><p>Autorizzazione: JWT Bearer</p><p>Ambito dati: esclusivamente il tuo account</p></div>}</Card><Card title="Ripristina preferenze" subtitle="Torna alle impostazioni iniziali del dispositivo"><button onClick={() => setConfirmReset(true)} className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">Ripristina impostazioni locali</button>{confirmReset && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">Questa azione rimuove solo le preferenze del browser. <button onClick={resetLocalPreferences} className="ml-1 font-bold underline">Conferma</button></div>}</Card></div></div></>
}

function PreferenceRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span><span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}><input type="checkbox" className="sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} /></span></label>
}

function StatusRow({ label, status }: { label: string; status: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-800/70"><span className="text-slate-600 dark:text-slate-300">{label}</span><span className="flex items-center gap-2 text-xs font-semibold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />{status}</span></div>
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <div className="motion-card rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><div className="mb-4"><h2 className="font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>{children}</div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{text}</div>
}

export default App
