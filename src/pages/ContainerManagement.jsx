import React, { useEffect, useMemo, useState } from "react";
import {
  Archive, ArrowDownRight, ArrowRight, Box, CalendarDays, CheckCircle2,
  ChevronRight, Clock3, Container as ContainerIcon, ExternalLink, MapPin,
  Package, Plus, RefreshCw, Search, Ship, Truck, Weight, X, Layers3
} from "lucide-react";
import {
  listContainers, getContainer, createContainer, updateContainerLocation,
  getContainerTimeline, getContainerPackages, transitionContainer, attachPackages
} from "../services/containerApi.js";
import { listPackages, confirmCustomerPickup, updatePackageMovement } from "../services/packageApiService.js";
import { formatHflDateTime, formatHflDate } from "../utils/dateTime.js";

const STATUS_OPTIONS=["Pending","Loading","Departed China","In Transit","Cambodia Port","Customs","Cambodia Warehouse","Received","Delivered"];
const EMPTY_FORM={container_number:"",container_type:"40HQ",seal_number:"",shipping_mode:"SEA",origin:"Guangzhou",destination:"Phnom Penh",current_location:"",status:"Pending",departure_date:"",estimated_arrival:"",notes:""};
const fmt=(v,datetime=false)=>datetime?formatHflDateTime(v):formatHflDate(v);
const num=(v,d=2)=>Number(v||0).toLocaleString("en-US",{maximumFractionDigits:d});
const statusTone=(s)=>{const x=String(s||"").toLowerCase();if(x.includes("delivered"))return "emerald";if(x.includes("received"))return "emerald";if(x.includes("transit"))return "blue";if(x.includes("custom"))return "amber";if(x.includes("arrived"))return "violet";if(x.includes("loading"))return "cyan";return "slate";};
function Badge({status}){const t=statusTone(status);const c={emerald:"bg-emerald-50 text-emerald-700 border-emerald-200",blue:"bg-blue-50 text-blue-700 border-blue-200",amber:"bg-amber-50 text-amber-700 border-amber-200",violet:"bg-violet-50 text-violet-700 border-violet-200",cyan:"bg-cyan-50 text-cyan-700 border-cyan-200",slate:"bg-slate-50 text-slate-600 border-slate-200"}[t];return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${c}`}>{status||"Pending"}</span>}
function Stat({icon:Icon,label,value,sub}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="rounded-xl bg-slate-100 p-2.5 text-slate-600"><Icon size={18}/></div><span className="text-xs text-slate-400">Live</span></div><div className="mt-4 text-2xl font-bold text-slate-950">{value}</div><div className="mt-1 text-sm font-medium text-slate-600">{label}</div>{sub&&<div className="mt-1 text-xs text-slate-400">{sub}</div>}</div>}

export default function ContainerManagement(){
 const [containers,setContainers]=useState([]),[selected,setSelected]=useState(null),[search,setSearch]=useState(""),[status,setStatus]=useState("");
 const [loading,setLoading]=useState(true),[detailLoading,setDetailLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [showCreate,setShowCreate]=useState(false),[showLocation,setShowLocation]=useState(false),[showLoadPackages,setShowLoadPackages]=useState(false),[form,setForm]=useState(EMPTY_FORM),[tab,setTab]=useState("overview");
 const [pickupPackage,setPickupPackage]=useState(null),[pickupForm,setPickupForm]=useState({receivedBy:"",receivedPhone:"",receivedRelation:"",deliveryRemark:""});
  const [movementPackage,setMovementPackage]=useState(null),[packageMovementForm,setPackageMovementForm]=useState({location:"",status:"In Transit",note:""});
 const [timeline,setTimeline]=useState([]),[packageItems,setPackageItems]=useState([]),[availablePackages,setAvailablePackages]=useState([]),[selectedPackageIds,setSelectedPackageIds]=useState([]),[locationForm,setLocationForm]=useState({location:"",status:"In Transit",event_date:"",remarks:""});
 async function load(){try{setLoading(true);setError("");const d=await listContainers({search:search.trim(),status});setContainers(Array.isArray(d)?d:[]);}catch(e){setError(e?.message||"Failed to load containers.")}finally{setLoading(false)}}
 useEffect(()=>{load()},[status]);
 const filtered=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return containers;return containers.filter(c=>[c.container_number,c.seal_number,c.current_location,c.shipment_id,c.origin,c.destination,...(c.packages||[]).flatMap(p=>[p.package_id,p.tracking_number,p.china_waybill_number,p.hfl_package_code,p.customer_name])].some(v=>String(v??"").toLowerCase().includes(q)))},[containers,search]);
 const summary=useMemo(()=>({containers:containers.length,packages:containers.reduce((a,c)=>a+(c.package_count??c.packages?.length??0),0),productTypes:containers.reduce((a,c)=>a+Number(c.product_types||0),0),quantity:containers.reduce((a,c)=>a+Number(c.total_quantity||0),0),cbm:containers.reduce((a,c)=>a+Number(c.total_cbm||0),0),weight:containers.reduce((a,c)=>a+Number(c.total_weight||0),0),transit:containers.filter(c=>String(c.status).toLowerCase()==="in transit").length}),[containers]);
 async function open(id){try{setDetailLoading(true);setError("");setTab("overview");const d=await getContainer(id);setSelected(d);setLocationForm({location:d?.current_location||"",status:d?.status||"In Transit",event_date:"",remarks:""});const [tl,pk]=await Promise.all([getContainerTimeline(id),getContainerPackages(id)]);setTimeline(tl||[]);setPackageItems(pk||[]);}catch(e){setError(e?.message||"Failed to load container details.")}finally{setDetailLoading(false)}}
 async function openSearchResult(c){
  const q=search.trim().toLowerCase();
  if(!q){open(c.id);return;}
  const containerFields=[c.container_number,c.seal_number,c.current_location,c.shipment_id,c.origin,c.destination];
  const containerMatch=containerFields.some(v=>String(v??"").toLowerCase().includes(q));
  const packageFields=p=>[p.package_id,p.packageId,p.tracking_number,p.trackingNumber,p.china_waybill_number,p.chinaWaybillNumber,p.hfl_package_code,p.hflPackageCode,p.customer_name,p.customerName];
  const preview=(c.packages||[]).find(p=>packageFields(p).some(v=>String(v??"").toLowerCase().includes(q)));
  if(containerMatch||!preview){open(c.id);return;}
  try{
   setDetailLoading(true);setError("");setTab("packages");
   const d=await getContainer(c.id);
   const [tl,pk]=await Promise.all([getContainerTimeline(c.id),getContainerPackages(c.id)]);
   setSelected(d);setLocationForm({location:d?.current_location||"",status:d?.status||"In Transit",event_date:"",remarks:""});
   setTimeline(tl||[]);setPackageItems(pk||[]);
   const target=(pk||[]).find(p=>packageFields(p).some(v=>String(v??"").toLowerCase().includes(q)))||preview;
   setMovementPackage(target);
   const allowed=["Pending","Loading","Departed China","In Transit","Cambodia Port","Customs","Cambodia Warehouse","Received","Received at China Warehouse"];
   setPackageMovementForm({location:target.warehouse_location||target.current_location||d?.current_location||"",status:allowed.includes(target.status)?target.status:"In Transit",note:""});
  }catch(e){setError(e?.message||"Failed to open package movement.")}finally{setDetailLoading(false)}
 }
 async function refreshDetail(){if(selected?.id)await open(selected.id)}
 async function create(e){e.preventDefault();if(!form.container_number.trim())return setError("Container Number is required.");try{setSaving(true);setError("");await createContainer({...form,container_number:form.container_number.trim()});setShowCreate(false);setForm(EMPTY_FORM);await load();setNotice("Container created successfully.")}catch(e){setError(e?.message||"Failed to create container.")}finally{setSaving(false)}}
 async function updateLocation(e){e.preventDefault();
  if(locationForm.status==="Received"){
    const open=(packageItems||[]).filter(p=>!["Delivered","Customer Received"].includes(p.status)).length;
    if(open>0&&!window.confirm(`${open} package(s) in this container are not yet delivered / received by the customer. Mark the container as Received anyway?`))return;
  }
  try{setSaving(true);setError("");await transitionContainer(selected.id,{location:locationForm.location.trim(),status:locationForm.status,event_date:locationForm.event_date||null,remarks:locationForm.remarks.trim()||null});setShowLocation(false);await refreshDetail();await load();setNotice("Container movement updated.")}catch(e){setError(e?.message||"Failed to update container.")}finally{setSaving(false)}}
 async function openLoadPackages(){try{setError("");setShowLoadPackages(true);setSelectedPackageIds([]);const rows=await listPackages({perPage:200});const active=new Set((packageItems||[]).map(p=>Number(p.id)));setAvailablePackages((rows||[]).filter(p=>p.id&&!active.has(Number(p.id))&&!['Delivered','Cancelled'].includes(p.status)));}catch(e){setError(e?.message||"Failed to load available packages.")}}
 async function saveLoadPackages(e){e.preventDefault();if(!selectedPackageIds.length)return setError("Select at least one package.");try{setSaving(true);setError("");const count=selectedPackageIds.length;await attachPackages(selected.id,selectedPackageIds);setShowLoadPackages(false);await refreshDetail();await load();setNotice(`${count} package(s) loaded into container.`)}catch(e){setError(e?.message||"Failed to load packages into container.")}finally{setSaving(false)}}
 async function submitCustomerPickup(e){
  e.preventDefault();
  if(!pickupPackage?.id)return setError("Package ID is missing.");
  if(!pickupForm.receivedBy.trim())return setError("Receiver name is required.");
  try{
   setSaving(true);setError("");setNotice("");
   await confirmCustomerPickup(pickupPackage.id,pickupForm);
   setPickupPackage(null);
   setPickupForm({receivedBy:"",receivedPhone:"",receivedRelation:"",deliveryRemark:""});
   await refreshDetail();
   await load();
   setNotice("Customer pickup recorded for the selected package.");
  }catch(e){setError(e?.message||"Failed to confirm customer pickup.")}
  finally{setSaving(false)}
 }
 async function submitPackageMovement(e){
   e.preventDefault();
   if(!movementPackage?.id)return setError("Package ID is missing.");
   if(!packageMovementForm.location.trim())return setError("Location is required.");
   try{
    setSaving(true);setError("");setNotice("");
    await updatePackageMovement(movementPackage.id,{
     status:packageMovementForm.status,
     location:packageMovementForm.location.trim(),
     note:packageMovementForm.note.trim()
    });
    setMovementPackage(null);
    if(selected?.id){
     const d=await getContainer(selected.id);setSelected(d);
     const [tl,pk]=await Promise.all([getContainerTimeline(selected.id),getContainerPackages(selected.id)]);
     setTimeline(tl||[]);setPackageItems(pk||[]);
    }
    await load();
    setNotice("Movement updated for the selected package only.");
   }catch(e){setError(e?.message||"Failed to update package movement.")}
   finally{setSaving(false)}
  }
  const pCount=selected?.package_count??packageItems.length; const productTypes=selected?.product_types??new Set(packageItems.map(p=>p.product_name).filter(Boolean)).size; const totalQuantity=selected?.total_quantity??packageItems.reduce((a,p)=>a+Number(p.quantity||0),0); const cbm=selected?.total_cbm??packageItems.reduce((a,p)=>a+Number(p.total_cbm||0),0); const wt=selected?.total_weight??packageItems.reduce((a,p)=>a+Number(p.total_weight||0),0);
 return <div className="min-h-full bg-[#f6f8fb] p-4 md:p-6"><div className="mx-auto max-w-[1700px] space-y-5">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600"><ContainerIcon size={15}/> Operations <ChevronRight size={14}/> Container Control</div><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Container Control Center</h1><p className="mt-1 text-sm text-slate-500">Control every container from China loading to Cambodia arrival.</p></div><div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><RefreshCw size={16}/>Refresh</button><button onClick={()=>setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"><Plus size={17}/>New Container</button></div></div>
  {error&&<div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}{notice&&<div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><span>{notice}</span><button onClick={()=>setNotice("")}><X size={16}/></button></div>}
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-6"><Stat icon={ContainerIcon} label="Total Containers" value={summary.containers}/><Stat icon={Package} label="Packages Loaded" value={summary.packages}/><Stat icon={Box} label="Product Types" value={summary.productTypes} sub={`${summary.quantity} total units`}/><Stat icon={Layers3} label="Total CBM" value={num(summary.cbm,3)} sub="Across listed containers"/><Stat icon={Weight} label="Total Weight" value={`${num(summary.weight,2)} kg`}/><Stat icon={Ship} label="In Transit" value={summary.transit}/></div>
  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Container / HFL Tracking / China Delivery Tracking / Package..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:bg-white"/></div><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none"><option value="">All Status</option>{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select></div>
   <div className="overflow-x-auto"><table className="min-w-[1320px] w-full"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr>{["Container","HFL Tracking / China Tracking","Route / Shipment","Packages","CBM / Weight","Current Location","Status","ETA",""].map((h,i)=><th key={i} className="px-5 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{loading?<tr><td colSpan="9" className="h-56 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-2 animate-spin" size={20}/>Loading containers...</td></tr>:filtered.length===0?<tr><td colSpan="9" className="h-56 text-center text-sm text-slate-500"><ContainerIcon className="mx-auto mb-2 text-slate-300" size={34}/>No containers found.</td></tr>:filtered.map(c=><tr key={c.id} onClick={()=>openSearchResult(c)} className="cursor-pointer hover:bg-blue-50/40"><td className="px-5 py-4"><div className="font-bold text-slate-900">{c.container_number||"—"}</div><div className="mt-1 text-xs text-slate-400">{c.container_type||"—"} {c.seal_number?`• Seal ${c.seal_number}`:""}</div></td><td className="px-5 py-4"><div className="space-y-1 text-xs font-semibold text-slate-700">{(c.packages||[]).slice(0,2).map((p,i)=><div key={p.id||i}><span className="text-slate-400">HFL:</span> {p.tracking_number||"—"} <span className="text-slate-400">• CN:</span> {p.china_waybill_number||"—"}</div>)}</div><div className="mt-1 text-xs text-slate-400">{c.tracking_count??(c.packages||[]).filter(p=>p.tracking_number||p.china_waybill_number).length} package tracking record(s)</div></td><td className="px-5 py-4"><div className="text-sm font-semibold text-slate-700">{c.origin||"China"} <ArrowRight className="inline mx-1" size={14}/> {c.destination||"Cambodia"}</div><div className="mt-1 text-xs text-slate-400">Shipment #{c.shipment_id||"—"} • {c.shipping_mode||"SEA"}</div></td><td className="px-5 py-4 font-semibold text-slate-800">{c.package_count??c.packages?.length??0}</td><td className="px-5 py-4"><div className="font-semibold text-slate-800">{num(c.total_cbm,3)} CBM</div><div className="text-xs text-slate-400">{num(c.total_weight,2)} kg</div></td><td className="px-5 py-4"><div className="flex items-center gap-1.5 text-sm text-slate-700"><MapPin size={15} className="text-slate-400"/>{c.current_location||"—"}</div></td><td className="px-5 py-4"><Badge status={c.status}/></td><td className="px-5 py-4 text-sm text-slate-600">{fmt(c.estimated_arrival)}</td><td className="px-5 py-4 text-right"><ChevronRight className="ml-auto text-slate-400" size={18}/></td></tr>)}</tbody></table></div>
  </div>
 </div>
 {selected&&<div className="fixed inset-0 z-50 bg-slate-950/40" onMouseDown={e=>e.target===e.currentTarget&&!saving&&setSelected(null)}><aside className="ml-auto flex h-full w-full max-w-[1120px] flex-col overflow-hidden bg-white shadow-2xl"><div className="border-b border-slate-200 px-6 py-5"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Container Control</div><div className="mt-1 flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold text-slate-950">{selected.container_number}</h2><Badge status={selected.status}/></div><div className="mt-1 text-sm text-slate-500">{selected.origin||"China"} → {selected.destination||"Cambodia"} • {selected.container_type||"—"} • {selected.shipping_mode||"SEA"}</div></div><div className="flex gap-2"><button onClick={openLoadPackages} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Load Packages</button><button onClick={()=>setShowLocation(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Update Movement</button><button onClick={()=>setSelected(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={19}/></button></div></div><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><Mini label="Packages" value={pCount}/><Mini label="Product Types" value={productTypes}/><Mini label="Total Quantity" value={totalQuantity}/><Mini label="Total CBM" value={`${num(cbm,3)} CBM`}/><Mini label="Total Weight" value={`${num(wt,2)} kg`}/><Mini label="Location" value={selected.current_location||"—"}/></div><div className="mt-5 flex gap-6 overflow-x-auto border-b border-slate-100">{[["overview","Overview"],["packages","Packages"],["tracking","Tracking"],["shipment","Shipment"],["loading","Loading"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold ${tab===k?"border-blue-600 text-blue-600":"border-transparent text-slate-500"}`}>{l}</button>)}</div></div>
 {detailLoading?<div className="flex flex-1 items-center justify-center text-sm text-slate-500"><RefreshCw className="mr-2 animate-spin" size={18}/>Loading container details...</div>:<div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6">{tab==="overview"&&<Overview selected={selected} timeline={timeline}/>} {tab==="packages"&&<Packages items={packageItems} onMovement={p=>{setMovementPackage(p);setPackageMovementForm({location:p.warehouse_location||p.current_location||selected.current_location||"",status:"In Transit",note:""});setError("");setNotice("");}} onPickup={p=>{setPickupPackage(p);setPickupForm({receivedBy:"",receivedPhone:"",receivedRelation:"",deliveryRemark:""});setError("");setNotice("");}}/>} {tab==="tracking"&&<Timeline items={timeline}/>} {tab==="shipment"&&<Shipment selected={selected}/>} {tab==="loading"&&<Loading selected={selected} items={packageItems}/>}</div>}</aside></div>}
 {pickupPackage&&<Modal title="Confirm Customer Pickup" onClose={()=>!saving&&setPickupPackage(null)}><form onSubmit={submitCustomerPickup} className="space-y-4">
   <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm"><div className="font-bold text-slate-900">{pickupPackage.hfl_package_code||pickupPackage.package_id||pickupPackage.packageId||"Package"}</div><div className="mt-1 text-xs text-slate-600">HFL Tracking: {pickupPackage.tracking_number||pickupPackage.trackingNumber||"—"} · China Tracking: {pickupPackage.china_waybill_number||pickupPackage.chinaWaybillNumber||"—"}</div><p className="mt-2 text-xs text-blue-700">This records receipt for this package only. Container movement and invoice data are not changed by this form.</p></div>
   <Field label="Received By *"><input required value={pickupForm.receivedBy} onChange={e=>setPickupForm({...pickupForm,receivedBy:e.target.value})}/></Field>
   <Field label="Receiver Phone"><input value={pickupForm.receivedPhone} onChange={e=>setPickupForm({...pickupForm,receivedPhone:e.target.value})}/></Field>
   <Field label="Relationship to Customer"><input placeholder="Customer, family member, representative" value={pickupForm.receivedRelation} onChange={e=>setPickupForm({...pickupForm,receivedRelation:e.target.value})}/></Field>
   <Field label="Remark"><textarea rows="3" value={pickupForm.deliveryRemark} onChange={e=>setPickupForm({...pickupForm,deliveryRemark:e.target.value})}/></Field>
   <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={()=>setPickupPackage(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white">{saving?"Saving...":"Confirm Pickup"}</button></div>
  </form></Modal>}
{movementPackage&&<Modal title="Update Package Movement" onClose={()=>!saving&&setMovementPackage(null)}><form onSubmit={submitPackageMovement} className="space-y-4">
   <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
    <div className="font-bold text-slate-900">{movementPackage.hfl_package_code||movementPackage.package_id||movementPackage.packageId||"Package"}</div>
    <div className="mt-1 text-xs text-slate-600">HFL Tracking: {movementPackage.tracking_number||movementPackage.trackingNumber||"—"} · China Tracking: {movementPackage.china_waybill_number||movementPackage.chinaWaybillNumber||"—"}</div>
    <p className="mt-2 text-xs text-blue-700">Only this package's movement will be updated. Container, invoice and payment records are not changed by this form.</p>
   </div>
   <Field label="Current Location *">
    <select
     required
     value={["Guangzhou Warehouse","Foshan Warehouse","Yiwu Warehouse","Guangzhou Port","South China Sea","Cambodia Port","Customs","Cambodia Warehouse","Phnom Penh Warehouse"].includes(packageMovementForm.location) ? packageMovementForm.location : (packageMovementForm.location ? "Other Location" : "")}
     onChange={e=>setPackageMovementForm({...packageMovementForm,location:e.target.value==="Other Location" ? "" : e.target.value})}
    >
     <option value="">Select Current Location</option>
     {["Guangzhou Warehouse","Foshan Warehouse","Yiwu Warehouse","Guangzhou Port","South China Sea","Cambodia Port","Customs","Cambodia Warehouse","Phnom Penh Warehouse","Other Location"].map(x=><option key={x} value={x}>{x}</option>)}
    </select>
   </Field>
   {(!["Guangzhou Warehouse","Foshan Warehouse","Yiwu Warehouse","Guangzhou Port","South China Sea","Cambodia Port","Customs","Cambodia Warehouse","Phnom Penh Warehouse"].includes(packageMovementForm.location)) && <Field label="Other Location *"><input required maxLength={255} value={packageMovementForm.location} onChange={e=>setPackageMovementForm({...packageMovementForm,location:e.target.value})} placeholder="Enter current location"/></Field>}
   <Field label="Transport Status *"><select required value={packageMovementForm.status} onChange={e=>setPackageMovementForm({...packageMovementForm,status:e.target.value})}>{["Pending","Loading","Departed China","In Transit","Cambodia Port","Customs","Cambodia Warehouse","Received","Received at China Warehouse"].map(x=><option key={x}>{x}</option>)}</select></Field>
   <Field label="Remark"><textarea rows="3" maxLength={1000} value={packageMovementForm.note} onChange={e=>setPackageMovementForm({...packageMovementForm,note:e.target.value})} placeholder="Optional movement details"/></Field>
   <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={()=>setMovementPackage(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white">{saving?"Saving...":"Save Package Movement"}</button></div>
  </form></Modal>}
  {showCreate&&<Modal title="Create Container" onClose={()=>setShowCreate(false)}><form onSubmit={create} className="grid grid-cols-1 gap-4 md:grid-cols-2">{[["container_number","Container Number *"],["container_type","Container Type"],["seal_number","Seal Number"],["shipping_mode","Shipping Mode"],["origin","Origin"],["destination","Destination"],["current_location","Current Location"],["status","Status"]].map(([k,l])=><Field key={k} label={l}>{k==="container_type"?<select value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}>{["20HQ","40HQ","45HQ"].map(x=><option key={x}>{x}</option>)}</select>:k==="shipping_mode"?<select value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}>{["SEA","LAND","AIR"].map(x=><option key={x}>{x}</option>)}</select>:k==="status"?<select value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}>{STATUS_OPTIONS.map(x=><option key={x}>{x}</option>)}</select>:<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>}</Field>)}<div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={()=>setShowCreate(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white">{saving?"Saving...":"Create Container"}</button></div></form></Modal>}
 {showLoadPackages&&<Modal title="Load Packages into Container" onClose={()=>setShowLoadPackages(false)}><form onSubmit={saveLoadPackages} className="space-y-4"><div className="max-h-80 overflow-y-auto rounded-xl border">{availablePackages.length?availablePackages.map(p=><label key={p.id} className="flex cursor-pointer items-center gap-3 border-b p-3 last:border-b-0"><input type="checkbox" checked={selectedPackageIds.includes(p.id)} onChange={e=>setSelectedPackageIds(v=>e.target.checked?[...v,p.id]:v.filter(id=>id!==p.id))}/><div className="min-w-0 flex-1"><div className="font-semibold">{p.packageId||p.package_id||"—"}</div><div className="text-xs text-slate-500">HFL: {p.trackingNumber||p.tracking_number||"—"} · CN: {p.chinaWaybillNumber||p.china_waybill_number||"—"} · {p.customerName||p.customer_name||"—"}</div></div><div className="text-right text-xs text-slate-500">{num(p.totalCbm??p.total_cbm,3)} CBM<br/>{num(p.totalWeight??p.total_weight,2)} kg</div></label>):<div className="p-10 text-center text-sm text-slate-400">No available packages to load.</div>}</div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowLoadPackages(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white">{saving?"Loading...":"Load Selected Packages"}</button></div></form></Modal>}
 {showLocation&&<Modal title="Update Container Movement" onClose={()=>setShowLocation(false)}><form onSubmit={updateLocation} className="space-y-4"><Field label="Current Location">
  <select
    required
    value={["Guangzhou Warehouse","Foshan Warehouse","Yiwu Warehouse","Guangzhou Port","South China Sea","Cambodia Warehouse","Phnom Penh Warehouse"].includes(locationForm.location) ? locationForm.location : "Other Location"}
    onChange={e=>setLocationForm({...locationForm,location:e.target.value==="Other Location" ? "" : e.target.value})}
  >
    {["Guangzhou Warehouse","Foshan Warehouse","Yiwu Warehouse","Guangzhou Port","South China Sea","Cambodia Warehouse","Phnom Penh Warehouse"].map(x=><option key={x} value={x}>{x}</option>)}
    <option value="Other Location">Other Location</option>
  </select>
  {(!["Guangzhou Warehouse","Foshan Warehouse","Yiwu Warehouse","Guangzhou Port","South China Sea","Cambodia Warehouse","Phnom Penh Warehouse"].includes(locationForm.location)) && (
    <input
      required
      className="mt-2"
      placeholder="Enter other location"
      value={locationForm.location}
      onChange={e=>setLocationForm({...locationForm,location:e.target.value})}
    />
  )}
</Field><Field label="Status"><select value={locationForm.status} onChange={e=>setLocationForm({...locationForm,status:e.target.value,location:e.target.value==='Received'?'Cambodia Warehouse':locationForm.location})}>{STATUS_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></Field>{locationForm.status==="Received"&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700"><strong>Received:</strong> confirms the container was checked and physically received at the Cambodia Warehouse.</div>}<Field label="Event Date"><input type="datetime-local" value={locationForm.event_date} onChange={e=>setLocationForm({...locationForm,event_date:e.target.value})}/></Field><Field label="Remarks"><textarea rows="3" value={locationForm.remarks} onChange={e=>setLocationForm({...locationForm,remarks:e.target.value})}/></Field><div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">{saving?"Saving...":"Save Movement"}</button></div></form></Modal>}
 </div>
}
function Mini({label,value}){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 truncate text-sm font-bold text-slate-900">{value}</div></div>}
function Overview({selected,timeline}){return <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]"><div className="space-y-5"><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold text-slate-900">Route & Container</h3><div className="mt-5 flex items-center gap-4"><div className="flex-1 rounded-xl border p-4"><div className="text-xs text-slate-400">Origin</div><div className="mt-1 font-bold">{selected.origin||"China"}</div></div><ArrowRight className="text-blue-500"/><div className="flex-1 rounded-xl border p-4"><div className="text-xs text-slate-400">Destination</div><div className="mt-1 font-bold">{selected.destination||"Cambodia"}</div></div></div></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Latest Tracking</h3><Timeline items={(timeline||[]).slice(0,4)}/></section></div><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Container Details</h3><dl className="mt-4 divide-y">{[["Container",selected.container_number],["Type",selected.container_type],["Seal",selected.seal_number],["Shipment",selected.shipment_id?`#${selected.shipment_id}`:"—"],["Departure",fmt(selected.departure_date)],["ETA",fmt(selected.estimated_arrival)],["Actual Arrival",fmt(selected.actual_arrival)],["Location",selected.current_location]].map(([a,b])=><div key={a} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-400">{a}</dt><dd className="font-semibold text-slate-700 text-right">{b||"—"}</dd></div>)}</dl></section></div>}
function Packages({items,onPickup,onMovement}){
 const rows=items||[];
 const productTypes=new Set(rows.map(p=>p.product_name).filter(Boolean)).size;
 const totalQuantity=rows.reduce((a,p)=>a+Number(p.quantity||0),0);
 const totalCbm=rows.reduce((a,p)=>a+Number(p.total_cbm||0),0);
 const totalWeight=rows.reduce((a,p)=>a+Number(p.total_weight||0),0);
 const eligibleStatuses=["Cambodia Warehouse","Measurement Completed","Ready for Billing"];
 return <section className="overflow-hidden rounded-2xl border bg-white">
  <div className="border-b p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-bold">All Packages in Container</h3><p className="mt-1 text-xs text-slate-400">Confirm customer receipt separately for each package.</p></div><div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Mini label="Packages" value={rows.length}/><Mini label="Product Types" value={productTypes}/><Mini label="CBM" value={num(totalCbm,3)}/><Mini label="Weight" value={`${num(totalWeight,2)} kg`}/></div></div></div>
  <div className="overflow-x-auto"><table className="min-w-[1200px] w-full">
   <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>{["Package","HFL Tracking","China Delivery Tracking","Customer","CBM","Weight","Loaded","Pickup Status","Action"].map(h=><th className="px-5 py-3" key={h}>{h}</th>)}</tr></thead>
   <tbody className="divide-y">{rows.length?rows.map(p=>{
    const received=String(p.delivery_status||p.deliveryStatus||"").toLowerCase()==="customer received"||Boolean(p.customer_received_at||p.customerReceivedAt);
    const eligible=eligibleStatuses.includes(p.status);
    return <tr key={p.id}>
     <td className="px-5 py-4 font-bold">{p.hfl_package_code||p.package_id||p.packageId||"—"}</td>
     <td className="px-5 py-4 text-sm font-semibold text-slate-700">{p.tracking_number||p.trackingNumber||"—"}</td>
     <td className="px-5 py-4 text-sm text-slate-600">{p.china_waybill_number||p.chinaWaybillNumber||"—"}</td>
     <td className="px-5 py-4 text-sm">{p.customer_name||p.customer?.full_name||p.customer?.company_name||p.customer?.customer_id||"—"}</td>
     <td className="px-5 py-4 text-sm font-semibold">{num(p.total_cbm,3)}</td>
     <td className="px-5 py-4 text-sm">{num(p.total_weight,2)} kg</td>
     <td className="px-5 py-4 text-sm">{fmt(p.pivot?.loaded_at,true)}</td>
     <td className="px-5 py-4 text-sm">{received?<Badge status="Customer Received"/>:<Badge status={eligible?"Awaiting Pickup":"Not Ready for Pickup"}/>}</td>
     <td className="px-5 py-4 text-sm"><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>onMovement(p)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Update Movement</button>{received?<span className="self-center font-semibold text-emerald-700">Recorded</span>:<button type="button" disabled={!eligible} onClick={()=>onPickup(p)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Confirm Pickup</button>}</div></td>
    </tr>;
   }):<tr><td colSpan="9" className="py-20 text-center text-sm text-slate-400"><Package className="mx-auto mb-2"/>No packages linked.</td></tr>}</tbody>
  </table></div>
 </section>;
}

function Timeline({items}){return <div className="mt-4 space-y-0">{items?.length?items.map((e,i)=><div key={e.id||i} className="relative flex gap-4 pb-5"><div className="flex w-6 flex-col items-center"><div className="z-10 mt-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-50"/>{i<items.length-1&&<div className="w-px flex-1 bg-slate-200"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-800">{e.status||"Update"}</span><Badge status={e.status}/></div><div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400"><span><MapPin className="mr-1 inline" size={12}/>{e.location||"—"}</span><span><Clock3 className="mr-1 inline" size={12}/>{fmt(e.event_date,true)}</span></div>{e.remarks&&<p className="mt-2 text-sm text-slate-500">{e.remarks}</p>}</div></div>):<div className="py-10 text-center text-sm text-slate-400">No tracking events yet.</div>}</div>}
function Shipment({selected}){return <div className="grid gap-5 md:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><Ship className="text-blue-600"/><div className="mt-4 text-xs text-slate-400">Shipment</div><div className="mt-1 text-lg font-bold">{selected.shipment_id?`#${selected.shipment_id}`:"Not assigned"}</div></div><div className="rounded-2xl border bg-white p-5"><div className="text-xs text-slate-400">Mode</div><div className="mt-1 text-lg font-bold">{selected.shipping_mode||"SEA"}</div></div><div className="rounded-2xl border bg-white p-5"><div className="text-xs text-slate-400">Route</div><div className="mt-1 text-lg font-bold">{selected.origin||"China"} → {selected.destination||"Cambodia"}</div></div></div>}
function Loading({selected,items}){const loaded=selected.loaded_package_count??items.filter(p=>p.pivot?.loaded_at).length;return <div className="grid gap-5 md:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><Box className="text-blue-600"/><div className="mt-4 text-xs text-slate-400">Loaded Packages</div><div className="text-3xl font-bold">{loaded}</div></div><div className="rounded-2xl border bg-white p-5"><Package className="text-emerald-600"/><div className="mt-4 text-xs text-slate-400">Package Count</div><div className="text-3xl font-bold">{items.length}</div></div><div className="rounded-2xl border bg-white p-5"><CalendarDays className="text-amber-600"/><div className="mt-4 text-xs text-slate-400">Departure</div><div className="mt-1 text-lg font-bold">{fmt(selected.departure_date)}</div></div></div>}
function Field({label,children}){
  const baseClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400";
  return <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
    {React.Children.map(children, child =>
      React.isValidElement(child)
        ? React.cloneElement(child, {
            className: [baseClass, child.props.className].filter(Boolean).join(" ")
          })
        : child
    )}
  </label>;
}
function Modal({title,onClose,children}){return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose}><X size={18}/></button></div><div className="p-5">{children}</div></div></div>}
