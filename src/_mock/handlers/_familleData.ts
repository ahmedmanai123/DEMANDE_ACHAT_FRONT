import { HttpResponse, http } from "msw";
import type { Catalogue, FAMILLEDto, FamilleApiResponse, FamilleCentral } from "@/types/famille";

// Mock data for catalogues
const mockCatalogues: Catalogue[] = [
	{ Value: 0, Text: "Tous", IsParent: true },
	{ Value: 1, Text: "Accessoires", IsParent: true },
	{ Value: 2, Text: "Bijoux", IsParent: true },
	{ Value: 3, Text: "Hors catalogue", IsParent: false },
	{ Value: 4, Text: "Montres", IsParent: true },
	{ Value: 5, Text: "Objets précieux", IsParent: false },
	{ Value: 6, Text: "Orfevrerie", IsParent: false },
	{ Value: 7, Text: "Prestations", IsParent: false },
	{ Value: 8, Text: "Test", IsParent: false },
	{ Value: 9, Text: "ideapad", IsParent: false },
];

// Mock data for familles
const mockFamilles: FAMILLEDto[] = [
	{
		cbMarq: 1,
		FA_CodeFamille: "BIJCHAINF",
		FA_Intitule: "Bijoux Chaînes Fines",
		FA_Type: 0,
		FA_Central: 1,
		CL_No1: 2,
		CL_No2: 23,
		CL_No3: 233,
		CL_No4: 2332,
		CL_Intitule1: "Bijoux Or",
		FA_DateCreation: "2024-01-01T00:00:00",
		FA_DateModification: "2024-01-01T00:00:00",
	},
	{
		cbMarq: 2,
		FA_CodeFamille: "BIJCHAINM",
		FA_Intitule: "Bijoux Chaînes Massives",
		FA_Type: 1,
		FA_Central: 1,
		CL_No1: 2,
		CL_No2: 23,
		CL_No3: 233,
		CL_No4: 2333,
		CL_Intitule1: "Bijoux Or",
		FA_DateCreation: "2024-01-02T00:00:00",
		FA_DateModification: "2024-01-02T00:00:00",
	},
	{
		cbMarq: 3,
		FA_CodeFamille: "BIJBAGOR",
		FA_Intitule: "Bijoux Bagues Or",
		FA_Type: 2,
		FA_Central: 1,
		CL_No1: 2,
		CL_No2: 23,
		CL_No3: 232,
		CL_No4: 0,
		CL_Intitule1: "Bijoux Or",
		FA_DateCreation: "2024-01-03T00:00:00",
		FA_DateModification: "2024-01-03T00:00:00",
	},
	{
		cbMarq: 4,
		FA_CodeFamille: "BIJCOLLOR",
		FA_Intitule: "Bijoux Colliers Or",
		FA_Type: 0,
		FA_Central: 1,
		CL_No1: 2,
		CL_No2: 23,
		CL_No3: 234,
		CL_No4: 0,
		CL_Intitule1: "Bijoux Or",
		FA_DateCreation: "2024-01-04T00:00:00",
		FA_DateModification: "2024-01-04T00:00:00",
	},
	{
		cbMarq: 5,
		FA_CodeFamille: "BIJBAGAR",
		FA_Intitule: "Bijoux Bagues Argent",
		FA_Type: 1,
		FA_Central: 0,
		CL_No1: 2,
		CL_No2: 22,
		CL_No3: 222,
		CL_No4: 0,
		CL_Intitule1: "Bijoux Argent",
		FA_DateCreation: "2024-01-05T00:00:00",
		FA_DateModification: "2024-01-05T00:00:00",
	},
	{
		cbMarq: 6,
		FA_CodeFamille: "BIJCOLAR",
		FA_Intitule: "Bijoux Colliers Argent",
		FA_Type: 0,
		FA_Central: 0,
		CL_No1: 2,
		CL_No2: 22,
		CL_No3: 223,
		CL_No4: 0,
		CL_Intitule1: "Bijoux Argent",
		FA_DateCreation: "2024-01-06T00:00:00",
		FA_DateModification: "2024-01-06T00:00:00",
	},
	{
		cbMarq: 7,
		FA_CodeFamille: "ACCSAC",
		FA_Intitule: "Accessoires Sacs",
		FA_Type: 1,
		FA_Central: 0,
		CL_No1: 1,
		CL_No2: 12,
		CL_No3: 0,
		CL_No4: 0,
		CL_Intitule1: "Accessoires",
		FA_DateCreation: "2024-01-07T00:00:00",
		FA_DateModification: "2024-01-07T00:00:00",
	},
	{
		cbMarq: 8,
		FA_CodeFamille: "ACCCEINT",
		FA_Intitule: "Accessoires Ceintures",
		FA_Type: 0,
		FA_Central: 0,
		CL_No1: 1,
		CL_No2: 13,
		CL_No3: 0,
		CL_No4: 0,
		CL_Intitule1: "Accessoires",
		FA_DateCreation: "2024-01-08T00:00:00",
		FA_DateModification: "2024-01-08T00:00:00",
	},
	{
		cbMarq: 9,
		FA_CodeFamille: "MONTHOM",
		FA_Intitule: "Montres Homme",
		FA_Type: 1,
		FA_Central: 1,
		CL_No1: 4,
		CL_No2: 42,
		CL_No3: 0,
		CL_No4: 0,
		CL_Intitule1: "Montres",
		FA_DateCreation: "2024-01-09T00:00:00",
		FA_DateModification: "2024-01-09T00:00:00",
	},
	{
		cbMarq: 10,
		FA_CodeFamille: "MONTFEM",
		FA_Intitule: "Montres Femme",
		FA_Type: 2,
		FA_Central: 1,
		CL_No1: 4,
		CL_No2: 43,
		CL_No3: 0,
		CL_No4: 0,
		CL_Intitule1: "Montres",
		FA_DateCreation: "2024-01-10T00:00:00",
		FA_DateModification: "2024-01-10T00:00:00",
	},
];

