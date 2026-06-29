import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { Globe, Plus, Trash2, ExternalLink, Layout, Eye, Upload, Download, FileCode, FileJson, FileType } from 'lucide-react';
import { toast } from 'sonner';
import { createNetlifyDeployment } from '../../lib/deploy';
import bcrypt from 'bcryptjs';
import JSZip from 'jszip';

import VIPFeatureGuard from '../../components/VIPFeatureGuard';

import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function WebsiteBuilder() {
  const { user, role } = useAuthStore();
  const [sites, setSites] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'custom_sites'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);
  
  // Form State
  const [name, setName] = useState('');
  
  // File State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadedFiles(files);
    toast.success(`${files.length} file berhasil diupload!`);
  };

  const downloadTemplate = async (type: string) => {
    const zip = new JSZip();
    
    let html = '';
    let css = '';
    let js = '';

    if (type === 'linktree') {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Linktree</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <img src="https://picsum.photos/seed/avatar/150/150" alt="Profile" class="profile-img">
        <h1>@username</h1>
        <p class="bio">Welcome to my official links!</p>
        
        <div class="links">
            <a href="#" class="link-btn" target="_blank">Instagram</a>
            <a href="#" class="link-btn" target="_blank">Twitter</a>
            <a href="#" class="link-btn" target="_blank">YouTube</a>
            <a href="#" class="link-btn" target="_blank">My Website</a>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`;
      css = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 2rem; color: white; }
.container { width: 100%; max-width: 400px; text-align: center; }
.profile-img { width: 120px; height: 120px; border-radius: 50%; border: 4px solid white; margin-bottom: 1rem; object-fit: cover; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; }
.bio { font-size: 1rem; opacity: 0.9; margin-bottom: 2rem; }
.links { display: flex; flex-direction: column; gap: 1rem; }
.link-btn { display: block; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); padding: 1rem; border-radius: 50px; color: white; text-decoration: none; font-weight: 500; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.link-btn:hover { background: white; color: #764ba2; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }`;
      js = `console.log("Linktree loaded successfully!");`;
    } else if (type === 'payment') {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Gateway</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="payment-card">
        <div class="header">
            <h2>Complete Payment</h2>
            <p>Total: <strong>Rp 150.000</strong></p>
        </div>
        
        <div class="methods">
            <div class="method active" onclick="selectMethod(this)">
                <div class="method-info">
                    <strong>BCA Virtual Account</strong>
                    <span>12345 67890 12345</span>
                </div>
                <button class="copy-btn" onclick="copyText('123456789012345', event)">Copy</button>
            </div>
            
            <div class="method" onclick="selectMethod(this)">
                <div class="method-info">
                    <strong>Mandiri Virtual Account</strong>
                    <span>89012 34567 89012</span>
                </div>
                <button class="copy-btn" onclick="copyText('890123456789012', event)">Copy</button>
            </div>
        </div>
        
        <button class="confirm-btn" onclick="confirmPayment()">I Have Paid</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`;
      css = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 1rem; color: #1f2937; }
.payment-card { background: white; width: 100%; max-width: 400px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; }
.header { background: #4f46e5; color: white; padding: 2rem; text-align: center; }
.header h2 { font-size: 1.25rem; margin-bottom: 0.5rem; font-weight: 600; }
.header p { font-size: 1.5rem; }
.methods { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.method { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.method:hover { border-color: #a5b4fc; }
.method.active { border-color: #4f46e5; background: #eef2ff; }
.method-info { display: flex; flex-direction: column; gap: 0.25rem; }
.method-info strong { font-size: 1rem; color: #111827; }
.method-info span { font-size: 0.875rem; color: #4b5563; font-family: monospace; letter-spacing: 1px; }
.copy-btn { background: #e5e7eb; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: background 0.2s; color: #374151; }
.copy-btn:hover { background: #d1d5db; }
.confirm-btn { width: calc(100% - 3rem); margin: 0 1.5rem 1.5rem; background: #4f46e5; color: white; border: none; padding: 1rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.confirm-btn:hover { background: #4338ca; }`;
      js = `function selectMethod(element) {
    document.querySelectorAll('.method').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

function copyText(text, event) {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        btn.style.background = '#10b981';
        btn.style.color = 'white';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = '#e5e7eb';
            btn.style.color = '#374151';
        }, 2000);
    });
}

function confirmPayment() {
    alert('Payment confirmation sent! Please wait for verification.');
}`;
    } else {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Testimonials</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>What Our Clients Say</h1>
            <p>Trusted by thousands of happy customers worldwide</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <div class="stars">★★★★★</div>
                <p class="quote">"Absolutely fantastic service! The team was incredibly helpful and the product exceeded all my expectations. Highly recommended!"</p>
                <div class="author">
                    <img src="https://picsum.photos/seed/user1/50/50" alt="Sarah J.">
                    <div>
                        <strong>Sarah Jenkins</strong>
                        <span>Marketing Director</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="stars">★★★★★</div>
                <p class="quote">"I've tried many similar products, but this one stands out. The attention to detail and customer support is unmatched."</p>
                <div class="author">
                    <img src="https://picsum.photos/seed/user2/50/50" alt="Michael T.">
                    <div>
                        <strong>Michael Thompson</strong>
                        <span>Freelance Designer</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="stars">★★★★☆</div>
                <p class="quote">"Great experience overall. Setup was a breeze and the interface is very intuitive. Will definitely use again for future projects."</p>
                <div class="author">
                    <img src="https://picsum.photos/seed/user3/50/50" alt="Emily R.">
                    <div>
                        <strong>Emily Rodriguez</strong>
                        <span>Small Business Owner</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`;
      css = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; color: #333; line-height: 1.6; padding: 4rem 2rem; }
.container { max-width: 1200px; margin: 0 auto; }
.header { text-align: center; margin-bottom: 4rem; }
.header h1 { font-size: 2.5rem; color: #111; margin-bottom: 1rem; font-weight: 800; letter-spacing: -1px; }
.header p { font-size: 1.125rem; color: #666; max-width: 600px; margin: 0 auto; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
.card { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); transition: transform 0.3s ease; border: 1px solid #eaeaea; }
.card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
.stars { color: #fbbf24; font-size: 1.25rem; margin-bottom: 1rem; letter-spacing: 2px; }
.quote { font-size: 1rem; color: #444; margin-bottom: 1.5rem; font-style: italic; }
.author { display: flex; align-items: center; gap: 1rem; border-top: 1px solid #eee; padding-top: 1.5rem; }
.author img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
.author strong { display: block; font-size: 0.95rem; color: #111; }
.author span { font-size: 0.85rem; color: #777; }`;
      js = `console.log("Testimonials loaded successfully!");`;
    }

    zip.file("index.html", html);
    zip.file("style.css", css);
    zip.file("script.js", js);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (role === 'free') {
      toast.error('Fitur ini hanya untuk pengguna VIP!');
      return;
    }

    if (!name || uploadedFiles.length === 0) {
      toast.error('Mohon lengkapi nama dan upload file website!');
      return;
    }

    const generatedSubdomain = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const finalSubdomain = generatedSubdomain || `site-${Date.now()}`;

    setIsDeploying(true);

    try {
      // Create zip for Netlify deploy
      const zip = new JSZip();
      
      let htmlContent = '';
      let cssContent = '';
      let jsContent = '';

      for (const file of uploadedFiles) {
        // Read file content
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });

        // Add to zip
        zip.file(file.name, content);

        // Save index.html, style.css, script.js to state for admin panel
        if (file.name.toLowerCase() === 'index.html') htmlContent = content;
        if (file.name.toLowerCase() === 'style.css') cssContent = content;
        if (file.name.toLowerCase() === 'script.js') jsContent = content;
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Deploy to Netlify
      const netlifyUrl = await createNetlifyDeployment(finalSubdomain, zipBlob);
      
      if (!netlifyUrl) {
        setIsDeploying(false);
        return; // Stop if deploy failed
      }

      const hashedPassword = await bcrypt.hash('admin', 10);

      await setDoc(doc(db, 'custom_sites', finalSubdomain), {
        ownerId: user?.uid,
        name,
        subdomain: finalSubdomain,
        htmlContent,
        cssContent,
        jsContent,
        adminUsername: 'admin',
        adminPassword: hashedPassword,
        netlifyUrl: netlifyUrl,
        createdAt: serverTimestamp(),
        views: 0,
        status: 'active'
      });

      setIsCreating(false);
      setName('');
      setUploadedFiles([]);
      toast.success('Website berhasil dibuat dan dideploy ke Netlify!');
      
    } catch (error) {
      console.error('Error creating site:', error);
      toast.error('Gagal membuat website. Nama mungkin sudah digunakan.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus website ini?')) {
      try {
        await deleteDoc(doc(db, 'custom_sites', id));
        toast.success('Website dihapus.');
      } catch (error) {
        console.error('Error deleting site:', error);
        toast.error('Gagal menghapus website.');
      }
    }
  };

  return (
    <VIPFeatureGuard featureName="Website Builder">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Custom Website Builder</h1>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors neon-border"
          >
            <Plus className="w-5 h-5" />
            Buat Website Baru
          </button>
        </div>

      {isCreating && (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-6">Konfigurasi Website Custom</h2>
          
          <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Template Dasar (.zip)
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Anda bisa mendownload template dasar ini, mengeditnya di komputer Anda, lalu menguploadnya kembali di bawah.
            </p>
            <div className="flex gap-3">
              <button onClick={() => downloadTemplate('linktree')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors border border-white/10">
                Template Linktree
              </button>
              <button onClick={() => downloadTemplate('payment')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors border border-white/10">
                Template Payment
              </button>
              <button onClick={() => downloadTemplate('testimonial')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors border border-white/10">
                Template Testimoni
              </button>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nama Website</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:outline-none"
                  placeholder="Website Custom Saya"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b border-white/10 pb-2">Upload File Script</h3>
              <p className="text-xs text-gray-500">Pilih semua file HTML, CSS, dan JS Anda sekaligus (atau pilih folder). Script akan langsung di-deploy ke Netlify.</p>
              
              <div className="relative border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary/50 transition-colors bg-black/30">
                <input 
                  type="file" 
                  multiple
                  accept=".html,.css,.js"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className={`w-12 h-12 mx-auto mb-4 ${uploadedFiles.length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
                <p className="font-bold text-lg mb-2">Upload File Website</p>
                <p className="text-sm text-gray-400 mb-4">Klik atau drag & drop file ke sini</p>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg text-left">
                    <p className="text-sm font-bold text-green-400 mb-2">{uploadedFiles.length} file terpilih:</p>
                    <ul className="text-xs text-gray-400 space-y-1 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <FileType className="w-3 h-3" /> {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-lg border border-white/5">
              <p className="text-sm text-gray-400">
                <strong>Catatan Admin:</strong> Setelah website dibuat, Anda dapat mengakses panel admin di <code className="text-primary">/w/nama-website/admin</code>.
                <br/>Username default: <strong>admin</strong> | Password default: <strong>admin</strong>
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="submit"
                disabled={isDeploying}
                className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isDeploying ? 'Mendeploy ke Netlify...' : 'Buat & Deploy Website'}
              </button>
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-6 py-2 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.length === 0 && !isCreating ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-zinc-900/50 rounded-xl border border-white/5 border-dashed">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada website custom dibuat.</p>
          </div>
        ) : (
          sites.map((site) => (
            <div key={site.id} className="bg-zinc-900 border border-white/10 rounded-xl p-6 hover:border-primary/30 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg truncate max-w-[200px]">{site.name}</h3>
                  <p className="text-xs text-gray-400">{site.netlifyUrl ? new URL(site.netlifyUrl).hostname : `/w/${site.subdomain}`}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDelete(site.id)}
                    className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs font-bold uppercase">
                  {site.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                <a 
                  href={site.netlifyUrl || `/w/${site.subdomain}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-white text-sm font-bold rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lihat Web
                </a>
                <a 
                  href={`/w/${site.subdomain}/admin`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-bold rounded-lg hover:bg-primary/20 transition-colors border border-primary/20"
                >
                  <Globe className="w-4 h-4" />
                  Admin
                </a>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </VIPFeatureGuard>
  );
}

