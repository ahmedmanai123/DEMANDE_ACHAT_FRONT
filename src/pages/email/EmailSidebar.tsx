import { FilterOutlined, HistoryOutlined, MailOutlined, PlusOutlined } from "@ant-design/icons";
import { Badge, Button, Card, Divider, Typography } from "antd";
import type React from "react";
import { useEmailStore } from "../../store/useEmailStore";

const { Title, Text } = Typography;

const EmailSidebar: React.FC = () => {
	const {
		activeView,
		setActiveView,
		selectedType,
		setSelectedType,
		templatesCount,
		historyCount,
		fetchTemplates,
		fetchHistory,
		isCreatingTemplate,
		setIsCreatingTemplate,
	} = useEmailStore();

	const handleCreateTemplate = () => {
		setIsCreatingTemplate(true);
		setActiveView("templates");
	};

	const handleTypeClick = (type: string) => {
		setSelectedType(type as any);
	};

	// Type options with professional styling
	const typeOptions = [
		{ Value: "ValidationDemandeBesoin", Text: "Validation demande de besoin", color: "#1890ff" },
		{ Value: "DemandeAchat", Text: "Demande achat", color: "#52c41a" },
		{ Value: "Refus_Demande_Article", Text: "Refus demande article", color: "#ff4d4f" },
		{ Value: "ValidationRetourDemande", Text: "Retour demande", color: "#faad14" },
		{ Value: "ModifierQuantitArticle", Text: "Modifier quantité article", color: "#722ed1" },
		{ Value: "BC_ValideBackOffice", Text: "BC validé back office", color: "#13c2c2" },
	];

	return (
		<div className="email-sidebar w-80 bg-white border-r border-gray-200">
			<div className="p-6">
				{/* Actions principales */}
				<Card className="mb-6 shadow-sm" size="small">
					<div className="space-y-3">
						<Button
							type="primary"
							icon={<PlusOutlined />}
							onClick={handleCreateTemplate}
							className="w-full h-10 font-medium"
							size="large"
						>
							Composer un modèle
						</Button>

						<Button
							icon={<HistoryOutlined />}
							onClick={() => setActiveView("history")}
							className={`w-full h-10 ${activeView === "history" ? "bg-blue-50 text-blue-600 border-blue-200" : ""}`}
							size="large"
						>
							Historiques
						</Button>
					</div>
				</Card>

				{/* Navigation */}
				<Card className="mb-6 shadow-sm" size="small">
					<Title level={5} className="mb-4 text-gray-900">
						Navigation
					</Title>
					<div className="space-y-2">
						{/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
						<div
							onClick={() => {
								console.log("Sidebar click - setting activeView to templates");
								setActiveView("templates");
							}}
							className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
								activeView === "templates" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50 text-gray-700"
							}`}
						>
							<div className="flex items-center gap-3">
								<MailOutlined className="text-lg" />
								<span className="font-medium">Modèles</span>
							</div>
							<Badge count={templatesCount} className="bg-blue-500" />
						</div>

						{/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
						<div
							onClick={() => {
								console.log("Sidebar click - setting activeView to history");
								setActiveView("history");
							}}
							className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
								activeView === "history" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50 text-gray-700"
							}`}
						>
							<div className="flex items-center gap-3">
								<HistoryOutlined className="text-lg" />
								<span className="font-medium">Historiques</span>
							</div>
							<Badge count={historyCount} className="bg-green-500" />
						</div>
					</div>
				</Card>

				{/* Filtres par type */}
				<Card className="shadow-sm" size="small">
					<div className="flex items-center justify-between mb-4">
						<Title level={5} className="mb-0 text-gray-900">
							Filtres par type
						</Title>
						<FilterOutlined className="text-gray-400" />
					</div>

					<div className="space-y-1">
						{typeOptions.map((option) => (
							// biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
							<div
								key={option.Value}
								onClick={() => handleTypeClick(option.Value)}
								className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
									selectedType === option.Value ? "bg-gray-100 border-l-3" : "hover:bg-gray-50"
								}`}
								style={{
									borderLeftColor: selectedType === option.Value ? option.color : "transparent",
									borderLeftWidth: selectedType === option.Value ? "3px" : "0",
								}}
							>
								<div className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }} />
								<span className="text-sm font-medium text-gray-700">{option.Text}</span>
								{selectedType === option.Value && (
									<div className="ml-auto">
										<div
											className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
											style={{ backgroundColor: option.color }}
										>
											✓
										</div>
									</div>
								)}
							</div>
						))}
					</div>

					{selectedType && (
						<>
							<Divider className="my-4" />
							<Button
								type="link"
								size="small"
								onClick={() => setSelectedType(null)}
								className="p-0 h-auto text-gray-500"
							>
								Réinitialiser les filtres
							</Button>
						</>
					)}
				</Card>
			</div>
		</div>
	);
};

export default EmailSidebar;
