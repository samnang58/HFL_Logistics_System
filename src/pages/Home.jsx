import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane,
  Ship,
  Truck,
  Archive,
  Warehouse as WarehouseIcon,
  Package,
  Users,
  Boxes,
  CheckCircle,
  Clock,
  Cloud,
  UserCircle,
  User,
  Tag,
  Settings,
  Info,
  Warehouse,
  Calendar,
  DollarSign,
  Wrench,
  Search,
  ArrowRight,
  MapPin,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardHeader,
  Dropdown,
  ViewAllLink,
} from "../components/ui/Card.jsx";

import StatCard from "../components/ui/StatCard.jsx";

import { dashboardService, trackingService } from "../services/resourceService.js";

const STAT_ICONS = [
  Package,
  Users,
  Boxes,
  Truck,
  CheckCircle,
  Clock,
];

const QUICK_ACTION_ICONS = {
  "HFL Package": Package,
  "Tracking Number": Search,
  "Data Import": Cloud,
  "App User": UserCircle,
  Customer: User,
  "Customer Group": Users,
  "Pricing List": Tag,
  "Shipping Mode": Truck,
  "HFL Settings": Settings,
};

const NOTICE_ICON_MAP = [
  Info,
  Warehouse,
  Calendar,
  DollarSign,
  Wrench,
];

const NOTICE_BG = [
  "bg-blue-100 text-blue-600",
  "bg-orange-100 text-orange-600",
  "bg-rose-100 text-rose-600",
  "bg-violet-100 text-violet-600",
  "bg-blue-100 text-blue-600",
];

const QUICK_ACTIONS = [
  "HFL Package",
  "Tracking Number",
  "Customer",
  "Pricing List",
  "Shipping Mode",
  "HFL Settings",
];

