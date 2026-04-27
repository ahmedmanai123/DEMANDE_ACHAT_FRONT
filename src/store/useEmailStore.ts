import { create } from "zustand";
import { emailService } from "../api/services/emailService";
import type { AttachmentsModel, DA_HISTORIQUE_EMAIL, DA_MODELE_EMAIL, EmailLayoutData, TypeMail } from "../types/email";

interface EmailState {
	// Layout data
	layoutData: EmailLayoutData | null;
	loading: boolean;
	error: string | null;

	// Templates
	templates: DA_MODELE_EMAIL[];
	selectedTemplate: DA_MODELE_EMAIL | null;
	templatesCount: number;
	templatesLoading: boolean;

	// History
	history: DA_HISTORIQUE_EMAIL[];
	selectedHistory: DA_HISTORIQUE_EMAIL | null;
	historyCount: number;
	historyLoading: boolean;

	// Attachments
	attachments: AttachmentsModel[];
	attachmentsLoading: boolean;

	// UI State
	activeView: "templates" | "history";
	selectedType: TypeMail | null;
	selectedIds: number[];
	isCreatingTemplate: boolean;
}

interface EmailActions {
	// Layout
	fetchLayoutData: (b_No?: number) => Promise<void>;

	// Templates
	fetchTemplates: () => Promise<void>;
	fetchTemplate: (id: number) => Promise<void>;
	fetchTemplatesByType: (type: TypeMail) => Promise<void>;
	createTemplate: (
		template: Omit<DA_MODELE_EMAIL, "ME_No" | "ME_DateCreation" | "ME_DateModification">,
	) => Promise<void>;
	updateTemplate: (template: DA_MODELE_EMAIL) => Promise<void>;
	setDefaultTemplate: (id: number) => Promise<void>;
	deleteTemplates: (ids: number[]) => Promise<void>;
	setSelectedTemplate: (template: DA_MODELE_EMAIL | null) => void;

	// History
	fetchHistory: () => Promise<void>;
	fetchHistoryItem: (id: number) => Promise<void>;
	fetchHistoryByBesoin: (id: number) => Promise<void>;
	deleteHistory: (ids: number[]) => Promise<void>;
	setSelectedHistory: (history: DA_HISTORIQUE_EMAIL | null) => void;

	// Attachments
	fetchAttachments: (historyId: number) => Promise<void>;

	// UI Actions
	setActiveView: (view: "templates" | "history") => void;
	setSelectedType: (type: TypeMail | null) => void;
	toggleSelection: (id: number) => void;
	clearSelection: () => void;
	setError: (error: string | null) => void;
	reset: () => void;
	setIsCreatingTemplate: (isCreatingTemplate: boolean) => void;
}

const initialState: EmailState = {
	layoutData: null,
	loading: false,
	error: null,
	templates: [],
	selectedTemplate: null,
	templatesCount: 0,
	templatesLoading: false,
	history: [],
	selectedHistory: null,
	historyCount: 0,
	historyLoading: false,
	attachments: [],
	attachmentsLoading: false,
	activeView: "templates",
	selectedType: null,
	selectedIds: [],
	isCreatingTemplate: false,
};

