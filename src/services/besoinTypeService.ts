import type { AxiosError, AxiosRequestConfig } from "axios";
import apiClient from "@/api/apiClient";
import type {
	BesoinTypeAffaire,
	BesoinTypeAffaireFilter,
	BesoinTypeCategorie,
	BesoinTypeCategorieFilter,
	BesoinTypeCircuit,
	BesoinTypeDepot,
	BesoinTypeDepotFilter,
	BesoinTypeItem,
	BesoinTypeSidebarItem,
	BesoinTypeUser,
	BesoinTypeUserFilter,
	ChampsLibre,
	ChampsLibreFilter,
	Rappel,
	RappelPeriode,
	RappelPeriodeFilter,
	ReferenceData,
} from "@/types/besoinType";
import type { ActionResponse, GridFilter, GridResponse, SelectOptionItem } from "@/types/parametres";

const BASES = ["/api/besoin-type", "/api/besoinType", "/api/BesoinType", "/BesoinType"];

const toRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const pick = (source: Record<string, unknown>, ...keys: string[]) => {
	for (const key of keys) {
		if (key in source) return source[key];
	}
	return undefined;
};

const asString = (value: unknown) => {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return "";
};

const asNumber = (value: unknown) => {
	if (typeof value === "number" && !Number.isNaN(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	}
	return 0;
};

const asNullableNumber = (value: unknown) => {
	if (value === null || value === undefined || value === "") return null;
	const parsed = asNumber(value);
	return Number.isNaN(parsed) ? null : parsed;
};

const asBoolean = (value: unknown) => {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") return value.toLowerCase() === "true";
	if (typeof value === "number") return value === 1;
	return false;
};

const antiForgeryToken = () => {
	const meta = document.querySelector<HTMLMetaElement>('meta[name="RequestVerificationToken"]')?.content;
	if (meta) return meta;
	const input = document.querySelector<HTMLInputElement>('input[name="__RequestVerificationToken"]')?.value;
	if (input) return input;
	const fromGlobal = (window as unknown as { __RequestVerificationToken?: string }).__RequestVerificationToken;
	if (fromGlobal) return fromGlobal;
	return undefined;
};

const appendXsrfHeader = (config: AxiosRequestConfig = {}): AxiosRequestConfig => {
	const token = antiForgeryToken();
	if (!token) return config;
	return {
		...config,
		headers: {
			...(config.headers || {}),
			RequestVerificationToken: token,
		},
	};
};

const candidateUrls = (pathOrUrl: string) => {
	if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return [pathOrUrl];
	if (pathOrUrl.startsWith("/BesoinType") || pathOrUrl.startsWith("/api/")) return [pathOrUrl];
	const path = pathOrUrl.startsWith("/") ? pathOrUrl.slice(1) : pathOrUrl;
	if (!path.trim()) return BASES;
	return BASES.map((base) => `${base}/${path}`);
};

const shouldTryNext = (error: unknown) => {
	const axiosError = error as AxiosError;
	return axiosError.response?.status === 404 || axiosError.response?.status === 405;
};

const getErrorMessage = (error: unknown) => {
	const axiosError = error as AxiosError;
	if (typeof axiosError.response?.data === "string" && axiosError.response.data.trim()) {
		return axiosError.response.data;
	}
	const data = toRecord(axiosError.response?.data);
	return asString(pick(data, "message", "Message")) || axiosError.message || "Erreur serveur.";
};

async function getWithFallback<T>(
	pathOrUrl: string,
	params?: Record<string, string | number | boolean | undefined>,
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

async function postWithFallback<T>(pathOrUrl: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
	let lastError: unknown;
	for (const url of candidateUrls(pathOrUrl)) {
		try {
			const response = await apiClient.post<T>(url, data, appendXsrfHeader(config));
			return response.data as T;
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
			const response = await apiClient.delete<T>(url, appendXsrfHeader(config));
			return response.data as T;
		} catch (error) {
			lastError = error;
			if (shouldTryNext(error)) continue;
			throw new Error(getErrorMessage(error));
		}
	}
	throw new Error(getErrorMessage(lastError));
}

const assertMaybeAction = (response: unknown) => {
	const data = toRecord(response);
	if (!("isValid" in data) && !("IsValid" in data)) return;
	if (!asBoolean(pick(data, "isValid", "IsValid"))) {
		throw new Error(asString(pick(data, "Message", "message")) || "Action refusée par le serveur.");
	}
};

const ensureGrid = <T>(raw: unknown): GridResponse<T> => {
	const record = toRecord(raw);
	const rowsRaw = Array.isArray(record.data) ? record.data : [];
	return {
		data: rowsRaw as T[],
		itemsCount: asNumber(record.itemsCount),
	};
};

const runWithFallback = async <T>(requests: Array<() => Promise<T>>) => {
	let lastError: unknown;
	for (const request of requests) {
		try {
			return await request();
		} catch (error) {
			lastError = error;
		}
	}
	throw new Error(getErrorMessage(lastError));
};

const mapBesoinType = (raw: unknown): BesoinTypeItem => {
	const item = toRecord(raw);
	return {
		bT_Id: asNumber(pick(item, "bT_Id", "BT_Id")),
		bT_Code: asString(pick(item, "bT_Code", "BT_Code")),
		bT_Intitule: asString(pick(item, "bT_Intitule", "BT_Intitule")),
		bT_DegreImportance: asNullableNumber(pick(item, "bT_DegreImportance", "BT_DegreImportance")) ?? undefined,
		bT_ModifDegreImportance: asBoolean(pick(item, "bT_ModifDegreImportance", "BT_ModifDegreImportance")),
		bT_PathBC: asString(pick(item, "bT_PathBC", "BT_PathBC")) || undefined,
		bT_PathDA: asString(pick(item, "bT_PathDA", "BT_PathDA")) || undefined,
		bT_PathDB: asString(pick(item, "bT_PathDB", "BT_PathDB")) || undefined,
		bT_PathDP: asString(pick(item, "bT_PathDP", "BT_PathDP")) || undefined,
		bT_SignatureImg: asString(pick(item, "bT_SignatureImg", "BT_SignatureImg")) || undefined,
		bT_UserSage: asString(pick(item, "bT_UserSage", "BT_UserSage")) || undefined,
		bT_Souche: asNullableNumber(pick(item, "bT_Souche", "BT_Souche")) ?? undefined,
		bT_Journal: asString(pick(item, "bT_Journal", "BT_Journal")) || undefined,
		bT_CompteDebit: asString(pick(item, "bT_CompteDebit", "BT_CompteDebit")) || undefined,
		bT_CompteCredit: asString(pick(item, "bT_CompteCredit", "BT_CompteCredit")) || undefined,
		r_No: asNullableNumber(pick(item, "r_No", "R_No")) ?? undefined,
	};
};

const mapSidebarItem = (raw: unknown): BesoinTypeSidebarItem => {
	const item = toRecord(raw);
	return {
		bT_Id: asNumber(pick(item, "bT_Id", "BT_Id")),
		bT_Intitule: asString(pick(item, "bT_Intitule", "BT_Intitule")),
		r_No: asNumber(pick(item, "r_No", "R_No")),
	};
};

const mapCircuit = (raw: unknown): BesoinTypeCircuit => {
	const item = toRecord(raw);
	return {
		cbMarq: asNumber(pick(item, "cbMarq")),
		bT_Id: asNumber(pick(item, "bT_Id", "BT_Id")),
		uS_Id: asString(pick(item, "uS_Id", "US_Id")) || undefined,
		uS_UserIntitule: asString(pick(item, "uS_UserIntitule", "US_UserIntitule")) || undefined,
		bC_Niveau: asNumber(pick(item, "bC_Niveau", "BC_Niveau")),
		bC_Acheteur: asBoolean(pick(item, "bC_Acheteur", "BC_Acheteur")),
		bC_ApprDA: asBoolean(pick(item, "bC_ApprDA", "BC_ApprDA")),
		bC_ApprRB: asBoolean(pick(item, "bC_ApprRB", "BC_ApprRB")),
		bC_ConsulteStock: asBoolean(pick(item, "bC_ConsulteStock", "BC_ConsulteStock")),
		bC_ValidBC: asBoolean(pick(item, "bC_ValidBC", "BC_ValidBC")),
		bC_ValidDP: asBoolean(pick(item, "bC_ValidDP", "BC_ValidDP")),
		picture: asString(pick(item, "picture", "Picture")) || undefined,
		r_No: asNullableNumber(pick(item, "r_No", "R_No")) ?? undefined,
	};
};

const mapDepot = (raw: unknown): BesoinTypeDepot => {
	const item = toRecord(raw);
	return {
		cBMarq: asNumber(pick(item, "cBMarq", "CBMarq", "cbMarq")),
		bT_Id: asNumber(pick(item, "bT_Id", "BT_Id")),
		dE_No: asNullableNumber(pick(item, "dE_No", "DE_No")) ?? undefined,
		dE_Intitule: asString(pick(item, "dE_Intitule", "DE_Intitule")) || undefined,
		dE_Ville: asString(pick(item, "dE_Ville", "DE_Ville")) || undefined,
	};
};

const mapAffaire = (raw: unknown): BesoinTypeAffaire => {
	const item = toRecord(raw);
	return {
		cBMarq: asNumber(pick(item, "cBMarq", "CBMarq", "cbMarq")),
		bT_Id: asNumber(pick(item, "bT_Id", "BT_Id")),
		fA_No: asNullableNumber(pick(item, "fA_No", "FA_No")) ?? undefined,
		cA_Num: asString(pick(item, "cA_Num", "CA_Num")) || undefined,
		cA_Intitule: asString(pick(item, "cA_Intitule", "CA_Intitule")) || undefined,
	};
};

const mapCategorie = (raw: unknown): BesoinTypeCategorie => {
	const item = toRecord(raw);
	return {
		cBMarq: asNumber(pick(item, "cBMarq", "CBMarq", "cbMarq")),
		bT_Id: asNumber(pick(item, "bT_Id", "BT_Id")),
		cA_No: asNullableNumber(pick(item, "cA_No", "CA_No")) ?? undefined,
		cL_No1: asNullableNumber(pick(item, "cL_No1", "CL_No1")) ?? undefined,
		cL_No2: asNullableNumber(pick(item, "cL_No2", "CL_No2")) ?? undefined,
		cL_No3: asNullableNumber(pick(item, "cL_No3", "CL_No3")) ?? undefined,
		cL_No4: asNullableNumber(pick(item, "cL_No4", "CL_No4")) ?? undefined,
		cL_Intitule1: asString(pick(item, "cL_Intitule1", "CL_Intitule1")) || undefined,
		cL_Intitule2: asString(pick(item, "cL_Intitule2", "CL_Intitule2")) || undefined,
		cL_Intitule3: asString(pick(item, "cL_Intitule3", "CL_Intitule3")) || undefined,
		cL_Intitule4: asString(pick(item, "cL_Intitule4", "CL_Intitule4")) || undefined,
	};
};

const mapUser = (raw: unknown): BesoinTypeUser => {
	const item = toRecord(raw);
	return {
		cBMarq: asNumber(pick(item, "cBMarq", "CBMarq", "cbMarq")),
		bT_Id: asNumber(pick(item, "bT_Id", "BT_Id")),
		uS_Id: asString(pick(item, "uS_Id", "US_Id")) || undefined,
		uS_UserIntitule: asString(pick(item, "uS_UserIntitule", "US_UserIntitule")) || undefined,
	};
};

const mapRappel = (raw: unknown): Rappel => {
	const item = toRecord(raw);
	return {
		cbMarq: asNumber(pick(item, "cbMarq")),
		bT_Id: asNullableNumber(pick(item, "bT_Id", "BT_Id")) ?? undefined,
		bC_Id: asNullableNumber(pick(item, "bC_Id", "BC_Id")) ?? undefined,
		r_NbRappel: asNullableNumber(pick(item, "r_NbRappel", "R_NbRappel")) ?? undefined,
		r_FreqType: asNullableNumber(pick(item, "r_FreqType", "R_FreqType")) ?? undefined,
		r_Duree: asNullableNumber(pick(item, "r_Duree", "R_Duree")) ?? undefined,
		r_ParamNotif: asBoolean(pick(item, "r_ParamNotif", "R_ParamNotif")),
		r_ParamMail: asBoolean(pick(item, "r_ParamMail", "R_ParamMail")),
		r_NotifDemandeur: asBoolean(pick(item, "r_NotifDemandeur", "R_NotifDemandeur")),
		rN_TransType: asNullableNumber(pick(item, "rN_TransType", "RN_TransType")) ?? undefined,
	};
};

const mapRappelPeriode = (raw: unknown): RappelPeriode => {
	const item = toRecord(raw);
	return {
		cbMarq: asNumber(pick(item, "cbMarq")),
		rP_Type: asNumber(pick(item, "rP_Type", "RP_Type")),
		uS_Id: asString(pick(item, "uS_Id", "US_Id")) || "",
		uS_UserIntitule: asString(pick(item, "uS_UserIntitule", "US_UserIntitule")) || undefined,
		rP_DateDebut: asString(pick(item, "rP_DateDebut", "RP_DateDebut")) || undefined,
		rP_DateFin: asString(pick(item, "rP_DateFin", "RP_DateFin")) || undefined,
	};
};

const mapChampsLibre = (raw: unknown): ChampsLibre => {
	const item = toRecord(raw);
	return {
		cbMarq: asNumber(pick(item, "cbMarq")),
		cL_Nature: asNullableNumber(pick(item, "cL_Nature", "CL_Nature")) ?? undefined,
		cL_ChampLibre_Document: asString(pick(item, "cL_ChampLibre_Document", "CL_ChampLibre_Document")) || undefined,
		cL_TableChampLibre_Source:
			asString(pick(item, "cL_TableChampLibre_Source", "CL_TableChampLibre_Source")) || undefined,
		cL_ChampLibre_Source: asString(pick(item, "cL_ChampLibre_Source", "CL_ChampLibre_Source")) || undefined,
	};
};

const mapSelectString = (raw: unknown): SelectOptionItem<string> => {
	const item = toRecord(raw);
	return {
		text: asString(pick(item, "text", "Text")),
		value: asString(pick(item, "value", "Value")),
	};
};

const mapSelectNumber = (raw: unknown): SelectOptionItem<number> => {
	const item = toRecord(raw);
	return {
		text: asString(pick(item, "text", "Text")),
		value: asNumber(pick(item, "value", "Value")),
	};
};

export const besoinTypeService = {
	async getBesoinTypes(filter: GridFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/besoin-type", filter),
				() => getWithFallback("/api/besoinType", filter),
				() => getWithFallback("/api/BesoinType", filter),
				() => getWithFallback("/BesoinType/Get", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapBesoinType),
		} as GridResponse<BesoinTypeItem>;
	},

	async getBesoinTypeById(id: number) {
		const response = await runWithFallback<unknown>([
			() => getWithFallback(`/api/besoin-type/${id}`),
			() => getWithFallback(`/api/besoinType/${id}`),
			() => getWithFallback(`/api/BesoinType/${id}`),
			() => getWithFallback(`/BesoinType/DetailsBesoinType`, { id }),
		]);
		const wrapper = toRecord(response);
		if ("besoinType" in wrapper || "BesoinType" in wrapper) {
			return {
				besoinType: mapBesoinType(pick(wrapper, "besoinType", "BesoinType")),
				lastCode: asString(pick(wrapper, "lastCode", "LastCode", "bT_Code", "BT_Code")),
				defaultValues: toRecord(pick(wrapper, "defaultValues", "DefaultValues")),
			};
		}
		return {
			besoinType: mapBesoinType(response),
			lastCode: "",
			defaultValues: {} as Record<string, unknown>,
		};
	},

	async getLastCode() {
		const response = await runWithFallback<unknown>([
			() => getWithFallback("/api/besoin-type/last-code"),
			() => getWithFallback("/api/besoinType/last-code"),
			() => getWithFallback("/api/BesoinType/last-code"),
			() => getWithFallback("/BesoinType/GetLastCode"),
			() => getWithFallback("/BesoinType/GetLastBTCode"),
		]);
		const data = toRecord(response);
		return asString(pick(data, "bT_Code", "BT_Code"));
	},

	async saveBesoinType(
		besoinType: BesoinTypeItem,
		files?: { signature?: File; bcFile?: File; daFile?: File; dbFile?: File; dpFile?: File },
	) {
		const formData = new FormData();
		formData.append("BT_Id", String(besoinType.bT_Id || 0));
		formData.append("BT_Code", besoinType.bT_Code);
		formData.append("BT_Intitule", besoinType.bT_Intitule);
		if (besoinType.bT_DegreImportance !== undefined)
			formData.append("BT_DegreImportance", String(besoinType.bT_DegreImportance));
		if (besoinType.bT_ModifDegreImportance !== undefined)
			formData.append("BT_ModifDegreImportance", String(besoinType.bT_ModifDegreImportance));
		if (besoinType.bT_UserSage) formData.append("BT_UserSage", besoinType.bT_UserSage);
		if (besoinType.bT_Souche !== undefined) formData.append("BT_Souche", String(besoinType.bT_Souche));
		if (besoinType.bT_Journal) formData.append("BT_Journal", besoinType.bT_Journal);
		if (besoinType.bT_CompteDebit) formData.append("BT_CompteDebit", besoinType.bT_CompteDebit);
		if (besoinType.bT_CompteCredit) formData.append("BT_CompteCredit", besoinType.bT_CompteCredit);
		if (besoinType.aR_Ref) formData.append("AR_Ref", besoinType.aR_Ref);

		if (files?.signature) formData.append("SignaturePic", files.signature);
		if (files?.bcFile) formData.append("BT_PathBCFile", files.bcFile);
		if (files?.daFile) formData.append("BT_PathDAFile", files.daFile);
		if (files?.dbFile) formData.append("BT_PathDBFile", files.dbFile);
		if (files?.dpFile) formData.append("BT_PathDPFile", files.dpFile);

		const response = await runWithFallback<unknown>([
			() => postWithFallback("/api/besoin-type", formData, { headers: { "Content-Type": "multipart/form-data" } }),
			() => postWithFallback("/api/besoinType", formData, { headers: { "Content-Type": "multipart/form-data" } }),
			() => postWithFallback("/api/BesoinType", formData, { headers: { "Content-Type": "multipart/form-data" } }),
			() =>
				postWithFallback("/BesoinType/AddOrUpdateBesoinType", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteBesoinType(id: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/${id}`),
			() => deleteWithFallback(`/api/besoinType/${id}`),
			() => deleteWithFallback(`/api/BesoinType/${id}`),
			() => postWithFallback(`/BesoinType/DeleteBesoinType?id=${id}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async createBesoinType(data: { bT_Code: string; bT_Intitule: string }) {
		const formData = new FormData();
		formData.append("BT_Id", "0");
		formData.append("BT_Code", data.bT_Code);
		formData.append("BT_Intitule", data.bT_Intitule);

		const response = await runWithFallback<unknown>([
			() =>
				postWithFallback("/BesoinType/AddOrUpdateBesoinType", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
			() =>
				postWithFallback("/api/besoin-type", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
			() =>
				postWithFallback("/api/besoinType", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
			() =>
				postWithFallback("/api/BesoinType", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getBesoinTypesForSidebar() {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/besoin-type/sidebar"),
			() => getWithFallback("/api/besoinType/sidebar"),
			() => getWithFallback("/api/BesoinType/sidebar"),
			() => getWithFallback("/BesoinType/GetBesoinTypesForSidebar"),
		]);
		return Array.isArray(response) ? response.map(mapSidebarItem) : [];
	},

	async getCircuits(btId: number) {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/BesoinType/GetBesoinTypeCircuits", { BT_Id: btId }),
			() => getWithFallback(`/api/besoin-type/${btId}/circuits`),
			() => getWithFallback(`/api/besoinType/${btId}/circuits`),
			() => getWithFallback(`/api/BesoinType/${btId}/circuits`),
		]);
		return Array.isArray(response) ? response.map(mapCircuit) : [];
	},

	async saveCircuits(model: { bT_Id: number; data: BesoinTypeCircuit[] }) {
		const response = await runWithFallback<unknown>([
			() => postWithFallback("/BesoinType/AddOrUpdateBesoinTypeCircuits", { BT_Id: model.bT_Id, Data: model.data }),
			() => postWithFallback(`/api/besoin-type/${model.bT_Id}/circuits`, model),
			() => postWithFallback(`/api/besoinType/${model.bT_Id}/circuits`, model),
			() => postWithFallback(`/api/BesoinType/${model.bT_Id}/circuits`, model),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getDepots(filter: BesoinTypeDepotFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/besoin-type/depots", filter),
				() => getWithFallback("/api/besoinType/depots", filter),
				() => getWithFallback("/api/BesoinType/depots", filter),
				() => getWithFallback("/BesoinType/GetBesoinTypeDepots", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapDepot),
		} as GridResponse<BesoinTypeDepot>;
	},

	async addDepots(btId: number, depotIds: number[]) {
		const response = await runWithFallback<unknown>([
			() => postWithFallback(`/api/besoin-type/${btId}/depots`, depotIds),
			() => postWithFallback(`/api/besoinType/${btId}/depots`, depotIds),
			() => postWithFallback(`/api/BesoinType/${btId}/depots`, depotIds),
			() =>
				postWithFallback(
					`/BesoinType/AddBesoinTypeDepots?cbMarq=${btId}&lstIds=${encodeURIComponent(JSON.stringify(depotIds))}`,
					null,
				),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteDepot(cbMarq: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/depots/${cbMarq}`),
			() => deleteWithFallback(`/api/besoinType/depots/${cbMarq}`),
			() => deleteWithFallback(`/api/BesoinType/depots/${cbMarq}`),
			() => postWithFallback(`/BesoinType/DeleteBesoinTypeDepot?cbMarq=${cbMarq}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getAffaires(filter: BesoinTypeAffaireFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/besoin-type/affaires", filter),
				() => getWithFallback("/api/besoinType/affaires", filter),
				() => getWithFallback("/api/BesoinType/affaires", filter),
				() => getWithFallback("/BesoinType/GetBesoinTypeAffaires", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapAffaire),
		} as GridResponse<BesoinTypeAffaire>;
	},

	async addAffaires(btId: number, affaireIds: number[]) {
		const response = await runWithFallback<unknown>([
			() => postWithFallback(`/api/besoin-type/${btId}/affaires`, affaireIds),
			() => postWithFallback(`/api/besoinType/${btId}/affaires`, affaireIds),
			() => postWithFallback(`/api/BesoinType/${btId}/affaires`, affaireIds),
			() =>
				postWithFallback(
					`/BesoinType/AddBesoinTypeAffaires?cbMarq=${btId}&lstIds=${encodeURIComponent(JSON.stringify(affaireIds))}`,
					null,
				),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteAffaire(cbMarq: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/affaires/${cbMarq}`),
			() => deleteWithFallback(`/api/besoinType/affaires/${cbMarq}`),
			() => deleteWithFallback(`/api/BesoinType/affaires/${cbMarq}`),
			() => postWithFallback(`/BesoinType/DeleteBesoinTypeAffaire?cbMarq=${cbMarq}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getCategories(filter: BesoinTypeCategorieFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/besoin-type/categories", filter),
				() => getWithFallback("/api/besoinType/categories", filter),
				() => getWithFallback("/api/BesoinType/categories", filter),
				() => getWithFallback("/BesoinType/GetBesoinTypeCategories", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapCategorie),
		} as GridResponse<BesoinTypeCategorie>;
	},

	async addCategories(btId: number, categorieIds: number[]) {
		const response = await runWithFallback<unknown>([
			() => postWithFallback(`/api/besoin-type/${btId}/categories`, categorieIds),
			() => postWithFallback(`/api/besoinType/${btId}/categories`, categorieIds),
			() => postWithFallback(`/api/BesoinType/${btId}/categories`, categorieIds),
			() =>
				postWithFallback(
					`/BesoinType/AffecterCategories?cbMarq=${btId}&lstIds=${encodeURIComponent(JSON.stringify(categorieIds))}`,
					null,
				),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteCategorie(cbMarq: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/categories/${cbMarq}`),
			() => deleteWithFallback(`/api/besoinType/categories/${cbMarq}`),
			() => deleteWithFallback(`/api/BesoinType/categories/${cbMarq}`),
			() => postWithFallback(`/BesoinType/DeleteBesoinTypeCategorie?cbMarq=${cbMarq}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getUsers(filter: BesoinTypeUserFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/besoin-type/users", filter),
				() => getWithFallback("/api/besoinType/users", filter),
				() => getWithFallback("/api/BesoinType/users", filter),
				() => getWithFallback("/BesoinType/GetBesoinTypeUsers", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapUser),
		} as GridResponse<BesoinTypeUser>;
	},

	async addUsers(btId: number, userIds: string[]) {
		const response = await runWithFallback<unknown>([
			() => postWithFallback(`/api/besoin-type/${btId}/users`, userIds),
			() => postWithFallback(`/api/besoinType/${btId}/users`, userIds),
			() => postWithFallback(`/api/BesoinType/${btId}/users`, userIds),
			() =>
				postWithFallback(
					`/BesoinType/AddBesoinTypeUsers?cbMarq=${btId}&lstIds=${encodeURIComponent(JSON.stringify(userIds))}`,
					null,
				),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteUser(cbMarq: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/users/${cbMarq}`),
			() => deleteWithFallback(`/api/besoinType/users/${cbMarq}`),
			() => deleteWithFallback(`/api/BesoinType/users/${cbMarq}`),
			() => postWithFallback(`/BesoinType/DeleteBesoinTypeUser?cbMarq=${cbMarq}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getRappel(btId: number, params?: { rNo?: number; bcId?: number; globale?: boolean }) {
		const response = await runWithFallback<unknown>([
			() => getWithFallback(`/api/besoin-type/rappels/${btId}`, params),
			() => getWithFallback(`/api/besoinType/rappels/${btId}`, params),
			() => getWithFallback(`/api/BesoinType/rappels/${btId}`, params),
			() =>
				getWithFallback("/BesoinType/AddOrUpdateRappel", {
					BT_Id: btId,
					R_No: params?.rNo,
					BC_Id: params?.bcId,
					globale: params?.globale,
				}),
		]);
		return mapRappel(response);
	},

	async saveRappel(rappel: Rappel) {
		const formData = new FormData();
		formData.append("cbMarq", String(rappel.cbMarq || 0));
		if (rappel.bT_Id !== undefined) formData.append("BT_Id", String(rappel.bT_Id));
		if (rappel.bC_Id !== undefined) formData.append("BC_Id", String(rappel.bC_Id));
		if (rappel.r_NbRappel !== undefined) formData.append("R_NbRappel", String(rappel.r_NbRappel));
		if (rappel.r_FreqType !== undefined) formData.append("R_FreqType", String(rappel.r_FreqType));
		if (rappel.r_Duree !== undefined) formData.append("R_Duree", String(rappel.r_Duree));
		formData.append("R_ParamNotif", String(Boolean(rappel.r_ParamNotif)));
		formData.append("R_ParamMail", String(Boolean(rappel.r_ParamMail)));
		formData.append("R_NotifDemandeur", String(Boolean(rappel.r_NotifDemandeur)));
		if (rappel.rN_TransType !== undefined) formData.append("RN_TransType", String(rappel.rN_TransType));

		const response = await runWithFallback<unknown>([
			() => postWithFallback("/api/besoin-type/rappels", formData),
			() => postWithFallback("/api/besoinType/rappels", formData),
			() => postWithFallback("/api/BesoinType/rappels", formData),
			() => postWithFallback("/BesoinType/AddOrUpdateRappel", formData),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteRappel(cbMarq: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/rappels/${cbMarq}`),
			() => deleteWithFallback(`/api/besoinType/rappels/${cbMarq}`),
			() => deleteWithFallback(`/api/BesoinType/rappels/${cbMarq}`),
			() => postWithFallback(`/BesoinType/DeleteRappel?cbMarq=${cbMarq}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteBesoinTypeRappel(btId: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/rappels/type/${btId}`),
			() => deleteWithFallback(`/api/besoinType/rappels/type/${btId}`),
			() => deleteWithFallback(`/api/BesoinType/rappels/type/${btId}`),
			() => postWithFallback(`/BesoinType/DeleteBesoinTypeRappel?BT_Id=${btId}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getRappelPeriodes(filter: RappelPeriodeFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/besoin-type/rappel-periodes", filter),
				() => getWithFallback("/api/besoinType/rappel-periodes", filter),
				() => getWithFallback("/api/BesoinType/rappel-periodes", filter),
				() => getWithFallback("/BesoinType/GetRappelPeriodes", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapRappelPeriode),
		} as GridResponse<RappelPeriode>;
	},

	async saveRappelPeriode(periode: RappelPeriode) {
		const formData = new FormData();
		formData.append("cbMarq", String(periode.cbMarq || 0));
		formData.append("RP_Type", String(periode.rP_Type));
		formData.append("US_Id", periode.uS_Id);
		if (periode.rP_DateDebut) formData.append("RP_DateDebut", periode.rP_DateDebut);
		if (periode.rP_DateFin) formData.append("RP_DateFin", periode.rP_DateFin);

		const response = await runWithFallback<unknown>([
			() => postWithFallback("/api/besoin-type/rappel-periodes", formData),
			() => postWithFallback("/api/besoinType/rappel-periodes", formData),
			() => postWithFallback("/api/BesoinType/rappel-periodes", formData),
			() => postWithFallback("/BesoinType/AddOrUpdateRappelPeriode", formData),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteRappelPeriode(cbMarq: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/rappel-periodes/${cbMarq}`),
			() => deleteWithFallback(`/api/besoinType/rappel-periodes/${cbMarq}`),
			() => deleteWithFallback(`/api/BesoinType/rappel-periodes/${cbMarq}`),
			() => postWithFallback(`/BesoinType/DeleteRappelPeriode?cbMarq=${cbMarq}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getChampsLibres(filter: ChampsLibreFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/besoin-type/champs-libres", filter),
				() => getWithFallback("/api/besoinType/champs-libres", filter),
				() => getWithFallback("/api/BesoinType/champs-libres", filter),
				() => getWithFallback("/BesoinType/GetChampsLibre", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapChampsLibre),
		} as GridResponse<ChampsLibre>;
	},

	async saveChampsLibre(champ: ChampsLibre) {
		const response = await runWithFallback<unknown>([
			() => postWithFallback("/api/besoin-type/champs-libres", champ),
			() => postWithFallback("/api/besoinType/champs-libres", champ),
			() => postWithFallback("/api/BesoinType/champs-libres", champ),
			() => postWithFallback("/BesoinType/AddOrUpdateChampsLibre", champ),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getReferenceData() {
		const response = await runWithFallback<unknown>([
			() => getWithFallback("/api/besoin-type/reference-data"),
			() => getWithFallback("/api/besoinType/reference-data"),
			() => getWithFallback("/api/BesoinType/reference-data"),
			() => getWithFallback("/BesoinType/GetReferenceData"),
		]);
		const data = toRecord(response);
		return {
			usersSage: (Array.isArray(data.usersSage) ? data.usersSage : []).map(mapSelectString),
			souches: (Array.isArray(data.souches) ? data.souches : []).map(mapSelectNumber),
			journaux: (Array.isArray(data.journaux) ? data.journaux : []).map(mapSelectString),
			comptesDebit: (Array.isArray(data.comptesDebit) ? data.comptesDebit : []).map(mapSelectString),
			comptesCredit: (Array.isArray(data.comptesCredit) ? data.comptesCredit : []).map(mapSelectString),
			articles: (Array.isArray(data.articles) ? data.articles : []).map(mapSelectString),
		} as ReferenceData;
	},

	async getChampsLibreSage(params: { nature: number; tableName?: string; typeString?: boolean }) {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/BesoinType/GetChampsLibreSage", params),
			() => getWithFallback("/api/besoin-type/champs-libre-sage", params),
			() => getWithFallback("/api/besoinType/champs-libre-sage", params),
			() => getWithFallback("/api/BesoinType/champs-libre-sage", params),
		]);
		return Array.isArray(response) ? response.map(mapSelectString) : [];
	},

	async getTypeChampLibre(params: { nature: number; champName: string }) {
		const response = await runWithFallback<unknown>([
			() => getWithFallback("/BesoinType/GetTypeChampLibre", params),
			() => getWithFallback("/api/besoin-type/type-champ-libre", params),
			() => getWithFallback("/api/besoinType/type-champ-libre", params),
			() => getWithFallback("/api/BesoinType/type-champ-libre", params),
		]);
		const data = toRecord(response);
		return {
			typeChamp: asNumber(pick(data, "typeChamp", "TypeChamp")),
			typeChampText: asString(pick(data, "typeChampText", "TypeChampText")),
		};
	},

	async getTableChampLibreSource(params: { nature: number }) {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/BesoinType/GetTableChampLibreSource", params),
			() => getWithFallback("/api/besoin-type/table-champ-libre-source", params),
			() => getWithFallback("/api/besoinType/table-champ-libre-source", params),
			() => getWithFallback("/api/BesoinType/table-champ-libre-source", params),
		]);
		return Array.isArray(response) ? response.map(mapSelectString) : [];
	},

	async deleteChampsLibre(cbMarq: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/besoin-type/champs-libres/${cbMarq}`),
			() => deleteWithFallback(`/api/besoinType/champs-libres/${cbMarq}`),
			() => deleteWithFallback(`/api/BesoinType/champs-libres/${cbMarq}`),
			() => postWithFallback(`/BesoinType/DeleteChampsLibre?cbMarq=${cbMarq}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},
};
