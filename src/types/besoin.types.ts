// ============================================================
// types/besoin.types.ts
// Correspond aux DTOs C# du projet (DA_BESOINDto, etc.)
// ============================================================

// ── Enums (miroir exact de Domaine.Helpers.Enumeration) ─────

export enum Etat_Besoin {
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
  Tous = -1,
}

export enum Statut {
  EnAttente = 0,
  Rejete = 1,
  Rectifier_Demande = 6,
  Valide = 3,
  Attente_Acheter = 4,
  Acheter = 5,
  Tous = -1,
}

export enum Role_Validateur {
  Tous = -1,
  Demandeur = 1,
  Responsable_Hierarchique = 2,
  Validateur = 3,
  Acheteur = 4,
}

export enum Type_Validation {
  Demande_Besoin = 0,
  Retour_Demande_Validation = 1,
}

export enum TypeSage {
  Demande_Achat = 1,
  BC = 2,
  BC_Achat = 3,
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
  Fournisseur = 0,
  Document = 1,
}

export enum Etat {
  EnAttente = 0,
  Valider = 1,
  Refuser = 2,
}

export enum EtatBesoinRetour {
  Aucun = 0,
  EnAttente = 1,
  Valide = 2,
}

// ── Pagination helper ────────────────────────────────────────

export interface GridFilter {
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export interface GridResponse<T> {
  data: T[];
  itemsCount: number;
  ChampsLibres?: Record<string, unknown>;
}

// ── Besoin ───────────────────────────────────────────────────

export interface DA_BESOINDto extends GridFilter {
  B_No: number;
  B_Numero: string;
  B_Titre: string;
  B_Description: string;
  B_Demandeur?: string;
  B_IdDemandeur?: string;
  B_Date?: string;
  B_DateCreation?: string;
  B_DateLivraison?: string;
  B_Etat_Besoin: Etat_Besoin;
  BT_Id?: number;
  CA_Num?: string;
  CA_Intitule?: string;
  DE_No?: number;
  DE_Intitule?: string;
  B_EtatRetour?: EtatBesoinRetour;
  B_NumeroOrgine?: string;
  B_Motif?: string;
  MR_No?: number;
  dateDebut?: string;
  dateFin?: string;
  ChampsLibres?: Record<string, unknown>;
}

// ── Article Besoin ───────────────────────────────────────────

export interface DA_BESOIN_ARTICLEDto extends GridFilter {
  BA_No: number;
  B_BesoinId: number;
  BT_Id?: number;
  BA_RefArticle: string;
  BA_DesigArticle: string;
  BA_Quantite: number;
  BA_QuantiteValider: number;
  BA_Unite?: string;
  BA_Etat: Etat;
  CA_Num?: string;
  BA_Motif?: string;
  MR_No?: number;
  cbMarqArticle?: number;
  ChampsLibres?: Record<string, unknown>;
}

// ── Validateur ───────────────────────────────────────────────

export interface Validateur_BesoinVM extends GridFilter {
  V_Id: number;
  B_No?: number;
  BT_Id?: number;
  US_Id?: string;
  US_UserIntitule?: string;
  RO_Intitule?: string;
  V_Niveau: number;
  V_Status: Statut;
  V_ValStatus?: string;
  BA_Acheteur: boolean;
  BA_MultiAcheteur?: boolean;
  V_Role_Validateur: Role_Validateur;
  V_ValidationDate?: string;
  NU_DateTime?: string;
  V_Type: Type_Validation;
  V_Niveau_Validation?: number;
  V_ValidatorUserId?: string;
}

// ── Validation ───────────────────────────────────────────────

export interface DA_VALIDATION {
  V_Id: number;
  DA_BesoinId?: number;
  V_ValidatorUserId?: string;
  V_NomValidator?: string;
  V_Niveau_Validation?: number;
  V_Role_Validateur?: Role_Validateur;
  V_Acheteur?: boolean;
  V_Status: Statut;
  V_ValidationDate?: string;
  V_Motif?: string;
  MR_No?: number;
  V_Type?: Type_Validation;
}

// ── Besoin AAcheter ──────────────────────────────────────────

export interface DA_BESOIN_AACHETERDto extends GridFilter {
  B_No: number;
  B_Numero: string;
  B_Titre?: string;
  B_Description?: string;
  B_Demandeur?: string;
  B_IdDemandeur?: string;
  B_Date?: string;
  B_DateCreation?: string;
  B_DateLivraison?: string;
  B_Etat_Besoin: Etat_Besoin;
  B_Etat_Affectation_Acheteur: Etat_Affectation_Acheteur;
  B_TypeDocument: TypeSage;
  B_EtatRetour: EtatBesoinRetour;
  CA_Num?: string;
  CA_Intitule?: string;
  DE_No?: number;
  DE_Intitule?: string;
  AD_TypeDemande: Type_Validation;
  dateDebut?: string;
  dateFin?: string;
  B_AchteurUserId?: string;
  B_Date_Filter?: string;
  B_DegreImportance?: number;
  ChampsLibres?: Record<string, unknown>;
}

// ── Affectation Demande ──────────────────────────────────────

export interface AFFECTATION_DEMANDEDto {
  AD_No: number;
  B_No: number;
  BA_No: number;
  AR_Ref?: string;
  AR_Article?: string;
  AR_QteDemande?: number;
  EP_Tiers?: string;
  AD_Fournisseur?: string;
  AD_TypeAffectation?: TypeAffectation;
  AD_ValTypeAffectation?: string;
  TP_No?: TypeSage;
  LP_No?: number;
  AD_NoDocument_Affectation?: number;
  AD_Document?: string;
  LP_NumDocument_Generer?: string;
  LP_QteMvt?: number;
  LP_PrixUnitaire?: number;
  LP_MontantHT?: number;
  LP_MontantTTC?: number;
  LP_Remise?: string;
  AD_Etat?: number;
  AD_EtatRetour?: number;
  AD_ArticleRetour?: boolean;
  EP_ValiderAERP?: number;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: string;
}

// ── Tracabilité ──────────────────────────────────────────────

export interface DA_TRACABILITEBESOINARTICLEDto extends GridFilter {
  BA_No: number;
  BA_Quantite?: number;
  BA_QuantiteValider?: number;
  BA_QuantiteAffichee?: string;
  TBA_UpdatedName?: string;
  TBA_DateModification?: string;
  TBA_Action?: number;
}