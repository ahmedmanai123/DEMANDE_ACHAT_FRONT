import apiClient from "@/api/apiClient";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import type {
	AFFECTATION_DEMANDEDto,
	DA_BESOIN_AACHETERDto,
	DA_BESOIN_ARTICLEDto,
	DA_BESOINDto,
	DA_TRACABILITEBESOINARTICLEDto,
	DA_VALIDATION,
	GridResponse,
	IAffaire,
	IBesoinType,
	IDepot,
	Type_Validation,
	TypeSage,
	Validateur_BesoinVM,
} from "@/types/besoin";

const BASES = ["/api/besoin", "/api/Besoin", "/Besoin"];

const toRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown): string => {
	const axiosError = error as AxiosError;
	if (typeof axiosError.response?.data === "string" && axiosError.response.data.trim()) return axiosError.response.data;

	const payload = toRecord(axiosError.response?.data);
	const message = payload.message ?? payload.Message;
	if (typeof message === "string" && message.trim()) return message;
	return axiosError.message || "Erreur serveur.";
};

const shouldTryNext = (error: unknown) => {
	const axiosError = error as AxiosError;
	return axiosError.response?.status === 404 || axiosError.response?.status === 405;
};

const normalizePath = (path = "") => path.replace(/^\/+/, "");

const candidateUrls = (pathOrUrl: string) => {
	if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return [pathOrUrl];
	if (pathOrUrl.startsWith("/api/") || pathOrUrl.startsWith("/Besoin")) return [pathOrUrl];

	const normalized = normalizePath(pathOrUrl);
	return BASES.map((base) => (normalized ? `${base}/${normalized}` : base));
};

async function getWithFallback<T>(
	pathOrUrl: string,
	params?: Record<string, unknown>,
	config?: AxiosRequestConfig,
): Promise<T> {
	let lastError: unknown;
	for (const url of candidateUrls(pathOrUrl)) {
		try {
			const response = await apiClient.get<T>(url, { ...(config || {}), params });
			return response.data as T;
		} catch (error) {
			lastError = error;
			if (shouldTryNext(error)) continue;
			throw new Error(getErrorMessage(error));
		}
	}
	throw new Error(getErrorMessage(lastError));
}

async function postWithFallback<T>(pathOrUrl: string, payload?: unknown, config?: AxiosRequestConfig): Promise<T> {
	let lastError: unknown;
	for (const url of candidateUrls(pathOrUrl)) {
		try {
			const response = await apiClient.post<T>(url, payload, config);
			return response.data as T;
		} catch (error) {
			lastError = error;
			if (shouldTryNext(error)) continue;
			throw new Error(getErrorMessage(error));
		}
	}
	throw new Error(getErrorMessage(lastError));
}

async function postBlobWithFallback(
	pathOrUrl: string,
	payload?: unknown,
	config?: AxiosRequestConfig,
): Promise<AxiosResponse<Blob>> {
	let lastError: unknown;
	for (const url of candidateUrls(pathOrUrl)) {
		try {
			return await apiClient.post<Blob>(url, payload, {
				...(config || {}),
				responseType: "blob",
			});
		} catch (error) {
			lastError = error;
			if (shouldTryNext(error)) continue;
			throw new Error(getErrorMessage(error));
		}
	}
	throw new Error(getErrorMessage(lastError));
}

async function deleteWithFallback<T>(pathOrUrl: string, config?: AxiosRequestConfig): Promise<T> {
	let lastError: unknown;
	for (const url of candidateUrls(pathOrUrl)) {
		try {
			const response = await apiClient.delete<T>(url, config);
			return response.data as T;
		} catch (error) {
			lastError = error;
			if (shouldTryNext(error)) continue;
			throw new Error(getErrorMessage(error));
		}
	}
	throw new Error(getErrorMessage(lastError));
}

