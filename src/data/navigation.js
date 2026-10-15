import {
  LayoutDashboard, Package, Search, Container as ContainerIcon, Truck,
  Warehouse, UserRound, Receipt, CreditCard, FileText, WalletCards,
  BarChart3, Tags, UsersRound, ShieldCheck, Settings, RefreshCw,
  ScanLine, CircleDollarSign, ArrowDownToLine, ClipboardList, Database,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    section: "CONTROL CENTER",
    items: [
      { key: "dashboard", label: "Control Center", icon: LayoutDashboard, path: "/hfl-logistics" },
    ],
  },
  {
    section: "LOGISTICS WORKFLOW",
    items: [
      { key: "china-sync", label: "01 · China API Sync", icon: RefreshCw, path: "/china-api-sync" },
      { key: "china", label: "02 · China Warehouse", icon: Warehouse, path: "/china-warehouse" },
      { key: "packages", label: "03 · Packages", icon: Package, path: "/hfl-package" },
      { key: "containers", label: "04 · Containers", icon: ContainerIcon, path: "/container" },
      { key: "shipments", label: "05 · Shipments", icon: Truck, path: "/shipments" },
      { key: "tracking", label: "06 · Tracking", icon: Search, path: "/tracking" },
      { key: "cambodia", label: "07 · Cambodia Warehouse", icon: ArrowDownToLine, path: "/cambodia-warehouse" },
      { key: "billing", label: "08 · Billing & Payment", icon: Receipt, path: "/accounting/sales-invoice" },
      { key: "delivery", label: "09 · Delivery", icon: Truck, path: "/delivery" },
    ],
  },
  {
    section: "CUSTOMER & COMMERCIAL",
    items: [
      { key: "customers", label: "Customers", icon: UserRound, path: "/customer" },
      { key: "pricing", label: "Pricing", icon: Tags, path: "/pricing-list" },
    ],
  },
  {
    section: "FINANCE",
    items: [
      { key: "finance", label: "Finance Control Center", icon: CircleDollarSign, path: "/finance" },
      { key: "invoices", label: "Invoices", icon: Receipt, path: "/accounting/sales-invoice" },
      { key: "payments", label: "Payments", icon: CreditCard, path: "/accounting/payment-entry" },
      { key: "receipts", label: "Receipts", icon: FileText, path: "/finance" },
      { key: "income", label: "Income", icon: CircleDollarSign, path: "/finance" },
      { key: "expenses", label: "Expenses", icon: WalletCards, path: "/finance" },
      { key: "reports", label: "Reports & Audit", icon: BarChart3, path: "/reports" },
    ],
  },
  {
    section: "ADMINISTRATION",
    items: [
      { key: "users", label: "Users", icon: UsersRound, path: "/app-user" },
      { key: "roles", label: "Roles & Permissions", icon: ShieldCheck, path: "/app-user" },
      { key: "settings", label: "Settings", icon: Settings, path: "/hfl-settings" },
      { key: "test-data", label: "Test Data Management", icon: Database, path: "/test-data" },
    ],
  },
];

export const QUICK_ACTION_ROUTES = {
  "Receive Package": "/cambodia-warehouse",
  "Scan Package": "/tracking?scan=1",
  "Create Shipment": "/shipments",
  "New Container": "/container",
  "Create Invoice": "/accounting/sales-invoice",
  "Record Payment": "/accounting/payment-entry",
};

export const GLOBAL_SEARCH_ITEMS = [
  { label: "Packages", path: "/hfl-package", keywords: "package tracking parcel" },
  { label: "Tracking", path: "/tracking", keywords: "tracking package container shipment" },
  { label: "Containers", path: "/container", keywords: "container box cbm weight" },
  { label: "Shipments", path: "/shipments", keywords: "shipment sea land air" },
  { label: "China Warehouse", path: "/china-warehouse", keywords: "china warehouse packages" },
  { label: "China API Sync", path: "/china-api-sync", keywords: "china api synchronization import containers packages" },
  { label: "Cambodia Warehouse", path: "/cambodia-warehouse", keywords: "receive scan warehouse cambodia" },
  { label: "Customers", path: "/customer", keywords: "customer customer id history" },
  { label: "Invoices", path: "/accounting/sales-invoice", keywords: "invoice bill outstanding" },
  { label: "Payments", path: "/accounting/payment-entry", keywords: "payment receipt paid" },
  { label: "Pricing", path: "/pricing-list", keywords: "pricing rate cbm kg sea land air gc sc" },
];


// Route lookup used by Breadcrumb and Placeholder pages.
export const ROUTE_INDEX = Object.fromEntries(
  NAV_SECTIONS.flatMap((section) =>
    section.items.map((item) => [
      item.path.split('?')[0],
      {
        label: item.label,
        parentLabel: section.section,
        key: item.key,
      },
    ])
  )
);
