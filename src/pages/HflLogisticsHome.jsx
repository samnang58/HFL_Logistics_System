import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../services/resourceService";
import { formatHflDateTime, formatHflTime } from "../utils/dateTime.js";
import {
  Activity, ArrowRight, ArrowUpRight, Box, CheckCircle2, CircleAlert,
  Clock3, Container, CreditCard, DollarSign, Package, QrCode, Search,
  Ship, Truck, UserRound, Warehouse, Receipt, RefreshCw, ScanLine,
  MapPin, ChevronRight, MoreHorizontal, Boxes, CircleDollarSign,
} from "lucide-react";

const EMPTY_DASHBOARD = {
  packages: 0,
  containers: 0,
  shipments: 0,
  inTransit: 0,
  chinaWarehouse: 0,
  arrivedCambodia: 0,
  waitingReceive: 0,
  readyBilling: 0,
  readyDelivery: 0,
  delivered: 0,
  outstanding: 0,
  deliveredRate: 0,
  totalCbm: 0,
  totalWeight: 0,
  recentActivities: [],
  lastSync: null,
  chinaApiMode: "mock",
};

function toneClasses(tone) {
  return {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-rose-50 text-rose-600",
  }[tone] || "bg-slate-100 text-slate-600";
}

function activityIconType(status = "") {
  const value = String(status).toUpperCase();
  if (value.includes("CONTAINER") || value.includes("LOADED") || value.includes("LOADING")) return "container";
  if (value.includes("WAREHOUSE") || value.includes("RECEIVED")) return "warehouse";
  if (value.includes("PAYMENT") || value.includes("PAID")) return "payment";
  if (value.includes("TRANSIT") || value.includes("ARRIVED")) return "tracking";
  return "package";
}

function Kpi({ icon: Icon, label, value, tone = "blue", onClick, detail }) {
  return (
    <button onClick={onClick} className="group text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses(tone)}`}><Icon size={19} /></span>
        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-500" />
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      {detail && <p className="mt-2 text-[10px] text-slate-400">{detail}</p>}
    </button>
  );
}

function Action({ icon: Icon, label, desc, onClick }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-300 hover:bg-blue-50/30 transition-all">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon size={17} /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-0.5 block truncate text-[11px] text-slate-400">{desc}</span></span>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
    </button>
  );
}

