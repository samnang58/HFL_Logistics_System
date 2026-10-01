export const FREIGHT_SERVICES = [
  "Air Freight", "Sea Freight", "Land Transport",
  "Customs Clearance", "Warehousing", "Door to Door",
];

export const HFL_KPI_CARDS = [
  { label: "NEW MOBILE USER REGISTERED", value: "1", change: "100%", changeLabel: "vs yesterday", iconBg: "bg-blue-600", tint: "bg-blue-50" },
  { label: "TOTAL MOBILE USER", value: "332", change: "12%", changeLabel: "vs last month", iconBg: "bg-emerald-600", tint: "bg-emerald-50" },
  { label: "NEW CUSTOMER REGISTERED", value: "0", change: "0%", changeLabel: "vs yesterday", iconBg: "bg-rose-500", tint: "bg-rose-50" },
  { label: "TOTAL CUSTOMER REGISTERED", value: "179", change: "0%", changeLabel: "since yesterday", iconBg: "bg-violet-600", tint: "bg-violet-50" },
];

export const PACKAGE_STATUS_DATA = [
  { name: "Unloaded", value: 6800 },
  { name: "Customs Clearance", value: 3450 },
  { name: "Arrival", value: 260 },
  { name: "On the way", value: 240 },
  { name: "Received at Warehouse", value: 520, highlight: true, tooltipValue: 74, tooltipLabel: "Received at China Warehouse" },
  { name: "In Process", value: 810 },
  { name: "Out for Delivery", value: 190 },
  { name: "Delivered", value: 700 },
];

export const SHIPMENT_STATS = [
  { label: "Total Shipments", value: "1,248" },
  { label: "In Transit", value: "864" },
  { label: "Delivered", value: "352" },
  { label: "Pending", value: "56" },
];

export { RECENT_ACTIVITIES, QUICK_ACTIONS, SYSTEM_NOTICES } from "./homeData.js";
