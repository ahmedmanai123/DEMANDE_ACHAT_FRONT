// Miroir exact du F_ARTICLEDto C#
export interface IArticle {
  cbMarq: number;
  aR_Ref: string;
  aR_Design: string;
  fA_CodeFamille?: string;
  fA_Intitule?: string;
  aR_PrixAch?: number;
  aR_PrixVen?: number;
  aR_SuiviStock?: number;
  aR_Photo?: string;
  u_Intitule?: string;
  totalStock?: number;
  depotStocks?: Record<number, number>; // { 1: 50, 2: 30 }
  [key: string]: unknown;              // DE_1, DE_2 …
}

export interface IArticleFilter {
  pageIndex: number;
  pageSize: number;
  aR_Ref?: string;
  aR_Design?: string;
  fA_CodeFamille?: string;
  cL_No1?: number;
  cL_No2?: number;
  cL_No3?: number;
  cL_No4?: number;
  actionView?: string;
}

export interface IDepot {
  dE_No: number;
  dE_Intitule: string;
}

export interface ICatalogue {
  value: number;
  text: string;
  isParent: boolean;
}