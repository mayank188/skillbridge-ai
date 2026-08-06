import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://skillbridge-backend-05fn.onrender.com/api";

console.log("API URL:", baseURL);

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;