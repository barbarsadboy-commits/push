import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Link as LinkIcon, Plus, Trash2, ExternalLink, Settings, Lock } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

import VIPFeatureGuard from '../../components/VIPFeatureGuard';

export default function LinktreeBuilder() {
  const { user, role } = useAuthStore();
  const [sites, setSites] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Form State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');

  // Initial Link State
  const [initialLinkName, setInitialLinkName] = useState('');
  const [initialLinkUrl, setInitialLinkUrl] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'linktree_sites'), where('ownerId', '==', user.uid));
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
    const finalSubdomain = generatedSubdomain || `link-${Date.now()}`;

    try {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const siteRef = await addDoc(collection(db, 'linktree_sites'), {
        ownerId: user?.uid,
        subdomain_namawebsite: finalSubdomain,
        username_admin: adminUsername,
        password_admin: hashedPassword,
        storeName,
        description,
        tanggal_upload: serverTimestamp(),
        totalLinks: initialLinkName ? 1 : 0,
        status: 'active'
      });

      // Add initial link if provided
      if (initialLinkName && initialLinkUrl) {
        await addDoc(collection(db, 'linktree_sites', siteRef.id, 'links'), {
          nama_link: initialLinkName,
          url_target: initialLinkUrl,
          logo_url: '',
          urutan: 0,
          aktif: true,
          tanggal_upload: serverTimestamp()
        });
      }

      setIsCreating(false);
      resetForm();
      toast.success('Website Linktree berhasil dibuat!');
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
    setInitialLinkName('');
    setInitialLinkUrl('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus website ini?')) {
      try {
        await deleteDoc(doc(db, 'linktree_sites', id));
        toast.success('Website dihapus.');
      } catch (error) {
        console.error('Error deleting site:', error);
        toast.error('Gagal menghapus website.');
      }
    }
  };

  return (
    <VIPFeatureGuard featureName="Linktree Builder">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
              Linktree Builder Pro
            </h1>
            <p className="text-gray-400 text-sm mt-1">Buat halaman link pribadi Anda dengan subdomain unik.</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
          >
            <Plus className="w-5 h-5" />
            Buat Website Baru
          </button>
        </div>

      {isCreating && (
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 animate-fade-in shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
          
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            Konfigurasi Website Linktree
          </h2>
          
          <form onSubmit={handleCreate} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Nama Profil / Brand</label>
                <input 
                  type="text" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-primary focus:outline-none text-white font-medium transition-all"
                  placeholder="Nama Anda / Brand"
                />
              </div>
            </div>

            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative">
                <h3 className="text-sm font-bold text-primary mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <Lock className="w-4 h-4" />
                  Akun Admin Website Linktree
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Username Admin</label>
                    <input 
                      type="text" 
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 focus:border-primary focus:outline-none"
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Password Admin</label>
                    <input 
                      type="password" 
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 focus:border-primary focus:outline-none"
                      placeholder="********"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-4 italic">
                  * Gunakan akun ini untuk login ke panel admin website Anda
                </p>
              </div>
            </div>

            <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-emerald-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
                <LinkIcon className="w-4 h-4" />
                Input Link Pertama
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nama Link</label>
                  <input 
                    type="text" 
                    value={initialLinkName}
                    onChange={(e) => setInitialLinkName(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 focus:border-primary focus:outline-none"
                    placeholder="Contoh: Instagram"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">URL Target</label>
                  <input 
                    type="url" 
                    value={initialLinkUrl}
                    onChange={(e) => setInitialLinkUrl(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 focus:border-primary focus:outline-none"
                    placeholder="https://instagram.com/user"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Bio Singkat</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-primary focus:outline-none h-32 resize-none"
                placeholder="Deskripsi singkat tentang diri Anda atau bisnis Anda..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="submit"
                disabled={isDeploying}
                className="flex-1 py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] disabled:opacity-50"
              >
                {isDeploying ? 'Deploying...' : 'Publish Website'}
              </button>
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-8 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sites.length === 0 && !isCreating ? (
          <div className="col-span-full text-center py-20 text-gray-500 bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
            <LinkIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg">Belum ada website Linktree dibuat.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="mt-4 text-primary hover:underline font-bold"
            >
              Mulai buat sekarang
            </button>
          </div>
        ) : (
          sites.map((site) => (
            <div key={site.id} className="group relative bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onClick={() => handleDelete(site.id)}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20">
                  <LinkIcon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">{site.storeName}</h3>
                <p className="text-sm text-gray-400 line-clamp-2 h-10">{site.description || 'Tidak ada deskripsi'}</p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="text-gray-500 uppercase tracking-widest">Total Links</span>
                  <span className="font-bold text-primary">{site.totalLinks || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="text-gray-500 uppercase tracking-widest">Admin User</span>
                  <span className="font-mono text-white">{site.username_admin}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <a 
                  href={`/l/${site.subdomain_namawebsite}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-white text-sm font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lihat Website
                </a>
                <a 
                  href={`/l/${site.subdomain_namawebsite}/admin.html`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary text-sm font-bold rounded-xl hover:bg-primary/20 transition-all border border-primary/20"
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
