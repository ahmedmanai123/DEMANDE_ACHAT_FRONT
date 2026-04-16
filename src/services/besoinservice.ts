// src/services/besoinService.ts
import axios from "axios";

const API_URL = "/api/besoin";

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

// ====================== BESOINS ======================

export const getBesoins = async (params = {}) => {
	const res = await axios.get(API_URL, { params, headers: authHeaders() });
	return res.data;
};

export const getBesoinById = async (id: number | string) => {
	const res = await axios.get(`${API_URL}/${id}`, { headers: authHeaders() });
	return res.data;
};

export const saveBesoin = async (besoin: FormData | object, files?: File[]) => {
	const formData = new FormData();

	if (besoin instanceof FormData) {
		const res = await axios.post(`${API_URL}/Besoin`, besoin, {
			headers: authHeaders(),
		});
		return res.data;
	}

	Object.entries(besoin).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, String(value));
		}
	});

	if (files) {
		files.forEach((file) => formData.append("files", file));
	}

	const res = await axios.post(`${API_URL}/Besoin`, formData, {
		headers: authHeaders(),
	});
	return res.data;
};

export const confirmerBesoin = async (id: number) => {
	const res = await axios.post(`${API_URL}/${id}/confirmer`, {}, { headers: authHeaders() });
	return res.data;
};

export const deleteBesoin = async (id: number | string) => {
	await axios.delete(`${API_URL}/${id}`, { headers: authHeaders() });
};

export const getLastNumero = async () => {
	const res = await axios.get(`${API_URL}/last-numero`, { headers: authHeaders() });
	return res.data;
};

export const existTypeBesoinUser = async () => {
	const res = await axios.get(`${API_URL}/exist-type-besoin-user`, { headers: authHeaders() });
	return res.data;
};

// ====================== ARTICLES BESOIN ======================

export const getArticlesBesoin = async (params = {}) => {
	const res = await axios.get(`${API_URL}/articles`, { params, headers: authHeaders() });
	return res.data;
};

export const getBesoinArticles = async (id: number) => {
	const res = await axios.get(`${API_URL}/${id}/articles`, { headers: authHeaders() });
	return res.data;
};

export const saveArticleBesoin = async (article: object) => {
	const res = await axios.post(`${API_URL}/articles`, article, { headers: authHeaders() });
	return res.data;
};

export const saveArticlesBesoinBulk = async (besoin: object, list: object[]) => {
	const res = await axios.post(`${API_URL}/articles/bulk`, { BESOIN: besoin, List: list }, { headers: authHeaders() });
	return res.data;
};

export const deleteArticleBesoin = async (bA_No: number) => {
	await axios.delete(`${API_URL}/articles/${bA_No}`, { headers: authHeaders() });
};

// ====================== DONNÉES DE RÉFÉRENCE ======================

export const getDepotsAutoriser = async (bT_Id: number, b_IdDemandeur: string) => {
	const res = await axios.get(`${API_URL}/depots-autoriser`, {
		params: { bT_Id, b_IdDemandeur },
		headers: authHeaders(),
	});
	return res.data;
};

export const getAffairesAutoriser = async (bT_Id: number) => {
	const res = await axios.get(`${API_URL}/affaires-autoriser`, {
		params: { bT_Id },
		headers: authHeaders(),
	});
	return res.data;
};

export const getInfoTypeBesoin = async (bT_Id: number) => {
	const res = await axios.get(`${API_URL}/info-type-besoin`, {
		params: { bT_Id },
		headers: authHeaders(),
	});
	return res.data;
};

export const getArticleDivers = async (bT_Id: number) => {
	const res = await axios.get(`${API_URL}/article-divers`, {
		params: { bT_Id },
		headers: authHeaders(),
	});
	return res.data;
};

// ====================== VALIDATION ======================

export const getCircuitValidation = async (bT_Id: number, idBesoin: number, idDemandeur: string, v_Type: number) => {
	const res = await axios.get(`${API_URL}/circuit-validation`, {
		params: { bT_Id, idBesoin, idDemandeur, v_Type },
		headers: authHeaders(),
	});
	return res.data;
};

export const validerEtape = async (validation: object) => {
	const res = await axios.post(`${API_URL}/valider-etape`, validation, { headers: authHeaders() });
	return res.data;
};

export const getValidationById = async (id: number, b_No: number) => {
	const res = await axios.get(`${API_URL}/${id}/validation`, {
		params: { b_No },
		headers: authHeaders(),
	});
	return res.data;
};

export const getStatutUserBesoin = async (b_No: number, type: number) => {
	const res = await axios.get(`${API_URL}/${b_No}/statut-user`, {
		params: { type },
		headers: authHeaders(),
	});
	return res.data;
};

// ====================== EXPORT EXCEL ======================

export const exportBesoinExcel = async (filter: object) => {
	const res = await axios.post(`${API_URL}/export-excel`, filter, {
		headers: authHeaders(),
		responseType: "blob",
	});
	return res;
};