const normalizeGrid = <T>(raw: unknown): GridResponse<T> => {
	if (Array.isArray(raw)) return { data: raw as T[], itemsCount: raw.length };

	const root = toRecord(raw);
	const topData = root.data;
	if (Array.isArray(topData)) {
		const count = typeof root.itemsCount === "number" ? root.itemsCount : topData.length;
		return { data: topData as T[], itemsCount: count };
	}

	const nested = toRecord(topData);
	if (Array.isArray(nested.data)) {
		const count = typeof nested.itemsCount === "number" ? nested.itemsCount : nested.data.length;
		return { data: nested.data as T[], itemsCount: count };
	}

	return { data: [], itemsCount: 0 };
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	URL.revokeObjectURL(url);
};

const toFormData = (payload: Record<string, unknown>, files?: File[]) => {
	const form = new FormData();
	Object.entries(payload).forEach(([key, value]) => {
		if (value === undefined || value === null) return;
		if (value instanceof Date) {
			form.append(key, value.toISOString());
			return;
		}
		form.append(key, String(value));
	});
	files?.forEach((file) => form.append("files", file));
	return form;
};

const getArrayFromPayload = <T>(raw: unknown, ...keys: string[]): T[] => {
	if (Array.isArray(raw)) return raw as T[];

	const record = toRecord(raw);
	for (const key of keys) {
		const value = record[key];
		if (Array.isArray(value)) return value as T[];
	}

	if (Array.isArray(record.data)) return record.data as T[];
	return [];
};

export const getBesoins = async (params: Partial<DA_BESOINDto> = {}): Promise<GridResponse<DA_BESOINDto>> => {
	const response = await getWithFallback<unknown>("", params as Record<string, unknown>);
	return normalizeGrid<DA_BESOINDto>(response);
};

export const getBesoinById = async (id: number | string): Promise<DA_BESOINDto> =>
	getWithFallback<DA_BESOINDto>(`${id}`);

export const getTypesBesoinUsers = async (): Promise<IBesoinType[]> => {
	const customUrls = [
		"/api/besoin-type/users",
		"/api/besoin-type/utilisateurs",
		"/api/besoin-type",
		"/BesoinType/GetTypesBesoin_Users",
		"/Besoin/GetTypesBesoin_Users",
	];

	let lastError: unknown;
	for (const url of customUrls) {
		try {
			const response = await apiClient.get<unknown>(url);
			const rows = getArrayFromPayload<IBesoinType>(response.data, "typesBesoin", "result", "items");
			if (rows.length > 0) return rows;
		} catch (error) {
			lastError = error;
			if (shouldTryNext(error)) continue;
		}
	}

	if (lastError) {
		console.warn(
			"Aucun endpoint de types besoin trouve, fallback sur saisie manuelle du type.",
			getErrorMessage(lastError),
		);
	}
	return [];
};

export const saveBesoin = async (
	besoin: FormData | Record<string, unknown>,
	files?: File[],
): Promise<{ b_No: number }> => {
	const payload = besoin instanceof FormData ? besoin : toFormData(besoin, files);
	return postWithFallback<{ b_No: number }>("Besoin", payload, {
		headers: { "Content-Type": "multipart/form-data" },
	});
};

export const confirmerBesoin = async (id: number): Promise<{ b_No: number; b_Etat_Besoin: number }> =>
	postWithFallback<{ b_No: number; b_Etat_Besoin: number }>(`${id}/confirmer`, {});

export const deleteBesoin = async (id: number | string): Promise<void> => {
	await deleteWithFallback(`${id}`);
};

export const getLastNumero = async (): Promise<{ numero: string }> =>
	getWithFallback<{ numero: string }>("last-numero");

export const existTypeBesoinUser = async (): Promise<{ exist_Type_Besoin: boolean }> =>
	getWithFallback<{ exist_Type_Besoin: boolean }>("exist-type-besoin-user");

export const getArticlesBesoin = async (
	params: Partial<DA_BESOIN_ARTICLEDto> = {},
): Promise<GridResponse<DA_BESOIN_ARTICLEDto>> => {
	const response = await getWithFallback<unknown>("articles", params as Record<string, unknown>);
	return normalizeGrid<DA_BESOIN_ARTICLEDto>(response);
};

export const getBesoinArticles = async (id: number): Promise<DA_BESOIN_ARTICLEDto[]> =>
	getWithFallback<DA_BESOIN_ARTICLEDto[]>(`${id}/articles`);

