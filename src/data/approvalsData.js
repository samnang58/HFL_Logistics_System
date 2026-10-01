export const APR_STATS = [
  { label: "Pending Approval", value: "12", change: "20%", direction: "up", note: "Requires your action", iconBg: "bg-blue-500" },
  { label: "Approved Today", value: "28", change: "40%", direction: "up", note: "+12 from yesterday", iconBg: "bg-emerald-500" },
  { label: "Overdue", value: "3", change: "50%", direction: "up", note: "Need attention", iconBg: "bg-rose-500" },
  { label: "Total Requests", value: "156", change: "18%", direction: "up", note: "This month", iconBg: "bg-violet-500" },
  { label: "My Requests", value: "24", change: "9%", direction: "up", note: "Submitted by you", iconBg: "bg-amber-500" },
];

export const REQUEST_TABS = [
  { label: "All Requests", count: 12 },
  { label: "My Approvals", count: 12 },
  { label: "Sent for Approval", count: 8 },
  { label: "Approved", count: 28 },
  { label: "Rejected", count: 2 },
  { label: "Draft", count: 5 },
];

export const APPROVAL_REQUESTS = [
  { id: 1, title: "Purchase Order for Office Supplies", type: "Purchase Order", ref: "PO-20250910-001", requester: "Sokha Men", dept: "Administration", amount: "$2,450.00", status: "Pending", created: "Sep 10, 2025" },
  { id: 2, title: "Payment Request - China Supplier", type: "Payment Entry", ref: "PAY-20250909-003", requester: "Rithy Import", dept: "Procurement", amount: "$5,200.00", status: "Pending", created: "Sep 9, 2025" },
  { id: 3, title: "Sales Invoice Discount Approval", type: "Sales Invoice", ref: "SINV-20250909-012", requester: "Makara Chhun", dept: "Sales", amount: "$1,250.00", status: "Pending", created: "Sep 9, 2025" },
  { id: 4, title: "New Vendor Registration", type: "Supplier", ref: "SUP-20250908-004", requester: "Sophea Lim", dept: "Procurement", amount: "-", status: "Pending", created: "Sep 8, 2025" },
  { id: 5, title: "Expense Claim - Business Trip", type: "Expense Claim", ref: "EXP-20250908-002", requester: "Daneth Sok", dept: "Operations", amount: "$320.00", status: "Pending", created: "Sep 8, 2025" },
  { id: 6, title: "Asset Purchase Approval", type: "Asset", ref: "AST-20250907-001", requester: "Rithy Import", dept: "Administration", amount: "$3,600.00", status: "Overdue", created: "Sep 7, 2025" },
  { id: 7, title: "Hiring Request - Warehouse Staff", type: "HR Request", ref: "HR-20250906-003", requester: "Sokha Men", dept: "HR", amount: "-", status: "Pending", created: "Sep 6, 2025" },
  { id: 8, title: "Marketing Budget Approval", type: "Budget", ref: "BUD-20250905-001", requester: "Makara Chhun", dept: "Marketing", amount: "$1,000.00", status: "Pending", created: "Sep 5, 2025" },
];

export const APPROVAL_STATS_DONUT = [
  { label: "Pending", value: 12, percent: 8, color: "#3b82f6" },
  { label: "Approved", value: 118, percent: 76, color: "#10b981" },
  { label: "Rejected", value: 14, percent: 9, color: "#ef4444" },
  { label: "Cancelled", value: 8, percent: 5, color: "#94a3b8" },
  { label: "Draft", value: 4, percent: 2, color: "#a855f7" },
];

export const QUICK_ACTIONS = ["Create Request", "My Approvals", "Workflow Builder", "Approval Rules", "Delegation", "View Logs"];

export const RECENT_APPROVALS = [
  { id: 1, title: "Office Rent Payment", type: "Payment Entry", requester: "Daneth Sok", status: "Approved", when: "Sep 10, 2025 09:30" },
  { id: 2, title: "Sales Invoice - VIP Customer", type: "Sales Invoice", requester: "Sophea Lim", status: "Approved", when: "Sep 10, 2025 08:15" },
  { id: 3, title: "Stock Transfer Request", type: "Stock Entry", requester: "Makara Chhun", status: "Approved", when: "Sep 9, 2025 17:45" },
  { id: 4, title: "Travel Expense Claim", type: "Expense Claim", requester: "Rithy Import", status: "Approved", when: "Sep 9, 2025 16:20" },
  { id: 5, title: "IT Equipment Purchase", type: "Purchase Order", requester: "Sokha Men", status: "Approved", when: "Sep 9, 2025 14:10" },
];

export const OVERDUE_APPROVALS = [
  { id: 1, title: "Asset Purchase Approval", type: "Asset", requester: "Rithy Import", days: "3 days" },
  { id: 2, title: "Capex Budget Request", type: "Budget", requester: "Makara Chhun", days: "2 days" },
  { id: 3, title: "New Warehouse Contract", type: "Contract", requester: "Sophea Lim", days: "2 days" },
];
