import type { AxiosError, AxiosRequestConfig } from "axios";
import apiClient from "@/api/apiClient";
import type {
	ActionResponse,
	AffaireAutorise,
	AffaireItem,
	CategorieAutorise,
	CategoriePayload,
	DepotAutorise,
	DepotItem,
	GridFilter,
	GridResponse,
	MotifRectification,
	MotifRectificationPayload,
	ParametreEntity,
	SelectOption,
	SelectOptionItem,
	SoucheItem,
} from "@/types/parametres";

const BASES = ["/api/Parametres", "/api/parametres", "/Parametres"];

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
	if (pathOrUrl.startsWith("/Parametres") || pathOrUrl.startsWith("/api/")) return [pathOrUrl];

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

const mapParametre = (raw: unknown): ParametreEntity => {
	const item = toRecord(raw);
	return {
		pA_No: asNumber(pick(item, "pA_No", "PA_No")),
		pA_SMTP: asString(pick(item, "pA_SMTP", "PA_SMTP")),
		pA_EmailDisplayName: asString(pick(item, "pA_EmailDisplayName", "PA_EmailDisplayName")),
		pA_Port: asNullableNumber(pick(item, "pA_Port", "PA_Port")),
		pA_Mail: asString(pick(item, "pA_Mail", "PA_Mail")),
		pA_MailCopie: asString(pick(item, "pA_MailCopie", "PA_MailCopie")),
		pA_PWD: asString(pick(item, "pA_PWD", "PA_PWD")),
		pA_SSL: asBoolean(pick(item, "pA_SSL", "PA_SSL")),
		pA_LogoSociete: asString(pick(item, "pA_LogoSociete", "PA_LogoSociete")),
		pA_ImgFondEcran: asString(pick(item, "pA_ImgFondEcran", "PA_ImgFondEcran")),
		d_RaisonSoc: asString(pick(item, "d_RaisonSoc", "D_RaisonSoc")),
		d_Profession: asString(pick(item, "d_Profession", "D_Profession")),
		d_Commentaire: asString(pick(item, "d_Commentaire", "D_Commentaire")),
		d_Adresse: asString(pick(item, "d_Adresse", "D_Adresse")),
		d_Complement: asString(pick(item, "d_Complement", "D_Complement")),
		d_CodePostal: asString(pick(item, "d_CodePostal", "D_CodePostal")),
		d_Ville: asString(pick(item, "d_Ville", "D_Ville")),
		d_CodeRegion: asString(pick(item, "d_CodeRegion", "D_CodeRegion")),
		d_Pays: asString(pick(item, "d_Pays", "D_Pays")),
		d_Telephone: asString(pick(item, "d_Telephone", "D_Telephone")),
		d_Telecopie: asString(pick(item, "d_Telecopie", "D_Telecopie")),
		d_EMailSoc: asString(pick(item, "d_EMailSoc", "D_EMailSoc")),
		d_Site: asString(pick(item, "d_Site", "D_Site")),
		d_Siret: asString(pick(item, "d_Siret", "D_Siret")),
		d_Identifiant: asString(pick(item, "d_Identifiant", "D_Identifiant")),
		aR_RefDivers: asString(pick(item, "aR_RefDivers", "AR_RefDivers")),
		pA_UserSage: asString(pick(item, "pA_UserSage", "PA_UserSage")),
		pA_Souche: asNullableNumber(pick(item, "pA_Souche", "PA_Souche")),
		pA_CompteCredit: asString(pick(item, "pA_CompteCredit", "PA_CompteCredit")),
		pA_CompteDebit: asString(pick(item, "pA_CompteDebit", "PA_CompteDebit")),
		pA_Journal: asString(pick(item, "pA_Journal", "PA_Journal")),
		pA_DossierSage: asString(pick(item, "pA_DossierSage", "PA_DossierSage")),
	};
};

