export interface FAMILLEDto {
	cbMarq: number; // Primary key
	fA_CodeFamille: string; // Code famille
	fA_Intitule: string; // Intitulé
	fA_Type: number; // 0 = Détail, 1 = Total, 2 = Centralisateur
	fA_Central: number; // Centralisation
	cL_No1?: number; // Catalogue niveau 1
	cL_No2?: number; // Catalogue niveau 2
	cL_No3?: number; // Catalogue niveau 3
	cL_No4?: number; // Catalogue niveau 4
	cL_Intitule1?: string; // Catalogue article
	fA_DateCreation?: string; // Date de création
	fA_DateModification?: string; // Date de modification
}

export interface Catalogue {
	Value: number;
	Text: string;
	IsParent: boolean;
}

export interface FamilleFilter {
	FA_Type?: number;
	FA_CodeFamille?: string;
	FA_Intitule?: string;
	FA_Central?: number;
	CL_No1?: number;
	CL_No2?: number;
	CL_No3?: number;
	CL_No4?: number;
	pageIndex?: number;
	pageSize?: number;
}

// Alias pour correspondre au DTO backend F_FAMILLEDto
export interface F_FAMILLEDto extends FamilleFilter {}

export interface FamilleApiResponse {
	data: FAMILLEDto[];
	total: number;
	pageIndex: number;
	pageSize: number;
	totalPages: number;
}

export interface FamilleCentral {
	Value: number;
	Text: string;
}
