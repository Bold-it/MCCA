import { create } from 'zustand';
import { IoTDevice } from '../types';

interface DeviceState {
  connectedDevices: IoTDevice[];
  addDevice: (device: IoTDevice) => void;
  removeDevice: (id: string) => void;
  updateDeviceStatus: (id: string, status: IoTDevice['status']) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  connectedDevices: [],
  addDevice: (device) => set((state) => ({
    connectedDevices: [...state.connectedDevices, device],
  })),
  removeDevice: (id) => set((state) => ({
    connectedDevices: state.connectedDevices.filter((d) => d.id !== id),
  })),
  updateDeviceStatus: (id, status) => set((state) => ({
    connectedDevices: state.connectedDevices.map((d) => 
      d.id === id ? { ...d, status, lastSeen: new Date().toISOString() } : d
    ),
  })),
}));
