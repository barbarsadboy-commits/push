import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ExternalLink, ShieldCheck, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  logo?: string;
  is_active: boolean;
  order: number;
}

interface LinktreeSite {
  storeName: string;
  subdomain_namawebsite: string;
  description?: string;
  logo?: string;
}

export default function PublicView() {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<LinktreeSite | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      try {
        // 1. Fetch Site Data
        const siteRef = doc(db, 'linktree_sites', slug);
        const siteSnap = await getDoc(siteRef);

        // If not found by ID, try querying by subdomain
        if (!siteSnap.exists()) {
          const qSite = query(collection(db, 'linktree_sites'), where('subdomain_namawebsite', '==', slug));
          const siteDocs = await getDocs(qSite);
          
          if (siteDocs.empty) {
            setError('Halaman Linktree tidak ditemukan.');
            setLoading(false);
            return;
          }
          
          const siteData = siteDocs.docs[0].data() as LinktreeSite;
          setSite(siteData);
          
          // 2. Fetch Links using the document ID
          // Note: We fetch ALL links and filter/sort in client-side to avoid "Missing Index" errors
          // This is safe because a single linktree won't have thousands of links.
          const linksRef = collection(db, 'linktree_sites', siteDocs.docs[0].id, 'links');
          const qLinks = query(linksRef); 
          const linksSnap = await getDocs(qLinks);

          const linksData = linksSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((l: any) => l.aktif === true)
            .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0));

          setLinks(linksData.map((l: any) => ({
            id: l.id,
            title: l.nama_link,
            url: l.url_target,
            logo: l.logo_url,
            is_active: l.aktif,
            order: l.urutan
          })));
        } else {
           const siteData = siteSnap.data() as LinktreeSite;
           setSite(siteData);
           
           // 2. Fetch Links (Client-side sort/filter)
           const linksRef = collection(db, 'linktree_sites', slug, 'links');
           const qLinks = query(linksRef);
           const linksSnap = await getDocs(qLinks);

           const linksData = linksSnap.docs
             .map(doc => ({ id: doc.id, ...doc.data() }))
             .filter((l: any) => l.aktif === true)
             .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0));

           setLinks(linksData.map((l: any) => ({
             id: l.id,
             title: l.nama_link,
             url: l.url_target,
             logo: l.logo_url,
             is_active: l.aktif,
             order: l.urutan
           })));
        }

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(`Terjadi kesalahan: ${err.message || 'Gagal memuat data'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

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
          <div className="w-24 h-24 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-primary shadow-xl shadow-primary/20 overflow-hidden">
            {site?.logo ? (
              <img src={site.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-gray-500">
                {site?.storeName ? site.storeName.charAt(0).toUpperCase() : '?'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {site?.storeName || 'My Linktree'}
          </h1>
          <p className="text-sm text-gray-400 max-w-[280px] mx-auto">
            {site?.description || 'Welcome to my links!'}
          </p>
        </motion.div>

        {/* Links List */}
        <div className="space-y-4 flex-1 w-full max-w-sm mx-auto">
          {links.map((link, index) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center w-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:border-primary/50 rounded-2xl p-4 transition-all duration-300 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                {link.logo && (
                  <div className="absolute left-4 w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-colors">
                    <img src={link.logo} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <span className="font-bold text-lg text-white group-hover:text-primary transition-colors relative z-10 tracking-tight">
                  {link.title}
                </span>
                
                <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              </a>
            </motion.div>
          ))}

          {links.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-gray-600 bg-zinc-900/20 rounded-2xl border border-white/5 border-dashed"
            >
              <LinkIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Belum ada link yang aktif.</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center pb-8">
          <a 
            href="https://jhnz.online" 
            target="_blank" 
            rel="noreferrer" 
            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-primary transition-colors uppercase tracking-widest"
          >
            Powered by JhnzSuite
          </a>
        </div>
      </div>
    </div>
  );
}
