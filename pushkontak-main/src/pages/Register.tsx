import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification, browserPopupRedirectResolver } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../lib/store';
import { AlertCircle, Mail, Lock, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setRole } = useAuthStore();

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!auth || !db) {
        throw new Error("Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.");
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      await sendEmailVerification(user);

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        displayName: user.email?.split('@')[0] || 'User',
        role: 'free',
        createdAt: serverTimestamp(),
        photoURL: null
      });

      setSuccess('Registrasi berhasil! Silakan periksa email Anda untuk verifikasi sebelum login.');
      // We don't automatically log them in or navigate to dashboard because they need to verify email first
      auth.signOut(); 
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah digunakan.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password terlalu lemah. Gunakan minimal 6 karakter.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-api-key') {
        setError('Konfigurasi Firebase tidak valid. Pastikan API Key di environment variables sudah benar.');
      } else {
        setError(err.message || 'Gagal mendaftar dengan email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      if (!auth || !db) {
        throw new Error("Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.");
      }
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          role: 'free',
          createdAt: serverTimestamp(),
          photoURL: user.photoURL
        });
        setRole('free');
      } else {
        setRole(userDoc.data().role || 'free');
      }

      setUser(user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-api-key') {
        setError('Konfigurasi Firebase tidak valid. Pastikan API Key di environment variables sudah benar.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        const isInIframe = window.self !== window.top;
        if (isInIframe) {
          setError('Registrasi dibatalkan. Browser memblokir popup di dalam iframe. Silakan klik tombol "Buka di Tab Baru" di bawah ini untuk mendaftar dengan aman.');
        } else {
          setError('Registrasi dibatalkan. Pastikan Anda tidak menutup popup sebelum pendaftaran selesai atau periksa pengaturan popup blocker di browser Anda.');
        }
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain ini belum diizinkan di Firebase Console. Silakan tambahkan domain ini ke "Authorized domains" di Firebase Console (Authentication > Settings).');
      } else if (err.code === 'auth/internal-error' && err.message.includes('cross-origin-iframe')) {
        setError('Browser Anda memblokir akses login di dalam iframe. Silakan buka aplikasi di tab baru atau izinkan third-party cookies.');
      } else {
        setError(err.message || 'Gagal mendaftar dengan Google.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 p-8 rounded-2xl shadow-xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-400">Join JhnzSuite today</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {error.includes('tab baru') && (
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 py-1.5 px-3 rounded transition-colors self-start mt-1 text-center"
              >
                Buka di Tab Baru
              </a>
            )}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleEmailRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign up with Email'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-sm text-gray-500">or</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full mt-6 bg-white/5 border border-white/10 text-white font-medium py-3 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign up with Google
        </button>

        <p className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
