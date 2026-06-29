import React, { useState } from 'react';
import { Image as ImageIcon, Upload, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ImgToUrl() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('File harus berupa gambar!');
        return;
      }
      if (selectedFile.size > 32 * 1024 * 1024) { // ImgBB limit is 32MB
        toast.error('Ukuran gambar maksimal 32MB!');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResultUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Pilih gambar terlebih dahulu!');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // ImgBB API Key
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '0e0e532ac5784532b979921770cfdc74';
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Gagal mengupload gambar');
      }

      const data = await response.json();
      
      if (data.success) {
        setResultUrl(data.data.url);
        toast.success('Gambar berhasil diubah menjadi URL!');
      } else {
        throw new Error(data.error?.message || 'Gagal mengupload gambar');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Terjadi kesalahan saat mengupload gambar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultUrl) return;
    navigator.clipboard.writeText(resultUrl);
    setCopied(true);
    toast.success('URL berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
            Image to URL Converter
          </h1>
          <p className="text-gray-400 text-sm mt-1">Ubah gambar Anda menjadi link publik secara instan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload Gambar
          </h2>
          
          <div className="relative border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary/50 transition-colors bg-black/30 group">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {preview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10">
                <img src={preview} alt="Preview" className="w-full h-full object-contain bg-black/50" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white font-bold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" /> Ganti Gambar
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 group-hover:text-primary transition-colors" />
                <p className="font-bold text-lg mb-2 text-white">Pilih atau Tarik Gambar</p>
                <p className="text-sm text-gray-400">Mendukung JPG, PNG, GIF (Max 32MB)</p>
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="w-full mt-6 py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {isLoading ? 'Mengupload...' : 'Convert to URL'}
          </button>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-primary" />
            Hasil URL
          </h2>
          
          {resultUrl ? (
            <div className="flex-1 flex flex-col justify-center animate-fade-in">
              <div className="bg-black/40 border border-white/10 rounded-xl p-6 text-center mb-6">
                <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Upload Berhasil!</h3>
                <p className="text-gray-400 text-sm">Gambar Anda sekarang dapat diakses secara publik.</p>
              </div>
              
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Direct Link</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={resultUrl}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 focus:border-primary focus:outline-none text-white font-medium transition-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="p-4 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 flex-shrink-0"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 bg-white/5 text-white hover:bg-white/10 rounded-xl transition-colors border border-white/10 flex-shrink-0"
                    title="Buka di tab baru"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Belum ada gambar yang diupload.</p>
              <p className="text-sm mt-2">URL publik akan muncul di sini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
