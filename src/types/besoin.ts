// Miroir du DA_BESOINDto C#

export interface IBesoin {
	b_No: number;
	b_Numero: string;
	b_Titre: string;
	b_Description: string;
	bT_Id?: number;
	b_IdDemandeur?: string;
	b_Demandeur?: string;
	b_Date?: string;
	b_DateCreation?: string;
	b_Etat_Besoin?: Etat_Besoin;
	b_EtatRetour?: EtatBesoinRetour;
	cA_Num?: string;
	cA_Intitule?: string;
	dE_No?: number;
	dE_Intitule?: string;
	b_Motif?: string;
	mR_No?: number;
	b_NumeroOrgine?: string;
	cL_ChampLibre?: string;
	champsLibres?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface IBesoinFilter {
	pageIndex: number;
	pageSize: number;
	b_Numero?: string;
	b_Titre?: string;
	b_Description?: string;
	b_Demandeur?: string;
	b_Etat_Besoin?: number;
	dateDebut?: string;
	dateFin?: string;
	b_Date?: string;
	sortField?: string;
	sortOrder?: string;
}

export interface IBesoinArticle {
	bA_No: number;
	b_BesoinId: number;
	bA_RefArticle: string;
	bA_DesigArticle: string;
	bA_Quantite: number;
	bA_QuantiteValider?: number;
	bA_Unite?: string;
	bA_Etat?: number;
	cA_Num?: string;
	mR_No?: number;
	bA_Motif?: string;
	cbMarqArticle?: number;
	champsLibres?: Record<string, unknown>;
	[key: string]: unknown;
}
export enum Etat_Besoin {
	Tous = 0,
	EnCours = 1,
	Cloture = 2,
	EncoursValidation = 3,
	AAcheter = 4,
	Valide = 5,
	Refuse = 6,
	Rectifier = 7,
	NonPrisEnCharge = 8,
	Acheter = 9,
	AttenteValidation = 10,
}

export enum EtatBesoinRetour {
	Aucun = 0,
	Retourne = 1,
	Traite = 2,
}
export interface IBesoinArticleFilter {
	pageIndex: number;
	pageSize: number;
	b_BesoinId: number;
	bT_Id?: number;
	sortField?: string;
	sortOrder?: string;
}

export interface IValidateurBesoin {
	v_Id: number;
	uS_Id?: string;
	uS_UserIntitule?: string;
	rO_Intitule?: string;
	v_Niveau?: number;
	v_Status?: number;
	v_ValStatus?: string;
	bA_Acheteur?: boolean;
	v_Role_Validateur?: number;
	v_ValidationDate?: string;
	nU_DateTime?: string;
	v_Type?: number;
}

export interface IBesoinType {
	bT_Id: number;
	bT_Intitule: string;
	bT_AffaireObligatoire?: boolean;
	bT_DepotObligatoire?: boolean;
	bT_RetourObligatoire?: boolean;
}

export interface IDepot {
	dE_No: number;
	dE_Intitule: string;
}

export interface IAffaire {
	cA_Num: string;
	cA_Intitule: string;
}
