import { create } from "zustand";
import { devtools } from "zustand/middleware";
import familleService from "@/api/services/familleService";
import type { FAMILLEDto, FamilleFilter, Catalogue, FamilleCentral } from "@/types/famille";

interface FamilleState {
  // Data
  familles: FAMILLEDto[];
  selectedFamille: FAMILLEDto | null;
  catalogues: Catalogue[];
  famillesCentral: FamilleCentral[];
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // Filters
  filters: FamilleFilter;
  
  // Catalog navigation
  catalogueSelection: {
    CL_No1: number;
    CL_No2: number;
    CL_No3: number;
    CL_No4: number;
  };
}

interface FamilleActions {
  // Data operations
  fetchFamilles: () => Promise<void>;
  createFamille: (famille: Omit<FAMILLEDto, "cbMarq">) => Promise<void>;
  updateFamille: (famille: FAMILLEDto) => Promise<void>;
  deleteFamille: (id: number) => Promise<void>;
  getFamilleById: (id: number) => Promise<FAMILLEDto | null>;
  
  // Catalog operations
  fetchCatalogues: (cl_NoParent: number, cL_Niveau: number) => Promise<void>;
  fetchFamillesCentral: () => Promise<void>;
  
  // State management
  setSelectedFamille: (famille: FAMILLEDto | null) => void;
  setPagination: (pagination: Partial<FamilleState["pagination"]>) => void;
  setFilters: (filters: Partial<FamilleState["filters"]>) => void;
  setCatalogueSelection: (selection: Partial<FamilleState["catalogueSelection"]>) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: FamilleState = {
  familles: [],
  selectedFamille: null,
  catalogues: [],
  famillesCentral: [],
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },
  filters: {
    FA_Type: undefined,
    FA_CodeFamille: undefined,
    FA_Intitule: undefined,
    FA_Central: undefined,
    CL_No1: undefined,
    CL_No2: undefined,
    CL_No3: undefined,
    CL_No4: undefined,
  },
  catalogueSelection: {
    CL_No1: 0,
    CL_No2: 0,
    CL_No3: 0,
    CL_No4: 0,
  },
};

export const useFamilleStore = create<FamilleState & FamilleActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchFamilles: async () => {
        set({ loading: true, error: null });
        try {
          const { pagination, filters, catalogueSelection } = get();
          const params = {
            pageIndex: pagination.current,
            pageSize: pagination.pageSize,
            ...filters,
            ...catalogueSelection,
          };

          console.log("Paramètres complets envoyés à GetFamilles:", params);
          console.log("Filters:", filters);
          console.log("CatalogueSelection:", catalogueSelection);

          const response = await familleService.getFamilles(params);
          console.log("Réponse API reçue:", response);
          console.log("Nombre de familles reçues:", response.data?.length || 0);
          console.log("Première famille:", response.data?.[0]);
          
          const responseTotal = (response as any).itemsCount || response.total || 0;

          set({
            familles: response.data || [],
            pagination: {
              ...pagination,
              total: responseTotal,
            },
            loading: false,
          });
          
          console.log("État familles mis à jour dans le store:", response.data || []);
        } catch (error: any) {
          set({
            error: error.message || "Erreur lors du chargement des familles",
            loading: false,
          });
        }
      },

      createFamille: async (famille) => {
        set({ loading: true, error: null });
        try {
          await familleService.createFamille(famille);
          await get().fetchFamilles(); // Refresh the list
        } catch (error: any) {
          set({
            error: error.message || "Erreur lors de la création de la famille",
            loading: false,
          });
          throw error;
        }
      },

      updateFamille: async (famille) => {
        set({ loading: true, error: null });
        try {
          await familleService.updateFamille(famille);
          await get().fetchFamilles(); // Refresh the list
        } catch (error: any) {
          set({
            error: error.message || "Erreur lors de la mise à jour de la famille",
            loading: false,
          });
          throw error;
        }
      },

      deleteFamille: async (id) => {
        set({ loading: true, error: null });
        try {
          await familleService.deleteFamille(id);
          await get().fetchFamilles(); // Refresh the list
        } catch (error: any) {
          set({
            error: error.message || "Erreur lors de la suppression de la famille",
            loading: false,
          });
          throw error;
        }
      },

      getFamilleById: async (id) => {
        try {
          const famille = await familleService.getFamilleById(id);
          return famille;
        } catch (error: any) {
          console.error("Error fetching famille by ID:", error);
          return null;
        }
      },

      fetchCatalogues: async (cl_NoParent, cL_Niveau) => {
        try {
          const catalogues = await familleService.getCatalogues(cl_NoParent, cL_Niveau);
          set({ catalogues });
        } catch (error: any) {
          set({
            error: error.message || "Erreur lors du chargement des catalogues",
          });
        }
      },

      fetchFamillesCentral: async () => {
        try {
          const famillesCentral = await familleService.getFamillesCentral();
          set({ famillesCentral });
        } catch (error: any) {
          set({
            error: error.message || "Erreur lors du chargement des familles centralisatrices",
          });
        }
      },

      setSelectedFamille: (famille) => {
        set({ selectedFamille: famille });
      },

      setPagination: (pagination) => {
        set((state) => ({
          pagination: { ...state.pagination, ...pagination },
        }));
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
          pagination: { ...state.pagination, current: 1 }, // Reset to first page when filters change
        }));
      },

      setCatalogueSelection: (selection) => {
        set((state) => ({
          catalogueSelection: { ...state.catalogueSelection, ...selection },
          pagination: { ...state.pagination, current: 1 },
        }));
      },

      setError: (error) => {
        set({ error });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "famille-store",
    }
  )
);
