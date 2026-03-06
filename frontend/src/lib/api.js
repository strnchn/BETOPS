import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("betops_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
