// src/stores/useBesoinStore.ts
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { create } from "zustand";
import * as besoinService from "@/services/besoinservice";
import { Etat_Besoin, type IBesoin, type IBesoinArticle, type IBesoinFilter } from "@/types/besoin";

dayjs.extend(isoWeek);

const defaultWeekRange = (): Pick<IBesoinFilter, "dateDebut" | "dateFin"> => {
	const start = dayjs().startOf("isoWeek");
	const end = dayjs().endOf("isoWeek");
	return { dateDebut: start.format("YYYY-MM-DD"), dateFin: end.format("YYYY-MM-DD") };
};

interface BesoinState {
	besoins: IBesoin[];
	totalCount: number;
	loading: boolean;
	selectedId: number;
	filter: IBesoinFilter;
	/** Colonnes dynamiques (clés métier), renseignées depuis la 1ʳᵉ réponse API comme la vue MVC. */
	champsLibreColumnKeys: string[];
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
	champsLibreColumnKeys: [],
	articles: [],
	articlesLoading: false,
	filter: {
		pageIndex: 1,
		pageSize: 20,
		b_Etat_Besoin: Etat_Besoin.Tous,
		...defaultWeekRange(),
	},

	setFilter: (f) =>
		set((s) => {
			const merged = { ...s.filter, ...f };
			const keys = Object.keys(f);
			if (keys.length === 0) return { filter: merged };
			const onlyPagination = keys.every((k) => k === "pageIndex" || k === "pageSize");
			if (!onlyPagination) merged.pageIndex = 1;
			return { filter: merged };
		}),

	setSelectedId: (id) => set({ selectedId: id }),

	fetchBesoins: async () => {
		set({ loading: true });
		try {
			const response = await besoinService.getBesoins(get().filter);
			const champsMeta = response?.ChampsLibres ?? response?.champsLibres;
			const newKeys =
				champsMeta && typeof champsMeta === "object" && !Array.isArray(champsMeta)
					? Object.keys(champsMeta as Record<string, unknown>)
					: [];
			set((state) => ({
				besoins: response?.data ?? [],
				totalCount: response?.itemsCount ?? 0,
				loading: false,
				champsLibreColumnKeys: newKeys.length > 0 ? newKeys : state.champsLibreColumnKeys,
			}));
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
			set({
				articles: response?.data ?? [],
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
