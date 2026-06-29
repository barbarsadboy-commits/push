import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lock, LogOut, Plus, Trash2, Edit2, GripVertical, Save, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  logo?: string;
  is_active: boolean;
  order: number;
}

export default function AdminView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState<any>(null);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard State
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LinkItem>>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, [slug]);

  const checkAuthStatus = async () => {
    const sessionToken = sessionStorage.getItem(`linktree_admin_${slug}`);
    if (sessionToken) {
      setIsAuthenticated(true);
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      // Find site by subdomain
      const q = query(collection(db, 'linktree_sites'), where('subdomain_namawebsite', '==', slug));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLoginError('Website tidak ditemukan');
        setLoading(false);
        return;
      }

      const siteDoc = querySnapshot.docs[0];
      const data = siteDoc.data();

      if (data.username_admin !== username) {
        setLoginError('Username atau password salah');
        setLoading(false);
        return;
      }

      const isPasswordMatch = await bcrypt.compare(password, data.password_admin);
      
      if (isPasswordMatch) {
        sessionStorage.setItem(`linktree_admin_${slug}`, 'true');
        setSiteData({ id: siteDoc.id, ...data });
        setIsAuthenticated(true);
        fetchDashboardData(siteDoc.id);
      } else {
        setLoginError('Username atau password salah');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`linktree_admin_${slug}`);
    setIsAuthenticated(false);
    setSiteData(null);
    setLinks([]);
  };

  const fetchDashboardData = async (siteId?: string) => {
    try {
      let currentSiteId = siteId;
      
      if (!currentSiteId) {
        const q = query(collection(db, 'linktree_sites'), where('subdomain_namawebsite', '==', slug));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          currentSiteId = querySnapshot.docs[0].id;
          setSiteData({ id: currentSiteId, ...querySnapshot.docs[0].data() });
        } else {
          throw new Error('Site not found');
        }
      }

      const linksRef = collection(db, 'linktree_sites', currentSiteId, 'links');
      const qLinks = query(linksRef, orderBy('urutan', 'asc'));
      const linksSnap = await getDocs(qLinks);

      const linksData = linksSnap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.nama_link,
          url: d.url_target,
          logo: d.logo_url,
          is_active: d.aktif,
          order: d.urutan
        };
      }) as LinkItem[];

      setLinks(linksData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title || !editForm.url) {
      toast.error('Judul dan URL wajib diisi');
      return;
    }

    try {
      const newOrder = links.length > 0 ? Math.max(...links.map(m => m.order)) + 1 : 0;
      const newLink = {
        nama_link: editForm.title,
        url_target: editForm.url,
        logo_url: editForm.logo || '',
        aktif: editForm.is_active ?? true,
        urutan: newOrder,
        tanggal_upload: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'linktree_sites', siteData.id, 'links'), newLink);
      
      setLinks([...links, { 
        id: docRef.id, 
        title: newLink.nama_link,
        url: newLink.url_target,
        logo: newLink.logo_url,
        is_active: newLink.aktif,
        order: newLink.urutan
      } as LinkItem]);
      
      // Update total links count
      await updateDoc(doc(db, 'linktree_sites', siteData.id), {
        totalLinks: links.length + 1
      });

      setIsAdding(false);
      setEditForm({});
      toast.success('Link berhasil ditambahkan');
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error('Gagal menambahkan link');
    }
  };

  const handleUpdateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing || !editForm.title || !editForm.url) return;

    try {
      await updateDoc(doc(db, 'linktree_sites', siteData.id, 'links', isEditing), {
        nama_link: editForm.title,
        url_target: editForm.url,
        logo_url: editForm.logo || '',
        aktif: editForm.is_active
      });

      setLinks(links.map(m => m.id === isEditing ? { ...m, ...editForm } as LinkItem : m));
      setIsEditing(null);
      setEditForm({});
      toast.success('Link berhasil diperbarui');
    } catch (error) {
      console.error('Error updating link:', error);
      toast.error('Gagal memperbarui link');
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Yakin ingin menghapus link ini?')) return;

    try {
      await deleteDoc(doc(db, 'linktree_sites', siteData.id, 'links', id));
      
      const newLinks = links.filter(m => m.id !== id);
      setLinks(newLinks);

      // Update total links count
      await updateDoc(doc(db, 'linktree_sites', siteData.id), {
        totalLinks: newLinks.length
      });

      toast.success('Link berhasil dihapus');
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Gagal menghapus link');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'linktree_sites', siteData.id, 'links', id), {
        aktif: !currentStatus
      });
      setLinks(links.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
      toast.success(`Status diubah menjadi ${!currentStatus ? 'Aktif' : 'Nonaktif'}`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Gagal mengubah status');
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === links.length - 1)
    ) return;

    const newLinks = [...links];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap order values
    const tempOrder = newLinks[index].order;
    newLinks[index].order = newLinks[targetIndex].order;
    newLinks[targetIndex].order = tempOrder;

    // Swap positions in array for immediate UI update
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;

    setLinks(newLinks);

    // Batch update to Firestore
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'linktree_sites', siteData.id, 'links', newLinks[index].id), { urutan: newLinks[index].order });
      batch.update(doc(db, 'linktree_sites', siteData.id, 'links', newLinks[targetIndex].id), { urutan: newLinks[targetIndex].order });
      await batch.commit();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Gagal mengubah urutan');
      fetchDashboardData(siteData.id); // Revert UI on failure
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
            <p className="text-gray-400 text-sm">Masuk ke panel admin Linktree {slug}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none text-white"
                placeholder="Masukkan username"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none text-white"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-6"
            >
              {loading ? 'Memeriksa...' : 'Login ke Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 selection:bg-primary/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div>
            <h1 className="text-3xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Linktree Admin Panel
            </h1>
            <p className="text-gray-400 text-sm">Kelola link untuk <span className="text-primary font-mono font-bold">{slug}.jhnz.online</span></p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href={`/l/${slug}`} 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all"
            >
              Lihat Web
            </a>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl text-sm font-bold transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-primary" />
              </div>
              Daftar Link Aktif
            </h2>
            {!isAdding && !isEditing && (
              <button 
                onClick={() => {
                  setIsAdding(true);
                  setEditForm({ is_active: true });
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
              >
                <Plus className="w-4 h-4" />
                Tambah Link
              </button>
            )}
          </div>

          {/* Add/Edit Form */}
          {(isAdding || isEditing) && (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-8 mb-10 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/30" />
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                {isEditing ? <Edit2 className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                {isEditing ? 'Edit Link Terpilih' : 'Buat Link Baru'}
              </h3>
              <form onSubmit={isEditing ? handleUpdateLink : handleAddLink} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Judul Link</label>
                    <input 
                      type="text" 
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 focus:border-primary focus:outline-none transition-all"
                      placeholder="Contoh: Instagram Saya"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">URL / Link Target</label>
                    <input 
                      type="url" 
                      value={editForm.url || ''}
                      onChange={(e) => setEditForm({...editForm, url: e.target.value})}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 focus:border-primary focus:outline-none transition-all"
                      placeholder="https://..."
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">URL Logo/Icon (Opsional)</label>
                  <div className="flex gap-4">
                    <input 
                      type="url" 
                      value={editForm.logo || ''}
                      onChange={(e) => setEditForm({...editForm, logo: e.target.value})}
                      className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl p-4 focus:border-primary focus:outline-none transition-all"
                      placeholder="https://.../logo.png"
                    />
                    <div className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden group/preview">
                      {editForm.logo ? (
                        <img src={editForm.logo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-700" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5 w-fit">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={editForm.is_active ?? true}
                    onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-white/20 text-primary focus:ring-primary bg-zinc-900"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-300 cursor-pointer select-none">Tampilkan link ini di halaman publik</label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Perubahan
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditing(null);
                      setEditForm({});
                    }}
                    className="px-10 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Links List */}
          <div className="space-y-4">
            {links.map((link, index) => (
              <div 
                key={link.id} 
                className={`group flex items-center gap-6 p-5 rounded-2xl border transition-all duration-300 ${
                  link.is_active 
                    ? 'bg-zinc-900/40 border-white/5 hover:border-primary/30 hover:bg-zinc-900/60' 
                    : 'bg-black/20 border-white/5 opacity-50 grayscale'
                }`}
              >
                <div className="flex flex-col gap-2 text-gray-600">
                  <button 
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="hover:text-primary disabled:opacity-20 transition-colors"
                    title="Naikkan"
                  >
                    <GripVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-14 h-14 bg-black/40 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-white/5 group-hover:border-primary/20 transition-colors">
                  {link.logo ? (
                    <img src={link.logo} alt={link.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-xl text-gray-700">{link.title.substring(0, 1).toUpperCase()}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-white truncate group-hover:text-primary transition-colors">{link.title}</h3>
                  <p className="text-sm text-gray-500 truncate font-mono">{link.url}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => toggleStatus(link.id, link.is_active)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                      link.is_active 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                    }`}
                  >
                    {link.is_active ? 'Aktif' : 'Draft'}
                  </button>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setIsEditing(link.id);
                        setEditForm(link);
                        setIsAdding(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {links.length === 0 && !isAdding && (
              <div className="text-center py-20 text-gray-600 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-lg">Belum ada link yang ditambahkan.</p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="mt-2 text-primary hover:underline font-bold"
                >
                  Tambah link pertama Anda
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
