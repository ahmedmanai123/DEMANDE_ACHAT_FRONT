// ============================================================
// services/besoin.service.ts
// Couche service : appels API vers BesoinController.cs
// Base URL : /api/besoin  (même que [Route("api/besoin")])
// ============================================================

import {
	AFFECTATION_DEMANDEDto,
	DA_BESOIN_AACHETERDto,
	DA_BESOIN_ARTICLEDto,
	DA_BESOINDto,
	DA_TRACABILITEBESOINARTICLEDto,
	DA_VALIDATION,
	GridResponse,
	Type_Validation,
	TypeSage,
	Validateur_BesoinVM,
} from "@/types/besoin";
import axios, { AxiosResponse } from "axios";

// ── Config Axios (à placer dans api/axiosInstance.ts) ────────
const api = axios.create({
	baseURL: "/api",
	headers: { "Content-Type": "application/json" },
});

// Intercepteur : ajoute le JWT automatiquement
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

// Intercepteur : gestion globale des erreurs
api.interceptors.response.use(
	(res) => res,
	(err) => {
		const msg = err.response?.data?.message ?? err.response?.data ?? "Erreur serveur inconnue";
		return Promise.reject(new Error(msg));
	},
);

// ─────────────────────────────────────────────────────────────
// DEMANDES BESOIN — miroir de GetBesoin, AddOrUpdateBesoin…
// ─────────────────────────────────────────────────────────────

export const besoinService = {
	// GET /api/besoin  (liste paginée)
	getAll: (filter: Partial<DA_BESOINDto>): Promise<GridResponse<DA_BESOINDto>> =>
		api.get("/besoin", { params: filter }).then((r) => r.data),

	// GET /api/besoin/{id}
	getById: (id: number): Promise<DA_BESOINDto> => api.get(`/besoin/${id}`).then((r) => r.data),

	// POST /api/besoin/Besoin  (multipart/form-data pour les fichiers)
	save: (besoin: Partial<DA_BESOINDto>, files?: File[]): Promise<{ b_No: number }> => {
		const fd = new FormData();
		// Sérialiser tous les champs du besoin
		Object.entries(besoin).forEach(([k, v]) => {
			if (v != null) fd.append(k, String(v));
		});
		files?.forEach((f) => fd.append("files", f));
		return api
			.post("/besoin/Besoin", fd, {
				headers: { "Content-Type": "multipart/form-data" },
			})
			.then((r) => r.data);
	},

	// POST /api/besoin/{id}/confirmer
	confirmer: (id: number): Promise<{ b_No: number; b_Etat_Besoin: number }> =>
		api.post(`/besoin/${id}/confirmer`).then((r) => r.data),

	// GET /api/besoin/last-numero
	getLastNumero: (): Promise<{ numero: string }> => api.get("/besoin/last-numero").then((r) => r.data),

	// GET /api/besoin/exist-type-besoin-user
	existTypeBesoinUser: (): Promise<{ exist_Type_Besoin: boolean }> =>
		api.get("/besoin/exist-type-besoin-user").then((r) => r.data),

	// POST /api/besoin/export-excel  → téléchargement blob
	exportExcel: async (filter: Partial<DA_BESOINDto>): Promise<void> => {
		const response = await api.post("/besoin/export-excel", filter, {
			responseType: "blob",
		});
		const fileName = response.headers["file-name"] ?? "Liste_Demandes_Besoin.xlsx";
		const url = URL.createObjectURL(response.data);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(url);
	},
};

// ─────────────────────────────────────────────────────────────
// ARTICLES BESOIN
// ─────────────────────────────────────────────────────────────

export const articleBesoinService = {
	// GET /api/besoin/articles
	getAll: (filter: Partial<DA_BESOIN_ARTICLEDto>): Promise<GridResponse<DA_BESOIN_ARTICLEDto>> =>
		api.get("/besoin/articles", { params: filter }).then((r) => r.data),

	// GET /api/besoin/{id}/articles
	getByBesoinId: (besoinId: number) => api.get(`/besoin/${besoinId}/articles`).then((r) => r.data),

	// POST /api/besoin/articles
	save: (article: Partial<DA_BESOIN_ARTICLEDto>) => api.post("/besoin/articles", article).then((r) => r.data),

	// DELETE /api/besoin/articles/{bA_No}
	delete: (bA_No: number) => api.delete(`/besoin/articles/${bA_No}`).then((r) => r.data),

	// GET /api/besoin/articles/tracabilite
	getTracabilite: (
		filter: Partial<DA_TRACABILITEBESOINARTICLEDto>,
	): Promise<GridResponse<DA_TRACABILITEBESOINARTICLEDto>> =>
		api.get("/besoin/articles/tracabilite", { params: filter }).then((r) => r.data),

	// GET /api/besoin/articles/{bA_No}/fournisseur-principal
	getFournisseurPrincipal: (bA_No: number): Promise<{ cT_Num: string }> =>
		api.get(`/besoin/articles/${bA_No}/fournisseur-principal`).then((r) => r.data),
};

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

