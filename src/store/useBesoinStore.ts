// src/stores/useBesoinStore.ts
import { create } from "zustand";
import * as besoinService from "@/services/besoinservice";
import type { IBesoin, IBesoinFilter, IBesoinArticle } from "@/types/besoin";

interface BesoinState {
	besoins: IBesoin[];
	totalCount: number;
	loading: boolean;
	selectedId: number;
	filter: IBesoinFilter;
	articles: IBesoinArticle[];
	articlesLoading: boolean;

	setFilter: (f: Partial<IBesoinFilter>) => void;
	setSelectedId: (id: number) => void;
	fetchBesoins: () => Promise<void>;
	fetchArticles: (b_No: number, bT_Id?: number) => Promise<void>;
	deleteArticle: (bA_No: number, b_No: number) => Promise<void>;
}

export const useBesoinStore = create<BesoinState>((set, get) => ({
	besoins: [],
	totalCount: 0,
	loading: false,
	selectedId: 0,
	articles: [],
	articlesLoading: false,
	filter: {
		pageIndex: 1,
		pageSize: 20,
		b_Etat_Besoin: 0, // Tous
	},

	setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f, pageIndex: 1 } })),

	setSelectedId: (id) => set({ selectedId: id }),

	fetchBesoins: async () => {
		set({ loading: true });
		try {
			const response = await besoinService.getBesoins(get().filter);
			const data = (response as any)?.data ?? response;
			set({
				besoins: data?.data ?? data ?? [],
				totalCount: data?.itemsCount ?? data?.totalCount ?? 0,
				loading: false,
			});
		} catch {
			set({ loading: false });
		}
	},

	fetchArticles: async (b_No, bT_Id) => {
		set({ articlesLoading: true });
		try {
			const response = await besoinService.getArticlesBesoin({
				pageIndex: 1,
				pageSize: 100,
				b_BesoinId: b_No,
				bT_Id,
			});
			const data = (response as any)?.data ?? response;
			set({
				articles: data?.data ?? data ?? [],
				articlesLoading: false,
			});
		} catch {
			set({ articlesLoading: false });
		}
	},

	deleteArticle: async (bA_No, b_No) => {
		await besoinService.deleteArticleBesoin(bA_No);
		await get().fetchArticles(b_No);
	},
}));
