import React, { useState, useEffect } from 'react';
import { HARGA } from '../sethrga';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  MessageSquare, 
  Globe, 
  CreditCard, 
  Zap, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  Crown,
  X,
  FileText,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Landing() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [pricing, setPricing] = useState({
    vipMonthly: HARGA.default.vip,
    vipYearly: HARGA.default.vip * 10,
    currency: 'IDR',
    promoText: 'Diskon 50% untuk 100 pembeli pertama!'
  });

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'pricing'), (docSnap) => {
      if (docSnap.exists()) {
        const p = docSnap.data();
        setPricing(prev => ({ 
          ...prev, 
          ...p,
          // Override with local TS config
          vipMonthly: HARGA.default.vip,
          vipYearly: HARGA.default.vip * 10 
        }));
      }
    }, (error) => {
      console.log("Pricing snapshot error:", error.message);
    });
    return () => unsubscribe();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: pricing.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center neon-border">
              <span className="font-bold text-black text-xl">J</span>
            </div>
            <span className="font-bold text-2xl tracking-tight">JhnzSuite</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Fitur</a>
            <a href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Harga</a>
            <Link to="/login" className="text-sm font-medium text-white hover:text-primary transition-colors">Masuk</Link>
            <Link 
              to="/register" 
              className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,157,0.1),transparent_50%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary tracking-wide uppercase">Sistem V2.0 Live Sekarang</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
            Satu Platform untuk <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-600">
              Dominasi Digital
            </span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Kirim pesan WhatsApp otomatis, buat website instan, halaman pembayaran, dan linktree dalam satu dashboard terintegrasi.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register" 
              className="w-full sm:w-auto px-8 py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all transform hover:scale-105 neon-border flex items-center justify-center gap-2"
            >
              Mulai Gratis <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 bg-zinc-900/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Fitur Unggulan</h2>
            <p className="text-gray-400">Semua tools yang Anda butuhkan untuk bisnis online.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={MessageSquare}
              title="WhatsApp Automation"
              description="Kirim pesan massal ke grup dan kontak tanpa batas dengan engine real-time."
            />
            <FeatureCard 
              icon={Globe}
              title="Website Builder"
              description="Buat landing page profesional dalam hitungan detik tanpa coding."
            />
            <FeatureCard 
              icon={CreditCard}
              title="Payment Pages"
              description="Terima pembayaran via QRIS, E-Wallet, dan Bank dengan halaman checkout kustom."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Pilihan Paket</h2>
            <p className="text-gray-400">Pilih paket yang sesuai dengan kebutuhan bisnis Anda.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Starter Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">Rp 0</span>
                  <span className="text-gray-400">/bulan</span>
                </div>
                <p className="text-gray-400 text-sm mt-4">Untuk pemula yang baru memulai.</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <PricingItem text="10 Pesan WhatsApp / hari" />
                <PricingItem text="1 Website Landing Page" />
                <PricingItem text="1 Halaman Pembayaran" />
                <PricingItem text="3 Testimoni" />
                <PricingItem text="Linktree Basic" />
                <PricingItem text="Support Komunitas" />
                <PricingItem text="Akses API Terbatas" negative />
                <PricingItem text="Prioritas Support" negative />
              </ul>

              <Link 
                to="/register" 
                className="block w-full py-3 text-center bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                Daftar Gratis
              </Link>
            </div>

            {/* VIP Plan */}
            <div className="bg-zinc-900 border border-primary/50 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-primary text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
                POPULAR
              </div>
              <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors pointer-events-none" />
              
              <div className="mb-8 relative z-10">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  VIP Pro
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{formatPrice(pricing.vipMonthly)}</span>
                  <span className="text-gray-400">/bulan</span>
                </div>
                <p className="text-gray-400 text-sm mt-4">{pricing.promoText}</p>
              </div>
              
              <ul className="space-y-4 mb-8 relative z-10">
                <PricingItem text="Unlimited Pesan WhatsApp" active />
                <PricingItem text="Unlimited Website" active />
                <PricingItem text="Unlimited Halaman Pembayaran" active />
                <PricingItem text="Unlimited Testimoni" active />
                <PricingItem text="Linktree Pro (Custom Domain)" active />
                <PricingItem text="Prioritas Support 24/7" active />
                <PricingItem text="Akses API Full" active />
                <PricingItem text="Badge VIP Eksklusif" active />
              </ul>

              <a 
                href="https://t.me/ZynderJhnz2_Bot" 
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3 text-center bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors neon-border relative z-10"
              >
                Upgrade Sekarang
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">J</span>
            </div>
            <span className="font-bold text-lg">JhnzSuite</span>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; 2026 JhnzSuite Inc. All rights reserved.
          </div>
          <div className="flex gap-6">
            <button onClick={() => setShowPrivacy(true)} className="text-gray-500 hover:text-white transition-colors">Privacy</button>
            <button onClick={() => setShowTerms(true)} className="text-gray-500 hover:text-white transition-colors">Terms</button>
            <a href="https://t.me/ZynderJhnz2_Bot" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] relative flex flex-col">
            <button 
              onClick={() => setShowPrivacy(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-8 overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Kebijakan Privasi</h2>
              </div>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>Terakhir diperbarui: 1 Maret 2026</p>
                <p>
                  Di JhnzSuite, kami sangat menghargai privasi Anda. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.
                </p>
                <h3 className="text-lg font-bold text-white mt-4">1. Informasi yang Kami Kumpulkan</h3>
                <p>
                  Kami mengumpulkan informasi yang Anda berikan saat mendaftar, seperti nama, email, dan nomor telepon. Kami juga mengumpulkan data penggunaan layanan untuk meningkatkan kualitas platform.
                </p>
                <h3 className="text-lg font-bold text-white mt-4">2. Penggunaan Informasi</h3>
                <p>
                  Informasi Anda digunakan untuk menyediakan layanan, memproses transaksi, dan mengirimkan pembaruan penting. Kami tidak akan pernah menjual data Anda kepada pihak ketiga.
                </p>
                <h3 className="text-lg font-bold text-white mt-4">3. Keamanan Data</h3>
                <p>
                  Kami menggunakan enkripsi standar industri dan praktik keamanan terbaik untuk melindungi data Anda dari akses yang tidak sah.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] relative flex flex-col">
            <button 
              onClick={() => setShowTerms(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-8 overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Syarat & Ketentuan</h2>
              </div>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>Terakhir diperbarui: 1 Maret 2026</p>
                <p>
                  Dengan menggunakan layanan JhnzSuite, Anda menyetujui syarat dan ketentuan berikut. Harap baca dengan saksama.
                </p>
                <h3 className="text-lg font-bold text-white mt-4">1. Penggunaan Layanan</h3>
                <p>
                  Anda setuju untuk menggunakan layanan kami hanya untuk tujuan yang sah dan tidak melanggar hukum yang berlaku. Penggunaan untuk spamming atau aktivitas ilegal dilarang keras.
                </p>
                <h3 className="text-lg font-bold text-white mt-4">2. Akun Pengguna</h3>
                <p>
                  Anda bertanggung jawab untuk menjaga kerahasiaan akun dan kata sandi Anda. Segala aktivitas yang terjadi di bawah akun Anda adalah tanggung jawab Anda sepenuhnya.
                </p>
                <h3 className="text-lg font-bold text-white mt-4">3. Pembatasan Tanggung Jawab</h3>
                <p>
                  JhnzSuite tidak bertanggung jawab atas kerugian langsung atau tidak langsung yang timbul dari penggunaan layanan kami. Layanan disediakan "sebagaimana adanya".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: any) {
  return (
    <div className="p-6 rounded-2xl bg-black border border-white/10 hover:border-primary/50 transition-all group">
      <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-6 h-6 text-white group-hover:text-primary transition-colors" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function PricingItem({ text, active, negative }: { text: string, active?: boolean, negative?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      {negative ? (
        <X className="w-5 h-5 text-zinc-700 shrink-0" />
      ) : (
        <CheckCircle className={cn("w-5 h-5 shrink-0", active ? "text-primary" : "text-gray-500")} />
      )}
      <span className={cn("text-sm", negative ? "text-gray-600 line-through" : "text-gray-300")}>
        {text}
      </span>
    </li>
  );
}
