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
    customerName: '',
    articleNumber: '',
    description: '', // New field after Article Number
    email: user?.email || '',
    enquiryType: '',
    supplierName: '',
    composition: '',
    gsm: '',
    finish: '',
    remark: '', // Renamed from description
    items: [
      { color: '', quantity: '', widthSize: '', attachments: [] as { name: string, size: number, type: string, content: string }[] }
    ]
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
          customerName: '',
          articleNumber: '',
          description: '',
          email: user?.email || '',
          enquiryType: '',
          supplierName: '',
          composition: '',
          gsm: '',
          finish: '',
          remark: '',
          items: [{ color: '', quantity: '', widthSize: '', attachments: [] }]
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

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { color: '', quantity: '', widthSize: '', attachments: [] }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    (newItems[index] as any)[name] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleItemFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
      const newItems = [...formData.items];
      newItems[index].attachments = [...newItems[index].attachments, ...processedFiles];
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
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

          {/* New Description Field after Article Number */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
              Description
            </label>
            <textarea name="description" required rows={2} placeholder="Description of Article..." value={formData.description} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          {/* Multiple Items Table (Color, Qty, Size, Attachment) - MOVED HERE */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <label className="flex items-center text-sm font-bold text-slate-800">
                <Layers className="w-4 h-4 mr-2 text-indigo-500" />
                Item Details (Multiple)
              </label>
              <button 
                type="button" 
                onClick={addItem}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1"
              >
                <Hash className="w-3 h-3" /> Add Row
              </button>
            </div>
            
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="text-left pb-2 font-semibold">Color</th>
                  <th className="text-left pb-2 font-semibold">Quantity</th>
                  <th className="text-left pb-2 font-semibold">Width / Size</th>
                  <th className="text-left pb-2 font-semibold">Attachments</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 pr-2">
                      <input 
                        type="text" 
                        name="color" 
                        required 
                        placeholder="Color" 
                        value={item.color} 
                        onChange={(e) => handleItemChange(index, e)} 
                        className="w-full p-2 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500" 
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input 
                        type="text" 
                        name="quantity" 
                        required 
                        placeholder="Qty" 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, e)} 
                        className="w-full p-2 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500" 
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input 
                        type="text" 
                        name="widthSize" 
                        required 
                        placeholder="Size" 
                        value={item.widthSize} 
                        onChange={(e) => handleItemChange(index, e)} 
                        className="w-full p-2 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500" 
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex flex-col gap-1">
                        <input 
                          type="file" 
                          multiple 
                          onChange={(e) => handleItemFileChange(index, e)} 
                          className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700" 
                        />
                        {item.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.attachments.map((f, fi) => (
                              <span key={fi} className="text-[9px] bg-slate-100 px-1 rounded border border-slate-200 truncate max-w-[80px]">{f.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      {formData.items.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeItem(index)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Row 5: Composition & GSM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Box className="w-4 h-4 mr-2 text-indigo-500" />
                Composition
              </label>
              <input type="text" name="composition" required placeholder="Composition" value={formData.composition} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                <Hash className="w-4 h-4 mr-2 text-indigo-500" />
                GSM
              </label>
              <input type="text" name="gsm" required placeholder="GSM" value={formData.gsm} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Row 6: Finish */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
              Finish
            </label>
            <input type="text" name="finish" required placeholder="Finish" value={formData.finish} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Remark (Renamed from Description) */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
              Remark
            </label>
            <textarea name="remark" rows={3} placeholder="Any additional remarks..." value={formData.remark} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
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
  const [error, setError] = useState<string | null>(null);
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
    console.log("Fetching enquiry for ID:", id);
    fetch(`/api/enquiry/${id}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch enquiry');
        return data;
      })
      .then(data => {
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
          remark: data.supplierRemark || ''
        });
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError(err.message);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Enquiry</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  if (!enquiry) return <div className="min-h-screen flex items-center justify-center text-red-500">Enquiry not found or expired.</div>;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header Image */}
      <div className="w-full h-36 rounded-t-xl overflow-hidden shadow-sm mb-0 border border-slate-200 border-b-0 relative group bg-emerald-50">
        <img 
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop" 
          alt="Supplier Portal Header" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-b-xl shadow-sm border-t-0 overflow-hidden mb-6 border border-slate-200 border-t-emerald-500 border-t-4">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Supplier Response Form</h1>
            <p className="text-sm text-slate-500">Please provide your quote and details for this enquiry.</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            SUPPLIER PORTAL
          </span>
        </div>
      </div>
        
      {status === 'success' ? (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-xl shadow-sm text-center border border-slate-200"
        >
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Response Submitted!</h2>
          <p className="text-slate-600 mb-4 leading-relaxed">Thank you for your response. The details have been updated in the master sheet.</p>
        </motion.div>
      ) : (
        <div className="space-y-4 pb-12">
          {/* Read-only Enquiry Details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
              Original Enquiry Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="space-y-2">
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Date:</span> <span className="font-semibold">{enquiry.date}</span></p>
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Type:</span> <span className="font-semibold">{enquiry.enquiryType}</span></p>
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Customer:</span> <span className="font-semibold">{enquiry.customerName}</span></p>
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Article #:</span> <span className="font-semibold">{enquiry.articleNumber}</span></p>
              </div>
              <div className="space-y-2">
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Composition:</span> <span className="font-semibold">{enquiry.composition}</span></p>
                <p className="flex justify-between"><span className="text-slate-500 font-medium">GSM:</span> <span className="font-semibold">{enquiry.gsm}</span></p>
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Finish:</span> <span className="font-semibold">{enquiry.finish}</span></p>
              </div>
            </div>

            {/* Items Table */}
            {enquiry.items && enquiry.items.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold">
                    <tr>
                      <th className="px-4 py-2 border-b">Color</th>
                      <th className="px-4 py-2 border-b">Quantity</th>
                      <th className="px-4 py-2 border-b">Width / Size</th>
                      <th className="px-4 py-2 border-b">Attachments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {enquiry.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">{item.color}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">{item.widthSize}</td>
                        <td className="px-4 py-2">
                          {item.attachments && item.attachments.split(',').map((link: string, li: number) => {
                            const cleanLink = link.includes('=HYPERLINK') 
                              ? link.match(/"([^"]+)"/)?.[1] 
                              : link.trim();
                            return (
                              <a 
                                key={li} 
                                href={cleanLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mr-2"
                              >
                                <Paperclip className="w-3 h-3 mr-1" />
                                File {li + 1}
                              </a>
                            );
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {enquiry.description && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{enquiry.description}</p>
                </div>
              )}
              {enquiry.remark && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Remark</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{enquiry.remark}</p>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center mb-4">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                Your Response Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Supplier Name</label>
                  <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Article Number</label>
                  <input type="text" name="articleNumber" value={formData.articleNumber} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Composition</label>
                <input type="text" name="composition" value={formData.composition} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GSM</label>
                <input type="text" name="gsm" value={formData.gsm} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">MOQ</label>
                <input type="text" name="moq" required value={formData.moq} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">MCQ</label>
                <input type="text" name="mcq" required value={formData.mcq} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Finish</label>
                <input type="text" name="finish" value={formData.finish} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Width / Size</label>
                <input type="text" name="widthSize" value={formData.widthSize} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price</label>
                <input type="text" name="price" required value={formData.price} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Delivery Time</label>
                <input type="date" name="deliveryTime" required value={formData.deliveryTime} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remark</label>
              <textarea name="remark" rows={3} value={formData.remark} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
            </div>

            <button type="submit" disabled={status === 'loading'} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Submit Response
            </button>
          </form>
        </div>
      )}
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
