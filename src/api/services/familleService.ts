import apiClient from "@/api/apiClient";
import type {
	Catalogue,
	FAMILLEDto,
	FamilleApiResponse,
	FamilleCentral,
	FamilleFilter,
} from "@/types/famille";

const shouldTryNext = (error: unknown) => {
	const axiosError = error as { response?: { status?: number } };
	return axiosError.response?.status === 404 || axiosError.response?.status === 405;
};

const mapCatalogue = (raw: unknown): Catalogue => {
	const item = (raw ?? {}) as Record<string, unknown>;
	return {
		Value: Number(item.Value ?? item.value ?? item.CL_No ?? item.cL_No ?? 0),
		Text: String(item.Text ?? item.text ?? ""),
		IsParent: Boolean(item.IsParent ?? item.isParent ?? false),
	};
};

const getCataloguesWithFallback = async (cl_NoParent: number, cL_Niveau: number): Promise<Catalogue[]> => {
	const requests = [
		() =>
			apiClient.get<Catalogue[]>("/api/famille/catalogues", {
				params: { cl_NoParent, cL_Niveau },
			}),
		() =>
			apiClient.get<Catalogue[]>("/api/famille/select/catalogues", {
				params: { cl_NoParent, cL_Niveau },
			}),
		() =>
			apiClient.get<Catalogue[]>("/api/Parametres/catalogues", {
				params: { cl_NoParent },
			}),
		() =>
			apiClient.get<Catalogue[]>("/api/parametres/catalogues", {
				params: { cl_NoParent },
			}),
		() =>
			apiClient.get<Catalogue[]>("/Parametres/GetCataloguesForSelect", {
				params: { cl_NoParent },
			}),
	];

	let lastError: unknown;

	for (const request of requests) {
		try {
			const response = await request();
			return Array.isArray(response.data) ? response.data.map(mapCatalogue) : [];
		} catch (error) {
			lastError = error;
			if (shouldTryNext(error)) continue;
			throw error;
		}
	}

	throw lastError;
};

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
		return getCataloguesWithFallback(cl_NoParent, cL_Niveau);
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