const mapDepotAutorise = (raw: unknown): DepotAutorise => {
	const item = toRecord(raw);
	return {
		dA_No: asNumber(pick(item, "dA_No", "DA_No")),
		dE_No: asNullableNumber(pick(item, "dE_No", "DE_No")),
		dE_Intitule: asString(pick(item, "dE_Intitule", "DE_Intitule")),
	};
};

const mapDepot = (raw: unknown): DepotItem => {
	const item = toRecord(raw);
	return {
		dE_No: asNullableNumber(pick(item, "dE_No", "DE_No")),
		dE_Intitule: asString(pick(item, "dE_Intitule", "DE_Intitule")),
	};
};

const mapAffaireAutorise = (raw: unknown): AffaireAutorise => {
	const item = toRecord(raw);
	return {
		fA_No: asNumber(pick(item, "fA_No", "FA_No")),
		cA_Num: asString(pick(item, "cA_Num", "CA_Num")),
		cA_Intitule: asString(pick(item, "cA_Intitule", "CA_Intitule")),
	};
};

const mapAffaire = (raw: unknown): AffaireItem => {
	const item = toRecord(raw);
	return {
		cA_Num: asString(pick(item, "cA_Num", "CA_Num")),
		cA_Intitule: asString(pick(item, "cA_Intitule", "CA_Intitule")),
	};
};

const mapCategorieAutorise = (raw: unknown): CategorieAutorise => {
	const item = toRecord(raw);
	return {
		cA_No: asNumber(pick(item, "cA_No", "CA_No")),
		cL_No1: asNullableNumber(pick(item, "cL_No1", "CL_No1")),
		cL_No2: asNullableNumber(pick(item, "cL_No2", "CL_No2")),
		cL_No3: asNullableNumber(pick(item, "cL_No3", "CL_No3")),
		cL_No4: asNullableNumber(pick(item, "cL_No4", "CL_No4")),
		cL_Intitule1: asString(pick(item, "cL_Intitule1", "CL_Intitule1")),
		cL_Intitule2: asString(pick(item, "cL_Intitule2", "CL_Intitule2")),
		cL_Intitule3: asString(pick(item, "cL_Intitule3", "CL_Intitule3")),
		cL_Intitule4: asString(pick(item, "cL_Intitule4", "CL_Intitule4")),
	};
};

const mapMotif = (raw: unknown): MotifRectification => {
	const item = toRecord(raw);
	return {
		mR_No: asNumber(pick(item, "mR_No", "MR_No")),
		mR_Code: asString(pick(item, "mR_Code", "MR_Code")),
		mR_Desgination: asString(pick(item, "mR_Desgination", "MR_Desgination")),
		mR_TypeMotif: asNumber(pick(item, "mR_TypeMotif", "MR_TypeMotif")),
		mR_TypeDemande: asNumber(pick(item, "mR_TypeDemande", "MR_TypeDemande")),
	};
};

const mapSelect = (raw: unknown): SelectOptionItem<number> => {
	const item = toRecord(raw);
	return {
		text: asString(pick(item, "text", "Text")),
		value: asNumber(pick(item, "value", "Value")),
	};
};

const mapSelectOption = (raw: unknown): SelectOption => {
	const item = toRecord(raw);
	return {
		text: asString(pick(item, "text", "Text", "label", "Label", "name", "Name")),
		value: asString(pick(item, "value", "Value", "id", "Id", "code", "Code")),
	};
};

