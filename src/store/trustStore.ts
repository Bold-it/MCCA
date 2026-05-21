import { create } from 'zustand';

interface TrustState {
  trustScore: number;
  scoreHistory: number[];
  lastVerified: string | null;
  activeMethod: string | null;
  isVerifying: boolean;
  updateTrustScore: (score: number) => void;
  setVerifying: (isVerifying: boolean) => void;
  setActiveMethod: (method: string) => void;
}

export const useTrustStore = create<TrustState>((set) => ({
  trustScore: 100, // Start at full trust
  scoreHistory: [100, 100, 100, 100, 100, 100, 100, 100],
  lastVerified: null,
  activeMethod: null,
  isVerifying: false,
  updateTrustScore: (score) => set((state) => {
    const nextHistory = [...state.scoreHistory, score].slice(-10);
    return {
      trustScore: score,
      scoreHistory: nextHistory,
      lastVerified: new Date().toISOString()
    };
  }),
  setVerifying: (isVerifying) => set({ isVerifying }),
  setActiveMethod: (method) => set({ activeMethod: method }),
}));
