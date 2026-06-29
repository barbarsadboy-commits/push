import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export default function PublicView() {
  const { slug } = useParams();
  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSite = async () => {
      if (!slug) return;
      try {
        const docRef = doc(db, 'custom_sites', slug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status !== 'active') {
            setError('Website sedang tidak aktif.');
          } else {
            setSite(data);
            // Increment views
            updateDoc(docRef, { views: increment(1) }).catch(console.error);
          }
        } else {
          setError('Website tidak ditemukan.');
        }
      } catch (err) {
        console.error('Error fetching site:', err);
        setError('Terjadi kesalahan saat memuat website.');
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [slug]);

  useEffect(() => {
    if (site) {
      document.title = site.name || 'Website';
      
      // Inject CSS
      if (site.cssContent) {
        const style = document.createElement('style');
        style.innerHTML = site.cssContent;
        document.head.appendChild(style);
        return () => {
          document.head.removeChild(style);
        };
      }
    }
  }, [site]);

  useEffect(() => {
    if (site && site.jsContent) {
      // Inject JS
      const script = document.createElement('script');
      script.innerHTML = site.jsContent;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [site]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Memuat...</div>;
  }

  if (error || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: site.htmlContent }} />
  );
}
