import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { Download, Trash2, Users, FileJson, FileText, Smartphone, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Contact {
  number: string;
  name: string;
  timestamp: number;
}

export default function ExportContacts() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<{ total: number; preview: Contact[] }>({ total: 0, preview: [] });
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchStats = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`/api/contacts/stats?userId=${user.uid}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user?.uid]);

  const handleExport = (type: 'json' | 'txt' | 'vcf') => {
    if (!user?.uid) return;
    if (stats.total === 0) {
      toast.error('Tidak ada kontak untuk diexport');
      return;
    }
    window.open(`/api/export/${type}?userId=${user.uid}`, '_blank');
  };

  const handleReset = async () => {
    if (!user?.uid) return;
    if (!confirm('Apakah Anda yakin ingin menghapus semua kontak tersimpan? Tindakan ini tidak dapat dibatalkan.')) return;

    setResetting(true);
    try {
      const res = await fetch('/api/contacts/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Semua kontak berhasil dihapus');
        fetchStats();
      }
    } catch (error) {
      toast.error('Gagal menghapus kontak');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Export Kontak (Auto SV)
          </h1>
          <p className="text-gray-400 mt-1">Kelola dan unduh kontak yang tersimpan otomatis dari Pushkontak</p>
        </div>
        
        <button 
          onClick={handleReset}
          disabled={resetting || stats.total === 0}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-red-500/10 text-gray-300 hover:text-red-500 text-sm font-medium rounded-xl transition-all border border-white/10 hover:border-red-500/20 disabled:opacity-50"
        >
          {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Hapus Semua
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Stats & Export Options */}
        <div className="lg:col-span-5 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 shadow-xl backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Total Kontak Tersimpan</p>
                <h2 className="text-4xl font-bold text-white">{stats.total}</h2>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-300 mb-4">Pilih Format Export:</p>
              
              <button 
                onClick={() => handleExport('vcf')}
                className="w-full flex items-center justify-between p-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] group"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5" />
                  <span>Download Kontak ke HP (.VCF)</span>
                </div>
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleExport('json')}
                  className="flex items-center justify-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl border border-white/10 transition-all"
                >
                  <FileJson className="w-4 h-4" />
                  JSON
                </button>
                <button 
                  onClick={() => handleExport('txt')}
                  className="flex items-center justify-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl border border-white/10 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  TXT
                </button>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-300 leading-relaxed">
                <strong>Tips:</strong> Gunakan format <strong>VCF</strong> untuk mengimport semua kontak ke buku telepon HP Anda secara otomatis dalam sekali klik.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Preview Table */}
        <div className="lg:col-span-7">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-sm h-full"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              Preview 20 Kontak Terakhir
            </h2>

            <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {stats.preview.length === 0 ? (
                  <div className="text-center py-20">
                    <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500">Belum ada kontak yang tersimpan.</p>
                    <p className="text-xs text-gray-600 mt-1">Kontak akan otomatis muncul di sini setelah Anda melakukan Pushkontak.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-800/50 sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nama</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nomor</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.preview.map((contact, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="p-4">
                            <span className="text-sm font-medium text-gray-200">{contact.name}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-mono text-primary">+{contact.number}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-xs text-gray-500">
                              {new Date(contact.timestamp).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
