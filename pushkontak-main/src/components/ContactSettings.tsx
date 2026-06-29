import React, { useState } from 'react';

interface ContactSettingsProps {
  userId: string;
}

export const ContactSettings: React.FC<ContactSettingsProps> = ({ userId }) => {
  const [contactName, setContactName] = useState('Buyer');
  const [loading, setLoading] = useState(false);

  const saveName = async () => {
    if (!contactName) return alert('Nama tidak boleh kosong');
    setLoading(true);
    try {
      const response = await fetch('/api/user/set-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'default_secret_key',
        },
        body: JSON.stringify({ userId, name: contactName }),
      });
      if (response.ok) {
        alert('Nama kontak berhasil disimpan!');
      } else {
        const data = await response.json();
        alert(data.error || 'Gagal menyimpan nama kontak');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const resetIndex = async () => {
    if (!confirm('Yakin ingin mereset index? Data kontak akan terhapus.')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/reset-counter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'default_secret_key',
        },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        alert('Index berhasil direset!');
      } else {
        alert('Gagal mereset index');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-zinc-900 rounded-xl border border-white/10 mb-8">
      <h2 className="text-lg font-bold mb-4 text-white">Pengaturan Kontak</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">Nama Kontak Default</label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Contoh: Customer"
          className="mt-1 block w-full bg-zinc-800 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500"
        />
        <p className="text-xs text-gray-500 mt-1">Penomoran akan otomatis melanjutkan dari data sebelumnya</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={saveName} 
          disabled={loading}
          className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Simpan Nama'}
        </button>
        <button 
          onClick={resetIndex} 
          disabled={loading}
          className="bg-red-600 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Reset Index'}
        </button>
      </div>
    </div>
  );
};
