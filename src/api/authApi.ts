import axios from 'axios';

// Change this to your actual backend URL
const API_URL = 'http://localhost:3000/api'; 

export const authApi = {
  login: async (data: { method: string; identifier: string; credentials: any }) => {
    // In a real app, this would be:
    // return axios.post(`${API_URL}/auth/login`, data);
    
    // Simulating API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { success: true, token: 'mock-jwt-token', user: { id: '1', name: 'John Doe', email: 'john@example.com', enrolledMethods: ['FACE', 'FINGERPRINT', 'PIN'] } } });
      }, 1000);
    });
  },
  
  enrol: async (data: any) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { success: true } });
      }, 1500);
    });
  }
};
