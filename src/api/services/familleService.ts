import apiClient from "@/api/apiClient";
import type {
	Catalogue,
	F_FAMILLEDto,
	FAMILLEDto,
	FamilleApiResponse,
	FamilleCentral,
	FamilleFilter,
} from "@/types/famille";

const familleService = {
	// GET api/famille
	getFamilles: async (filter: FamilleFilter): Promise<FamilleApiResponse> => {
		const response = await apiClient.get<FamilleApiResponse>("/api/famille", {
			params: filter,
		});
		return response.data;
	},

	// GET api/famille/{id}
	getFamilleById: async (id: number): Promise<FAMILLEDto> => {
		const response = await apiClient.get<FAMILLEDto>(`/api/famille/${id}`);
		return response.data;
	},

	// POST api/famille
	createFamille: async (famille: Omit<FAMILLEDto, "cbMarq">): Promise<FAMILLEDto> => {
		const response = await apiClient.post<FAMILLEDto>("/api/famille", famille);
		return response.data;
	},

	// PUT api/famille/{id}
	updateFamille: async (famille: FAMILLEDto): Promise<FAMILLEDto> => {
		const response = await apiClient.put<FAMILLEDto>(`/api/famille/${famille.cbMarq}`, famille);
		return response.data;
	},

	// DELETE api/famille/{id}
	deleteFamille: async (id: number): Promise<void> => {
		await apiClient.delete(`/api/famille/${id}`);
	},

	// GET api/famille/catalogues
	getCatalogues: async (cl_NoParent: number, cL_Niveau: number): Promise<Catalogue[]> => {
		const response = await apiClient.get<Catalogue[]>("/api/famille/catalogues", {
			params: { cl_NoParent, cL_Niveau },
		});
		return response.data;
	},

	// GET api/famille/central
	getFamillesCentral: async (): Promise<FamilleCentral[]> => {
		const response = await apiClient.get<FamilleCentral[]>("/api/famille/central");
		return response.data;
	},

	// GET api/famille/search?q={query}
	searchFamilles: async (query: string): Promise<FAMILLEDto[]> => {
		const response = await apiClient.get<FAMILLEDto[]>("/api/famille/search", {
			params: { q: query },
		});
		return response.data;
	},
};

export default familleService;
