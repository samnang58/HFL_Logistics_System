export const BUY_STATS = [
  { label: "Total Purchase Orders", value: "48", change: "12%", direction: "up", iconBg: "bg-blue-500" },
  { label: "Total Purchase Amount", value: "$86,240.00", change: "18%", direction: "up", iconBg: "bg-rose-500" },
  { label: "Items Received", value: "75", change: "15%", direction: "up", iconBg: "bg-emerald-500" },
  { label: "Pending Orders", value: "12", change: "25%", direction: "down", iconBg: "bg-amber-500" },
  { label: "Total Suppliers", value: "56", change: "8%", direction: "up", iconBg: "bg-blue-500" },
];

export const PURCHASE_TREND = [
  { month: "Jan", amount: 22000, orders: 12 },
  { month: "Feb", amount: 26000, orders: 15 },
  { month: "Mar", amount: 21000, orders: 14 },
  { month: "Apr", amount: 24000, orders: 18 },
  { month: "May", amount: 29000, orders: 22 },
  { month: "Jun", amount: 27000, orders: 24 },
  { month: "Jul", amount: 31000, orders: 28 },
  { month: "Aug", amount: 34000, orders: 30 },
  { month: "Sep", amount: 46000, orders: 38 },
];

export const PURCHASE_BY_CATEGORY = [
  { label: "Electronics", value: 28, percent: 28, color: "#2563eb" },
  { label: "Machinery", value: 18, percent: 18, color: "#10b981" },
  { label: "Office Supplies", value: 15, percent: 15, color: "#f59e0b" },
  { label: "Packaging", value: 12, percent: 12, color: "#f97316" },
  { label: "Furniture & Equipment", value: 10, percent: 10, color: "#a855f7" },
  { label: "Spare Parts", value: 8, percent: 8, color: "#ec4899" },
  { label: "Other", value: 9, percent: 9, color: "#64748b" },
];

export const SUPPLIER_BY_COUNTRY = [
  { flag: "🇨🇳", country: "China", value: 28, percent: 50 },
  { flag: "🇰🇭", country: "Cambodia", value: 8, percent: 14 },
  { flag: "🇻🇳", country: "Vietnam", value: 6, percent: 11 },
  { flag: "🌐", country: "Other", value: 6, percent: 11 },
];

export const RECENT_PURCHASE_ORDERS = [
  { id: 1, po: "PO-20250910-001", supplier: "Guangzhou Tech Co.", orderDate: "Sep 10, 2025", expected: "Sep 20, 2025", amount: "$4,250.00", status: "Submitted" },
  { id: 2, po: "PO-20250909-003", supplier: "Shenzhen Parts Ltd.", orderDate: "Sep 9, 2025", expected: "Sep 18, 2025", amount: "$12,600.00", status: "Approved" },
  { id: 3, po: "PO-20250908-002", supplier: "Yiwu Trading Co.", orderDate: "Sep 8, 2025", expected: "Sep 16, 2025", amount: "$8,350.00", status: "To Receive" },
  { id: 4, po: "PO-20250907-001", supplier: "Foshan Machinery", orderDate: "Sep 7, 2025", expected: "Sep 25, 2025", amount: "$15,200.00", status: "Submitted" },
  { id: 5, po: "PO-20250906-004", supplier: "TL Supply Co.", orderDate: "Sep 6, 2025", expected: "Sep 15, 2025", amount: "$3,860.00", status: "Approved" },
];

export const RECENT_PURCHASE_INVOICES = [
  { id: 1, invoice: "PINV-20250910-001", supplier: "Guangzhou Tech Co.", date: "Sep 10, 2025", amount: "$4,250.00", status: "Paid" },
  { id: 2, invoice: "PINV-20250909-003", supplier: "Shenzhen Parts Ltd.", date: "Sep 9, 2025", amount: "$12,600.00", status: "Unpaid" },
  { id: 3, invoice: "PINV-20250908-002", supplier: "Yiwu Trading Co.", date: "Sep 8, 2025", amount: "$8,350.00", status: "Partial" },
  { id: 4, invoice: "PINV-20250907-001", supplier: "Foshan Machinery", date: "Sep 7, 2025", amount: "$15,200.00", status: "Unpaid" },
  { id: 5, invoice: "PINV-20250906-004", supplier: "TL Supply Co.", date: "Sep 6, 2025", amount: "$3,860.00", status: "Paid" },
];

export const TOP_SUPPLIERS = [
  { rank: 1, name: "Guangzhou Tech Co.", amount: "$86,250.00", pct: 100, orders: 18 },
  { rank: 2, name: "Shenzhen Parts Ltd.", amount: "$62,400.00", pct: 72, orders: 14 },
  { rank: 3, name: "Yiwu Trading Co.", amount: "$48,700.00", pct: 56, orders: 12 },
  { rank: 4, name: "Foshan Machinery", amount: "$38,600.00", pct: 45, orders: 9 },
  { rank: 5, name: "TL Supply Co.", amount: "$32,150.00", pct: 37, orders: 8 },
];

export const QUICK_ACTIONS = ["New Purchase Order", "New Purchase Invoice", "Request for Quotation", "Supplier", "Item", "Material Request"];

export const PENDING_ACTIONS = [
  { label: "Purchase Orders to Approve", count: 5 },
  { label: "Purchase Receipts to Create", count: 8 },
  { label: "Supplier Quotations to Review", count: 6 },
  { label: "Material Requests Pending", count: 4 },
  { label: "Overdue Purchase Orders", count: 3 },
];
