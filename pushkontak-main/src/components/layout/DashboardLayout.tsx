import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Globe, 
  CreditCard, 
  MessageCircle, 
  Link as LinkIcon, 
  LogOut, 
  Menu, 
  X,
  Crown,
  ShieldAlert,
  Settings,
  Users,
  Database,
  Server,
  Activity,
  Code,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, setUser, setRole } = useAuthStore();
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db as any, 'settings', 'prices'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMaintenance(data.maintenance || false);
      }
    }, (error) => {
      console.log("Dashboard layout snapshot error:", error.message);
    });
    return () => unsub();
  }, []);

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Ringkasan', path: '/dashboard' },
    { icon: MessageSquare, label: 'WhatsApp Sender', path: '/dashboard/whatsapp' },
    { icon: Download, label: 'Export Kontak', path: '/dashboard/export' },
    { icon: Globe, label: 'Website Builder', path: '/dashboard/website' },
    { icon: CreditCard, label: 'Halaman Pembayaran', path: '/dashboard/payment' },
    { icon: MessageCircle, label: 'Testimoni', path: '/dashboard/testimonials' },
    { icon: LinkIcon, label: 'Linktree', path: '/dashboard/linktree' },
    { icon: Code, label: 'Inspeksi Web', path: '/dashboard/inspector' },
    { icon: ImageIcon, label: 'IMG to URL', path: '/dashboard/img2url' },
  ];

  if (role === 'dev' || role === 'reseller') {
    menuItems.push({ icon: Users, label: 'Manajemen User', path: '/dashboard/users' });
  }

  return (
    <div className="min-h-screen bg-black text-white flex font-sans selection:bg-primary/30 selection:text-primary">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 glass border-r border-white/5 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-20 flex items-center justify-between px-8 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center neon-border group-hover:scale-110 transition-transform duration-500">
              <span className="font-black text-black text-xl">J</span>
            </div>
            <span className="font-display font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              JhnzSuite
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className={cn(
            "p-5 rounded-2xl border mb-8 transition-all duration-500 relative overflow-hidden group",
            role === 'vip' 
              ? "bg-primary/5 border-primary/20 shadow-[0_0_20px_rgba(0,255,157,0.05)]" 
              : "bg-white/[0.02] border-white/5"
          )}>
            {role === 'vip' && (
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-colors duration-500" />
            )}
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110",
                role === 'vip' ? "bg-primary text-black shadow-lg" : "bg-zinc-800 text-gray-400"
              )}>
                {role === 'vip' ? <Crown className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base truncate text-white">{user?.displayName || 'User'}</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", role === 'vip' ? "bg-primary" : "bg-gray-500")} />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{role || 'Free'} Plan</p>
                </div>
              </div>
            </div>
            
            {role !== 'vip' && role !== 'dev' && role !== 'reseller' && (
              <a 
                href="https://t.me/ZynderJhnz2_Bot" 
                target="_blank"
                rel="noreferrer"
                className="btn-modern btn-primary w-full py-2.5 text-xs relative z-10"
              >
                Upgrade ke VIP
              </a>
            )}
          </div>

          <nav className="space-y-6">
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-4 mb-3">Menu Utama</div>
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 group",
                      location.pathname === item.path 
                        ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(0,255,157,0.05)]" 
                        : "text-gray-500 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                      location.pathname === item.path ? "text-primary" : "text-gray-500 group-hover:text-white"
                    )} />
                    {item.label}
                    {location.pathname === item.path && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(0,255,157,0.8)]" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>

        <div className="p-6 border-t border-white/5 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <header className="h-20 border-b border-white/5 bg-black/20 backdrop-blur-2xl flex items-center justify-between px-6 lg:px-10 shrink-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-6 ml-auto">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Server Online</span>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative z-10">
          {maintenance && role !== 'dev' && role !== 'reseller' ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
                Sistem Sedang Maintenance
              </h1>
              <p className="text-gray-400 max-w-md mx-auto mb-8">
                Mohon maaf, JhnzSuite sedang dalam pemeliharaan rutin untuk meningkatkan performa. 
                Silakan coba lagi beberapa saat lagi.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                <span>Estimasi selesai: Segera</span>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
