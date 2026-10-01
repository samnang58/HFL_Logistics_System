export const CRM_STATS = [
  { label: "Total Leads", value: "248", change: "12%", direction: "up", iconBg: "bg-blue-500" },
  { label: "Total Customers", value: "179", change: "8%", direction: "up", iconBg: "bg-emerald-500" },
  { label: "Open Opportunities", value: "54", change: "20%", direction: "up", iconBg: "bg-violet-500" },
  { label: "Total Quotations", value: "86", change: "15%", direction: "up", iconBg: "bg-amber-500" },
  { label: "Total Sales (This Month)", value: "$125,430", change: "18%", direction: "up", iconBg: "bg-rose-500" },
];

export const SALES_PIPELINE = [
  { label: "Leads", value: 248, percent: 100, color: "#2563eb" },
  { label: "Qualified", value: 186, percent: 75, color: "#3b82f6" },
  { label: "Proposal", value: 120, percent: 48, color: "#a855f7" },
  { label: "Negotiation", value: 72, percent: 29, color: "#f97316" },
  { label: "Won", value: 54, percent: 22, color: "#10b981" },
];

export const LEADS_VS_CUSTOMERS = [
  { month: "Jan", leads: 18, customers: 12 },
  { month: "Feb", leads: 22, customers: 15 },
  { month: "Mar", leads: 28, customers: 18 },
  { month: "Apr", leads: 32, customers: 22 },
  { month: "May", leads: 40, customers: 28 },
  { month: "Jun", leads: 52, customers: 35 },
  { month: "Jul", leads: 68, customers: 52 },
  { month: "Aug", leads: 74, customers: 58 },
  { month: "Sep", leads: 80, customers: 62 },
  { month: "Oct", leads: 84, customers: 66 },
  { month: "Nov", leads: 90, customers: 70 },
  { month: "Dec", leads: 96, customers: 75 },
];

export const CUSTOMER_BY_TYPE = [
  { label: "Regular Customer", value: 72, percent: 40, color: "#2563eb" },
  { label: "VIP Customer", value: 36, percent: 20, color: "#10b981" },
  { label: "Corporate", value: 28, percent: 16, color: "#f59e0b" },
  { label: "Online Customer", value: 24, percent: 13, color: "#a855f7" },
  { label: "Walk-in", value: 19, percent: 11, color: "#ec4899" },
];

export const RECENT_LEADS = [
  { id: 1, name: "Sophea Lim", company: "Lim Import Co.", source: "Website", status: "New", created: "Sep 10, 2025" },
  { id: 2, name: "Rithy Chan", company: "Chan Trading", source: "Referral", status: "Contacted", created: "Sep 10, 2025" },
  { id: 3, name: "Dara Sok", company: "DS Retail", source: "Facebook", status: "Qualified", created: "Sep 9, 2025" },
  { id: 4, name: "Vannak Proeun", company: "Proeun Store", source: "Walk-in", status: "New", created: "Sep 9, 2025" },
  { id: 5, name: "Kanha Nget", company: "Nget Express", source: "Telegram", status: "Contacted", created: "Sep 8, 2025" },
];

export const RECENT_OPPORTUNITIES = [
  { id: 1, title: "Freight Service Contract", customer: "Sokha Trading", value: "$12,500", stage: "Proposal" },
  { id: 2, title: "Warehouse Service", customer: "Rithy Import", value: "$8,200", stage: "Negotiation" },
  { id: 3, title: "China-Cambodia Route", customer: "Makara Group", value: "$6,800", stage: "Qualified" },
  { id: 4, title: "Monthly Shipping", customer: "Vibol Express", value: "$15,000", stage: "Proposal" },
  { id: 5, title: "E-Commerce Shipping", customer: "Dara Online", value: "$4,500", stage: "New" },
];

export const UPCOMING_ACTIVITIES = [
  { title: "Call: Follow up quotation", sub: "Sokha Trading", when: "Today 10:00 AM" },
  { title: "Meeting: New partnership", sub: "Lim Import Co.", when: "Today 02:00 PM" },
  { title: "Send: Quotation #QT-20250910", sub: "Rithy Import", when: "Tomorrow 09:00 AM" },
  { title: "Call: Check shipment status", sub: "Vibol Express", when: "Tomorrow 11:00 AM" },
  { title: "Meeting: Contract discussion", sub: "Makara Group", when: "Sep 12, 2025 03:00 PM" },
];

export const TOP_CUSTOMERS = [
  { rank: 1, name: "Sokha Trading", amount: "$48,250", pct: 100 },
  { rank: 2, name: "Rithy Import", amount: "$32,180", pct: 67 },
  { rank: 3, name: "Vibol Express", amount: "$28,600", pct: 59 },
  { rank: 4, name: "Makara Group", amount: "$24,350", pct: 50 },
  { rank: 5, name: "Dara Online", amount: "$18,920", pct: 39 },
];

export const QUICK_ACTIONS = ["New Lead", "New Customer", "New Opportunity", "Create Quotation", "Log Activity", "Send Email"];

export const CRM_REPORTS = [
  "Lead Source Analysis", "Sales Pipeline Report", "Customer Segment Report",
  "Quotation Analysis", "Conversion Rate Report",
];