export const saveArticleBesoin = async (article: Record<string, unknown>) =>
	postWithFallback<unknown>("articles", article);

export const saveArticlesBesoinBulk = async (besoin: Record<string, unknown>, list: Record<string, unknown>[]) =>
	postWithFallback<unknown>("articles/bulk", { BESOIN: besoin, List: list });

export const deleteArticleBesoin = async (bA_No: number) => {
	await deleteWithFallback(`articles/${bA_No}`);
};

export const getTracabiliteArticleBesoin = async (
	filter: Partial<DA_TRACABILITEBESOINARTICLEDto>,
): Promise<GridResponse<DA_TRACABILITEBESOINARTICLEDto>> => {
	const response = await getWithFallback<unknown>("articles/tracabilite", filter as Record<string, unknown>);
	return normalizeGrid<DA_TRACABILITEBESOINARTICLEDto>(response);
};

export const getFournisseurPrincipal = async (bA_No: number): Promise<{ cT_Num: string }> =>
	getWithFallback<{ cT_Num: string }>(`articles/${bA_No}/fournisseur-principal`);

export const getDepotsAutoriser = async (bT_Id: number, b_IdDemandeur: string): Promise<IDepot[]> =>
	getWithFallback<IDepot[]>("depots-autoriser", { bT_Id, b_IdDemandeur });

export const getAffairesAutoriser = async (bT_Id: number): Promise<IAffaire[]> =>
	getWithFallback<IAffaire[]>("affaires-autoriser", { bT_Id });

export const getInfoTypeBesoin = async (bT_Id: number): Promise<IBesoinType | null> =>
	getWithFallback<IBesoinType | null>("info-type-besoin", { bT_Id });

export const getArticleDivers = async (bT_Id: number) => getWithFallback<unknown>("article-divers", { bT_Id });

export const getCircuitValidation = async (
	bT_Id: number,
	idBesoin: number,
	idDemandeur: string,
	v_Type: number,
): Promise<Validateur_BesoinVM[]> => {
	const response = await getWithFallback<unknown>("circuit-validation", { bT_Id, idBesoin, idDemandeur, v_Type });
	return getArrayFromPayload<Validateur_BesoinVM>(response, "data");
};

export const validerEtape = async (validation: DA_VALIDATION) => postWithFallback<unknown>("valider-etape", validation);

export const getValidationById = async (id: number, b_No: number) =>
	getWithFallback<unknown>(`${id}/validation`, { b_No });

export const getStatutUserBesoin = async (b_No: number, type: number): Promise<number> =>
	getWithFallback<number>(`${b_No}/statut-user`, { type });

export const getHistoriqueValidation = async (
	filter: Partial<Validateur_BesoinVM>,
	v_Type: Type_Validation,
): Promise<GridResponse<Validateur_BesoinVM>> => {
	const response = await getWithFallback<unknown>("historique-validation", {
		...(filter as Record<string, unknown>),
		v_Type,
	});
	return normalizeGrid<Validateur_BesoinVM>(response);
};

export const getMultiAcheteursValidation = async (
	filter: Partial<Validateur_BesoinVM>,
	v_Type: Type_Validation,
): Promise<GridResponse<Validateur_BesoinVM>> => {
	const response = await getWithFallback<unknown>("multi-acheteurs-validation", {
		...(filter as Record<string, unknown>),
		v_Type,
	});
	return normalizeGrid<Validateur_BesoinVM>(response);
};

export const rejeterArticle = async (v_Id: number, bA_No: number, motif: string, mR_No: number) =>
	postWithFallback<unknown>("rejeter-article", null, {
		params: { v_Id, bA_No, motif, mR_No },
	});

export const affectationAcheteur = async (b_No: number, typeValidation = false) =>
	postWithFallback<unknown>(`${b_No}/affectation-acheteur`, null, {
		params: { typeValidation },
	});

export const getDemandesAAcheter = async (
	filter: Partial<DA_BESOIN_AACHETERDto>,
): Promise<GridResponse<DA_BESOIN_AACHETERDto>> => {
	const response = await getWithFallback<unknown>("demandes-aacheter", filter as Record<string, unknown>);
	return normalizeGrid<DA_BESOIN_AACHETERDto>(response);
};

