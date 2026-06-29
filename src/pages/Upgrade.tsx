import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Crown, CheckCircle2, Zap, ShieldCheck, Globe, MessageSquare, CreditCard, Key, Trash2, Loader2 } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { toast } from 'sonner';
import { HARGA } from '../sethrga';

export default function Upgrade() {
  const { user, role } = useAuthStore();
  const [tokens, setTokens] = useState<any[]>([]);
  const [pricing, setPricing] = useState({
    vipMonthly: HARGA.default.vip,
    vipYearly: HARGA.default.vip * 10, // Also updating yearly to be consistent (10x monthly)
    currency: 'IDR',
    promoText: 'Dapatkan akses penuh ke semua fitur JhnzSuite!'
  });

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'pricing'), (docSnap) => {
      if (docSnap.exists()) {
        const p = docSnap.data();
        setPricing(prev => ({ 
          ...prev, 
          ...p,
          vipMonthly: HARGA.default.vip,
          vipYearly: HARGA.default.vip * 10
        }));
      }
    }, (error) => {
      console.log("Pricing snapshot error:", error.message);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.email || !db) return;
    const q = query(collection(db, 'tokens'), where('createdBy', '==', user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTokens(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user?.email]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: pricing.currency,
      minimumFractionDigits: 0
    }).format(price);
  };

  const features = [
    { icon: MessageSquare, text: 'Unlimited WhatsApp Push Messages' },
    { icon: Globe, text: 'Unlimited Website Builder Sites' },
    { icon: CreditCard, text: 'Unlimited Payment Pages' },
    { icon: Zap, text: 'Auto Deployment to Netlify' },
    { icon: ShieldCheck, text: 'Priority Support 24/7' },
    { icon: Crown, text: 'VIP Badge on Profile' }
  ];

  const [redeemToken, setRedeemToken] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!redeemToken || !user?.uid) return;
    setRedeeming(true);
    try {
      const tokenRef = doc(db, 'tokens', redeemToken.toUpperCase());
      const tokenSnap = await getDoc(tokenRef);

      if (!tokenSnap.exists()) {
        toast.error('Token tidak valid');
        return;
      }

      const tokenData = tokenSnap.data();
      if (tokenData.usageCount <= 0) {
        toast.error('Token sudah habis masa pakainya');
        return;
      }

      // Update user role and decrement token usage
      await updateDoc(doc(db, 'users', user.uid), { role: 'vip' });
      const newUsageCount = tokenData.usageCount - 1;
      if (newUsageCount <= 0) {
        await deleteDoc(tokenRef);
      } else {
        await updateDoc(tokenRef, { usageCount: newUsageCount });
      }
      
      toast.success('Selamat! Akun Anda berhasil diupgrade ke VIP.');
      setRedeemToken('');
    } catch (error) {
      console.error('Redeem token error:', error);
      toast.error('Gagal menukarkan token');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-12 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
            Upgrade ke JhnzSuite VIP
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            {pricing.promoText}
          </p>
        </div>

        {/* Redeem Token Section */}
        {role !== 'vip' && role !== 'dev' && (
          <div className="bg-zinc-900/50 border border-primary/30 rounded-3xl p-6 max-w-md mx-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Punya Token VIP?
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Masukkan kode token..." 
                value={redeemToken}
                onChange={(e) => setRedeemToken(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button 
                onClick={handleRedeem}
                disabled={redeeming || !redeemToken}
                className="px-6 py-2 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Free Plan (Current) */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-2">Free Plan</h2>
              <p className="text-gray-400 text-sm">Untuk mencoba fitur dasar</p>
            </div>
            <div className="mb-8">
              <span className="text-4xl font-bold">Gratis</span>
              <span className="text-gray-500 ml-2">selamanya</span>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <CheckCircle2 className="w-5 h-5 text-gray-600" />
                <span>Limit 10 WA Push / hari</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <CheckCircle2 className="w-5 h-5 text-gray-600" />
                <span>Limit 1 Website Builder</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <CheckCircle2 className="w-5 h-5 text-gray-600" />
                <span>Limit 1 Payment Page</span>
              </div>
            </div>
            <button disabled className="w-full py-4 bg-white/5 text-gray-500 font-bold rounded-2xl border border-white/10">
              {role === 'free' ? 'Plan Saat Ini' : 'Sudah Melewati'}
            </button>
          </div>

          {/* VIP Plan */}
          <div className="bg-zinc-900 border-2 border-primary rounded-3xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(var(--primary-rgb),0.15)]">
            <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-widest">
              Paling Populer
            </div>
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                VIP Plan
                <Crown className="w-5 h-5 text-primary" />
              </h2>
              <p className="text-gray-400 text-sm">Akses tanpa batas & fitur eksklusif</p>
            </div>
            <div className="mb-8">
              <span className="text-4xl font-bold">{formatPrice(pricing.vipMonthly)}</span>
              <span className="text-gray-500 ml-2">/ bulan</span>
            </div>
            <div className="space-y-4 mb-8">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <f.icon className="w-5 h-5 text-primary" />
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
            <a 
              href="https://t.me/ZynderJhnz2_Bot" 
              target="_blank" 
              rel="noreferrer"
              className="block w-full py-4 bg-primary text-black text-center font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
            >
              Upgrade Sekarang
            </a>
          </div>
        </div>

        {/* My Tokens Section */}
        {tokens.length > 0 && (
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Token VIP Saya</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map(token => (
                <div key={token.id} className="bg-black/30 p-4 rounded-xl border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono font-bold text-primary">{token.code}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Sisa Pakai:</span>
                    <span className="font-bold text-green-500">
                      {token.usageCount} / 5
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Dibuat: {new Date(token.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-500">
            Butuh paket tahunan? Hemat lebih banyak dengan <span className="text-primary font-bold">{formatPrice(pricing.vipYearly)}/tahun</span>. 
            Hubungi admin untuk aktivasi manual.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
