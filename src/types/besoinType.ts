import type { GridFilter, GridResponse, SelectOptionItem } from "./parametres";

export interface BesoinTypeItem {
	bT_Id: number;
	bT_Code: string;
	bT_Intitule: string;
	bT_DegreImportance?: number;
	bT_ModifDegreImportance?: boolean;
	bT_PathBC?: string;
	bT_PathDA?: string;
	bT_PathDB?: string;
	bT_PathDP?: string;
	bT_SignatureImg?: string;
	bT_UserSage?: string;
	bT_Souche?: number;
	bT_Journal?: string;
	bT_CompteDebit?: string;
	bT_CompteCredit?: string;
	bT_PathBCFile?: File;
	bT_PathDAFile?: File;
	bT_PathDBFile?: File;
	bT_PathDPFile?: File;
	SignaturePic?: File;
	aR_Ref?: string;
	r_No?: number;
	lastCode?: string;
}

export interface BesoinTypeSidebarItem {
	bT_Id: number;
	bT_Intitule: string;
	r_No: number;
}

export interface BesoinTypeCircuit {
	cbMarq: number;
	bT_Id: number;
	uS_Id?: string;
	uS_UserIntitule?: string;
	bC_Niveau: number;
	bC_Acheteur: boolean;
	bC_ApprDA?: boolean;
	bC_ApprRB?: boolean;
	bC_ConsulteStock?: boolean;
	bC_ValidBC?: boolean;
	bC_ValidDP?: boolean;
	picture?: string;
	r_No?: number;
}

export interface BesoinTypeAttachementsViewModel {
	bT_Id: number;
	data: BesoinTypeCircuit[];
}

export interface BesoinTypeDepot {
	cBMarq: number;
	bT_Id: number;
	dE_No?: number;
	dE_Intitule?: string;
	dE_Ville?: string;
}

export interface BesoinTypeAffaire {
	cBMarq: number;
	bT_Id: number;
	fA_No?: number;
	cA_Num?: string;
	cA_Intitule?: string;
}

export interface BesoinTypeCategorie {
	cBMarq: number;
	bT_Id: number;
	cA_No?: number;
	cL_No1?: number;
	cL_No2?: number;
	cL_No3?: number;
	cL_No4?: number;
	cL_Intitule1?: string;
	cL_Intitule2?: string;
	cL_Intitule3?: string;
	cL_Intitule4?: string;
}

export interface BesoinTypeUser {
	cBMarq: number;
	bT_Id: number;
	uS_Id?: string;
	uS_UserIntitule?: string;
}

export interface Rappel {
	cbMarq: number;
	bT_Id?: number;
	bC_Id?: number;
	r_NbRappel?: number;
	r_FreqType?: number;
	r_Duree?: number;
	r_ParamNotif?: boolean;
	r_ParamMail?: boolean;
	r_NotifDemandeur?: boolean;
	rN_TransType?: number;
}

export interface RappelPeriode {
	cbMarq: number;
	rP_Type: number;
	uS_Id: string;
	uS_UserIntitule?: string;
	rP_DateDebut?: string;
	rP_DateFin?: string;
}

export interface ChampsLibre {
	cbMarq: number;
	bT_Id?: number;
	cL_Nature?: number;
	cL_ChampLibre_Document?: string;
	cL_ChampDisplayName_Document?: string;
	cL_TableChampLibre_Source?: string;
	cL_ChampLibre_Source?: string;
	cL_Actif?: number | boolean;
	cL_Obligatoire?: number | boolean;
	cL_ValActif?: string;
	cL_ValObligatoire?: string;
	cL_ValNature?: string;
	CL_ValNature?: string;
	CL_ValTableChampLibre_Source?: string;
	CL_ValType?: string;
	CL_ValTaille?: string;
}

export interface ReferenceData {
	usersSage: SelectOptionItem<string>[];
	souches: SelectOptionItem<number>[];
	journaux: SelectOptionItem<string>[];
	comptesDebit: SelectOptionItem<string>[];
	comptesCredit: SelectOptionItem<string>[];
	articles: SelectOptionItem<string>[];
}

export type BesoinTypeFilter = GridFilter;
export type BesoinTypeDepotFilter = GridFilter & { bT_Id?: number };
export type BesoinTypeAffaireFilter = GridFilter & { bT_Id?: number };
export type BesoinTypeCategorieFilter = GridFilter & { bT_Id?: number };
export type BesoinTypeUserFilter = GridFilter & { bT_Id?: number };
export type RappelPeriodeFilter = GridFilter & { bC_Id?: number; uS_Id?: string };
export type ChampsLibreFilter = GridFilter;
