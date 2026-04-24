import type { AxiosError, AxiosRequestConfig } from "axios";
import apiClient from "@/api/apiClient";
import type { ChangePasswordModel, GridResponse, Role, SelectOption, UserDto, UserFilter } from "@/types/account";

const BASES = ["/api/Account", "/api/account", "/Account"];

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
	if (pathOrUrl.startsWith("/Account") || pathOrUrl.startsWith("/api/")) return [pathOrUrl];

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
	const message = asString(pick(data, "message", "Message"));

	// Extract validation errors from backend response
	if (axiosError.response?.status === 400 && data?.errors) {
		const errors = data.errors as Record<string, string[]>;
		const errorMessages = Object.values(errors).flat();
		if (errorMessages.length > 0) {
			return errorMessages.join("\n");
		}
	}

	return message || axiosError.message || "Erreur serveur.";
};

async function getWithFallback<T>(
	pathOrUrl: string,
	params?: Record<string, string | number | boolean | undefined>,
	config?: AxiosRequestConfig,
): Promise<T> {
	let lastError: unknown;
	for (const url of candidateUrls(pathOrUrl)) {
		try {
			console.log(`[accountService] GET Request to: ${url}`, { params });
			const response = await apiClient.get<T>(url, { ...(config || {}), params });
			console.log(`[accountService] GET Response from ${url}:`, response.data);
			return response.data as T;
		} catch (error) {
			lastError = error;
			console.error(`[accountService] GET Failed for ${url}:`, error);
			if (shouldTryNext(error)) continue;
			// Throw original error to preserve response data
			throw error;
		}
	}
	// Throw original error to preserve response data
	throw lastError;
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
			// Throw original error to preserve response data for validation messages
			throw error;
		}
	}
	// Throw original error to preserve response data for validation messages
	throw lastError;
}

async function putWithFallback<T>(pathOrUrl: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
	let lastError: unknown;
	for (const url of candidateUrls(pathOrUrl)) {
		try {
			const response = await apiClient.put<T>(url, data, appendXsrfHeader(config));
			return response.data as T;
		} catch (error) {
			lastError = error;
			if (shouldTryNext(error)) continue;
			// Throw original error to preserve response data
			throw error;
		}
	}
	// Throw original error to preserve response data
	throw lastError;
}

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

const mapRole = (raw: unknown): Role => {
	const item = toRecord(raw);
	return {
		ro_No: asNumber(pick(item, "ro_No", "RO_No", "rono", "value", "Value")) || 0,
		ro_Intitule: asString(pick(item, "ro_Intitule", "RO_Intitule", "text", "Text", "label", "Label")),
		selected: item.selected === true || item.Selected === true,
	};
};

const mapSelectOption = (raw: unknown): SelectOption => {
	const item = toRecord(raw);
	return {
		text: asString(pick(item, "text", "Text", "label", "Label", "name", "Name")),
		value: asString(pick(item, "value", "Value", "id", "Id", "code", "Code")),
		selected: item.selected === true || item.Selected === true,
	};
};

