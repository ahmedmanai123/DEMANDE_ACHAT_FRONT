export interface F_COMPTETDto {
  cbMarq: number; // Primary key
  CT_Num: string; // Numéro du compte
  CT_Intitule: string; // Intitulé du compte
  CT_Classement?: string; // Abrégé
  CT_Contact?: string; // Contact
  CT_Adresse?: string; // Adresse
  CT_Email?: string; // E-mail
  CT_Identifiant?: string; // N° identifiant
  CT_Sommeil: number; // 0 = Actif, 1 = En sommeil
  CT_Type: number; // 0 = Client, 1 = Fournisseur
  CT_Telephone?: string; // Téléphone
  CT_Fax?: string; // Fax
  CT_Siret?: string; // SIRET
  CT_CodePostal?: string; // Code postal
  CT_Ville?: string; // Ville
  CT_Pays?: string; // Pays
  CT_DateCreation?: string; // Date de création
  CT_DateModification?: string; // Date de modification
}

export interface TiersFilter {
  CT_Type: number;
  CT_Sommeil?: number;
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface TiersApiResponse {
  data: F_COMPTETDto[];
  total: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}
