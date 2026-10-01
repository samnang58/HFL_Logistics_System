import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Search, Users, UserRound, Package, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listCustomers } from '../services/customerApi.js';

const cn=(...x)=>x.filter(Boolean).join(' ');
function Button({children,primary=false,icon:Icon,...p}){return <button {...p} className={cn('h-10 px-4 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-2 transition',primary?'bg-blue-600 text-white border-blue-600 hover:bg-blue-700':'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',p.className)}>{Icon&&<Icon size={16}/>} {children}</button>}
function Stat({icon:Icon,title,value,color='blue'}){const tone={blue:'bg-blue-50 text-blue-600',green:'bg-emerald-50 text-emerald-600',purple:'bg-purple-50 text-purple-600',orange:'bg-orange-50 text-orange-600'};return <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3"><div className={cn('w-11 h-11 rounded-xl flex items-center justify-center',tone[color])}><Icon size={22}/></div><div><div className="text-sm text-slate-500">{title}</div><div className="text-2xl font-bold text-slate-900 mt-0.5">{value}</div><div className="text-xs text-slate-400 mt-1">Current records</div></div></div>}
export default function SalesCustomerOverview(){
  const navigate=useNavigate();
  const [sales,setSales]=useState('All Sales');
  const [search,setSearch]=useState('');
  const [rows,setRows]=useState([]);
  useEffect(()=>{ let cancelled=false; listCustomers().then(data=>{if(!cancelled)setRows(data)}).catch(e=>alert(e.message)); return ()=>{cancelled=true}; },[]);
  const salesNames=useMemo(()=>[...new Set(rows.map(c=>String(c.salesOwner||'').trim()).filter(Boolean))].sort(),[rows]);
  const summary=useMemo(()=>salesNames.map(name=>{
    const customers=rows.filter(c=>String(c.salesOwner||'').trim()===name);
    return {name,customers,active:customers.filter(c=>c.status==='Active').length,packages:customers.reduce((n,c)=>n+Number(c.packageCount||0),0)};
  }),[rows,salesNames]);
  const selectedCustomers=useMemo(()=>{
    let list=sales==='All Sales'?rows:rows.filter(c=>String(c.salesOwner||'').trim()===sales);
    const q=search.trim().toLowerCase();
    if(q) list=list.filter(c=>[c.customerId,c.fullName,c.companyName,c.phone,c.email,c.username].some(v=>String(v||'').toLowerCase().includes(q)));
    return list;
  },[rows,sales,search]);
  const totalCustomers=rows.length;
  const assigned=rows.filter(c=>String(c.salesOwner||'').trim()).length;
  const active=rows.filter(c=>c.status==='Active').length;
  const selectedName=sales==='All Sales'?'All Sales':sales;
  return <div className="space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center"><BarChart3 size={25}/></div><div><h1 className="text-2xl font-bold text-slate-900">Sales Customers</h1><p className="text-sm text-slate-500">View customer ownership and customer counts by Sales Owner</p></div></div>
      <Button icon={ArrowLeft} onClick={()=>navigate('/customer')}>Back to Customer</Button>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat icon={Users} title="Total Customers" value={totalCustomers}/>
      <Stat icon={UserRound} title="Assigned to Sales" value={assigned} color="green"/>
      <Stat icon={UserRound} title="Active Customers" value={active} color="purple"/>
      <Stat icon={WalletCards} title="Sales Owners" value={salesNames.length} color="orange"/>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-3 items-end">
      <label className="min-w-[220px]"><span className="block text-xs font-semibold text-slate-600 mb-1.5">Sales Owner</span><select value={sales} onChange={e=>setSales(e.target.value)} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm"><option>All Sales</option>{salesNames.map(s=><option key={s}>{s}</option>)}</select></label>
      <div className="h-10 flex-1 min-w-[260px] border border-slate-200 rounded-lg flex items-center gap-2 px-3"><Search size={17} className="text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} className="outline-none flex-1 text-sm" placeholder="Search customer ID, name, phone, email..."/></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100"><h3 className="font-bold text-slate-800">Sales Customer Summary</h3><p className="text-xs text-slate-400 mt-0.5">Select a Sales Owner to view their customers</p></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs"><tr><th className="text-left px-4 py-3">Sales Owner</th><th className="text-left px-4 py-3">Total Customers</th><th className="text-left px-4 py-3">Active</th><th className="text-left px-4 py-3">Packages</th><th className="text-left px-4 py-3">Action</th></tr></thead><tbody>
        {summary.length===0?<tr><td colSpan="5" className="px-4 py-12 text-center text-slate-400">No Sales Owner has been assigned yet.</td></tr>:summary.map(s=><tr key={s.name} className={cn('border-t hover:bg-slate-50/70',sales===s.name&&'bg-blue-50/40')}><td className="px-4 py-3 font-semibold">{s.name}</td><td className="px-4 py-3">{s.customers.length}</td><td className="px-4 py-3">{s.active}</td><td className="px-4 py-3">{s.packages}</td><td className="px-4 py-3"><Button primary={sales!==s.name} onClick={()=>setSales(s.name)}>{sales===s.name?'Selected':'View Customers'}</Button></td></tr>)}
      </tbody></table></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><div><h3 className="font-bold text-slate-800"><Users size={17} className="inline mr-2"/>Customer List — {selectedName}</h3><p className="text-xs text-slate-400 mt-0.5">{selectedCustomers.length} customer records</p></div></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs"><tr>{['#','Customer ID','Customer Name','Company','Sales Owner','Group','Phone','Status','Packages'].map(h=><th key={h} className="text-left px-3 py-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>
        {selectedCustomers.length===0?<tr><td colSpan="9" className="px-4 py-12 text-center text-slate-400">No customer records found.</td></tr>:selectedCustomers.map((c,i)=><tr key={c.id} className="border-t hover:bg-slate-50/70"><td className="px-3 py-3">{i+1}</td><td className="px-3 py-3"><span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">{c.customerId}</span></td><td className="px-3 py-3 font-medium">{c.fullName||'—'}</td><td className="px-3 py-3">{c.companyName||'—'}</td><td className="px-3 py-3">{c.salesOwner||'Unassigned'}</td><td className="px-3 py-3">{c.customerGroup||'—'}</td><td className="px-3 py-3">{c.phone||'—'}</td><td className="px-3 py-3">{c.status||'—'}</td><td className="px-3 py-3">{c.packageCount||0}</td></tr>)}
      </tbody></table></div>
    </div>
  </div>;
}
