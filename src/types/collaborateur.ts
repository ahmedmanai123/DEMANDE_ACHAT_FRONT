export interface CollaborateurDto {
	cO_No: number;
	cO_Nom: string;
	cO_Prenom: string;
	cO_Fonction: string;
	cO_Service: string;
	cO_Adresse: string;
	cO_CodePostal: string;
	cO_Ville: string;
	cO_Telephone: string;
	CT_Num?: string;
}

export interface CollaborateurFilter {
	CT_Num?: string;
	cO_Nom?: string;
	cO_Prenom?: string;
	cO_Fonction?: string;
	cO_Service?: string;
	cO_Adresse?: string;
	cO_CodePostal?: string;
	cO_Ville?: string;
	cO_Telephone?: string;
	pageIndex?: number;
	pageSize?: number;
}

export interface CollaborateurResponse {
	data: CollaborateurDto[];
	total: number;
	itemsCount?: number;
}
