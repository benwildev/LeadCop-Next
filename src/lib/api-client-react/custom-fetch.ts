import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from "axios";

/**
 * Global base URL configuration
 */
let _baseUrl = typeof window !== "undefined" ? window.location.origin : "";

/**
 * Configure the global base URL
 */
export function setBaseUrl(url: string) {
  _baseUrl = url;
  axiosSecure.defaults.baseURL = url;
}

/**
 * axiosSecure instance with default configurations
 */
export const axiosSecure = axios.create({
  baseURL: _baseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Add interceptors for request/response handling
 */
axiosSecure.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosSecure.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // We suppress 401 errors in the console because they are expected for guest users on public pages
    // when checking for an active session.
    return Promise.reject(error);
  }
);

/**
 * Custom fetch implementation that Orval uses.
 * It now uses axiosSecure internally and maps fetch-like options to axios.
 */
export async function customFetch<T = unknown>(
  url: string,
  options: any = {}
): Promise<T> {
  const { method, params, data, body, headers, responseType, ...rest } = options;

  // Map fetch-like 'body' to axios 'data'
  let axiosData = data || body;
  
  // If body is a string (like from JSON.stringify), parse it back if it looks like JSON
  // because axios will re-serialize it.
  if (typeof axiosData === "string") {
    try {
      axiosData = JSON.parse(axiosData);
    } catch (e) {
      // Keep as string if not valid JSON
    }
  }

  const config: AxiosRequestConfig = {
    url,
    method: method || "GET",
    params,
    data: axiosData,
    headers,
    responseType: responseType === "blob" ? "blob" : (responseType === "text" ? "text" : "json"),
    ...rest,
  };

  try {
    const response: AxiosResponse<T> = await axiosSecure(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Re-throw to let TanStack Query handle it
      throw error;
    }
    throw error;
  }
}

// Compatibility exports
export type ErrorType<T> = AxiosError<T>;
export type BodyType<T> = T;
export type AuthTokenGetter = () => string | Promise<string>;
export function setAuthTokenGetter(getter: AuthTokenGetter) {
  console.warn("setAuthTokenGetter is deprecated. Using cookie-based auth.");
}