const SYSTEM_NOTICES = [
  {
    title: "China warehouse",
    text: "Package synchronization is available.",
  },
  {
    title: "Shipment tracking",
    text: "Track packages from China to Cambodia.",
  },
  {
    title: "Warehouse",
    text: "Review received packages and movements.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const quickActionRoutes = {
    "HFL Package": "/hfl-package",
    "Tracking Number": "/tracking-number",
    "Data Import": "/data-import",
    "App User": "/app-user",
    Customer: "/customer",
    "Customer Group": "/customer-group",
    "Pricing List": "/pricing-list",
    "Shipping Mode": "/shipping-mode",
    "HFL Settings": "/hfl-settings",
  };

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError("");

        const response = await dashboardService.get();

        const data =
          response?.data?.data ??
          response?.data ??
          {};

        if (active) {
          setDashboard(data);
        }
      } catch (error) {
        console.error("Dashboard API error:", error);

        if (active) {
          setDashboard({});
          setDashboardError(
            error?.message || "Unable to load dashboard data."
          );
        }
      } finally {
        if (active) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const data = dashboard || {};

    return [
      {
        label: "Total Shipments",
        value: Number(data.shipments || 0).toLocaleString(),
        change: "",
        direction: "up",
        iconBg: "bg-blue-600",
      },
      {
        label: "Total Customers",
        value: Number(data.customers || 0).toLocaleString(),
        change: "",
        direction: "up",
        iconBg: "bg-emerald-600",
      },
      {
        label: "Total Packages",
        value: Number(data.packages || 0).toLocaleString(),
        change: "",
        direction: "up",
        iconBg: "bg-amber-500",
      },
      {
        label: "In Transit",
        value: Number(data.in_transit || 0).toLocaleString(),
        change: "",
        direction: "up",
        iconBg: "bg-violet-600",
      },
      {
        label: "Delivered",
        value: Number(data.delivered || 0).toLocaleString(),
        change: "",
        direction: "up",
        iconBg: "bg-rose-500",
      },
      {
        label: "Pending",
        value: Number(data.waiting_receive || 0).toLocaleString(),
        change: "",
        direction: "down",
        iconBg: "bg-slate-500",
      },
    ];
  }, [dashboard]);

  const shipmentTrend = useMemo(() => {
    const data = dashboard || {};

    return [
      {
        date: "Current",
        total: Number(data.shipments || 0),
        delivered: Number(data.delivered || 0),
        transit: Number(data.in_transit || 0),
        pending: Number(data.waiting_receive || 0),
      },
    ];
  }, [dashboard]);

  const shipmentByCountry = useMemo(() => {
    const data = dashboard || {};

    return [
      {
        flag: "🇨🇳",
        country: "China",
        value: Number(data.shipments || 0),
      },
      {
        flag: "🇰🇭",
        country: "Cambodia",
        value: Number(data.arrived_cambodia || 0),
      },
    ];
  }, [dashboard]);

  const handleTrack = async () => {
    const value = trackingNumber.trim();

    if (!value) {
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackingError("");
      setTrackResult(null);

      const response = await trackingService.get(value);

      const data =
        response?.data?.data ??
        response?.data ??
        {};

      const pkg = data?.package || data;

      if (!pkg) {
        throw new Error("Package not found.");
      }

      setTrackResult({
        number:
          pkg.tracking_number ||
          pkg.hfl_package_code ||
          value,

        status:
          pkg.status ||
          "Unknown",

        location:
          pkg.warehouse_location ||
          pkg.current_location ||
          pkg.from_warehouse ||
          "—",

        eta:
          pkg.eta ||
          "—",

        container:
          pkg.container_number ||
          data.container_number ||
          "—",

        shipment:
          pkg.shipment_number ||
          data.shipment_number ||
          "—",
      });
    } catch (error) {
      console.error("Tracking error:", error);

      setTrackingError(
        error?.message || "Package not found."
      );

      setTrackResult(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* HERO */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-sky-50 via-blue-50 to-blue-100 border border-blue-100">
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,#1d4ed8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative px-6 sm:px-8 py-7 flex flex-wrap justify-between gap-6">

          <div className="max-w-xl">

            <p className="text-[11px] font-bold tracking-[0.2em] text-blue-600 mb-2">
              FAST · SAFE · WORLDWIDE
            </p>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              HFL <span className="text-blue-600">Logistics</span>
            </h1>

            <p className="text-slate-700 font-medium mt-1">
              Connecting Businesses Across Borders
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Your trusted partner for global shipping, freight, and supply chain solutions.
            </p>

            <div className="flex flex-wrap gap-3 mt-4">

              <button
                onClick={() => navigate("/shipments")}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Shipment
                <ArrowRight size={15} />
              </button>

              <button
                onClick={() => navigate("/tracking-number")}
                className="flex items-center gap-2 bg-white text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Search size={15} />
                Track Your Package
              </button>

            </div>

            <div className="flex flex-wrap gap-4 mt-5">

              {[
                {
                  icon: Plane,
                  label: "Air Freight",
                  sub: "Fast & Reliable",
                },
                {
                  icon: Ship,
                  label: "Sea Freight",
                  sub: "Cost Effective",
                },
                {
                  icon: Truck,
                  label: "Land Transport",
                  sub: "Wide Coverage",
                },
                {
                  icon: Archive,
                  label: "Customs Clearance",
                  sub: "Smooth Process",
                },
                {
                  icon: WarehouseIcon,
                  label: "Warehousing",
                  sub: "Safe Storage",
                },
                {
                  icon: Package,
                  label: "Door to Door",
                  sub: "Complete Service",
                },
              ].map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-2"
                >
                  <Icon
                    size={17}
                    className="text-blue-600"
                    strokeWidth={1.8}
                  />

                  <div className="leading-tight">
                    <p className="text-[12px] font-medium text-slate-700">
                      {label}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      {sub}
                    </p>
                  </div>
                </div>
              ))}

            </div>

          </div>

          <div className="hidden lg:flex flex-col items-end justify-between shrink-0">

            <p className="text-slate-600 text-sm font-medium text-right leading-snug">
              Delivering
              <br />
              Opportunities
              <br />
              Worldwide
            </p>

            <div className="bg-slate-800/90 text-white rounded-xl px-4 py-3 mt-6 max-w-[220px]">
              <p className="italic text-sm leading-snug">
                "More than logistics, we move your world."
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

        {stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            icon={STAT_ICONS[index]}
            iconBg={stat.iconBg}
            label={stat.label}
            value={
              dashboardLoading
                ? "..."
                : stat.value
            }
            change={stat.change}
            direction={stat.direction}
            changeLabel=""
            menu={false}
          />
        ))}

      </div>

      {dashboardError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
          {dashboardError}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_320px] gap-5">

        {/* SHIPMENT OVERVIEW */}
        <Card>

          <CardHeader
            icon={Package}
            title="Shipment Overview"
            subtitle="Live shipment statistics"
            right={
              <Dropdown
                label="Current"
                options={[
                  "Current",
                  "Last 30 Days",
                  "Last 90 Days",
                ]}
              />
            }
          />

          <div className="px-4 pb-2 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Total Shipments
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Delivered
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              In Transit
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Pending
            </span>

          </div>

          <div className="h-56 px-3 pb-4">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={shipmentTrend}
                margin={{
                  top: 5,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >

                <CartesianGrid
                  vertical={false}
                  stroke="#f1f5f9"
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 10,
                    fill: "#94a3b8",
                  }}
                  tickLine={false}
                  axisLine={{
                    stroke: "#e2e8f0",
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#94a3b8",
                  }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />

                <Line
                  type="monotone"
                  dataKey="delivered"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />

                <Line
                  type="monotone"
                  dataKey="transit"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />

                <Line
                  type="monotone"
                  dataKey="pending"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />

              </LineChart>
            </ResponsiveContainer>

          </div>

        </Card>

        {/* SHIPMENT BY COUNTRY */}
        <Card>

          <CardHeader
            icon={MapPin}
            title="Shipment by Country"
            right={
              <ViewAllLink label="View Details" />
            }
          />

          <div className="relative h-40 mx-3 rounded-lg bg-slate-50 overflow-hidden">

            <svg
              viewBox="0 0 400 160"
              className="w-full h-full"
            >
              {Array.from({ length: 13 }).map((_, row) =>
                Array.from({ length: 34 }).map((_, col) => (
                  <circle
                    key={`${row}-${col}`}
                    cx={col * 12 + 4}
                    cy={row * 12 + 4}
                    r="1"
                    fill="#cbd5e1"
                  />
                ))
              )}

              <path
                d="M80,120 C140,80 220,60 300,40"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              <path
                d="M300,40 C320,70 320,100 340,110"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              <circle
                cx="80"
                cy="120"
                r="4"
                fill="#1d4ed8"
              />

              <circle
                cx="300"
                cy="40"
                r="4"
                fill="#1d4ed8"
              />

              <circle
                cx="340"
                cy="110"
                r="4"
                fill="#1d4ed8"
              />
            </svg>

          </div>

          <div className="px-5 py-3 space-y-2">

            {shipmentByCountry.map((country) => (
              <div
                key={country.country}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="flex items-center gap-2 text-slate-600">
                  <span>{country.flag}</span>
                  {country.country}
                </span>

                <span className="font-medium text-slate-800">
                  {country.value.toLocaleString()}
                </span>
              </div>
            ))}

          </div>

          <div className="grid grid-cols-3 gap-2 px-5 pb-4 pt-1 border-t border-slate-100">

            <div className="text-center">
              <p className="font-bold text-slate-900">
                {dashboard?.shipments ?? 0}
              </p>
              <p className="text-[10px] text-slate-400">
                Shipments
              </p>
            </div>

            <div className="text-center">
              <p className="font-bold text-slate-900">
                {dashboard?.arrived_cambodia ?? 0}
              </p>
              <p className="text-[10px] text-slate-400">
                Cambodia
              </p>
            </div>

            <div className="text-center">
              <p className="font-bold text-slate-900">
                {dashboard?.containers ?? 0}
              </p>
              <p className="text-[10px] text-slate-400">
                Containers
              </p>
            </div>

          </div>

        </Card>

        {/* QUICK TRACKING */}
        <Card>

          <CardHeader
            icon={Search}
            title="Quick Tracking"
          />

          <div className="px-5 pb-5">

            <div className="flex items-center gap-2 mb-4">

              <input
                value={trackingNumber}
                onChange={(event) =>
                  setTrackingNumber(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleTrack();
                  }
                }}
                placeholder="Tracking number / HFL package"
                className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-400"
              />

              <button
                onClick={handleTrack}
                disabled={trackingLoading}
                className="w-10 h-10 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
              >
                <Search size={16} />
              </button>

            </div>

            {trackingError && (
              <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                {trackingError}
              </div>
            )}

            {trackResult ? (

              <div className="border border-blue-100 bg-blue-50 rounded-lg p-3 text-xs space-y-1">

                <p className="font-semibold text-slate-800">
                  {trackResult.number}
                </p>

                <p className="text-slate-600">
                  Status:
                  <span className="font-medium text-blue-600 ml-1">
                    {trackResult.status}
                  </span>
                </p>

                <p className="text-slate-600">
                  Location: {trackResult.location}
                </p>

                <p className="text-slate-600">
                  ETA: {trackResult.eta}
                </p>

                <p className="text-slate-600">
                  Container: {trackResult.container}
                </p>

                <p className="text-slate-600">
                  Shipment: {trackResult.shipment}
                </p>

              </div>

            ) : (

              <div className="flex flex-col items-center text-center gap-3 py-4">

                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Package
                    size={28}
                    className="text-blue-600"
                  />
                </div>

                <p className="font-semibold text-slate-800 text-sm">
                  Track Your Shipment
                </p>

                <p className="text-[11px] text-slate-400 max-w-[180px]">
                  Enter your tracking number to get real-time shipment status and location.
                </p>

              </div>

            )}

          </div>

        </Card>

      </div>

      {/* QUICK ACTIONS */}
      <Card>

        <CardHeader
          icon={Package}
          title="Quick Actions"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 p-5">

          {QUICK_ACTIONS.map((action) => {

            const Icon =
              QUICK_ACTION_ICONS[action] || Package;

            return (
              <button
                key={action}
                onClick={() =>
                  navigate(
                    quickActionRoutes[action] || "/"
                  )
                }
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>

                <span className="text-sm font-medium text-slate-700">
                  {action}
                </span>
              </button>
            );
          })}

        </div>

      </Card>

      {/* SYSTEM NOTICE */}
      <Card>

        <CardHeader
          icon={Info}
          title="System Notice"
        />

        <div className="divide-y">

          {SYSTEM_NOTICES.map((notice, index) => {

            const Icon =
              NOTICE_ICON_MAP[index] || Info;

            return (
              <div
                key={notice.title}
                className="flex items-start gap-3 p-4"
              >

                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    NOTICE_BG[index] || NOTICE_BG[0]
                  }`}
                >
                  <Icon size={17} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {notice.title}
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {notice.text}
                  </p>
                </div>

              </div>
            );
          })}

        </div>

      </Card>

    </div>
  );
}
