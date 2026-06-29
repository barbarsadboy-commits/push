import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Copy, Check, QrCode, ExternalLink, ShieldCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentMethod {
  id: string;
  name: string;
  number: string;
  logo: string; // URL or icon name
  qris_image?: string;
  is_active: boolean;
  order: number;
}

interface PaymentSite {
  title: string;
  slug: string;
  description?: string;
  logo?: string;
}

export default function PublicView() {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<PaymentSite | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedQris, setSelectedQris] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      try {
        // 1. Fetch Site Data
        const siteRef = doc(db, 'payment_sites', slug);
        const siteSnap = await getDoc(siteRef);

        if (!siteSnap.exists()) {
          setError('Halaman pembayaran tidak ditemukan.');
          setLoading(false);
          return;
        }

        setSite(siteSnap.data() as PaymentSite);

        // 2. Fetch Payment Methods
        // Use client-side filtering/sorting to avoid Firestore Index errors
        const methodsRef = collection(db, 'payment_sites', slug, 'methods');
        const q = query(methodsRef);
        const methodsSnap = await getDocs(q);

        const methodsData = methodsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((m: any) => m.is_active === true)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) as PaymentMethod[];

        setMethods(methodsData);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(`Terjadi kesalahan: ${err.message || 'Gagal memuat data'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Nomor berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col p-4 sm:p-6">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 mt-8"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-white/10 shadow-xl shadow-primary/5">
            {site?.logo ? (
              <img src={site.logo} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {site?.title || 'Payment Page'}
          </h1>
          <p className="text-sm text-gray-400 max-w-[280px] mx-auto">
            {site?.description || 'Silakan pilih metode pembayaran di bawah ini untuk menyelesaikan transaksi.'}
          </p>
        </motion.div>

        {/* Payment Methods List */}
        <div className="space-y-4 flex-1">
          {methods.map((method, index) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-primary/50 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2 shrink-0">
                    {method.logo ? (
                      <img src={method.logo} alt={method.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-black font-bold text-xs">{method.name.substring(0, 2)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{method.name}</h3>
                    <p className="text-sm text-gray-400 font-mono tracking-wide">{method.number}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {method.qris_image && (
                    <button
                      onClick={() => setSelectedQris(method.qris_image!)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="Lihat QRIS"
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(method.number, method.id)}
                    className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                    title="Salin Nomor"
                  >
                    {copiedId === method.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {methods.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
              <p>Belum ada metode pembayaran tersedia.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center pb-8">
          <a 
            href="https://jhnz.online" 
            target="_blank" 
            rel="noreferrer" 
            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-primary transition-colors"
          >
            Powered by JHNZ Payment
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* QRIS Modal */}
      <AnimatePresence>
        {selectedQris && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedQris(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-4 rounded-2xl max-w-sm w-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <h3 className="text-black font-bold text-lg">Scan QRIS</h3>
                <p className="text-gray-500 text-sm">Scan kode di bawah untuk membayar</p>
              </div>
              
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4 border-2 border-dashed border-gray-300">
                <img src={selectedQris} alt="QRIS Code" className="w-full h-full object-contain" />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedQris(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Tutup
                </button>
                <a
                  href={selectedQris}
                  download="qris-payment.png"
                  className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                  Simpan
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
