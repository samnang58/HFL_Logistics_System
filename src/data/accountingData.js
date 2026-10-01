export const ACC_STATS = [
  { label: "Total Income", value: "$125,430.00", change: "12.5%", direction: "up", iconBg: "bg-emerald-500" },
  { label: "Total Expense", value: "$86,240.00", change: "8.2%", direction: "up", iconBg: "bg-rose-500" },
  { label: "Net Profit", value: "$39,190.00", change: "18.7%", direction: "up", iconBg: "bg-blue-500" },
  { label: "Outstanding Receivable", value: "$24,850.00", change: null, note: "32 customers", iconBg: "bg-amber-500" },
  { label: "Outstanding Payable", value: "$18,620.00", change: null, note: "15 suppliers", iconBg: "bg-violet-500" },
];

export const INCOME_VS_EXPENSE = [
  { month: "Jan", income: 14000, expense: 9000 },
  { month: "Feb", income: 16000, expense: 9500 },
  { month: "Mar", income: 15500, expense: 10200 },
  { month: "Apr", income: 17000, expense: 9800 },
  { month: "May", income: 13500, expense: 8600 },
  { month: "Jun", income: 18500, expense: 11000 },
  { month: "Jul", income: 20500, expense: 10500 },
  { month: "Aug", income: 21000, expense: 12500 },
  { month: "Sep", income: 34000, expense: 15200 },
];

export const EXPENSE_BREAKDOWN = [
  { label: "Freight & Shipping", value: 28, percent: 28, color: "#2563eb" },
  { label: "Warehouse", value: 18, percent: 18, color: "#0ea5e9" },
  { label: "Salaries & HR", value: 15, percent: 15, color: "#f59e0b" },
  { label: "Office & Admin", value: 12, percent: 12, color: "#f97316" },
  { label: "Marketing", value: 8, percent: 8, color: "#a855f7" },
  { label: "Utilities", value: 5, percent: 5, color: "#ec4899" },
  { label: "Others", value: 14, percent: 14, color: "#1e3a8a" },
];

export const ACCOUNT_BALANCES = [
  { name: "Cash on Hand", value: "$12,450.00", iconBg: "bg-emerald-100 text-emerald-600" },
  { name: "Bank - ABA", value: "$48,230.00", iconBg: "bg-blue-100 text-blue-600" },
  { name: "Bank - ACLEDA", value: "$32,150.00", iconBg: "bg-amber-100 text-amber-600" },
  { name: "Accounts Receivable", value: "$24,850.00", iconBg: "bg-orange-100 text-orange-600" },
  { name: "Accounts Payable", value: "-$18,620.00", iconBg: "bg-rose-100 text-rose-600" },
];

export const RECENT_TRANSACTIONS = [
  { id: 1, date: "Sep 10, 2026", type: "Payment Received", ref: "PAY-20250910-001", party: "Sokha Trading", amount: "$2,450.00", status: "Completed" },
  { id: 2, date: "Sep 10, 2026", type: "Sales Invoice", ref: "SINV-20250910-003", party: "Rithy Import", amount: "$1,250.00", status: "Submitted" },
  { id: 3, date: "Sep 9, 2026", type: "Purchase Invoice", ref: "PINV-20250909-002", party: "Guangzhou Supplier", amount: "$3,600.00", status: "Submitted" },
  { id: 4, date: "Sep 9, 2026", type: "Payment Made", ref: "PAY-20250909-004", party: "China Logistics", amount: "$3,600.00", status: "Completed" },
  { id: 5, date: "Sep 8, 2026", type: "Journal Entry", ref: "JV-20250908-001", party: "-", amount: "$5,000.00", status: "Posted" },
];

export const OUTSTANDING_RECEIVABLE = [
  { id: 1, customer: "Sokha Trading", invoice: "SINV-20250901-001", due: "Sep 15, 2026", amount: "$5,200.00", status: "Overdue" },
  { id: 2, customer: "Rithy Import", invoice: "SINV-20250905-003", due: "Sep 18, 2026", amount: "$3,450.00", status: "Due Soon" },
  { id: 3, customer: "Vibol Express", invoice: "SINV-20250907-002", due: "Sep 20, 2026", amount: "$2,800.00", status: "Open" },
  { id: 4, customer: "Makara Supply", invoice: "SINV-20250909-001", due: "Sep 22, 2026", amount: "$1,950.00", status: "Open" },
];

export const QUICK_ACTIONS = [
  "Create Sales Invoice", "Create Purchase Invoice", "Record Payment", "Journal Entry",
  "Bank Reconciliation", "Chart of Accounts", "Financial Reports", "Tax Filing",
];

export const FINANCIAL_REPORTS = [
  { title: "Profit and Loss Statement", desc: "View income, expense and profit." },
  { title: "Balance Sheet", desc: "View your company's financial position." },
  { title: "Cash Flow Statement", desc: "Track cash inflow and outflow." },
  { title: "General Ledger", desc: "View all accounting entries." },
];
