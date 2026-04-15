// Si votre apiClient ressemble à :
// const apiClient = { get: (url: string) => ... }  ← 1 seul arg

// src/api/articleApi.ts
import apiClient from "./apiClient";
import type { IArticleFilter } from "@/types/article";

const BASE = "/api/article";

export const articleApi = {
	getArticles: (filter: IArticleFilter) =>
		apiClient.get(`${BASE}?${new URLSearchParams(filter as unknown as Record<string, string>).toString()}`, {}),

	getById: (cbMarq: number) => apiClient.get(`${BASE}/${cbMarq}`, {}),

	save: (formData: FormData) => apiClient.post(BASE, formData, {}),

	remove: (cbMarq: number) => apiClient.delete(`${BASE}/${cbMarq}`, {}),

	getDepots: () => apiClient.get(`${BASE}/depots-autorises`, {}),

	getCatalogues: (clNoParent = 0, clNiveau = 0) =>
		apiClient.get(`${BASE}/select/catalogues?cl_NoParent=${clNoParent}&cL_Niveau=${clNiveau}`, {}),

	getInfoPrix: (aR_Ref: string, cT_Num: string, dL_Qte: number) =>
		apiClient.get(`${BASE}/info-prix?aR_Ref=${aR_Ref}&cT_Num=${cT_Num}&dL_Qte=${dL_Qte}&typeArt=0`, {}),
};
