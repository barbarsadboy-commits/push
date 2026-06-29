import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { 
  Lock, User, LogOut, Plus, Trash2, Edit2, Check, X, 
  CreditCard, QrCode, Image as ImageIcon, ArrowUp, ArrowDown, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import bcrypt from 'bcryptjs';

interface PaymentMethod {
  id: string;
  name: string;
  number: string;
  logo: string;
  qris_image?: string;
  is_active: boolean;
  order: number;
}

export default function AdminView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Data State
  const [siteData, setSiteData] = useState<any>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    logo: '',
    qris_image: '',
    is_active: true,
    order: 0
  });

  // Check if already logged in (session storage)
  const fetchData = async () => {
    if (!slug) return;
    try {
      const siteRef = doc(db, 'payment_sites', slug);
      const siteSnap = await getDoc(siteRef);
      
      if (siteSnap.exists()) {
        setSiteData(siteSnap.data());
        
        // Fetch methods
        const methodsRef = collection(db, 'payment_sites', slug, 'methods');
        const q = query(methodsRef, orderBy('order', 'asc'));
        const methodsSnap = await getDocs(q);
        
        setMethods(methodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod)));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data.');
    }
  };

  useEffect(() => {
    const session = sessionStorage.getItem(`payment_admin_${slug}`);
    if (session) {
      setIsAuthenticated(true);
      fetchData();
    }
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const siteRef = doc(db, 'payment_sites', slug!);
      const siteSnap = await getDoc(siteRef);

      if (!siteSnap.exists()) {
        toast.error('Halaman tidak ditemukan.');
        setLoading(false);
        return;
      }

      const data = siteSnap.data();
      
      // Check username
      if (data.admin_username !== username) {
        toast.error('Username atau password salah!');
        setLoading(false);
        return;
      }

      // Check password (bcrypt)
      const isPasswordValid = await bcrypt.compare(password, data.admin_password);

      if (isPasswordValid) {
        setIsAuthenticated(true);
        sessionStorage.setItem(`payment_admin_${slug}`, 'true');
        setSiteData(data);
        fetchData();
        toast.success('Login berhasil!');
      } else {
        toast.error('Username atau password salah!');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Terjadi kesalahan saat login.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`payment_admin_${slug}`);
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    navigate(`/p/${slug}`); // Redirect to public view
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    try {
      const methodsRef = collection(db, 'payment_sites', slug, 'methods');
      
      if (editingMethod) {
        // Update
        await updateDoc(doc(methodsRef, editingMethod.id), formData);
        toast.success('Metode berhasil diperbarui!');
      } else {
        // Create
        await addDoc(methodsRef, {
          ...formData,
          order: methods.length + 1
        });
        toast.success('Metode berhasil ditambahkan!');
      }

      setIsModalOpen(false);
      setEditingMethod(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving method:', error);
      toast.error('Gagal menyimpan data.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus metode ini?')) return;
    
    try {
      await deleteDoc(doc(db, 'payment_sites', slug!, 'methods', id));
      toast.success('Metode dihapus.');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Gagal menghapus data.');
    }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      await updateDoc(doc(db, 'payment_sites', slug!, 'methods', method.id), {
        is_active: !method.is_active
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling:', error);
      toast.error('Gagal mengubah status.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      number: '',
      logo: '',
      qris_image: '',
      is_active: true,
      order: 0
    });
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      number: method.number,
      logo: method.logo,
      qris_image: method.qris_image || '',
      is_active: method.is_active,
      order: method.order
    });
    setIsModalOpen(true);
  };

  // Login View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="text-gray-400 text-sm mt-2">Kelola halaman pembayaran Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none transition-colors"
                  placeholder="admin"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'Memproses...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{siteData?.title}</h1>
              <a 
                href={`/p/${slug}`} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs text-gray-400 hover:text-primary flex items-center gap-1"
              >
                /p/{slug} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Daftar Metode Pembayaran</h2>
          <button
            onClick={() => {
              setEditingMethod(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tambah Metode
          </button>
        </div>

        <div className="grid gap-4">
          {methods.map((method) => (
            <div 
              key={method.id} 
              className={`bg-zinc-900 border ${method.is_active ? 'border-white/10' : 'border-red-500/20 bg-red-500/5'} rounded-xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center shrink-0">
                  {method.logo ? (
                    <img src={method.logo} alt={method.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-black font-bold text-xs">{method.name.substring(0, 2)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {method.name}
                    {!method.is_active && (
                      <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wide">Nonaktif</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400 font-mono">{method.number}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(method)}
                  className={`p-2 rounded-lg transition-colors ${
                    method.is_active 
                      ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                  }`}
                  title={method.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {method.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEditModal(method)}
                  className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(method.id)}
                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {methods.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-zinc-900/50 rounded-xl border border-white/5 border-dashed">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada metode pembayaran.</p>
            </div>
          )}
        </div>
      </main>

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <h2 className="text-xl font-bold mb-6">
                {editingMethod ? 'Edit Metode' : 'Tambah Metode Baru'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nama Bank / E-Wallet</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                    placeholder="Contoh: BCA, Dana, GoPay"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nomor Rekening / ID</label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none font-mono"
                    placeholder="1234567890"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">URL Logo (Opsional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.logo}
                      onChange={(e) => setFormData({...formData, logo: e.target.value})}
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none text-sm"
                      placeholder="https://..."
                    />
                    {formData.logo && (
                      <div className="w-12 h-12 bg-white rounded-lg p-1 shrink-0">
                        <img src={formData.logo} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Kosongkan untuk menggunakan inisial.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">URL QRIS (Opsional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.qris_image}
                      onChange={(e) => setFormData({...formData, qris_image: e.target.value})}
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none text-sm"
                      placeholder="https://..."
                    />
                    {formData.qris_image && (
                      <div className="w-12 h-12 bg-white rounded-lg p-1 shrink-0">
                        <img src={formData.qris_image} alt="QRIS" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
