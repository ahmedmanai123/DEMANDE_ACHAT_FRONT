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

/* =====================================================
   SERVICE: GET CATALOGUES
===================================================== */

export const getCatalogues = async (
  params: CatalogueParams = {}
): Promise<CatalogueItem[]> => {
  const res = await axios.get<CatalogueItem[]>(`${API_URL}/catalogues`, {
    params,
    headers: authHeaders(),
  });

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
  getCatalogues,
  getCatalogueById,
};