export const accountService = {
	async getUsers(filter: UserFilter) {
		const params: Record<string, string | number | boolean | undefined> = {};
		// Use PascalCase to match C# ContactFilter model binding
		if (filter.pageIndex) params.PageIndex = filter.pageIndex;
		if (filter.pageSize) params.PageSize = filter.pageSize;
		if (filter.search) params.Search = filter.search;
		if (filter.us_TypeCompte !== undefined && filter.us_TypeCompte !== -1) params.US_TypeCompte = filter.us_TypeCompte;
		if (filter.ro_No) params.RO_No = filter.ro_No;

		console.log("GetUsers params:", params);

		const response = await runWithFallback<GridResponse<UserDto>>([
			() => getWithFallback("/api/account/GetUsers", params),
		]);
		return response;
	},

	async getUserById(id: string) {
		const response = await runWithFallback<UserDto>([
			() => getWithFallback(`/api/account/users/${id}`),
			() => getWithFallback(`/api/Account/users/${id}`),
			() => getWithFallback("/Account/GetUser", { id }),
		]);
		return response;
	},

	async createUser(userData: any) {
		const response = await runWithFallback<any>([
			// Match backend endpoint: POST /api/account/register (expects JSON, not FormData)
			() => postWithFallback("/api/account/register", userData),
			() => postWithFallback("/api/Account/register", userData),
			() => postWithFallback("/Account/Register", userData),
		]);
		return response;
	},

	async updateUser(id: string, userData: any) {
		const response = await runWithFallback<any>([
			// Backend uses same register endpoint for updates (expects JSON)
			() => postWithFallback("/api/account/register", userData),
			() => postWithFallback("/api/Account/register", userData),
			() => postWithFallback("/Account/Register", userData),
		]);
		return response;
	},

	async getRoles() {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Account/GetRoles"),
			() => getWithFallback("/api/account/GetRoles"),
			() => getWithFallback("/Account/GetRoles"),
		]);
		return Array.isArray(response) ? response.map(mapRole) : [];
	},

	async getRolesByAccountType(typeCompte: number, role: number = 0) {
		const response = await runWithFallback<unknown[]>([
			// Match backend endpoint: /api/account/roles/by-type-compte
			() => getWithFallback("/api/account/roles/by-type-compte", { filter: typeCompte, role }),
			() => getWithFallback("/api/Account/roles/by-type-compte", { filter: typeCompte, role }),
			() => getWithFallback("/Account/FetchRoleByCompte", { filter: typeCompte, role }),
		]);
		return Array.isArray(response) ? response.map(mapSelectOption) : [];
	},

	async getDepots(userId: string = "") {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Account/GetDepotsAutoriser", { userId }),
			() => getWithFallback("/api/account/GetDepotsAutoriser", { userId }),
			() => getWithFallback("/Account/GetDepotsAutoriser", { userId }),
		]);
		return Array.isArray(response) ? response.map(mapSelectOption) : [];
	},

	async getSalaries(id: number = 0) {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Account/GetListSalaries", { id }),
			() => getWithFallback("/api/account/GetListSalaries", { id }),
			() => getWithFallback("/Account/GetListSalaries", { id }),
		]);
		return Array.isArray(response) ? response.map(mapSelectOption) : [];
	},

	async getResponsables(id: string = "") {
		const response = await runWithFallback<unknown[]>([
			() => getWithFallback("/api/Account/ListResponsables", { id }),
			() => getWithFallback("/api/account/ListResponsables", { id }),
			() => getWithFallback("/Account/ListResponsables", { id }),
		]);
		return Array.isArray(response) ? response.map(mapSelectOption) : [];
	},

	async blockUser(id: string, date?: string) {
		const response = await runWithFallback<any>([
			() => postWithFallback("/api/Account/users/block", { id, date }),
			() => postWithFallback("/api/account/users/block", { id, date }),
			() => postWithFallback("/Account/BlockUser", { id, date }),
		]);
		return response;
	},

	async unblockUser(id: string) {
		const response = await runWithFallback<any>([
			() => postWithFallback("/api/Account/users/unblock", { id }),
			() => postWithFallback("/api/account/users/unblock", { id }),
			() => postWithFallback("/Account/DeBlockUser", { id }),
		]);
		return response;
	},

	async changePassword(model: ChangePasswordModel) {
		const response = await runWithFallback<any>([
			() => postWithFallback("/api/Account/users/change-password", model),
			() => postWithFallback("/api/account/users/change-password", model),
			() => postWithFallback("/Account/ChangePassword", model),
		]);
		return response;
	},

	async getCurrentUser() {
		const response = await runWithFallback<UserDto>([
			() => getWithFallback("/api/Account/GetCurrentUser"),
			() => getWithFallback("/api/account/GetCurrentUser"),
			() => getWithFallback("/Account/GetCurrentUser"),
		]);
		return response;
	},
};
