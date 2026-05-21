import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  sessionToken: string | null;
  sessionExpiry: string | null;
  login: (user: User, token: string, expiry: string) => void;
  logout: () => void;
  updateEnrolledMethods: (methods: string[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      sessionToken: null,
      sessionExpiry: null,
      login: (user, token, expiry) => set({ 
        isAuthenticated: true, 
        user, 
        sessionToken: token, 
        sessionExpiry: expiry 
      }),
      logout: () => set({ 
        isAuthenticated: false, 
        user: null, 
        sessionToken: null, 
        sessionExpiry: null 
      }),
      updateEnrolledMethods: (methods) => set((state) => ({
        user: state.user ? { ...state.user, enrolledMethods: methods } : null
      })),
    }),
    {
      name: 'mmca-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