const mapSouche = (raw: unknown): SoucheItem => {
	const item = toRecord(raw);
	return {
		s_Intitule: asString(pick(item, "s_Intitule", "S_Intitule", "intitule", "Intitule", "label", "Label", "text", "Text")),
		cbMarq: asNumber(pick(item, "cbMarq", "CbMarq", "cbmarq", "id", "Id", "value", "Value")),
	};
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

export const parametresService = {
	async getParametre() {
		const response = await runWithFallback<unknown>([
			() => getWithFallback("/api/Parametres"),
			() => getWithFallback("/api/parametres"),
			() => getWithFallback("/Parametres/GetParams"),
		]);

		const wrapper = toRecord(response);
		if ("param" in wrapper || "isValid" in wrapper || "IsValid" in wrapper) {
			assertMaybeAction(response);
			return mapParametre(pick(wrapper, "param", "Param"));
		}
		return mapParametre(response);
	},

	async saveParametre(parametre: ParametreEntity, logoFile?: File, backgroundFile?: File) {
		const formData = new FormData();
		formData.append("PA_No", String(parametre.pA_No || 0));
		formData.append("PA_SMTP", parametre.pA_SMTP || "");
		formData.append("PA_EmailDisplayName", parametre.pA_EmailDisplayName || "");
		formData.append("PA_Port", String(parametre.pA_Port ?? ""));
		formData.append("PA_Mail", parametre.pA_Mail || "");
		formData.append("PA_MailCopie", parametre.pA_MailCopie || "");
		formData.append("PA_PWD", parametre.pA_PWD || "");
		formData.append("PA_SSL", String(Boolean(parametre.pA_SSL)));
		formData.append("PA_LogoSociete", parametre.pA_LogoSociete || "");
		formData.append("PA_ImgFondEcran", parametre.pA_ImgFondEcran || "");
		formData.append("D_RaisonSoc", parametre.d_RaisonSoc || "");
		formData.append("D_Profession", parametre.d_Profession || "");
		formData.append("D_Commentaire", parametre.d_Commentaire || "");
		formData.append("D_Adresse", parametre.d_Adresse || "");
		formData.append("D_Complement", parametre.d_Complement || "");
		formData.append("D_CodePostal", parametre.d_CodePostal || "");
		formData.append("D_Ville", parametre.d_Ville || "");
		formData.append("D_CodeRegion", parametre.d_CodeRegion || "");
		formData.append("D_Pays", parametre.d_Pays || "");
		formData.append("D_Telephone", parametre.d_Telephone || "");
		formData.append("D_Telecopie", parametre.d_Telecopie || "");
		formData.append("D_EMailSoc", parametre.d_EMailSoc || "");
		formData.append("D_Site", parametre.d_Site || "");
		formData.append("D_Siret", parametre.d_Siret || "");
		formData.append("D_Identifiant", parametre.d_Identifiant || "");
		formData.append("AR_RefDivers", parametre.aR_RefDivers || "");
		formData.append("PA_UserSage", parametre.pA_UserSage || "");
		formData.append("PA_Souche", String(parametre.pA_Souche ?? ""));
		formData.append("PA_CompteCredit", parametre.pA_CompteCredit || "");
		formData.append("PA_CompteDebit", parametre.pA_CompteDebit || "");
		formData.append("PA_Journal", parametre.pA_Journal || "");
		formData.append("PA_DossierSage", parametre.pA_DossierSage || "");

		if (logoFile) formData.append("LogoPic", logoFile);
		if (backgroundFile) formData.append("ImgFondEcran", backgroundFile);

		const response = await runWithFallback<unknown>([
			() =>
				postWithFallback("/api/Parametres", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
			() =>
				postWithFallback("/api/parametres", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
			() =>
				postWithFallback("/Parametres/Create", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getDepotsAutorises(filter: GridFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/Parametres/depots/autorises", filter),
				() => getWithFallback("/api/parametres/depots/autorises", filter),
				() => getWithFallback("/Parametres/GetDepot_Autorise", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapDepotAutorise),
		} as GridResponse<DepotAutorise>;
	},

	async getDepots(filter: GridFilter = { pageIndex: 1, pageSize: 500 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/Parametres/depots", filter),
				() => getWithFallback("/api/parametres/depots", filter),
				() => getWithFallback("/Parametres/GetDepot", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapDepot),
		} as GridResponse<DepotItem>;
	},

	async addDepotAutorise(depotIds: number[]) {
		const list = encodeURIComponent(JSON.stringify(depotIds));
		const response = await runWithFallback<unknown>([
			() => postWithFallback("/api/Parametres/depots/autorises", depotIds),
			() => postWithFallback("/api/parametres/depots/autorises", depotIds),
			() => postWithFallback(`/Parametres/AddOrUpdateDepot_Autorise?list=${list}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteDepotAutorise(daNo: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/Parametres/depots/autorises/${daNo}`),
			() => deleteWithFallback(`/api/parametres/depots/autorises/${daNo}`),
			() => postWithFallback(`/Parametres/DeleteDepot_Autorise?DA_No=${daNo}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getAffairesAutorisees(filter: GridFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/Parametres/affaires/autorisees", filter),
				() => getWithFallback("/api/parametres/affaires/autorisees", filter),
				() => getWithFallback("/Parametres/GetAffaires_Autorise", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapAffaireAutorise),
		} as GridResponse<AffaireAutorise>;
	},

	async getAffaires(filter: GridFilter = { pageIndex: 1, pageSize: 500 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/Parametres/affaires", filter),
				() => getWithFallback("/api/parametres/affaires", filter),
				() => getWithFallback("/Parametres/GetAffaire", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapAffaire),
		} as GridResponse<AffaireItem>;
	},

	async addAffairesAutorisees(affaireIds: string[]) {
		const list = encodeURIComponent(JSON.stringify(affaireIds));
		const response = await runWithFallback<unknown>([
			() => postWithFallback("/api/Parametres/affaires/autorisees", affaireIds),
			() => postWithFallback("/api/parametres/affaires/autorisees", affaireIds),
			() => postWithFallback(`/Parametres/AddOrUpdateAffaires_Autorise?list=${list}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteAffaireAutorisee(faNo: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/Parametres/affaires/autorisees/${faNo}`),
			() => deleteWithFallback(`/api/parametres/affaires/autorisees/${faNo}`),
			() => postWithFallback(`/Parametres/DeleteAffaires_Autorise?FA_No=${faNo}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getCategoriesAutorisees(filter: GridFilter = { pageIndex: 1, pageSize: 100 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/Parametres/categories/autorisees", filter),
				() => getWithFallback("/api/parametres/categories/autorisees", filter),
				() => getWithFallback("/Parametres/GetCategorie_Autorise", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapCategorieAutorise),
		} as GridResponse<CategorieAutorise>;
	},

	async getCataloguesForSelect(clNoParent = 0) {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Parametres/catalogues", { cl_NoParent: clNoParent }),
			() => getWithFallback("/api/parametres/catalogues", { cl_NoParent: clNoParent }),
			() => getWithFallback("/Parametres/GetCataloguesForSelect", { cl_NoParent: clNoParent }),
		]);
		return Array.isArray(response) ? response.map(mapSelect) : [];
	},

	async addOrUpdateCategorieAutorisee(payload: CategoriePayload) {
		const body = {
			CA_No: payload.cA_No,
			CL_No1: payload.cL_No1,
			CL_No2: payload.cL_No2,
			CL_No3: payload.cL_No3,
			CL_No4: payload.cL_No4,
		};
		const formData = new FormData();
		formData.append("CA_No", String(payload.cA_No));
		formData.append("CL_No1", String(payload.cL_No1));
		formData.append("CL_No2", String(payload.cL_No2));
		formData.append("CL_No3", String(payload.cL_No3));
		formData.append("CL_No4", String(payload.cL_No4));

		const response = await runWithFallback<unknown>([
			() => postWithFallback("/api/Parametres/categories/autorisees", body),
			() => postWithFallback("/api/parametres/categories/autorisees", body),
			() => postWithFallback("/Parametres/AddOrUpdateCategorie_Autorise", formData),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteCategorieAutorisee(caNo: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/Parametres/categories/autorisees/${caNo}`),
			() => deleteWithFallback(`/api/parametres/categories/autorisees/${caNo}`),
			() => postWithFallback(`/Parametres/DeleteCategorie_Autorise?CA_No=${caNo}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async getRectificationMotifs(filter: GridFilter = { pageIndex: 1, pageSize: 200 }) {
		const grid = ensureGrid<unknown>(
			await runWithFallback<unknown>([
				() => getWithFallback("/api/Parametres/motifs", filter),
				() => getWithFallback("/api/parametres/motifs", filter),
				() => getWithFallback("/Parametres/GetRectification_Motif", filter),
			]),
		);
		return {
			...grid,
			data: grid.data.map(mapMotif),
		} as GridResponse<MotifRectification>;
	},

	async getNextMotifCode() {
		const response = await runWithFallback<unknown>([
			() => getWithFallback("/api/Parametres/motifs/next-code"),
			() => getWithFallback("/api/parametres/motifs/next-code"),
			() => getWithFallback("/Parametres/GetMaxRectification_Motif"),
		]);
		const data = toRecord(response);
		return asString(pick(data, "code", "Code", "nextCode", "NextCode"));
	},

	async addOrUpdateRectificationMotif(payload: MotifRectificationPayload) {
		const body = {
			MR_No: payload.mR_No,
			MR_Code: payload.mR_Code,
			MR_Desgination: payload.mR_Desgination,
			MR_TypeMotif: payload.mR_TypeMotif,
			MR_TypeDemande: payload.mR_TypeDemande,
		};
		const formData = new FormData();
		formData.append("MR_No", String(payload.mR_No));
		formData.append("MR_Code", payload.mR_Code);
		formData.append("MR_Desgination", payload.mR_Desgination);
		formData.append("MR_TypeMotif", String(payload.mR_TypeMotif));
		formData.append("MR_TypeDemande", String(payload.mR_TypeDemande));

		const response = await runWithFallback<unknown>([
			() => postWithFallback("/api/Parametres/motifs", body),
			() => postWithFallback("/api/parametres/motifs", body),
			() => postWithFallback("/Parametres/AddOrUpdateRectification_Motif", formData),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	async deleteRectificationMotif(motifNo: number) {
		const response = await runWithFallback<unknown>([
			() => deleteWithFallback(`/api/Parametres/motifs/${motifNo}`),
			() => deleteWithFallback(`/api/parametres/motifs/${motifNo}`),
			() => postWithFallback(`/Parametres/DeleteRectification_Motif?mR_No=${motifNo}`, null),
		]);
		assertMaybeAction(response);
		return response as ActionResponse;
	},

	// Comptabilisation dropdowns
	async getJournaux() {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Parametres/journaux"),
			() => getWithFallback("/api/parametres/journaux"),
			() => getWithFallback("/Parametres/GETF_JOURNAUX"),
		]);
		return Array.isArray(response) ? response.map(mapSelectOption) : [];
	},

	async getComptes() {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Parametres/comptes"),
			() => getWithFallback("/api/parametres/comptes"),
			() => getWithFallback("/Parametres/GETF_COMPTEG"),
		]);
		return Array.isArray(response) ? response.map(mapSelectOption) : [];
	},

	async getUsersSage() {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Parametres/users-sage"),
			() => getWithFallback("/api/parametres/users-sage"),
			() => getWithFallback("/Parametres/GetUsers_Sage"),
		]);
		if (!Array.isArray(response)) return [];
		return response.map((u) => {
			// Handle both string and object formats
			if (typeof u === "string") return u;
			const item = toRecord(u);
			return asString(pick(item, "text", "Text", "value", "Value", "user", "User", "name", "Name"));
		});
	},

	async getSouches() {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Parametres/souches"),
			() => getWithFallback("/api/parametres/souches"),
			() => getWithFallback("/Parametres/GetSouches_Sage"),
		]);
		return Array.isArray(response) ? response.map(mapSouche) : [];
	},

	async getArticles() {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Parametres/articles"),
			() => getWithFallback("/api/parametres/articles"),
			() => getWithFallback("/Parametres/LstArticle"),
			() => getWithFallback("/Parametres/GetArticles"),
		]);
		console.log("API Articles Response:", response);
		if (!Array.isArray(response)) {
			console.warn("Articles response is not an array:", response);
			return [];
		}
		const mapped = response.map(mapSelectOption);
		console.log("Mapped Articles:", mapped);
		return mapped;
	},
};
