import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Settings, Save, LogOut, Upload, FileCode, FileJson, FileType, Lock } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';
import JSZip from 'jszip';
import { createNetlifyDeployment } from '../../lib/deploy';

export default function AdminView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit State
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [jsContent, setJsContent] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchSite = async () => {
      if (!slug) return;
      try {
        const docRef = doc(db, 'custom_sites', slug);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSite({ id: docSnap.id, ...docSnap.data() });
          setHtmlContent(docSnap.data().htmlContent || '');
          setCssContent(docSnap.data().cssContent || '');
          setJsContent(docSnap.data().jsContent || '');
        } else {
          toast.error('Website tidak ditemukan');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching site:', error);
        toast.error('Gagal memuat data website');
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [slug, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;

    if (username !== site.adminUsername) {
      toast.error('Username atau password salah!');
      return;
    }

    const isValid = await bcrypt.compare(password, site.adminPassword);
    if (isValid) {
      setIsAuthenticated(true);
      toast.success('Login berhasil!');
    } else {
      toast.error('Username atau password salah!');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'html' | 'css' | 'js') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (type === 'html') setHtmlContent(content);
      if (type === 'css') setCssContent(content);
      if (type === 'js') setJsContent(content);
      toast.success(`File ${type.toUpperCase()} berhasil diupload!`);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!slug || !site) return;
    setSaving(true);

    try {
      // Create zip for Netlify deploy
      const zip = new JSZip();
      zip.file("index.html", htmlContent);
      if (cssContent) zip.file("style.css", cssContent);
      if (jsContent) zip.file("script.js", jsContent);
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Deploy to Netlify
      const netlifyUrl = await createNetlifyDeployment(site.subdomain, zipBlob);
      
      const updates: any = {
        htmlContent,
        cssContent,
        jsContent
      };

      if (netlifyUrl) {
        updates.netlifyUrl = netlifyUrl;
      }

      if (newPassword) {
        updates.adminPassword = await bcrypt.hash(newPassword, 10);
      }

      await updateDoc(doc(db, 'custom_sites', slug), updates);
      
      toast.success('Konfigurasi berhasil disimpan dan dideploy!');
      if (newPassword) {
        setNewPassword('');
        toast.info('Password admin telah diperbarui.');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Memuat...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-500 mt-2">Kelola website custom Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
            >
              Login ke Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-xl text-gray-900">Admin Panel</span>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href={site?.netlifyUrl || `/w/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Lihat Website
              </a>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" /> Update File Script
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* HTML Upload */}
            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
              <input 
                type="file" 
                accept=".html"
                onChange={(e) => handleFileUpload(e, 'html')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileType className={`w-8 h-8 mx-auto mb-3 ${htmlContent ? 'text-green-500' : 'text-gray-400'}`} />
              <p className="font-bold text-gray-900 mb-1">Update HTML</p>
              <p className="text-xs text-gray-500">{htmlContent ? 'File terisi' : 'Wajib'}</p>
            </div>

            {/* CSS Upload */}
            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
              <input 
                type="file" 
                accept=".css"
                onChange={(e) => handleFileUpload(e, 'css')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileCode className={`w-8 h-8 mx-auto mb-3 ${cssContent ? 'text-green-500' : 'text-gray-400'}`} />
              <p className="font-bold text-gray-900 mb-1">Update CSS</p>
              <p className="text-xs text-gray-500">{cssContent ? 'File terisi' : 'Opsional'}</p>
            </div>

            {/* JS Upload */}
            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
              <input 
                type="file" 
                accept=".js"
                onChange={(e) => handleFileUpload(e, 'js')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileJson className={`w-8 h-8 mx-auto mb-3 ${jsContent ? 'text-green-500' : 'text-gray-400'}`} />
              <p className="font-bold text-gray-900 mb-1">Update JS</p>
              <p className="text-xs text-gray-500">{jsContent ? 'File terisi' : 'Opsional'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" /> Keamanan
          </h2>
          
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password Admin Baru (Opsional)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Kosongkan jika tidak ingin diubah"
            />
            <p className="text-xs text-gray-500 mt-2">Isi hanya jika Anda ingin mengganti password admin saat ini.</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </main>
    </div>
  );
}
