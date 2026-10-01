export const STOCK_STATS = [
  { label: "Total Items", value: "1,248", change: "12%", direction: "up", iconBg: "bg-blue-500" },
  { label: "Total Warehouses", value: "8", change: null, note: "5 Active", iconBg: "bg-emerald-500" },
  { label: "Total Stock Value", value: "$286,450", change: "18%", direction: "up", iconBg: "bg-violet-500" },
  { label: "Low Stock Items", value: "24", change: "25%", direction: "down", note: "Need attention", iconBg: "bg-amber-500" },
  { label: "Out of Stock Items", value: "8", change: null, note: "Require reordering", iconBg: "bg-rose-500" },
];

export const STOCK_MOVEMENT = [
  { month: "Apr", stockIn: 3200, stockOut: 2600 },
  { month: "May", stockIn: 3600, stockOut: 3000 },
  { month: "Jun", stockIn: 3400, stockOut: 3100 },
  { month: "Jul", stockIn: 4200, stockOut: 3600 },
  { month: "Aug", stockIn: 5600, stockOut: 4200 },
  { month: "Sep", stockIn: 6400, stockOut: 5800 },
];

export const ITEM_CATEGORY_DISTRIBUTION = [
  { label: "Electronics", value: 22, percent: 22, color: "#2563eb" },
  { label: "Machinery", value: 18, percent: 18, color: "#10b981" },
  { label: "Office Supplies", value: 15, percent: 15, color: "#f59e0b" },
  { label: "Packaging", value: 12, percent: 12, color: "#f97316" },
  { label: "Spare Parts", value: 10, percent: 10, color: "#a855f7" },
  { label: "Logistics Materials", value: 8, percent: 8, color: "#ec4899" },
  { label: "Furniture", value: 6, percent: 6, color: "#0ea5e9" },
  { label: "Others", value: 9, percent: 9, color: "#64748b" },
];

export const STOCK_VALUE_BY_WAREHOUSE = [
  { name: "Main Warehouse (Guangzhou)", value: 86250, display: "$86,250" },
  { name: "Foshan Warehouse", value: 62480, display: "$62,480" },
  { name: "Yiwu Warehouse", value: 48700, display: "$48,700" },
  { name: "Shenzhen Warehouse", value: 32150, display: "$32,150" },
  { name: "Phnom Penh Warehouse", value: 28600, display: "$28,600" },
  { name: "Sihanoukville Warehouse", value: 18420, display: "$18,420" },
  { name: "Other Warehouse", value: 9850, display: "$9,850" },
];

export const LOW_STOCK_ITEMS = [
  { id: 1, code: "ITM-0012", name: "Laptop Bag", warehouse: "Main WH", qty: 5, reorder: 20, status: "Low Stock" },
  { id: 2, code: "ITM-0045", name: "Printer Paper A4", warehouse: "Phnom Penh", qty: 8, reorder: 30, status: "Low Stock" },
  { id: 3, code: "ITM-0089", name: "Packing Tape", warehouse: "Yiwu", qty: 12, reorder: 50, status: "Low Stock" },
  { id: 4, code: "ITM-0110", name: "Power Adapter", warehouse: "Shenzhen", qty: 3, reorder: 15, status: "Low Stock" },
  { id: 5, code: "ITM-0145", name: "Barcode Label", warehouse: "Foshan", qty: 6, reorder: 25, status: "Low Stock" },
];

export const OUT_OF_STOCK_ITEMS = [
  { id: 1, code: "ITM-0067", name: "Router TP-Link", warehouse: "Main WH", qty: 0, reorder: 10, status: "Out of Stock" },
  { id: 2, code: "ITM-0091", name: "HDMI Cable", warehouse: "Phnom Penh", qty: 0, reorder: 30, status: "Out of Stock" },
  { id: 3, code: "ITM-0123", name: "Wireless Mouse", warehouse: "Yiwu", qty: 0, reorder: 25, status: "Out of Stock" },
  { id: 4, code: "ITM-0188", name: "Safety Gloves", warehouse: "Shenzhen", qty: 0, reorder: 50, status: "Out of Stock" },
  { id: 5, code: "ITM-0199", name: "Carton Box (M)", warehouse: "Foshan", qty: 0, reorder: 100, status: "Out of Stock" },
];

export const RECENT_STOCK_ENTRIES = [
  { id: 1, date: "Sep 10, 2025", type: "Stock In", ref: "SI-20250910-001", item: "Laptop Bag", qty: 100, warehouse: "Main WH", user: "Sokha" },
  { id: 2, date: "Sep 9, 2025", type: "Stock Out", ref: "SO-20250909-003", item: "Packing Tape", qty: 50, warehouse: "Phnom Penh", user: "Rithy" },
  { id: 3, date: "Sep 8, 2025", type: "Material Receipt", ref: "MR-20250908-002", item: "Printer Paper", qty: 200, warehouse: "Yiwu", user: "Makara" },
  { id: 4, date: "Sep 8, 2025", type: "Stock Transfer", ref: "ST-20250908-001", item: "HDMI Cable", qty: 80, warehouse: "Shenzhen", user: "Daneth" },
  { id: 5, date: "Sep 7, 2025", type: "Stock Adjustment", ref: "SA-20250907-001", item: "Safety Gloves", qty: -20, warehouse: "Foshan", user: "Sothea" },
];

export const QUICK_ACTIONS = ["New Item", "Stock Entry", "Stock Transfer", "Stock Adjustment", "Stock Take", "Barcode Print"];

export const STOCK_REPORTS = [
  "Stock Ledger", "Stock Balance", "Stock Valuation", "Item-wise Stock Balance",
  "Warehouse-wise Stock", "Slow Moving Items", "Stock Reorder Report", "Stock Aging Report",
];
