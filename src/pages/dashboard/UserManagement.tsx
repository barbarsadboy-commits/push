import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Users, Key, Plus, Trash2, ShieldAlert, Loader2, Search, X, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getPajakPrice } from '../../sethrga';

export default function UserManagement() {
  const { user, role } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<{ id: string, url: string, targetEmail: string, actorRole: string, amount?: number } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    if (!db || (role !== 'dev' && role !== 'reseller' && role !== 'owner')) return;
    
    const unsubscribe = onSnapshot(doc(db, 'settings', 'prices'), (doc) => {
      if (doc.exists()) {
        setIsMaintenance(doc.data().maintenance || false);
      }
    });
    
    fetchData();
    return () => unsubscribe();
  }, [role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch tokens
      const tokensSnap = await getDocs(collection(db, 'tokens'));
      setTokens(tokensSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteToken = async (tokenId: string) => {
    // Note: In a real app, use a custom modal instead of confirm
    // Since we can't use window.confirm in an iframe, we'll just delete it directly
    // or you can implement a custom modal state if preferred.
    try {
      await deleteDoc(doc(db, 'tokens', tokenId));
      toast.success('Token dihapus');
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus token');
    }
  };

  const updateUserRole = async (userId: string, currentRole: string, newRole: string) => {
    if (currentRole === 'free' && newRole === 'vip') {
      try {
        const targetUserDoc = await getDoc(doc(db, 'users', userId));
        if (!targetUserDoc.exists()) throw new Error('User not found');
        const targetEmail = targetUserDoc.data()?.email;
        
        if (role === 'owner') {
          // Owner can upgrade freely
          await updateDoc(doc(db, 'users', userId), { 
            role: 'vip',
            upgradedAt: serverTimestamp(),
            upgradedBy: user?.email
          });
          toast.success('User berhasil diupgrade ke VIP');
          fetchData();
          return;
        }

        // For Resellers and Devs, trigger tax payment
        setLoading(true);
        const res = await fetch('/api/upgrade-tax/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'default_secret_key'
          },
          body: JSON.stringify({
            actorEmail: user?.email,
            targetEmail: targetEmail,
            actorRole: role, // 'reseller' or 'dev'
            targetRole: 'vip'
          })
        });

        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate tax payment');
        }

        const taxAmountRes = getPajakPrice(role || '', newRole);
        setPaymentData({
          id: data.id,
          url: data.url,
          targetEmail: targetEmail,
          actorRole: role,
          amount: taxAmountRes
        });
        setShowPaymentModal(true);

      } catch (error: any) {
        setLoading(false);
        toast.error('Gagal memproses upgrade: ' + error.message);
      }
      return;
    }

    try {
      const updateData: any = { role: newRole };
      if (newRole !== 'free' && newRole !== 'owner') {
         const expiryDate = new Date();
         expiryDate.setDate(expiryDate.getDate() + 30);
         updateData.expiryDate = expiryDate.toISOString();
      }
      await updateDoc(doc(db, 'users', userId), updateData);
      toast.success('Role user berhasil diupdate');
      fetchData();
    } catch (error: any) {
      toast.error('Gagal update role');
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentData || checkingPayment) return;
    
    setCheckingPayment(true);
    try {
      const res = await fetch('/api/subscription/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'default_secret_key'
        },
        body: JSON.stringify({ paymentId: paymentData.id })
      });
      
      const data = await res.json();
      
      if (data.status === 'PAID') {
        toast.success('Pembayaran Pajak Berhasil! User telah diupgrade.');
        setShowPaymentModal(false);
        setPaymentData(null);
        fetchData();
      } else {
        toast.info('Pembayaran belum diterima. Silakan selesaikan pembayaran.');
      }
    } catch (error: any) {
      toast.error('Gagal mengecek status pembayaran');
    } finally {
      setCheckingPayment(false);
    }
  };

  if (role !== 'dev' && role !== 'reseller' && role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Akses Ditolak</h2>
        <p className="text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  if (isMaintenance && role !== 'owner' && user?.email !== 'sumiyatun993@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldAlert className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Maintenance Mode</h2>
        <p className="text-gray-400">Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manajemen User</h1>
        <p className="text-gray-400">Kelola pengguna dan upgrade role (Akses: {role?.toUpperCase()})</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* User Management */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold">Daftar User</h2>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Cari username / email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Memuat...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'User tidak ditemukan' : 'Belum ada user'}
              </div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5">
                  <div className="min-w-0 flex-1 mr-4">
                    <div className="font-bold truncate">{u.displayName || 'User'}</div>
                    <div className="text-xs text-gray-400 truncate">{u.email}</div>
                    <div className="mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        u.role === 'dev' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        u.role === 'reseller' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        u.role === 'vip' ? 'bg-primary/20 text-primary border border-primary/30' :
                        'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                      }`}>
                        {u.role || 'free'}
                      </span>
                    </div>
                  </div>
                  <select
                    value={u.role || 'free'}
                    onChange={(e) => updateUserRole(u.id, u.role || 'free', e.target.value)}
                    disabled={role === 'reseller' && (u.role === 'dev' || u.role === 'reseller')}
                    className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="free">Free</option>
                    <option value="vip">VIP</option>
                    {role === 'dev' && <option value="reseller">Reseller</option>}
                    {/* Only owner can set dev role, or dev can see it but not set it for others? 
                        The request says "dev tidak bisa up dev juga" 
                        So we hide 'dev' option if the current user is 'dev' and the target is not already 'dev' (or always hide it for 'dev' users)
                    */}
                    {role === 'owner' && <option value="dev">Dev</option>}
                    {role === 'dev' && u.role === 'dev' && <option value="dev">Dev</option>}
                  </select>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full relative overflow-hidden">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">Pajak Upgrade Role</h2>
              <p className="text-gray-400 text-sm mb-6">
                Untuk mengupgrade <strong>{paymentData.targetEmail}</strong> ke VIP, Anda dikenakan pajak sebesar Rp {paymentData.amount ? paymentData.amount.toLocaleString('id-ID') : '...'}
              </p>

              <div className="bg-white p-4 rounded-xl mb-6 flex justify-center">
                <img src={paymentData.url} alt="QRIS Payment" className="w-48 h-48" />
              </div>

              <div className="space-y-3">
                <button
                  onClick={checkPaymentStatus}
                  disabled={checkingPayment}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkingPayment ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Mengecek...</>
                  ) : (
                    <><RefreshCw className="w-5 h-5" /> Cek Status Pembayaran</>
                  )}
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
