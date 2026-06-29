import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { Link as LinkIcon, Plus, Trash2, ExternalLink, Image, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Linktree() {
  const { role } = useAuthStore();
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    image: '',
    links: [] as { id: string, title: string, url: string }[]
  });
  const [loading, setLoading] = useState(false);

  const handleAddLink = () => {
    setProfile({
      ...profile,
      links: [...profile.links, { id: Date.now().toString(), title: '', url: '' }]
    });
  };

  const handleUpdateLink = (id: string, field: 'title' | 'url', value: string) => {
    setProfile({
      ...profile,
      links: profile.links.map(link => link.id === id ? { ...link, [field]: value } : link)
    });
  };

  const handleDeleteLink = (id: string) => {
    setProfile({
      ...profile,
      links: profile.links.filter(link => link.id !== id)
    });
  };

  const handleSave = () => {
    if (!profile.name) {
      toast.error('Please enter a profile name');
      return;
    }
    
    setLoading(true);
    // Simulate save
    setTimeout(() => {
      setLoading(false);
      toast.success('Linktree profile saved!');
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Linktree Builder</h1>
        <div className="flex items-center gap-2">
          <a 
            href={`https://bio.jhnz.online/${profile.name.toLowerCase().replace(/\s+/g, '-')}`} 
            target="_blank" 
            rel="noreferrer"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            View Live Page
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Edit Profile
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Profile Image URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={profile.image}
                  onChange={(e) => setProfile({ ...profile, image: e.target.value })}
                  className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 focus:border-primary focus:outline-none"
                  placeholder="https://..."
                />
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden">
                  {profile.image ? <img src={profile.image} alt="Preview" className="w-full h-full object-cover" /> : <Image className="w-5 h-5 text-gray-500" />}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
              <input 
                type="text" 
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 focus:border-primary focus:outline-none"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Bio / Description</label>
              <textarea 
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 h-24 focus:border-primary focus:outline-none resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-400">Links</label>
                <button 
                  onClick={handleAddLink}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Link
                </button>
              </div>

              <div className="space-y-3">
                {profile.links.map((link, index) => (
                  <div key={link.id} className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-2 group">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500 w-6 text-center">{index + 1}</span>
                      <input 
                        type="text" 
                        value={link.title}
                        onChange={(e) => handleUpdateLink(link.id, 'title', e.target.value)}
                        className="flex-1 bg-transparent border-b border-white/10 focus:border-primary focus:outline-none text-sm pb-1"
                        placeholder="Link Title"
                      />
                      <button 
                        onClick={() => handleDeleteLink(link.id)}
                        className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pl-8">
                      <input 
                        type="text" 
                        value={link.url}
                        onChange={(e) => handleUpdateLink(link.id, 'url', e.target.value)}
                        className="flex-1 bg-transparent border-b border-white/10 focus:border-primary focus:outline-none text-xs text-gray-400 pb-1"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors neon-border mt-4 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Profile
            </button>
          </div>
        </div>

        {/* Preview Phone */}
        <div className="flex justify-center items-start pt-8">
          <div className="w-[320px] h-[640px] bg-black border-[8px] border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-xl z-10" />
            
            <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-zinc-900 to-black text-white p-6 pt-12">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-primary mb-4 overflow-hidden">
                  {profile.image ? (
                    <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl font-bold">
                      {profile.name ? profile.name[0] : '?'}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-1">{profile.name || 'Your Name'}</h3>
                <p className="text-sm text-gray-400">{profile.bio || 'Your bio goes here...'}</p>
              </div>

              <div className="space-y-3">
                {profile.links.map((link) => (
                  <a 
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full py-3 px-4 bg-white/5 hover:bg-primary hover:text-black border border-white/10 rounded-xl text-center text-sm font-medium transition-all transform hover:scale-[1.02]"
                  >
                    {link.title || 'Link Title'}
                  </a>
                ))}
                {profile.links.length === 0 && (
                  <div className="text-center text-xs text-gray-600 py-4 border border-dashed border-white/10 rounded-xl">
                    Add links to see them here
                  </div>
                )}
              </div>

              <div className="mt-12 text-center">
                <span className="text-[10px] text-gray-600 uppercase tracking-widest">Powered by JhnzSuite</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
