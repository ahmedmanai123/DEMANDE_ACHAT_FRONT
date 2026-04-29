import axios from "axios";
import type { CollaborateurDto, CollaborateurFilter, CollaborateurResponse } from "@/types/collaborateur";

const api = axios.create({
  baseURL: "/api",
});

// Get collaborateurs with filtering and pagination
export const getCollaborateurs = async (filter: CollaborateurFilter): Promise<CollaborateurResponse> => {
  const response = await api.get<CollaborateurResponse>("/tiers/collaborateurs", {
    params: filter,
  });
  return response.data;
};

export default {
  getCollaborateurs,
};
