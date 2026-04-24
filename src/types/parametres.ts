export interface GridFilter {
	pageIndex?: number;
	pageSize?: number;
	sortField?: string;
	sortOrder?: "asc" | "desc";
	[key: string]: string | number | boolean | undefined;
}

export interface GridResponse<T> {
	data: T[];
	itemsCount: number;
}

export interface ActionResponse {
	isValid: boolean;
	message?: string;
	Message?: string;
	html?: string;
	Id?: number;
	refresh?: boolean;
}

export interface ParametreEntity {
	pA_No: number;
	pA_SMTP?: string;
	pA_EmailDisplayName?: string;
	pA_Port?: number | null;
	pA_Mail?: string;
	pA_MailCopie?: string;
	pA_PWD?: string;
	pA_SSL?: boolean;
	pA_LogoSociete?: string;
	pA_ImgFondEcran?: string;
	d_RaisonSoc?: string;
	d_Profession?: string;
	d_Commentaire?: string;
	d_Adresse?: string;
	d_Complement?: string;
	d_CodePostal?: string;
	d_Ville?: string;
	d_CodeRegion?: string;
	d_Pays?: string;
	d_Telephone?: string;
	d_Telecopie?: string;
	d_EMailSoc?: string;
	d_Site?: string;
	d_Siret?: string;
	d_Identifiant?: string;
	aR_RefDivers?: string;
	pA_UserSage?: string;
	pA_Souche?: number | null;
	pA_CompteCredit?: string;
	pA_CompteDebit?: string;
	pA_Journal?: string;
	pA_DossierSage?: string;
}

export interface GetParametreResponse {
	isValid: boolean;
	param?: ParametreEntity;
	Message?: string;
}

export interface DepotAutorise {
	dA_No: number;
	dE_No?: number | null;
	dE_Intitule?: string;
}

export interface DepotItem {
	dE_No?: number | null;
	dE_Intitule?: string;
}

export interface AffaireAutorise {
	fA_No: number;
	cA_Num: string;
	cA_Intitule?: string;
}

export interface AffaireItem {
	cA_Num: string;
	cA_Intitule?: string;
}

export interface CategorieAutorise {
	cA_No: number;
	cL_No1?: number | null;
	cL_No2?: number | null;
	cL_No3?: number | null;
	cL_No4?: number | null;
	cL_Intitule1?: string;
	cL_Intitule2?: string;
	cL_Intitule3?: string;
	cL_Intitule4?: string;
}

export interface CategoriePayload {
	cA_No: number;
	cL_No1: number;
	cL_No2: number;
	cL_No3: number;
	cL_No4: number;
}

export interface SelectOptionItem<T extends string | number | null = number> {
	text: string;
	value: T;
}

export interface MotifRectification {
	mR_No: number;
	mR_Code: string;
	mR_Desgination: string;
	mR_TypeMotif: number;
	mR_TypeDemande: number;
}

export interface MotifRectificationPayload {
	mR_No: number;
	mR_Code: string;
	mR_Desgination: string;
	mR_TypeMotif: number;
	mR_TypeDemande: number;
}

export interface SelectOption {
	text: string;
	value: string;
}

export interface SoucheItem {
	s_Intitule: string;
	cbMarq: number;
}
