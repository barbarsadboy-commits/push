import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { QrCode, Smartphone, Users, Send, AlertCircle, CheckCircle, Loader2, Key, MessageSquare, Image as ImageIcon, FileText, Video, RefreshCw, LogOut, Terminal, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function WhatsApp() {
  const { user, role } = useAuthStore();
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [count, setCount] = useState<number | string>(1);
  const [delay, setDelay] = useState<number | string>(5);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [connectMethod, setConnectMethod] = useState<'qr' | 'pairing'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [waConfig, setWaConfig] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState<'kontak' | 'grup'>('kontak');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaBase64, setMediaBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document' | null>(null);
  const [mediaMimeType, setMediaMimeType] = useState<string | null>(null);
  const stopPushRef = useRef(false);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (error) {
        setServerStatus('offline');
      }
    };
    checkServer();
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (!db) return;
        const docSnap = await getDoc(doc(db, 'settings', 'wa'));
        if (docSnap.exists()) {
          setWaConfig(docSnap.data());
        }
      } catch (error) {
        console.log("WA config fetch error:", error);
      }
    };
    fetchConfig();
  }, []);

  // Poll status
  useEffect(() => {
    if (!user?.uid) return;
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/wa/status?userId=${user.uid}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        setQrCode(data.qr);
        if (data.pairingCode) setPairingCode(data.pairingCode);
      } catch (error) {
        // Suppress network errors during server restart
      }
    };

    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial call
    return () => clearInterval(interval);
  }, [user?.uid]);

  const handleConnect = async () => {
    if (!user?.uid) return;
    try {
      await fetch('/api/wa/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      toast.success('Initializing connection...');
    } catch (error) {
      toast.error('Failed to initialize connection');
    }
  };

  const handleLogout = async () => {
    if (!user?.uid) return;
    if (!confirm('Are you sure you want to reset your WhatsApp session? This will delete all local session data.')) return;
    
    try {
      const res = await fetch('/api/wa/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('disconnected');
        setQrCode(null);
        setPairingCode(null);
        setGroups([]);
        toast.success('Session reset successfully!');
      }
    } catch (error) {
      toast.error('Failed to reset session');
    }
  };

  const handleScanGroups = async () => {
    if (!user?.uid) return;
    if (status !== 'connected') {
      toast.error('Please connect WhatsApp first!');
      return;
    }
    setLoadingGroups(true);
    try {
      const res = await fetch(`/api/wa/groups?userId=${user.uid}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGroups(data.groups || []);
      toast.success(`Found ${data.groups?.length || 0} groups!`);
    } catch (error: any) {
      toast.error('Failed to scan groups: ' + error.message);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleGetPairingCode = async () => {
    if (!user?.uid) return;
    if (!phoneNumber) {
      toast.error('Please enter your phone number first!');
      return;
    }
    setPairingCode(null);
    try {
      const res = await fetch('/api/wa/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, phoneNumber }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pairing code requested! Please wait...');
      } else {
        throw new Error(data.error || 'Failed to get code');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSend = async () => {
    if (!user?.uid) return;
    if (status !== 'connected') {
      toast.error('Please connect WhatsApp first!');
      return;
    }
    if (!targetGroup) {
      toast.error('Please select a target group or enter a number!');
      return;
    }
    if (!message && !mediaBase64) {
      toast.error('Please enter a message or attach a file!');
      return;
    }

    // Check limits
    const numCount = Number(count);
    const numDelay = Number(delay);

    if (!numCount || numCount <= 0) {
      toast.error('Please enter a valid number of members!');
      return;
    }

    if (isNaN(numDelay) || numDelay < 0) {
      toast.error('Please enter a valid delay!');
      return;
    }

    if (role === 'free' && numCount > 10) {
      toast.error('Free plan limit: Max 10 messages per push. Upgrade to VIP for unlimited.');
      return;
    }

    if (sending) return;
    setSending(true);
    stopPushRef.current = false;

    setLogs(prev => [`[${new Date().toLocaleTimeString()}] Initializing push process (Count: ${numCount}, Delay: ${numDelay}s)...`, ...prev]);
    
    try {
      let targets: string[] = [];

      // If it looks like a group ID, fetch members
      if (targetGroup.includes('@g.us')) {
        setLogs(prev => [`Fetching members for group ${targetGroup}...`, ...prev]);
        const res = await fetch(`/api/wa/group-members?userId=${user.uid}&groupId=${encodeURIComponent(targetGroup)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        if (!data.members || data.members.length === 0) {
          throw new Error('No members found in this group. Make sure the bot is a member of the group.');
        }

        setLogs(prev => [`Found total ${data.members.length} members in group.`, ...prev]);

        // Shuffle and pick unique ones
        const shuffled = [...data.members].sort(() => 0.5 - Math.random());
        targets = shuffled.slice(0, Math.min(numCount, shuffled.length));
        setLogs(prev => [`Targeting ${targets.length} unique members from group.`, ...prev]);
      } else if (targetGroup.includes(',')) {
        // Multiple numbers separated by comma
        targets = targetGroup.split(',').map(t => t.trim()).filter(t => t.length > 5);
        setLogs(prev => [`Targeting ${targets.length} numbers from list.`, ...prev]);
      } else {
        // Single number target
        targets = [targetGroup.trim()];
      }

      let sent = 0;
      const sendToTarget = async (jid: string, retryCount = 0): Promise<boolean> => {
        try {
          const res = await fetch('/api/wa/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user.uid, 
              jid, 
              message,
              media: mediaBase64,
              mediaType
            }),
          });
          
          if (!res.ok) {
            const text = await res.text();
            try {
              const data = JSON.parse(text);
              throw new Error(data.error || `HTTP error! status: ${res.status}`);
            } catch (e) {
              throw new Error(`Server error: ${res.status} ${res.statusText}. Response: ${text.substring(0, 100)}`);
            }
          }
          
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return true;
        } catch (error: any) {
          const isConnectionError = error.message.includes('WhatsApp not connected') || 
                                    error.message.includes('Connection Closed') ||
                                    error.message.includes('Socket closed');
          
          if (isConnectionError && retryCount < 3) {
            setLogs(prev => [`[Warning] Connection issue. Retrying in 5s... (${retryCount + 1}/3)`, ...prev]);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return sendToTarget(jid, retryCount + 1);
          }
          
          setLogs(prev => [`[Error] Failed to send to ${jid}: ${error.message}`, ...prev]);
          return false;
        }
      };

      // Process targets one by one with delay
      const processTargets = async () => {
        for (const target of targets) {
          if (stopPushRef.current) {
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] Push stopped by user.`, ...prev]);
            toast.info('Push stopped by user.');
            break;
          }

          const success = await sendToTarget(target);
          if (success) {
            sent++;
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] Sent DM to ${target} (${sent}/${targets.length})`, ...prev]);
          } else {
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] Failed to send to ${target}. Skipping...`, ...prev]);
          }
          
          // Wait for delay before next target, except for the last one
          if (sent < targets.length && !stopPushRef.current) {
            await new Promise(resolve => setTimeout(resolve, numDelay * 1000));
          }
        }
        if (!stopPushRef.current) {
          setLogs(prev => [`[${new Date().toLocaleTimeString()}] Push completed: ${sent} messages sent.`, ...prev]);
          toast.success('Push completed!');
        }
        setSending(false);
      };

      await processTargets();

    } catch (error: any) {
      setLogs(prev => [`[Critical Error] ${error.message}`, ...prev]);
      toast.error(error.message);
      setSending(false);
    }
  };

  const handleSendJpm = async () => {
    if (!user?.uid) return;
    if (status !== 'connected') {
      toast.error('Please connect WhatsApp first!');
      return;
    }
    if (!message && !mediaBase64) {
      toast.error('Please enter a message or attach a file!');
      return;
    }

    const numDelay = Number(delay);
    if (isNaN(numDelay) || numDelay < 0) {
      toast.error('Please enter a valid delay!');
      return;
    }

    if (sending) return;
    setSending(true);
    stopPushRef.current = false;

    setLogs(prev => [`[${new Date().toLocaleTimeString()}] Fetching groups for JPM...`, ...prev]);
    
    try {
      const res = await fetch(`/api/wa/groups?userId=${user.uid}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      let targetGroups = data.groups || [];
      // Filter out announce groups
      targetGroups = targetGroups.filter((g: any) => !g.announce);

      if (targetGroups.length === 0) {
        throw new Error('No writable groups found.');
      }

      if (targetGroups.length > 50) {
        setLogs(prev => [`[Warning] Found ${targetGroups.length} groups. Limiting to 50 to prevent ban.`, ...prev]);
        targetGroups = targetGroups.slice(0, 50);
      }

      setLogs(prev => [`[${new Date().toLocaleTimeString()}] Starting JPM to ${targetGroups.length} groups...`, ...prev]);

      let sent = 0;
      const sendToTarget = async (jid: string, retryCount = 0): Promise<boolean> => {
        try {
          const res = await fetch('/api/wa/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user.uid, 
              jid, 
              message,
              media: mediaBase64,
              mediaType
            }),
          });
          
          if (!res.ok) {
            const text = await res.text();
            try {
              const data = JSON.parse(text);
              throw new Error(data.error || `HTTP error! status: ${res.status}`);
            } catch (e) {
              throw new Error(`Server error: ${res.status} ${res.statusText}. Response: ${text.substring(0, 100)}`);
            }
          }
          
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return true;
        } catch (error: any) {
          const isConnectionError = error.message.includes('WhatsApp not connected') || 
                                    error.message.includes('Connection Closed') ||
                                    error.message.includes('Socket closed');
          
          if (isConnectionError && retryCount < 3) {
            setLogs(prev => [`[Warning] Connection issue. Retrying in 5s... (${retryCount + 1}/3)`, ...prev]);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return sendToTarget(jid, retryCount + 1);
          }
          
          setLogs(prev => [`[Error] Failed to send to ${jid}: ${error.message}`, ...prev]);
          return false;
        }
      };

      for (const group of targetGroups) {
        if (stopPushRef.current) {
          setLogs(prev => [`[${new Date().toLocaleTimeString()}] JPM stopped by user.`, ...prev]);
          toast.info('JPM stopped by user.');
          break;
        }

        const success = await sendToTarget(group.id);
        if (success) {
          sent++;
          setLogs(prev => [`[${new Date().toLocaleTimeString()}] Sent JPM to ${group.name} (${sent}/${targetGroups.length})`, ...prev]);
        } else {
          setLogs(prev => [`[${new Date().toLocaleTimeString()}] Failed to send to ${group.name}. Skipping...`, ...prev]);
        }
        
        if (sent < targetGroups.length && !stopPushRef.current) {
          await new Promise(resolve => setTimeout(resolve, numDelay * 1000));
        }
      }
      
      if (!stopPushRef.current) {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] JPM completed: ${sent} messages sent.`, ...prev]);
        toast.success('JPM completed!');
      }
      setSending(false);

    } catch (error: any) {
      setLogs(prev => [`[Critical Error] ${error.message}`, ...prev]);
      toast.error(error.message);
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            WhatsApp Automation
          </h1>
          <p className="text-gray-400 mt-1">Manage your WhatsApp bot and broadcast messages</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {serverStatus === 'offline' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium border border-red-500/20 animate-pulse">
              <AlertCircle className="w-4 h-4" />
              Backend Offline
            </div>
          )}
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${
            status === 'connected' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
            status === 'connecting' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
            'bg-zinc-800 text-gray-400 border-white/10'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 
              status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-gray-500'
            }`} />
            <span className="capitalize">{status}</span>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-red-500/10 text-gray-300 hover:text-red-500 text-sm font-medium rounded-xl transition-all border border-white/10 hover:border-red-500/20"
            title="Reset session and disconnect"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Reset Session</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Connection & Scanner */}
        <div className="lg:col-span-5 space-y-8">
          {/* Connection Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
            
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              Device Connection
            </h2>

            <AnimatePresence mode="wait">
              {status === 'disconnected' && !qrCode && !pairingCode && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-center py-10"
                >
                  <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                    <Smartphone className="w-10 h-10 text-gray-500" />
                  </div>
                  <p className="text-gray-400 mb-8">Connect your device to start sending messages</p>
                  <button 
                    onClick={handleConnect}
                    className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] hover:-translate-y-0.5"
                  >
                    Initialize Connection
                  </button>
                </motion.div>
              )}

              {status !== 'connected' && (qrCode || pairingCode || status === 'connecting') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 mb-6">
                    {waConfig?.allowQRCode !== false && (
                      <button 
                        onClick={() => setConnectMethod('qr')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${connectMethod === 'qr' ? 'bg-zinc-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        <QrCode className="w-4 h-4" />
                        QR Code
                      </button>
                    )}
                    {waConfig?.allowPairingCode !== false && (
                      <button 
                        onClick={() => setConnectMethod('pairing')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${connectMethod === 'pairing' ? 'bg-zinc-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        <Key className="w-4 h-4" />
                        Pairing Code
                      </button>
                    )}
                  </div>
                  
                  {connectMethod === 'qr' && qrCode && (
                    <div className="flex flex-col items-center py-6">
                      <div className="bg-white p-4 rounded-2xl mb-6 shadow-2xl">
                        <img src={qrCode} alt="QR Code" className="w-56 h-56" />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Waiting for scan...
                      </div>
                    </div>
                  )}

                  {connectMethod === 'pairing' && (
                    <div className="space-y-6 py-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">WhatsApp Number</label>
                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                            className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="e.g. 628123456789"
                          />
                          <button 
                            onClick={handleGetPairingCode}
                            className="px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all border border-white/10"
                          >
                            Get Code
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Use international format without '+'</p>
                      </div>

                      {pairingCode && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center"
                        >
                          <p className="text-xs text-primary font-bold uppercase tracking-wider mb-4">Your Pairing Code</p>
                          <div className="flex justify-center gap-3">
                            {pairingCode.split('').map((char, i) => (
                              <div key={i} className="w-12 h-14 bg-black/80 border border-primary/30 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-inner">
                                {char}
                              </div>
                            ))}
                          </div>
                          <div className="mt-6 text-left bg-black/40 p-4 rounded-xl border border-white/5">
                            <p className="text-sm font-medium text-white mb-3">How to link:</p>
                            <ol className="text-sm text-gray-400 space-y-2 list-decimal pl-4">
                              <li>Open WhatsApp on your phone</li>
                              <li>Tap <strong>Menu</strong> or <strong>Settings</strong></li>
                              <li>Select <strong>Linked Devices</strong></li>
                              <li>Tap <strong>Link a Device</strong></li>
                              <li>Tap <strong>Link with phone number instead</strong></li>
                              <li>Enter the code above</li>
                            </ol>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {status === 'connected' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                    <div className="relative w-full h-full bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Device Connected</h3>
                  <p className="text-gray-400">Your WhatsApp is ready to send messages</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Group Scanner */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                Group Scanner
              </h2>
              <button 
                onClick={handleScanGroups}
                disabled={status !== 'connected' || loadingGroups}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingGroups ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Scan Groups
              </button>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {groups.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      {loadingGroups ? 'Scanning for groups...' : 'No groups found. Click scan to fetch.'}
                    </p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="font-medium text-sm text-gray-200 truncate">{group.name}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{group.id}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium bg-zinc-800 text-gray-300 px-2.5 py-1 rounded-md border border-white/5">
                          {group.members} <span className="hidden sm:inline">members</span>
                        </span>
                        <button 
                          onClick={() => {
                            setTargetGroup(group.id);
                            toast.success('Group ID copied to target!');
                          }}
                          className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-black text-xs font-bold rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Push Form & Logs */}
        <div className="lg:col-span-7 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col h-full"
          >
            {/* Tabs */}
            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 mb-8">
              <button
                onClick={() => setActiveTab('kontak')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'kontak'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Push Kontak (DM)
              </button>
              <button
                onClick={() => setActiveTab('grup')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'grup'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                Push Grup (JPM)
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {activeTab === 'kontak' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target (Group ID or Phone Number)</label>
                  <input 
                    type="text" 
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="e.g. 123456789@g.us or 628123456789"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter a Group ID to DM its members, or a phone number to message directly.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                {activeTab === 'kontak' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Count</label>
                    <input 
                      type="number" 
                      value={count}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCount(val === '' ? '' : parseInt(val));
                      }}
                      min="1"
                      max={role === 'free' ? 10 : 1000}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                    {role === 'free' && <p className="text-xs text-yellow-500 mt-2">Free plan limit: 10</p>}
                  </div>
                )}
                <div className={activeTab === 'kontak' ? '' : 'col-span-2'}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Delay (seconds)</label>
                  <input 
                    type="number" 
                    value={delay}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDelay(val === '' ? '' : parseInt(val));
                    }}
                    min="1"
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message Content</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 h-32 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                  placeholder="Type your message here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Media Attachment (Optional)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    id="media-upload"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 16 * 1024 * 1024) {
                          toast.error('File size must be less than 16MB');
                          return;
                        }
                        setMediaFile(file);
                        
                        if (file.type.startsWith('image/')) setMediaType('image');
                        else if (file.type.startsWith('video/')) setMediaType('video');
                        else setMediaType('document');

                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = (reader.result as string).split(',')[1];
                          setMediaBase64(base64String);
                        };
                        reader.readAsDataURL(file);
                      } else {
                        setMediaFile(null);
                        setMediaBase64(null);
                        setMediaType(null);
                      }
                    }}
                    className="hidden"
                  />
                  <label 
                    htmlFor="media-upload"
                    className={`flex items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                      mediaFile ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    {mediaFile ? (
                      <>
                        {mediaType === 'image' && <ImageIcon className="w-6 h-6 text-primary" />}
                        {mediaType === 'video' && <Video className="w-6 h-6 text-primary" />}
                        {mediaType === 'document' && <FileText className="w-6 h-6 text-primary" />}
                        <div className="text-left">
                          <p className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-[300px]">{mediaFile.name}</p>
                          <p className="text-xs text-primary">{(mediaFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-gray-500" />
                        <span className="text-sm text-gray-400">Click to upload image, video, or document (Max 16MB)</span>
                      </>
                    )}
                  </label>
                  {mediaFile && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setMediaFile(null);
                        setMediaBase64(null);
                        setMediaType(null);
                        const input = document.getElementById('media-upload') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <button 
                  onClick={activeTab === 'kontak' ? handleSend : handleSendJpm}
                  disabled={status !== 'connected' || sending}
                  className="flex-1 py-4 bg-primary text-black font-bold text-lg rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {activeTab === 'kontak' ? 'Start DM Broadcast' : 'Start Group Broadcast'}
                    </>
                  )}
                </button>
                {sending && (
                  <button 
                    onClick={() => {
                      stopPushRef.current = true;
                      setLogs(prev => [`[${new Date().toLocaleTimeString()}] Stopping push...`, ...prev]);
                    }}
                    className="px-8 py-4 bg-red-500 text-white font-bold text-lg rounded-xl hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center justify-center gap-3"
                  >
                    <X className="w-5 h-5" />
                    Stop
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Terminal Logs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-xl"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-white/10">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">System Logs</span>
            </div>
            <div className="p-4 font-mono text-xs h-[250px] overflow-y-auto custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600">
                  Waiting for process to start...
                </div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log, i) => (
                    <div key={i} className="text-green-400/90 break-words">
                      <span className="text-gray-500 mr-2">&gt;</span>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
