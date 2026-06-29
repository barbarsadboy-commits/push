import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../lib/store';

interface VIPFeatureGuardProps {
  children: React.ReactNode;
  featureName: string;
}

export default function VIPFeatureGuard({ children, featureName }: VIPFeatureGuardProps) {
  const { role } = useAuthStore();

  if (role === 'free' || role === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-zinc-900/50 rounded-2xl border border-white/5 border-dashed">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Fitur VIP Terkunci</h2>
        <p className="text-gray-400 max-w-md mb-8">
          Maaf, fitur <span className="text-white font-bold">{featureName}</span> hanya tersedia untuk pengguna <span className="text-primary font-bold">VIP</span>. 
          Silakan hubungi Admin atau upgrade akun Anda untuk membuka akses penuh.
        </p>
        <a 
          href="https://t.me/ZynderJhnz2_Bot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] group"
        >
          <Zap className="w-5 h-5 group-hover:animate-bounce" />
          Upgrade ke VIP Sekarang
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
