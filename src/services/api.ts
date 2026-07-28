import axios, { AxiosError, AxiosInstance } from 'axios';
import { config } from '@/config/env';
import { ApiError } from '@/utils/types';

/**
 * Axios instance for the Express REST API — the sole write path for the client.
 *
 * A request interceptor attaches the Firebase ID token as a Bearer header; a
 * response interceptor unwraps the standard error envelope
 *   { success: false, error: { code, message } }
 * into a typed ApiError so screens can show friendly copy (never raw codes).
 */

type TokenProvider = () => Promise<string | null> | string | null;

let getAuthToken: TokenProvider = () => null;

/** Wire in the current-user token source (set once auth is ready). */
export function setAuthTokenProvider(provider: TokenProvider): void {
  getAuthToken = provider;
}

export const api: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (request) => {
  const token = await getAuthToken();
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

export class ApiRequestError extends Error {
  code: string;
  status?: number;

  constructor(error: ApiError, status?: number) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.status = status;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: ApiError }>) => {
    const status = error.response?.status;
    const envelope = error.response?.data?.error;
    const apiError: ApiError = envelope ?? {
      code: error.code ?? 'NETWORK_ERROR',
      message: 'We couldn’t reach Estate Ease. Please check your connection.',
    };
    return Promise.reject(new ApiRequestError(apiError, status));
  },
);
