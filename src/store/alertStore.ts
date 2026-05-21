import { create } from 'zustand';
import { MMCAAlert } from '../types';

interface AlertState {
  alerts: MMCAAlert[];
  unreadCount: number;
  addAlert: (alert: MMCAAlert) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAlerts: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts],
    unreadCount: state.unreadCount + 1,
  })),
  markAsRead: (id) => set((state) => ({
    alerts: state.alerts.map((a) => a.id === id ? { ...a, read: true } : a),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
  markAllRead: () => set((state) => ({
    alerts: state.alerts.map((a) => ({ ...a, read: true })),
    unreadCount: 0,
  })),
  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
}));
