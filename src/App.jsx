import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./layout/AppLayout.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";
import Login from "./pages/Login.jsx";

import HflLogisticsHome from "./pages/HflLogisticsHome.jsx";
import Home from "./pages/Home.jsx";
import AccountingDashboard from "./pages/accounting/Dashboard.jsx";
import ApprovalsDashboard from "./pages/approvals/Dashboard.jsx";
import CrmDashboard from "./pages/crm/Dashboard.jsx";
import BuyingDashboard from "./pages/buying/Dashboard.jsx";
import StockDashboard from "./pages/stock/Dashboard.jsx";
import SellingDashboard from "./pages/selling/Dashboard.jsx";
import HrDashboard from "./pages/hr/Dashboard.jsx";

import {
  NAV_SECTIONS,
  QUICK_ACTION_ROUTES,
} from "./data/navigation.js";

import {
  DataImport,
  AppUser,
  CustomerGroup,
  PricingList,
  ShippingMode,
  HFLSettings,
} from "./pages/ReferencePages.jsx";

import HFLPackage from "./pages/HFLPackageManagement.jsx";
import HFLPackageDetails from "./pages/HFLPackageDetails.jsx";
import CustomerManagement from "./pages/CustomerManagement.jsx";
import Customer360 from "./pages/Customer360.jsx";
import SalesCustomerOverview from "./pages/SalesCustomerOverview.jsx";
import CustomerPortal from "./pages/CustomerPortal.jsx";
import PricingManagement from "./pages/PricingManagement.jsx";
import PricingBillingControlCenter from "./pages/PricingBillingControlCenter.jsx";
import ShippingModeManagement from "./pages/ShippingModeManagement.jsx";
import ShipmentManagement from "./pages/ShipmentManagement.jsx";
import TrackingManagement from "./pages/TrackingManagement.jsx";
import ChinaWarehouse from "./pages/ChinaWarehouse.jsx";
import ChinaApiSync from "./pages/ChinaApiSync.jsx";
import CambodiaWarehouse from "./pages/CambodiaWarehouse.jsx";
import BillingManagement from "./pages/BillingManagement.jsx";
import ContainerManagement from "./pages/ContainerManagement.jsx";
import DeliveryManagement from "./pages/DeliveryManagement.jsx";
import FinanceControlCenter from "./pages/FinanceControlCenter.jsx";
import ReportsControlCenter from "./pages/ReportsControlCenter.jsx";
import InvoicePrintView from "./pages/InvoicePrintView.jsx";
import InvoiceBillDetail from "./pages/InvoiceBillDetail.jsx";
import TestDataManagement from "./pages/TestDataManagement.jsx";

import {
  AuthProvider,
  useAuth,
} from "./auth/AuthContext.jsx";


const BUILT_ROUTES = {
  "/hfl-logistics": HflLogisticsHome,
  "/home": Home,

  "/accounting": AccountingDashboard,
  "/approvals": ApprovalsDashboard,
  "/crm": CrmDashboard,
  "/buying": BuyingDashboard,
  "/stock": StockDashboard,
  "/selling": SellingDashboard,
  "/hr": HrDashboard,

  "/hfl-package": HFLPackage,
  "/data-import": DataImport,
  "/app-user": AppUser,

  "/customer": CustomerManagement,
  "/customer/:id": Customer360,
  "/customer/sales": SalesCustomerOverview,
  "/customer-portal": CustomerPortal,
  "/customer-group": CustomerGroup,

  "/pricing-list": PricingBillingControlCenter,
  "/pricing-billing": PricingBillingControlCenter,
  "/shipping-mode": ShippingModeManagement,

  "/shipments": ShipmentManagement,

  "/tracking": TrackingManagement,
  "/tracking-number": TrackingManagement,

  "/china-warehouse": ChinaWarehouse,
  "/china-api-sync": ChinaApiSync,
  "/cambodia-warehouse": CambodiaWarehouse,

  "/container": ContainerManagement,
  "/delivery": DeliveryManagement,
  "/finance": FinanceControlCenter,
  "/reports": ReportsControlCenter,

  "/hfl-settings": HFLSettings,
  "/test-data": TestDataManagement,

  "/crm/quotations": () => (
    <BillingManagement view="quotation" />
  ),

  "/selling/quotation": () => (
    <BillingManagement view="quotation" />
  ),

  "/accounting/sales-invoice": () => (
    <BillingManagement view="invoice" />
  ),

  "/selling/sales-invoice": () => (
    <BillingManagement view="invoice" />
  ),

  "/accounting/payment-entry": () => (
    <BillingManagement view="all" />
  ),
};


const ALL_PATHS = [
  ...new Set([
    ...NAV_SECTIONS.flatMap((section) =>
      section.items.flatMap((item) => [
        item.path,
        ...(item.children || []).map(
          (child) => child.path
        ),
      ])
    ),

    ...Object.keys(QUICK_ACTION_ROUTES),
    ...Object.keys(BUILT_ROUTES),

    "/customer-portal",
  ]),
];


function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">
          Loading HFL Logistics...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>

        <Route
          index
          element={<Navigate to="/home" replace />}
        />

        <Route
          path="/hfl-package/:id"
          element={<HFLPackageDetails />}
        />

        <Route
          path="/accounting/sales-invoice/:id"
          element={<InvoicePrintView user={user} />}
        />

        <Route
          path="/accounting/sales-invoice/:id/edit"
          element={<InvoiceBillDetail />}
        />

        {ALL_PATHS.map((path) => {
          const Component =
            BUILT_ROUTES[path] || PlaceholderPage;

          return (
            <Route
              key={path}
              path={path}
              element={<Component />}
            />
          );
        })}

        <Route
          path="*"
          element={<PlaceholderPage />}
        />

      </Route>
    </Routes>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <Routes>

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="*"
          element={<ProtectedRoutes />}
        />

      </Routes>
    </AuthProvider>
  );
}
