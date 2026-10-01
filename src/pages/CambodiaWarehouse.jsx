import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, CheckCircle2, ClipboardCheck, MapPin, PackageCheck, RefreshCw, ScanLine, Search, Scale, Warehouse, X, AlertTriangle } from 'lucide-react';
import { listPackages, getPackage, scanPackage } from '../services/packageApiService.js';
import { receiveCambodiaPackage, measureCambodiaPackage } from '../services/cambodiaWarehouseApi.js';
import { generateInvoiceFromPackage } from '../services/billingApi.js';

const stages = ['Scan Package','Receive','Measure','Invoice / Open Bill'];
const Input = ({className='', ...p}) => <input {...p} className={`w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`}/>;
const Select = ({className='', ...p}) => <select {...p} className={`w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`}/>;
const Btn = ({children,className='',...p}) => <button {...p} className={`h-10 px-4 rounded-lg border text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 ${className}`}>{children}</button>;

export default function CambodiaWarehouse(){
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search,setSearch]=useState('');
  const [packages,setPackages]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState(null);
  const [refresh,setRefresh]=useState(0);
  const [scanOpen,setScanOpen]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true); setError('');
    try { setPackages(await listPackages({search,perPage:200})); }
    catch(e){ setError(e.message||'Unable to load Cambodia warehouse packages.'); }
    finally { setLoading(false); }
  },[search,refresh]);
  useEffect(()=>{load();},[load]);

  useEffect(()=>{
    const packageId = searchParams.get('package');
    if (!packageId || !packages.length) return;
    const target = packages.find(p => String(p.id) === String(packageId) || String(p.packageId) === String(packageId) || String(p.code) === String(packageId));
    if (!target) return;
    getPackage(target.id).then(setSelected).catch(e => setError(e.message || 'Unable to open package.'));
  }, [packages, searchParams]);

  const relevant=useMemo(()=>packages.filter(p=>['In Transit','Cambodia Port','Customs','Arrived Cambodia','Cambodia Warehouse','Measurement Completed','Ready for Billing','Invoiced','Partially Paid','Ready for Delivery','Returned','Problem / Exception'].includes(p.status)),[packages]);
  const counts={
    waiting: relevant.filter(p=>['In Transit','Cambodia Port','Customs'].includes(p.status)).length,
    received: relevant.filter(p=>['Arrived Cambodia','Cambodia Warehouse'].includes(p.status)).length,
    measured: relevant.filter(p=>p.status==='Measurement Completed').length,
    billing: relevant.filter(p=>p.status==='Ready for Billing').length,
  };

  return <div className="space-y-5">
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center"><Warehouse/></div><div><h1 className="text-2xl font-bold">Cambodia Warehouse</h1><p className="text-sm text-slate-500">Receiving Center — Scan → Receive → Measure → CBM → Location → Ready for Billing</p></div></div>
      <div className="flex gap-2"><Btn onClick={()=>setScanOpen(true)} className="border-blue-200 bg-blue-50 text-blue-700"><ScanLine size={16} className="inline mr-2"/>Scan Package</Btn><Btn onClick={()=>setRefresh(x=>x+1)}><RefreshCw size={16} className="inline mr-2"/>Refresh</Btn></div>
    </header>

    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat title="Waiting Arrival" value={counts.waiting} icon={ArrowDownToLine}/><Stat title="Received" value={counts.received} icon={PackageCheck}/><Stat title="Measured" value={counts.measured} icon={Scale}/><Stat title="Ready for Billing" value={counts.billing} icon={ClipboardCheck}/>
    </div>

    <section className="bg-white border rounded-xl p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4"><div><h2 className="font-bold">Receiving Queue</h2><p className="text-xs text-slate-400">Only operational statuses are shown. Open a package to continue its receiving workflow.</p></div><div className="w-full md:w-80 h-10 border rounded-lg flex items-center px-3 gap-2"><Search size={16} className="text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Scan / Package / Tracking / Customer" className="outline-none flex-1 text-sm"/></div></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs"><tr>{['Package','Tracking','Customer','Boxes','Weight','CBM','Location','Status','Action'].map(h=><th key={h} className="text-left px-3 py-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{relevant.map(p=><tr key={p.id} className="border-t hover:bg-slate-50"><td className="px-3 py-3 font-semibold text-blue-600">{p.packageId}</td><td className="px-3 font-medium">{p.trackingNumber||'—'}</td><td className="px-3">{p.customerName||'—'}<div className="text-xs text-slate-400">{p.customerId||''}</div></td><td className="px-3">{p.boxCount}</td><td className="px-3">{p.totalWeight.toFixed(2)} KG</td><td className="px-3 font-semibold">{p.totalCbm.toFixed(3)}</td><td className="px-3">{p.warehouseLocation||'Not assigned'}</td><td className="px-3"><span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">{p.status}</span></td><td className="px-3"><Btn onClick={async()=>{try{setSelected(await getPackage(p.id));}catch(e){setError(e.message)}}} className="h-9 px-3">Open</Btn></td></tr>)}</tbody></table></div>
      {!loading&&!relevant.length&&<div className="p-10 text-center text-sm text-slate-500">No Cambodia receiving packages found.</div>}
      {loading&&<div className="p-10 text-center text-sm text-slate-500">Loading warehouse queue...</div>}
    </section>

    {selected&&<ReceivingDrawer pkg={selected} onClose={()=>setSelected(null)} onDone={async()=>{setSelected(null);setRefresh(x=>x+1)}} onError={setError} onOpenBilling={(packageId, invoiceId)=>navigate(`/accounting/sales-invoice?package=${encodeURIComponent(packageId)}&invoice=${encodeURIComponent(invoiceId || '')}&autoCreate=0`)}/>} 
    {scanOpen&&<ScanModal onClose={()=>setScanOpen(false)} onOpen={async(id)=>{try{setSelected(await scanPackage(id));setScanOpen(false);}catch(e){setError(e.message||'Package not found.')}}}/>} 
  </div>;
}

function ReceivingDrawer({pkg,onClose,onDone,onError,onOpenBilling}){
  const [location,setLocation]=useState(pkg.warehouseLocation||'');
  const [weight,setWeight]=useState(String(pkg.totalWeight||''));
  const [boxes,setBoxes]=useState((pkg.boxes?.length?pkg.boxes:[{length:'',width:'',height:'',quantity:1,unit:'cm'}]).map(b=>({...b})));
  const [busy,setBusy]=useState(false);
  const [invoice,setInvoice]=useState(null);
  const normalizedStage = ['Invoiced','Partially Paid','Ready for Delivery','Delivered','Customer Received'].includes(pkg.status)
    ? 'Invoice / Open Bill'
    : ['Measurement Completed','Ready for Billing'].includes(pkg.status)
      ? 'Measure'
      : pkg.status === 'Cambodia Warehouse'
        ? 'Receive'
        : pkg.status;
  const stage=Math.max(0, stages.indexOf(normalizedStage));
  const existingInvoice = pkg.invoices?.[0] || null;

  const createBill=async()=>{
    setBusy(true);
    try{
      const inv=await generateInvoiceFromPackage(pkg.id);
      setInvoice(inv);
      if (inv?.id) {
        onOpenBilling(pkg.id, inv.id);
      } else {
        onError('Invoice was created but no invoice ID was returned.');
      }
    }catch(e){
      onError(e.message||'Unable to create invoice from this package.');
    }finally{setBusy(false);}
  };

  const receive=async()=>{
    setBusy(true);
    try{
      const received=await receiveCambodiaPackage(pkg.id,{warehouse_location:location||'Cambodia Warehouse'});
      const cbm=Number(received?.total_cbm ?? pkg.totalCbm ?? 0);
      const weightValue=Number(received?.total_weight ?? pkg.totalWeight ?? 0);
      if ((cbm>0 || weightValue>0) && !existingInvoice) {
        try {
          const inv=await generateInvoiceFromPackage(pkg.id);
          if (inv?.id) { onOpenBilling(pkg.id, inv.id); return; }
        } catch (billError) {
          onError(billError.message || 'Package received, but the bill is not ready yet.');
        }
      }
      await onDone();
    }catch(e){onError(e.message||'Unable to receive package.');}
    finally{setBusy(false);}
  };

  const measure=async()=>{
    setBusy(true);
    try{
      await measureCambodiaPackage(pkg.id,{warehouse_location:location,total_weight:Number(weight||0),boxes});
      try {
        const inv=await generateInvoiceFromPackage(pkg.id);
        if (inv?.id) { onOpenBilling(pkg.id, inv.id); return; }
      } catch (billError) {
        onError(billError.message || 'Measurement saved, but the bill is not ready yet.');
      }
      await onDone();
    }catch(e){onError(e.message||'Unable to save measurement.');}
    finally{setBusy(false);}
  };
  return <div className="fixed inset-0 z-50 bg-black/30 flex justify-end"><div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto"><div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10"><div><div className="text-xs text-slate-400">Cambodia Receiving</div><h2 className="text-xl font-bold">{pkg.packageId}</h2><p className="text-xs text-slate-500">{pkg.trackingNumber}</p></div><button onClick={onClose}><X/></button></div><div className="p-5 space-y-5">
    <div className="grid grid-cols-3 gap-3"><Info label="Customer" value={pkg.customerName||pkg.customerId||'—'}/><Info label="Current Status" value={pkg.status}/><Info label="CBM" value={`${pkg.totalCbm.toFixed(3)} m³`}/><Info label="Weight" value={`${pkg.totalWeight.toFixed(2)} KG`}/><Info label="Mode" value={pkg.shippingMode||'—'}/><Info label="Container" value={pkg.containers?.[0]?.container_number||pkg.containers?.[0]?.containerNumber||'—'}/></div>
    {['Returned','Problem / Exception'].includes(pkg.status)&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="flex items-center gap-2 font-bold text-rose-800"><AlertTriangle size={18}/>Operational Exception</div><p className="mt-1 text-sm text-rose-700">This package is marked <b>{pkg.status}</b>. Receiving, measurement and billing are paused until the exception is resolved from Package 360.</p></div>}
    <div><div className="flex justify-between text-xs font-semibold mb-2">{stages.map((s,i)=><span key={s} className={i<=stage?'text-blue-700':'text-slate-300'}>{i+1}</span>)}</div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{width:`${((stage+1)/stages.length)*100}%`}}/></div><div className="mt-2 text-xs text-slate-500">{pkg.status}</div></div>
    <div className="bg-slate-50 border rounded-xl p-4 space-y-3"><h3 className="font-bold flex items-center gap-2"><MapPin size={17} className="text-blue-600"/>Warehouse Location</h3><Input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. CAM-A01-R03-B02"/><div className="text-xs text-slate-400">Location is saved with the receiving event.</div></div>
    {['In Transit','Cambodia Port','Customs'].includes(pkg.status)&&<button disabled={busy} onClick={receive} className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold"><PackageCheck size={17} className="inline mr-2"/>Confirm Receive</button>}
    {['Cambodia Warehouse','Measurement Completed'].includes(pkg.status)&&<div className="border rounded-xl p-4 space-y-4"><div><h3 className="font-bold">Measure Package</h3><p className="text-xs text-slate-400">Enter physical dimensions and weight. CBM is calculated by the server.</p></div><label className="block"><span className="text-xs font-medium">Total Weight (KG)</span><Input type="number" min="0" value={weight} onChange={e=>setWeight(e.target.value)}/></label>{boxes.map((b,i)=><div key={i} className="grid grid-cols-5 gap-2 items-end"><label><span className="text-xs text-slate-400">L</span><Input type="number" value={b.length} onChange={e=>setBoxes(xs=>xs.map((x,j)=>j===i?{...x,length:e.target.value}:x))}/></label><label><span className="text-xs text-slate-400">W</span><Input type="number" value={b.width} onChange={e=>setBoxes(xs=>xs.map((x,j)=>j===i?{...x,width:e.target.value}:x))}/></label><label><span className="text-xs text-slate-400">H</span><Input type="number" value={b.height} onChange={e=>setBoxes(xs=>xs.map((x,j)=>j===i?{...x,height:e.target.value}:x))}/></label><label><span className="text-xs text-slate-400">Qty</span><Input type="number" min="1" value={b.quantity} onChange={e=>setBoxes(xs=>xs.map((x,j)=>j===i?{...x,quantity:e.target.value}:x))}/></label><Select value={b.unit} onChange={e=>setBoxes(xs=>xs.map((x,j)=>j===i?{...x,unit:e.target.value}:x))}><option>cm</option><option>m</option><option>mm</option></Select></div>)}<Btn onClick={()=>setBoxes(xs=>[...xs,{length:'',width:'',height:'',quantity:1,unit:'cm'}])}>+ Add Box</Btn><button disabled={busy} onClick={measure} className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold"><Scale size={17} className="inline mr-2"/>Save Measurement</button></div>}
    {['Measurement Completed','Ready for Billing','Invoiced','Partially Paid','Ready for Delivery'].includes(pkg.status)&&<div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4"><div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={18}/>Warehouse Billing</div><div className="grid grid-cols-2 gap-3 mt-3 text-sm"><Info label="CBM" value={`${pkg.totalCbm.toFixed(3)} m³`}/><Info label="Weight" value={`${pkg.totalWeight.toFixed(2)} KG`}/></div><div className="mt-3 rounded-xl border border-emerald-100 bg-white p-3"><div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Invoice / Open Bill</div><div className="mt-1 text-sm text-slate-600">After Cambodia Warehouse measurement, HFL creates the customer bill automatically. No separate “Ready for Billing” step is required.</div>{(invoice||existingInvoice)?<div className="mt-3 flex flex-col sm:flex-row gap-2"><div className="flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><b>Invoice linked</b>{(invoice||existingInvoice).invoice_no||(invoice||existingInvoice).invoiceNo ? ` · ${(invoice||existingInvoice).invoice_no||(invoice||existingInvoice).invoiceNo}` : ''}</div><button onClick={()=>onOpenBilling(pkg.id, (invoice||existingInvoice).id)} className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold">Open Bill</button></div>:<button disabled={busy} onClick={createBill} className="w-full h-11 mt-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50"><ClipboardCheck size={17} className="inline mr-2"/>{busy?'Creating Bill...':'Create Bill / Invoice'}</button>}</div></div>}
  </div></div></div>;
}
function ScanModal({onClose,onOpen}){const [value,setValue]=useState(''); return <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-5"><div className="flex justify-between items-center"><h2 className="font-bold flex gap-2 items-center"><ScanLine className="text-blue-600"/>Scan / Find Package</h2><button onClick={onClose}><X/></button></div><p className="text-xs text-slate-500 mt-1">Enter Package ID, tracking number, customer ID, or container number. A barcode scanner can type directly into this field.</p><Input autoFocus value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&value.trim()&&onOpen(value.trim())} placeholder="YC1000202930 / 777777777001 / HFL00001 / YCL269191"/><button onClick={()=>value.trim()&&onOpen(value.trim())} className="w-full h-10 mt-3 rounded-lg bg-blue-600 text-white text-sm font-semibold">Open Package</button></div></div>}
function Info({label,value}){return <div><div className="text-xs text-slate-400">{label}</div><div className="text-sm font-semibold mt-1 break-words">{value}</div></div>}
function Stat({icon:Icon,title,value}){return <div className="bg-white border rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Icon size={20}/></div><div><div className="text-xs text-slate-500">{title}</div><div className="text-xl font-bold">{value}</div></div></div>}
