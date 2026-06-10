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

// Local test URLs (ADB reverse tunnel - phone accesses PC localhost via USB)
// export const BACKEND_URL = 'http://localhost:3000';
// export const ML_SERVICE_URL = 'http://localhost:8000';

// Wireless test URLs (Phone and PC on the same Wi-Fi)
export const BACKEND_URL = 'http://192.168.6.157:3000';
export const ML_SERVICE_URL = 'http://192.168.6.157:8000';
// export const ML_SERVICE_URL = 'https://mmca-ml-service-pbo2.onrender.com';

