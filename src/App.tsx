import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Mail, User, Hash, Palette, Layers, Maximize, Box, FileText, Paperclip, Send, CheckCircle2, Loader2, Truck, Tag } from 'lucide-react';

// VERSION: 2.1 - FULL 14 FIELDS UPDATE

function EnquiryForm() {
  const [formData, setFormData] = useState({
    dateOfEnquiry: new Date().toISOString().split('T')[0],
    email: '', enquiryType: '', supplierName: '', customerName: '', articleNumber: '',
    color: '', quantity: '', widthSize: '', composition: '', gsm: '', finish: '',
    description: '', attachments: [] as any[]
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = async (e: any) => {
    const files = Array.from(e.target.files as FileList);
    const processed = await Promise.all(files.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve({ name: file.name, type: file.type, content: (reader.result as string).split(',')[1] });
    })));
    setFormData({ ...formData, attachments: [...formData.attachments, ...processed] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const res = await fetch('/api/submit-enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) setStatus('success'); else setStatus('error');
  };

  if (status === 'success') return <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-xl shadow text-center border-t-4 border-t-indigo-600"><CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold">Submitted!</h2><button onClick={() => window.location.reload()} className="mt-6 text-indigo-600 font-bold">Submit Another</button></div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-t-4 border-t-indigo-600">
        <h1 className="text-xl font-bold">Order Enquiry Form</h1>
        <p className="text-sm text-slate-500">Please fill all 14 fields below.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Date</label><input type="date" name="dateOfEnquiry" required value={formData.dateOfEnquiry} onChange={handleChange} className="w-full mt-1 outline-none" /></div>
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="your@email.com" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Enquiry Type</label><select name="enquiryType" required value={formData.enquiryType} onChange={handleChange} className="w-full mt-1 outline-none"><option value="">Select</option><option value="New">New</option><option value="Order">Order</option></select></div>
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Supplier Name</label><input type="text" name="supplierName" required value={formData.supplierName} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="Supplier" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Customer Name</label><input type="text" name="customerName" required value={formData.customerName} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="Customer" /></div>
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Article Number</label><input type="text" name="articleNumber" required value={formData.articleNumber} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="ART-123" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Color</label><input type="text" name="color" required value={formData.color} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="Color" /></div>
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Quantity</label><input type="text" name="quantity" required value={formData.quantity} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="Qty" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Width / Size</label><input type="text" name="widthSize" required value={formData.widthSize} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="Size" /></div>
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Composition</label><input type="text" name="composition" required value={formData.composition} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="Composition" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">GSM</label><input type="text" name="gsm" required value={formData.gsm} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="GSM" /></div>
          <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Finish</label><input type="text" name="finish" required value={formData.finish} onChange={handleChange} className="w-full mt-1 outline-none" placeholder="Finish" /></div>
        </div>
        <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Description</label><textarea name="description" required value={formData.description} onChange={handleChange} className="w-full mt-1 outline-none resize-none" rows={3} placeholder="Details..." /></div>
        <div className="bg-white p-4 rounded-lg border"><label className="text-xs font-bold text-slate-500 uppercase">Attachments</label><input type="file" multiple onChange={handleFileChange} className="w-full mt-1 text-sm" /></div>
        <button type="submit" disabled={status === 'loading'} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
          {status === 'loading' ? 'Submitting...' : 'Submit Enquiry'}
        </button>
      </form>
    </div>
  );
}

function SupplierResponseForm() {
  const { id } = useParams();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [formData, setFormData] = useState({ supplierName: '', articleNumber: '', composition: '', gsm: '', moq: '', mcq: '', finish: '', widthSize: '', price: '', deliveryTime: '', remark: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    fetch(`/api/enquiry/${id}`).then(res => res.json()).then(data => {
      setEnquiry(data);
      setFormData({ supplierName: data.supplierName || '', articleNumber: data.articleNumber || '', composition: data.composition || '', gsm: data.gsm || '', moq: data.moq || '', mcq: data.mcq || '', finish: data.finish || '', widthSize: data.widthSize || '', price: data.price || '', deliveryTime: data.deliveryTime || '', remark: data.remark || '' });
    });
  }, [id]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setStatus('loading');
    await fetch('/api/update-enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, id, tabName: enquiry.tabName, rowIndex: enquiry.rowIndex }) });
    setStatus('success');
  };

  if (!enquiry) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  if (status === 'success') return <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-xl shadow text-center border-t-4 border-t-emerald-500"><CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" /><h2 className="text-2xl font-bold">Response Submitted!</h2></div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-t-4 border-t-emerald-500 flex justify-between items-center">
        <h1 className="text-xl font-bold">Supplier Portal</h1>
        <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">RESPONSE FORM</span>
      </div>
      <div className="bg-slate-100 p-6 rounded-xl mb-6 text-sm grid grid-cols-2 gap-2 border">
        <p><b>Date:</b> {enquiry.date}</p><p><b>Type:</b> {enquiry.enquiryType}</p>
        <p><b>Customer:</b> {enquiry.customerName}</p><p><b>Article:</b> {enquiry.articleNumber}</p>
        <p><b>Color:</b> {enquiry.color}</p><p><b>Qty:</b> {enquiry.quantity}</p>
        {enquiry.attachments && <div className="col-span-2 pt-2 border-t mt-2"><p className="font-bold mb-1">Attachments:</p><div className="flex gap-2">{enquiry.attachments.split(',').map((l:any, i:any) => <a key={i} href={l.includes('"') ? l.split('"')[1] : l} target="_blank" className="text-indigo-600 underline">File {i+1}</a>)}</div></div>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="supplierName" placeholder="Supplier Name" value={formData.supplierName} onChange={(e)=>setFormData({...formData, supplierName: e.target.value})} className="p-3 border rounded-lg w-full" />
          <input type="text" name="articleNumber" placeholder="Article Number" value={formData.articleNumber} onChange={(e)=>setFormData({...formData, articleNumber: e.target.value})} className="p-3 border rounded-lg w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="moq" placeholder="MOQ" value={formData.moq} onChange={(e)=>setFormData({...formData, moq: e.target.value})} className="p-3 border rounded-lg w-full" />
          <input type="text" name="mcq" placeholder="MCQ" value={formData.mcq} onChange={(e)=>setFormData({...formData, mcq: e.target.value})} className="p-3 border rounded-lg w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="price" placeholder="Price" value={formData.price} onChange={(e)=>setFormData({...formData, price: e.target.value})} className="p-3 border rounded-lg w-full" />
          <input type="date" name="deliveryTime" value={formData.deliveryTime} onChange={(e)=>setFormData({...formData, deliveryTime: e.target.value})} className="p-3 border rounded-lg w-full" />
        </div>
        <textarea name="remark" placeholder="Remark" rows={3} value={formData.remark} onChange={(e)=>setFormData({...formData, remark: e.target.value})} className="p-3 border rounded-lg w-full resize-none" />
        <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg">Submit Response</button>
      </form>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<EnquiryForm />} />
          <Route path="/supplier-response/:id" element={<SupplierResponseForm />} />
        </Routes>
      </div>
    </Router>
  );
}
