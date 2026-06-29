import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { MessageCircle, Star, Filter, Search, CheckCircle, X } from 'lucide-react';

export default function PublicView() {
  const { slug } = useParams();
  const [site, setSite] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const q = query(collection(db, 'testi_sites'), where('subdomain', '==', slug));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const siteData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          setSite(siteData);
          
          // Fetch testimonials
          const testiQuery = query(
            collection(db, `testi_sites/${siteData.id}/testimonials`),
            orderBy('createdAt', 'desc')
          );
          
          const unsubscribe = onSnapshot(testiQuery, (snap) => {
            setTestimonials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });

          return () => unsubscribe();
        } else {
          setError('Website tidak ditemukan.');
        }
      } catch (error: any) {
        console.error('Error fetching site:', error);
        setError(`Terjadi kesalahan: ${error.message || 'Gagal memuat data'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-white text-center p-4">
    <div>
      <h1 className="text-2xl font-bold mb-2">Error</h1>
      <p className="text-gray-400">{error}</p>
    </div>
  </div>;
  if (!site) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Website tidak ditemukan</div>;

  const filteredTestimonials = testimonials.filter(t => {
    if (filter === 'all') return true;
    return t.category === filter;
  });

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center neon-border">
              <span className="font-bold text-black text-xl">{site.storeName.charAt(0)}</span>
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none">{site.storeName}</h1>
              <p className="text-xs text-gray-400">Official Testimonials</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{testimonials.length} Verified Reviews</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Bukti Nyata <span className="text-primary">Kepuasan Pelanggan</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-8">
            {site.description}
          </p>
          
          {/* Filters */}
          <div className="flex justify-center gap-2 flex-wrap">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              Semua
            </button>
            {/* Dynamic filters could be added here based on unique product names */}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTestimonials.map((testi) => (
            <div key={testi.id} className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-all group">
              <div 
                className="aspect-[4/3] bg-zinc-800 relative overflow-hidden cursor-pointer"
                onClick={() => setSelectedImage(testi.imageUrl)}
              >
                <img 
                  src={testi.imageUrl} 
                  alt={testi.productName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-medium flex items-center gap-2">
                    <Search className="w-4 h-4" /> Zoom
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{testi.productName}</h3>
                    <p className="text-sm text-gray-400">{testi.specs}</p>
                  </div>
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
                    DONE ✓
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="font-mono text-lg font-bold">Rp {parseInt(testi.price).toLocaleString('id-ID')}</span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-primary">
            <X className="w-8 h-8" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full view" 
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
          />
        </div>
      )}

      <footer className="py-8 text-center text-gray-500 text-sm border-t border-white/10 bg-black">
        <p>&copy; {new Date().getFullYear()} {site.storeName}. Powered by JhnzSuite.</p>
      </footer>
    </div>
  );
}