export const useEmailStore = create<EmailState & EmailActions>((set, get) => ({
	...initialState,

	// Layout
	fetchLayoutData: async (b_No?: number) => {
		set({ loading: true, error: null });
		try {
			const layoutData = await emailService.getLayoutData(b_No);
			set({ layoutData, loading: false });
		} catch (error: any) {
			set({ error: error.message || "Failed to fetch layout data", loading: false });
		}
	},

	// Templates
	fetchTemplates: async () => {
		set({ templatesLoading: true, error: null });
		try {
			console.log("Fetching templates...");
			const response = await emailService.getTemplates();
			console.log("Templates response:", response);

			// If API fails or returns empty, use mock data for now
			const templates =
				response.data && response.data.length > 0
					? response.data
					: [
							{
								ME_No: 1,
								ME_Intitule: "Modèle de test 1",
								ME_Type: "ValidationDemandeBesoin" as TypeMail,
								ME_Contenu: "Ceci est un modèle de test",
								ME_Default: true,
								ME_DateCreation: new Date(),
								ME_CreateurName: "Admin",
							},
							{
								ME_No: 2,
								ME_Intitule: "Modèle de test 2",
								ME_Type: "DemandeAchat" as TypeMail,
								ME_Contenu: "Ceci est un autre modèle de test",
								ME_Default: false,
								ME_DateCreation: new Date(),
								ME_CreateurName: "Admin",
							},
						];

			set({
				templates: templates,
				templatesCount: response.modelesCount || templates.length,
				templatesLoading: false,
			});
		} catch (error: any) {
			console.error("Error fetching templates:", error);
			// Use mock data on error
			const mockTemplates: DA_MODELE_EMAIL[] = [
				{
					ME_No: 1,
					ME_Intitule: "Modèle de test 1",
					ME_Type: "ValidationDemandeBesoin" as TypeMail,
					ME_Contenu: "Ceci est un modèle de test",
					ME_Default: true,
					ME_DateCreation: new Date(),
					ME_CreateurName: "Admin",
				},
			];
			set({
				templates: mockTemplates,
				templatesCount: mockTemplates.length,
				templatesLoading: false,
			});
		}
	},

	fetchTemplate: async (id: number) => {
		set({ templatesLoading: true, error: null });
		try {
			const response = await emailService.getTemplate(id);
			set({
				selectedTemplate: response.data,
				templatesLoading: false,
			});
		} catch (error: any) {
			set({ error: error.message || "Failed to fetch template", templatesLoading: false });
		}
	},

	fetchTemplatesByType: async (type: TypeMail) => {
		set({ templatesLoading: true, error: null });
		try {
			const response = await emailService.getTemplatesByType(type);
			set({
				templates: response.data,
				templatesCount: response.modelesCount,
				templatesLoading: false,
				selectedType: type,
			});
		} catch (error: any) {
			set({ error: error.message || "Failed to fetch templates by type", templatesLoading: false });
		}
	},

	createTemplate: async (template: Omit<DA_MODELE_EMAIL, "ME_No" | "ME_DateCreation" | "ME_DateModification">) => {
		set({ templatesLoading: true, error: null });
		try {
			const response = await emailService.createTemplate(template);
			set({
				selectedTemplate: response.data,
				templatesLoading: false,
			});
			// Refresh templates list
			get().fetchTemplates();
		} catch (error: any) {
			set({ error: error.message || "Failed to create template", templatesLoading: false });
		}
	},

	updateTemplate: async (template: DA_MODELE_EMAIL) => {
		set({ templatesLoading: true, error: null });
		try {
			const response = await emailService.updateTemplate(template);
			set({
				selectedTemplate: response.data,
				templatesLoading: false,
			});
			// Refresh templates list
			get().fetchTemplates();
		} catch (error: any) {
			set({ error: error.message || "Failed to update template", templatesLoading: false });
		}
	},

	setDefaultTemplate: async (id: number) => {
		set({ templatesLoading: true, error: null });
		try {
			await emailService.setDefaultTemplate(id);
			set({ templatesLoading: false });
			// Refresh templates list
			get().fetchTemplates();
		} catch (error: any) {
			set({ error: error.message || "Failed to set default template", templatesLoading: false });
		}
	},

	deleteTemplates: async (ids: number[]) => {
		set({ templatesLoading: true, error: null });
		try {
			await emailService.deleteTemplates(ids);
			set({ templatesLoading: false, selectedIds: [] });
			// Refresh templates list
			get().fetchTemplates();
		} catch (error: any) {
			set({ error: error.message || "Failed to delete templates", templatesLoading: false });
		}
	},

	setSelectedTemplate: (template: DA_MODELE_EMAIL | null) => {
		set({ selectedTemplate: template });
	},

	// History
	fetchHistory: async () => {
		set({ historyLoading: true, error: null });
		try {
			const response = await emailService.getHistory();
			set({
				history: response.data,
				historyCount: response.historiquesCount,
				historyLoading: false,
			});
		} catch (error: any) {
			set({ error: error.message || "Failed to fetch history", historyLoading: false });
		}
	},

	fetchHistoryItem: async (id: number) => {
		set({ historyLoading: true, error: null });
		try {
			const response = await emailService.getHistoryItem(id);
			set({
				selectedHistory: response.data,
				historyLoading: false,
			});
		} catch (error: any) {
			set({ error: error.message || "Failed to fetch history item", historyLoading: false });
		}
	},

	fetchHistoryByBesoin: async (id: number) => {
		set({ historyLoading: true, error: null });
		try {
			const response = await emailService.getHistoryByBesoin(id);
			set({
				history: response.data,
				historyLoading: false,
				activeView: "history",
			});
		} catch (error: any) {
			set({ error: error.message || "Failed to fetch history by besoin", historyLoading: false });
		}
	},

	deleteHistory: async (ids: number[]) => {
		set({ historyLoading: true, error: null });
		try {
			await emailService.deleteHistory(ids);
			set({ historyLoading: false, selectedIds: [] });
			// Refresh history list
			get().fetchHistory();
		} catch (error: any) {
			set({ error: error.message || "Failed to delete history", historyLoading: false });
		}
	},

	setSelectedHistory: (history: DA_HISTORIQUE_EMAIL | null) => {
		set({ selectedHistory: history });
	},

	// Attachments
	fetchAttachments: async (historyId: number) => {
		set({ attachmentsLoading: true, error: null });
		try {
			const response = await emailService.getHistoryAttachments(historyId);
			set({
				attachments: response.data,
				attachmentsLoading: false,
			});
		} catch (error: any) {
			set({ error: error.message || "Failed to fetch attachments", attachmentsLoading: false });
		}
	},

	// UI Actions
	setActiveView: (view: "templates" | "history") => {
		set({ activeView: view, selectedIds: [] });
	},

	setSelectedType: (type: TypeMail | null) => {
		set({ selectedType: type });
	},

	toggleSelection: (id: number) => {
		const { selectedIds } = get();
		const isSelected = selectedIds.includes(id);
		set({
			selectedIds: isSelected ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id],
		});
	},

	clearSelection: () => {
		set({ selectedIds: [] });
	},

	setError: (error: string | null) => {
		set({ error });
	},

	reset: () => {
		set(initialState);
	},

	setIsCreatingTemplate: (isCreatingTemplate: boolean) => {
		set({ isCreatingTemplate });
	},
}));
