import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  User, 
  FileText, 
  Hash, 
  Layers, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  Loader2,
  LogOut,
  LogIn,
  CheckSquare,
  Square,
  Paperclip,
  Palette,
  Maximize,
  Box,
  Clock,
  DollarSign,
  Tag,
  Truck
} from 'lucide-react';

interface User {
  email: string;
  name: string;
  picture: string;
}

// --- Main Enquiry Form Component ---
function EnquiryForm({ user, handleLogin, handleLogout }: { user: User | null, handleLogin: () => void, handleLogout: () => void }) {
  const [formData, setFormData] = useState({
    dateOfEnquiry: new Date().toISOString().split('T')[0],
    description: '',
    customerName: '',
    articleNumber: '',
    quantity: '',
    email: user?.email || '',
    enquiryType: '',
    supplierName: '',
    color: '',
    widthSize: '',
    composition: '',
    gsm: '',
    finish: '',
    attachments: [] as { name: string, size: number, type: string }[]
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/submit-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        setFormData({
          dateOfEnquiry: new Date().toISOString().split('T')[0],
          description: '',
          customerName: '',
          articleNumber: '',
          quantity: '',
          email: user?.email || '',
          enquiryType: '',
          supplierName: '',
          color: '',
          widthSize: '',
          composition: '',
          gsm: '',
          finish: '',
          attachments: []
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
            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              content: base64
            });
          };
        });
      });

      const processedFiles = await Promise.all(filePromises);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...processedFiles]
      }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header Image */}
      <div className="w-full h-36 rounded-t-xl overflow-hidden shadow-sm mb-0 border border-slate-200 border-b-0 relative group bg-pink-50">
        <img 
          src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=2070&auto=format&fit=crop" 
          alt="Ladies Apparel Header" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-b-xl shadow-sm border-t-0 overflow-hidden mb-6 border border-slate-200 border-t-indigo-600 border-t-4">
        <div className="p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Order Enquiry Form</h1>
          <p className="text-sm text-slate-500">Please fill out the details below to submit your enquiry.</p>
          
          {/* Hidden Auth Section as requested */}
          <div className="hidden">
            {user ? (
              <button onClick={handleLogout}>Logout</button>
            ) : (
              <button onClick={handleLogin}>Login</button>
            )}
          </div>
        </div>
      </div>

      {status === 'success' ? (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-xl shadow-sm text-center border border-slate-200"
        >
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Submission Successful</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">{message}</p>
          <button 
            onClick={() => setStatus('idle')}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            Submit Another Enquiry
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pb-12">
          {/* Row 1: Date & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                Date of Enquiry
              </label>
              <input type="date" name="dateOfEnquiry" required value={formData.dateOfEnquiry} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Mail className="w-4 h-4 mr-2 text-indigo-500" />
                Email Address
              </label>
              <input type="email" name="email" required placeholder="your.email@ginzalimited.com" value={formData.email} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Row 2: Type of Enquiry & Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Tag className="w-4 h-4 mr-2 text-indigo-500" />
                Type of Enquiry
              </label>
              <select name="enquiryType" required value={formData.enquiryType} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="" disabled>Select the enquiry type</option>
                <option value="New">New</option>
                <option value="Order">Order</option>
              </select>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Truck className="w-4 h-4 mr-2 text-indigo-500" />
                Name of Supplier
              </label>
              <input type="text" name="supplierName" required placeholder="Supplier Name" value={formData.supplierName} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Row 3: Customer & Article */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <User className="w-4 h-4 mr-2 text-indigo-500" />
                Customer Name
              </label>
              <input type="text" name="customerName" required placeholder="Customer Name" value={formData.customerName} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Hash className="w-4 h-4 mr-2 text-indigo-500" />
                Article Number
              </label>
              <input type="text" name="articleNumber" required placeholder="Article #" value={formData.articleNumber} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Row 4: Color & Qty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Palette className="w-4 h-4 mr-2 text-indigo-500" />
                Color
              </label>
              <input type="text" name="color" required placeholder="Color" value={formData.color} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Layers className="w-4 h-4 mr-2 text-indigo-500" />
                Quantity
              </label>
              <input type="text" name="quantity" required placeholder="Quantity" value={formData.quantity} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Row 5: Size & Composition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Maximize className="w-4 h-4 mr-2 text-indigo-500" />
                Width / Size
              </label>
              <input type="text" name="widthSize" required placeholder="Width / Size" value={formData.widthSize} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Box className="w-4 h-4 mr-2 text-indigo-500" />
                Composition
              </label>
              <input type="text" name="composition" required placeholder="Composition" value={formData.composition} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Row 6: GSM & Finish */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Hash className="w-4 h-4 mr-2 text-indigo-500" />
                GSM
              </label>
              <input type="text" name="gsm" required placeholder="GSM" value={formData.gsm} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                Finish
              </label>
              <input type="text" name="finish" required placeholder="Finish" value={formData.finish} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Description */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
              Description
            </label>
            <textarea name="description" required rows={3} placeholder="Details..." value={formData.description} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          {/* Attachments */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <Paperclip className="w-4 h-4 mr-2 text-indigo-500" />
              Attachments (Multiple)
            </label>
            <input type="file" multiple onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            {formData.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.attachments.map((f: { name: string, size: number, type: string }, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 text-xs rounded border border-slate-200">{f.name}</span>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence>
            {status === 'error' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={status === 'loading'} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Submit Enquiry
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
    supplierName: '',
    articleNumber: '',
    composition: '',
    gsm: '',
    moq: '',
    mcq: '',
    finish: '',
    widthSize: '',
    price: '',
    deliveryTime: '',
    remark: ''
  });

  useEffect(() => {
    fetch(`/api/enquiry/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setEnquiry(data);
        setFormData({
          supplierName: data.supplierName || '',
          articleNumber: data.articleNumber || '',
          composition: data.composition || '',
          gsm: data.gsm || '',
          moq: data.moq || '',
          mcq: data.mcq || '',
          finish: data.finish || '',
          widthSize: data.widthSize || '',
          price: data.price || '',
          deliveryTime: data.deliveryTime || '',
          remark: data.remark || ''
        });
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/update-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id, tabName: enquiry.tabName, rowIndex: enquiry.rowIndex }),
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch (err) {
      setStatus('error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!enquiry) return <div className="min-h-screen flex items-center justify-center text-red-500">Enquiry not found or expired.</div>;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 border-t-emerald-500 border-t-4">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-900">Supplier Response Form</h1>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            SUPPLIER PORTAL
          </span>
        </div>
        
        {status === 'success' ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">Response Submitted!</h2>
            <p className="text-slate-600">Thank you for your response.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Read-only Enquiry Details */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                Enquiry Details
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <p><span className="text-slate-500">Date:</span> {enquiry.date}</p>
                <p><span className="text-slate-500">Type:</span> {enquiry.enquiryType}</p>
                <p><span className="text-slate-500">Customer:</span> {enquiry.customerName}</p>
                <p><span className="text-slate-500">Article #:</span> {enquiry.articleNumber}</p>
                <p><span className="text-slate-500">Color:</span> {enquiry.color}</p>
                <p><span className="text-slate-500">Quantity:</span> {enquiry.quantity}</p>
                <p><span className="text-slate-500">Width/Size:</span> {enquiry.widthSize}</p>
                <p><span className="text-slate-500">Composition:</span> {enquiry.composition}</p>
                <p><span className="text-slate-500">GSM:</span> {enquiry.gsm}</p>
                <p><span className="text-slate-500">Finish:</span> {enquiry.finish}</p>
              </div>
              {enquiry.attachments && (
                <div className="pt-2 border-t mt-2">
                  <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {enquiry.attachments.split(',').map((link: string, i: number) => {
                      const cleanLink = link.includes('=HYPERLINK') 
                        ? link.match(/"([^"]+)"/)?.[1] 
                        : link.trim();
                      return (
                        <a 
                          key={i} 
                          href={cleanLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
                        >
                          View File {i + 1}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {enquiry.description && (
                <div className="pt-2 border-t mt-2">
                  <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">Description</p>
                  <p className="text-sm text-slate-700">{enquiry.description}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center pt-4">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                Your Response
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name</label>
                <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Article Number</label>
                <input type="text" name="articleNumber" value={formData.articleNumber} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Composition</label>
                <input type="text" name="composition" value={formData.composition} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GSM</label>
                <input type="text" name="gsm" value={formData.gsm} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">MOQ</label>
                <input type="text" name="moq" required value={formData.moq} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">MCQ</label>
                <input type="text" name="mcq" required value={formData.mcq} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Finish</label>
                <input type="text" name="finish" value={formData.finish} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Width / Size</label>
                <input type="text" name="widthSize" value={formData.widthSize} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                <input type="text" name="price" required value={formData.price} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Time</label>
                <input type="date" name="deliveryTime" required value={formData.deliveryTime} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remark</label>
              <textarea name="remark" rows={3} value={formData.remark} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <button type="submit" disabled={status === 'loading'} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {status === 'loading' ? 'Submitting...' : 'Submit Response'}
            </button>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}

// --- App Root Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    checkAuth();
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') checkAuth();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const { url } = await res.json();
      window.open(url, 'google_oauth', 'width=500,height=600');
    } catch (err) {
      console.error('Failed to get auth URL:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <Routes>
          <Route path="/" element={<EnquiryForm user={user} handleLogin={handleLogin} handleLogout={handleLogout} />} />
          <Route path="/supplier-response/:id" element={<SupplierResponseForm />} />
        </Routes>
        <footer className="py-8 text-center text-slate-400 text-sm">
          <p>&copy; 2026 Enquiry Management System. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}
