import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Mail, User, Hash, Palette, Layers, Maximize, Box, 
  FileText, Paperclip, Send, CheckCircle2, AlertCircle, Loader2, Truck, Tag
} from 'lucide-react';

// --- Types ---
interface User {
  email: string;
  name: string;
  picture: string;
}

interface FormData {
  dateOfEnquiry: string;
  email: string;
  enquiryType: string;
  supplierName: string;
  customerName: string;
  articleNumber: string;
  color: string;
  quantity: string;
  widthSize: string;
  composition: string;
  gsm: string;
  finish: string;
  description: string;
  attachments: { name: string, size: number, type: string, content: string }[];
}

// --- Enquiry Form Component ---
function EnquiryForm({ user, handleLogin, handleLogout }: { user: User | null, handleLogin: () => void, handleLogout: () => void }) {
  const [formData, setFormData] = useState<FormData>({
    dateOfEnquiry: new Date().toISOString().split('T')[0],
    email: user?.email || '',
    enquiryType: '',
    supplierName: '',
    customerName: '',
    articleNumber: '',
    color: '',
    quantity: '',
    widthSize: '',
    composition: '',
    gsm: '',
    finish: '',
    description: '',
    attachments: []
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.email) setFormData(prev => ({ ...prev, email: user.email }));
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const filePromises = newFiles.map((file: File) => {
        return new Promise<{ name: string, size: number, type: string, content: string }>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ name: file.name, size: file.size, type: file.type, content: base64 });
          };
        });
      });
      const processedFiles = await Promise.all(filePromises);
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...processedFiles] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/submit-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
        setFormData({
          dateOfEnquiry: new Date().toISOString().split('T')[0],
          description: '', customerName: '', articleNumber: '', quantity: '',
          email: user?.email || '', enquiryType: '', supplierName: '', color: '',
          widthSize: '', composition: '', gsm: '', finish: '', attachments: []
        });
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to connect to the server.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-b-xl shadow-sm overflow-hidden mb-6 border border-slate-200 border-t-indigo-600 border-t-4">
        <div className="p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Order Enquiry Form</h1>
          <p className="text-sm text-slate-500">Please fill out all details for your enquiry.</p>
        </div>
      </div>

      {status === 'success' ? (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-xl shadow-sm text-center border border-slate-200">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Success!</h2>
          <p className="text-slate-600 mb-8">{message}</p>
          <button onClick={() => setStatus('idle')} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg">Submit Another</button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Date</label>
              <input type="date" name="dateOfEnquiry" required value={formData.dateOfEnquiry} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Mail className="w-4 h-4 mr-2" /> Email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Tag className="w-4 h-4 mr-2" /> Type</label>
              <select name="enquiryType" required value={formData.enquiryType} onChange={handleChange} className="w-full p-2 border rounded-lg">
                <option value="">Select Type</option>
                <option value="New">New</option>
                <option value="Order">Order</option>
              </select>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Truck className="w-4 h-4 mr-2" /> Supplier</label>
              <input type="text" name="supplierName" required value={formData.supplierName} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><User className="w-4 h-4 mr-2" /> Customer</label>
              <input type="text" name="customerName" required value={formData.customerName} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Hash className="w-4 h-4 mr-2" /> Article #</label>
              <input type="text" name="articleNumber" required value={formData.articleNumber} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Palette className="w-4 h-4 mr-2" /> Color</label>
              <input type="text" name="color" required value={formData.color} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Layers className="w-4 h-4 mr-2" /> Quantity</label>
              <input type="text" name="quantity" required value={formData.quantity} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Maximize className="w-4 h-4 mr-2" /> Width/Size</label>
              <input type="text" name="widthSize" required value={formData.widthSize} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Box className="w-4 h-4 mr-2" /> Composition</label>
              <input type="text" name="composition" required value={formData.composition} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Hash className="w-4 h-4 mr-2" /> GSM</label>
              <input type="text" name="gsm" required value={formData.gsm} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><FileText className="w-4 h-4 mr-2" /> Finish</label>
              <input type="text" name="finish" required value={formData.finish} onChange={handleChange} className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><FileText className="w-4 h-4 mr-2" /> Description</label>
            <textarea name="description" required rows={3} value={formData.description} onChange={handleChange} className="w-full p-2 border rounded-lg resize-none" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center"><Paperclip className="w-4 h-4 mr-2" /> Attachments</label>
            <input type="file" multiple onChange={handleFileChange} className="w-full text-sm" />
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.attachments.map((f, i) => <span key={i} className="px-2 py-1 bg-slate-100 text-xs rounded">{f.name}</span>)}
            </div>
          </div>

          <button type="submit" disabled={status === 'loading'} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            {status === 'loading' ? <Loader2 className="animate-spin" /> : <Send />} Submit Enquiry
          </button>
        </form>
      )}
    </div>
  );
}

