// src/services/articleService.ts
import axios from "axios";

const API_URL = "/api/article";

const getAccessToken = (): string => {
  try {
    const raw = localStorage.getItem("userStore");
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    return parsed?.state?.userToken?.accessToken || "";
  } catch (error) {
    console.warn("Impossible de lire le token depuis localStorage", error);
    return "";
  }
};

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ====================== SERVICES ======================

export const getArticles = async (params = {}) => {
  const res = await axios.get(API_URL, { 
    params, 
    headers: authHeaders() 
  });
  return res.data;
};

export const getArticleRefFourniss = async (params = {}) => {
  const res = await axios.get(`${API_URL}/ref-fourniss`, { 
    params, 
    headers: authHeaders() 
  });
  return res.data;
};

export const getArticleById = async (id: number | string) => {
  const res = await axios.get(`${API_URL}/${id}`, { 
    headers: authHeaders() 
  });
  return res.data;
};

export const deleteArticle = async (id: number | string) => {
  await axios.delete(`${API_URL}/${id}`, { 
    headers: authHeaders() 
  });
};

export const saveArticle = async (article = {}, file?: File) => {
  const formData = new FormData();

  Object.keys(article).forEach((key) => {
    const value = (article as any)[key];
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  if (file) {
    formData.append("photo", file);
  }

  const res = await axios.post(API_URL, formData, { 
    headers: authHeaders() 
  });
  return res.data;
};