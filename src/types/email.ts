// Email Management Types

export enum TypeMail {
	Validation_Demande_Besoin = "Validation_Demande_Besoin",
	Demande_Achat = "Demande_Achat",
	Refus_Demande_Article = "Refus_Demande_Article",
	Retour_Demande_Besoin = "Retour_Demande_Besoin",
	Modifier_QuantitArticle = "Modifier_QuantitArticle",
	BC_ValideBackOffice = "BC_ValideBackOffice",
}

export interface DA_MODELE_EMAIL {
	ME_No: number;
	ME_Intitule: string;
	ME_Contenu: string;
	ME_Type: TypeMail;
	ME_Default: boolean;
	ME_DateCreation?: Date;
	ME_CreateurName?: string;
	ME_UpdatedName?: string;
	ME_DateModification?: Date;
}

export interface DA_HISTORIQUE_EMAIL {
	[x: string]: any;
	HE_No: number;
	HE_Objet: string;
	HE_Contenu: string;
	HE_De_Email: string;
	HE_A_Email: string;
	HE_CC_Email?: string[];
	HE_DateEnvoi: Date;
	HE_IntituleUtilisateur: string;
	B_No?: number;
	Modele_Email: DA_MODELE_EMAIL;
}

export interface DA_FILE {
	FI_No: number;
	FI_NomFichier: string;
	FI_Fichier: ArrayBuffer;
	FI_TypeFichier: string;
	FI_TypeAttachement: string;
	FI_DateCreation?: Date;
}

export interface AttachmentsModel {
	AttachmentID: number;
	FileName: string;
	Size: number;
	Path: string;
	MimeType: string;
	FI_TypeAttachement: string;
}

export interface EmailTemplateListResponse {
	isValid: boolean;
	data: DA_MODELE_EMAIL[];
	modelesCount: number;
}

export interface EmailHistoryListResponse {
	isValid: boolean;
	data: DA_HISTORIQUE_EMAIL[];
	historiquesCount: number;
}

export interface EmailTemplateResponse {
	isValid: boolean;
	data: DA_MODELE_EMAIL;
	typeMailOptions?: Array<{ Text: string; Value: string }>;
	selectedType?: TypeMail;
}

export interface EmailHistoryResponse {
	data: DA_HISTORIQUE_EMAIL;
	attachCount: number;
	firstAttachmentType?: string;
}

export interface AttachmentsResponse {
	data: AttachmentsModel[];
}

export interface EmailLayoutData {
	idBesoin?: number;
	historiquesCount: number;
	modelesCount: number;
}

export interface SelectListOption {
	Text: string;
	Value: string;
}

// Helper functions for type conversion
export const numberToTypeMail = (type: number): TypeMail => {
	switch (type) {
		case 1:
			return TypeMail.Validation_Demande_Besoin;
		case 2:
			return TypeMail.Demande_Achat;
		case 3:
			return TypeMail.Refus_Demande_Article;
		case 4:
			return TypeMail.Retour_Demande_Besoin;
		case 5:
			return TypeMail.Modifier_QuantitArticle;
		case 6:
			return TypeMail.BC_ValideBackOffice;
		default:
			return TypeMail.Validation_Demande_Besoin;
	}
};

export const typeMailToNumber = (type: TypeMail): number => {
	switch (type) {
		case TypeMail.Validation_Demande_Besoin:
			return 1;
		case TypeMail.Demande_Achat:
			return 2;
		case TypeMail.Refus_Demande_Article:
			return 3;
		case TypeMail.Retour_Demande_Besoin:
			return 4;
		case TypeMail.Modifier_QuantitArticle:
			return 5;
		case TypeMail.BC_ValideBackOffice:
			return 6;
		default:
			return 1;
	}
};
