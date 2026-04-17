import axios from "axios";

const apiClient = axios.create({
	baseURL: "", // proxy Vite gère la redirection
	headers: { "Content-Type": "application/json" },
	withCredentials: false,
});

const getTokenFromPersistedStore = () => {
	try {
		const raw = localStorage.getItem("userStore");
		if (!raw) return undefined;
		const parsed = JSON.parse(raw) as { state?: { userToken?: { accessToken?: string } } };
		return parsed?.state?.userToken?.accessToken;
	} catch {
		return undefined;
	}
};

apiClient.interceptors.request.use((config) => {
	const token =
		localStorage.getItem("token") ??
		localStorage.getItem("accessToken") ??
		getTokenFromPersistedStore() ??
		sessionStorage.getItem("token");
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) window.location.href = "/auth/login";
		return Promise.reject(error);
	},
);

export default apiClient;
