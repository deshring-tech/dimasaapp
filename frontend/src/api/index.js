import axios from "axios";
import { API_BASE } from "../lib/config";

const api = axios.create({ baseURL: API_BASE });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dimasa_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("dimasa_token");
      localStorage.removeItem("dimasa_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const sendOTP = (phone) => api.post("/auth/send-otp", { phone });
export const verifyOTP = (phone, code) => api.post("/auth/verify-otp", { phone, code });

// ── Users ────────────────────────────────────────────────────────────────────
export const getMe = () => api.get("/users/me");
export const updateProfile = (data) => api.put("/users/profile", data);
export const switchMode = (intent) => api.put("/users/mode", { intent });
export const discoverProfiles = (params) => api.get("/users/discover", { params });
export const searchUsers = (q) => api.get("/users/search", { params: { q } });
export const getLocalities = (location) => api.get("/users/localities", { params: { location } });
export const getUserById = (id) => api.get(`/users/${id}`);

// ── Matches ──────────────────────────────────────────────────────────────────
export const expressInterest = (targetId) => api.post(`/matches/interest/${targetId}`);
export const getMatches = () => api.get("/matches");
export const getLikedMe = () => api.get("/matches/liked-me");

// ── Messages ─────────────────────────────────────────────────────────────────
export const getMessages = (matchId) => api.get(`/messages/${matchId}`);

// ── Feed / Posts ──────────────────────────────────────────────────────────
export const getFeed = (cursor) => api.get("/posts", { params: cursor ? { cursor } : {} });
export const getPost = (id) => api.get(`/posts/${id}`);
export const createPost = (data) => api.post("/posts", data);
export const deletePost = (id) => api.delete(`/posts/${id}`);
export const reactToPost = (id) => api.post(`/posts/${id}/react`);
export const getComments = (id) => api.get(`/posts/${id}/comments`);
export const addComment = (id, content) => api.post(`/posts/${id}/comments`, { content });
export const deleteComment = (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`);
export const getMyPosts = () => api.get("/posts/mine");

// ── Stats / Activity ──────────────────────────────────────────────────────
export const getStats = () => api.get("/stats");
export const getRecentJoined = () => api.get("/stats/recent");

// ── Subscription / Tiers ──────────────────────────────────────────────────
export const getTiers = () => api.get("/subscription/tiers");
export const getMySubscription = () => api.get("/subscription/me");
export const upgradeTier = (tier) => api.post("/subscription/upgrade", { tier });
export const downgradeTier = () => api.post("/subscription/downgrade");

// ── Places / Businesses ─────────────────────────────────────────────────
export const getPlaces = (params) => api.get("/places", { params });
export const getPlace = (id) => api.get(`/places/${id}`);
export const addPlace = (data) => api.post("/places", data);
export const updatePlace = (id, data) => api.put(`/places/${id}`, data);
export const claimPlace = (id) => api.post(`/places/${id}/claim`);
export const contactPlaceOwner = (id) => api.post(`/places/${id}/contact`);
export const followPlace = (id) => api.post(`/places/${id}/follow`);
export const getBusinessDashboard = (id) => api.get(`/places/${id}/dashboard`);
export const getDistricts = () => api.get("/places/meta/districts");
export const getMyBusinesses = () => api.get("/places/meta/mine");

export default api;
