import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  LogOut, 
  Image as ImageIcon, 
  Settings, 
  Save,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

export default function AdminView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Dashboard State
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('testimonials');
  
  // New Testimonial Form
  const [productName, setProductName] = useState('');
  const [specs, setSpecs] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Settings Form
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const storedAuth = localStorage.getItem(`testi_admin_${slug}`);
      if (storedAuth) {
        setIsAuthenticated(true);
      }
      
      try {
        const q = query(collection(db, 'testi_sites'), where('subdomain', '==', slug));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const siteData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
          setSite(siteData);
          setStoreName(siteData.storeName);
          setDescription(siteData.description);

          // Real-time testimonials
          const unsubscribe = onSnapshot(collection(db, `testi_sites/${siteData.id}/testimonials`), (snap) => {
            setTestimonials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });
          
          return () => unsubscribe();
        }
      } catch (error) {
        console.error('Error fetching site:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;

    if (username !== site.adminUsername) {
      toast.error('Username salah!');
      return;
    }

    const isMatch = await bcrypt.compare(password, site.adminPassword);
    if (isMatch) {
      setIsAuthenticated(true);
      localStorage.setItem(`testi_admin_${slug}`, 'true');
      toast.success('Login berhasil!');
    } else {
      toast.error('Password salah!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(`testi_admin_${slug}`);
    toast.success('Logout berhasil.');
  };

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !price || !imageUrl) {
      toast.error('Mohon lengkapi data!');
      return;
    }

    try {
      await addDoc(collection(db, `testi_sites/${site.id}/testimonials`), {
        productName,
        specs,
        price: Number(price),
        imageUrl,
        createdAt: serverTimestamp(),
        status: 'done'
      });
      
      // Update total count
      await updateDoc(doc(db, 'testi_sites', site.id), {
        totalTestimonials: (site.totalTestimonials || 0) + 1
      });

      toast.success('Testimoni ditambahkan!');
      setProductName('');
      setSpecs('');
      setPrice('');
      setImageUrl('');
    } catch (error) {
      console.error('Error adding testimonial:', error);
      toast.error('Gagal menambahkan testimoni.');
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (confirm('Hapus testimoni ini?')) {
      try {
        await deleteDoc(doc(db, `testi_sites/${site.id}/testimonials`, id));
        // Update total count
        await updateDoc(doc(db, 'testi_sites', site.id), {
          totalTestimonials: Math.max((site.totalTestimonials || 0) - 1, 0)
        });
        toast.success('Testimoni dihapus.');
      } catch (error) {
        console.error('Error deleting testimonial:', error);
        toast.error('Gagal menghapus.');
      }
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'testi_sites', site.id), {
        storeName,
        description
      });
      toast.success('Pengaturan disimpan!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Gagal menyimpan pengaturan.');
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!site) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Website tidak ditemukan</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-gray-400">{site.storeName}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Masuk Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-white/10 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="font-bold text-xl text-white">{site.storeName}</h1>
          <p className="text-xs text-gray-500">Admin Panel</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('testimonials')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'testimonials' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Testimoni
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Settings className="w-5 h-5" />
            Pengaturan
          </button>
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors mt-auto"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'testimonials' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Manajemen Testimoni</h2>
              <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                <span className="text-sm text-gray-400">Total: </span>
                <span className="font-bold text-primary">{testimonials.length}</span>
              </div>
            </div>

            {/* Add Form */}
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Tambah Testimoni Baru
              </h3>
              <form onSubmit={handleAddTestimonial} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Nama Produk"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Spesifikasi (cth: 1 Tahun, Premium)"
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                />
                <input 
                  type="number" 
                  placeholder="Harga (Rp)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="URL Gambar (https://...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                  />
                  {/* In a real app, implement file upload here */}
                </div>
                <button 
                  type="submit"
                  className="col-span-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Simpan Testimoni
                </button>
              </form>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testi) => (
                <div key={testi.id} className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden group">
                  <div className="aspect-video bg-zinc-800 relative">
                    <img src={testi.imageUrl} alt={testi.productName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => handleDeleteTestimonial(testi.id)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold">{testi.productName}</h4>
                    <p className="text-sm text-gray-400">{testi.specs}</p>
                    <p className="text-primary font-mono mt-2">Rp {testi.price.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-8">Pengaturan Website</h2>
            <form onSubmit={handleUpdateSettings} className="space-y-6 bg-zinc-900 border border-white/10 p-6 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nama Toko</label>
                <input 
                  type="text" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Deskripsi</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none h-32 resize-none"
                />
              </div>
              <button 
                type="submit"
                className="px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Simpan Perubahan
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
