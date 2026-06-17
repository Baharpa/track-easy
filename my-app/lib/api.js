export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function removeToken() {
  localStorage.removeItem('token');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${API_URL}${cleanPath}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error ? `${data.message || 'Something went wrong'} ${data.error}` : data.message;
    throw new Error(detail || 'Something went wrong');
  }
  return data;
}

export async function uploadImage(file) {
  const body = new FormData();
  body.append('image', file);
  return apiFetch('/api/uploads/image', { method: 'POST', body });
}

export const fetcher = (path) => apiFetch(path);
