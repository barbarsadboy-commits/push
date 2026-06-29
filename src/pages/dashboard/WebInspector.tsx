import React, { useState } from 'react';
import { Code, Search, Download, Copy, Check, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import VIPFeatureGuard from '../../components/VIPFeatureGuard';
import JSZip from 'jszip';

export default function WebInspector() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ html: string; css: string; js: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [copied, setCopied] = useState(false);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error('Masukkan URL website!');
      return;
    }

    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Use local proxy first, fallback to allorigins if needed (or just use local)
      // Local proxy is better because it runs on server side and avoids CORS issues more reliably
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch');
      }
      
      const data = await response.json();
      const htmlContent = data.contents;
      
      if (!htmlContent) throw new Error('Empty response');

      // Basic parsing to extract CSS and JS
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract CSS
      let css = '';
      const styles = doc.querySelectorAll('style');
      styles.forEach(style => {
        css += style.innerHTML + '\n\n';
      });
      
      // Extract JS
      let js = '';
      const scripts = doc.querySelectorAll('script:not([src])');
      scripts.forEach(script => {
        js += script.innerHTML + '\n\n';
      });

      // Format HTML (basic)
      const formattedHtml = htmlContent
        .replace(/></g, '>\n<')
        .replace(/(<style[^>]*>).*?(<\/style>)/gis, '$1/* CSS extracted */$2')
        .replace(/(<script[^>]*>).*?(<\/script>)/gis, '$1/* JS extracted */$2');

      setResult({
        html: formattedHtml,
        css: css || '/* Tidak ada inline CSS ditemukan */',
        js: js || '/* Tidak ada inline JS ditemukan */'
      });
      
      toast.success('Berhasil menginspeksi website!');
    } catch (error) {
      console.error('Inspect error:', error);
      toast.error('Gagal menginspeksi website. Pastikan URL valid dan dapat diakses publik.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result[activeTab]);
    setCopied(true);
    toast.success('Kode berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!result) return;
    
    try {
      const zip = new JSZip();
      zip.file("index.html", result.html);
      zip.file("style.css", result.css);
      zip.file("script.js", result.js);
      
      const blob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Create a safe filename from URL
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      a.download = `${domain}-source.zip`;
      
      a.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success('File berhasil diunduh!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Gagal membuat file ZIP.');
    }
  };

  return (
    <VIPFeatureGuard featureName="Inspeksi Web">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
              Web Inspector Pro
            </h1>
            <p className="text-gray-400 text-sm mt-1">Inspeksi dan ekstrak kode HTML, CSS, dan JS dari website mana pun.</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleInspect} className="flex gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://contoh-website.com"
                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl focus:border-primary focus:outline-none text-white font-medium transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
              ) : (
                <Code className="w-5 h-5" />
              )}
              Inspeksi
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Hanya dapat mengekstrak inline CSS/JS dan HTML statis. File eksternal mungkin tidak terambil sempurna.
          </p>
        </div>

        {result && (
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between bg-black/40 border-b border-white/10 px-4 py-3">
              <div className="flex gap-2">
                {(['html', 'css', 'js'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all ${
                      activeTab === tab 
                        ? 'bg-primary text-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/10"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium border border-primary/20"
                >
                  <Download className="w-4 h-4" />
                  Download ZIP
                </button>
              </div>
            </div>
            <div className="p-4 bg-[#0d1117] overflow-x-auto">
              <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap break-all">
                <code>{result[activeTab]}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </VIPFeatureGuard>
  );
}