// Mock data for familles central
const mockFamillesCentral: FamilleCentral[] = [
	{ Value: 0, Text: "Aucune" },
	{ Value: 1, Text: "Central 1" },
	{ Value: 2, Text: "Central 2" },
];

// GET /api/famille
export const familleList = http.get("/api/famille", ({ request }) => {
	const url = new URL(request.url);
	const pageIndex = Number(url.searchParams.get("pageIndex")) || 1;
	const pageSize = Number(url.searchParams.get("pageSize")) || 10;
	const fa_Type = url.searchParams.get("FA_Type");
	const fa_CodeFamille = url.searchParams.get("FA_CodeFamille");
	const fa_Intitule = url.searchParams.get("FA_Intitule");
	const CL_No1 = url.searchParams.get("CL_No1");
	const CL_No2 = url.searchParams.get("CL_No2");
	const CL_No3 = url.searchParams.get("CL_No3");
	const CL_No4 = url.searchParams.get("CL_No4");

	let filteredFamilles = [...mockFamilles];

	// Apply filters
	if (fa_Type) {
		filteredFamilles = filteredFamilles.filter((f) => f.FA_Type === Number(fa_Type));
	}
	if (fa_CodeFamille) {
		filteredFamilles = filteredFamilles.filter((f) =>
			f.FA_CodeFamille.toLowerCase().includes(fa_CodeFamille.toLowerCase()),
		);
	}
	if (fa_Intitule) {
		filteredFamilles = filteredFamilles.filter((f) => f.FA_Intitule.toLowerCase().includes(fa_Intitule.toLowerCase()));
	}

	// Apply catalogue filters
	if (CL_No1 && CL_No1 !== "0") {
		filteredFamilles = filteredFamilles.filter((f) => f.CL_No1 === Number(CL_No1));
	}
	if (CL_No2 && CL_No2 !== "0") {
		filteredFamilles = filteredFamilles.filter((f) => f.CL_No2 === Number(CL_No2));
	}
	if (CL_No3 && CL_No3 !== "0") {
		filteredFamilles = filteredFamilles.filter((f) => f.CL_No3 === Number(CL_No3));
	}
	if (CL_No4 && CL_No4 !== "0") {
		filteredFamilles = filteredFamilles.filter((f) => f.CL_No4 === Number(CL_No4));
	}

	// Apply pagination
	const startIndex = (pageIndex - 1) * pageSize;
	const endIndex = startIndex + pageSize;
	const paginatedFamilles = filteredFamilles.slice(startIndex, endIndex);

	const response: FamilleApiResponse = {
		data: paginatedFamilles,
		total: filteredFamilles.length,
		pageIndex: pageIndex,
		pageSize: pageSize,
		totalPages: Math.ceil(filteredFamilles.length / pageSize),
	};

	return HttpResponse.json(response);
});

