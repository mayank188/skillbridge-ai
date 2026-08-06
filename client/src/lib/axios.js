import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_BASE_URL;
const normalizedBaseURL = rawBaseURL
  ? rawBaseURL.trim().replace(/\/+$|^\s+|\s+$/g, '')
  : '/api';
const baseURL = normalizedBaseURL.startsWith('/') ? normalizedBaseURL : `/${normalizedBaseURL}`;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only force a logout when an AUTHENTICATED endpoint returns 401 (e.g. an
    // invalid/expired token). Do NOT log the user out on the login/register
    // endpoints themselves, since those can legitimately return 401 when the
    // credentials are wrong.
    const status = err.response?.status;
    const url = err.config?.url || '';
    const isAuthEndpoint = /\/auth\/(login|register)$/.test(url);

    if (status === 401 && !isAuthEndpoint) {
      const hadUser = localStorage.getItem('user') || localStorage.getItem('token');
      if (hadUser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(err);
  }
);

export default api;