// --- Supplier Response Form Component ---
function SupplierResponseForm() {
  const { id } = useParams();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    supplierName: '', articleNumber: '', composition: '', gsm: '', moq: '', mcq: '',
    finish: '', widthSize: '', price: '', deliveryTime: '', remark: ''
  });

  useEffect(() => {
    fetch(`/api/enquiry/${id}`)
      .then(res => res.json())
      .then(data => {
        setEnquiry(data);
        setFormData({
          supplierName: data.supplierName || '', articleNumber: data.articleNumber || '',
          composition: data.composition || '', gsm: data.gsm || '', moq: data.moq || '',
          mcq: data.mcq || '', finish: data.finish || '', widthSize: data.widthSize || '',
          price: data.price || '', deliveryTime: data.deliveryTime || '', remark: data.remark || ''
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await fetch('/api/update-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id, tabName: enquiry.tabName, rowIndex: enquiry.rowIndex }),
      });
      setStatus('success');
    } catch (err) { setStatus('error'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!enquiry) return <div className="min-h-screen flex items-center justify-center">Enquiry not found.</div>;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border-t-emerald-500 border-t-4">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">Supplier Response Form</h1>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">SUPPLIER PORTAL</span>
        </div>
        
        {status === 'success' ? (
          <div className="text-center py-12"><CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-xl font-bold">Submitted!</h2></div>
        ) : (
          <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-xl border space-y-4">
              <h3 className="font-bold border-b pb-2">Enquiry Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>Date: {enquiry.date}</p><p>Type: {enquiry.enquiryType}</p>
                <p>Customer: {enquiry.customerName}</p><p>Article: {enquiry.articleNumber}</p>
                <p>Color: {enquiry.color}</p><p>Qty: {enquiry.quantity}</p>
              </div>
              {enquiry.attachments && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-bold mb-1">Attachments</p>
                  <div className="flex gap-2">
                    {enquiry.attachments.split(',').map((link: string, i: number) => {
                      const cleanLink = link.includes('=HYPERLINK') ? link.match(/"([^"]+)"/)?.[1] : link.trim();
                      return <a key={i} href={cleanLink} target="_blank" className="text-xs text-indigo-600 underline">View File {i+1}</a>
                    })}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" name="supplierName" placeholder="Supplier Name" value={formData.supplierName} onChange={handleChange} className="p-2 border rounded w-full" />
                <input type="text" name="articleNumber" placeholder="Article Number" value={formData.articleNumber} onChange={handleChange} className="p-2 border rounded w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" name="moq" placeholder="MOQ" value={formData.moq} onChange={handleChange} className="p-2 border rounded w-full" />
                <input type="text" name="mcq" placeholder="MCQ" value={formData.mcq} onChange={handleChange} className="p-2 border rounded w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" name="price" placeholder="Price" value={formData.price} onChange={handleChange} className="p-2 border rounded w-full" />
                <input type="date" name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} className="p-2 border rounded w-full" />
              </div>
              <textarea name="remark" placeholder="Remark" rows={3} value={formData.remark} onChange={handleChange} className="p-2 border rounded w-full" />
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Submit Response</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => setUser(data.user)).finally(() => setIsAuthChecking(false));
  }, []);

  if (isAuthChecking) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<EnquiryForm user={user} handleLogin={() => {}} handleLogout={() => {}} />} />
          <Route path="/supplier-response/:id" element={<SupplierResponseForm />} />
        </Routes>
      </div>
    </Router>
  );
}
