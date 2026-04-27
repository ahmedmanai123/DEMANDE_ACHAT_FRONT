import { EmailLayoutData, EmailTemplateListResponse, EmailTemplateResponse, TypeMail, DA_MODELE_EMAIL, SelectListOption, EmailHistoryListResponse, EmailHistoryResponse, AttachmentsResponse, DA_HISTORIQUE_EMAIL } from "@/types/email";
import apiClient from "../apiClient";


class EmailService {
	// Template Management

	async getLayoutData(b_No?: number): Promise<EmailLayoutData> {
		const params = b_No ? { b_No } : {};
		const response = await apiClient.get("/api/mail/layout", { params });
		return response.data;
	}

	async getTemplates(): Promise<EmailTemplateListResponse> {
		const response = await apiClient.get("/api/mail/modeles");
		return response.data;
	}

	async getTemplate(id: number): Promise<EmailTemplateResponse> {
		const response = await apiClient.get(`/api/mail/modeles/${id}`);
		return response.data;
	}

	async getTemplatesByType(type: TypeMail): Promise<EmailTemplateListResponse> {
		const response = await apiClient.get(`/api/mail/modeles/by-type/${type}`);
		return response.data;
	}

	async createTemplate(
		template: Omit<DA_MODELE_EMAIL, "ME_No" | "ME_DateCreation" | "ME_DateModification">,
	): Promise<EmailTemplateResponse> {
		const response = await apiClient.post("/api/mail/modeles", template);
		return response.data;
	}

	async updateTemplate(template: DA_MODELE_EMAIL): Promise<EmailTemplateResponse> {
		const response = await apiClient.post("/api/mail/modeles", template);
		return response.data;
	}

	async setDefaultTemplate(id: number): Promise<EmailTemplateResponse> {
		const response = await apiClient.put(`/api/mail/modeles/${id}/default`);
		return response.data;
	}

	async deleteTemplates(ids: number[]): Promise<EmailTemplateResponse> {
		const response = await apiClient.delete("/api/mail/modeles", { data: ids });
		return response.data;
	}

	async getTemplateCreateData(): Promise<{ typeMailOptions: SelectListOption[] }> {
		const response = await apiClient.get("/api/mail/modeles/create");
		return response.data;
	}

	// History Management

	async getHistory(): Promise<EmailHistoryListResponse> {
		const response = await apiClient.get("/api/mail/historiques");
		return response.data;
	}

	async getHistoryItem(id: number): Promise<EmailHistoryResponse> {
		const response = await apiClient.get(`/api/mail/historiques/${id}`);
		return response.data;
	}

	async getHistoryBody(id: number): Promise<string> {
		const response = await apiClient.get(`/api/mail/historiques/${id}/body`);
		return response.data;
	}

	async getHistoryAttachments(id: number): Promise<AttachmentsResponse> {
		const response = await apiClient.get(`/api/mail/historiques/${id}/attachements`);
		return response.data;
	}

	async getHistoryByBesoin(id: number): Promise<EmailHistoryListResponse> {
		const response = await apiClient.get(`/api/mail/historiques/besoin/${id}`);
		return response.data;
	}

	async createHistory(
		history: Omit<DA_HISTORIQUE_EMAIL, "HE_No">,
	): Promise<{ isValid: boolean; data: DA_HISTORIQUE_EMAIL; id: number }> {
		const response = await apiClient.post("/api/mail/historiques", history);
		return response.data;
	}

	async deleteHistory(ids: number[]): Promise<EmailHistoryListResponse> {
		const response = await apiClient.delete("/api/mail/historiques", { data: ids });
		return response.data;
	}

	// Helper methods

	getTypeMailOptions(): SelectListOption[] {
		return [
			{ Text: "Validation Demande Besoin", Value: TypeMail.Validation_Demande_Besoin },
			{ Text: "Demande Achat", Value: TypeMail.Demande_Achat },
			{ Text: "Refus Demande Article", Value: TypeMail.Refus_Demande_Article },
			{ Text: "Retour Demande Besoin", Value: TypeMail.Retour_Demande_Besoin },
			{ Text: "Modifier Quantité Article", Value: TypeMail.Modifier_QuantitArticle },
			{ Text: "BC Validé BackOffice", Value: TypeMail.BC_ValideBackOffice },
		];
	}

	getTypeMailLabel(type: TypeMail): string {
		const option = this.getTypeMailOptions().find((opt) => opt.Value === type);
		return option?.Text || type;
	}

	getTypeMailColor(type: TypeMail): string {
		const colorMap: Record<TypeMail, string> = {
			[TypeMail.Validation_Demande_Besoin]: "label-ValidationDemandeBesoin",
			[TypeMail.Demande_Achat]: "label-DemandeAchat",
			[TypeMail.Refus_Demande_Article]: "label-Refus_Demande_Article",
			[TypeMail.Retour_Demande_Besoin]: "label-ValidationRetourDemande",
			[TypeMail.Modifier_QuantitArticle]: "label-ModifierQuantitArticle",
			[TypeMail.BC_ValideBackOffice]: "label-BC-ValideBackOffice",
		};
		return colorMap[type] || "label-default";
	}
}

export const emailService = new EmailService();
