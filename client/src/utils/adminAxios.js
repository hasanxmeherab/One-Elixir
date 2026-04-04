import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const adminAxios = axios.create({ baseURL: API_URL });

// Attach admin token to every request
adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, try refreshing the access token once
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  pendingQueue = [];
};

adminAxios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return adminAxios(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('adminRefreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${API_URL}/api/admins/refresh`, { refreshToken });
      localStorage.setItem('adminToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('adminRefreshToken', data.refreshToken);
      }
      processQueue(null, data.accessToken);

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return adminAxios(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Refresh failed — force logout
      localStorage.removeItem('isAdminAuthenticated');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminData');
      localStorage.removeItem('adminRole');
      window.location.href = '/admin-login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default adminAxios;
