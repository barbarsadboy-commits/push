import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  role: 'free' | 'vip' | 'reseller' | 'dev' | 'owner' | null;
  highest_role: 'free' | 'vip' | 'reseller' | 'dev' | 'owner' | null;
  status_active: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: 'free' | 'vip' | 'reseller' | 'dev' | 'owner' | null) => void;
  setHighestRole: (role: 'free' | 'vip' | 'reseller' | 'dev' | 'owner' | null) => void;
  setStatusActive: (status: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  highest_role: null,
  status_active: true,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setHighestRole: (highest_role) => set({ highest_role }),
  setStatusActive: (status_active) => set({ status_active }),
  setLoading: (isLoading) => set({ isLoading }),
}));
