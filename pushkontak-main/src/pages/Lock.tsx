import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import { Navigate } from 'react-router-dom';
import { Lock as LockIcon, QrCode, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Lock() {
  const { user, role, highest_role, status_active } = useAuthStore();
  const [showQR, setShowQR] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getPrice = () => {
    if (highest_role === 'dev') return 35000;
    if (highest_role === 'reseller') return 20000;
    if (highest_role === 'vip') return 10000;
    return 0;
  };

  const price = getPrice();

  const handleGenerateQR = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/subscription/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'default_secret_key'
        },
        body: JSON.stringify({
          email: user.email,
          highest_role: highest_role,
          name: user.displayName || user.email
        })
      });

      const data = await res.json();
      if (data.success) {
        setPaymentUrl(data.url);
        setPaymentId(data.id);
        setShowQR(true);
      } else {
        toast.error(data.error || 'Gagal membuat pembayaran');
      }
    } catch (error: any) {
      toast.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckPayment = async (isAutoCheck = false) => {
    if (!paymentId) return;
    setIsChecking(true);
    
    try {
      const res = await fetch('/api/subscription/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'default_secret_key'
        },
        body: JSON.stringify({ paymentId, isAutoCheck })
      });

      const data = await res.json();
      if (data.status === 'PAID') {
        toast.success('Pembayaran berhasil! Mengaktifkan akun...');
        // The onSnapshot listener in App.tsx will automatically update status_active and redirect
      } else {
        if (!isAutoCheck) {
          toast.info('Pembayaran belum diterima. Silakan cek kembali nanti.');
        }
      }
    } catch (error: any) {
      if (!isAutoCheck) {
        toast.error('Gagal mengecek status: ' + error.message);
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check payment status every 10 seconds if QR is shown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQR && paymentId) {
      interval = setInterval(() => {
        handleCheckPayment(true);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [showQR, paymentId]);

  // If owner or active, redirect to dashboard
  if (role === 'owner' || status_active) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
          <LockIcon className="w-10 h-10 text-red-500" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold mb-2">Akses Terkunci</h1>
          <p className="text-gray-400">
            User anda telah expired. Silahkan perpanjang user anda untuk kembali mengakses semua fitur.
          </p>
        </div>

        {!showQR ? (
          <button
            onClick={handleGenerateQR}
            disabled={isLoading}
            className="w-full bg-primary text-black font-bold py-3 px-4 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
            {isLoading ? 'Memproses...' : 'Lanjut Bayar'}
          </button>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-zinc-800 p-4 rounded-xl">
              <p className="text-sm text-gray-400 mb-1">Total Pembayaran</p>
              <p className="text-3xl font-bold text-primary">Rp {price.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-500 mt-2">Berdasarkan role tertinggi Anda: {highest_role?.toUpperCase()}</p>
            </div>

            <div className="bg-white p-4 rounded-xl mx-auto w-fit">
              {paymentUrl ? (
                <img src={paymentUrl} alt="QRIS" className="w-48 h-48 object-contain" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                  <QrCode className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-400">
              Scan QRIS di atas menggunakan aplikasi e-wallet atau m-banking Anda.
            </p>

            <button
              onClick={() => handleCheckPayment(false)}
              disabled={isChecking}
              className="w-full bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              Cek Status Pembayaran
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
