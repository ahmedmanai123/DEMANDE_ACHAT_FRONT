import axios from "axios";

const API_URL = "/api/famille";

/**
 * Token auth (si tu utilises auth)
 */
const getAccessToken = (): string => {
  try {
    const raw = localStorage.getItem("userStore");
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    return parsed?.state?.userToken?.accessToken || "";
  } catch (error) {
    console.warn("Token error", error);
    return "";
  }
};

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* =====================================================
   TYPES
===================================================== */

export interface CatalogueParams {
  cl_NoParent?: number;
  cL_Niveau?: number;
  addDefaultVal?: boolean;
  forChoix?: boolean;
  [key: string]: any;
}

export interface CatalogueItem {
  CL_No: number;
  Text: string;
  IsParent?: boolean;
  CL_NoParent?: number;
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

export interface FamilleResponse {
  data: any[];
  total: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

/* =====================================================
   SERVICE: GET FAMILLES
===================================================== */

export const getFamilles = async (
  filter: FamilleFilter = {}
): Promise<FamilleResponse> => {
  const res = await axios.get<FamilleResponse>(`${API_URL}`, {
    params: filter,
    headers: authHeaders(),
  });

  return res.data;
};

/* =====================================================
   SERVICE: GET CATALOGUES
===================================================== */

export const getCatalogues = async (
  paramsOrParent: CatalogueParams | number,
  niveau?: number
): Promise<CatalogueItem[]> => {
  let params: CatalogueParams;
  
  // Supporter les deux formats : objet ou deux paramètres séparés
  if (typeof paramsOrParent === 'number') {
    params = { cl_NoParent: paramsOrParent, cL_Niveau: niveau };
  } else {
    params = paramsOrParent;
  }
  
  console.log("Appel API catalogues avec params:", params);
  const res = await axios.get<CatalogueItem[]>(`${API_URL}/select/catalogues`, {
    params,
    headers: authHeaders(),
  });

  console.log("Réponse API catalogues brute:", res.data);
  return res.data;
};

/* =====================================================
   (OPTIONNEL) autres services famille
===================================================== */

export const getCatalogueById = async (id: number): Promise<CatalogueItem> => {
  const res = await axios.get<CatalogueItem>(
    `${API_URL}/catalogues/${id}`,
    {
      headers: authHeaders(),
    }
  );

  return res.data;
};

/* =====================================================
   EXPORT PAR DÉFAUT (optionnel)
===================================================== */

export default {
  getFamilles,
  getCatalogues,
  getCatalogueById,
};