export const getDetailsDemandeAAcheter = async (id: number) => getWithFallback<unknown>(`demandes-aacheter/${id}`);

export const getAffectationDetails = async (
	filter: Partial<AFFECTATION_DEMANDEDto>,
): Promise<GridResponse<AFFECTATION_DEMANDEDto>> => {
	const response = await getWithFallback<unknown>("affectation-details", filter as Record<string, unknown>);
	return normalizeGrid<AFFECTATION_DEMANDEDto>(response);
};

export const addAffectation = async (affectation: Partial<AFFECTATION_DEMANDEDto>) =>
	postWithFallback<unknown>("affectation", affectation);

export const deleteAffectation = async (aD_No: number, b_No: number) =>
	deleteWithFallback<unknown>(`affectation/${aD_No}`, { params: { b_No } });

export const genererAffectationFournisseur = async (b_No: number, tP_No: number) =>
	postWithFallback<unknown>(`${b_No}/generer-affectation-fournisseur`, null, {
		params: { tP_No },
	});

export const genererDocument = async (b_No: number, tP_No: TypeSage, type: Type_Validation) =>
	postWithFallback<unknown>(`${b_No}/generer-document`, null, {
		params: { tP_No, type },
	});

export const getTableauxComparatifs = async (b_No: number) => getWithFallback<unknown>(`${b_No}/tableaux-comparatifs`);

export const exportBesoinExcel = async (filter: Partial<DA_BESOINDto>): Promise<AxiosResponse<Blob>> =>
	postBlobWithFallback("export-excel", filter);

export const exportDemandesAAcheterExcel = async (
	filter: Partial<DA_BESOIN_AACHETERDto>,
): Promise<AxiosResponse<Blob>> => postBlobWithFallback("demandes-aacheter/export-excel", filter);

export const besoinService = {
	getAll: getBesoins,
	getById: getBesoinById,
	save: saveBesoin,
	confirmer: confirmerBesoin,
	getLastNumero,
	existTypeBesoinUser,
	exportExcel: async (filter: Partial<DA_BESOINDto>): Promise<void> => {
		const response = await exportBesoinExcel(filter);
		const fallbackName = `Liste_Demandes_Besoin_${new Date().toISOString().slice(0, 10)}.xlsx`;
		const fileName = response.headers["file-name"] || fallbackName;
		triggerBlobDownload(response.data, fileName);
	},
};

export const articleBesoinService = {
	getAll: getArticlesBesoin,
	getByBesoinId: getBesoinArticles,
	save: saveArticleBesoin,
	delete: deleteArticleBesoin,
	getTracabilite: getTracabiliteArticleBesoin,
	getFournisseurPrincipal,
};

export const validationService = {
	getCircuit: (
		bT_Id: number,
		idBesoin: number,
		idDemandeur: string,
		v_Type: Type_Validation,
	): Promise<Validateur_BesoinVM[]> => getCircuitValidation(bT_Id, idBesoin, idDemandeur, Number(v_Type)),
	getStatutUser: getStatutUserBesoin,
	getValidationView: getValidationById,
	validerEtape,
	getHistorique: getHistoriqueValidation,
	getMultiAcheteurs: getMultiAcheteursValidation,
	rejeterArticle,
	affectationAcheteur,
};

export const gestionDemandeService = {
	getDemandesAAcheter,
	getDetailsDemande: getDetailsDemandeAAcheter,
	getAffectationDetails,
	addAffectation,
	deleteAffectation,
	genererAffectationFournisseur,
	genererDocument,
	getTableauxComparatifs,
	exportExcel: async (filter: Partial<DA_BESOIN_AACHETERDto>): Promise<void> => {
		const response = await exportDemandesAAcheterExcel(filter);
		const fallbackName = `Demandes_AAcheter_${new Date().toISOString().slice(0, 10)}.xlsx`;
		const fileName = response.headers["file-name"] || fallbackName;
		triggerBlobDownload(response.data, fileName);
	},
};

export const referenceService = {
	getDepotsAutoriser,
	getAffairesAutoriser,
	getArticleDivers,
	getInfoTypeBesoin,
};
