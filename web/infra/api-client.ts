import axios, { AxiosError } from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const userId = localStorage.getItem("userId");
    if (userId && config.headers) {
      config.headers["X-User-Id"] = userId;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("userId");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export { apiClient };
