import { create } from "zustand";
import { tiersService } from "@/api/services/tiersService";
import type { F_COMPTETDto } from "@/types/tiers";

interface TiersState {
	// Data
	tiers: F_COMPTETDto[];
	selectedTier: F_COMPTETDto | null;
	loading: boolean;
	error: string | null;

	// Pagination
	pagination: {
		current: number;
		pageSize: number;
		total: number;
	};

	// Filters
	filters: {
		CT_Type: number;
		CT_Sommeil?: number;
		search?: string;
	};
}

interface TiersActions {
	// Data operations
	fetchTiers: () => Promise<void>;
	createTier: (tier: Omit<F_COMPTETDto, "cbMarq">) => Promise<void>;
	updateTier: (tier: F_COMPTETDto) => Promise<void>;
	deleteTier: (id: number) => Promise<void>;
	getTierById: (id: number) => Promise<F_COMPTETDto | null>;

	// State management
	setSelectedTier: (tier: F_COMPTETDto | null) => void;
	setPagination: (pagination: Partial<TiersState["pagination"]>) => void;
	setFilters: (filters: Partial<TiersState["filters"]>) => void;
	setTiers: (tiers: F_COMPTETDto[]) => void;
	setError: (error: string | null) => void;
	reset: () => void;
}

const initialState: TiersState = {
	tiers: [],
	selectedTier: null,
	loading: false,
	error: null,
	pagination: {
		current: 1,
		pageSize: 10,
		total: 0,
	},
	filters: {
		CT_Type: 1, // Fournisseurs par défaut
	},
};

export const useTiersStore = create<TiersState & TiersActions>((set, get) => ({
	...initialState,

	fetchTiers: async () => {
		set({ loading: true, error: null });
		try {
			const { pagination, filters } = get();
			const params = {
				pageIndex: pagination.current,
				pageSize: pagination.pageSize,
				...filters,
			};

			const response = await tiersService.getTiers(params);
			const responseTotal = (response as any).itemsCount || response.total || 0;

			set({
				tiers: response.data || [],
				pagination: {
					...pagination,
					total: responseTotal,
				},
				loading: false,
			});
		} catch (error: any) {
			set({
				error: error.message || "Erreur lors du chargement des tiers",
				loading: false,
			});
		}
	},

	createTier: async (tier) => {
		set({ loading: true, error: null });
		try {
			await tiersService.createTier(tier);
			await get().fetchTiers(); // Refresh the list
		} catch (error: any) {
			set({
				error: error.message || "Erreur lors de la création du tiers",
				loading: false,
			});
			throw error;
		}
	},

	updateTier: async (tier) => {
		set({ loading: true, error: null });
		try {
			await tiersService.updateTier(tier);
			await get().fetchTiers(); // Refresh the list
		} catch (error: any) {
			set({
				error: error.message || "Erreur lors de la mise à jour du tiers",
				loading: false,
			});
			throw error;
		}
	},

	deleteTier: async (id) => {
		set({ loading: true, error: null });
		try {
			await tiersService.deleteTier(id);

			// Remove from local state
			const { tiers } = get();
			set({
				tiers: tiers.filter((tier) => tier.cbMarq !== id),
				loading: false,
			});
		} catch (error: any) {
			set({
				error: error.message || "Erreur lors de la suppression du tiers",
				loading: false,
			});
			throw error;
		}
	},

	getTierById: async (id) => {
		try {
			return await tiersService.getTierById(id);
		} catch (error: any) {
			set({
				error: error.message || "Erreur lors de la récupération du tiers",
			});
			return null;
		}
	},

	setSelectedTier: (tier) => {
		set({ selectedTier: tier });
	},

	setPagination: (pagination) => {
		set((state) => ({
			pagination: { ...state.pagination, ...pagination },
		}));
	},

	setFilters: (filters) => {
		set((state) => ({
			filters: { ...state.filters, ...filters },
			pagination: { ...state.pagination, current: 1 }, // Reset to first page when filters change
		}));
	},

	setTiers: (tiers) => {
		set({ tiers, loading: false });
	},

	setError: (error) => {
		set({ error });
	},

	reset: () => {
		set(initialState);
	},
}));
