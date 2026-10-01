export const HOME_STATS = [
  { label: "Total Shipments", value: "1,248", change: "12%", direction: "up", iconBg: "bg-blue-600" },
  { label: "Total Customers", value: "179", change: "8%", direction: "up", iconBg: "bg-emerald-600" },
  { label: "Total Packages", value: "8,642", change: "15%", direction: "up", iconBg: "bg-amber-500" },
  { label: "In Transit", value: "864", change: "6%", direction: "up", iconBg: "bg-violet-600" },
  { label: "Delivered", value: "3,712", change: "18%", direction: "up", iconBg: "bg-rose-500" },
  { label: "Pending", value: "56", change: "25%", direction: "down", iconBg: "bg-slate-500" },
];

export const SHIPMENT_TREND = [
  { date: "Aug 10", total: 120, delivered: 80, transit: 30, pending: 10 },
  { date: "Aug 13", total: 132, delivered: 88, transit: 32, pending: 12 },
  { date: "Aug 16", total: 128, delivered: 92, transit: 26, pending: 10 },
  { date: "Aug 19", total: 145, delivered: 98, transit: 34, pending: 13 },
  { date: "Aug 22", total: 150, delivered: 104, transit: 32, pending: 14 },
  { date: "Aug 25", total: 186, delivered: 120, transit: 48, pending: 18 },
  { date: "Aug 28", total: 168, delivered: 112, transit: 40, pending: 16 },
  { date: "Aug 31", total: 175, delivered: 118, transit: 42, pending: 15 },
  { date: "Sep 3", total: 190, delivered: 130, transit: 44, pending: 16 },
  { date: "Sep 6", total: 205, delivered: 140, transit: 48, pending: 17 },
  { date: "Sep 9", total: 220, delivered: 152, transit: 50, pending: 18 },
];

export const SHIPMENT_BY_COUNTRY = [
  { flag: "🇨🇳", country: "China", value: 1248 },
  { flag: "🇰🇭", country: "Cambodia", value: 864 },
  { flag: "🇻🇳", country: "Vietnam", value: 265 },
  { flag: "🌐", country: "Other", value: 420 },
];

export const RECENT_ACTIVITIES = [
  { text: "New mobile user registered", sub: "Sokha Trading", time: "2 minutes ago" },
  { text: "Customer created", sub: "Rithy Import Export", time: "8 minutes ago" },
  { text: "HFL Package #HFL-20250910-001 updated", sub: null, time: "12 minutes ago" },
  { text: "Data import completed", sub: null, time: "28 minutes ago" },
  { text: "New inquiry from website", sub: null, time: "45 minutes ago" },
];

export const QUICK_ACTIONS = [
  "HFL Package", "Tracking", "Scan Package",
  "Shipment", "Container", "Warehouse",
  "Customer", "Invoice / Bill", "Payment", "Reports",
];

export const SYSTEM_NOTICES = [
  { title: "System Update", desc: "ERPNext v15.0.0 is now available.", date: "Sep 10, 2025" },
  { title: "Warehouse Announcement", desc: "New warehouse in Foshan is now operational.", date: "Sep 8, 2025" },
  { title: "Holiday Notice", desc: "Our office will be closed on Oct 1, 2025.", date: "Sep 5, 2025" },
  { title: "Ocean Freight Rate Update", desc: "New pricing effective from Sep 15, 2025.", date: "Sep 1, 2025" },
  { title: "System Maintenance", desc: "Scheduled maintenance on Sep 12, 2025 (2AM - 4AM).", date: "Aug 30, 2025" },
];
