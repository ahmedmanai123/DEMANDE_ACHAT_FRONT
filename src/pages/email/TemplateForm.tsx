import { ArrowLeftOutlined, MailOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, Card, Divider, Form, Input, message, Select, Space, Typography } from "antd";
import type React from "react";
import { useEffect, useState } from "react";
import SimpleEditor from "../../components/SimpleEditor";
import { useEmailStore } from "../../store/useEmailStore";
import { numberToTypeMail, typeMailToNumber } from "../../types/email";

const { Title, Text } = Typography;
const { TextArea } = Input;

const TemplateForm: React.FC = () => {
	const {
		selectedTemplate,
		setSelectedTemplate,
		createTemplate,
		updateTemplate,
		fetchTemplates,
		isCreatingTemplate,
		setIsCreatingTemplate,
	} = useEmailStore();

	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const [typeOptions, setTypeOptions] = useState<any[]>([]);

	const isEditing = !!selectedTemplate;

	useEffect(() => {
		// Load type options
		const mockTypeOptions = [
			{ Value: "ValidationDemandeBesoin", Text: "Validation demande de besoin" },
			{ Value: "DemandeAchat", Text: "Demande achat" },
			{ Value: "Refus_Demande_Article", Text: "Refus demande article" },
			{ Value: "ValidationRetourDemande", Text: "Retour demande" },
			{ Value: "ModifierQuantitArticle", Text: "Modifier quantité article" },
			{ Value: "BC_ValideBackOffice", Text: "BC validé back office" },
		];
		setTypeOptions(mockTypeOptions);

		if (selectedTemplate) {
			const template = selectedTemplate as any;
			form.setFieldsValue({
				ME_Intitule: template.mE_Intitule || "",
				ME_Type: typeMailToNumber(template.mE_Type)?.toString() || "",
				ME_Contenu: template.mE_Contenu || "",
			});
		} else if (isCreatingTemplate) {
			form.resetFields();
		}
	}, [selectedTemplate, isCreatingTemplate, form]);

	const handleClose = () => {
		form.resetFields();
		setSelectedTemplate(null);
		setIsCreatingTemplate(false);
	};

	const handleSubmit = async (values: any) => {
		try {
			setLoading(true);

			const templateData = {
				ME_Intitule: values.ME_Intitule,
				ME_Type: numberToTypeMail(parseInt(values.ME_Type)),
				ME_Contenu: values.ME_Contenu,
				ME_Default: false,
			};

			if (isEditing && selectedTemplate) {
				const template = selectedTemplate as any;
				await updateTemplate({
					...templateData,
					ME_No: template.mE_No,
				});
				message.success("Modèle mis à jour avec succès");
			} else {
				await createTemplate(templateData);
				message.success("Modèle créé avec succès");
			}

			fetchTemplates();
			handleClose();
		} catch (error) {
			message.error("Erreur lors de la sauvegarde du modèle");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="template-form-card shadow-sm">
			<div className="mb-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<MailOutlined className="text-blue-500 text-xl" />
						<Title level={3} className="mb-0">
							{isEditing ? "Modifier le modèle" : "Créer un nouveau modèle"}
						</Title>
					</div>
					<Button icon={<ArrowLeftOutlined />} onClick={handleClose}>
						Retour
					</Button>
				</div>
				<Text type="secondary">
					{isEditing
						? "Modifiez les informations du modèle d'email"
						: "Remplissez les informations pour créer un nouveau modèle d'email"}
				</Text>
			</div>

			<Divider />

			<Form form={form} layout="vertical" onFinish={handleSubmit} className="template-form">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="space-y-4">
						{/* Left column */}
						<Form.Item
							label={
								<span className="font-medium">
									<MailOutlined className="mr-2" />
									Intitulé du modèle
								</span>
							}
							name="ME_Intitule"
							rules={[
								{ required: true, message: "Veuillez entrer un intitulé" },
								{ min: 3, message: "L'intitulé doit contenir au moins 3 caractères" },
							]}
						>
							<Input placeholder="Ex: Validation demande de besoin" size="large" showCount maxLength={100} />
						</Form.Item>

						<Form.Item
							label={
								<span className="font-medium">
									<MailOutlined className="mr-2" />
									Type d'email
								</span>
							}
							name="ME_Type"
							rules={[{ required: true, message: "Veuillez sélectionner un type" }]}
						>
							<Select
								placeholder="Sélectionnez un type d'email"
								size="large"
								options={typeOptions.map((option) => ({
									label: option.Text,
									value: option.Value,
								}))}
							/>
						</Form.Item>

						<Card className="bg-gray-50 border-gray-200">
							<Title level={5} className="mb-3">
								<MailOutlined className="mr-2" />
								Informations supplémentaires
							</Title>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Text type="secondary">Statut par défaut:</Text>
									<Text>Non défini</Text>
								</div>
								<div className="flex items-center justify-between">
									<Text type="secondary">Date de création:</Text>
									<Text>
										{selectedTemplate?.ME_DateCreation
											? new Date(selectedTemplate.ME_DateCreation).toLocaleDateString("fr-FR")
											: "Nouveau"}
									</Text>
								</div>
								{selectedTemplate?.ME_CreateurName && (
									<div className="flex items-center justify-between">
										<Text type="secondary">Créé par:</Text>
										<Text>{selectedTemplate.ME_CreateurName}</Text>
									</div>
								)}
							</div>
						</Card>
					</div>

					<div className="space-y-4">
						{/* Right column - Content */}
						<Form.Item
							label={
								<span className="font-medium">
									<MailOutlined className="mr-2" />
									Contenu de l'email
								</span>
							}
							name="ME_Contenu"
							rules={[
								{ required: true, message: "Veuillez entrer le contenu de l'email" },
								{ min: 10, message: "Le contenu doit contenir au moins 10 caractères" },
							]}
						>
							<SimpleEditor
								placeholder="Rédigez le contenu de votre email ici..."
								value={form.getFieldValue("ME_Contenu")}
								onChange={(value) => form.setFieldValue("ME_Contenu", value)}
							/>
						</Form.Item>
					</div>
				</div>

				<Divider />

				{/* Actions */}
				<div className="flex items-center justify-between">
					<div className="text-sm text-gray-500">
						<Text type="secondary">{isEditing ? "ID: " + selectedTemplate?.ME_No : "Nouveau modèle"}</Text>
					</div>
					<Space>
						<Button onClick={handleClose} size="large">
							Annuler
						</Button>
						<Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
							{isEditing ? "Mettre à jour" : "Créer le modèle"}
						</Button>
					</Space>
				</div>
			</Form>
		</Card>
	);
};

export default TemplateForm;
