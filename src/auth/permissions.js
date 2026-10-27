export const PAGE_PERMISSIONS = {
  "/hfl-logistics": "dashboard.view",
  "/home": "dashboard.view",

  "/accounting": "dashboard.view",
  "/approvals": "approvals.view",
  "/crm": "crm.view",
  "/buying": "buying.view",
  "/stock": "stock.view",
  "/selling": "selling.view",
  "/hr": "hr.view",

  "/hfl-package": "packages.view",
  "/hfl-package/:id": "packages.view",
  "/data-import": "data_import.manage",

  "/app-user": "users.manage",

  "/customer": "customers.view",
  "/customer/:id": "customers.view",
  "/customer/sales": "customers.view",
  "/customer-portal": "customers.view",
  "/customer-group": "customers.manage",

  "/pricing-list": "pricing.view",
  "/pricing-billing": "pricing.view",
  "/shipping-mode": "settings.manage",

  "/shipments": "shipments.view",
  "/tracking": "tracking.view",
  "/tracking-number": "tracking.view",

  "/china-warehouse": "china_warehouse.view",
  "/china-api-sync": "china_sync.view",
  "/cambodia-warehouse": "cambodia_warehouse.view",

  "/container": "containers.view",
  "/delivery": "deliveries.view",

  "/finance": "finance.view",
  "/reports": "report.view",

  "/hfl-settings": "settings.manage",
  "/test-data": "test-data.manage",

  "/crm/quotations": "quotation.view",
  "/selling/quotation": "quotation.view",

  "/accounting/sales-invoice": "invoice.view",
  "/accounting/sales-invoice/:id": "invoice.view",
  "/accounting/sales-invoice/:id/edit": "invoice.create",
  "/selling/sales-invoice": "invoice.view",
  "/accounting/payment-entry": "payment.view",
};

function normalizePath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

function findRequiredPermission(pathname) {
  const path = normalizePath(pathname);

  if (PAGE_PERMISSIONS[path]) {
    return PAGE_PERMISSIONS[path];
  }

  const dynamicRoutes = Object.keys(PAGE_PERMISSIONS)
    .filter((route) => route.includes("/:"))
    .sort((a, b) => b.length - a.length);

  for (const route of dynamicRoutes) {
    const routePattern = new RegExp(
      "^" +
        route
          .split("/")
          .map((part) =>
            part.startsWith(":")
              ? "[^/]+"
              : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          )
          .join("/") +
        "$"
    );

    if (routePattern.test(path)) {
      return PAGE_PERMISSIONS[route];
    }
  }

  return null;
}

export function hasPermission(user, permission) {
  if (!user) return false;

  const role = String(user.role || "")
    .trim()
    .toLowerCase();

  if (role === "super admin") return true;

  if (!permission) return false;

  const permissions = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  return permissions.includes(permission);
}

export function canAccessPage(user, pathname) {
  const requiredPermission = findRequiredPermission(pathname);

  if (!requiredPermission) {
    return String(user?.role || "").trim().toLowerCase() ===
      "super admin";
  }

  return hasPermission(user, requiredPermission);
}
