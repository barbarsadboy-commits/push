import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Crown, Activity, Users, Globe, CreditCard, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Overview() {
  const { user, role } = useAuthStore();
  const [stats, setStats] = useState({
    websites: 0,
    paymentPages: 0,
    testimonialSites: 0,
    messagesSent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    // Listen to Websites
    const unsubWeb = onSnapshot(query(collection(db, 'websites'), where('ownerId', '==', user.uid)), (snap) => {
      setStats(prev => ({ ...prev, websites: snap.size }));
    }, (error) => {
      console.log("Websites snapshot error:", error.message);
    });

    // Listen to Payment Pages
    const unsubPay = onSnapshot(query(collection(db, 'payment_pages'), where('ownerId', '==', user.uid)), (snap) => {
      setStats(prev => ({ ...prev, paymentPages: snap.size }));
    }, (error) => {
      console.log("Payment pages snapshot error:", error.message);
    });

    // Listen to Testimonial Sites
    const unsubTesti = onSnapshot(query(collection(db, 'testi_sites'), where('ownerId', '==', user.uid)), (snap) => {
      setStats(prev => ({ ...prev, testimonialSites: snap.size }));
    }, (error) => {
      console.log("Testimonial sites snapshot error:", error.message);
    });

    // Listen to Messages (Assuming a 'messages' collection exists for sent logs)
    // For now, we might not have this collection populated, but this is the real-time implementation
    const unsubMsg = onSnapshot(query(collection(db, 'messages'), where('senderId', '==', user.uid)), (snap) => {
      setStats(prev => ({ ...prev, messagesSent: snap.size }));
    }, (error) => {
      // Ignore error if collection doesn't exist yet
      console.log("Messages collection not found or empty");
    });

    setLoading(false);

    return () => {
      unsubWeb();
      unsubPay();
      unsubTesti();
      unsubMsg();
    };
  }, [user]);

  return (
    <div className="space-y-10">
      <div className="relative">
        <div className="absolute -left-10 top-0 w-1 h-12 bg-primary rounded-full blur-sm" />
        <h1 className="text-4xl font-display font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
          Dashboard Overview
        </h1>
        <p className="text-gray-500 font-medium tracking-wide">Selamat datang kembali, <span className="text-white">{user?.displayName || 'User'}</span></p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Status Membership" 
          value={role?.toUpperCase() || 'FREE'} 
          icon={<Crown className="w-5 h-5" />}
          description={role === 'vip' ? 'Member VIP Aktif' : 'Upgrade untuk fitur lengkap'}
          highlight={role === 'vip'}
          color="primary"
        />
        <StatCard 
          title="Pesan Terkirim" 
          value={stats.messagesSent.toLocaleString()} 
          icon={<Activity className="w-5 h-5" />}
          description="Total broadcast sukses"
          color="blue"
        />
        <StatCard 
          title="Proyek Aktif" 
          value={stats.websites + stats.paymentPages + stats.testimonialSites} 
          icon={<Globe className="w-5 h-5" />}
          description={`${stats.websites} Web • ${stats.paymentPages} Pay • ${stats.testimonialSites} Testi`}
          color="purple"
        />
        <StatCard 
          title="Total Kunjungan" 
          value="0" 
          icon={<Users className="w-5 h-5" />}
          description="Statistik segera hadir"
          color="orange"
        />
      </div>

      {/* Recent Activity or Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 glass-card rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-700" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-display font-black tracking-tight">Akses Cepat</h3>
              <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest">Shortcut</div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <QuickActionButton label="WhatsApp" path="/dashboard/whatsapp" icon={<MessageSquare className="w-6 h-6" />} color="primary" />
              <QuickActionButton label="Website" path="/dashboard/website" icon={<Globe className="w-6 h-6" />} color="purple" />
              <QuickActionButton label="Payment" path="/dashboard/payment" icon={<CreditCard className="w-6 h-6" />} color="blue" />
              <QuickActionButton label="Testimoni" path="/dashboard/testimonials" icon={<Users className="w-6 h-6" />} color="orange" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 glass-card rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-display font-black tracking-tight">Status Sistem</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">All Systems Operational</span>
            </div>
          </div>
          
          <div className="space-y-5">
            <StatusItem label="WhatsApp Engine" status="online" />
            <StatusItem label="Database Cluster" status="online" />
            <StatusItem label="Storage Server" status="online" />
            <StatusItem label="API Gateway" status="online" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description, highlight, color }: any) {
  const colorMap: any = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  };

  return (
    <div className={cn(
      "p-6 rounded-3xl border transition-all duration-500 group relative overflow-hidden",
      highlight 
        ? "bg-primary/[0.03] border-primary/30 shadow-[0_0_30px_rgba(0,255,157,0.05)]" 
        : "bg-white/[0.02] border-white/5 hover:border-white/10"
    )}>
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={cn("p-2.5 rounded-xl transition-transform duration-500 group-hover:scale-110", colorMap[color])}>
          {icon}
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Activity className="w-4 h-4 text-gray-500" />
        </div>
      </div>
      
      <div className="relative z-10">
        <div className="text-3xl font-display font-black mb-1 tracking-tight">{value}</div>
        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2">{title}</h3>
        <div className="text-[10px] text-gray-600 font-medium leading-relaxed">{description}</div>
      </div>

      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl group-hover:bg-white/[0.03] transition-colors duration-500" />
    </div>
  );
}

function QuickActionButton({ label, path, icon, color }: any) {
  const colorMap: any = {
    primary: 'group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/30',
    blue: 'group-hover:text-blue-500 group-hover:bg-blue-500/10 group-hover:border-blue-500/30',
    purple: 'group-hover:text-purple-500 group-hover:bg-purple-500/10 group-hover:border-purple-500/30',
    orange: 'group-hover:text-orange-500 group-hover:bg-orange-500/10 group-hover:border-orange-500/30',
  };

  return (
    <a href={path} className={cn(
      "flex flex-col items-center justify-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl transition-all duration-500 group text-center",
      colorMap[color]
    )}>
      <div className="text-gray-600 transition-all duration-500 group-hover:scale-110 mb-3">
        {icon}
      </div>
      <span className="font-bold text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">{label}</span>
    </a>
  );
}

function StatusItem({ label, status }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all duration-300">
      <span className="text-gray-400 text-sm font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">{status}</span>
        <div className={cn(
          "w-2 h-2 rounded-full",
          status === 'online' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" : "bg-red-500"
        )} />
      </div>
    </div>
  );
}

