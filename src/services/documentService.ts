import apiClient from "@/api/apiClient";
import type { AxiosError, AxiosRequestConfig } from "axios";
import type { Type_Validation_Document } from "@/types/besoin";

const BASES = ["/api/document", "/api/Document", "/Document"];

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

const shouldTryNext = (error: unknown): boolean => {
	const axiosError = error as AxiosError;
	return axiosError.response?.status === 404 || axiosError.response?.status === 405;
};

const normalizePath = (path = "") => path.replace(/^\/+/, "");

const candidateUrls = (pathOrUrl: string): string[] => {
	if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return [pathOrUrl];
	if (pathOrUrl.startsWith("/api/") || pathOrUrl.startsWith("/Document")) return [pathOrUrl];
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

export const getDocuments = async (filter: Record<string, unknown> = {}) =>
	getWithFallback<unknown>("", filter);

export const getEtatBtnTransformerDocument = async (epNumero: string) =>
	getWithFallback<unknown>(`etat-btn-transformer/${encodeURIComponent(epNumero)}`);

export const getDetailsDocument = async (epNumero = "", tpNo = 0) =>
	getWithFallback<unknown>("details", { epNumero, tpNo });

export const saveDetailsDocument = async (entete: Record<string, unknown>) =>
	postWithFallback<{ EP_Numero: string }>("details", entete);

export const getInfoEnteteDocument = async (lpNo: number) =>
	getWithFallback<unknown>(`info-entete/${lpNo}`);

export const changerEtatDocument = async (
	epNumero: string,
	tpNo: number,
	bNo: number,
	typeValidation: Type_Validation_Document,
) =>
	postWithFallback<unknown>("changer-etat", null, {
		params: { epNumero, tpNo, bNo, typeValidation },
	});

export const transformerBonCommande = async (epNumero: string, tpNo: number, tpNoTransf: number, gardeTrace: boolean) =>
	postWithFallback<unknown>("transformer", null, {
		params: { epNumero, tpNo, tpNoTransf, gardeTrace },
	});

export const validerDocumentSage = async (epNumero: string, tpNo: number) =>
	postWithFallback<{ EP_NumeroSage: string }>("valider-sage", null, { params: { epNumero, tpNo } });

export const annulerDocumentSage = async (epNumero: string, tpNo: number) =>
	postWithFallback<unknown>("annuler-sage", null, { params: { epNumero, tpNo } });

export const comptabiliserDocument = async (epNumero: string, tpNo: number) =>
	postWithFallback<unknown>("comptabiliser", null, { params: { epNumero, tpNo } });

export const getChampsLibreEntete = async (bNo: number, lpNo: number) =>
	getWithFallback<unknown>("champs-libres/entete", { bNo, lpNo });

export const getChampsLibreLigne = async (bNo: number, lpNo: number) =>
	getWithFallback<unknown>("champs-libres/ligne", { bNo, lpNo });

export const getLignesDocument = async (filter: Record<string, unknown> = {}) =>
	getWithFallback<unknown>("lignes", filter);

export const addOrUpdateLigneDocument = async (
	epNumero: string,
	tpNo: number,
	ligneView: Record<string, unknown>,
) =>
	postWithFallback<unknown>("lignes", ligneView, {
		params: { epNumero, tpNo },
	});

export const deleteLigneDocument = async (lpNo: number) => deleteWithFallback<unknown>(`lignes/${lpNo}`);

export const getTotauxDocument = async (epNumero: string, tpNo: number) =>
	getWithFallback<unknown>("totaux", { epNumero, tpNo });

export const getTaxesLignes = async (epNumero: string, tpNo: number) =>
	getWithFallback<unknown>("taxes", { epNumero, tpNo });

export const getDupliquerDocument = async (epNumero: string, tpNo: number) =>
	getWithFallback<unknown>(`dupliquer/${encodeURIComponent(epNumero)}/${tpNo}`);

export const dupliquerEnteteDocument = async (payload: Record<string, unknown>) =>
	postWithFallback<unknown>("dupliquer", payload);

export const documentService = {
	getDocuments,
	getEtatBtnTransformerDocument,
	getDetailsDocument,
	saveDetailsDocument,
	getInfoEnteteDocument,
	changerEtatDocument,
	transformerBonCommande,
	validerDocumentSage,
	annulerDocumentSage,
	comptabiliserDocument,
	getChampsLibreEntete,
	getChampsLibreLigne,
	getLignesDocument,
	addOrUpdateLigneDocument,
	deleteLigneDocument,
	getTotauxDocument,
	getTaxesLignes,
	getDupliquerDocument,
	dupliquerEnteteDocument,
};