export const validationService = {
	// GET /api/besoin/circuit-validation
	getCircuit: (
		bT_Id: number,
		idBesoin: number,
		idDemandeur: string,
		v_Type: Type_Validation,
	): Promise<Validateur_BesoinVM[]> =>
		api
			.get("/besoin/circuit-validation", {
				params: { bT_Id, idBesoin, idDemandeur, v_Type },
			})
			.then((r) => r.data),

	// GET /api/besoin/{b_No}/statut-user
	getStatutUser: (b_No: number, type: Type_Validation): Promise<number> =>
		api.get(`/besoin/${b_No}/statut-user`, { params: { type } }).then((r) => r.data),

	// GET /api/besoin/{id}/validation
	getValidationView: (id: number, b_No: number) =>
		api.get(`/besoin/${id}/validation`, { params: { b_No } }).then((r) => r.data),

	// POST /api/besoin/valider-etape
	validerEtape: (validation: DA_VALIDATION) => api.post("/besoin/valider-etape", validation).then((r) => r.data),

	// GET /api/besoin/historique-validation
	getHistorique: (
		filter: Partial<Validateur_BesoinVM>,
		v_Type: Type_Validation,
	): Promise<GridResponse<Validateur_BesoinVM>> =>
		api.get("/besoin/historique-validation", { params: { ...filter, v_Type } }).then((r) => r.data),

	// GET /api/besoin/multi-acheteurs-validation
	getMultiAcheteurs: (
		filter: Partial<Validateur_BesoinVM>,
		v_Type: Type_Validation,
	): Promise<GridResponse<Validateur_BesoinVM>> =>
		api
			.get("/besoin/multi-acheteurs-validation", {
				params: { ...filter, v_Type },
			})
			.then((r) => r.data),

	// POST /api/besoin/rejeter-article
	rejeterArticle: (v_Id: number, bA_No: number, motif: string, mR_No: number) =>
		api
			.post("/besoin/rejeter-article", null, {
				params: { v_Id, bA_No, motif, mR_No },
			})
			.then((r) => r.data),

	// POST /api/besoin/{b_No}/affectation-acheteur
	affectationAcheteur: (b_No: number, typeValidation = false) =>
		api
			.post(`/besoin/${b_No}/affectation-acheteur`, null, {
				params: { typeValidation },
			})
			.then((r) => r.data),
};

// ─────────────────────────────────────────────────────────────
// GESTION DES DEMANDES (Acheteur)
// ─────────────────────────────────────────────────────────────

export const gestionDemandeService = {
	// GET /api/besoin/demandes-aacheter
	getDemandesAAcheter: (filter: Partial<DA_BESOIN_AACHETERDto>): Promise<GridResponse<DA_BESOIN_AACHETERDto>> =>
		api.get("/besoin/demandes-aacheter", { params: filter }).then((r) => r.data),

	// GET /api/besoin/demandes-aacheter/{id}
	getDetailsDemande: (id: number) => api.get(`/besoin/demandes-aacheter/${id}`).then((r) => r.data),

	// GET /api/besoin/affectation-details
	getAffectationDetails: (filter: Partial<AFFECTATION_DEMANDEDto>): Promise<GridResponse<AFFECTATION_DEMANDEDto>> =>
		api.get("/besoin/affectation-details", { params: filter }).then((r) => r.data),

	// POST /api/besoin/affectation
	addAffectation: (affectation: Partial<AFFECTATION_DEMANDEDto>) =>
		api.post("/besoin/affectation", affectation).then((r) => r.data),

	// DELETE /api/besoin/affectation/{aD_No}
	deleteAffectation: (aD_No: number, b_No: number) =>
		api.delete(`/besoin/affectation/${aD_No}`, { params: { b_No } }).then((r) => r.data),

	// POST /api/besoin/{b_No}/generer-affectation-fournisseur
	genererAffectationFournisseur: (b_No: number, tP_No: number) =>
		api
			.post(`/besoin/${b_No}/generer-affectation-fournisseur`, null, {
				params: { tP_No },
			})
			.then((r) => r.data),

	// POST /api/besoin/{b_No}/generer-document
	genererDocument: (b_No: number, tP_No: TypeSage, type: Type_Validation) =>
		api
			.post(`/besoin/${b_No}/generer-document`, null, {
				params: { tP_No, type },
			})
			.then((r) => r.data),

	// GET /api/besoin/{b_No}/tableaux-comparatifs
	getTableauxComparatifs: (b_No: number) => api.get(`/besoin/${b_No}/tableaux-comparatifs`).then((r) => r.data),

	exportExcel: async (filter: Partial<DA_BESOIN_AACHETERDto>): Promise<void> => {
		const response = await api.post("/besoin/demandes-aacheter/export-excel", filter, {
			responseType: "blob",
		});
		const fileName = response.headers["file-name"] ?? "Demandes_AAcheter.xlsx";
		const url = URL.createObjectURL(response.data);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(url);
	},
};

// ─────────────────────────────────────────────────────────────
// DONNÉES DE RÉFÉRENCE
// ─────────────────────────────────────────────────────────────

export const referenceService = {
	getDepotsAutoriser: (bT_Id: number, b_IdDemandeur: string) =>
		api.get("/besoin/depots-autoriser", { params: { bT_Id, b_IdDemandeur } }).then((r) => r.data),

	getAffairesAutoriser: (bT_Id: number) =>
		api.get("/besoin/affaires-autoriser", { params: { bT_Id } }).then((r) => r.data),

	getArticleDivers: (bT_Id: number) => api.get("/besoin/article-divers", { params: { bT_Id } }).then((r) => r.data),

	getInfoTypeBesoin: (bT_Id: number) => api.get("/besoin/info-type-besoin", { params: { bT_Id } }).then((r) => r.data),

	getChampsLibresBesoin: (bT_Id: number, b_No: number) =>
		api.get("/besoin/champs-libres/besoin", { params: { bT_Id, b_No } }).then((r) => r.data),
};
