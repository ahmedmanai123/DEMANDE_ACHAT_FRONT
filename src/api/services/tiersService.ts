import type { F_COMPTETDto, TiersApiResponse, TiersFilter } from "../../types/tiers";
import apiClient from "../apiClient";

export const tiersService = {
	// GET api/tiers?CT_Type=1&pageIndex=1&pageSize=10
	getTiers: async (filter: TiersFilter): Promise<TiersApiResponse> => {
		const response = await apiClient.get<TiersApiResponse>("/api/tiers", {
			params: filter,
		});
		return response.data;
	},

	// GET api/tiers/{id}
	getTierById: async (id: number): Promise<F_COMPTETDto> => {
		const response = await apiClient.get<F_COMPTETDto>(`/api/tiers/${id}`);
		return response.data;
	},

	// POST api/tiers
	createTier: async (tier: Omit<F_COMPTETDto, "cbMarq">): Promise<F_COMPTETDto> => {
		const response = await apiClient.post<F_COMPTETDto>("/api/tiers", tier);
		return response.data;
	},

	// PUT api/tiers/{id}
	updateTier: async (tier: F_COMPTETDto): Promise<F_COMPTETDto> => {
		const response = await apiClient.put<F_COMPTETDto>(`/api/tiers/${tier.cbMarq}`, tier);
		return response.data;
	},

	// DELETE api/tiers/{id}
	deleteTier: async (id: number): Promise<void> => {
		await apiClient.delete(`/api/tiers/${id}`);
	},

	// GET api/tiers/search?q={query}
	searchTiers: async (query: string, CT_Type?: number): Promise<F_COMPTETDto[]> => {
		const response = await apiClient.get<F_COMPTETDto[]>("/api/tiers/search", {
			params: { q: query, CT_Type },
		});
		return response.data;
	},
};
