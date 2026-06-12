import { jwtDecode } from 'jwt-decode';
import { getToken } from './api';

export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getCurrentUser();
}
