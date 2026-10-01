export const SELL_STATS = [
  { label: "Total Sales Orders", value: "156", change: "18%", direction: "up", iconBg: "bg-emerald-500" },
  { label: "Total Sales Invoice", value: "128", change: "12%", direction: "up", iconBg: "bg-blue-500" },
  { label: "Total Sales Amount", value: "$245,680", change: "20%", direction: "up", iconBg: "bg-violet-500" },
  { label: "Total Delivered", value: "112", change: "15%", direction: "up", iconBg: "bg-amber-500" },
  { label: "Sales Return", value: "5", change: "29%", direction: "down", iconBg: "bg-rose-500" },
  { label: "Total Customers", value: "179", change: "8%", direction: "up", iconBg: "bg-pink-500" },
];

export const SALES_TREND = [
  { month: "Apr", order: 32000, invoice: 26000 },
  { month: "May", order: 36000, invoice: 30000 },
  { month: "Jun", order: 40000, invoice: 34000 },
  { month: "Jul", order: 65420, invoice: 52180 },
  { month: "Aug", order: 58000, invoice: 48000 },
  { month: "Sep", order: 72000, invoice: 61000 },
];

export const SALES_BY_CATEGORY = [
  { label: "Electronics", value: 28, percent: 28, color: "#2563eb" },
  { label: "Machinery", value: 18, percent: 18, color: "#10b981" },
  { label: "Office Supplies", value: 15, percent: 15, color: "#f59e0b" },
  { label: "Packaging", value: 12, percent: 12, color: "#f97316" },
  { label: "Logistics Services", value: 10, percent: 10, color: "#a855f7" },
  { label: "Spare Parts", value: 8, percent: 8, color: "#ec4899" },
  { label: "Furniture", value: 6, percent: 6, color: "#0ea5e9" },
  { label: "Others", value: 3, percent: 3, color: "#64748b" },
];

export const TOP_CUSTOMERS = [
  { rank: 1, name: "Sokha Trading", amount: "$48,250", orders: 28 },
  { rank: 2, name: "Rithy Import", amount: "$42,180", orders: 24 },
  { rank: 3, name: "Vibol Express", amount: "$32,450", orders: 18 },
  { rank: 4, name: "Makara Group", amount: "$28,600", orders: 16 },
  { rank: 5, name: "Dara Online", amount: "$24,350", orders: 14 },
];

export const RECENT_SALES_ORDERS = [
  { id: 1, so: "SO-20250910-001", customer: "Sokha Trading", date: "Sep 10, 2025", amount: "$4,250.00", status: "Confirmed" },
  { id: 2, so: "SO-20250909-003", customer: "Rithy Import", date: "Sep 9, 2025", amount: "$12,600.00", status: "To Deliver" },
  { id: 3, so: "SO-20250908-002", customer: "Vibol Express", date: "Sep 8, 2025", amount: "$8,350.00", status: "Confirmed" },
  { id: 4, so: "SO-20250907-001", customer: "Makara Group", date: "Sep 7, 2025", amount: "$15,200.00", status: "To Deliver" },
  { id: 5, so: "SO-20250906-004", customer: "Dara Online", date: "Sep 6, 2025", amount: "$3,860.00", status: "Draft" },
];

export const RECENT_SALES_INVOICES = [
  { id: 1, invoice: "SINV-20250910-001", customer: "Sokha Trading", date: "Sep 10, 2025", amount: "$4,250.00", status: "Paid" },
  { id: 2, invoice: "SINV-20250909-003", customer: "Rithy Import", date: "Sep 9, 2025", amount: "$12,600.00", status: "Unpaid" },
  { id: 3, invoice: "SINV-20250908-002", customer: "Vibol Express", date: "Sep 8, 2025", amount: "$8,350.00", status: "Paid" },
  { id: 4, invoice: "SINV-20250907-001", customer: "Makara Group", date: "Sep 7, 2025", amount: "$15,200.00", status: "Partial" },
  { id: 5, invoice: "SINV-20250906-004", customer: "Dara Online", date: "Sep 6, 2025", amount: "$3,860.00", status: "Paid" },
];

export const QUICK_ACTIONS = ["New Quotation", "New Sales Order", "New Sales Invoice", "Delivery Note", "Sales Return", "Customer", "Price List", "Item Price"];

export const SALES_PIPELINE = [
  { label: "Quotation", value: 220, percent: 100, color: "#2563eb" },
  { label: "Sales Order", value: 156, percent: 71, color: "#0ea5e9" },
  { label: "To Deliver", value: 112, percent: 51, color: "#f59e0b" },
  { label: "Invoiced", value: 128, percent: 58, color: "#a855f7" },
  { label: "Paid", value: 98, percent: 45, color: "#10b981" },
];

export const DELIVERY_STATUS = [
  { label: "Delivered", value: 68, percent: 61, color: "#10b981" },
  { label: "In Transit", value: 28, percent: 25, color: "#3b82f6" },
  { label: "Pending", value: 12, percent: 11, color: "#f59e0b" },
  { label: "Cancelled", value: 3, percent: 3, color: "#ef4444" },
];

export const UPCOMING_DELIVERIES = [
  { id: 1, dn: "DN-20250910-001", customer: "Sokha Trading", date: "Sep 10", status: "In Transit" },
  { id: 2, dn: "DN-20250910-002", customer: "Rithy Import", date: "Sep 10", status: "Pending" },
  { id: 3, dn: "DN-20250911-001", customer: "Makara Group", date: "Sep 11", status: "Pending" },
  { id: 4, dn: "DN-20250911-002", customer: "Vibol Express", date: "Sep 11", status: "Scheduled" },
  { id: 5, dn: "DN-20250912-001", customer: "Dara Online", date: "Sep 12", status: "Scheduled" },
];
