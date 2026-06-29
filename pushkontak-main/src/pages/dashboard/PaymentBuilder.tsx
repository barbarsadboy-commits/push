import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { CreditCard, Plus, Trash2, ExternalLink, Settings, Lock, Wallet, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

import VIPFeatureGuard from '../../components/VIPFeatureGuard';

export default function PaymentBuilder() {
  const { user, role } = useAuthStore();
  const [sites, setSites] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Form State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Initial Methods State
  const [initialMethods, setInitialMethods] = useState<any[]>([]);
  const [newMethod, setNewMethod] = useState({
    name: '',
    number: '',
    logo: '',
    qris_image: ''
  });

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'payment_sites'), where('owner_id', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddMethod = () => {
    if (!newMethod.name || !newMethod.number) {
      toast.error('Nama metode dan nomor/ID wajib diisi!');
      return;
    }
    setInitialMethods([...initialMethods, { ...newMethod, id: Date.now().toString(), is_active: true, order: initialMethods.length + 1 }]);
    setNewMethod({ name: '', number: '', logo: '', qris_image: '' });
  };

  const handleRemoveMethod = (id: string) => {
    setInitialMethods(initialMethods.filter(m => m.id !== id));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (role === 'free') {
      toast.error('Fitur ini hanya untuk pengguna VIP!');
      return;
    }

    if (!adminUsername || !adminPassword || !title) {
      toast.error('Mohon lengkapi semua field utama!');
      return;
    }

    // Auto-generate slug from title
    const generatedSlug = title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const finalSlug = generatedSlug || `pay-${Date.now()}`;

    try {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Use setDoc with slug as ID to ensure uniqueness and easy access
      await setDoc(doc(db, 'payment_sites', finalSlug), {
        owner_id: user?.uid,
        slug: finalSlug,
        admin_username: adminUsername,
        admin_password: hashedPassword,
        title,
        description,
        created_at: serverTimestamp(),
        views: 0,
        status: 'active'
      });

      // Add initial methods
      if (initialMethods.length > 0) {
        const methodsRef = collection(db, 'payment_sites', finalSlug, 'methods');
        for (const method of initialMethods) {
          const { id, ...methodData } = method; // Remove temporary ID
          await addDoc(methodsRef, methodData);
        }
      }

      setIsCreating(false);
      resetForm();
      toast.success('Halaman pembayaran berhasil dibuat!');
    } catch (error) {
      console.error('Error creating site:', error);
      toast.error('Gagal membuat halaman. Judul mungkin sudah digunakan.');
    }
  };

  const resetForm = () => {
    setAdminUsername('');
    setAdminPassword('');
    setTitle('');
    setDescription('');
    setInitialMethods([]);
    setNewMethod({ name: '', number: '', logo: '', qris_image: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus halaman ini?')) {
      try {
        await deleteDoc(doc(db, 'payment_sites', id));
        toast.success('Halaman dihapus.');
      } catch (error) {
        console.error('Error deleting site:', error);
        toast.error('Gagal menghapus halaman.');
      }
    }
  };

  return (
    <VIPFeatureGuard featureName="Halaman Pembayaran">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Payment Page Builder</h1>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors neon-border"
          >
            <Plus className="w-5 h-5" />
            Buat Halaman Baru
          </button>
        </div>

      {isCreating && (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-6">Konfigurasi Halaman Pembayaran</h2>
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Judul Halaman</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                  placeholder="Pembayaran Toko Saya"
                />
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Akun Admin Halaman Pembayaran
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Username Admin</label>
                  <input 
                    type="text" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Password Admin</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                    placeholder="********"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Gunakan akun ini untuk login ke panel admin halaman pembayaran Anda nanti.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Deskripsi (Opsional)</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none h-24 resize-none"
                placeholder="Deskripsi singkat atau instruksi pembayaran..."
              />
            </div>

            {/* Initial Payment Methods Input */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Metode Pembayaran Awal
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input 
                  type="text" 
                  value={newMethod.name}
                  onChange={(e) => setNewMethod({...newMethod, name: e.target.value})}
                  className="bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                  placeholder="Nama (e.g., BCA, Dana)"
                />
                <input 
                  type="text" 
                  value={newMethod.number}
                  onChange={(e) => setNewMethod({...newMethod, number: e.target.value})}
                  className="bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                  placeholder="Nomor Rekening / ID"
                />
                <input 
                  type="text" 
                  value={newMethod.logo}
                  onChange={(e) => setNewMethod({...newMethod, logo: e.target.value})}
                  className="bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none text-sm"
                  placeholder="URL Logo (Opsional)"
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMethod.qris_image}
                    onChange={(e) => setNewMethod({...newMethod, qris_image: e.target.value})}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none text-sm"
                    placeholder="URL QRIS (Opsional)"
                  />
                  <button 
                    type="button"
                    onClick={handleAddMethod}
                    className="bg-primary text-black font-bold px-4 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {initialMethods.length > 0 && (
                <div className="space-y-2">
                  {initialMethods.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-black font-bold text-xs">
                          {m.logo ? <img src={m.logo} alt="" className="w-full h-full object-contain" /> : m.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{m.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.number}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveMethod(m.id)}
                        className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="submit"
                disabled={isDeploying}
                className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isDeploying ? 'Deploying...' : 'Buat Halaman'}
              </button>
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-6 py-2 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.length === 0 && !isCreating ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-zinc-900/50 rounded-xl border border-white/5 border-dashed">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada halaman pembayaran dibuat.</p>
          </div>
        ) : (
          sites.map((site) => (
            <div key={site.id} className="bg-zinc-900 border border-white/10 rounded-xl p-6 hover:border-primary/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleDelete(site.id)}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-xl mb-1">{site.title}</h3>
                <p className="text-sm text-gray-400 truncate">{site.description || 'Tidak ada deskripsi'}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm bg-black/30 p-2 rounded border border-white/5">
                  <span className="text-gray-400">Admin User</span>
                  <span className="font-mono text-white">{site.admin_username}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={`/p/${site.slug}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-white text-sm font-bold rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lihat Web
                </a>
                <a 
                  href={`/p/${site.slug}/admin`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-bold rounded-lg hover:bg-primary/20 transition-colors border border-primary/20"
                >
                  <Settings className="w-4 h-4" />
                  Panel Admin
                </a>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </VIPFeatureGuard>
  );
}
