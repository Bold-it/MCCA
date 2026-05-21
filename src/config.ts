/**
 * MMCA App Presentation Network Settings
 * 
 * When running the app on a physical phone:
 * 1. Connect both the phone and PC to the same Wi-Fi.
 * 2. Find your PC's IP address (run 'ipconfig' in command prompt).
 * 3. Replace '10.0.2.2' below with your PC's actual IP (e.g., '192.168.1.15').
 * 
 * Default: '10.0.2.2' works for the local Android Emulator.
 */

// Production Render URLs
export const BACKEND_URL = 'https://mmca-backend-pbo2.onrender.com';
export const ML_SERVICE_URL = 'https://mmca-ml-service-pbo2.onrender.com';

// Local development URLs (commented out)
// const HOST_IP = '10.0.2.2'; 
// export const BACKEND_URL = `http://${HOST_IP}:3000`;
// export const ML_SERVICE_URL = `http://${HOST_IP}:8000`;
