import React,{useEffect,useMemo,useState} from 'react';
import {Truck,RefreshCw,Plus,Search,CheckCircle2,MapPin,UserRound} from 'lucide-react';
import DeliveryCostModal from '../components/DeliveryCostModal.jsx';
import {listDeliveries,createDelivery,updateDelivery,listDeliveryDrivers,confirmCustomerReceived} from '../services/deliveryApi.js';

const statuses=['Ready for Delivery','Scheduled','Out for Delivery','Delivered','Failed','Cancelled'];
const transitions={
  'Ready for Delivery':['Scheduled','Cancelled','Failed'],
  'Scheduled':['Out for Delivery','Cancelled','Failed'],
  'Out for Delivery':['Delivered','Failed','Cancelled'],
  'Delivered':[], 'Failed':['Scheduled','Cancelled'], 'Cancelled':[]
};

export default function DeliveryManagement(){
  const [rows,setRows]=useState([]),[drivers,setDrivers]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState('');
  const [form,setForm]=useState({package_id:'',driver_id:'',delivery_address:'',phone:'',scheduled_at:'',notes:''});
  const [proof,setProof]=useState({id:null,proof_type:'photo',proof_url:'',proof_note:''});
  const [failure,setFailure]=useState({id:null,failure_reason:''});
  const [received,setReceived]=useState({
    id:null,
    package_id:null,
    received_by:'',
    received_phone:'',
    received_relation:'',
    delivery_remark:''
  });
  const [open,setOpen]=useState(false),[saving,setSaving]=useState(false);
  const [costFor,setCostFor]=useState(null);

  const load=async()=>{setLoading(true);try{const [r,d]=await Promise.all([listDeliveries({per_page:100,search:search||undefined}),listDeliveryDrivers()]);setRows(r?.data?.data??r?.data??[]);setDrivers(d?.data?.data??d?.data??[])}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const canCreate=useMemo(()=>form.package_id&&form.delivery_address,[form]);

  const submit=async(e)=>{e.preventDefault();if(!canCreate)return;setSaving(true);try{await createDelivery({...form,package_id:Number(form.package_id),driver_id:form.driver_id?Number(form.driver_id):null});setOpen(false);setForm({package_id:'',driver_id:'',delivery_address:'',phone:'',scheduled_at:'',notes:''});await load()}finally{setSaving(false)}};
  const change=async(x,status)=>{
    if(status==='Delivered'){setProof({id:x.id,proof_type:'photo',proof_url:'',proof_note:''});return;}
    if(status==='Failed'){setFailure({id:x.id,failure_reason:''});return;}
    await updateDelivery(x.id,{status});await load();
  };
  const complete=async()=>{await updateDelivery(proof.id,{status:'Delivered',proof_type:proof.proof_type,proof_url:proof.proof_url,proof_note:proof.proof_note});setProof({id:null,proof_type:'photo',proof_url:'',proof_note:''});await load()};
  const fail=async()=>{await updateDelivery(failure.id,{status:'Failed',failure_reason:failure.failure_reason});setFailure({id:null,failure_reason:''});await load()};

  const confirmReceived=async()=>{
    if(!received.id||!received.package_id||!received.received_by.trim())return;

    setSaving(true);
    try{
      await confirmCustomerReceived(received.package_id,{
        received_by:received.received_by.trim(),
        received_phone:received.received_phone.trim()||null,
        received_relation:received.received_relation.trim()||null,
        delivery_remark:received.delivery_remark.trim()||null
      });

      setReceived({
        id:null,
        package_id:null,
        received_by:'',
        received_phone:'',
        received_relation:'',
        delivery_remark:''
      });

      await load();
    }finally{
      setSaving(false);
    }
  };

  return <div className='space-y-5'>
    <div className='flex items-center justify-between gap-3'><div><h1 className='text-2xl font-bold flex items-center gap-2'><Truck className='text-blue-600'/>Delivery Management</h1><p className='text-sm text-slate-500'>Assign, dispatch and complete last-mile deliveries with proof of delivery.</p></div><div className='flex gap-2'><button onClick={load} className='h-10 px-4 border rounded-lg inline-flex gap-2 items-center'><RefreshCw size={16}/>Refresh</button><button onClick={()=>setOpen(true)} className='h-10 px-4 rounded-lg bg-blue-600 text-white inline-flex gap-2 items-center'><Plus size={16}/>Create Delivery</button></div></div>
    <div className='bg-white border rounded-xl p-3 flex gap-2'><Search size={18} className='mt-2 text-slate-400'/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder='Search delivery, customer, phone, address...' className='flex-1 outline-none'/></div>
    <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>{['Ready for Delivery','Scheduled','Out for Delivery','Delivered','Failed'].map(s=><div key={s} className='bg-white border rounded-xl p-4'><div className='text-xs text-slate-500'>{s}</div><div className='text-2xl font-bold mt-1'>{rows.filter(x=>x.status===s).length}</div></div>)}</div>
    <div className='bg-white border rounded-xl overflow-hidden'><table className='w-full text-sm'><thead className='bg-slate-50'><tr>{['Delivery','Package','Customer','Address','Driver','Status','Action','Cost'].map(h=><th key={h} className='text-left px-4 py-3 text-xs text-slate-500'>{h}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan='8' className='p-8 text-center'>Loading...</td></tr>:rows.map(x=><tr key={x.id} className='border-t align-top'><td className='px-4 py-3 font-semibold'>{x.delivery_number}<div className='text-xs text-slate-400'>{x.scheduled_at||''}</div></td><td className='px-4 py-3'>{x.package?.tracking_number||x.package_id}</td><td className='px-4 py-3'>{x.customer_id||x.package?.customer_name||'—'}<div className='text-xs text-slate-400'>{x.phone||''}</div></td><td className='px-4 py-3 max-w-xs'>{x.delivery_address}</td><td className='px-4 py-3'><span className='inline-flex gap-1 items-center'><UserRound size={14}/>{x.driver?.name||'Unassigned'}</span></td><td className='px-4 py-3'><span className='px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs'>{x.status}</span></td><td className='px-4 py-3'>
  {transitions[x.status]?.length ? (
    <select value='' onChange={e=>change(x,e.target.value)} className='h-9 border rounded-lg px-2'>
      <option value=''>Update…</option>
      {transitions[x.status].map(s=><option key={s}>{s}</option>)}
    </select>
  ) : x.status==='Delivered' ? (
    <div className='flex flex-col items-start gap-2'>
      <span className='text-emerald-600 inline-flex gap-1 items-center'>
        <CheckCircle2 size={16}/>Completed
      </span>

      {x.package?.delivery_status === 'Customer Received' ? (
        <span className='text-blue-600 text-xs font-medium'>
          ✓ Customer Received
        </span>
      ) : (
        <button
          type='button'
          onClick={()=>setReceived({
            id:x.id,
            package_id:x.package_id,
            received_by:x.receiver_name||'',
            received_phone:x.phone||'',
            received_relation:'',
            delivery_remark:''
          })}
          className='h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700'
        >
          Confirm Customer Received
        </button>
      )}
    </div>
  ) : (
    <span className='text-slate-400'>Locked</span>
  )}
</td><td className='px-4 py-3'><button type='button' onClick={()=>setCostFor(x)} className='h-9 px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold whitespace-nowrap'>+ Cost</button></td></tr>)}{!loading&&!rows.length&&<tr><td colSpan='8' className='p-10 text-center text-slate-500'>No deliveries found.</td></tr>}</tbody></table></div>

    {open&&<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'><form onSubmit={submit} className='bg-white rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-xl'><h2 className='text-xl font-bold'>Create Delivery</h2><div className='grid md:grid-cols-2 gap-3'><label className='text-sm'>Package ID<input required value={form.package_id} onChange={e=>setForm({...form,package_id:e.target.value})} className='mt-1 w-full h-10 border rounded-lg px-3'/></label><label className='text-sm'>Driver<select value={form.driver_id} onChange={e=>setForm({...form,driver_id:e.target.value})} className='mt-1 w-full h-10 border rounded-lg px-3'><option value=''>Unassigned</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name} · {d.role||'User'}</option>)}</select></label></div><label className='text-sm'>Delivery Address<textarea required value={form.delivery_address} onChange={e=>setForm({...form,delivery_address:e.target.value})} className='mt-1 w-full border rounded-lg p-3' rows='2'/></label><div className='grid md:grid-cols-2 gap-3'><label className='text-sm'>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className='mt-1 w-full h-10 border rounded-lg px-3'/></label><label className='text-sm'>Scheduled At<input type='datetime-local' value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value})} className='mt-1 w-full h-10 border rounded-lg px-3'/></label></div><label className='text-sm'>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className='mt-1 w-full border rounded-lg p-3' rows='2'/></label><div className='flex justify-end gap-2'><button type='button' onClick={()=>setOpen(false)} className='px-4 h-10 border rounded-lg'>Cancel</button><button disabled={saving||!canCreate} className='px-4 h-10 bg-blue-600 text-white rounded-lg disabled:opacity-50'>{saving?'Creating…':'Create Delivery'}</button></div></form></div>}

    {proof.id&&<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'><div className='bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl'><h2 className='text-xl font-bold'>Proof of Delivery</h2><label className='text-sm'>Proof Type<select value={proof.proof_type} onChange={e=>setProof({...proof,proof_type:e.target.value})} className='mt-1 w-full h-10 border rounded-lg px-3'><option value='photo'>Photo</option><option value='signature'>Signature</option><option value='document'>Document</option><option value='other'>Other</option></select></label><label className='text-sm'>Proof URL / File Reference<input required value={proof.proof_url} onChange={e=>setProof({...proof,proof_url:e.target.value})} placeholder='https://... or storage reference' className='mt-1 w-full h-10 border rounded-lg px-3'/></label><label className='text-sm'>Receiver / Proof Note<textarea value={proof.proof_note} onChange={e=>setProof({...proof,proof_note:e.target.value})} className='mt-1 w-full border rounded-lg p-3' rows='3'/></label><div className='flex justify-end gap-2'><button onClick={()=>setProof({id:null,proof_type:'photo',proof_url:'',proof_note:''})} className='px-4 h-10 border rounded-lg'>Cancel</button><button onClick={complete} disabled={!proof.proof_url} className='px-4 h-10 bg-emerald-600 text-white rounded-lg disabled:opacity-50'>Confirm Delivered</button></div></div></div>}

    {received.id&&<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
      <form
        onSubmit={e=>{e.preventDefault();confirmReceived()}}
        className='bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl'
      >
        <div>
          <h2 className='text-xl font-bold'>Confirm Customer Received</h2>
          <p className='text-sm text-slate-500 mt-1'>
            Confirm that the customer has received this delivered package.
          </p>
        </div>

        <label className='text-sm'>
          Received By *
          <input
            required
            autoFocus
            value={received.received_by}
            onChange={e=>setReceived({...received,received_by:e.target.value})}
            placeholder='Customer name'
            className='mt-1 w-full h-10 border rounded-lg px-3'
          />
        </label>

        <div className='grid md:grid-cols-2 gap-3'>
          <label className='text-sm'>
            Phone
            <input
              value={received.received_phone}
              onChange={e=>setReceived({...received,received_phone:e.target.value})}
              placeholder='Customer phone'
              className='mt-1 w-full h-10 border rounded-lg px-3'
            />
          </label>

          <label className='text-sm'>
            Relation
            <input
              value={received.received_relation}
              onChange={e=>setReceived({...received,received_relation:e.target.value})}
              placeholder='Owner, staff, family...'
              className='mt-1 w-full h-10 border rounded-lg px-3'
            />
          </label>
        </div>

        <label className='text-sm'>
          Remark
          <textarea
            value={received.delivery_remark}
            onChange={e=>setReceived({...received,delivery_remark:e.target.value})}
            placeholder='Optional delivery confirmation remark'
            className='mt-1 w-full border rounded-lg p-3'
            rows='3'
          />
        </label>

        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={()=>setReceived({
              id:null,
              package_id:null,
              received_by:'',
              received_phone:'',
              received_relation:'',
              delivery_remark:''
            })}
            className='px-4 h-10 border rounded-lg'
          >
            Cancel
          </button>

          <button
            type='submit'
            disabled={saving||!received.received_by.trim()}
            className='px-4 h-10 bg-blue-600 text-white rounded-lg disabled:opacity-50'
          >
            {saving?'Confirming…':'Confirm Received'}
          </button>
        </div>
      </form>
    </div>}

    {costFor&&<DeliveryCostModal delivery={costFor} onClose={()=>setCostFor(null)} onDone={()=>{setCostFor(null);alert('Delivery cost recorded.')}}/>}
    {failure.id&&<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'><div className='bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl'><h2 className='text-xl font-bold'>Delivery Failed</h2><textarea autoFocus value={failure.failure_reason} onChange={e=>setFailure({...failure,failure_reason:e.target.value})} placeholder='Why was the delivery unsuccessful?' className='w-full border rounded-lg p-3' rows='4'/><div className='flex justify-end gap-2'><button onClick={()=>setFailure({id:null,failure_reason:''})} className='px-4 h-10 border rounded-lg'>Cancel</button><button onClick={fail} disabled={!failure.failure_reason.trim()} className='px-4 h-10 bg-red-600 text-white rounded-lg disabled:opacity-50'>Mark Failed</button></div></div></div>}
  </div>
}
