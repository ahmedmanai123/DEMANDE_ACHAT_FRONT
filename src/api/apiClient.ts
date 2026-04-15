import axios from "axios";

const apiClient = axios.create({
	baseURL: "", // proxy Vite gère la redirection
	headers: { "Content-Type": "application/json" },
	withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
	const token = localStorage.getItem("token") ?? localStorage.getItem("accessToken") ?? sessionStorage.getItem("token");
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) window.location.href = "/login";
		return Promise.reject(error);
	},
);

export default apiClient;
