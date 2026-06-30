import { getLocalDayContext } from './localDate';

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
  let requestPath = path;
  let requestOptions = options;

  if (typeof window !== 'undefined' && /^\/api\/tracker\/(today|week)(\?|$)/.test(requestPath)) {
    const [pathname, query = ''] = requestPath.split('?');
    const params = new URLSearchParams(query);
    const context = getLocalDayContext();
    params.set('timezoneOffset', String(context.timezoneOffset));
    if (context.timezone) params.set('timezone', context.timezone);
    if (pathname.endsWith('/today')) {
      params.set('date', context.date);
      params.set('startDate', context.startDate);
      params.set('endDate', context.endDate);
    }
    requestPath = `${pathname}?${params.toString()}`;
  }

  if (typeof window !== 'undefined' && requestPath === '/api/tracker/log' && options.method === 'POST' && typeof options.body === 'string') {
    const context = getLocalDayContext();
    const body = JSON.parse(options.body);
    requestOptions = {
      ...options,
      body: JSON.stringify({
        ...body,
        date: body.date || context.date,
        timezoneOffset: context.timezoneOffset,
        timezone: context.timezone
      })
    };
  }

  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(requestOptions.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const cleanPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
  const res = await fetch(`${API_URL}${cleanPath}`, { ...requestOptions, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error ? `${data.message || 'Something went wrong'} ${data.error}` : data.message;
    throw new Error(detail || 'Something went wrong');
  }
  return data;
}

export async function uploadImage(file, type) {
  const body = new FormData();
  if (type === 'ingredient' || type === 'meal') body.append('type', type);
  body.append('image', file);
  return apiFetch('/api/uploads/image', { method: 'POST', body });
}

export async function scanNutritionLabel(file) {
  const body = new FormData();
  body.append('image', file);
  return apiFetch('/api/uploads/nutrition-scan', { method: 'POST', body });
}

export const fetcher = (path) => apiFetch(path);
