import React, { useState } from 'react';

interface ExportContactsProps {
  userId: string;
  apiKey: string;
}

export const ExportContacts: React.FC<ExportContactsProps> = ({ userId, apiKey }) => {
  const [contactName, setContactName] = useState('');

  const exportVcf = async () => {
    if (!contactName) {
      alert('Nama kontak wajib diisi');
      return;
    }
    try {
      const response = await fetch('/api/export/vcf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ userId, name: contactName }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contacts.vcf';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const data = await response.json();
        alert(data.error || 'Gagal export kontak');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    }
  };

  return (
    <div className="p-4 bg-zinc-900 rounded-xl border border-white/10">
      <h2 className="text-lg font-bold mb-4 text-white">Export Kontak</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">Nama Kontak</label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Contoh: Customer"
          className="mt-1 block w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500"
        />
      </div>
      <button onClick={exportVcf} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg">Export Kontak (.vcf)</button>
    </div>
  );
};