function ActivityIcon({ type, tone }) {
  const Icon = type === "container" ? Container : type === "tracking" ? MapPin : type === "warehouse" ? Warehouse : type === "payment" ? CircleDollarSign : Package;
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClasses(tone)}`}><Icon size={16} /></span>;
}

export default function HflLogisticsHome() {
  const navigate = useNavigate();
  const [range, setRange] = useState("Today");
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoadError("");
      const response = await dashboardService.get();
      const data = response?.data || response || {};
      setDashboard({
        ...EMPTY_DASHBOARD,
        packages: Number(data.packages || 0),
        containers: Number(data.containers || 0),
        shipments: Number(data.shipments || 0),
        inTransit: Number(data.in_transit || 0),
        chinaWarehouse: Number(data.china_warehouse || 0),
        arrivedCambodia: Number(data.arrived_cambodia || 0),
        waitingReceive: Number(data.waiting_receive || 0),
        readyBilling: Number(data.ready_billing || 0),
        readyDelivery: Number(data.ready_delivery || 0),
        delivered: Number(data.delivered || 0),
        outstanding: Number(data.outstanding || 0),
        deliveredRate: Number(data.delivered_rate || 0),
        totalCbm: Number(data.total_cbm || 0),
        totalWeight: Number(data.total_weight || 0),
        recentActivities: Array.isArray(data.recent_activities) ? data.recent_activities : [],
        lastSync: data.last_sync || null,
        chinaApiMode: data.china_api_mode || "mock",
      });
    } catch (error) {
      setLoadError(error?.message || "Unable to load dashboard data");
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const deliveredRate = dashboard.deliveredRate;

  const queue = [
    { label: "Waiting to receive", value: dashboard.waitingReceive, desc: "Packages arrived and need warehouse receiving", path: "/cambodia-warehouse", icon: Clock3, tone: "amber" },
    { label: "Ready for billing", value: dashboard.readyBilling, desc: "Packages ready to generate customer invoices", path: "/accounting/sales-invoice", icon: Receipt, tone: "blue" },
    { label: "Ready for delivery", value: dashboard.readyDelivery, desc: "Paid packages ready for last-mile delivery", path: "/delivery", icon: Truck, tone: "emerald" },
  ];

  const refresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    window.setTimeout(() => setRefreshing(false), 350);
  };

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto max-w-[1680px] space-y-5 p-4 md:p-6">
        {/* Header */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600"><Activity size={14} /> HFL Logistics</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Logistics Control Center</h1>
            <p className="mt-1 text-sm text-slate-500">Monitor packages, containers, shipments, warehouses and delivery operations from one place.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">Live database</span>
              {loadError ? <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">{loadError}</span> : <span className="text-slate-400">Numbers are loaded from HFL API / MySQL</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate("/tracking")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-blue-300"><Search size={16} /> Global Tracking</button>
            <button onClick={refresh} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh</button>
          </div>
        </section>

        {/* Operational banner */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,.30),transparent_32%)]" />
          <div className="relative grid gap-6 p-5 md:p-7 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-blue-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Operations online</div>
              <h2 className="mt-2 max-w-3xl text-xl font-bold md:text-2xl">China → Cambodia logistics, controlled in one workflow.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">China API → China Warehouse → Package → Container → Shipment → Tracking → Cambodia Warehouse → Billing & Payment → Delivery.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => navigate("/cambodia-warehouse")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"><ScanLine size={16} /> Receive Package</button>
                <button onClick={() => navigate("/container")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><Container size={16} /> Container Control</button>
                <button onClick={() => navigate("/shipments")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><Ship size={16} /> Shipments</button>
              </div>
            </div>
            <div className="hidden xl:flex items-center gap-3 pr-5 text-slate-500">
              <Warehouse size={38} /><ArrowRight size={20} /><Boxes size={40} /><ArrowRight size={20} /><Truck size={40} />
            </div>
          </div>
        </section>

        {/* KPI */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Kpi icon={Package} label="Total Packages" value={dashboard.packages.toLocaleString()} detail="All active packages" onClick={() => navigate("/hfl-package")} />
          <Kpi icon={Container} label="Containers" value={dashboard.containers} detail="Active containers" tone="violet" onClick={() => navigate("/container")} />
          <Kpi icon={Ship} label="Shipments" value={dashboard.shipments} detail="Open shipments" tone="blue" onClick={() => navigate("/shipments")} />
          <Kpi icon={Truck} label="In Transit" value={dashboard.inTransit} detail="Moving to Cambodia" tone="amber" onClick={() => navigate("/tracking")} />
          <Kpi icon={Warehouse} label="Cambodia WH" value={dashboard.arrivedCambodia} detail="Packages at warehouse" tone="violet" onClick={() => navigate("/cambodia-warehouse")} />
          <Kpi icon={Clock3} label="Waiting Receive" value={dashboard.waitingReceive} detail="Needs action" tone="amber" onClick={() => navigate("/cambodia-warehouse")} />
          <Kpi icon={CheckCircle2} label="Delivered" value={dashboard.delivered} detail={`${deliveredRate}% of packages`} tone="emerald" onClick={() => navigate("/delivery")} />
          <Kpi icon={DollarSign} label="Outstanding" value={`$${dashboard.outstanding.toLocaleString()}`} detail="Customer receivables" tone="red" onClick={() => navigate("/accounting/payment-entry")} />
        </section>

        {/* Flow + Quick Operations */}
        <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-bold text-slate-900">Shipment Flow</h2><p className="mt-1 text-xs text-slate-400">Live operational pipeline overview</p></div>
              <div className="flex items-center gap-2"><select value={range} onChange={(e) => setRange(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none"><option>Today</option><option>Last 7 Days</option><option>Last 30 Days</option></select><button onClick={() => navigate("/tracking")} className="text-xs font-semibold text-blue-600">Open Tracking →</button></div>
            </div>
            <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-9">
              {[
                ["China Warehouse", dashboard.chinaWarehouse, "text-blue-600", "/china-warehouse"],
                ["Packages", dashboard.packages, "text-cyan-600", "/hfl-package"],
                ["Containers", dashboard.containers, "text-violet-600", "/container"],
                ["Shipments", dashboard.shipments, "text-indigo-600", "/shipments"],
                ["In Transit", dashboard.inTransit, "text-amber-600", "/tracking"],
                ["Cambodia WH", dashboard.arrivedCambodia, "text-violet-600", "/cambodia-warehouse"],
                ["Billing / Payment", dashboard.readyBilling, "text-rose-600", "/accounting/sales-invoice"],
                ["Delivery", dashboard.readyDelivery, "text-emerald-600", "/delivery"],
                ["Delivered", dashboard.delivered, "text-slate-700", "/delivery"],
              ].map(([label, value, color, path], index) => (
                <React.Fragment key={label}>
                  <button onClick={() => navigate(path)} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all">
                    <p className={`text-xl font-bold ${color}`}>{value.toLocaleString()}</p><p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
                  </button>
                  {index < 4 && <ArrowRight size={15} className="mx-auto hidden self-center text-slate-300 md:block" />}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between text-[11px] text-slate-400"><span>Delivery completion</span><span className="font-semibold text-slate-600">{deliveredRate}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${deliveredRate}%` }} /></div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Quick Operations</h2><p className="mt-1 text-xs text-slate-400">Most-used logistics actions</p></div><QrCode size={19} className="text-blue-600" /></div>
            <div className="mt-4 grid gap-2">
              <Action icon={RefreshCw} label="Sync China Packages" desc="Pull latest packages and container data" onClick={() => navigate("/china-api-sync")} />
              <Action icon={Warehouse} label="China Warehouse" desc="Review received packages and loading queue" onClick={() => navigate("/china-warehouse")} />
              <Action icon={Package} label="Package Operations" desc="Measure, assign and manage packages" onClick={() => navigate("/hfl-package")} />
              <Action icon={Container} label="Container Control" desc="Assign packages and manage container movement" onClick={() => navigate("/container")} />
              <Action icon={Truck} label="Shipment Planning" desc="Prepare sea / land shipment movement" onClick={() => navigate("/shipments")} />
              <Action icon={Search} label="Global Tracking" desc="Find package, container or shipment" onClick={() => navigate("/tracking")} />
              <Action icon={ScanLine} label="Receive Cambodia WH" desc="Scan and receive arrived packages" onClick={() => navigate("/cambodia-warehouse")} />
              <Action icon={Receipt} label="Billing & Payment" desc="Invoice, payment and outstanding balance" onClick={() => navigate("/accounting/sales-invoice")} />
              <Action icon={Truck} label="Dispatch Delivery" desc="Schedule and complete last-mile delivery" onClick={() => navigate("/delivery")} />
            </div>
          </div>
        </section>

        {/* Queue + Activity + Health */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Operational Queue</h2><p className="mt-1 text-xs text-slate-400">Work that needs attention</p></div><CircleAlert size={18} className="text-amber-500" /></div>
            <div className="mt-4 divide-y divide-slate-100">
              {queue.map((item) => <button key={item.label} onClick={() => navigate(item.path)} className="group flex w-full items-center gap-3 py-3.5 text-left"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses(item.tone)}`}><item.icon size={16} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{item.label}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-400">{item.desc}</span></span><span className="font-bold text-slate-900">{item.value}</span><ChevronRight size={15} className="text-slate-300 group-hover:text-blue-500" /></button>)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Recent Activity</h2><p className="mt-1 text-xs text-slate-400">Latest operational events</p></div><button className="text-slate-400 hover:text-slate-700"><MoreHorizontal size={18} /></button></div>
            <div className="mt-4 space-y-1">
              {dashboard.recentActivities.length ? dashboard.recentActivities.map((item) => {
                const type = activityIconType(item.status);
                const tone = type === "warehouse" ? "emerald" : type === "tracking" ? "amber" : type === "container" ? "violet" : "blue";
                const title = item.tracking_number ? `Package ${item.tracking_number} updated` : `Logistics event ${item.status || "updated"}`;
                const meta = [item.status, item.location || item.warehouse, item.note].filter(Boolean).join(" · ");
                const time = item.event_at ? formatHflTime(item.event_at) : "";
                return <div key={item.id} className="flex items-start gap-3 rounded-xl p-2 hover:bg-slate-50"><ActivityIcon type={type} tone={tone} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{title}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{meta || "Operational update"}</p></div><span className="text-[10px] text-slate-400">{time}</span></div>;
              }) : <p className="py-6 text-center text-xs text-slate-400">No tracking activity yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">System Health</h2><p className="mt-1 text-xs text-slate-400">UX preview status panel</p></div><Activity size={18} className="text-emerald-500" /></div>
            <div className="mt-4 divide-y divide-slate-100">
              {[["China API Sync", dashboard.lastSync?.synced_at ? `Last sync ${formatHflDateTime(dashboard.lastSync.synced_at)}` : "No sync recorded", dashboard.chinaApiMode === "mock" ? "Mock API" : "Connected"],["Logistics Database", "Live MySQL data", "Online"],["Warehouse Operations", `${dashboard.chinaWarehouse + dashboard.arrivedCambodia} packages in warehouse flow`, "Ready"],["Payment Operations", `${dashboard.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding`, "Live"]].map(([title, sub, status]) => <div key={title} className="flex items-center gap-3 py-3"><span className="h-2 w-2 rounded-full bg-emerald-500" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-[10px] text-slate-400">{sub}</p></div><span className="text-[10px] font-semibold text-emerald-600">{status}</span></div>)}
            </div>
            <button onClick={() => navigate("/china-api-sync")} className="mt-4 w-full rounded-xl bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600">Open China API Sync →</button>
          </div>
        </section>
      </div>
    </div>
  );
}