// GET /api/famille/:id
export const getFamilleById = http.get("/api/famille/:id", ({ params }) => {
	const id = Number(params.id);
	const famille = mockFamilles.find((f) => f.cbMarq === id);

	if (!famille) {
		return HttpResponse.json({ error: "Famille not found" }, { status: 404 });
	}

	return HttpResponse.json(famille);
});

// POST /api/famille
export const createFamille = http.post("/api/famille", async ({ request }) => {
	const newFamille = (await request.json()) as Omit<FAMILLEDto, "cbMarq">;
	const famille: FAMILLEDto = {
		...newFamille,
		cbMarq: Math.max(...mockFamilles.map((f) => f.cbMarq)) + 1,
		FA_DateCreation: new Date().toISOString(),
		FA_DateModification: new Date().toISOString(),
	};

	mockFamilles.push(famille);
	return HttpResponse.json(famille);
});

// PUT /api/famille/:id
export const updateFamille = http.put("/api/famille/:id", async ({ params, request }) => {
	const id = Number(params.id);
	const updatedFamille = (await request.json()) as FAMILLEDto;

	const index = mockFamilles.findIndex((f) => f.cbMarq === id);
	if (index === -1) {
		return HttpResponse.json({ error: "Famille not found" }, { status: 404 });
	}

	mockFamilles[index] = {
		...updatedFamille,
		cbMarq: id,
		FA_DateModification: new Date().toISOString(),
	};

	return HttpResponse.json(mockFamilles[index]);
});

// DELETE /api/famille/:id
export const deleteFamille = http.delete("/api/famille/:id", ({ params }) => {
	const id = Number(params.id);
	const index = mockFamilles.findIndex((f) => f.cbMarq === id);

	if (index === -1) {
		return HttpResponse.json({ error: "Famille not found" }, { status: 404 });
	}

	mockFamilles.splice(index, 1);
	return HttpResponse.json({ message: "Famille deleted successfully" });
});

// GET /api/famille/catalogues
export const getCatalogues = http.get("/api/famille/catalogues", ({ request }) => {
	const url = new URL(request.url);
	const cl_NoParent = Number(url.searchParams.get("cl_NoParent")) || 0;

	// Return main catalogues if no parent specified
	if (cl_NoParent === 0) {
		return HttpResponse.json(mockCatalogues);
	}

	// Return empty array for sub-catalogues (simplified for now)
	return HttpResponse.json([]);
});

// GET /api/famille/central
export const getFamillesCentral = http.get("/api/famille/central", () => {
	return HttpResponse.json(mockFamillesCentral);
});

// GET /api/famille/search
export const searchFamilles = http.get("/api/famille/search", ({ request }) => {
	const url = new URL(request.url);
	const query = url.searchParams.get("q") || "";

	const searchResults = mockFamilles.filter(
		(f) =>
			f.FA_CodeFamille.toLowerCase().includes(query.toLowerCase()) ||
			f.FA_Intitule.toLowerCase().includes(query.toLowerCase()),
	);

	return HttpResponse.json(searchResults);
});
