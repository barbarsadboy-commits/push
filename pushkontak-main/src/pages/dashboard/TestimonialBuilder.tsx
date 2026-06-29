import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { MessageCircle, Plus, Trash2, ExternalLink, Settings, Lock } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

import VIPFeatureGuard from '../../components/VIPFeatureGuard';

export default function TestimonialBuilder() {
  const { user, role } = useAuthStore();
  const [sites, setSites] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Form State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'testi_sites'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (role === 'free') {
      toast.error('Fitur ini hanya untuk pengguna VIP!');
      return;
    }

    if (!adminUsername || !adminPassword || !storeName) {
      toast.error('Mohon lengkapi semua field!');
      return;
    }

    // Auto-generate subdomain from storeName
    const generatedSubdomain = storeName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const finalSubdomain = generatedSubdomain || `testi-${Date.now()}`;

    try {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await addDoc(collection(db, 'testi_sites'), {
        ownerId: user?.uid,
        subdomain: finalSubdomain,
        adminUsername,
        adminPassword: hashedPassword,
        storeName,
        description,
        createdAt: serverTimestamp(),
        totalTestimonials: 0,
        status: 'active'
      });

      setIsCreating(false);
      resetForm();
      toast.success('Website testimoni berhasil dibuat!');
    } catch (error) {
      console.error('Error creating site:', error);
      toast.error('Gagal membuat website.');
    }
  };

  const resetForm = () => {
    setAdminUsername('');
    setAdminPassword('');
    setStoreName('');
    setDescription('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus website ini?')) {
      try {
        await deleteDoc(doc(db, 'testi_sites', id));
        toast.success('Website dihapus.');
      } catch (error) {
        console.error('Error deleting site:', error);
        toast.error('Gagal menghapus website.');
      }
    }
  };

  return (
    <VIPFeatureGuard featureName="Testimoni Builder">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Testimoni Builder Pro</h1>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors neon-border"
          >
            <Plus className="w-5 h-5" />
            Buat Website Baru
          </button>
        </div>

      {isCreating && (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-6">Konfigurasi Website Testimoni</h2>
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nama Toko / Brand</label>
                <input 
                  type="text" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                  placeholder="Toko Saya Official"
                />
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Akun Admin Website Testimoni
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
                Gunakan akun ini untuk login ke panel admin website testimoni Anda nanti.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Deskripsi Singkat</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none h-24 resize-none"
                placeholder="Deskripsi singkat tentang toko Anda..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="submit"
                disabled={isDeploying}
                className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isDeploying ? 'Deploying...' : 'Buat Website'}
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
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada website testimoni dibuat.</p>
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
                <h3 className="font-bold text-xl mb-1">{site.storeName}</h3>
                <p className="text-sm text-gray-400 truncate">{site.description || 'Tidak ada deskripsi'}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm bg-black/30 p-2 rounded border border-white/5">
                  <span className="text-gray-400">Total Testimoni</span>
                  <span className="font-bold text-primary">{site.totalTestimonials || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm bg-black/30 p-2 rounded border border-white/5">
                  <span className="text-gray-400">Admin User</span>
                  <span className="font-mono text-white">{site.adminUsername}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={`/t/${site.subdomain}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-white text-sm font-bold rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lihat Web
                </a>
                <a 
                  href={`/t/${site.subdomain}/admin`} 
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
