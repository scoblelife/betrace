/**
 * Authentication Operations - Main thread fallback implementations
 *
 * These operations run when Web Workers are not available,
 * providing the same functionality as the worker implementations.
 */

import { getDemoSession } from '../auth/workos';
import { SecurityValidator } from '../security/validation';

/**
 * Process authentication operations on main thread.
 */
export async function processAuthOperation(type: string, payload?: any): Promise<any> {
  switch (type) {
    case 'INIT':
      return initializeAuth();

    case 'LOGIN':
      return login(payload);

    case 'LOGOUT':
      return logout();

    case 'REFRESH_TOKEN':
      return refreshToken();

    case 'VALIDATE_SESSION':
      return validateSession();

    default:
      throw new Error(`Unknown auth operation: ${type}`);
  }
}

/**
 * Initialize authentication system.
 */
async function initializeAuth(): Promise<any> {
  try {
    const token = localStorage.getItem('betrace_auth_token');
    if (token) {
      const isValid = await validateToken(token);
      if (isValid) {
        const user = await getUserFromToken(token);
        return { user };
      } else {
        localStorage.removeItem('betrace_auth_token');
      }
    }
    return { user: null };
  } catch (error) {
    console.error('Auth initialization error:', error);
    throw error;
  }
}

/**
 * Perform user login.
 */
async function login(credentials: { email: string; password: string }): Promise<any> {
  try {
    const emailValidation = SecurityValidator.validateEmail(credentials.email);
    const passwordValidation = SecurityValidator.validate(credentials.password, { required: true, minLength: 8, maxLength: 128 });

    if (!emailValidation.isValid) {
      throw new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
    }
    if (!passwordValidation.isValid) {
      throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`);
    }

    // Use demo session
    const result = getDemoSession();
    const mockToken = generateMockToken();
    localStorage.setItem('betrace_auth_token', mockToken);

    return { user: result.user };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Perform user logout.
 */
async function logout(): Promise<any> {
  try {
    localStorage.removeItem('betrace_auth_token');
    localStorage.removeItem('betrace_user_data');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}

/**
 * Refresh authentication token.
 */
async function refreshToken(): Promise<any> {
  try {
    const token = localStorage.getItem('betrace_auth_token');
    if (!token) {
      throw new Error('No token to refresh');
    }

    const isValid = await validateToken(token);
    if (!isValid) {
      throw new Error('Token validation failed');
    }
    return { token };
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

/**
 * Validate current session.
 */
async function validateSession(): Promise<boolean> {
  try {
    const token = localStorage.getItem('betrace_auth_token');
    if (!token) return false;
    return await validateToken(token);
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

async function validateToken(token: string): Promise<boolean> {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

async function getUserFromToken(_token: string): Promise<any> {
  const { user } = getDemoSession();
  return user;
}

function generateMockToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'demo-user',
    email: 'demo@betrace.example',
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000),
  }));
  return `${header}.${payload}.mock-signature`;
}
