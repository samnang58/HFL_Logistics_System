import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Box, Boxes, CheckCircle2, ChevronRight, CircleDollarSign,
  Clock3, Container, ExternalLink, FileText, MapPin, Package as PackageIcon,
  Printer, RefreshCw, Route, ScanLine, Search, Truck, UserRound, Warehouse,
  Weight, XCircle
} from 'lucide-react';
import PrintPackageModal from './PrintPackageModal.jsx';
import { getPackage } from '../services/packageApiService.js';
import { formatHflDateTime } from '../utils/dateTime.js';
import { ProductGallery } from '../components/ProductImages.jsx';

const tabs = [
  ['overview', 'Overview'], ['boxes', 'Boxes'], ['tracking', 'Tracking'],
  ['container', 'Container'], ['shipment', 'Shipment'], ['warehouse', 'Warehouse'],
  ['pricing', 'Pricing'], ['invoice', 'Invoice'], ['payment', 'Payment'],
];

const money = (n, currency='USD') => `${currency} ${Number(n || 0).toFixed(2)}`;
const fmtDate = (v) => formatHflDateTime(v);
const statusTone = (status='') => {
  const s = status.toLowerCase();
  if (s.includes('deliver') || s.includes('paid') || s.includes('arrived')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (s.includes('problem') || s.includes('cancel') || s.includes('fail')) return 'bg-rose-50 text-rose-700 border-rose-100';
  if (s.includes('wait') || s.includes('pending') || s.includes('inspection')) return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-blue-50 text-blue-700 border-blue-100';
};

function Badge({ children }) { return <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusTone(children)}`}>{children || '—'}</span>; }
function Stat({ icon: Icon, label, value, sub }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{label}</span><Icon size={17} className="text-blue-600" /></div><div className="mt-2 text-xl font-bold text-slate-900">{value}</div>{sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}</div>; }
function Card({ title, icon: Icon, action, children }) { return <section className="rounded-xl border border-slate-200 bg-white overflow-hidden"><div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Icon size={17} className="text-blue-600" />{title}</div>{action}</div>{children}</section>; }
function Empty({ text }) { return <div className="p-8 text-center text-sm text-slate-500">{text}</div>; }

export default function HFLPackageDetails() {
  const nav = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printOpen, setPrintOpen] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { setData(await getPackage(id)); }
    catch (e) { setError(e.message || 'Unable to load package.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const pkg = data;
  const currency = pkg?.currency || 'USD';
  const container = pkg?.containers?.[0];
  const shipment = pkg?.shipments?.[0];
  const outstanding = Number(pkg?.invoices?.reduce((s, i) => s + Number(i.outstanding || 0), 0) || 0);
  const paid = Number(pkg?.invoices?.reduce((s, i) => s + Number(i.paid_amount || 0), 0) || 0);
  const printPkg = useMemo(() => pkg ? ({ id: pkg.packageId, number: pkg.packageId, status: pkg.status, customer: pkg.customerId, customerName: pkg.customerName, title: pkg.productName, containerId: container?.container_number || pkg.packageId, shippingDate: pkg.shippingDate, fromTo: `${pkg.fromWarehouse} / ${pkg.toWarehouse}`, shippingMode: pkg.shippingMode, trackingNumber: pkg.trackingNumber, weight: Number(pkg.totalWeight || 0).toFixed(2), volume: Number(pkg.totalCbm || 0).toFixed(3), dimension: (pkg.boxes || []).map(b => `${b.length}×${b.width}×${b.height} ${b.unit}`).join(', '), sizeUom: 'CBM', weightPrice: '-', volumePrice: '-', packagePrice: '-', pricingList: pkg.pricing_id || '-', fromWarehouse: pkg.fromWarehouse, toWarehouse: pkg.toWarehouse, item: { code: pkg.code, name: pkg.productName, uom: '-', qty: String(pkg.quantity), price: '-', amount: '-' } }) : undefined, [pkg, container]);

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading Package 360...</div>;
  if (error) return <div className="rounded-xl border bg-white p-10 text-center text-rose-600">{error}<button onClick={load} className="ml-3 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs">Retry</button></div>;
  if (!pkg) return <Empty text="Package not found." />;

  const action = (path) => nav(path);

  return <div className="space-y-4">
    <div className="flex items-center gap-2 text-xs text-slate-500"><button onClick={() => nav('/hfl-package')} className="flex items-center gap-1 hover:text-blue-600"><ArrowLeft size={14}/>Packages</button><ChevronRight size={13}/><span>{pkg.code}</span></div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex gap-3 min-w-0"><div className="w-12 h-12 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center"><PackageIcon size={25}/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-slate-900">{pkg.hflPackageCode || "Package not yet received"}</h1><Badge>{pkg.status}</Badge><span className="text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-600">{pkg.shippingMode} · {pkg.pricing_type || 'GC'}</span></div><div className="mt-1 text-xs text-slate-500 break-all">Technical Package ID: {pkg.packageId} · China Waybill / Tracking: {pkg.chinaWaybillNumber || pkg.trackingNumber || '—'} · HFL Package: {pkg.hflPackageCode || 'Not received at China warehouse'}</div></div></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => setPrintOpen(true)} className="h-9 px-3 rounded-lg border border-slate-200 text-xs flex items-center gap-2"><Printer size={14}/>Print Label</button><button onClick={() => action(`/tracking-number?tracking=${encodeURIComponent(pkg.trackingNumber || '')}`)} className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs flex items-center gap-2"><Search size={14}/>Track</button><button onClick={load} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center"><RefreshCw size={15}/></button></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mt-5">
        <Stat icon={Boxes} label="Boxes" value={pkg.boxCount}/><Stat icon={Weight} label="Weight" value={`${Number(pkg.totalWeight || 0).toFixed(2)} KG`}/><Stat icon={Box} label="CBM" value={Number(pkg.totalCbm || 0).toFixed(3)}/><Stat icon={Container} label="Container" value={data.connections?.containers || 0}/><Stat icon={Truck} label="Shipment" value={data.connections?.shipments || 0}/><Stat icon={Clock3} label="Tracking Events" value={data.connections?.tracking_events || 0}/><Stat icon={FileText} label="Invoices" value={data.connections?.invoices || 0}/><Stat icon={CircleDollarSign} label="Outstanding" value={money(outstanding, currency)}/>
      </div>
    </div>

    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</div>

    {tab === 'overview' && <div className="grid xl:grid-cols-[1.5fr_1fr] gap-4">
      <div className="space-y-4"><Card title="Package Information" icon={PackageIcon}><div className="grid md:grid-cols-2 divide-x-0 md:divide-x divide-slate-100"><Info label="HFL Package Code" value={pkg.hflPackageCode || "Not received at China warehouse"}/><Info label="Technical Package ID" value={pkg.packageId}/><Info label="Customer ID" value={pkg.customerId} link={pkg.customerId ? `/customer?search=${encodeURIComponent(pkg.customerId)}` : null}/><Info label="Customer Name" value={pkg.customerName}/><Info label="Supplier" value={pkg.supplier}/><Info label="Product" value={pkg.productName}/><Info label="Category" value={pkg.productCategory}/><Info label="Origin" value={pkg.fromWarehouse}/><Info label="Destination" value={pkg.toWarehouse}/><Info label="Shipping Mode" value={pkg.shippingMode}/><Info label="ETA" value={pkg.eta ? fmtDate(pkg.eta) : '—'}/></div></Card>
        <Card title="Product Photos" icon={PackageIcon}><ProductGallery images={pkg.productImages} /></Card>
        <Card title="Logistics Connections" icon={Route}><div className="p-4 grid md:grid-cols-3 gap-3"><Connection title="Container" value={container?.container_number || 'Not assigned'} sub={container ? `${container.status} · ${container.current_location || '—'}` : 'Assign container'} onClick={container ? () => action('/container') : undefined}/><Connection title="Shipment" value={shipment?.shipment_number || 'Not assigned'} sub={shipment ? `${shipment.origin} → ${shipment.destination}` : 'Assign shipment'} onClick={shipment ? () => action('/shipments') : undefined}/><Connection title="Customer" value={pkg.customerId || '—'} sub={pkg.customerName || 'Customer'} onClick={pkg.customerId ? () => action(`/customer?search=${encodeURIComponent(pkg.customerId)}`) : undefined}/></div></Card>
      </div>
      <div className="space-y-4"><Card title="Financial Snapshot" icon={CircleDollarSign}><div className="p-4 grid grid-cols-2 gap-3"><Mini label="Shipping Cost" value={money(pkg.shipping_cost, currency)}/><Mini label="Grand Total" value={money(pkg.grandTotal, currency)}/><Mini label="Paid" value={money(paid, currency)}/><Mini label="Outstanding" value={money(outstanding, currency)}/></div><div className="px-4 pb-4 flex gap-2"><button onClick={() => action(`/accounting/sales-invoice?package=${pkg.id}`)} className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs">Open Invoice</button><button onClick={() => action(`/accounting/payment-entry?package=${pkg.id}`)} className="h-9 px-3 rounded-lg border text-xs">Payments</button></div></Card><Card title="Current Location" icon={MapPin}><div className="p-4"><div className="text-sm font-semibold">{pkg.warehouseLocation || pkg.toWarehouse || pkg.fromWarehouse || 'Unknown'}</div><div className="text-xs text-slate-500 mt-1">Last updated {fmtDate(pkg.updatedAt)}</div></div></Card></div>
    </div>}

    {tab === 'boxes' && <Card title="Package Boxes & Measurements" icon={Boxes}>{pkg.boxes?.length ? <Table headers={['#','Length','Width','Height','Qty','Unit','Weight','CBM']} rows={pkg.boxes.map((b,i) => [i+1,b.length,b.width,b.height,b.quantity,b.unit,`${Number(b.weight||0).toFixed(2)} KG`,`${((Number(b.length)||0)*(Number(b.width)||0)*(Number(b.height)||0)*(Number(b.quantity)||0)/(b.unit==='m'?1:b.unit==='mm'?1e9:1e6)).toFixed(3)}`])}/>:<Empty text="No box measurements recorded."/>}</Card>}
    {tab === 'tracking' && <Card title="Tracking Timeline" icon={Clock3}><Timeline events={pkg.tracking || []}/></Card>}
    {tab === 'container' && <Card title="Container Assignment" icon={Container}>{pkg.containers?.length ? <Table headers={['Container','Type','Status','Location','Seal']} rows={pkg.containers.map(c => [c.container_number,c.container_type,c.status,c.current_location || '—',c.seal_number || '—'])}/> : <Empty text="This package is not assigned to a container yet."/>}</Card>}
    {tab === 'shipment' && <Card title="Shipment" icon={Truck}>{pkg.shipments?.length ? <Table headers={['Shipment','Origin','Destination','Mode','Status','ETA']} rows={pkg.shipments.map(s => [s.shipment_number,s.origin,s.destination,s.shipping_mode,s.status || '—',s.eta || '—'])}/> : <Empty text="This package is not linked to a shipment yet."/>}</Card>}
    {tab === 'warehouse' && <div className="grid md:grid-cols-2 gap-4"><Card title="China Warehouse" icon={Warehouse}><Info label="Warehouse" value={pkg.fromWarehouse}/><Info label="Status" value={pkg.status}/></Card><Card title="Cambodia Warehouse" icon={Warehouse}><Info label="Warehouse" value={pkg.toWarehouse}/><Info label="Current Location" value={pkg.warehouseLocation || 'Not received'}/></Card></div>}
    {tab === 'pricing' && <Card title="Pricing Snapshot" icon={CircleDollarSign}><div className="grid md:grid-cols-2"><Info label="Pricing ID" value={pkg.pricing_id}/><Info label="Pricing Type" value={pkg.pricing_type || 'GC'}/><Info label="Rate Type" value={pkg.pricing_rate_type}/><Info label="Rate" value={pkg.shipping_rate ? money(pkg.shipping_rate, currency) : '—'}/><Info label="Calculated CBM" value={Number(pkg.totalCbm||0).toFixed(3)}/><Info label="Shipping Cost" value={money(pkg.shipping_cost, currency)}/></div></Card>}
    {tab === 'invoice' && <Card title="Invoices Linked to Package" icon={FileText}>{pkg.invoices?.length ? <Table headers={['Invoice','Status','Grand Total','Paid','Outstanding','Due Date']} rows={pkg.invoices.map(i => [i.invoice_no,i.status,money(i.grand_total,currency),money(i.paid_amount,currency),money(i.outstanding,currency),i.due_date || '—'])}/> : <div className="p-5"><button onClick={() => action(`/accounting/sales-invoice?package=${pkg.id}`)} className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs">Generate Invoice</button></div>}</Card>}
    {tab === 'payment' && <Card title="Payments Linked to Package Invoices" icon={CircleDollarSign}>{pkg.payments?.length ? <Table headers={['Payment','Invoice','Amount','Method','Status','Paid At']} rows={pkg.payments.map(p => [p.payment_no,p.invoice_id,money(p.amount,currency),p.method,p.status,fmtDate(p.paid_at)])}/> : <Empty text="No payments recorded for this package."/>}</Card>}

    <PrintPackageModal open={printOpen} onClose={() => setPrintOpen(false)} pkg={printPkg}/>
  </div>;
}

function Info({label,value,link}) { return <div className="px-4 py-2.5 border-b border-slate-100"><div className="text-[11px] text-slate-500">{label}</div>{link ? <button onClick={() => window.location.href = link} className="text-sm font-semibold text-blue-600 hover:underline">{value || '—'}</button> : <div className="text-sm font-semibold text-slate-800 break-words">{value || '—'}</div>}</div>; }
function Mini({label,value}) { return <div className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] text-slate-500">{label}</div><div className="text-sm font-bold mt-1">{value}</div></div>; }
function Connection({title,value,sub,onClick}) { return <button disabled={!onClick} onClick={onClick} className="text-left rounded-xl border border-slate-200 p-3 hover:border-blue-300 disabled:cursor-default w-full"><div className="text-[11px] text-slate-500">{title}</div><div className="text-sm font-bold mt-1 truncate">{value}</div><div className="text-[11px] text-slate-500 mt-1 truncate">{sub}</div>{onClick && <div className="text-[11px] text-blue-600 mt-2">Open →</div>}</button>; }
function Table({headers,rows}) { return <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr>{headers.map(h => <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>)}</tr></thead><tbody>{rows.map((r,i) => <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">{r.map((v,j) => <td key={j} className="px-4 py-3 text-slate-700 whitespace-nowrap">{j === 1 && headers[1] === 'Status' ? <Badge>{v}</Badge> : v}</td>)}</tr>)}</tbody></table></div>; }
function Timeline({events}) { if (!events.length) return <Empty text="No tracking events yet."/>; return <div className="p-5">{events.map((e,i) => <div key={e.id || i} className="flex gap-4"><div className="flex flex-col items-center"><div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><CheckCircle2 size={16}/></div>{i < events.length-1 && <div className="w-px flex-1 bg-slate-200 my-1"/>}</div><div className="pb-6 min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{e.status}</b><span className="text-[11px] text-slate-500">{fmtDate(e.event_at)}</span></div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12}/>{e.location || '—'}</div>{e.note && <div className="text-xs text-slate-600 mt-1">{e.note}</div>}</div></div>)}</div>; }
