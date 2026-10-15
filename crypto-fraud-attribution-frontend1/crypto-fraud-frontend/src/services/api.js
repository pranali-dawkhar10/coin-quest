export const fetchCaseDetails = async (caseId) => {
  return {
    id: caseId,
    suspectAddress: '0x71C...397',
    riskScore: 88,
    status: 'Active',
    chain: 'Ethereum'
  };
};

export const submitComplaint = async (data) => {
  return {
    success: true,
    caseId: `CASE-${Math.floor(Math.random() * 90000) + 10000}`
  };
};
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Auth Token if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;