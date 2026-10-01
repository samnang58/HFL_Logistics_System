import React, { useEffect, useMemo, useState } from 'react';
import { Search, Package, MapPin, Clock3, CheckCircle2, Circle, RefreshCw, Plus, X, ScanLine, Printer } from 'lucide-react';
import { packageService, trackingService } from '../services/resourceService.js';
import { formatHflDateTime } from '../utils/dateTime.js';

const STATUSES = [
  'CREATED','WAITING_FOR_CHINA_WAREHOUSE','RECEIVED_CHINA','SCANNED','STORED','CONSOLIDATED',
  'LOADED','DEPARTED_CHINA','IN_TRANSIT','ARRIVED_CAMBODIA','RECEIVED_CAMBODIA',
  'READY_FOR_DELIVERY','OUT_FOR_DELIVERY','DELIVERED','FAILED_DELIVERY','RETURNED'
];

const unwrap = (res) => res?.data?.data ?? res?.data ?? [];
const label = (s='') => s.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase());

export default function TrackingManagement(){
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [containerResults,setContainerResults]=useState([]);
  const [selectedContainer,setSelectedContainer]=useState(null);
  const [current,setCurrent]=useState(null);
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [showScan,setShowScan]=useState(false);
  const [scanValue,setScanValue]=useState('');
  const [form,setForm]=useState({status:'RECEIVED_CHINA',location:'',warehouse:'',remark:'',staff:''});

  const loadSearch = async (value=query) => {
    setLoading(true); setError('');
    try {
      const response=await trackingService.search(value.trim());
      const payload=unwrap(response) || {};
      const rows=Array.isArray(payload) ? payload : (payload.packages || []);
      const containers=Array.isArray(payload.containers) ? payload.containers : [];
      // A new search must always replace the previous selection. Otherwise
      // 06. Tracking can keep showing the last package after the user searches
      // for another tracking/container number.
      setCurrent(null);
      setEvents([]);
      setSelectedContainer(null);
      setResults(rows);
      setContainerResults(containers);
      if(rows?.[0]) {
        await selectPackage(rows[0]);
      } else if(containers[0]) {
        setSelectedContainer(containers[0]);
      }
    } catch(e){ setError(e.message || 'Unable to load packages from API.'); setResults([]); setContainerResults([]); setSelectedContainer(null); setCurrent(null); setEvents([]); }
    finally { setLoading(false); }
  };

const selectPackage = async (pkg) => {
  setLoading(true);
  setError('');

  try {
    const lookup = pkg.tracking_number || pkg.trackingNumber ||
      pkg.china_waybill_number || pkg.chinaWaybillNumber ||
      pkg.hfl_package_code || pkg.hflPackageCode ||
      pkg.package_id || pkg.packageId;

    if (!lookup) {
      setError('Package has no tracking identifier.');
      setLoading(false);
      return;
    }

    const response = await trackingService.get(lookup);

    const data = unwrap(response);

    const packageData = data?.package || pkg;

    const trackingEvents = Array.isArray(data?.events)
      ? data.events
      : [];

    setCurrent(packageData);
    setEvents(trackingEvents);
  } catch (e) {
    setError(e.message || 'Unable to load tracking history.');
    setEvents([]);
  } finally {
    setLoading(false);
  }
};
  useEffect(()=>{
    const tracking = new URLSearchParams(window.location.search).get('tracking');
    loadSearch(tracking || '');
  },[]);

  const latest=events.length ? events[events.length-1] : null;
  const currentLocation=current?.tracking_location || current?.container_current_location || latest?.location || current?.warehouse_location || current?.to_warehouse || current?.toWarehouse || '—';
  const currentStatus=current?.tracking_status || current?.container_status || latest?.status || current?.status || '—';
  const eta=current?.eta || '—';
  const shipment=current?.shipment_number || current?.shipmentNumber || '—';
  const container=current?.container_number || current?.containerNumber || current?.china_container_number || current?.chinaContainerNumber || '—';
  const warehouse=current?.container_current_location || latest?.warehouse || current?.warehouse_location || '—';

  const printTracking=()=>{
    if(!current) return;
    const title = current.tracking_number || current.trackingNumber || 'Tracking';
    const html = `<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a}h1{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #ddd;padding:8px;text-align:left}.muted{color:#64748b;font-size:12px}</style></head><body><h1>HFL Logistics - Tracking</h1><div class=muted>Tracking Number: ${title}</div><p><b>Package:</b> ${current.hfl_package_code||current.hflPackageCode||current.package_id||current.packageId||'—'}<br><b>Customer:</b> ${current.customer_name||current.customerName||'—'} (${current.customer_id||current.customerId||'—'})<br><b>Status:</b> ${label(currentStatus)}<br><b>Location:</b> ${currentLocation}<br><b>ETA:</b> ${eta}</p><table><thead><tr><th>Status</th><th>Date / Time</th><th>Location</th><th>Warehouse</th><th>Staff</th><th>Remark</th></tr></thead><tbody>${events.map(e=>`<tr><td>${label(e.status)}</td><td>${e.event_at||e.occurredAt||'—'}</td><td>${e.location||'—'}</td><td>${e.warehouse||'—'}</td><td>${e.staff_name||e.staff||'—'}</td><td>${e.note||e.remark||'—'}</td></tr>`).join('')}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
    const w=window.open('','_blank','width=900,height=700');
    if(!w){setError('Popup blocked. Please allow popups to print tracking.');return;}
    w.document.write(html); w.document.close();
  };

  const handleScan=async(e)=>{
    e.preventDefault();
    const value=scanValue.trim();
    if(!value) return;
    setQuery(value);
    setShowScan(false);
    setScanValue('');
    await loadSearch(value);
  };

  const submitEvent=async(e)=>{
    e.preventDefault(); if(!current) return;
    setLoading(true); setError('');
    try{
      await trackingService.addEvent({
        tracking_number: current.tracking_number || current.trackingNumber,
        package_id: current.id,
        status: form.status,
        location: form.location,
        warehouse: form.warehouse,
        staff_name: form.staff,
        note: form.remark,
      });
      setShowAdd(false); setForm({status:'RECEIVED_CHINA',location:'',warehouse:'',remark:'',staff:''});
      await selectPackage(current);
    }catch(err){setError(err.message || 'Failed to create tracking event.'); setLoading(false);}
  };

  return <div className="space-y-4">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">HFL Tracking</h1><p className="text-sm text-slate-500">Track the real package journey from China to Cambodia and delivery.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={()=>setShowScan(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700"><ScanLine size={16}/> Scan</button><button onClick={printTracking} disabled={!current} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"><Printer size={16}/> Print</button><button onClick={()=>current&&setShowAdd(true)} disabled={!current} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"><Plus size={16}/> Add Tracking Event</button></div>
    </div>
    <div className="bg-white border rounded-xl p-4">
      <form onSubmit={e=>{e.preventDefault();loadSearch(query)}} className="flex gap-2">
        <div className="relative flex-1"><Search size={18} className="absolute left-3 top-3 text-slate-400"/><input className="w-full h-11 rounded-lg border border-slate-200 pl-10 pr-3 outline-none focus:border-blue-500" placeholder="Tracking Number / Package ID / Customer ID / Name / Phone / Container / Shipment" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <button className="px-4 rounded-lg bg-slate-900 text-white">Search</button>
        <button type="button" onClick={()=>loadSearch(query)} className="px-3 rounded-lg border border-slate-200"><RefreshCw size={17}/></button>
      </form>
      {results.length>0 && <div className="mt-3 grid gap-2">{results.slice(0,8).map(p=><button key={p.id} onClick={()=>selectPackage(p)} className={`w-full text-left p-3 border rounded-lg hover:bg-slate-50 ${current?.id===p.id?'border-blue-500 bg-blue-50/40':''}`}><div className="flex flex-wrap items-center gap-x-4 gap-y-1"><b>HFL Tracking: {p.tracking_number || p.trackingNumber || 'Not assigned'}</b><span className="text-xs text-slate-500">China Delivery: {p.china_waybill_number || p.chinaWaybillNumber || '—'}</span><span className="text-xs text-slate-500">HFL Package: {p.hfl_package_code || p.hflPackageCode || '—'}</span></div><div className="text-xs text-slate-500 mt-1">Package: {p.package_id || p.packageId || '—'} · {p.customer_name || p.customerName || '—'} · {label(p.status)}</div></button>)}</div>}
      {containerResults.length>0 && <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40 p-3"><div className="text-xs font-bold uppercase tracking-wide text-violet-700 mb-2">Container Results</div><div className="grid gap-2">{containerResults.slice(0,8).map(c=><button key={c.id} onClick={()=>setSelectedContainer(c)} className={`w-full text-left p-3 bg-white border rounded-lg hover:bg-violet-50 ${selectedContainer?.id===c.id?'border-violet-500':''}`}><div className="flex items-center justify-between gap-3"><b>{c.container_number}</b><span className="text-xs font-semibold text-violet-700">{c.tracking_count ?? c.package_count ?? c.packages?.length ?? 0} Tracking</span></div><div className="text-xs text-slate-500 mt-1">{c.current_location || '—'} · {label(c.status)} · ETA {c.estimated_arrival || '—'}</div></button>)}</div></div>}
      {!loading && query && !results.length && !error && <div className="py-6 text-center text-slate-500">No package or container found for “{query}”.</div>}
    </div>
    {selectedContainer && <div className="bg-white border rounded-xl p-5"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="text-xs text-slate-500">Container Number</div><h2 className="text-xl font-bold">{selectedContainer.container_number}</h2><p className="text-sm text-slate-500">{selectedContainer.origin || 'China'} → {selectedContainer.destination || 'Cambodia'}</p></div><span className="px-3 py-2 rounded-full bg-violet-50 text-violet-700 text-sm font-semibold">{label(selectedContainer.status)}</span></div><div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">{[['Tracking Numbers',selectedContainer.tracking_count ?? selectedContainer.package_count ?? selectedContainer.packages?.length ?? 0],['Packages',selectedContainer.package_count ?? selectedContainer.packages?.length ?? 0],['Total CBM',selectedContainer.total_cbm ?? 0],['Total Weight',selectedContainer.total_weight ?? 0],['ETA',selectedContainer.estimated_arrival || '—']].map(([k,v])=><div key={k} className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] text-slate-400">{k}</div><div className="text-sm font-bold mt-1">{v}</div></div>)}</div>{selectedContainer.latest_movement && <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4"><div className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2">Latest Container Movement</div><div className="flex flex-wrap items-center gap-3 text-sm"><b>{label(selectedContainer.latest_movement.status)}</b><span className="text-slate-500">{selectedContainer.latest_movement.location}</span><span className="text-xs text-slate-400">{selectedContainer.latest_movement.event_date ? formatHflDateTime(selectedContainer.latest_movement.event_date) : '—'}</span></div>{selectedContainer.latest_movement.remarks && <div className="mt-2 text-sm text-slate-600">Remark: {selectedContainer.latest_movement.remarks}</div>}</div>}
      {selectedContainer.movement_events?.length>0 && <div className="mt-5 rounded-xl border p-4"><div className="font-bold mb-3">Container Movement Timeline</div><div className="space-y-3">{selectedContainer.movement_events.map((e,i)=><div key={e.id||i} className="flex gap-3 border-b last:border-b-0 pb-3 last:pb-0"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0"/><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{label(e.status)}</b><span className="text-xs text-slate-500">{e.location || '—'}</span></div><div className="text-xs text-slate-400 mt-1">{e.event_date ? formatHflDateTime(e.event_date) : '—'} · {e.staff_name || 'Operations'}</div>{e.remarks && <div className="text-sm text-slate-600 mt-1">{e.remarks}</div>}</div></div>)}</div></div>}
      {selectedContainer.packages?.length>0 && <div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="p-3">HFL Tracking</th><th className="p-3">China Delivery</th><th className="p-3">HFL Package</th><th className="p-3">Package</th><th className="p-3">Customer</th><th className="p-3">Weight</th><th className="p-3">CBM</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{selectedContainer.packages.map(p=><tr key={p.id}><td className="p-3 font-semibold">{p.tracking_number || "—"}</td><td className="p-3">{p.china_waybill_number || "—"}</td><td className="p-3">{p.hfl_package_code || "—"}</td><td className="p-3">{p.package_id || "—"}</td><td className="p-3">{p.customer_name || p.customer?.full_name || '—'}</td><td className="p-3">{p.total_weight ?? 0}</td><td className="p-3">{p.total_cbm ?? 0}</td><td className="p-3">{label(p.status)}</td></tr>)}</tbody></table></div>}</div>}
    {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}
    {current && <>
      <div className="bg-white border rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Package/></div><div><div className="text-xs text-slate-500">HFL Tracking</div><h2 className="text-xl font-bold">{current.tracking_number || current.trackingNumber || 'Not assigned'}</h2><p className="text-xs text-slate-500 mt-1">China Delivery: <b>{current.china_waybill_number || current.chinaWaybillNumber || '—'}</b> · HFL Package: <b>{current.hfl_package_code || current.hflPackageCode || '—'}</b> · Package: <b>{current.package_id || current.packageId || '—'}</b></p><p className="text-sm text-slate-500 mt-1">{current.customer_name || current.customerName || '—'} · {current.customer_id || current.customerId || '—'}</p></div></div><span className="px-3 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">{label(currentStatus)}</span></div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-5">{[['Current Location',currentLocation],['Warehouse',warehouse],['ETA',eta],['Shipment',shipment],['Container',container],['Origin',current.from_warehouse || current.fromWarehouse || '—'],['Destination',current.to_warehouse || current.toWarehouse || '—']].map(([k,v])=><div key={k} className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] text-slate-400">{k}</div><div className="text-sm font-semibold mt-1">{v}</div></div>)}</div>
        <div className="mt-4 text-xs text-slate-400">Last Updated: {latest?.event_at || latest?.occurredAt ? formatHflDateTime(latest.event_at || latest.occurredAt) : '—'}</div>
      </div>
      <div className="bg-white border rounded-xl p-5"><div className="flex items-center justify-between mb-5"><h3 className="font-bold">Tracking Timeline</h3><span className="text-xs text-slate-400">{events.length} events</span></div>{events.length ? <div>{events.map((e,i)=><div className="relative flex gap-4 pb-7" key={e.id}><div className="relative z-10 w-7 h-7 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center text-blue-600">{i===events.length-1?<CheckCircle2 size={15}/>:<Circle size={10}/>}</div>{i<events.length-1&&<div className="absolute left-3 top-7 bottom-0 w-px bg-slate-200"/>}<div className="flex-1"><div className="flex flex-col md:flex-row md:items-center justify-between gap-1"><b className="text-sm">{label(e.status)}</b><span className="text-xs text-slate-400 inline-flex items-center gap-1"><Clock3 size={12}/>{e.event_at || e.occurredAt ? formatHflDateTime(e.event_at || e.occurredAt) : '—'}</span></div><div className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1"><MapPin size={12}/>{e.location||'—'} · Warehouse: {e.warehouse||'—'} · Staff: {e.staff_name || e.staff || '—'}</div>{(e.note || e.remark)&&<p className="text-sm text-slate-600 mt-2">Remark: {e.note || e.remark}</p>}{e.photo&&<a className="text-xs text-blue-600 mt-1 inline-block" href={e.photo} target="_blank" rel="noreferrer">View attachment</a>}</div></div>)}</div>:<div className="p-8 text-center text-slate-500">No tracking events for this package.</div>}</div>
    </>}
    {!current && !loading && !error && <div className="bg-white border rounded-xl p-10 text-center text-slate-500">ស្វែងរកតាម HFL Tracking, China Delivery Tracking, HFL Package Code, Package ID, Container ឬ Shipment ដើម្បីមើលដំណើរទំនិញ និងទីតាំងបច្ចុប្បន្ន។</div>}
    {loading && <div className="text-center text-sm text-slate-500">Loading real data from the API…</div>}
    {showScan && <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"><form onSubmit={handleScan} className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2"><ScanLine size={20} className="text-blue-600"/> Scan Package</h3><button type="button" onClick={()=>setShowScan(false)}><X/></button></div><p className="text-sm text-slate-500 mb-3">Use a USB/Bluetooth barcode scanner or type the Tracking Number / Package ID.</p><input autoFocus className="w-full border rounded-lg p-3" placeholder="Scan barcode / tracking number..." value={scanValue} onChange={e=>setScanValue(e.target.value)}/><div className="flex justify-end gap-2 mt-4"><button type="button" onClick={()=>setShowScan(false)} className="px-4 py-2 border rounded-lg">Cancel</button><button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Find Package</button></div></form></div>}
    {showAdd && <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"><form onSubmit={submitEvent} className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-xl"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Add Tracking Event</h3><button type="button" onClick={()=>setShowAdd(false)}><X/></button></div><div className="grid gap-3"><select className="border rounded-lg p-3" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(s=><option key={s} value={s}>{label(s)}</option>)}</select><input className="border rounded-lg p-3" placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/><input className="border rounded-lg p-3" placeholder="Warehouse" value={form.warehouse} onChange={e=>setForm({...form,warehouse:e.target.value})}/><input className="border rounded-lg p-3" placeholder="Staff/User" value={form.staff} onChange={e=>setForm({...form,staff:e.target.value})}/><textarea className="border rounded-lg p-3" placeholder="Remark / Note" rows="3" value={form.remark} onChange={e=>setForm({...form,remark:e.target.value})}/><button className="bg-blue-600 text-white rounded-lg py-3">Save Tracking Event</button></div></form></div>}
  </div>
}
