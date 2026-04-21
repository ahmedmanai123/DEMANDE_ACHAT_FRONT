export interface Filter {
	pageIndex: number;
	pageSize: number;
	sortField?: string;
	sortOrder?: "asc" | "desc" | string;
	dateDebut?: string | Date;
	dateFin?: string | Date;
	ChampsLibres?: Record<string, unknown>;
	champsLibres?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface GridResponse<T> {
	data: T[];
	itemsCount: number;
	ChampsLibres?: Record<string, unknown>;
	champsLibres?: Record<string, unknown>;
}

// Champs libres (structure pilotée par le back; on garde flexible)
export type ChampLibreValue = string | number | boolean | null;

export interface ChampLibreDto {
	CL_ChampLibre_View?: string;
	CL_ChampValue?: ChampLibreValue;
	[key: string]: unknown;
}

export enum DegreeImportance {
	NonDefinie = 0,
	Basse = 1,
	Moyenne = 2,
	Haute = 3,
	TresHaute = 4,
	Maximum = 5,
}

export enum Etat_Besoin {
	Tous = -1,
	Brouillon = 0,
	Demande_Cloturer = 1,
	Encours_Validation = 2,
	A_Acheter = 3,
	Acheter = 4,
	Refuser = 5,
	Valider = 6,
	Attente_Validation = 7,
	Rectifier_Demande = 8,
	Demande_Cloturer_rectifier = 9,
	NonPrisEnCharge = 10,
}

export enum EtatBesoinRetour {
	Aucun = 0,
	Encours = 1,
	Cloturer = 2,
}

export enum Statut {
	Tous = -1,
	EnAttente = 0,
	Rejete = 1,
	Valide_Partiel = 2,
	Valide = 3,
	Attente_Acheter = 4,
	Acheter = 5,
	Rectifier_Demande = 6,
}

export enum Role_Validateur {
	Tous = -1,
	Demandeur = 1,
	Responsable_Hierarchique = 2,
	Validateur = 3,
	Acheteur = 4,
}

export enum Type_Validation {
	Tous = -1,
	Demande_Besoin = 0,
	Retour_Demande_Validation = 1,
}

export enum Type_Validation_Document {
	Encours = 0,
	Valider_Sage = 1,
	Annuler = 2,
	Encours_Creation = 8,
	Cloturer = 9,
}

export enum TypeAction {
	Cree = 0,
	Refuser = 1,
	Modifier = 2,
}

export enum Etat {
	EnAttente = 0,
	Valider = 1,
	Refuser = 2,
	Acheter = 3,
}

export enum EtatRetour {
	Tous = -1,
	NonEffectue = 0,
	EnAttente = 1,
	Attente_Validation_acheteur = 2,
	Valider = 3,
	Refuser = 4,
	Acheter = 5,
}

export enum Etat_Affection_Demande {
	Tous = -1,
	Brouillon = 0,
	Attente_Validation = 1,
	A_Acheter = 2,
	Acheter = 3,
	Refuser = 4,
	Valider = 5,
}

export enum Etat_Affectation_Acheteur {
	Tous = -1,
	Brouillon = 0,
	Encours = 1,
	Generer_Demande = 2,
	Acheter = 3,
	Valider = 4,
}

export enum TypeAffectation {
	Tous = -1,
	Fournisseur = 1,
	Document = 2,
}

export enum TypeAF {
	Choisir = 0,
	Fournisseurs = 1,
	Demande = 2,
	NouveauBonCommande = 3,
	AncienBonCommande = 4,
}

export enum TypeSage {
	Demande_Achat = 10,
	BC_Achat = 12,
	BC = 13,
}

export interface DA_VALIDATION {
	V_Id: number;
	DA_BesoinId?: number;
	V_Niveau_Validation?: number;
	V_ValidatorUserId?: string;
	V_NomValidator?: string;
	V_Status?: Statut;
	V_Acheteur?: boolean;
	V_Motif?: string;
	MR_No?: number;
	V_ValidationDate?: string | Date | null;
	V_Type?: Type_Validation;
	V_Role_Validateur?: Role_Validateur;
	[key: string]: unknown;
}

export interface DA_BESOINDto extends Filter {
	B_No?: number;
	b_No?: number;
	B_Numero?: string;
	b_Numero?: string;
	B_IdDemandeur?: string;
	b_IdDemandeur?: string;
	B_Titre?: string;
	b_Titre?: string;
	B_Description?: string;
	b_Description?: string;
	B_Date?: string | Date | null;
	b_Date?: string | Date | null;
	B_Demandeur?: string;
	b_Demandeur?: string;
	B_DegreImportance?: DegreeImportance;
	b_DegreImportance?: DegreeImportance;
	B_Motif?: string;
	b_Motif?: string;
	B_NiveauValidation?: number;
	b_NiveauValidation?: number;
	CA_Num?: string;
	cA_Num?: string;
	CA_Intitule?: string;
	cA_Intitule?: string;
	DE_No?: number | null;
	dE_No?: number | null;
	DE_Intitule?: string;
	dE_Intitule?: string;
	BT_Id?: number | null;
	bT_Id?: number | null;
	B_DateEnvoiDemande?: string | Date;
	b_DateEnvoiDemande?: string | Date;
	B_DateLivraison?: string | Date;
	b_DateLivraison?: string | Date;
	B_Etat_Besoin?: Etat_Besoin;
	b_Etat_Besoin?: Etat_Besoin;
	B_ValEtat_Besoin?: string;
	b_ValEtat_Besoin?: string;
	B_EtatRetour?: EtatBesoinRetour;
	b_EtatRetour?: EtatBesoinRetour;
	Titre_Notification?: string;
	titre_Notification?: string;
	B_AchteurUserId?: string;
	b_AchteurUserId?: string;
	V_Status?: Statut;
	v_Status?: Statut;
	B_CreateurName?: string;
	b_CreateurName?: string;
	B_CreateurID?: string;
	b_CreateurID?: string;
	B_DateCreation?: string | Date;
	b_DateCreation?: string | Date;
	B_UpdatedName?: string;
	b_UpdatedName?: string;
	B_UpdatedID?: string;
	b_UpdatedID?: string;
	B_DateModification?: string | Date;
	b_DateModification?: string | Date;
	AD_EtatRetour?: EtatRetour;
	aD_EtatRetour?: EtatRetour;
	B_NumeroOrgine?: string;
	b_NumeroOrgine?: string;
	MR_No?: number;
	mR_No?: number;
	CL_ChampLibre?: string;
	cL_ChampLibre?: string;
}

export interface DA_BESOIN_ARTICLEDto extends Filter {
	BA_No?: number;
	bA_No?: number;
	B_BesoinId?: number;
	b_BesoinId?: number;
	BA_RefArticle?: string;
	bA_RefArticle?: string;
	BA_Quantite?: number;
	bA_Quantite?: number;
	BA_QuantiteValider?: number;
	bA_QuantiteValider?: number;
	BA_DesigArticle?: string;
	bA_DesigArticle?: string;
	BA_Unite?: string;
	bA_Unite?: string;
	BA_Etat?: Etat;
	bA_Etat?: Etat;
	BA_DescriptionArticle?: string;
	bA_DescriptionArticle?: string;
	CA_Num?: string;
	cA_Num?: string;
	BA_Prix?: number;
	bA_Prix?: number;
	BA_Motif?: string;
	bA_Motif?: string;
	MR_No?: number;
	mR_No?: number;
	CL_ChampLibre?: string;
	cL_ChampLibre?: string;
	cbMarqArticle?: number;
	ChampsLibres?: Record<string, unknown>;
	champsLibres?: Record<string, unknown>;
}

export interface DA_TRACABILITEBESOINARTICLEDto extends Filter {
	TBA_No?: number;
	tBA_No?: number;
	BA_No?: number;
	bA_No?: number;
	TBA_UpdatedName?: string;
	tBA_UpdatedName?: string;
	TBA_DateModification?: string | Date | null;
	tBA_DateModification?: string | Date | null;
	BA_Quantite?: number;
	bA_Quantite?: number;
	BA_QuantiteValider?: number;
	bA_QuantiteValider?: number;
	BA_QuantiteAffichee?: string;
	bA_QuantiteAffichee?: string;
	AR_Ref?: string;
	aR_Ref?: string;
	AR_Design?: string;
	aR_Design?: string;
}

export interface DA_BESOIN_AACHETERDto extends DA_BESOINDto {
	B_TypeDocument?: TypeSage;
	b_TypeDocument?: TypeSage;
	B_Etat_Affectation_Acheteur?: Etat_Affectation_Acheteur;
	b_Etat_Affectation_Acheteur?: Etat_Affectation_Acheteur;
	AD_TypeDemande?: Type_Validation;
	aD_TypeDemande?: Type_Validation;
}

export interface AFFECTATION_DEMANDEDto extends Filter {
	AD_No?: number;
	aD_No?: number;
	B_No?: number;
	b_No?: number;
	BA_No?: number;
	bA_No?: number;
	AR_Ref?: string;
	aR_Ref?: string;
	EP_Tiers?: string;
	eP_Tiers?: string;
	AD_TypeAffectation?: TypeAffectation;
	aD_TypeAffectation?: TypeAffectation;
	TP_No?: TypeSage;
	tP_No?: TypeSage;
	AD_NoDocument_Affectation?: number | null;
	aD_NoDocument_Affectation?: number | null;
	AD_ArticleRetour?: boolean;
	aD_ArticleRetour?: boolean;
	AD_Etat?: Etat_Affection_Demande;
	aD_Etat?: Etat_Affection_Demande;
	AD_NoOrigine?: number;
	aD_NoOrigine?: number;
	AD_EtatRetour?: EtatRetour;
	aD_EtatRetour?: EtatRetour;
	AD_TypeDemande?: Type_Validation;
	aD_TypeDemande?: Type_Validation;
	AD_Fournisseur?: string;
	aD_Fournisseur?: string;
	AD_Document?: string;
	aD_Document?: string;
	LP_No?: number | null;
	lP_No?: number | null;
	LP_NumDocument_Generer?: string;
	lP_NumDocument_Generer?: string;
	LP_QteMvt?: number | null;
	lP_QteMvt?: number | null;
	LP_PrixUnitaire?: number | null;
	lP_PrixUnitaire?: number | null;
	LP_Remise?: string;
	lP_Remise?: string;
	LP_MontantHT?: number | null;
	lP_MontantHT?: number | null;
	LP_MontantTTC?: number | null;
	lP_MontantTTC?: number | null;
	AR_Article?: string;
	aR_Article?: string;
	AR_QteDemande?: number | null;
	aR_QteDemande?: number | null;
}

export interface Validateur_BesoinVM extends Filter {
	DA_Besoin?: DA_VALIDATION;
	V_Id?: number;
	v_Id?: number;
	RO_Intitule?: string;
	rO_Intitule?: string;
	US_UserIntitule?: string;
	uS_UserIntitule?: string;
	US_Id?: string;
	uS_Id?: string;
	V_Status?: Statut;
	v_Status?: Statut;
	V_ValStatus?: string;
	v_ValStatus?: string;
	V_Niveau?: number;
	v_Niveau?: number;
	BA_Acheteur?: boolean;
	bA_Acheteur?: boolean;
	BA_MultiAcheteur?: boolean;
	bA_MultiAcheteur?: boolean;
	V_Motif?: string;
	v_Motif?: string;
	V_Type?: Type_Validation;
	v_Type?: Type_Validation;
	V_ValidationDate?: string | Date | null;
	v_ValidationDate?: string | Date | null;
	NU_DateTime?: string | Date;
	nU_DateTime?: string | Date;
	V_Niveau_Validation?: number;
	v_Niveau_Validation?: number;
	V_ValidatorUserId?: string;
	v_ValidatorUserId?: string;
	V_Role_Validateur?: Role_Validateur;
	v_Role_Validateur?: Role_Validateur;
	BT_Id?: number;
	bT_Id?: number;
	B_No?: number;
	b_No?: number;
	idDemandeur?: string;
}

export interface DA_BESOIN_TYPE {
	BT_Id: number;
	BT_Intitule?: string;
	BT_AffaireObligatoire?: boolean;
	BT_DepotObligatoire?: boolean;
	BT_RetourObligatoire?: boolean;
}

export type IBesoin = DA_BESOINDto;
export type IBesoinFilter = Filter & Partial<DA_BESOINDto>;
export type IBesoinArticle = DA_BESOIN_ARTICLEDto;
export type IBesoinArticleFilter = Filter & Partial<DA_BESOIN_ARTICLEDto>;
export type IValidateurBesoin = Validateur_BesoinVM;
export type IBesoinType = DA_BESOIN_TYPE;

export interface IDepot {
	DE_No?: number | null;
	dE_No?: number | null;
	DE_Intitule?: string;
	dE_Intitule?: string;
}

export interface IAffaire {
	CA_Num?: string;
	cA_Num?: string;
	CA_Intitule?: string;
	cA_Intitule?: string;
}
